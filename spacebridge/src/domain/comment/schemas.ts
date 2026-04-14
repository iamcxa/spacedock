// spacebridge/src/domain/comment/schemas.ts
// ABOUTME: Zod schemas for comment commands and events. All use .passthrough() per §3.5.
// Provides parseCommand / parseEvent helpers for safe boundary validation.

import { z } from "zod";

const AuthorSchema = z.enum(["captain", "fo", "guest"]);

// ─── Command schemas ──────────────────────────────────────────────────────────

const AddCommentCommandSchema = z
  .object({
    type: z.literal("add_comment"),
    commentId: z.string().min(1),
    entityPath: z.string(),
    selectedText: z.string(),
    sectionHeading: z.string(),
    content: z.string().min(1),
    author: AuthorSchema,
  })
  .passthrough();

const ReplyToCommentCommandSchema = z
  .object({
    type: z.literal("reply_to_comment"),
    commentId: z.string().min(1),
    parentCommentId: z.string().min(1),
    entityPath: z.string(),
    selectedText: z.string(),
    sectionHeading: z.string(),
    content: z.string().min(1),
    author: AuthorSchema,
  })
  .passthrough();

const ResolveCommentCommandSchema = z
  .object({
    type: z.literal("resolve_comment"),
    commentId: z.string().min(1),
  })
  .passthrough();

const ResolveByStageAdvanceCommandSchema = z
  .object({
    type: z.literal("resolve_by_stage_advance"),
    entityPath: z.string(),
    sectionHeading: z.string(),
  })
  .passthrough();

export const CommentCommandSchema = z.discriminatedUnion("type", [
  AddCommentCommandSchema,
  ReplyToCommentCommandSchema,
  ResolveCommentCommandSchema,
  ResolveByStageAdvanceCommandSchema,
]);

// ─── Event schemas ────────────────────────────────────────────────────────────

const CommentAddedEventSchema = z
  .object({
    type: z.literal("comment_added"),
    commentId: z.string(),
    entityPath: z.string(),
    selectedText: z.string(),
    sectionHeading: z.string(),
    content: z.string(),
    author: AuthorSchema,
    parentId: z.null(),
    createdAt: z.number().int(),
  })
  .passthrough();

const ReplyAddedEventSchema = z
  .object({
    type: z.literal("reply_added"),
    commentId: z.string(),
    parentCommentId: z.string(),
    entityPath: z.string(),
    selectedText: z.string(),
    sectionHeading: z.string(),
    content: z.string(),
    author: AuthorSchema,
    createdAt: z.number().int(),
  })
  .passthrough();

const CommentResolvedEventSchema = z
  .object({
    type: z.literal("comment_resolved"),
    commentId: z.string(),
    resolvedReason: z.enum(["manual", "stage_advanced"]),
    resolvedAt: z.number().int(),
  })
  .passthrough();

export const CommentEventSchema = z.discriminatedUnion("type", [
  CommentAddedEventSchema,
  ReplyAddedEventSchema,
  CommentResolvedEventSchema,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCommand(raw: unknown) {
  return CommentCommandSchema.parse(raw);
}

export function parseEvent(raw: unknown) {
  return CommentEventSchema.parse(raw);
}
