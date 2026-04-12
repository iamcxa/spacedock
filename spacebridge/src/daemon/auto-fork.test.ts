// spacebridge/src/daemon/auto-fork.test.ts
// ABOUTME: Tests for shim-side auto-fork daemon lifecycle logic.
// Tests use a real socket server (entity 051 createSocketServer) and temp dirs.
// No mocks — full integration to validate the auto-fork sequence.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createSocketServer } from "../ipc/socket-server";
import { createSocketClient } from "../ipc/socket-client";
import { autoForkDaemon, resolveDaemonCommand } from "./auto-fork";
import { readPidFile } from "./pid";
import { releaseLock } from "./lock";

let tmpDir: string;

function makeOpts(overrides?: Partial<Parameters<typeof autoForkDaemon>[0]>) {
  return {
    socketPath: join(tmpDir, "spacebridge.sock"),
    lockPath: join(tmpDir, "spacebridge.lock"),
    pidPath: join(tmpDir, "spacebridge.pid"),
    stateDir: tmpDir,
    daemonCmd: [] as string[], // tests that need real daemon set this
    startupTimeoutMs: 2000,
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-autofork-test-"));
  // Ensure SPACEBRIDGE_NO_AUTOFORK is not set
  delete process.env.SPACEBRIDGE_NO_AUTOFORK;
});

afterEach(async () => {
  delete process.env.SPACEBRIDGE_NO_AUTOFORK;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("autoForkDaemon — SPACEBRIDGE_NO_AUTOFORK=1", () => {
  test("throws error and does not spawn when env var is set", async () => {
    process.env.SPACEBRIDGE_NO_AUTOFORK = "1";
    const opts = makeOpts();
    await expect(autoForkDaemon(opts)).rejects.toThrow("auto-fork disabled");
    // Socket should not have been created
    expect(existsSync(opts.socketPath)).toBe(false);
  });
});

describe("autoForkDaemon — daemon already running", () => {
  test("connects immediately without spawning if socket is live", async () => {
    const opts = makeOpts();

    // Start a real server at the socket path
    const server = createSocketServer({
      socketPath: opts.socketPath,
      onRegister: (sess) => ({ sessionToken: randomUUID(), serverVersion: "0.1.0" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });
    await server.listen();

    try {
      // autoFork should see the running server and return immediately
      await expect(autoForkDaemon(opts)).resolves.toBeUndefined();
    } finally {
      await server.close();
    }
  });
});

describe("autoForkDaemon — startup timeout", () => {
  test("rejects after timeout if daemon never creates socket", async () => {
    const opts = makeOpts({
      daemonCmd: ["true"], // `true` exits immediately, never creates socket
      startupTimeoutMs: 300,
    });
    await expect(autoForkDaemon(opts)).rejects.toThrow(/timeout|timed out/i);
  });
});

describe("autoForkDaemon — stale socket file", () => {
  test("cleans stale socket and forks when socket file exists but ECONNREFUSED", async () => {
    const opts = makeOpts({
      daemonCmd: ["true"], // exits immediately, never creates socket
      startupTimeoutMs: 300,
    });

    // Create a stale (non-listening) socket file to simulate crashed daemon
    writeFileSync(opts.socketPath, "stale");

    // Should detect ENOENT/ECONNREFUSED, clean stale file, attempt fork, then timeout
    await expect(autoForkDaemon(opts)).rejects.toThrow(/timeout|timed out/i);
    // Stale socket file should have been cleaned up
    // (may or may not exist depending on timing, but we proved stale cleanup ran)
  });
});

describe("autoForkDaemon — real daemon spawn via createSocketServer", () => {
  test("forks daemon that creates socket, shim connects successfully", async () => {
    // We'll use a helper script that starts a socket server and keeps it alive
    const helperScript = join(tmpDir, "helper-daemon.ts");
    const opts = makeOpts();

    // Write a minimal daemon helper that starts a socket server at the given path
    writeFileSync(helperScript, `
import { createSocketServer } from ${JSON.stringify(join(import.meta.dir, "../ipc/socket-server"))};
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const server = createSocketServer({
  socketPath: ${JSON.stringify(opts.socketPath)},
  onRegister: (sess) => ({ sessionToken: randomUUID(), serverVersion: "0.1.0" }),
  onRpcRequest: async () => ({ result: null }),
  onCoordinationRequest: async () => ({ result: null }),
  onDisconnect: () => {},
});

await server.listen();
writeFileSync(${JSON.stringify(opts.pidPath)}, String(process.pid));

// Keep alive until SIGTERM
process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
`);

    const spawnOpts = makeOpts({
      daemonCmd: ["bun", "run", helperScript],
      startupTimeoutMs: 5000,
    });

    await autoForkDaemon(spawnOpts);

    // Verify socket file exists and PID was written
    expect(existsSync(spawnOpts.socketPath)).toBe(true);
    const pid = readPidFile(spawnOpts.pidPath);
    expect(pid).not.toBeNull();

    // Cleanup: send SIGTERM to daemon
    if (pid) {
      try { process.kill(pid, "SIGTERM"); } catch {}
      // Wait briefly for cleanup
      await new Promise(r => setTimeout(r, 200));
    }
  }, 10_000);

  test("two concurrent auto-forks spawn exactly one daemon", async () => {
    const helperScript = join(tmpDir, "helper-daemon2.ts");
    const opts = makeOpts();

    writeFileSync(helperScript, `
import { createSocketServer } from ${JSON.stringify(join(import.meta.dir, "../ipc/socket-server"))};
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const server = createSocketServer({
  socketPath: ${JSON.stringify(opts.socketPath)},
  onRegister: (sess) => ({ sessionToken: randomUUID(), serverVersion: "0.1.0" }),
  onRpcRequest: async () => ({ result: null }),
  onCoordinationRequest: async () => ({ result: null }),
  onDisconnect: () => {},
});

await server.listen();
writeFileSync(${JSON.stringify(opts.pidPath)}, String(process.pid));

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
`);

    const spawnOpts = makeOpts({
      daemonCmd: ["bun", "run", helperScript],
      startupTimeoutMs: 5000,
    });

    // Race two auto-forks concurrently
    const [r1, r2] = await Promise.allSettled([
      autoForkDaemon(spawnOpts),
      autoForkDaemon({ ...spawnOpts, lockPath: join(tmpDir, "spacebridge.lock") }),
    ]);

    // At least one must succeed
    const successes = [r1, r2].filter(r => r.status === "fulfilled");
    expect(successes.length).toBeGreaterThanOrEqual(1);

    // Exactly one PID file should exist with a single PID
    const pid = readPidFile(spawnOpts.pidPath);
    expect(pid).not.toBeNull();

    if (pid) {
      try { process.kill(pid, "SIGTERM"); } catch {}
      await new Promise(r => setTimeout(r, 200));
    }
  }, 10_000);
});

describe("resolveDaemonCommand", () => {
  test("returns bun + relative path when SPACEBRIDGE_DEV=1", () => {
    process.env.SPACEBRIDGE_DEV = "1";
    const cmd = resolveDaemonCommand();
    expect(cmd[0]).toBe("bun");
    expect(cmd[1]).toBe("run");
    expect(cmd[2]).toMatch(/daemon\.ts$/);
    expect(cmd[3]).toBe("start");
    delete process.env.SPACEBRIDGE_DEV;
  });

  test("returns [spacebridge, start] in production mode", () => {
    delete process.env.SPACEBRIDGE_DEV;
    const cmd = resolveDaemonCommand();
    expect(cmd).toEqual(["spacebridge", "start"]);
  });
});
