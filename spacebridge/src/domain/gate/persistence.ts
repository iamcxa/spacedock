// spacebridge/src/domain/gate/persistence.ts
// ABOUTME: Impure persistence layer for the gate aggregate. Only file in domain/gate/
// allowed to import from schema/db. Handles event log append, load, and count.

import { asc, eq } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { gateEvents } from "../../schema";
import type { GateEvent } from "./types";

export async function appendEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: GateEvent[],
  seqStart: number,
): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    await db.insert(gateEvents).values({
      aggregateId,
      sequenceNumber: seqStart + i,
      eventType: events[i].type,
      payload: JSON.stringify(events[i]),
      timestamp: now,
    });
  }
}

export async function loadEvents(db: SpacebridgeDb, aggregateId: string): Promise<GateEvent[]> {
  const rows = await db
    .select()
    .from(gateEvents)
    .where(eq(gateEvents.aggregateId, aggregateId))
    .orderBy(asc(gateEvents.sequenceNumber));
  return rows.map((r) => JSON.parse(r.payload) as GateEvent);
}

export async function countEvents(db: SpacebridgeDb, aggregateId: string): Promise<number> {
  const rows = await db.select().from(gateEvents).where(eq(gateEvents.aggregateId, aggregateId));
  return rows.length;
}
