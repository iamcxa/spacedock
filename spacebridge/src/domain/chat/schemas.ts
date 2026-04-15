// spacebridge/src/domain/chat/schemas.ts
// ABOUTME: Zod schemas for chat commands and events. All use .passthrough() per §3.5.
// Provides parseCommand / parseEvent helpers for safe boundary validation.

import { z } from "zod";

// ─── Command schemas ──────────────────────────────────────────────────────────

const SendCaptainMessageCommandSchema = z
  .object({
    type: z.literal("send_captain_message"),
    messageId: z.string().min(1),
    targetSessionId: z.string(),
    projectRoot: z.string(),
    content: z.string().min(1),
    sentAt: z.number().int(),
  })
  .passthrough();

export const ChatCommandSchema = z.discriminatedUnion("type", [SendCaptainMessageCommandSchema]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const CaptainMessageSentEventSchema = z
  .object({
    type: z.literal("captain_message_sent"),
    messageId: z.string(),
    targetSessionId: z.string(),
    projectRoot: z.string(),
    content: z.string(),
    sentAt: z.number().int(),
  })
  .passthrough();

const CaptainMessageDeliveredEventSchema = z
  .object({
    type: z.literal("captain_message_delivered"),
    messageId: z.string(),
    deliveredAt: z.number().int(),
  })
  .passthrough();

export const ChatEventSchema = z.discriminatedUnion("type", [
  CaptainMessageSentEventSchema,
  CaptainMessageDeliveredEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCommand(raw: unknown) {
  return ChatCommandSchema.parse(raw);
}

export function parseEvent(raw: unknown) {
  return ChatEventSchema.parse(raw);
}
