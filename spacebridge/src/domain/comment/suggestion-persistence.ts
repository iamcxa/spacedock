// spacebridge/src/domain/comment/suggestion-persistence.ts
// ABOUTME: Impure persistence layer for the suggestion aggregate. Writes events to the shared
// comment_events table (O-1 decision) and maintains the suggestions read-model snapshot table.

import { asc, eq } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { commentEvents, comments, suggestions } from "../../schema";
import type { SuggestionEvent } from "./suggestion-types";

export async function appendSuggestionEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: SuggestionEvent[],
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

export async function loadSuggestionEvents(
  db: SpacebridgeDb,
  aggregateId: string,
): Promise<SuggestionEvent[]> {
  const rows = await db
    .select()
    .from(commentEvents)
    .where(eq(commentEvents.aggregateId, aggregateId))
    .orderBy(asc(commentEvents.sequenceNumber));
  return rows
    .filter((r) => r.eventType.startsWith("suggestion_"))
    .map((r) => JSON.parse(r.payload) as SuggestionEvent);
}

export async function countSuggestionEvents(
  db: SpacebridgeDb,
  aggregateId: string,
): Promise<number> {
  // Counts ALL commentEvents for the aggregate (not just suggestion events)
  // to avoid sequence number collision with comment events in the same table.
  const rows = await db
    .select()
    .from(commentEvents)
    .where(eq(commentEvents.aggregateId, aggregateId));
  return rows.length;
}

export async function upsertSuggestionSnapshot(
  db: SpacebridgeDb,
  snapshot: {
    suggestionId: string;
    commentId: string;
    diffFrom: string;
    diffTo: string;
    status: string;
    author: string;
    createdAt: number;
    workflowDir: string;
  },
): Promise<void> {
  const existing = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.suggestionId, snapshot.suggestionId));

  if (existing.length > 0) {
    await db
      .update(suggestions)
      .set({ status: snapshot.status })
      .where(eq(suggestions.suggestionId, snapshot.suggestionId));
  } else {
    await db.insert(suggestions).values({
      suggestionId: snapshot.suggestionId,
      commentId: snapshot.commentId,
      diffFrom: snapshot.diffFrom,
      diffTo: snapshot.diffTo,
      status: snapshot.status,
      author: snapshot.author,
      createdAt: snapshot.createdAt,
      workflowDir: snapshot.workflowDir,
    });
  }
}

export async function getSuggestionsByEntity(
  db: SpacebridgeDb,
  entityPath: string,
): Promise<(typeof suggestions.$inferSelect)[]> {
  // Two-step: get commentIds for entityPath from comments table, then filter suggestions.
  const commentRows = await db
    .select({ commentId: comments.commentId })
    .from(comments)
    .where(eq(comments.entityPath, entityPath));
  const commentIds = new Set(commentRows.map((r) => r.commentId));
  const allSuggestions = await db.select().from(suggestions);
  return allSuggestions.filter((s) => commentIds.has(s.commentId));
}

export async function updateSuggestionStatus(
  db: SpacebridgeDb,
  suggestionId: string,
  status: string,
): Promise<void> {
  await db
    .update(suggestions)
    .set({ status })
    .where(eq(suggestions.suggestionId, suggestionId));
}
