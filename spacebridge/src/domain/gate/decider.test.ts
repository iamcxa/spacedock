// ABOUTME: Tests for the gate aggregate decider — pure function, no I/O.

import { describe, expect, test } from "bun:test";
import { decide } from "./decider";
import { GateAlreadyDecided } from "./errors";
import type { GateState } from "./types";

const NOW = 1_700_000_000_000;

describe("decide — approve_gate", () => {
  test("happy path returns gate_approved event", () => {
    const state: GateState = new Map();
    const events = decide({ type: "approve_gate", entitySlug: "entity-001", stage: "plan", decidedBy: "captain" }, state, NOW);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("gate_approved");
    if (events[0].type === "gate_approved") {
      expect(events[0].entitySlug).toBe("entity-001");
      expect(events[0].decidedAt).toBe(NOW);
    }
  });

  test("duplicate gate throws GateAlreadyDecided", () => {
    const state: GateState = new Map([
      ["entity-001::plan", { decision: "approved", entitySlug: "entity-001", stage: "plan", decidedBy: "captain", decidedAt: NOW, reason: null }],
    ]);
    expect(() =>
      decide({ type: "approve_gate", entitySlug: "entity-001", stage: "plan", decidedBy: "captain" }, state, NOW),
    ).toThrow(GateAlreadyDecided);
  });
});

describe("decide — reject_gate", () => {
  test("happy path returns gate_rejected event", () => {
    const state: GateState = new Map();
    const events = decide({ type: "reject_gate", entitySlug: "entity-001", stage: "plan", decidedBy: "captain", reason: "needs revision" }, state, NOW);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("gate_rejected");
    if (events[0].type === "gate_rejected") {
      expect(events[0].reason).toBe("needs revision");
    }
  });

  test("duplicate reject throws GateAlreadyDecided", () => {
    const state: GateState = new Map([
      ["entity-001::plan", { decision: "rejected", entitySlug: "entity-001", stage: "plan", decidedBy: "captain", decidedAt: NOW, reason: "x" }],
    ]);
    expect(() =>
      decide({ type: "reject_gate", entitySlug: "entity-001", stage: "plan", decidedBy: "captain" }, state, NOW),
    ).toThrow(GateAlreadyDecided);
  });
});
