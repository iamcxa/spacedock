// spacebridge/src/domain/session/decider.ts
// ABOUTME: Pure fmodel decider for the session aggregate. Zero I/O — no DB, no network, no fs.
// decide(cmd, state, now) → SessionEvent[] or throws SessionNotFound.

import type { SessionCommand, SessionEvent, SessionState } from "./types";
import { SessionNotFound } from "./errors";

export function decide(
  cmd: SessionCommand,
  state: SessionState,
  now: number,
): SessionEvent[] {
  switch (cmd.type) {
    case "register": {
      const existing = state.sessions.get(cmd.sessionId);
      if (!existing) {
        return [{
          type: "session_registered",
          sessionId: cmd.sessionId,
          projectRoot: cmd.projectRoot,
          pid: cmd.pid,
          connectedAt: now,
          lastHeartbeat: now,
        }];
      }
      // A-11: idempotent reconnect — update pid/projectRoot/timestamp instead of rejecting
      return [{
        type: "session_reconnected",
        sessionId: cmd.sessionId,
        projectRoot: cmd.projectRoot,
        pid: cmd.pid,
        lastHeartbeat: now,
      }];
    }

    case "heartbeat": {
      if (!state.sessions.has(cmd.sessionId)) {
        throw new SessionNotFound(cmd.sessionId);
      }
      return [{
        type: "session_heartbeat",
        sessionId: cmd.sessionId,
        lastHeartbeat: cmd.timestamp,
      }];
    }

    case "disconnect": {
      if (!state.sessions.has(cmd.sessionId)) {
        // Idempotent no-op for double-disconnect
        return [];
      }
      return [{
        type: "session_disconnected",
        sessionId: cmd.sessionId,
        reason: cmd.reason,
        disconnectedAt: now,
      }];
    }
  }
}
