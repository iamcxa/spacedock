// spacebridge/src/domain/gate/schemas.ts
// ABOUTME: Zod schemas for gate commands and events. All use .passthrough() per §3.5.
// Provides parseCommand / parseEvent helpers for safe boundary validation.

import { z } from "zod";

// ─── Command schemas ──────────────────────────────────────────────────────────

const ApproveGateCommandSchema = z
  .object({
    type: z.literal("approve_gate"),
    entitySlug: z.string().min(1),
    stage: z.string().min(1),
    decidedBy: z.string().min(1),
    reason: z.string().optional(),
  })
  .passthrough();

const RejectGateCommandSchema = z
  .object({
    type: z.literal("reject_gate"),
    entitySlug: z.string().min(1),
    stage: z.string().min(1),
    decidedBy: z.string().min(1),
    reason: z.string().optional(),
  })
  .passthrough();

export const GateCommandSchema = z.discriminatedUnion("type", [
  ApproveGateCommandSchema,
  RejectGateCommandSchema,
]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const GateApprovedEventSchema = z
  .object({
    type: z.literal("gate_approved"),
    entitySlug: z.string(),
    stage: z.string(),
    decidedBy: z.string(),
    decidedAt: z.number().int(),
  })
  .passthrough();

const GateRejectedEventSchema = z
  .object({
    type: z.literal("gate_rejected"),
    entitySlug: z.string(),
    stage: z.string(),
    decidedBy: z.string(),
    reason: z.string(),
    decidedAt: z.number().int(),
  })
  .passthrough();

export const GateEventSchema = z.discriminatedUnion("type", [
  GateApprovedEventSchema,
  GateRejectedEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCommand(raw: unknown) {
  return GateCommandSchema.parse(raw);
}

export function parseEvent(raw: unknown) {
  return GateEventSchema.parse(raw);
}
