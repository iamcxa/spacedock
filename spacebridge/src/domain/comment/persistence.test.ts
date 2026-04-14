// spacebridge/src/domain/comment/persistence.test.ts
// ABOUTME: Integration tests for comment persistence layer. Uses :memory: DB for isolation.

import { beforeEach, describe, expect, it } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import { replay } from "./evolve";
import {
  appendEvents,
  countEvents,
  getCommentsByEntity,
  loadAllEvents,
  loadEvents,
  markResolved,
  upsertSnapshot,
} from "./persistence";
import type { CommentEvent } from "./types";

const WORKFLOW_DIR = "/test/workflow";
const ENTITY_PATH = "/docs/build-pipeline/test-entity.md";

function makeAddEvent(commentId: string, sectionHeading = "## Directive"): CommentEvent {
  return {
    type: "comment_added",
    commentId,
    entityPath: ENTITY_PATH,
    selectedText: "",
    sectionHeading,
    content: `Content for ${commentId}`,
    author: "captain",
    parentId: null,
    createdAt: Date.now(),
  };
}

function makeReplyEvent(commentId: string, parentCommentId: string): CommentEvent {
  return {
    type: "reply_added",
    commentId,
    parentCommentId,
    entityPath: ENTITY_PATH,
    selectedText: "",
    sectionHeading: "## Directive",
    content: `Reply ${commentId}`,
    author: "fo",
    createdAt: Date.now() + 1,
  };
}

function _makeResolveEvent(
  commentId: string,
  reason: "manual" | "stage_advanced" = "manual",
): CommentEvent {
  return {
    type: "comment_resolved",
    commentId,
    resolvedReason: reason,
    resolvedAt: Date.now() + 2,
  };
}

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("appendEvents + loadEvents", () => {
  it("round-trip: write events → load → replay matches state", async () => {
    const events: CommentEvent[] = [
      makeAddEvent("c1"),
      makeAddEvent("c2"),
      makeReplyEvent("c3", "c1"),
    ];
    await appendEvents(db, ENTITY_PATH, events, 0);

    const loaded = await loadEvents(db, ENTITY_PATH);
    expect(loaded).toHaveLength(3);

    const state = replay(loaded);
    expect(state.size).toBe(3);
    expect(state.get("c1")?.resolved).toBe(false);
    expect(state.get("c3")?.parentId).toBe("c1");
  });

  it("loads only events for matching aggregateId", async () => {
    const events1: CommentEvent[] = [makeAddEvent("c1")];
    const events2: CommentEvent[] = [makeAddEvent("c2")];
    await appendEvents(db, "/entity1.md", events1, 0);
    await appendEvents(db, "/entity2.md", events2, 0);

    const loaded = await loadEvents(db, "/entity1.md");
    expect(loaded).toHaveLength(1);
    expect((loaded[0] as { commentId: string }).commentId).toBe("c1");
  });
});

describe("loadAllEvents", () => {
  it("loads all events across aggregates", async () => {
    await appendEvents(db, "/e1.md", [makeAddEvent("c1")], 0);
    await appendEvents(db, "/e2.md", [makeAddEvent("c2")], 0);

    const all = await loadAllEvents(db);
    expect(all).toHaveLength(2);
  });
});

describe("countEvents", () => {
  it("returns correct count for aggregate", async () => {
    const events: CommentEvent[] = [makeAddEvent("c1"), makeAddEvent("c2")];
    await appendEvents(db, ENTITY_PATH, events, 0);
    const count = await countEvents(db, ENTITY_PATH);
    expect(count).toBe(2);
  });

  it("returns 0 for unknown aggregate", async () => {
    const count = await countEvents(db, "/nonexistent.md");
    expect(count).toBe(0);
  });
});

describe("upsertSnapshot", () => {
  it("inserts new snapshot", async () => {
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Hello",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows).toHaveLength(1);
    expect(rows[0].commentId).toBe("c1");
    expect(rows[0].resolved).toBe(0);
    expect(rows[0].parentId).toBeNull();
  });

  it("updates existing snapshot on second upsert", async () => {
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Hello",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Hello",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: true,
      resolvedReason: "manual",
      workflowDir: WORKFLOW_DIR,
    });
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows).toHaveLength(1);
    expect(rows[0].resolved).toBe(1);
    expect(rows[0].resolvedReason).toBe("manual");
  });

  it("stores guest author correctly", async () => {
    await upsertSnapshot(db, {
      commentId: "guest-c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Plan",
      content: "Guest comment",
      author: "guest",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows[0].author).toBe("guest");
  });
});

describe("markResolved", () => {
  it("marks snapshot as resolved with reason", async () => {
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "To resolve",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    await markResolved(db, "c1", "stage_advanced");
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows[0].resolved).toBe(1);
    expect(rows[0].resolvedReason).toBe("stage_advanced");
  });
});

describe("getCommentsByEntity", () => {
  it("returns only comments for matching entityPath", async () => {
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "This entity",
      author: "captain",
      parentId: null,
      createdAt: 1000,
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    await upsertSnapshot(db, {
      commentId: "c2",
      entityPath: "/other-entity.md",
      selectedText: "",
      sectionHeading: "## Plan",
      content: "Other entity",
      author: "fo",
      parentId: null,
      createdAt: 2000,
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows).toHaveLength(1);
    expect(rows[0].commentId).toBe("c1");
  });

  it("returns comments with parentId set for replies", async () => {
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Parent",
      author: "captain",
      parentId: null,
      createdAt: 1000,
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    await upsertSnapshot(db, {
      commentId: "c2",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Reply",
      author: "fo",
      parentId: "c1",
      createdAt: 2000,
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });
    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows).toHaveLength(2);
    const reply = rows.find((r) => r.commentId === "c2")!;
    expect(reply.parentId).toBe("c1");
  });
});
