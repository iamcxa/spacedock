// spacebridge/src/daemon/lock.test.ts
// ABOUTME: Tests for mkdir-based lock file utilities (acquireLock, releaseLock).
// Uses temp directories for isolation — never touches production ~/.spacedock/ paths.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireLock, releaseLock } from "./lock";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-lock-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("acquireLock", () => {
  test("acquires lock when no lock exists", () => {
    const lockPath = join(tmpDir, "test.lock");
    const acquired = acquireLock(lockPath);
    expect(acquired).toBe(true);
    expect(existsSync(lockPath)).toBe(true);
  });

  test("returns false when lock is held by another live process", () => {
    const lockPath = join(tmpDir, "held.lock");
    // Acquire first
    acquireLock(lockPath);
    // Attempt to acquire again
    const second = acquireLock(lockPath);
    expect(second).toBe(false);
  });

  test("acquires stale lock (mtime older than threshold)", () => {
    const lockPath = join(tmpDir, "stale.lock");
    mkdirSync(lockPath);
    // Set mtime to 30 seconds ago (stale threshold default is 10s)
    const past = new Date(Date.now() - 30_000);
    utimesSync(lockPath, past, past);
    const acquired = acquireLock(lockPath, { staleThresholdMs: 10_000 });
    expect(acquired).toBe(true);
  });

  test("does not acquire fresh lock (mtime within threshold)", () => {
    const lockPath = join(tmpDir, "fresh.lock");
    mkdirSync(lockPath);
    // Fresh lock — mtime is just now
    const acquired = acquireLock(lockPath, { staleThresholdMs: 10_000 });
    expect(acquired).toBe(false);
  });
});

describe("releaseLock", () => {
  test("removes lock directory", () => {
    const lockPath = join(tmpDir, "release.lock");
    acquireLock(lockPath);
    expect(existsSync(lockPath)).toBe(true);
    releaseLock(lockPath);
    expect(existsSync(lockPath)).toBe(false);
  });

  test("is idempotent — does not throw if lock already released", () => {
    const lockPath = join(tmpDir, "idempotent.lock");
    expect(() => releaseLock(lockPath)).not.toThrow();
  });
});
