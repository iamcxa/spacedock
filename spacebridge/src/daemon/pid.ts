// spacebridge/src/daemon/pid.ts
// ABOUTME: PID file management utilities for the spacebridge daemon lifecycle.
// Provides read/write/alive-check/stale-cleanup for ~/.spacedock/spacebridge.pid.

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Write daemon PID to file, creating parent directories as needed. */
export function writePidFile(pidPath: string, pid: number): void {
  mkdirSync(dirname(pidPath), { recursive: true });
  writeFileSync(pidPath, String(pid), "utf8");
}

/** Read PID from file. Returns null if file is missing or content is not a valid integer. */
export function readPidFile(pidPath: string): number | null {
  if (!existsSync(pidPath)) return null;
  try {
    const content = readFileSync(pidPath, "utf8").trim();
    if (!content) return null;
    const pid = parseInt(content, 10);
    if (Number.isNaN(pid) || !Number.isFinite(pid) || pid <= 0) return null;
    return pid;
  } catch {
    return null;
  }
}

/** Check if a process is alive using signal 0 (existence check). */
export function isProcessAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH = no such process; EPERM = process exists but no permission (still alive)
    if ((err as NodeJS.ErrnoException).code === "EPERM") return true;
    return false;
  }
}

/**
 * Check if PID file is stale (process dead or file invalid).
 * If stale: deletes the PID file and returns true.
 * If live: leaves file intact and returns false.
 * If file missing: returns true (already clean).
 */
export function cleanStalePidFile(pidPath: string): boolean {
  const pid = readPidFile(pidPath);

  // File missing or unparseable → already clean (or remove corrupt file)
  if (pid === null) {
    if (existsSync(pidPath)) {
      try {
        unlinkSync(pidPath);
      } catch {}
    }
    return true;
  }

  // Process alive → not stale
  if (isProcessAlive(pid)) return false;

  // Process dead → stale, delete file
  try {
    unlinkSync(pidPath);
  } catch {}
  return true;
}
