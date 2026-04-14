// spacebridge/src/domain/lease/persistence.ts
// ABOUTME: Impure persistence layer for the lease aggregate. Only file in domain/lease/ allowed
// to import from schema/db. Handles event log append, full load, and snapshot upsert/delete.

import { eq } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { entityLeases, leaseEvents } from "../../schema";
import type { LeaseEvent, LeaseToken } from "../lease/types";

export async function appendEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: LeaseEvent[],
  seqStart: number,
): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    await db.insert(leaseEvents).values({
      aggregateId,
      sequenceNumber: seqStart + i,
      eventType: events[i].type,
      payload: JSON.stringify(events[i]),
      timestamp: now,
    });
  }
}

export async function loadAllEvents(db: SpacebridgeDb): Promise<LeaseEvent[]> {
  const rows = await db.select().from(leaseEvents).orderBy(leaseEvents.sequenceNumber);
  return rows.map((r) => JSON.parse(r.payload) as LeaseEvent);
}

export async function countEvents(db: SpacebridgeDb, aggregateId: string): Promise<number> {
  const rows = await db.select().from(leaseEvents).orderBy(leaseEvents.sequenceNumber);
  return rows.filter((r) => r.aggregateId === aggregateId).length;
}

export async function upsertSnapshot(db: SpacebridgeDb, lease: LeaseToken): Promise<void> {
  const existing = await db.select().from(entityLeases).where(eq(entityLeases.token, lease.token));

  if (existing.length > 0) {
    await db
      .update(entityLeases)
      .set({ expiresAt: lease.expires_at })
      .where(eq(entityLeases.token, lease.token));
  } else {
    await db.insert(entityLeases).values({
      token: lease.token,
      sessionId: lease.session_id,
      entitySlug: lease.entity_slug,
      role: lease.role,
      acquiredAt: lease.acquired_at,
      expiresAt: lease.expires_at,
    });
  }
}

export async function deleteSnapshot(db: SpacebridgeDb, token: string): Promise<void> {
  await db.delete(entityLeases).where(eq(entityLeases.token, token));
}
