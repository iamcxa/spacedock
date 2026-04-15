// ABOUTME: Tests for the gate aggregate evolve function — pure function, no I/O.

import { describe, expect, test } from "bun:test";
import { evolve, replay } from "./evolve";
import type { GateEvent, GateState } from "./types";

const NOW = 1_700_000_000_000;

describe("evolve — gate_approved", () => {
  test("adds decision to empty state", () => {
    const state: GateState = new Map();
    const event: GateEvent = {
      type: "gate_approved",
      entitySlug: "e1",
      stage: "plan",
      decidedBy: "captain",
      decidedAt: NOW,
    };
    const next = evolve(state, event);
    expect(next.size).toBe(1);
    const snap = next.get("e1::plan");
    expect(snap?.decision).toBe("approved");
    expect(snap?.reason).toBeNull();
  });
});

describe("evolve — gate_rejected", () => {
  test("adds rejection with reason", () => {
    const state: GateState = new Map();
    const event: GateEvent = {
      type: "gate_rejected",
      entitySlug: "e1",
      stage: "plan",
      decidedBy: "captain",
      reason: "bad plan",
      decidedAt: NOW,
    };
    const next = evolve(state, event);
    const snap = next.get("e1::plan");
    expect(snap?.decision).toBe("rejected");
    expect(snap?.reason).toBe("bad plan");
  });
});

describe("replay", () => {
  test("rebuilds state from event sequence", () => {
    const events: GateEvent[] = [
      {
        type: "gate_approved",
        entitySlug: "e1",
        stage: "plan",
        decidedBy: "captain",
        decidedAt: NOW,
      },
      {
        type: "gate_rejected",
        entitySlug: "e2",
        stage: "uat",
        decidedBy: "captain",
        reason: "fails",
        decidedAt: NOW + 1,
      },
    ];
    const state = replay(events);
    expect(state.get("e1::plan")?.decision).toBe("approved");
    expect(state.get("e2::uat")?.decision).toBe("rejected");
  });
});
