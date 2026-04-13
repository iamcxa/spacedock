// spacebridge/src/domain/lease/decider.test.ts
// ABOUTME: Pure unit tests for the lease decider. No DB, no I/O — only assert.deepEqual style.

import { describe, test, expect } from "bun:test";
import { decide } from "./decider";
import { emptyLeaseState } from "./types";
import type { LeaseState, AcquiredEvent } from "./types";
import { LeaseConflict, LeaseNotFound, LeaseExpired } from "./errors";

const NOW = 1_000_000;
const DURATION = 300_000;

function stateWithLease(token: string, entitySlug: string, role: "SO" | "FO" | "QO", expiresAt = NOW + DURATION): LeaseState {
  return {
    leases: new Map([
      [`${entitySlug}::${role}`, {
        token,
        session_id: "sess-1",
        entity_slug: entitySlug,
        role,
        acquired_at: NOW,
        expires_at: expiresAt,
      }],
    ]),
  };
}

describe("acquire", () => {
  test("returns acquired event when no conflict (AC-1)", () => {
    const events = decide(
      { type: "acquire", entitySlug: "ent-a", role: "FO", sessionId: "sess-1", leaseDurationMs: DURATION },
      emptyLeaseState,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("acquired");
    const ev = events[0] as AcquiredEvent;
    expect(ev.entitySlug).toBe("ent-a");
    expect(ev.role).toBe("FO");
    expect(ev.acquiredAt).toBe(NOW);
    expect(ev.expiresAt).toBe(NOW + DURATION);
  });

  test("throws LeaseConflict when same (entity, role) already held (AC-2)", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO");
    expect(() =>
      decide(
        { type: "acquire", entitySlug: "ent-a", role: "FO", sessionId: "sess-2", leaseDurationMs: DURATION },
        state,
        NOW,
      )
    ).toThrow(LeaseConflict);
  });

  test("succeeds for same entity with different role", () => {
    const state = stateWithLease("tok-1", "ent-a", "SO");
    const events = decide(
      { type: "acquire", entitySlug: "ent-a", role: "FO", sessionId: "sess-2", leaseDurationMs: DURATION },
      state,
      NOW,
    );
    expect(events[0].type).toBe("acquired");
  });
});

describe("release", () => {
  test("returns released event with outcome 'done' (AC-8)", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO");
    const events = decide(
      { type: "release", token: "tok-1", outcome: "done" },
      state,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("released");
    expect((events[0] as { outcome: string }).outcome).toBe("done");
  });

  test("returns released event with outcome 'abort' (AC-9)", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO");
    const events = decide(
      { type: "release", token: "tok-1", outcome: "abort" },
      state,
      NOW,
    );
    expect(events[0].type).toBe("released");
    expect((events[0] as { outcome: string }).outcome).toBe("abort");
  });

  test("throws LeaseNotFound for unknown token", () => {
    expect(() =>
      decide({ type: "release", token: "unknown", outcome: "done" }, emptyLeaseState, NOW)
    ).toThrow(LeaseNotFound);
  });
});

describe("extend", () => {
  test("returns extended event with new expiry (AC-4)", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO", NOW + 10_000);
    const events = decide(
      { type: "extend", token: "tok-1", leaseDurationMs: DURATION },
      state,
      NOW,
    );
    expect(events[0].type).toBe("extended");
    expect((events[0] as { newExpiresAt: number }).newExpiresAt).toBe(NOW + DURATION);
  });

  test("throws LeaseExpired when lease is past expiry", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO", NOW - 1);
    expect(() =>
      decide({ type: "extend", token: "tok-1", leaseDurationMs: DURATION }, state, NOW)
    ).toThrow(LeaseExpired);
  });

  test("throws LeaseNotFound for unknown token", () => {
    expect(() =>
      decide({ type: "extend", token: "unknown", leaseDurationMs: DURATION }, emptyLeaseState, NOW)
    ).toThrow(LeaseNotFound);
  });
});

describe("expire", () => {
  test("returns expired event when lease is past expiry", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO", NOW - 1);
    const events = decide(
      { type: "expire", token: "tok-1", now: NOW },
      state,
      NOW,
    );
    expect(events[0].type).toBe("expired");
  });

  test("returns [] (no-op) when lease is already released / not found", () => {
    const events = decide(
      { type: "expire", token: "unknown", now: NOW },
      emptyLeaseState,
      NOW,
    );
    expect(events).toEqual([]);
  });

  test("returns [] (no-op) when lease is still active (expiry not yet reached)", () => {
    const state = stateWithLease("tok-1", "ent-a", "FO", NOW + 10_000);
    const events = decide(
      { type: "expire", token: "tok-1", now: NOW },
      state,
      NOW,
    );
    expect(events).toEqual([]);
  });
});
