// spacebridge/src/domain/comment/decider.ts
// ABOUTME: Pure fmodel decider for the comment aggregate. Zero I/O — no DB, no network, no fs.
// decide(cmd, state, now) → CommentEvent[] or throws typed errors from errors.ts.

import type { CommentCommand, CommentEvent, CommentState } from "./types";
import {
  CommentNotFound,
  CommentAlreadyResolved,
  ParentCommentNotFound,
  DuplicateCommentId,
} from "./errors";

export function decide(
  cmd: CommentCommand,
  state: CommentState,
  now: number,
): CommentEvent[] {
  switch (cmd.type) {
    case "add_comment": {
      if (state.has(cmd.commentId)) {
        throw new DuplicateCommentId(cmd.commentId);
      }
      return [{
        type: "comment_added",
        commentId: cmd.commentId,
        entityPath: cmd.entityPath,
        selectedText: cmd.selectedText,
        sectionHeading: cmd.sectionHeading,
        content: cmd.content,
        author: cmd.author,
        parentId: null,
        createdAt: now,
      }];
    }

    case "reply_to_comment": {
      if (state.has(cmd.commentId)) {
        throw new DuplicateCommentId(cmd.commentId);
      }
      const parent = state.get(cmd.parentCommentId);
      if (!parent) {
        throw new ParentCommentNotFound(cmd.parentCommentId);
      }
      if (parent.resolved) {
        throw new CommentAlreadyResolved(cmd.parentCommentId);
      }
      return [{
        type: "reply_added",
        commentId: cmd.commentId,
        parentCommentId: cmd.parentCommentId,
        entityPath: cmd.entityPath,
        selectedText: cmd.selectedText,
        sectionHeading: cmd.sectionHeading,
        content: cmd.content,
        author: cmd.author,
        createdAt: now,
      }];
    }

    case "resolve_comment": {
      const comment = state.get(cmd.commentId);
      if (!comment) {
        throw new CommentNotFound(cmd.commentId);
      }
      if (comment.resolved) {
        throw new CommentAlreadyResolved(cmd.commentId);
      }
      return [{
        type: "comment_resolved",
        commentId: cmd.commentId,
        resolvedReason: "manual",
        resolvedAt: now,
      }];
    }

    case "resolve_by_stage_advance": {
      const events: CommentEvent[] = [];
      for (const [, comment] of state) {
        if (
          comment.entityPath === cmd.entityPath &&
          comment.sectionHeading === cmd.sectionHeading &&
          !comment.resolved
        ) {
          events.push({
            type: "comment_resolved",
            commentId: comment.commentId,
            resolvedReason: "stage_advanced",
            resolvedAt: now,
          });
        }
      }
      return events;
    }
  }
}
