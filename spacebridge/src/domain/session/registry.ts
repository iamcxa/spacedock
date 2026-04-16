// spacebridge/src/domain/session/registry.ts
// ABOUTME: Daemon-internal session registry module. Wires decider+evolve+persistence into
// a SessionRegistry interface. On startup, replays all events to rebuild SessionState.
// A-8: daemon-internal only — not an RPC interface like CoordinationClient.

import { discoverWorkflows } from "../../../../tools/dashboard/src/discovery";
import type { SpacebridgeDb } from "../../db";
import type { RegisterPayload } from "../../ipc/types";
import { sessionEvents as sessionEventsTable } from "../../schema";
import { decide } from "./decider";
import { InvalidProjectRoot } from "./errors";
import { evolve, replay } from "./evolve";
import { appendEvents, deleteSnapshot, upsertSnapshot } from "./persistence";
import type { SessionEvent, SessionState } from "./types";

export interface Workflow {
  dir: string;
  commissioned_by: string;
}

export interface SessionRegistry {
  register(payload: RegisterPayload): Promise<SessionEvent[]>;
  heartbeat(sessionId: string): Promise<SessionEvent[]>;
  disconnect(
    sessionId: string,
    reason: "explicit" | "timeout" | "shutdown",
  ): Promise<SessionEvent[]>;
  disconnectAll(reason: "shutdown"): Promise<SessionEvent[]>;
  /** Prune sessions whose PID is no longer alive. Call on daemon startup. */
  pruneDeadSessions(): Promise<number>;
  getState(): SessionState;
  getActiveProjectRoots(): string[];
  discoverActiveWorkflows(): Workflow[];
  /** Returns the sessionId of the most-recently-heartbeated session for the given
   *  projectRoot, or null if no connected session exists for that root. */
  getActiveSessionByProjectRoot(projectRoot: string): string | null;
}

export interface SessionRegistryOptions {
  db: SpacebridgeDb;
  now?: () => number;
}

export async function createSessionRegistry(
  opts: SessionRegistryOptions,
): Promise<SessionRegistry> {
  const getNow = opts.now ?? (() => Date.now());

  // Single DB scan: load all rows to build both in-memory state and seqCounters
  const rows = await opts.db
    .select()
    .from(sessionEventsTable)
    .orderBy(sessionEventsTable.sequenceNumber);
  const allEvents = rows.map((r) => JSON.parse(r.payload) as SessionEvent);
  let state: SessionState = replay(allEvents);

  // Compute next sequence number per aggregate from loaded rows
  const seqCounters = new Map<string, number>();
  for (const row of rows) {
    const cur = seqCounters.get(row.aggregateId) ?? 0;
    if (row.sequenceNumber >= cur) {
      seqCounters.set(row.aggregateId, row.sequenceNumber + 1);
    }
  }

  function nextSeq(aggregateId: string, count: number): number {
    const n = seqCounters.get(aggregateId) ?? 1;
    seqCounters.set(aggregateId, n + count);
    return n;
  }

  async function applyEvents(aggregateId: string, events: SessionEvent[]): Promise<void> {
    if (events.length === 0) return;
    await appendEvents(opts.db, aggregateId, events, nextSeq(aggregateId, events.length));
    for (const ev of events) {
      state = evolve(state, ev);
    }
  }

  const registry: SessionRegistry = {
    async register(payload: RegisterPayload): Promise<SessionEvent[]> {
      const { projectRoot } = payload;
      if (!projectRoot.startsWith("/")) {
        throw new InvalidProjectRoot(projectRoot, "must be an absolute path");
      }
      if (projectRoot.split("/").includes("..")) {
        throw new InvalidProjectRoot(projectRoot, "must not contain '..' segments");
      }
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
      const events = decide({ type: "heartbeat", sessionId, timestamp: now }, state, now);
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
      const events = decide({ type: "disconnect", sessionId, reason }, state, now);
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
        const events = await registry.disconnect(sessionId, reason);
        allEvents.push(...events);
      }
      return allEvents;
    },

    async pruneDeadSessions(): Promise<number> {
      let pruned = 0;
      for (const [sessionId, record] of state.sessions.entries()) {
        let alive = false;
        try {
          // kill(pid, 0) tests if process exists without sending a signal
          process.kill(record.pid, 0);
          alive = true;
        } catch {
          alive = false;
        }
        if (!alive) {
          await registry.disconnect(sessionId, "timeout");
          pruned++;
        }
      }
      return pruned;
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
      const roots = registry.getActiveProjectRoots();
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

    getActiveSessionByProjectRoot(projectRoot: string): string | null {
      let bestSessionId: string | null = null;
      let bestHeartbeat = -1;
      for (const [sessionId, record] of state.sessions.entries()) {
        if (record.projectRoot === projectRoot && record.lastHeartbeat > bestHeartbeat) {
          bestHeartbeat = record.lastHeartbeat;
          bestSessionId = sessionId;
        }
      }
      return bestSessionId;
    },
  };
  return registry;
}
