// spacebridge/src/domain/lease/evolve.test.ts
// ABOUTME: Pure unit tests for evolve and replay functions. No DB, no I/O.

import { describe, expect, test } from "bun:test";
import { evolve, replay } from "./evolve";
import type { LeaseEvent, LeaseState } from "./types";
import { emptyLeaseState } from "./types";

const NOW = 1_000_000;
const DURATION = 300_000;

const acquiredEvent: LeaseEvent = {
  type: "acquired",
  token: "tok-1",
  entitySlug: "ent-a",
  role: "FO",
  sessionId: "sess-1",
  acquiredAt: NOW,
  expiresAt: NOW + DURATION,
};

describe("evolve — acquired", () => {
  test("adds lease entry to state", () => {
    const state = evolve(emptyLeaseState, acquiredEvent);
    expect(state.leases.size).toBe(1);
    expect(state.leases.get("ent-a::FO")?.token).toBe("tok-1");
  });
});

describe("evolve — extended", () => {
  test("updates expires_at for the matching token", () => {
    const state1 = evolve(emptyLeaseState, acquiredEvent);
    const state2 = evolve(state1, { type: "extended", token: "tok-1", newExpiresAt: NOW + 999 });
    expect(state2.leases.get("ent-a::FO")?.expires_at).toBe(NOW + 999);
  });
});

describe("evolve — released", () => {
  test("removes lease entry", () => {
    const state1 = evolve(emptyLeaseState, acquiredEvent);
    const state2 = evolve(state1, {
      type: "released",
      token: "tok-1",
      outcome: "done",
      releasedAt: NOW,
    });
    expect(state2.leases.size).toBe(0);
  });
});

describe("evolve — expired", () => {
  test("removes lease entry", () => {
    const state1 = evolve(emptyLeaseState, acquiredEvent);
    const state2 = evolve(state1, {
      type: "expired",
      token: "tok-1",
      expiredAt: NOW + DURATION + 1,
    });
    expect(state2.leases.size).toBe(0);
  });
});

describe("replay", () => {
  test("empty events produces empty state", () => {
    const state = replay([]);
    expect(state.leases.size).toBe(0);
  });

  test("replays 10 events to produce same state as sequential evolve", () => {
    // Build 2 acquired + 1 released + 1 expired sequence
    const events: LeaseEvent[] = [
      {
        type: "acquired",
        token: "tok-1",
        entitySlug: "ent-a",
        role: "FO",
        sessionId: "s1",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      {
        type: "acquired",
        token: "tok-2",
        entitySlug: "ent-b",
        role: "SO",
        sessionId: "s2",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "tok-1", newExpiresAt: NOW + DURATION + 5000 },
      { type: "released", token: "tok-2", outcome: "done", releasedAt: NOW + 1000 },
      {
        type: "acquired",
        token: "tok-3",
        entitySlug: "ent-c",
        role: "QO",
        sessionId: "s3",
        acquiredAt: NOW + 2000,
        expiresAt: NOW + DURATION + 2000,
      },
      {
        type: "acquired",
        token: "tok-4",
        entitySlug: "ent-d",
        role: "FO",
        sessionId: "s4",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "tok-3", newExpiresAt: NOW + DURATION + 9000 },
      { type: "expired", token: "tok-4", expiredAt: NOW + DURATION + 1 },
      {
        type: "acquired",
        token: "tok-5",
        entitySlug: "ent-e",
        role: "SO",
        sessionId: "s5",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "tok-5", newExpiresAt: NOW + DURATION + 7000 },
    ];

    const sequentialState = events.reduce(evolve, { leases: new Map() } as LeaseState);
    const replayedState = replay(events);

    expect(replayedState.leases.size).toBe(sequentialState.leases.size);
    for (const [key, lease] of sequentialState.leases) {
      const replayed = replayedState.leases.get(key);
      expect(replayed).toBeDefined();
      expect(replayed?.token).toBe(lease.token);
      expect(replayed?.expires_at).toBe(lease.expires_at);
    }
  });
});
