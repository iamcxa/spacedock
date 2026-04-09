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

describe("EventBuffer.getChannelMessagesSince", () => {
  let buf: EventBuffer;

  beforeEach(() => {
    buf = new EventBuffer(makeDb(), 100);
  });

  test("returns only channel_message events after given seq", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    const msg1 = buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "hello" });
    buf.push({ type: "completion", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:02:00Z" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:03:00Z", detail: "world" });

    const results = buf.getChannelMessagesSince(0);
    expect(results).toHaveLength(2);
    expect(results[0].event.type).toBe("channel_message");
    expect(results[0].event.detail).toBe("hello");
    expect(results[1].event.detail).toBe("world");
  });

  test("respects since_seq parameter", () => {
    const msg1 = buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "first" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "second" });

    const results = buf.getChannelMessagesSince(msg1.seq);
    expect(results).toHaveLength(1);
    expect(results[0].event.detail).toBe("second");
  });

  test("filters by entity when provided", () => {
    buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "for alpha" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "for beta" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:02:00Z", detail: "project-level" });

    const results = buf.getChannelMessagesSince(0, "alpha");
    expect(results).toHaveLength(1);
    expect(results[0].event.detail).toBe("for alpha");
  });

  test("returns empty array when no channel_message events exist", () => {
    buf.push({ type: "dispatch", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:00:00Z" });
    buf.push({ type: "completion", entity: "alpha", stage: "build", agent: "fo", timestamp: "2026-01-01T00:01:00Z" });

    const results = buf.getChannelMessagesSince(0);
    expect(results).toHaveLength(0);
  });

  test("returns all channel_messages when entity is empty string", () => {
    buf.push({ type: "channel_message", entity: "alpha", stage: "", agent: "captain", timestamp: "2026-01-01T00:00:00Z", detail: "a" });
    buf.push({ type: "channel_message", entity: "beta", stage: "", agent: "captain", timestamp: "2026-01-01T00:01:00Z", detail: "b" });
    buf.push({ type: "channel_message", entity: "", stage: "", agent: "captain", timestamp: "2026-01-01T00:02:00Z", detail: "c" });

    const results = buf.getChannelMessagesSince(0, "");
    expect(results).toHaveLength(3);
  });
});
