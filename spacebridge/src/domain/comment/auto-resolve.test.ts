// spacebridge/src/domain/comment/auto-resolve.test.ts
// ABOUTME: Integration tests for triggerAutoResolve. Uses :memory: DB.
// Tests: seed comments at stage X → trigger resolve → assert resolved with reason stage_advanced.

import { beforeEach, describe, expect, it } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import { triggerAutoResolve } from "./auto-resolve";
import { appendEvents, countEvents, getCommentsByEntity, upsertSnapshot } from "./persistence";
import type { CommentEvent } from "./types";

const ENTITY_PATH = "/docs/build-pipeline/test-entity.md";
const WORKFLOW_DIR = "/test";

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

function makeAddEvent(commentId: string, sectionHeading: string): CommentEvent {
  return {
    type: "comment_added",
    commentId,
    entityPath: ENTITY_PATH,
    selectedText: "",
    sectionHeading,
    content: `Comment ${commentId}`,
    author: "captain",
    parentId: null,
    createdAt: Date.now(),
  };
}

async function seedComment(commentId: string, sectionHeading: string) {
  const evt = makeAddEvent(commentId, sectionHeading);
  const seqStart = await countEvents(db, ENTITY_PATH);
  await appendEvents(db, ENTITY_PATH, [evt], seqStart);
  await upsertSnapshot(db, {
    commentId,
    entityPath: ENTITY_PATH,
    selectedText: "",
    sectionHeading,
    content: `Comment ${commentId}`,
    author: "captain",
    parentId: null,
    createdAt: Date.now(),
    resolved: false,
    resolvedReason: null,
    workflowDir: WORKFLOW_DIR,
  });
}

describe("triggerAutoResolve", () => {
  it("resolves 3 comments at target section, leaves 2 others untouched", async () => {
    await seedComment("c1", "## Explore");
    await seedComment("c2", "## Explore");
    await seedComment("c3", "## Explore");
    await seedComment("c4", "## Plan");
    await seedComment("c5", "## Plan");

    const result = await triggerAutoResolve(db, ENTITY_PATH, "## Explore");
    expect(result.resolvedCount).toBe(3);

    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    const exploreRows = rows.filter((r) => r.sectionHeading === "## Explore");
    const planRows = rows.filter((r) => r.sectionHeading === "## Plan");

    expect(exploreRows.every((r) => r.resolved === 1)).toBe(true);
    expect(exploreRows.every((r) => r.resolvedReason === "stage_advanced")).toBe(true);
    expect(planRows.every((r) => r.resolved === 0)).toBe(true);
  });

  it("returns resolvedCount=0 when no comments match", async () => {
    await seedComment("c1", "## Plan");

    const result = await triggerAutoResolve(db, ENTITY_PATH, "## Explore");
    expect(result.resolvedCount).toBe(0);

    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    expect(rows[0].resolved).toBe(0);
  });

  it("does not re-resolve already-resolved comments", async () => {
    // Seed c1 as already resolved via a previous auto-resolve
    const evt = makeAddEvent("c1", "## Explore");
    await appendEvents(db, ENTITY_PATH, [evt], 0);
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Explore",
      content: "Already resolved",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: true,
      resolvedReason: "manual",
      workflowDir: WORKFLOW_DIR,
    });
    // Append the resolve event so state is correct
    const resolveEvt: CommentEvent = {
      type: "comment_resolved",
      commentId: "c1",
      resolvedReason: "manual",
      resolvedAt: Date.now() + 100,
    };
    await appendEvents(db, ENTITY_PATH, [resolveEvt], 1);

    // Add a new unresolved comment at same section
    await seedComment("c2", "## Explore");

    const result = await triggerAutoResolve(db, ENTITY_PATH, "## Explore");
    // Only c2 should be resolved (c1 is already resolved)
    expect(result.resolvedCount).toBe(1);

    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    const c2 = rows.find((r) => r.commentId === "c2")!;
    expect(c2.resolved).toBe(1);
    expect(c2.resolvedReason).toBe("stage_advanced");
  });

  it("resolves comments under 'Stage Report: explore' heading when stageName is 'explore'", async () => {
    await seedComment("c1", "## Stage Report: explore");
    await seedComment("c2", "## Stage Report: plan");

    const result = await triggerAutoResolve(db, ENTITY_PATH, "explore");
    expect(result.resolvedCount).toBe(1);

    const rows = await getCommentsByEntity(db, ENTITY_PATH);
    const c1 = rows.find((r) => r.commentId === "c1")!;
    const c2 = rows.find((r) => r.commentId === "c2")!;
    expect(c1.resolved).toBe(1);
    expect(c1.resolvedReason).toBe("stage_advanced");
    expect(c2.resolved).toBe(0);
  });

  it("only resolves comments for matching entityPath", async () => {
    const evt1 = makeAddEvent("c1", "## Explore");
    await appendEvents(db, ENTITY_PATH, [evt1], 0);
    await upsertSnapshot(db, {
      commentId: "c1",
      entityPath: ENTITY_PATH,
      selectedText: "",
      sectionHeading: "## Explore",
      content: "Entity 1 comment",
      author: "captain",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });

    const OTHER = "/docs/build-pipeline/other-entity.md";
    const evt2: CommentEvent = {
      type: "comment_added",
      commentId: "c2",
      entityPath: OTHER,
      selectedText: "",
      sectionHeading: "## Explore",
      content: "Other entity comment",
      author: "fo",
      parentId: null,
      createdAt: Date.now(),
    };
    await appendEvents(db, OTHER, [evt2], 0);
    await upsertSnapshot(db, {
      commentId: "c2",
      entityPath: OTHER,
      selectedText: "",
      sectionHeading: "## Explore",
      content: "Other entity comment",
      author: "fo",
      parentId: null,
      createdAt: Date.now(),
      resolved: false,
      resolvedReason: null,
      workflowDir: WORKFLOW_DIR,
    });

    // Resolve only for ENTITY_PATH
    const result = await triggerAutoResolve(db, ENTITY_PATH, "## Explore");
    expect(result.resolvedCount).toBe(1);

    const c2rows = await getCommentsByEntity(db, OTHER);
    expect(c2rows[0].resolved).toBe(0);
  });
});
