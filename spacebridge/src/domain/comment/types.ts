// spacebridge/src/domain/comment/types.ts
// ABOUTME: Domain types for the comment fmodel CQRS aggregate.
// Commands: add_comment, reply_to_comment, resolve_comment, resolve_by_stage_advance.
// Events: comment_added, reply_added, comment_resolved.
// State: Map<commentId, CommentSnapshot> — rebuilt via event replay.

// ─── State ─────────────────────────────────────────────────────────────────────

export interface CommentSnapshot {
  commentId: string; // UUID
  entityPath: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: "captain" | "fo" | "guest";
  parentId: string | null; // null = top-level, string = reply to this commentId
  createdAt: number; // epoch-ms
  resolved: boolean;
  resolvedReason: "manual" | "stage_advanced" | null;
}

export type CommentState = Map<string, CommentSnapshot>;

export const emptyCommentState: CommentState = new Map();

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface AddCommentCommand {
  type: "add_comment";
  commentId: string; // UUID (caller generates)
  entityPath: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: "captain" | "fo" | "guest";
}

export interface ReplyToCommentCommand {
  type: "reply_to_comment";
  commentId: string; // UUID for the new reply
  parentCommentId: string; // must exist and not be resolved
  entityPath: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: "captain" | "fo" | "guest";
}

export interface ResolveCommentCommand {
  type: "resolve_comment";
  commentId: string;
}

export interface ResolveByStageAdvanceCommand {
  type: "resolve_by_stage_advance";
  entityPath: string;
  sectionHeading: string; // stage heading to bulk-resolve
}

export type CommentCommand =
  | AddCommentCommand
  | ReplyToCommentCommand
  | ResolveCommentCommand
  | ResolveByStageAdvanceCommand;

// ─── Events ────────────────────────────────────────────────────────────────────

export interface CommentAddedEvent {
  type: "comment_added";
  commentId: string;
  entityPath: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: "captain" | "fo" | "guest";
  parentId: null;
  createdAt: number; // epoch-ms
}

export interface ReplyAddedEvent {
  type: "reply_added";
  commentId: string;
  parentCommentId: string;
  entityPath: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: "captain" | "fo" | "guest";
  createdAt: number; // epoch-ms
}

export interface CommentResolvedEvent {
  type: "comment_resolved";
  commentId: string;
  resolvedReason: "manual" | "stage_advanced";
  resolvedAt: number; // epoch-ms
}

export type CommentEvent = CommentAddedEvent | ReplyAddedEvent | CommentResolvedEvent;
