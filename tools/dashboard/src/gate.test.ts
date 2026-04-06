import { describe, test, expect } from "bun:test";
import { EventBuffer } from "./events";

describe("EventBuffer event type validation", () => {
  test("accepts gate_decision event type", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "gate_decision" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "approved",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("gate_decision");
  });

  test("accepts comment event type (bug fix)", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "comment" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test comment",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
  });

  test("accepts suggestion event type (bug fix)", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "suggestion" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test suggestion",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
  });

  test("rejects unknown event type", () => {
    const buffer = new EventBuffer(10);
    const event = {
      type: "nonexistent" as any,
      entity: "test",
      stage: "test",
      agent: "test",
      timestamp: new Date().toISOString(),
    };
    expect(() => buffer.push(event)).toThrow("Invalid event type: nonexistent");
  });
});
