import { describe, test, expect } from "bun:test";
import { EventBuffer } from "../../tools/dashboard/src/events";
import { openDb } from "../../tools/dashboard/src/db";

describe("EventBuffer", () => {
  test("stores events and assigns incrementing sequence numbers", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 100);
    const e1 = buf.push({
      type: "dispatch",
      entity: "feat-a",
      stage: "execute",
      agent: "ensign-feat-a-execute",
      timestamp: "2026-04-04T10:00:00Z",
    });
    const e2 = buf.push({
      type: "completion",
      entity: "feat-a",
      stage: "execute",
      agent: "ensign-feat-a-execute",
      timestamp: "2026-04-04T10:05:00Z",
    });
    expect(e1.seq).toBe(1);
    expect(e2.seq).toBe(2);
    expect(e1.event.type).toBe("dispatch");
  });

  test("getSince returns events after given sequence number", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 100);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:00:00Z" });
    buf.push({ type: "completion", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:01:00Z" });
    buf.push({ type: "dispatch", entity: "b", stage: "plan", agent: "e2", timestamp: "2026-04-04T10:02:00Z" });

    const after1 = buf.getSince(1);
    expect(after1.length).toBe(2);
    expect(after1[0].seq).toBe(2);
    expect(after1[1].seq).toBe(3);

    const after0 = buf.getSince(0);
    expect(after0.length).toBe(3);
  });

  test("getSince returns empty array when no events after seq", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 100);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:00:00Z" });
    const result = buf.getSince(1);
    expect(result.length).toBe(0);
  });

  test("ring buffer evicts oldest events when capacity exceeded", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 3);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "t1" });
    buf.push({ type: "dispatch", entity: "b", stage: "plan", agent: "e2", timestamp: "t2" });
    buf.push({ type: "dispatch", entity: "c", stage: "plan", agent: "e3", timestamp: "t3" });
    buf.push({ type: "dispatch", entity: "d", stage: "plan", agent: "e4", timestamp: "t4" }); // evicts "a"

    const all = buf.getSince(0);
    expect(all.length).toBe(3);
    expect(all[0].event.entity).toBe("b");
    expect(all[2].event.entity).toBe("d");
    // seq numbers are still monotonic even after eviction
    expect(all[0].seq).toBe(2);
    expect(all[2].seq).toBe(4);
  });

  test("getAll returns all buffered events", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 100);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "t1" });
    buf.push({ type: "gate", entity: "a", stage: "plan", agent: "e1", timestamp: "t2" });
    const all = buf.getAll();
    expect(all.length).toBe(2);
    expect(all[0].seq).toBe(1);
  });

  test("validates event type", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 100);
    expect(() => {
      buf.push({ type: "invalid" as any, entity: "a", stage: "s", agent: "e", timestamp: "t" });
    }).toThrow();
  });

  test("push accepts channel_message event type", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 10);
    const entry = buf.push({
      type: "channel_message",
      entity: "",
      stage: "",
      agent: "captain",
      timestamp: "2026-04-05T10:00:00Z",
      detail: "Hello FO",
    });
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("channel_message");
  });

  test("push accepts channel_response event type", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 10);
    const entry = buf.push({
      type: "channel_response",
      entity: "",
      stage: "",
      agent: "fo",
      timestamp: "2026-04-05T10:01:00Z",
      detail: "Acknowledged, scanning now",
    });
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("channel_response");
  });

  test("push accepts permission_request event type", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 10);
    const entry = buf.push({
      type: "permission_request",
      entity: "",
      stage: "",
      agent: "claude",
      timestamp: "2026-04-05T10:02:00Z",
      detail: "Bash: git push origin main",
    });
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("permission_request");
  });

  test("push accepts permission_response event type", () => {
    const db = openDb(":memory:");
    const buf = new EventBuffer(db, 10);
    const entry = buf.push({
      type: "permission_response",
      entity: "",
      stage: "",
      agent: "captain",
      timestamp: "2026-04-05T10:03:00Z",
      detail: "allow",
    });
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("permission_response");
  });
});
