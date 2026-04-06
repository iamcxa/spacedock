import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "../../tools/dashboard/src/server";

const TMP = join(import.meta.dir, "__test_share__");
const ENTITY_PATH = join(TMP, "docs/build-pipeline/test-entity.md");
const ENTITY_CONTENT = "---\nid: 001\ntitle: Test\nstatus: explore\n---\n\nBody text.\n";

let server: ReturnType<typeof createServer>;
let baseUrl: string;

beforeAll(() => {
  mkdirSync(join(TMP, "docs/build-pipeline"), { recursive: true });
  writeFileSync(ENTITY_PATH, ENTITY_CONTENT);
  server = createServer({
    port: 0,
    hostname: "127.0.0.1",
    projectRoot: TMP,
  });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  server.stop();
  rmSync(TMP, { recursive: true, force: true });
});

describe("POST /api/share", () => {
  test("creates a share link and returns token", async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "reviewer-pass",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Test Share",
        ttlHours: 24,
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.token).toBeTruthy();
    expect(data.label).toBe("Test Share");
    expect(data.entityPaths).toEqual([ENTITY_PATH]);
    // passwordHash must NOT be returned to client
    expect(data.passwordHash).toBeUndefined();
  });

  test("returns 400 when password is missing", async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "No Pass",
        ttlHours: 24,
      }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 400 when entityPaths is empty", async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "pass",
        entityPaths: [],
        stages: [],
        label: "Empty",
        ttlHours: 24,
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/share/list", () => {
  test("returns all active share links without passwordHash", async () => {
    const res = await fetch(`${baseUrl}/api/share/list`);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(Array.isArray(data.links)).toBe(true);
    for (const link of data.links) {
      expect(link.passwordHash).toBeUndefined();
      expect(link.token).toBeTruthy();
    }
  });
});

describe("DELETE /api/share/:token", () => {
  test("deletes an existing share link", async () => {
    // Create a link first
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "to-delete",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Deletable",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const delRes = await fetch(`${baseUrl}/api/share/${token}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);

    // Verify it's gone
    const listRes = await fetch(`${baseUrl}/api/share/list`);
    const { links } = await listRes.json() as any;
    const found = links.find((l: any) => l.token === token);
    expect(found).toBeUndefined();
  });

  test("returns 404 for unknown token", async () => {
    const res = await fetch(`${baseUrl}/api/share/nonexistent`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/share/:token/verify", () => {
  test("returns 200 with scope for correct password", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "verify-me",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Verify Test",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "verify-me" }),
    });
    expect(verifyRes.status).toBe(200);
    const data = await verifyRes.json() as any;
    expect(data.ok).toBe(true);
    expect(data.scope).toBeTruthy();
    expect(data.scope.entityPaths).toEqual([ENTITY_PATH]);
  });

  test("returns 401 for wrong password", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "correct",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Auth Test",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "wrong" }),
    });
    expect(verifyRes.status).toBe(401);
  });

  test("returns 404 for expired link", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "pass",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Expired",
        ttlHours: 0,
      }),
    });
    const { token } = await createRes.json() as any;

    // Force expiry via internal registry access
    const link = server.shareRegistry.get(token);
    if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

    const verifyRes = await fetch(`${baseUrl}/api/share/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "pass" }),
    });
    expect(verifyRes.status).toBe(404);
  });
});
