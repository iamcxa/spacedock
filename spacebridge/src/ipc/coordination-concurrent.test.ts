// spacebridge/src/ipc/coordination-concurrent.test.ts
// ABOUTME: Concurrent acquire test over live daemon — verifies AC-3: exactly one winner.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSocketClient } from "./socket-client";

const DAEMON_SCRIPT = resolve(import.meta.dir, "../../bin/daemon.ts");

let tmpDir: string;
function socketPath() {
  return join(tmpDir, "spacebridge.sock");
}

function spawnDaemon() {
  return Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
    stderr: "pipe",
    stdout: "ignore",
    env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir, SPACEBRIDGE_AUTO_STOP: "1" },
  });
}

async function waitForSocket(path: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alive = await new Promise<boolean>((res) => {
      if (!existsSync(path)) {
        res(false);
        return;
      }
      const s = createConnection({ path });
      s.on("connect", () => {
        s.destroy();
        res(true);
      });
      s.on("error", () => res(false));
    });
    if (alive) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`waitForSocket timed out (${path})`);
}

function makeClient(id = randomUUID()) {
  return createSocketClient({
    socketPath: socketPath(),
    sessionId: id,
    projectRoot: tmpDir,
    pid: process.pid,
  });
}

async function tryAcquire(
  client: ReturnType<typeof makeClient>,
  slug: string,
  role: string,
  sessionId: string,
) {
  const resp = await client.request({
    id: randomUUID(),
    type: "coordination-request",
    payload: { method: "acquireEntity", args: [slug, role, sessionId] },
  });
  return resp.payload as { result?: unknown; error?: string };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-conc-"));
});
afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("concurrent acquire — exactly one winner (AC-3)", () => {
  test("two parallel acquireEntity calls: 1 succeeds, 1 gets LeaseConflict", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());

      const client1 = makeClient("sess-1");
      const client2 = makeClient("sess-2");
      await client1.connect();
      await client2.connect();

      // Fire both simultaneously
      const [r1, r2] = await Promise.all([
        tryAcquire(client1, "ent-z", "FO", "sess-1"),
        tryAcquire(client2, "ent-z", "FO", "sess-2"),
      ]);

      const results = [r1, r2];
      const successes = results.filter((r) => !r.error);
      const failures = results.filter((r) => r.error);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error).toContain("LeaseConflict");

      client1.close();
      client2.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
    }
  }, 15_000);
});
