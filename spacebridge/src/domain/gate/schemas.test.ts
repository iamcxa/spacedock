// ABOUTME: Tests for gate aggregate Zod schemas — boundary validation.

import { describe, expect, test } from "bun:test";
import { parseCommand, parseEvent } from "./schemas";

const NOW = 1_700_000_000_000;

describe("parseCommand", () => {
  test("accepts valid approve_gate", () => {
    const result = parseCommand({
      type: "approve_gate",
      entitySlug: "entity-099",
      stage: "plan",
      decidedBy: "captain",
    });
    expect(result.type).toBe("approve_gate");
  });

  test("accepts valid reject_gate with reason", () => {
    const result = parseCommand({
      type: "reject_gate",
      entitySlug: "entity-099",
      stage: "plan",
      decidedBy: "captain",
      reason: "needs revision",
    });
    expect(result.type).toBe("reject_gate");
  });

  test("rejects missing entitySlug", () => {
    expect(() =>
      parseCommand({
        type: "approve_gate",
        stage: "plan",
        decidedBy: "captain",
      }),
    ).toThrow();
  });

  test("rejects unknown type", () => {
    expect(() => parseCommand({ type: "unknown_type" })).toThrow();
  });

  test("rejects empty entitySlug", () => {
    expect(() =>
      parseCommand({
        type: "approve_gate",
        entitySlug: "",
        stage: "plan",
        decidedBy: "captain",
      }),
    ).toThrow();
  });
});

describe("parseEvent", () => {
  test("accepts gate_approved", () => {
    const result = parseEvent({
      type: "gate_approved",
      entitySlug: "entity-099",
      stage: "plan",
      decidedBy: "captain",
      decidedAt: NOW,
    });
    expect(result.type).toBe("gate_approved");
  });

  test("accepts gate_rejected", () => {
    const result = parseEvent({
      type: "gate_rejected",
      entitySlug: "entity-099",
      stage: "plan",
      decidedBy: "captain",
      reason: "needs work",
      decidedAt: NOW,
    });
    expect(result.type).toBe("gate_rejected");
  });

  test("rejects malformed event", () => {
    expect(() => parseEvent({ type: "gate_approved" })).toThrow();
  });
});
