// ABOUTME: Tests for db.ts — openReadOnlyDb factory, readonly enforcement, and basic select.
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync } from "node:fs";
import { createDb } from "../../src/db";
import { openReadOnlyDb } from "./db";
import { events } from "../../src/schema";

const TMP = join(tmpdir(), `db-test-${Date.now()}`);

describe("openReadOnlyDb", () => {
  test("readonly prevents INSERT — throws SQLITE_READONLY", () => {
    mkdirSync(TMP, { recursive: true });
    const dbPath = join(TMP, "test.db");
    // Create DB with schema first using writable factory
    createDb(dbPath);
    // Now open read-only
    const db = openReadOnlyDb(dbPath);
    expect(() => {
      db.insert(events).values({
        type: "stage_transition",
        entity: "test",
        stage: "execute",
        agent: "test-agent",
        timestamp: Date.now(),
        workflowDir: "/tmp",
      }).run();
    }).toThrow();
  });

  test("select from events returns empty array for fresh DB", () => {
    mkdirSync(TMP, { recursive: true });
    const dbPath = join(TMP, "fresh.db");
    createDb(dbPath);
    const db = openReadOnlyDb(dbPath);
    const rows = db.select().from(events).all();
    expect(rows).toEqual([]);
  });
});
