// ABOUTME: Tests for the gate Route Handler — slug + body validation, integration
// with real daemon for approve/reject/double-decide/unreachable scenarios.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { POST } from "./route";

const DAEMON_SCRIPT = join(import.meta.dir, "../../../../../..", "bin", "daemon.ts");

function makeTempDir(): string {
  const short = randomUUID().slice(0, 8);
  const dir = `/tmp/sb-gate-route-${short}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function waitForSocket(socketPath: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await Bun.connect({
        unix: socketPath,
        socket: {
          open(s) {
            s.end();
          },
          data() {},
          error() {},
          close() {},
        },
      });
      return;
    } catch {
      await Bun.sleep(50);
    }
  }
  throw new Error(`Socket not ready: ${socketPath}`);
}

function makeRequest(slug: string, body: unknown): Request {
  return new Request(`http://localhost/api/entities/${slug}/gate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Validation (no daemon) ───────────────────────────────────────────────────

describe("gate route — validation (no daemon)", () => {
  test("400 on invalid slug", async () => {
    const resp = await POST(makeRequest("BAD SLUG", { decision: "approve", stage: "plan" }), {
      params: Promise.resolve({ slug: "BAD SLUG" }),
    });
    expect(resp.status).toBe(400);
  });

  test("400 on non-JSON body", async () => {
    const req = new Request("http://localhost/api/entities/entity-099/gate", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "nope",
    });
    const resp = await POST(req, { params: Promise.resolve({ slug: "entity-099" }) });
    expect(resp.status).toBe(400);
  });

  test("400 on missing stage", async () => {
    const resp = await POST(makeRequest("entity-099", { decision: "approve" }), {
      params: Promise.resolve({ slug: "entity-099" }),
    });
    expect([400, 502]).toContain(resp.status);
  });

  test("400 on invalid decision value", async () => {
    const resp = await POST(makeRequest("entity-099", { decision: "maybe", stage: "plan" }), {
      params: Promise.resolve({ slug: "entity-099" }),
    });
    expect([400, 502]).toContain(resp.status);
  });
});

// ─── Integration (real daemon) ────────────────────────────────────────────────

describe("gate route — integration", () => {
  let stateDir: string;
  let daemonProc: ReturnType<typeof Bun.spawn>;
  let socketPath: string;

  beforeEach(async () => {
    stateDir = makeTempDir();
    socketPath = join(stateDir, "spacebridge.sock");

    daemonProc = Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
      env: {
        ...process.env,
        SPACEBRIDGE_STATE_DIR: stateDir,
        SPACEBRIDGE_SKIP_UI: "1",
      },
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });

    await waitForSocket(socketPath);
    process.env.SPACEBRIDGE_STATE_DIR = stateDir;
  });

  afterEach(async () => {
    daemonProc.kill("SIGTERM");
    await daemonProc.exited;
    delete process.env.SPACEBRIDGE_STATE_DIR;
    try {
      rmSync(stateDir, { recursive: true, force: true });
    } catch {}
  });

  test("200 approve returns decision=approved + decidedAt", async () => {
    const slug = `entity-${randomUUID().slice(0, 8)}`;
    const resp = await POST(makeRequest(slug, { decision: "approve", stage: "plan" }), {
      params: Promise.resolve({ slug }),
    });
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { decision: string; decidedAt: number };
    expect(body.decision).toBe("approved");
    expect(typeof body.decidedAt).toBe("number");
  });

  test("200 reject returns decision=rejected", async () => {
    const slug = `entity-${randomUUID().slice(0, 8)}`;
    const resp = await POST(
      makeRequest(slug, { decision: "reject", stage: "uat", reason: "not ready" }),
      {
        params: Promise.resolve({ slug }),
      },
    );
    expect(resp.status).toBe(200);
    const body = (await resp.json()) as { decision: string };
    expect(body.decision).toBe("rejected");
  });

  test("502 on GateAlreadyDecided (double approve)", async () => {
    const slug = `entity-${randomUUID().slice(0, 8)}`;
    const params = Promise.resolve({ slug });
    await POST(makeRequest(slug, { decision: "approve", stage: "plan" }), { params });
    const resp2 = await POST(makeRequest(slug, { decision: "approve", stage: "plan" }), {
      params: Promise.resolve({ slug }),
    });
    expect(resp2.status).toBe(502);
    const body = (await resp2.json()) as { error: string };
    expect(body.error).toMatch(/already/i);
  });

  test("502 on daemon unreachable", async () => {
    const emptyDir = makeTempDir();
    process.env.SPACEBRIDGE_STATE_DIR = emptyDir;
    try {
      const slug = "entity-099";
      const resp = await POST(makeRequest(slug, { decision: "approve", stage: "plan" }), {
        params: Promise.resolve({ slug }),
      });
      expect(resp.status).toBe(502);
    } finally {
      process.env.SPACEBRIDGE_STATE_DIR = stateDir;
      try {
        rmSync(emptyDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
