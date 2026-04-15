// spacebridge/src/ipc/coordination-client-bridge.ts
// ABOUTME: Real CoordinationClient implementation for the daemon side.
// Wires decider + evolve + persistence into the CoordinationClient interface.
// Entity 057 will replace the entityScanner with a DB-backed projection.

import type { SpacebridgeDb } from "../db";
import { decide } from "../domain/lease/decider";
import { LeaseNotFound } from "../domain/lease/errors";
import { evolve, replay } from "../domain/lease/evolve";
import {
  appendEvents,
  deleteSnapshot,
  loadAllEvents,
  upsertSnapshot,
} from "../domain/lease/persistence";
import type { LeaseState } from "../domain/lease/types";
import type { CoordinationClient, EntityRef, LeaseToken, Role } from "./coordination-client-stub";

export interface CoordinationClientBridgeOptions {
  db: SpacebridgeDb;
  entityScanner: () => Promise<EntityRef[]>;
  leaseDurationMs: number;
  now?: () => number;
}

export interface CoordinationClientBridge extends CoordinationClient {
  expireDue(now: number): Promise<number>;
  close(): void;
}

export async function createCoordinationClientBridge(
  opts: CoordinationClientBridgeOptions,
): Promise<CoordinationClientBridge> {
  const getNow = opts.now ?? (() => Date.now());

  // Load all events and replay to rebuild in-memory state on startup
  const allEvents = await loadAllEvents(opts.db);
  let state: LeaseState = replay(allEvents);

  // Track next sequence number per aggregate
  const seqCounters = new Map<string, number>();
  // Pre-populate seqCounters from loaded events by scanning aggregateId
  const rows = await opts.db
    .select()
    .from((await import("../schema")).leaseEvents)
    .orderBy((await import("../schema")).leaseEvents.sequenceNumber);
  for (const row of rows) {
    const cur = seqCounters.get(row.aggregateId) ?? 0;
    if (row.sequenceNumber >= cur) {
      seqCounters.set(row.aggregateId, row.sequenceNumber + 1);
    }
  }

  function nextSeq(aggregateId: string): number {
    const n = seqCounters.get(aggregateId) ?? 1;
    seqCounters.set(aggregateId, n + 1);
    return n;
  }

  return {
    async getAvailableWork(role: Role): Promise<EntityRef[]> {
      const all = await opts.entityScanner();
      const now = getNow();
      return all.filter((entity) => {
        const key = `${entity.slug}::${role}` as const;
        const lease = state.leases.get(key);
        return !lease || lease.expires_at <= now;
      });
    },

    async acquireEntity(slug: string, role: Role, sessionId: string): Promise<LeaseToken> {
      const now = getNow();
      const events = decide(
        {
          type: "acquire",
          entitySlug: slug,
          role,
          sessionId,
          leaseDurationMs: opts.leaseDurationMs,
        },
        state,
        now,
      );
      const aggregateId = `${slug}::${role}` as const;
      await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId));
      for (const ev of events) {
        state = evolve(state, ev);
      }
      // The acquired event's token is in the state now
      const lease = state.leases.get(aggregateId);
      if (!lease) throw new Error("invariant: lease not found after acquire");
      await upsertSnapshot(opts.db, lease);
      return lease;
    },

    async releaseEntity(token: LeaseToken, outcome: "done" | "abort"): Promise<void> {
      const now = getNow();
      // Find the lease entry to get aggregateId
      const entry = findByToken(state, token.token);
      if (!entry) throw new LeaseNotFound(token.token);
      const aggregateId = `${entry.entity_slug}::${entry.role}`;
      const events = decide({ type: "release", token: token.token, outcome }, state, now);
      await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId));
      for (const ev of events) {
        state = evolve(state, ev);
      }
      await deleteSnapshot(opts.db, token.token);
    },

    async extendLease(token: LeaseToken): Promise<void> {
      const now = getNow();
      const entry = findByToken(state, token.token);
      if (!entry) throw new LeaseNotFound(token.token);
      const aggregateId = `${entry.entity_slug}::${entry.role}` as const;
      const events = decide(
        { type: "extend", token: token.token, leaseDurationMs: opts.leaseDurationMs },
        state,
        now,
      );
      await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId));
      for (const ev of events) {
        state = evolve(state, ev);
      }
      const updated = state.leases.get(aggregateId);
      if (updated) await upsertSnapshot(opts.db, updated);
    },

    async expireDue(now: number): Promise<number> {
      let count = 0;
      for (const [, lease] of state.leases) {
        if (lease.expires_at <= now) {
          try {
            const aggregateId = `${lease.entity_slug}::${lease.role}`;
            const events = decide({ type: "expire", token: lease.token, now }, state, now);
            if (events.length > 0) {
              await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId));
              for (const ev of events) {
                state = evolve(state, ev);
              }
              await deleteSnapshot(opts.db, lease.token);
              count++;
            }
          } catch {
            // idempotent: lease may have been released between scan and expire
          }
        }
      }
      return count;
    },

    close(): void {
      // No resources to release — state is in-memory, DB closed by caller
    },
  };
}

function findByToken(state: LeaseState, token: string) {
  for (const lease of state.leases.values()) {
    if (lease.token === token) return lease;
  }
  return null;
}
