// spacebridge/src/domain/comment/suggestion-persistence.test.ts
// ABOUTME: Tests for suggestion persistence layer — event log + snapshot table.

import { describe, expect, test } from "bun:test";
import { createDb } from "../../db";
import {
  appendSuggestionEvents,
  countSuggestionEvents,
  loadSuggestionEvents,
  upsertSuggestionSnapshot,
  updateSuggestionStatus,
  getSuggestionsByEntity,
} from "./suggestion-persistence";
import type { SuggestionEvent } from "./suggestion-types";

function makeDb() {
  return createDb(":memory:");
}

const aggId = "entity-089-path";

const addedEvent: SuggestionEvent = {
  type: "suggestion_added",
  suggestionId: "sug-001",
  commentId: "cmt-001",
  diff_from: "old text",
  diff_to: "new text",
  author: "captain",
  createdAt: 1713000000000,
};

const acceptedEvent: SuggestionEvent = {
  type: "suggestion_accepted",
  suggestionId: "sug-001",
  acceptedBy: "captain",
  acceptedAt: 1713000001000,
};

describe("appendSuggestionEvents", () => {
  test("writes events to comment_events table", async () => {
    const db = makeDb();
    await appendSuggestionEvents(db, aggId, [addedEvent], 0);

    const rows = await db.query.commentEvents.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].eventType).toBe("suggestion_added");
    expect(rows[0].aggregateId).toBe(aggId);
    expect(rows[0].sequenceNumber).toBe(0);
    const payload = JSON.parse(rows[0].payload);
    expect(payload.suggestionId).toBe("sug-001");
  });

  test("writes multiple events with correct sequence numbers", async () => {
    const db = makeDb();
    await appendSuggestionEvents(db, aggId, [addedEvent, acceptedEvent], 5);

    const rows = await db.query.commentEvents.findMany();
    expect(rows).toHaveLength(2);
    expect(rows[0].sequenceNumber).toBe(5);
    expect(rows[1].sequenceNumber).toBe(6);
  });
});

describe("loadSuggestionEvents", () => {
  test("returns only suggestion_ prefixed events", async () => {
    const db = makeDb();
    // Write a non-suggestion event directly
    await db.insert((await import("../../schema")).commentEvents).values({
      aggregateId: aggId,
      sequenceNumber: 0,
      eventType: "comment_added",
      payload: JSON.stringify({ type: "comment_added" }),
      timestamp: Date.now(),
    });
    await appendSuggestionEvents(db, aggId, [addedEvent], 1);

    const events = await loadSuggestionEvents(db, aggId);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("suggestion_added");
  });

  test("returns events ordered by sequence number", async () => {
    const db = makeDb();
    await appendSuggestionEvents(db, aggId, [addedEvent, acceptedEvent], 0);

    const events = await loadSuggestionEvents(db, aggId);
    expect(events[0].type).toBe("suggestion_added");
    expect(events[1].type).toBe("suggestion_accepted");
  });

  test("returns empty array when no suggestion events exist", async () => {
    const db = makeDb();
    const events = await loadSuggestionEvents(db, aggId);
    expect(events).toHaveLength(0);
  });
});

describe("countSuggestionEvents", () => {
  test("counts all comment_events for aggregate including non-suggestion events", async () => {
    const db = makeDb();
    // Insert a regular comment event
    await db.insert((await import("../../schema")).commentEvents).values({
      aggregateId: aggId,
      sequenceNumber: 0,
      eventType: "comment_added",
      payload: JSON.stringify({ type: "comment_added" }),
      timestamp: Date.now(),
    });
    // Insert suggestion events at seq 1, 2
    await appendSuggestionEvents(db, aggId, [addedEvent, acceptedEvent], 1);

    const count = await countSuggestionEvents(db, aggId);
    expect(count).toBe(3); // 1 comment + 2 suggestion
  });

  test("returns 0 for aggregate with no events", async () => {
    const db = makeDb();
    const count = await countSuggestionEvents(db, "unknown-agg");
    expect(count).toBe(0);
  });
});

describe("upsertSuggestionSnapshot", () => {
  const baseSnapshot = {
    suggestionId: "sug-001",
    commentId: "cmt-001",
    diffFrom: "old text",
    diffTo: "new text",
    status: "pending",
    author: "captain",
    createdAt: 1713000000000,
    workflowDir: "/workflow/089",
  };

  test("inserts new snapshot", async () => {
    const db = makeDb();
    await upsertSuggestionSnapshot(db, baseSnapshot);

    const rows = await db.query.suggestions.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].suggestionId).toBe("sug-001");
    expect(rows[0].status).toBe("pending");
    expect(rows[0].diffFrom).toBe("old text");
  });

  test("updates status on second upsert with same suggestionId", async () => {
    const db = makeDb();
    await upsertSuggestionSnapshot(db, baseSnapshot);
    await upsertSuggestionSnapshot(db, { ...baseSnapshot, status: "accepted" });

    const rows = await db.query.suggestions.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("accepted");
  });

  test("stores all fields correctly on insert", async () => {
    const db = makeDb();
    await upsertSuggestionSnapshot(db, baseSnapshot);

    const rows = await db.query.suggestions.findMany();
    const row = rows[0];
    expect(row.commentId).toBe("cmt-001");
    expect(row.diffTo).toBe("new text");
    expect(row.author).toBe("captain");
    expect(row.createdAt).toBe(1713000000000);
    expect(row.workflowDir).toBe("/workflow/089");
  });
});

describe("updateSuggestionStatus", () => {
  test("updates status column in suggestions snapshot", async () => {
    const db = makeDb();
    await upsertSuggestionSnapshot(db, {
      suggestionId: "sug-002",
      commentId: "cmt-002",
      diffFrom: "a",
      diffTo: "b",
      status: "pending",
      author: "fo",
      createdAt: Date.now(),
      workflowDir: "/workflow/089",
    });

    await updateSuggestionStatus(db, "sug-002", "rejected");

    const rows = await db.query.suggestions.findMany();
    expect(rows[0].status).toBe("rejected");
  });
});
