// spacebridge/src/domain/chat/persistence.ts
// ABOUTME: Impure persistence layer for the chat aggregate. Only file in domain/chat/
// allowed to import from schema/db. Handles event log append, load, and count.

import { asc, eq } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { chatEvents } from "../../schema";
import type { ChatEvent } from "./types";

export async function appendEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: ChatEvent[],
  seqStart: number,
): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    await db.insert(chatEvents).values({
      aggregateId,
      sequenceNumber: seqStart + i,
      eventType: events[i].type,
      payload: JSON.stringify(events[i]),
      timestamp: now,
    });
  }
}

export async function loadEvents(db: SpacebridgeDb, aggregateId: string): Promise<ChatEvent[]> {
  const rows = await db
    .select()
    .from(chatEvents)
    .where(eq(chatEvents.aggregateId, aggregateId))
    .orderBy(asc(chatEvents.sequenceNumber));
  return rows.map((r) => JSON.parse(r.payload) as ChatEvent);
}

export async function countEvents(db: SpacebridgeDb, aggregateId: string): Promise<number> {
  const rows = await db.select().from(chatEvents).where(eq(chatEvents.aggregateId, aggregateId));
  return rows.length;
}
