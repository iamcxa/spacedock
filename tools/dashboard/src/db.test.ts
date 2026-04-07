import { describe, test, expect } from "bun:test";
import { openDb } from "./db";
import { ShareRegistry } from "./auth";
import { EventBuffer } from "./events";
import { rmSync } from "node:fs";
import { join } from "node:path";

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

const TMP_DB = join(import.meta.dir, "__test_persistence__.db");

function cleanupTmpDb() {
  for (const suffix of ["", "-wal", "-shm"]) {
    try { rmSync(TMP_DB + suffix); } catch {}
  }
}

describe("persistence round-trip", () => {
  test("share links survive database reopen", async () => {
    cleanupTmpDb();

    // Session 1: create a share link
    const db1 = openDb(TMP_DB);
    const reg1 = new ShareRegistry(db1);
    const link = await reg1.create({
      password: "persist-test",
      entityPaths: ["/a.md", "/b.md"],
      stages: ["explore"],
      label: "Persistent Link",
      ttlHours: 24,
    });
    db1.close();

    // Session 2: reopen and verify link exists
    const db2 = openDb(TMP_DB);
    const reg2 = new ShareRegistry(db2);
    const found = reg2.get(link.token);
    expect(found).not.toBeNull();
    expect(found!.label).toBe("Persistent Link");
    expect(found!.entityPaths).toEqual(["/a.md", "/b.md"]);
    expect(found!.stages).toEqual(["explore"]);
    // Verify password still works across sessions
    const valid = await reg2.verify(link.token, "persist-test");
    expect(valid).toBe(true);
    db2.close();

    cleanupTmpDb();
  });

  test("events survive database reopen", () => {
    cleanupTmpDb();

    // Session 1: push events
    const db1 = openDb(TMP_DB);
    const buf1 = new EventBuffer(db1, 100);
    buf1.push({
      type: "dispatch",
      entity: "test-entity",
      stage: "plan",
      agent: "ensign",
      timestamp: "2026-04-07T10:00:00Z",
      detail: "Started work",
    });
    buf1.push({
      type: "completion",
      entity: "test-entity",
      stage: "plan",
      agent: "ensign",
      timestamp: "2026-04-07T10:30:00Z",
      detail: "Finished work",
    });
    db1.close();

    // Session 2: reopen and verify events exist
    const db2 = openDb(TMP_DB);
    const buf2 = new EventBuffer(db2, 100);
    const all = buf2.getAll();
    expect(all.length).toBe(2);
    expect(all[0].event.type).toBe("dispatch");
    expect(all[0].event.detail).toBe("Started work");
    expect(all[1].event.type).toBe("completion");
    expect(all[1].seq).toBeGreaterThan(all[0].seq);

    // getSince also works across sessions
    const since = buf2.getSince(all[0].seq);
    expect(since.length).toBe(1);
    expect(since[0].event.type).toBe("completion");
    db2.close();

    cleanupTmpDb();
  });
});
