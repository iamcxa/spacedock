// spacebridge/src/ipc/fo-simulator.integration.test.ts
// ABOUTME: FO simulator integration test over live daemon. Validates Q-1 answer:
// getAvailableWork → acquireEntity → releaseEntity cycle over RPC (no PR2 needed).

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { createSocketClient } from "./socket-client";

const DAEMON_SCRIPT = resolve(import.meta.dir, "../../bin/daemon.ts");

let tmpDir: string;
function socketPath() { return join(tmpDir, "spacebridge.sock"); }

function spawnDaemon(extraEnv?: Record<string, string>) {
  return Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
    stderr: "pipe",
    stdout: "ignore",
    env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir, SPACEBRIDGE_AUTO_STOP: "1", ...extraEnv },
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

function makeClient(id = randomUUID()) {
  return createSocketClient({ socketPath: socketPath(), sessionId: id, projectRoot: tmpDir, pid: process.pid });
}

async function coord(client: ReturnType<typeof makeClient>, method: string, args: unknown[]) {
  const resp = await client.request({ id: randomUUID(), type: "coordination-request", payload: { method, args } });
  return resp.payload as { result?: unknown; error?: string };
}

beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), "sb-fo-sim-")); });
afterEach(() => { rmSync(tmpDir, { recursive: true, force: true }); });

describe("FO simulator — getAvailableWork + acquire + release cycle", () => {
  test("full FO workflow over RPC (AC-7, AC-8)", async () => {
    // entityScanner in 056 returns [] — getAvailableWork will return []
    // We validate the acquire/release state machine works correctly over RPC
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());
      const client = makeClient("fo-session-1");
      await client.connect();

      // Step 1: getAvailableWork — entityScanner returns [] in 056
      const avail1 = await coord(client, "getAvailableWork", ["FO"]);
      expect(avail1.error).toBeUndefined();
      expect(Array.isArray(avail1.result)).toBe(true);

      // Step 2: acquireEntity
      const acq = await coord(client, "acquireEntity", ["ent-a", "FO", "fo-session-1"]);
      expect(acq.error).toBeUndefined();
      const token = acq.result as { token: string; entity_slug: string; role: string };
      expect(token.token).toBeTruthy();
      expect(token.entity_slug).toBe("ent-a");
      expect(token.role).toBe("FO");

      // Step 3: getAvailableWork again — ent-a now leased, excluded (AC-7)
      // (entityScanner still returns [] so result is still []; the filter logic is confirmed
      //  via coordination-client-bridge.test.ts where scanner returns entities)
      const avail2 = await coord(client, "getAvailableWork", ["FO"]);
      expect(avail2.error).toBeUndefined();

      // Step 4: releaseEntity with 'done' (AC-8)
      const rel = await coord(client, "releaseEntity", [token, "done"]);
      expect(rel.error).toBeUndefined();

      // Step 5: getAvailableWork again — entity back in pool
      const avail3 = await coord(client, "getAvailableWork", ["FO"]);
      expect(avail3.error).toBeUndefined();

      client.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 300));
    }
  }, 15_000);
});
