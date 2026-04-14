// spacebridge/src/domain/session/evolve.ts
// ABOUTME: Pure fmodel evolve function for the session aggregate. Zero I/O.
// evolve(state, event) → new SessionState. replay(events) reduces over evolve from empty state.

import type { SessionEvent, SessionState } from "./types";
import { emptySessionState } from "./types";

export function evolve(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case "session_registered": {
      const newSessions = new Map(state.sessions);
      newSessions.set(event.sessionId, {
        sessionId: event.sessionId,
        projectRoot: event.projectRoot,
        pid: event.pid,
        connectedAt: event.connectedAt,
        lastHeartbeat: event.lastHeartbeat,
      });
      return { sessions: newSessions };
    }

    case "session_reconnected": {
      const existing = state.sessions.get(event.sessionId);
      if (!existing) return state;
      const newSessions = new Map(state.sessions);
      newSessions.set(event.sessionId, {
        ...existing,
        projectRoot: event.projectRoot,
        pid: event.pid,
        lastHeartbeat: event.lastHeartbeat,
      });
      return { sessions: newSessions };
    }

    case "session_heartbeat": {
      const existing = state.sessions.get(event.sessionId);
      if (!existing) return state;
      const newSessions = new Map(state.sessions);
      newSessions.set(event.sessionId, {
        ...existing,
        lastHeartbeat: event.lastHeartbeat,
      });
      return { sessions: newSessions };
    }

    case "session_disconnected": {
      const newSessions = new Map(state.sessions);
      newSessions.delete(event.sessionId);
      return { sessions: newSessions };
    }
  }
}

export function replay(events: SessionEvent[]): SessionState {
  return events.reduce(evolve, { sessions: new Map(emptySessionState.sessions) });
}
