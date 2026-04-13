// spacebridge/src/daemon/daemon-coordination.test.ts
// ABOUTME: Integration tests for coordination RPC through live daemon (janitor expiry, swap).
// Spawns real daemon subprocess with test isolation env. Validates AC-5 (janitor).

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { createSocketClient } from "../ipc/socket-client";

const DAEMON_SCRIPT = resolve(import.meta.dir, "../../bin/daemon.ts");

let tmpDir: string;

function socketPath() { return join(tmpDir, "spacebridge.sock"); }

function spawnDaemon(extraEnv?: Record<string, string>) {
  return Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
    stderr: "pipe",
    stdout: "ignore",
    env: {
      ...process.env,
      SPACEBRIDGE_STATE_DIR: tmpDir,
      SPACEBRIDGE_AUTO_STOP: "1",
      ...extraEnv,
    },
  });
}

async function waitForSocket(path: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alive = await new Promise<boolean>((res) => {
      if (!existsSync(path)) { res(false); return; }
      const s = createConnection({ path });
      s.on("connect", () => { s.destroy(); res(true); });
      s.on("error", () => res(false));
    });
    if (alive) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`waitForSocket timed out (${path})`);
}

function makeClient(sessionId: string = randomUUID()) {
  return createSocketClient({
    socketPath: socketPath(),
    sessionId,
    projectRoot: tmpDir,
    pid: process.pid,
  });
}

async function coordinationRequest(
  client: ReturnType<typeof makeClient>,
  method: string,
  args: unknown[],
): Promise<{ result?: unknown; error?: string }> {
  const resp = await client.request({
    id: randomUUID(),
    type: "coordination-request",
    payload: { method, args },
  });
  return resp.payload as { result?: unknown; error?: string };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-coord-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("daemon coordination — stub-replaced bridge", () => {
  test("coordination-request acquireEntity returns a token", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());
      const client = makeClient();
      await client.connect();

      const resp = await coordinationRequest(client, "acquireEntity", ["ent-x", "FO", "sess-1"]);
      expect(resp.error).toBeUndefined();
      expect((resp.result as { token?: string })?.token).toBeTruthy();

      client.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 300));
    }
  }, 15_000);

  test("janitor expires leases with short duration (AC-5)", async () => {
    // Lease duration 500ms, janitor interval 100ms → lease expires within ~700ms
    const proc = spawnDaemon({
      SPACEBRIDGE_LEASE_DURATION_MS: "500",
      SPACEBRIDGE_JANITOR_INTERVAL_MS: "100",
    });
    try {
      await waitForSocket(socketPath());
      const client = makeClient();
      await client.connect();

      // Acquire a lease
      const acquireResp = await coordinationRequest(client, "acquireEntity", ["ent-y", "FO", "sess-1"]);
      expect(acquireResp.error).toBeUndefined();
      const token = acquireResp.result as { token: string; entity_slug: string; role: string; session_id: string; acquired_at: number; expires_at: number };
      expect(token.token).toBeTruthy();

      // Wait > lease duration + janitor interval
      await new Promise(r => setTimeout(r, 800));

      // getAvailableWork should now include the entity again (lease expired)
      // entityScanner returns [] in 056, so we verify via acquireEntity succeeding again
      // (if lease still held, would return an error)
      const reacquireResp = await coordinationRequest(client, "acquireEntity", ["ent-y", "FO", "sess-2"]);
      expect(reacquireResp.error).toBeUndefined();
      expect((reacquireResp.result as { token?: string })?.token).toBeTruthy();

      client.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 300));
    }
  }, 15_000);

  test("daemon exits cleanly — socket cleaned up after SIGTERM (no dangling janitor)", async () => {
    const proc = spawnDaemon({
      SPACEBRIDGE_JANITOR_INTERVAL_MS: "100",
    });
    try {
      await waitForSocket(socketPath());
      expect(existsSync(socketPath())).toBe(true);
      proc.kill("SIGTERM");
      // Allow time for graceful shutdown (clearInterval + server.close)
      await new Promise(r => setTimeout(r, 500));
      expect(existsSync(socketPath())).toBe(false);
    } finally {
      try { proc.kill("SIGTERM"); } catch {}
    }
  }, 10_000);

  test("invalid coordination args return typed error response (R-2)", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());
      const client = makeClient();
      await client.connect();

      // Pass a non-string entitySlug (number) to trigger Zod validation failure
      const resp = await coordinationRequest(client, "acquireEntity", [42, "FO", "sess-bad"]);
      expect(resp.error).toBeDefined();
      expect(resp.error).toContain("Invalid coordination args");

      client.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 300));
    }
  }, 15_000);
});
