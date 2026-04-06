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

describe("GET /api/share/:token/entity/detail", () => {
  let shareToken: string;

  beforeAll(async () => {
    const res = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "scope-test",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Scoped Detail",
        ttlHours: 24,
      }),
    });
    const data = await res.json() as any;
    shareToken = data.token;
  });

  test("returns entity detail for in-scope path", async () => {
    const res = await fetch(
      `${baseUrl}/api/share/${shareToken}/entity/detail?path=${encodeURIComponent(ENTITY_PATH)}`
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.frontmatter.id).toBe("001");
  });

  test("returns 403 for out-of-scope path", async () => {
    const outOfScope = join(TMP, "docs/build-pipeline/other.md");
    writeFileSync(outOfScope, "---\nid: 002\ntitle: Other\nstatus: plan\n---\n\nOther body.\n");
    const res = await fetch(
      `${baseUrl}/api/share/${shareToken}/entity/detail?path=${encodeURIComponent(outOfScope)}`
    );
    expect(res.status).toBe(403);
  });

  test("returns 404 for expired token", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "expiry",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Expired Scope",
        ttlHours: 0,
      }),
    });
    const { token } = await createRes.json() as any;
    const link = server.shareRegistry.get(token);
    if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

    const res = await fetch(
      `${baseUrl}/api/share/${token}/entity/detail?path=${encodeURIComponent(ENTITY_PATH)}`
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/share/:token/entity/comments", () => {
  test("returns comments for in-scope entity", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "comments-test",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Comments Scope",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const res = await fetch(
      `${baseUrl}/api/share/${token}/entity/comments?path=${encodeURIComponent(ENTITY_PATH)}`
    );
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.comments).toBeDefined();
  });
});

describe("POST /api/share/:token/entity/comment", () => {
  test("adds a guest comment on in-scope entity", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "guest-comment",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "Guest Comment",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const res = await fetch(`${baseUrl}/api/share/${token}/entity/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: ENTITY_PATH,
        selected_text: "Body text",
        section_heading: "",
        content: "Guest feedback here",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.author).toBe("guest");
  });
});

describe("WebSocket /ws/share/:token/activity", () => {
  test("connects and receives replay for valid token", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "ws-test",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "WS Scoped",
        ttlHours: 24,
      }),
    });
    const { token } = await createRes.json() as any;

    const wsUrl = `ws://127.0.0.1:${server.port}/ws/share/${token}/activity`;
    const ws = new WebSocket(wsUrl);
    const messages: any[] = [];

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    ws.onmessage = (ev) => {
      messages.push(JSON.parse(String(ev.data)));
    };

    // Wait for replay message
    await new Promise((r) => setTimeout(r, 200));
    ws.close();

    const replayMessages = messages.filter((m) => m.type === "replay");
    expect(replayMessages.length).toBe(1);
  });

  test("rejects connection for expired token", async () => {
    const createRes = await fetch(`${baseUrl}/api/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "ws-expire",
        entityPaths: [ENTITY_PATH],
        stages: [],
        label: "WS Expired",
        ttlHours: 0,
      }),
    });
    const { token } = await createRes.json() as any;
    const link = server.shareRegistry.get(token);
    if (link) link.expiresAt = new Date(Date.now() - 1000).toISOString();

    const wsUrl = `ws://127.0.0.1:${server.port}/ws/share/${token}/activity`;
    const ws = new WebSocket(wsUrl);

    const result = await new Promise<string>((resolve) => {
      ws.onopen = () => resolve("opened");
      ws.onerror = () => resolve("error");
      ws.onclose = () => resolve("closed");
      setTimeout(() => resolve("timeout"), 2000);
    });

    expect(result === "error" || result === "closed").toBe(true);
  });
});
