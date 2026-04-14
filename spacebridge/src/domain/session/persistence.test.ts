// spacebridge/src/domain/session/persistence.test.ts
// ABOUTME: Integration tests for session persistence layer using :memory: DB. No production DB.

import { describe, test, expect, beforeEach } from "bun:test";
import { createDb } from "../../db";
import { appendEvents, loadAllEvents, countEvents, upsertSnapshot, deleteSnapshot } from "./persistence";
import { replay } from "./evolve";
import type { SpacebridgeDb } from "../../db";
import type { SessionEvent, SessionRecord } from "./types";

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

const NOW = 1_000_000;

const sampleEvents: SessionEvent[] = [
  {
    type: "session_registered",
    sessionId: "sess-1",
    projectRoot: "/repo-a",
    pid: 42,
    connectedAt: NOW,
    lastHeartbeat: NOW,
  },
  {
    type: "session_heartbeat",
    sessionId: "sess-1",
    lastHeartbeat: NOW + 10_000,
  },
];

const sampleSession: SessionRecord = {
  sessionId: "sess-1",
  projectRoot: "/repo-a",
  pid: 42,
  connectedAt: NOW,
  lastHeartbeat: NOW,
};

describe("appendEvents + loadAllEvents", () => {
  test("round-trip: write events, read back and replay produces correct state", async () => {
    await appendEvents(db, "sess-1", sampleEvents, 1);

    const loaded = await loadAllEvents(db);
    expect(loaded.length).toBe(2);

    const state = replay(loaded);
    expect(state.sessions.size).toBe(1);
    const session = state.sessions.get("sess-1");
    expect(session?.sessionId).toBe("sess-1");
    expect(session?.lastHeartbeat).toBe(NOW + 10_000);
  });

  test("loadAllEvents returns events ordered by sequenceNumber", async () => {
    await appendEvents(db, "sess-1", [sampleEvents[1]], 2);
    await appendEvents(db, "sess-1", [sampleEvents[0]], 1);

    const loaded = await loadAllEvents(db);
    expect(loaded[0].type).toBe("session_registered");
    expect(loaded[1].type).toBe("session_heartbeat");
  });

  test("replay of disconnect removes session from state", async () => {
    const events: SessionEvent[] = [
      ...sampleEvents,
      { type: "session_disconnected", sessionId: "sess-1", reason: "explicit", disconnectedAt: NOW + 20_000 },
    ];
    await appendEvents(db, "sess-1", events, 1);
    const loaded = await loadAllEvents(db);
    const state = replay(loaded);
    expect(state.sessions.size).toBe(0);
  });
});

describe("countEvents", () => {
  test("returns count for specific aggregateId", async () => {
    await appendEvents(db, "sess-1", sampleEvents, 1);
    await appendEvents(db, "sess-2", [sampleEvents[0]], 1);

    const count1 = await countEvents(db, "sess-1");
    const count2 = await countEvents(db, "sess-2");
    expect(count1).toBe(2);
    expect(count2).toBe(1);
  });
});

describe("upsertSnapshot + deleteSnapshot", () => {
  test("inserts new snapshot on upsert", async () => {
    await upsertSnapshot(db, sampleSession);

    const { sessions } = await import("../../schema");
    const rows = await db.select().from(sessions).all();
    expect(rows.length).toBe(1);
    expect(rows[0].sessionId).toBe("sess-1");
    expect(rows[0].projectRoot).toBe("/repo-a");
  });

  test("updates existing snapshot on second upsert", async () => {
    await upsertSnapshot(db, sampleSession);
    await upsertSnapshot(db, { ...sampleSession, lastHeartbeat: NOW + 9999, pid: 77 });

    const { sessions } = await import("../../schema");
    const rows = await db.select().from(sessions).all();
    expect(rows.length).toBe(1);
    expect(rows[0].lastHeartbeat).toBe(NOW + 9999);
    expect(rows[0].pid).toBe(77);
  });

  test("deleteSnapshot removes the row", async () => {
    await upsertSnapshot(db, sampleSession);
    await deleteSnapshot(db, "sess-1");

    const { sessions } = await import("../../schema");
    const rows = await db.select().from(sessions).all();
    expect(rows.length).toBe(0);
  });

  test("no cross-table leaks — snapshot does not appear in event log", async () => {
    await upsertSnapshot(db, sampleSession);
    const events = await loadAllEvents(db);
    expect(events.length).toBe(0);
  });
});
