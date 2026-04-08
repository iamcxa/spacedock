import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { EventBuffer } from "./events";

function makeDb(): Database {
  const db = new Database(":memory:");
  db.run(`CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    entity TEXT NOT NULL,
    stage TEXT NOT NULL,
    agent TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    detail TEXT
  )`);
  return db;
}

describe("EventBuffer.getByEntity", () => {
  let buf: EventBuffer;

  beforeEach(() => {
    buf = new EventBuffer(makeDb(), 100);
  });

  test("returns only events matching the given entity slug", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    buf.push({ type: "completion", entity: "beta", stage: "build", agent: "fo", timestamp: "2026-01-01T00:01:00Z" });
    buf.push({ type: "gate", entity: "alpha", stage: "quality", agent: "fo", timestamp: "2026-01-01T00:02:00Z" });

    const results = buf.getByEntity("alpha");
    expect(results).toHaveLength(2);
    expect(results[0].event.entity).toBe("alpha");
    expect(results[1].event.entity).toBe("alpha");
    expect(results[0].event.type).toBe("dispatch");
    expect(results[1].event.type).toBe("gate");
  });

  test("returns empty array when no events match", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    const results = buf.getByEntity("nonexistent");
    expect(results).toHaveLength(0);
  });

  test("returns events in seq ASC order", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "brainstorm", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    buf.push({ type: "gate", entity: "alpha", stage: "explore", agent: "fo", timestamp: "2026-01-01T00:01:00Z" });
    buf.push({ type: "completion", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:02:00Z" });

    const results = buf.getByEntity("alpha");
    expect(results[0].seq).toBeLessThan(results[1].seq);
    expect(results[1].seq).toBeLessThan(results[2].seq);
  });
});
