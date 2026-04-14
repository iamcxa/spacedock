// spacebridge/src/domain/session/types.ts
// ABOUTME: Domain types for the multi-root session registry fmodel CQRS aggregate.
// SessionState is a Map<sessionId, SessionRecord> rebuilt via event replay on startup.

// ─── State ────────────────────────────────────────────────────────────────────

export interface SessionRecord {
  sessionId: string;
  projectRoot: string;
  pid: number;
  connectedAt: number; // epoch-ms
  lastHeartbeat: number; // epoch-ms
}

export interface SessionState {
  sessions: Map<string, SessionRecord>;
}

export const emptySessionState: SessionState = { sessions: new Map() };

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface RegisterCommand {
  type: "register";
  sessionId: string;
  projectRoot: string;
  pid: number;
  protocolVersion: number;
}

export interface HeartbeatCommand {
  type: "heartbeat";
  sessionId: string;
  timestamp: number; // epoch-ms
}

export interface DisconnectCommand {
  type: "disconnect";
  sessionId: string;
  reason: "explicit" | "timeout" | "shutdown";
}

export type SessionCommand = RegisterCommand | HeartbeatCommand | DisconnectCommand;

// ─── Events ───────────────────────────────────────────────────────────────────

export interface SessionRegisteredEvent {
  type: "session_registered";
  sessionId: string;
  projectRoot: string;
  pid: number;
  connectedAt: number; // epoch-ms
  lastHeartbeat: number; // epoch-ms
}

export interface SessionReconnectedEvent {
  type: "session_reconnected";
  sessionId: string;
  projectRoot: string;
  pid: number;
  lastHeartbeat: number; // epoch-ms
}

export interface SessionHeartbeatEvent {
  type: "session_heartbeat";
  sessionId: string;
  lastHeartbeat: number; // epoch-ms
}

export interface SessionDisconnectedEvent {
  type: "session_disconnected";
  sessionId: string;
  reason: "explicit" | "timeout" | "shutdown";
  disconnectedAt: number; // epoch-ms
}

export type SessionEvent =
  | SessionRegisteredEvent
  | SessionReconnectedEvent
  | SessionHeartbeatEvent
  | SessionDisconnectedEvent;
