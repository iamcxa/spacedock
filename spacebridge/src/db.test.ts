import { describe, test, expect, afterEach } from "bun:test";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDb } from "./db";
import { sessions } from "./schema";

// ABOUTME: Integration tests for createDb — verifies :memory: and temp-file paths,
// WAL mode, isolation between instances. Test isolation: no production DB paths used.

const tempDbs: string[] = [];

function makeTempPath(): string {
  const path = join(tmpdir(), `test-spacebridge-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  tempDbs.push(path);
  return path;
}

afterEach(() => {
  for (const p of tempDbs.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      try { rmSync(p + suffix); } catch {}
    }
  }
});

describe("createDb(:memory:)", () => {
  test("returns a drizzle instance that can execute queries", () => {
    const db = createDb(":memory:");
    // Drizzle instance must have insert/select methods
    expect(typeof db.insert).toBe("function");
    expect(typeof db.select).toBe("function");
  });

  test("can insert and retrieve rows via the schema", () => {
    const db = createDb(":memory:");
    const now = Date.now();
    db.insert(sessions).values({
      sessionId: "sess-db-test-001",
      projectRoot: "/tmp/project",
      pid: 42,
      connectedAt: now,
      lastHeartbeat: now,
    }).run();

    const rows = db.select().from(sessions).all();
    expect(rows.length).toBe(1);
    expect(rows[0].sessionId).toBe("sess-db-test-001");
    expect(rows[0].pid).toBe(42);
  });
});

describe("createDb(tempFilePath)", () => {
  test("creates the DB file at the given path", () => {
    const path = makeTempPath();
    expect(existsSync(path)).toBe(false);
    createDb(path);
    expect(existsSync(path)).toBe(true);
  });

  test("sets WAL journal mode for file DBs", () => {
    const path = makeTempPath();
    const db = createDb(path);
    // Access underlying sqlite via the drizzle session — use raw query
    const result = (db as any).$client.query("PRAGMA journal_mode").get() as { journal_mode: string };
    expect(result.journal_mode).toBe("wal");
  });

  test("data persists across separate createDb calls to same path", () => {
    const path = makeTempPath();
    const now = Date.now();

    // First open: write a row
    const db1 = createDb(path);
    db1.insert(sessions).values({
      sessionId: "persist-test",
      projectRoot: "/tmp/persist",
      pid: 1000,
      connectedAt: now,
      lastHeartbeat: now,
    }).run();
    (db1 as any).$client.close();

    // Second open: verify row survives
    const db2 = createDb(path);
    const rows = db2.select().from(sessions).all();
    expect(rows.length).toBe(1);
    expect(rows[0].sessionId).toBe("persist-test");
    (db2 as any).$client.close();
  });
});

describe("isolation between :memory: instances", () => {
  test("two :memory: DBs do not share data", () => {
    const db1 = createDb(":memory:");
    const db2 = createDb(":memory:");

    db1.insert(sessions).values({
      sessionId: "isolation-check",
      projectRoot: "/tmp/proj",
      pid: 777,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    }).run();

    const rows = db2.select().from(sessions).all();
    expect(rows.length).toBe(0);
  });
});
