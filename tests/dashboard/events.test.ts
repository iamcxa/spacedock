import { describe, test, expect } from "bun:test";
import { EventBuffer } from "../../tools/dashboard/src/events";

describe("EventBuffer", () => {
  test("stores events and assigns incrementing sequence numbers", () => {
    const buf = new EventBuffer(100);
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
    const buf = new EventBuffer(100);
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
    const buf = new EventBuffer(100);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "2026-04-04T10:00:00Z" });
    const result = buf.getSince(1);
    expect(result.length).toBe(0);
  });

  test("ring buffer evicts oldest events when capacity exceeded", () => {
    const buf = new EventBuffer(3);
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
    const buf = new EventBuffer(100);
    buf.push({ type: "dispatch", entity: "a", stage: "plan", agent: "e1", timestamp: "t1" });
    buf.push({ type: "gate", entity: "a", stage: "plan", agent: "e1", timestamp: "t2" });
    const all = buf.getAll();
    expect(all.length).toBe(2);
    expect(all[0].seq).toBe(1);
  });

  test("validates event type", () => {
    const buf = new EventBuffer(100);
    expect(() => {
      buf.push({ type: "invalid" as any, entity: "a", stage: "s", agent: "e", timestamp: "t" });
    }).toThrow();
  });
});
