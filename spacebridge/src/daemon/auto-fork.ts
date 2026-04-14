// spacebridge/src/daemon/auto-fork.ts
// ABOUTME: Shim-side auto-fork daemon lifecycle logic.
// Implements design doc §4.2 pseudocode: probe → lock → double-check → spawn → wait → connect.
// Uses mkdir-based lock (O-1 decision) and SPACEBRIDGE_DEV env var for invocation (O-2 decision).

import * as net from "node:net";
import { spawn } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { acquireLock, releaseLock } from "./lock";
import { cleanStalePidFile } from "./pid";

export interface AutoForkOptions {
  socketPath: string;
  lockPath: string;
  pidPath: string;
  stateDir: string;
  daemonCmd: string[];
  /** Milliseconds to wait for socket to appear after spawning (default: 5000). */
  startupTimeoutMs?: number;
  /** Milliseconds after which lock is considered stale (default: 10000). */
  lockStaleMs?: number;
}

/** Probe whether a socket is accepting connections. Returns true if connectable. */
function probeSocket(socketPath: string): Promise<boolean> {
  return new Promise((resolve_) => {
    if (!existsSync(socketPath)) {
      resolve_(false);
      return;
    }
    const sock = net.createConnection({ path: socketPath });
    sock.on("connect", () => { sock.destroy(); resolve_(true); });
    sock.on("error", () => { resolve_(false); });
  });
}

/** Poll until socket accepts a connection or timeout expires. */
function waitForSocket(socketPath: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve_, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      probeSocket(socketPath).then((alive) => {
        if (alive) {
          resolve_();
        } else if (Date.now() >= deadline) {
          reject(new Error(`waitForSocket timed out after ${timeoutMs}ms`));
        } else {
          setTimeout(poll, 100);
        }
      }).catch(() => {});
    };
    poll();
  });
}

/**
 * Auto-fork daemon if not already running.
 * Follows design doc §4.2 pseudocode exactly.
 */
export async function autoForkDaemon(opts: AutoForkOptions): Promise<void> {
  const {
    socketPath,
    lockPath,
    pidPath,
    daemonCmd,
    startupTimeoutMs = 5000,
    lockStaleMs = 10_000,
  } = opts;

  // Step 0: SPACEBRIDGE_NO_AUTOFORK guard
  if (process.env.SPACEBRIDGE_NO_AUTOFORK === "1") {
    throw new Error("auto-fork disabled via SPACEBRIDGE_NO_AUTOFORK=1");
  }

  // Step 1: Probe socket — if daemon is already running, return immediately
  const alreadyRunning = await probeSocket(socketPath);
  if (alreadyRunning) return;

  // Step 2: Stale recovery — clean stale PID file, stale socket file, stale lock
  const pidCleaned = cleanStalePidFile(pidPath);
  if (pidCleaned && existsSync(socketPath)) {
    try { unlinkSync(socketPath); } catch {}
  }

  // Step 3: Acquire lock (mkdir-based, atomic)
  const acquired = acquireLock(lockPath, { staleThresholdMs: lockStaleMs });
  if (!acquired) {
    // Another process holds the lock — wait for socket they're creating
    return waitForSocket(socketPath, startupTimeoutMs);
  }

  try {
    // Step 4: Double-check under lock
    const stillRunning = await probeSocket(socketPath);
    if (stillRunning) return;

    // Step 5: Fork detached daemon
    const [cmd, ...args] = daemonCmd;
    const child = spawn(cmd, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Step 6: Wait for socket to appear
    await waitForSocket(socketPath, startupTimeoutMs);
  } finally {
    // Step 7: Release lock
    releaseLock(lockPath);
  }
}

/**
 * Resolve the daemon spawn command.
 * Resolves bin/cli.ts relative to this file — no global CLI required (Q-1 decision, entity 059).
 */
export function resolveDaemonCommand(): string[] {
  const thisFile = fileURLToPath(import.meta.url);
  const cliPath = resolve(dirname(thisFile), "../../bin/cli.ts");
  return ["bun", "run", cliPath, "start"];
}
