// spacebridge/src/domain/lease/persistence.test.ts
// ABOUTME: Integration tests for persistence layer using :memory: DB. No production DB.

import { beforeEach, describe, expect, test } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import { replay } from "./evolve";
import { appendEvents, deleteSnapshot, loadAllEvents, upsertSnapshot } from "./persistence";
import type { LeaseEvent } from "./types";

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

const NOW = 1_000_000;
const DURATION = 300_000;

const sampleEvents: LeaseEvent[] = [
  {
    type: "acquired",
    token: "tok-1",
    entitySlug: "ent-a",
    role: "FO",
    sessionId: "sess-1",
    acquiredAt: NOW,
    expiresAt: NOW + DURATION,
  },
  {
    type: "extended",
    token: "tok-1",
    newExpiresAt: NOW + DURATION + 5000,
  },
];

describe("appendEvents + loadAllEvents", () => {
  test("round-trip: write events, read back and replay produces correct state (AC-6)", async () => {
    await appendEvents(db, "ent-a::FO", sampleEvents, 1);

    const loaded = await loadAllEvents(db);
    expect(loaded.length).toBe(2);

    const state = replay(loaded);
    expect(state.leases.size).toBe(1);
    const lease = state.leases.get("ent-a::FO");
    expect(lease?.token).toBe("tok-1");
    expect(lease?.expires_at).toBe(NOW + DURATION + 5000);
  });

  test("replay of 10 events matches in-memory reduce", async () => {
    const events: LeaseEvent[] = [
      {
        type: "acquired",
        token: "t1",
        entitySlug: "e1",
        role: "FO",
        sessionId: "s1",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      {
        type: "acquired",
        token: "t2",
        entitySlug: "e2",
        role: "SO",
        sessionId: "s2",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "t1", newExpiresAt: NOW + DURATION + 1000 },
      { type: "released", token: "t2", outcome: "done", releasedAt: NOW + 500 },
      {
        type: "acquired",
        token: "t3",
        entitySlug: "e3",
        role: "QO",
        sessionId: "s3",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "t3", newExpiresAt: NOW + DURATION + 2000 },
      {
        type: "acquired",
        token: "t4",
        entitySlug: "e4",
        role: "FO",
        sessionId: "s4",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "expired", token: "t4", expiredAt: NOW + DURATION + 1 },
      {
        type: "acquired",
        token: "t5",
        entitySlug: "e5",
        role: "SO",
        sessionId: "s5",
        acquiredAt: NOW,
        expiresAt: NOW + DURATION,
      },
      { type: "extended", token: "t5", newExpiresAt: NOW + DURATION + 3000 },
    ];

    for (let i = 0; i < events.length; i++) {
      const aggregateId = (events[i] as { entitySlug?: string }).entitySlug
        ? `${(events[i] as { entitySlug: string; role: string }).entitySlug}::${(events[i] as { role: string }).role}`
        : "misc";
      await appendEvents(db, aggregateId, [events[i]], i + 1);
    }

    const loaded = await loadAllEvents(db);
    expect(loaded.length).toBe(10);

    const replayed = replay(loaded);
    const inMemory = replay(events);
    expect(replayed.leases.size).toBe(inMemory.leases.size);
  });
});

describe("upsertSnapshot + deleteSnapshot", () => {
  test("inserts new snapshot on upsert", async () => {
    await upsertSnapshot(db, {
      token: "tok-1",
      session_id: "sess-1",
      entity_slug: "ent-a",
      role: "FO",
      acquired_at: NOW,
      expires_at: NOW + DURATION,
    });

    const _events2 = await loadAllEvents(db);
    // Snapshots don't appear in event log — verify via direct Drizzle query instead
    const { entityLeases } = await import("../../schema");
    const rows = await db.select().from(entityLeases).all();
    expect(rows.length).toBe(1);
    expect(rows[0].token).toBe("tok-1");
  });

  test("updates existing snapshot on second upsert", async () => {
    const lease = {
      token: "tok-1",
      session_id: "sess-1",
      entity_slug: "ent-a",
      role: "FO" as const,
      acquired_at: NOW,
      expires_at: NOW + DURATION,
    };
    await upsertSnapshot(db, lease);
    await upsertSnapshot(db, { ...lease, expires_at: NOW + DURATION + 9999 });

    const { entityLeases } = await import("../../schema");
    const rows = await db.select().from(entityLeases).all();
    expect(rows.length).toBe(1);
    expect(rows[0].expiresAt).toBe(NOW + DURATION + 9999);
  });

  test("deleteSnapshot removes the row", async () => {
    await upsertSnapshot(db, {
      token: "tok-1",
      session_id: "sess-1",
      entity_slug: "ent-a",
      role: "FO",
      acquired_at: NOW,
      expires_at: NOW + DURATION,
    });
    await deleteSnapshot(db, "tok-1");

    const { entityLeases } = await import("../../schema");
    const rows = await db.select().from(entityLeases).all();
    expect(rows.length).toBe(0);
  });
});
