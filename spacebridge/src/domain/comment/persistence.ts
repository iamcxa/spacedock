// spacebridge/src/domain/comment/persistence.ts
// ABOUTME: Impure persistence layer for the comment aggregate. Only file in domain/comment/
// allowed to import from schema/db. Handles event log append, load, and snapshot upsert.

import { eq, and, asc } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { commentEvents, comments } from "../../schema";
import type { CommentEvent } from "../comment/types";

export async function appendEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: CommentEvent[],
  seqStart: number,
): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    await db.insert(commentEvents).values({
      aggregateId,
      sequenceNumber: seqStart + i,
      eventType: events[i].type,
      payload: JSON.stringify(events[i]),
      timestamp: now,
    });
  }
}

export async function loadEvents(
  db: SpacebridgeDb,
  aggregateId: string,
): Promise<CommentEvent[]> {
  const rows = await db
    .select()
    .from(commentEvents)
    .where(eq(commentEvents.aggregateId, aggregateId))
    .orderBy(asc(commentEvents.sequenceNumber));
  return rows.map((r) => JSON.parse(r.payload) as CommentEvent);
}

export async function loadAllEvents(db: SpacebridgeDb): Promise<CommentEvent[]> {
  const rows = await db
    .select()
    .from(commentEvents)
    .orderBy(asc(commentEvents.sequenceNumber));
  return rows.map((r) => JSON.parse(r.payload) as CommentEvent);
}

export async function countEvents(
  db: SpacebridgeDb,
  aggregateId: string,
): Promise<number> {
  const rows = await db
    .select()
    .from(commentEvents)
    .where(eq(commentEvents.aggregateId, aggregateId));
  return rows.length;
}

export async function upsertSnapshot(
  db: SpacebridgeDb,
  snapshot: {
    commentId: string;
    entityPath: string;
    selectedText: string;
    sectionHeading: string;
    content: string;
    author: string;
    parentId: string | null;
    createdAt: number;
    resolved: boolean;
    resolvedReason: string | null;
    workflowDir: string;
  },
): Promise<void> {
  const existing = await db
    .select()
    .from(comments)
    .where(eq(comments.commentId, snapshot.commentId));

  if (existing.length > 0) {
    await db
      .update(comments)
      .set({
        resolved: snapshot.resolved ? 1 : 0,
        resolvedReason: snapshot.resolvedReason,
        parentId: snapshot.parentId,
      })
      .where(eq(comments.commentId, snapshot.commentId));
  } else {
    await db.insert(comments).values({
      commentId: snapshot.commentId,
      entityPath: snapshot.entityPath,
      selectedText: snapshot.selectedText,
      sectionHeading: snapshot.sectionHeading,
      content: snapshot.content,
      author: snapshot.author,
      parentId: snapshot.parentId,
      createdAt: snapshot.createdAt,
      resolved: snapshot.resolved ? 1 : 0,
      resolvedReason: snapshot.resolvedReason,
      workflowDir: snapshot.workflowDir,
    });
  }
}

export async function markResolved(
  db: SpacebridgeDb,
  commentId: string,
  reason: "manual" | "stage_advanced",
): Promise<void> {
  await db
    .update(comments)
    .set({ resolved: 1, resolvedReason: reason })
    .where(eq(comments.commentId, commentId));
}

export async function getCommentsByEntity(
  db: SpacebridgeDb,
  entityPath: string,
): Promise<typeof comments.$inferSelect[]> {
  return db
    .select()
    .from(comments)
    .where(eq(comments.entityPath, entityPath))
    .orderBy(asc(comments.createdAt));
}
