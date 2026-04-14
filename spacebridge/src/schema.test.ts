import { describe, test, expect } from "bun:test";
import {
  sessions,
  entityLeases,
  events,
  comments,
  shareTokens,
  leaseEvents,
} from "./schema";
import { createDb } from "./db";

// ABOUTME: TDD-first schema tests for spacebridge Drizzle LCD schema.
// Tests run against :memory: SQLite — no production DB contamination.
// Validates: table existence, column names, LCD compliance (integer timestamps,
// no REAL/DATETIME affinity), fmodel columns on all 5 tables, and basic CRUD.

function createMemoryDb() {
  const db = createDb(":memory:");
  // drizzle-orm/bun-sqlite exposes $client as underlying bun:sqlite Database
  const sqlite = (db as { $client: import("bun:sqlite").Database }).$client;
  return { sqlite, db };
}

// ─── Table existence + column names ───────────────────────────────────────────

describe("sessions table", () => {
  test("exists with expected columns", () => {
    const { sqlite, db: _db } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(sessions)").all() as Array<{ name: string; type: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("session_id");
    expect(cols).toContain("project_root");
    expect(cols).toContain("pid");
    expect(cols).toContain("connected_at");
    expect(cols).toContain("last_heartbeat");
    sqlite.close();
  });

  test("has fmodel-compatible columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("event_type");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("payload");
    sqlite.close();
  });

  test("timestamps use INTEGER affinity (LCD compliance)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(sessions)").all() as Array<{ name: string; type: string }>;
    for (const col of info) {
      if (col.name === "connected_at" || col.name === "last_heartbeat") {
        expect(col.type.toUpperCase()).toBe("INTEGER");
      }
    }
    sqlite.close();
  });

  test("basic CRUD: insert and select", () => {
    const { sqlite, db } = createMemoryDb();
    const now = Date.now();
    db.insert(sessions).values({
      sessionId: "sess-001",
      projectRoot: "/home/user/project",
      pid: 12345,
      connectedAt: now,
      lastHeartbeat: now,
    }).run();

    const rows = db.select().from(sessions).all();
    expect(rows.length).toBe(1);
    expect(rows[0].sessionId).toBe("sess-001");
    expect(rows[0].projectRoot).toBe("/home/user/project");
    expect(rows[0].pid).toBe(12345);
    expect(rows[0].connectedAt).toBe(now);
    sqlite.close();
  });
});

describe("entity_leases table", () => {
  test("exists with expected columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(entity_leases)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("token");
    expect(cols).toContain("session_id");
    expect(cols).toContain("entity_slug");
    expect(cols).toContain("role");
    expect(cols).toContain("acquired_at");
    expect(cols).toContain("expires_at");
    sqlite.close();
  });

  test("has fmodel-compatible columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(entity_leases)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("event_type");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("payload");
    sqlite.close();
  });

  test("timestamps use INTEGER affinity (LCD compliance)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(entity_leases)").all() as Array<{ name: string; type: string }>;
    for (const col of info) {
      if (col.name === "acquired_at" || col.name === "expires_at") {
        expect(col.type.toUpperCase()).toBe("INTEGER");
      }
    }
    sqlite.close();
  });

  test("basic CRUD: insert and select", () => {
    const { sqlite, db } = createMemoryDb();
    const now = Date.now();
    db.insert(entityLeases).values({
      token: "lease-token-abc",
      sessionId: "sess-001",
      entitySlug: "my-entity",
      role: "SO",
      acquiredAt: now,
      expiresAt: now + 3600000,
    }).run();

    const rows = db.select().from(entityLeases).all();
    expect(rows.length).toBe(1);
    expect(rows[0].token).toBe("lease-token-abc");
    expect(rows[0].role).toBe("SO");
    sqlite.close();
  });
});

describe("events table", () => {
  test("exists with expected columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(events)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("type");
    expect(cols).toContain("entity");
    expect(cols).toContain("stage");
    expect(cols).toContain("agent");
    expect(cols).toContain("timestamp");
    expect(cols).toContain("detail");
    expect(cols).toContain("workflow_dir");
    sqlite.close();
  });

  test("has fmodel-compatible columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(events)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("event_type");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("payload");
    sqlite.close();
  });

  test("timestamp uses INTEGER affinity (LCD compliance)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(events)").all() as Array<{ name: string; type: string }>;
    const tsCol = info.find((c) => c.name === "timestamp");
    expect(tsCol?.type.toUpperCase()).toBe("INTEGER");
    sqlite.close();
  });

  test("basic CRUD: insert and select", () => {
    const { sqlite, db } = createMemoryDb();
    const now = Date.now();
    db.insert(events).values({
      type: "dispatch",
      entity: "my-entity",
      stage: "plan",
      agent: "ensign",
      timestamp: now,
      workflowDir: "/home/user/project",
    }).run();

    const rows = db.select().from(events).all();
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("dispatch");
    expect(rows[0].timestamp).toBe(now);
    sqlite.close();
  });
});

describe("comments table", () => {
  test("exists with expected columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(comments)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("comment_id");
    expect(cols).toContain("entity_path");
    expect(cols).toContain("selected_text");
    expect(cols).toContain("section_heading");
    expect(cols).toContain("content");
    expect(cols).toContain("author");
    expect(cols).toContain("created_at");
    expect(cols).toContain("resolved");
    expect(cols).toContain("resolved_reason");
    expect(cols).toContain("resolved_version");
    expect(cols).toContain("workflow_dir");
    sqlite.close();
  });

  test("has fmodel-compatible columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(comments)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("event_type");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("payload");
    sqlite.close();
  });

  test("created_at uses INTEGER affinity (LCD compliance)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(comments)").all() as Array<{ name: string; type: string }>;
    const createdAtCol = info.find((c) => c.name === "created_at");
    expect(createdAtCol?.type.toUpperCase()).toBe("INTEGER");
    sqlite.close();
  });

  test("resolved defaults to 0", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(comments)").all() as Array<{ name: string; dflt_value: string | null }>;
    const resolvedCol = info.find((c) => c.name === "resolved");
    expect(resolvedCol?.dflt_value).toBe("0");
    sqlite.close();
  });

  test("basic CRUD: insert and select", () => {
    const { sqlite, db } = createMemoryDb();
    const now = Date.now();
    db.insert(comments).values({
      commentId: "comment-uuid-001",
      entityPath: "/docs/my-entity.md",
      selectedText: "some text",
      sectionHeading: "## Directive",
      content: "This needs clarification",
      author: "captain",
      createdAt: now,
      workflowDir: "/home/user/project",
    }).run();

    const rows = db.select().from(comments).all();
    expect(rows.length).toBe(1);
    expect(rows[0].commentId).toBe("comment-uuid-001");
    expect(rows[0].resolved).toBe(0);
    sqlite.close();
  });
});

describe("share_tokens table", () => {
  test("exists with expected columns (bearer-token model)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(share_tokens)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("token");
    expect(cols).toContain("entity_slug");
    expect(cols).toContain("created_at");
    expect(cols).toContain("expires_at");
    // Old password-based columns removed per O-1
    expect(cols).not.toContain("password_hash");
    expect(cols).not.toContain("entity_paths");
    expect(cols).not.toContain("stages");
    expect(cols).not.toContain("label");
    expect(cols).not.toContain("hash_algorithm");
    sqlite.close();
  });

  test("has fmodel-compatible columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(share_tokens)").all() as Array<{ name: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("event_type");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("payload");
    sqlite.close();
  });

  test("timestamps use INTEGER affinity (LCD compliance)", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(share_tokens)").all() as Array<{ name: string; type: string }>;
    for (const col of info) {
      if (col.name === "created_at" || col.name === "expires_at") {
        expect(col.type.toUpperCase()).toBe("INTEGER");
      }
    }
    sqlite.close();
  });

  test("basic CRUD: insert and select bearer-token row", () => {
    const { sqlite, db } = createMemoryDb();
    const now = Date.now();
    db.insert(shareTokens).values({
      token: "a".repeat(48),
      entitySlug: "my-entity",
      createdAt: now,
      expiresAt: now + 86400000,
    }).run();

    const rows = db.select().from(shareTokens).all();
    expect(rows.length).toBe(1);
    expect(rows[0].token).toBe("a".repeat(48));
    expect(rows[0].entitySlug).toBe("my-entity");
    sqlite.close();
  });
});

// ─── Cross-table LCD compliance ────────────────────────────────────────────────

describe("LCD compliance across all tables", () => {
  const tableNames = ["sessions", "entity_leases", "events", "comments", "share_tokens"];

  test("no REAL or DATETIME column affinity in any table", () => {
    const { sqlite } = createMemoryDb();
    for (const tableName of tableNames) {
      const info = sqlite.query(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string; type: string }>;
      for (const col of info) {
        const t = col.type.toUpperCase();
        expect(t).not.toMatch(/REAL|FLOAT|DOUBLE|DATETIME|DATE/);
      }
    }
    sqlite.close();
  });

  test("all 5 tables have fmodel columns (event_type, aggregate_id, sequence_number, payload)", () => {
    const { sqlite } = createMemoryDb();
    const fmodelCols = ["event_type", "aggregate_id", "sequence_number", "payload"];
    for (const tableName of tableNames) {
      const info = sqlite.query(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
      const cols = info.map((c) => c.name);
      for (const fCol of fmodelCols) {
        expect(cols).toContain(fCol);
      }
    }
    sqlite.close();
  });
});

// ─── Test isolation guard ──────────────────────────────────────────────────────

describe("test isolation", () => {
  test("two :memory: databases are fully isolated", () => {
    const { sqlite: s1, db: db1 } = createMemoryDb();
    const { sqlite: s2, db: db2 } = createMemoryDb();

    db1.insert(sessions).values({
      sessionId: "sess-isolation",
      projectRoot: "/tmp/proj",
      pid: 999,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    }).run();

    const rows = db2.select().from(sessions).all();
    expect(rows.length).toBe(0);

    s1.close();
    s2.close();
  });
});

// ─── lease_events table ────────────────────────────────────────────────────────

describe("lease_events table", () => {
  test("exists with expected columns", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(lease_events)").all() as Array<{ name: string; type: string }>;
    const cols = info.map((c) => c.name);
    expect(cols).toContain("id");
    expect(cols).toContain("aggregate_id");
    expect(cols).toContain("sequence_number");
    expect(cols).toContain("event_type");
    expect(cols).toContain("payload");
    expect(cols).toContain("timestamp");
  });

  test("insert and query round-trip", () => {
    const { db } = createMemoryDb();
    const now = Date.now();
    db.insert(leaseEvents).values({
      aggregateId: "my-entity::FO",
      sequenceNumber: 1,
      eventType: "acquired",
      payload: JSON.stringify({ token: "tok-1", entitySlug: "my-entity", role: "FO" }),
      timestamp: now,
    }).run();

    const rows = db.select().from(leaseEvents).all();
    expect(rows.length).toBe(1);
    expect(rows[0].aggregateId).toBe("my-entity::FO");
    expect(rows[0].eventType).toBe("acquired");
    expect(rows[0].timestamp).toBe(now);
  });

  test("LCD compliance — integer timestamps", () => {
    const { sqlite } = createMemoryDb();
    const info = sqlite.query("PRAGMA table_info(lease_events)").all() as Array<{ name: string; type: string }>;
    const tsCol = info.find((c) => c.name === "timestamp");
    expect(tsCol?.type.toUpperCase()).toBe("INTEGER");
  });
});
