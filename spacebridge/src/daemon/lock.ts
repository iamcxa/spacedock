// spacebridge/src/daemon/lock.ts
// ABOUTME: mkdir-based atomic lock for daemon double-fork prevention.
// mkdir is atomic on all POSIX + Windows filesystems — EEXIST on collision.
// Stale lock detection via mtime comparison (handles crash without rmdir).

import { mkdirSync, rmdirSync, statSync, existsSync } from "node:fs";

export interface AcquireLockOptions {
  /** Milliseconds after which a held lock is considered stale (default: 10000). */
  staleThresholdMs?: number;
}

/**
 * Attempt to acquire the mkdir-based lock at lockPath.
 * Returns true if acquired, false if lock is held by a live process.
 * Handles stale locks (from crashed process) by checking mtime.
 */
export function acquireLock(lockPath: string, opts?: AcquireLockOptions): boolean {
  const staleThresholdMs = opts?.staleThresholdMs ?? 10_000;

  try {
    mkdirSync(lockPath);
    return true; // acquired
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
  }

  // Lock directory exists — check if it's stale
  try {
    const stat = statSync(lockPath);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs > staleThresholdMs) {
      // Stale lock — remove and re-acquire
      try { rmdirSync(lockPath); } catch {}
      try {
        mkdirSync(lockPath);
        return true;
      } catch {
        return false; // another process raced us to the stale lock
      }
    }
  } catch {
    // statSync failed — lock may have just been released
    try {
      mkdirSync(lockPath);
      return true;
    } catch {
      return false;
    }
  }

  return false; // lock is fresh and held
}

/**
 * Release the lock by removing the directory.
 * Idempotent — does not throw if lock directory is already gone.
 */
export function releaseLock(lockPath: string): void {
  if (!existsSync(lockPath)) return;
  try { rmdirSync(lockPath); } catch {}
}
