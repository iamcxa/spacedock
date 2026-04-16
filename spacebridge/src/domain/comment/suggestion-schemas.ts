// spacebridge/src/domain/comment/suggestion-schemas.ts
// ABOUTME: Zod schemas for suggestion commands and events. All use .passthrough() per §3.5.
// Provides parseSuggestionCommand / parseSuggestionEvent helpers for safe boundary validation.

import { z } from "zod";

const AuthorSchema = z.enum(["captain", "fo", "guest"]);

// ─── Command schemas ──────────────────────────────────────────────────────────

const AddSuggestionCommandSchema = z
  .object({
    type: z.literal("add_suggestion"),
    suggestionId: z.string().min(1),
    commentId: z.string().min(1),
    diff_from: z.string().min(1),
    diff_to: z.string().min(1),
    author: AuthorSchema,
  })
  .passthrough();

const AcceptSuggestionCommandSchema = z
  .object({
    type: z.literal("accept_suggestion"),
    suggestionId: z.string().min(1),
    author: AuthorSchema,
  })
  .passthrough();

const RejectSuggestionCommandSchema = z
  .object({
    type: z.literal("reject_suggestion"),
    suggestionId: z.string().min(1),
    author: AuthorSchema,
  })
  .passthrough();

export const SuggestionCommandSchema = z.discriminatedUnion("type", [
  AddSuggestionCommandSchema,
  AcceptSuggestionCommandSchema,
  RejectSuggestionCommandSchema,
]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const SuggestionAddedEventSchema = z
  .object({
    type: z.literal("suggestion_added"),
    suggestionId: z.string(),
    commentId: z.string(),
    diff_from: z.string(),
    diff_to: z.string(),
    author: AuthorSchema,
    createdAt: z.number().int(),
  })
  .passthrough();

const SuggestionAcceptedEventSchema = z
  .object({
    type: z.literal("suggestion_accepted"),
    suggestionId: z.string(),
    acceptedBy: z.string(),
    acceptedAt: z.number().int(),
  })
  .passthrough();

const SuggestionRejectedEventSchema = z
  .object({
    type: z.literal("suggestion_rejected"),
    suggestionId: z.string(),
    rejectedBy: z.string(),
    rejectedAt: z.number().int(),
  })
  .passthrough();

export const SuggestionEventSchema = z.discriminatedUnion("type", [
  SuggestionAddedEventSchema,
  SuggestionAcceptedEventSchema,
  SuggestionRejectedEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseSuggestionCommand(raw: unknown) {
  return SuggestionCommandSchema.parse(raw);
}

export function parseSuggestionEvent(raw: unknown) {
  return SuggestionEventSchema.parse(raw);
}
