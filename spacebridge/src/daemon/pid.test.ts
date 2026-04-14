// spacebridge/src/daemon/pid.test.ts
// ABOUTME: Tests for PID file management utilities (writePidFile, readPidFile, isProcessAlive, cleanStalePidFile).
// Uses temp directories for isolation — never touches production ~/.spacedock/ paths.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cleanStalePidFile, isProcessAlive, readPidFile, writePidFile } from "./pid";

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "sb-pid-test-"));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("writePidFile", () => {
  test("writes PID to file", () => {
    const pidPath = join(tmpDir, "test.pid");
    writePidFile(pidPath, 12345);
    const content = Bun.file(pidPath).text();
    expect(content).resolves.toBe("12345");
  });

  test("creates parent directory if missing", () => {
    const pidPath = join(tmpDir, "nested", "dir", "test.pid");
    writePidFile(pidPath, 99999);
    expect(existsSync(pidPath)).toBe(true);
  });

  test("overwrites existing PID file", () => {
    const pidPath = join(tmpDir, "test.pid");
    writePidFile(pidPath, 11111);
    writePidFile(pidPath, 22222);
    const content = Bun.file(pidPath).text();
    expect(content).resolves.toBe("22222");
  });
});

describe("readPidFile", () => {
  test("returns PID from existing file", () => {
    const pidPath = join(tmpDir, "test.pid");
    writePidFile(pidPath, 55555);
    expect(readPidFile(pidPath)).toBe(55555);
  });

  test("returns null if file does not exist", () => {
    const pidPath = join(tmpDir, "nonexistent.pid");
    expect(readPidFile(pidPath)).toBeNull();
  });

  test("returns null if file content is not a valid integer", () => {
    const pidPath = join(tmpDir, "bad.pid");
    Bun.write(pidPath, "not-a-number");
    expect(readPidFile(pidPath)).toBeNull();
  });

  test("returns null if file is empty", () => {
    const pidPath = join(tmpDir, "empty.pid");
    Bun.write(pidPath, "");
    expect(readPidFile(pidPath)).toBeNull();
  });
});

describe("isProcessAlive", () => {
  test("returns true for the current process PID", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  test("returns false for a PID that does not exist", () => {
    // PID 999999999 is extremely unlikely to exist
    expect(isProcessAlive(999999999)).toBe(false);
  });

  test("returns false for PID 0 (invalid)", () => {
    // kill(0, 0) targets the current process group — treat as special case
    // PID 0 is not a valid daemon PID; implementation should return false
    expect(isProcessAlive(0)).toBe(false);
  });
});

describe("cleanStalePidFile", () => {
  test("returns false and leaves file if process is still alive", () => {
    const pidPath = join(tmpDir, "live.pid");
    writePidFile(pidPath, process.pid);
    const cleaned = cleanStalePidFile(pidPath);
    expect(cleaned).toBe(false);
    expect(existsSync(pidPath)).toBe(true);
  });

  test("returns true and removes file if process is dead", () => {
    const pidPath = join(tmpDir, "dead.pid");
    writePidFile(pidPath, 999999999); // dead PID
    const cleaned = cleanStalePidFile(pidPath);
    expect(cleaned).toBe(true);
    expect(existsSync(pidPath)).toBe(false);
  });

  test("returns true if PID file does not exist (already clean)", () => {
    const pidPath = join(tmpDir, "nonexistent.pid");
    const cleaned = cleanStalePidFile(pidPath);
    expect(cleaned).toBe(true);
  });

  test("returns true and removes file if content is invalid", () => {
    const pidPath = join(tmpDir, "invalid.pid");
    Bun.write(pidPath, "garbage");
    const cleaned = cleanStalePidFile(pidPath);
    expect(cleaned).toBe(true);
    expect(existsSync(pidPath)).toBe(false);
  });
});
