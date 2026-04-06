import { describe, test, expect } from "bun:test";
import { openDb } from "./db";

describe("openDb", () => {
  test("creates share_links and events tables in :memory: database", () => {
    const db = openDb(":memory:");
    // Verify share_links table exists with expected columns
    const shareInfo = db.query("PRAGMA table_info(share_links)").all() as Array<{ name: string }>;
    const shareColumns = shareInfo.map((c) => c.name);
    expect(shareColumns).toContain("token");
    expect(shareColumns).toContain("password_hash");
    expect(shareColumns).toContain("entity_paths");
    expect(shareColumns).toContain("stages");
    expect(shareColumns).toContain("label");
    expect(shareColumns).toContain("created_at");
    expect(shareColumns).toContain("expires_at");

    // Verify events table exists with expected columns
    const eventsInfo = db.query("PRAGMA table_info(events)").all() as Array<{ name: string }>;
    const eventsColumns = eventsInfo.map((c) => c.name);
    expect(eventsColumns).toContain("seq");
    expect(eventsColumns).toContain("type");
    expect(eventsColumns).toContain("entity");
    expect(eventsColumns).toContain("stage");
    expect(eventsColumns).toContain("agent");
    expect(eventsColumns).toContain("timestamp");
    expect(eventsColumns).toContain("detail");
    db.close();
  });

  test("does NOT set WAL mode on :memory: database", () => {
    const db = openDb(":memory:");
    const result = db.query("PRAGMA journal_mode").get() as { journal_mode: string };
    // :memory: databases use "memory" journal mode, not "wal"
    expect(result.journal_mode).toBe("memory");
    db.close();
  });

  test("two :memory: databases are fully isolated", () => {
    const db1 = openDb(":memory:");
    const db2 = openDb(":memory:");
    db1.exec("INSERT INTO share_links (token, password_hash, entity_paths, stages, label, created_at, expires_at) VALUES ('t1', 'h', '[]', '[]', 'l', '2026-01-01', '2027-01-01')");
    const rows = db2.query("SELECT * FROM share_links").all();
    expect(rows.length).toBe(0);
    db1.close();
    db2.close();
  });
});
