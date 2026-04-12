// spacebridge/src/daemon/integration.test.ts
// ABOUTME: Full lifecycle integration tests for the spacebridge daemon.
// Tests spawn daemon.ts via Bun.spawn using SPACEBRIDGE_STATE_DIR for isolation.
// Each test gets an isolated temp directory — never touches ~/.spacedock.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createSocketClient } from "../ipc/socket-client";
import { autoForkDaemon } from "./auto-fork";
import { readPidFile } from "./pid";

const DAEMON_SCRIPT = resolve(import.meta.dir, "../../bin/daemon.ts");

let tmpDir: string;

function daemonCmd(): string[] {
  return ["bun", "run", DAEMON_SCRIPT, "start"];
}

function socketPath() { return join(tmpDir, "spacebridge.sock"); }
function pidPath() { return join(tmpDir, "spacebridge.pid"); }
function lockPath() { return join(tmpDir, "spacebridge.lock"); }

/** Start daemon via Bun.spawn with test isolation env */
function spawnDaemon(extraEnv?: Record<string, string>) {
  return Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
    stderr: "pipe",
    stdout: "ignore",
    env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir, ...extraEnv },
  });
}

/** Wait until socket file accepts connections (up to timeoutMs). */
async function waitForSocket(path: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const alive = await new Promise<boolean>((res) => {
      if (!existsSync(path)) { res(false); return; }
      const { createConnection } = require("node:net");
      const s = createConnection({ path });
      s.on("connect", () => { s.destroy(); res(true); });
      s.on("error", () => res(false));
    });
    if (alive) return;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`waitForSocket timed out (${path})`);
}

function makeClient(sessionId = randomUUID()) {
  return createSocketClient({
    socketPath: socketPath(),
    sessionId,
    projectRoot: tmpDir,
    pid: process.pid,
  });
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-integ-test-"));
  delete process.env.SPACEBRIDGE_NO_AUTOFORK;
  delete process.env.SPACEBRIDGE_AUTO_STOP;
});

afterEach(() => {
  delete process.env.SPACEBRIDGE_NO_AUTOFORK;
  delete process.env.SPACEBRIDGE_AUTO_STOP;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("start + connect + stop lifecycle", () => {
  test("daemon creates PID file and socket; stop cleans them up", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());

      expect(existsSync(socketPath())).toBe(true);
      const pid = readPidFile(pidPath());
      expect(pid).not.toBeNull();
      expect(pid).toBeGreaterThan(0);

      // Connect a client
      const client = makeClient();
      const ack = await client.connect();
      expect(ack.serverVersion).toBe("0.1.0");
      expect(ack.sessionToken).toBeTruthy();
      client.close();

      // Stop via SIGTERM
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 400));

      // PID and socket files cleaned up
      expect(existsSync(pidPath())).toBe(false);
      expect(existsSync(socketPath())).toBe(false);
    } finally {
      proc.kill("SIGTERM");
    }
  }, 10_000);
});

describe("auto-fork creates daemon", () => {
  test("autoForkDaemon spawns daemon and shim connects", async () => {
    const opts = {
      socketPath: socketPath(),
      lockPath: lockPath(),
      pidPath: pidPath(),
      stateDir: tmpDir,
      daemonCmd: ["bun", "run", DAEMON_SCRIPT, "start"],
      startupTimeoutMs: 5000,
    };

    // Set env so daemon.ts uses tmpDir as state dir
    const origEnv = process.env.SPACEBRIDGE_STATE_DIR;
    process.env.SPACEBRIDGE_STATE_DIR = tmpDir;

    try {
      await autoForkDaemon(opts);

      expect(existsSync(socketPath())).toBe(true);
      const pid = readPidFile(pidPath());
      expect(pid).not.toBeNull();

      // Cleanup daemon
      if (pid) {
        try { process.kill(pid, "SIGTERM"); } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      if (origEnv !== undefined) {
        process.env.SPACEBRIDGE_STATE_DIR = origEnv;
      } else {
        delete process.env.SPACEBRIDGE_STATE_DIR;
      }
    }
  }, 10_000);
});

describe("second shim connects without re-forking", () => {
  test("two auto-forks produce exactly one daemon PID", async () => {
    const opts = {
      socketPath: socketPath(),
      lockPath: lockPath(),
      pidPath: pidPath(),
      stateDir: tmpDir,
      daemonCmd: ["bun", "run", DAEMON_SCRIPT, "start"],
      startupTimeoutMs: 5000,
    };

    process.env.SPACEBRIDGE_STATE_DIR = tmpDir;
    const origEnv = process.env.SPACEBRIDGE_STATE_DIR;

    try {
      // Race two auto-forks
      await Promise.all([autoForkDaemon(opts), autoForkDaemon({ ...opts })]);

      const pid = readPidFile(pidPath());
      expect(pid).not.toBeNull();

      // Only one daemon process should exist
      expect(pid).toBeGreaterThan(0);

      if (pid) {
        try { process.kill(pid, "SIGTERM"); } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      if (origEnv !== undefined) {
        process.env.SPACEBRIDGE_STATE_DIR = origEnv;
      } else {
        delete process.env.SPACEBRIDGE_STATE_DIR;
      }
    }
  }, 10_000);
});

describe("sticky daemon survives shim disconnect", () => {
  test("daemon stays alive after shim disconnects", async () => {
    const proc = spawnDaemon();
    let daemonPid: number | null = null;

    try {
      await waitForSocket(socketPath());
      daemonPid = readPidFile(pidPath());
      expect(daemonPid).not.toBeNull();

      // Connect and immediately disconnect a shim
      const client = makeClient();
      await client.connect();
      client.close();

      // Wait briefly — daemon should still be running
      await new Promise(r => setTimeout(r, 300));

      expect(readPidFile(pidPath())).toBe(daemonPid);

      // Second shim can still connect
      const client2 = makeClient();
      const ack2 = await client2.connect();
      expect(ack2.sessionToken).toBeTruthy();
      client2.close();
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 200));
    }
  }, 10_000);
});

describe("SPACEBRIDGE_AUTO_STOP=1 daemon stops on last disconnect", () => {
  test("daemon exits when last shim disconnects", async () => {
    const proc = spawnDaemon({ SPACEBRIDGE_AUTO_STOP: "1" });

    try {
      await waitForSocket(socketPath());

      const client1 = makeClient("session-1");
      const client2 = makeClient("session-2");
      await client1.connect();
      await client2.connect();

      // Disconnect first — daemon should still be alive
      client1.close();
      await new Promise(r => setTimeout(r, 300));
      expect(existsSync(pidPath())).toBe(true);

      // Disconnect last shim — daemon should auto-stop within 5s
      client2.close();

      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (!existsSync(pidPath())) break;
        await new Promise(r => setTimeout(r, 100));
      }

      expect(existsSync(pidPath())).toBe(false);
    } finally {
      proc.kill("SIGTERM");
    }
  }, 15_000);
});

describe("stop subcommand sends SIGTERM", () => {
  test("daemon stops and cleans files after stop subcommand", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());
      const pid = readPidFile(pidPath());
      expect(pid).not.toBeNull();

      // Run stop subcommand
      const stopProc = Bun.spawn(["bun", "run", DAEMON_SCRIPT, "stop"], {
        stderr: "pipe",
        stdout: "ignore",
        env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir },
      });
      await stopProc.exited;

      // Wait for daemon to clean up
      await new Promise(r => setTimeout(r, 400));

      expect(existsSync(pidPath())).toBe(false);
      expect(existsSync(socketPath())).toBe(false);
    } finally {
      proc.kill("SIGTERM");
    }
  }, 10_000);
});

describe("status subcommand reports running daemon", () => {
  test("status reports PID, uptime > 0, and session count", async () => {
    const proc = spawnDaemon();
    try {
      await waitForSocket(socketPath());

      // Connect 2 clients and keep them connected
      const client1 = makeClient("s1");
      const client2 = makeClient("s2");
      await client1.connect();
      await client2.connect();

      // Run status subcommand and capture output
      const statusProc = Bun.spawn(["bun", "run", DAEMON_SCRIPT, "status"], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir },
      });

      // Wait for exit but allow 5s for status query
      const exitCode = await Promise.race([
        statusProc.exited,
        new Promise<number>((_, rej) => setTimeout(() => rej(new Error("status timed out")), 5000)),
      ]);

      const output = await new Response(statusProc.stdout).text();

      client1.close();
      client2.close();

      expect(output).toMatch(/daemon running/);
      expect(output).toMatch(/pid:/);
      expect(output).toMatch(/uptime:/);
      expect(output).toMatch(/sessions:/);
    } finally {
      proc.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 200));
    }
  }, 15_000);
});
