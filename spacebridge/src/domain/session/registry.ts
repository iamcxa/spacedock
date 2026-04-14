// spacebridge/src/domain/session/registry.ts
// ABOUTME: Daemon-internal session registry module. Wires decider+evolve+persistence into
// a SessionRegistry interface. On startup, replays all events to rebuild SessionState.
// A-8: daemon-internal only — not an RPC interface like CoordinationClient.

import { discoverWorkflows } from "../../../../tools/dashboard/src/discovery";
import type { SpacebridgeDb } from "../../db";
import type { RegisterPayload } from "../../ipc/types";
import { decide } from "./decider";
import { evolve, replay } from "./evolve";
import { appendEvents, countEvents, deleteSnapshot, loadAllEvents, upsertSnapshot } from "./persistence";
import type { SessionEvent, SessionRecord, SessionState } from "./types";

export interface Workflow {
  dir: string;
  commissioned_by: string;
}

export interface SessionRegistry {
  register(payload: RegisterPayload): Promise<SessionEvent[]>;
  heartbeat(sessionId: string): Promise<SessionEvent[]>;
  disconnect(sessionId: string, reason: "explicit" | "timeout" | "shutdown"): Promise<SessionEvent[]>;
  disconnectAll(reason: "shutdown"): Promise<SessionEvent[]>;
  getState(): SessionState;
  getActiveProjectRoots(): string[];
  discoverActiveWorkflows(): Workflow[];
}

export interface SessionRegistryOptions {
  db: SpacebridgeDb;
  now?: () => number;
}

export async function createSessionRegistry(
  opts: SessionRegistryOptions,
): Promise<SessionRegistry> {
  const getNow = opts.now ?? (() => Date.now());

  // Replay all events on startup to rebuild in-memory state
  const allEvents = await loadAllEvents(opts.db);
  let state: SessionState = replay(allEvents);

  // Track next sequence number per aggregate (sessionId)
  const seqCounters = new Map<string, number>();
  const rows = await opts.db
    .select()
    .from((await import("../../schema")).sessionEvents)
    .orderBy((await import("../../schema")).sessionEvents.sequenceNumber);
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

  async function applyEvents(aggregateId: string, events: SessionEvent[]): Promise<void> {
    if (events.length === 0) return;
    await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId));
    for (const ev of events) {
      state = evolve(state, ev);
    }
  }

  return {
    async register(payload: RegisterPayload): Promise<SessionEvent[]> {
      const now = getNow();
      const events = decide(
        {
          type: "register",
          sessionId: payload.sessionId,
          projectRoot: payload.projectRoot,
          pid: payload.pid,
          protocolVersion: payload.protocolVersion,
        },
        state,
        now,
      );
      await applyEvents(payload.sessionId, events);

      // Upsert snapshot in sessions table after state update
      const record = state.sessions.get(payload.sessionId);
      if (record) await upsertSnapshot(opts.db, record);

      return events;
    },

    async heartbeat(sessionId: string): Promise<SessionEvent[]> {
      const now = getNow();
      const events = decide(
        { type: "heartbeat", sessionId, timestamp: now },
        state,
        now,
      );
      await applyEvents(sessionId, events);

      const record = state.sessions.get(sessionId);
      if (record) await upsertSnapshot(opts.db, record);

      return events;
    },

    async disconnect(
      sessionId: string,
      reason: "explicit" | "timeout" | "shutdown",
    ): Promise<SessionEvent[]> {
      const now = getNow();
      const events = decide(
        { type: "disconnect", sessionId, reason },
        state,
        now,
      );
      await applyEvents(sessionId, events);

      if (events.length > 0) {
        await deleteSnapshot(opts.db, sessionId);
      }

      return events;
    },

    async disconnectAll(reason: "shutdown"): Promise<SessionEvent[]> {
      const allEvents: SessionEvent[] = [];
      const sessionIds = Array.from(state.sessions.keys());
      for (const sessionId of sessionIds) {
        const events = await this.disconnect(sessionId, reason);
        allEvents.push(...events);
      }
      return allEvents;
    },

    getState(): SessionState {
      return state;
    },

    getActiveProjectRoots(): string[] {
      const roots = new Set<string>();
      for (const record of state.sessions.values()) {
        roots.add(record.projectRoot);
      }
      return Array.from(roots);
    },

    discoverActiveWorkflows(): Workflow[] {
      const roots = this.getActiveProjectRoots();
      const dirSet = new Set<string>();
      const workflows: Workflow[] = [];
      for (const root of roots) {
        const found = discoverWorkflows(root);
        for (const wf of found) {
          if (!dirSet.has(wf.dir)) {
            dirSet.add(wf.dir);
            workflows.push(wf);
          }
        }
      }
      return workflows;
    },
  };
}
