// spacebridge/src/domain/session/schemas.ts
// ABOUTME: Zod schemas for session commands and events. All use .passthrough() per §3.5.
// Provides parseCommand / parseEvent helpers for safe boundary validation.

import { z } from "zod";

// ─── Command schemas ──────────────────────────────────────────────────────────

const RegisterCommandSchema = z
  .object({
    type: z.literal("register"),
    sessionId: z.string(),
    projectRoot: z.string(),
    pid: z.number().int(),
    protocolVersion: z.number().int(),
  })
  .passthrough();

const HeartbeatCommandSchema = z
  .object({
    type: z.literal("heartbeat"),
    sessionId: z.string(),
    timestamp: z.number().int(),
  })
  .passthrough();

const DisconnectCommandSchema = z
  .object({
    type: z.literal("disconnect"),
    sessionId: z.string(),
    reason: z.enum(["explicit", "timeout", "shutdown"]),
  })
  .passthrough();

export const SessionCommandSchema = z.discriminatedUnion("type", [
  RegisterCommandSchema,
  HeartbeatCommandSchema,
  DisconnectCommandSchema,
]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const SessionRegisteredEventSchema = z
  .object({
    type: z.literal("session_registered"),
    sessionId: z.string(),
    projectRoot: z.string(),
    pid: z.number().int(),
    connectedAt: z.number().int(),
    lastHeartbeat: z.number().int(),
  })
  .passthrough();

const SessionReconnectedEventSchema = z
  .object({
    type: z.literal("session_reconnected"),
    sessionId: z.string(),
    projectRoot: z.string(),
    pid: z.number().int(),
    lastHeartbeat: z.number().int(),
  })
  .passthrough();

const SessionHeartbeatEventSchema = z
  .object({
    type: z.literal("session_heartbeat"),
    sessionId: z.string(),
    lastHeartbeat: z.number().int(),
  })
  .passthrough();

const SessionDisconnectedEventSchema = z
  .object({
    type: z.literal("session_disconnected"),
    sessionId: z.string(),
    reason: z.enum(["explicit", "timeout", "shutdown"]),
    disconnectedAt: z.number().int(),
  })
  .passthrough();

export const SessionEventSchema = z.discriminatedUnion("type", [
  SessionRegisteredEventSchema,
  SessionReconnectedEventSchema,
  SessionHeartbeatEventSchema,
  SessionDisconnectedEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCommand(raw: unknown) {
  return SessionCommandSchema.parse(raw);
}

export function parseEvent(raw: unknown) {
  return SessionEventSchema.parse(raw);
}
