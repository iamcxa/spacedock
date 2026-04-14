// spacebridge/src/domain/session/persistence.ts
// ABOUTME: Impure persistence layer for the session aggregate. Only file in domain/session/
// allowed to import from schema/db. Handles event log append, full load, and snapshot upsert/delete.

import { eq } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { sessionEvents, sessions } from "../../schema";
import type { SessionEvent, SessionRecord } from "./types";

export async function appendEvents(
  db: SpacebridgeDb,
  aggregateId: string,
  events: SessionEvent[],
  seqStart: number,
): Promise<void> {
  const now = Date.now();
  for (let i = 0; i < events.length; i++) {
    await db.insert(sessionEvents).values({
      aggregateId,
      sequenceNumber: seqStart + i,
      eventType: events[i].type,
      payload: JSON.stringify(events[i]),
      timestamp: now,
    });
  }
}

export async function loadAllEvents(db: SpacebridgeDb): Promise<SessionEvent[]> {
  const rows = await db
    .select()
    .from(sessionEvents)
    .orderBy(sessionEvents.sequenceNumber);
  return rows.map((r) => JSON.parse(r.payload) as SessionEvent);
}

export async function countEvents(db: SpacebridgeDb, aggregateId: string): Promise<number> {
  const rows = await db
    .select()
    .from(sessionEvents);
  return rows.filter((r) => r.aggregateId === aggregateId).length;
}

export async function upsertSnapshot(db: SpacebridgeDb, session: SessionRecord): Promise<void> {
  const existing = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionId, session.sessionId));

  if (existing.length > 0) {
    await db
      .update(sessions)
      .set({
        projectRoot: session.projectRoot,
        pid: session.pid,
        lastHeartbeat: session.lastHeartbeat,
      })
      .where(eq(sessions.sessionId, session.sessionId));
  } else {
    await db.insert(sessions).values({
      sessionId: session.sessionId,
      projectRoot: session.projectRoot,
      pid: session.pid,
      connectedAt: session.connectedAt,
      lastHeartbeat: session.lastHeartbeat,
    });
  }
}

export async function deleteSnapshot(db: SpacebridgeDb, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.sessionId, sessionId));
}
