// spacebridge/src/domain/lease/schemas.ts
// ABOUTME: Zod schemas for lease commands and events. All use .passthrough() per §3.5.
// Provides parseCommand / parseEvent helpers for safe boundary validation.

import { z } from "zod";

const RoleSchema = z.enum(["SO", "FO", "QO"]);

// ─── Command schemas ──────────────────────────────────────────────────────────

const AcquireCommandSchema = z.object({
  type: z.literal("acquire"),
  entitySlug: z.string(),
  role: RoleSchema,
  sessionId: z.string(),
  leaseDurationMs: z.number().int().positive(),
}).passthrough();

const ReleaseCommandSchema = z.object({
  type: z.literal("release"),
  token: z.string(),
  outcome: z.enum(["done", "abort"]),
}).passthrough();

const ExtendCommandSchema = z.object({
  type: z.literal("extend"),
  token: z.string(),
  leaseDurationMs: z.number().int().positive(),
}).passthrough();

const ExpireCommandSchema = z.object({
  type: z.literal("expire"),
  token: z.string(),
  now: z.number().int().nonnegative(),
}).passthrough();

export const LeaseCommandSchema = z.discriminatedUnion("type", [
  AcquireCommandSchema,
  ReleaseCommandSchema,
  ExtendCommandSchema,
  ExpireCommandSchema,
]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const AcquiredEventSchema = z.object({
  type: z.literal("acquired"),
  token: z.string(),
  entitySlug: z.string(),
  role: RoleSchema,
  sessionId: z.string(),
  acquiredAt: z.number().int(),
  expiresAt: z.number().int(),
}).passthrough();

const ReleasedEventSchema = z.object({
  type: z.literal("released"),
  token: z.string(),
  outcome: z.enum(["done", "abort"]),
  releasedAt: z.number().int(),
}).passthrough();

const ExtendedEventSchema = z.object({
  type: z.literal("extended"),
  token: z.string(),
  newExpiresAt: z.number().int(),
}).passthrough();

const ExpiredEventSchema = z.object({
  type: z.literal("expired"),
  token: z.string(),
  expiredAt: z.number().int(),
}).passthrough();

export const LeaseEventSchema = z.discriminatedUnion("type", [
  AcquiredEventSchema,
  ReleasedEventSchema,
  ExtendedEventSchema,
  ExpiredEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCommand(raw: unknown) {
  return LeaseCommandSchema.parse(raw);
}

export function parseEvent(raw: unknown) {
  return LeaseEventSchema.parse(raw);
}
