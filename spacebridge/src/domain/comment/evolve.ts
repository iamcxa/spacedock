// spacebridge/src/domain/comment/evolve.ts
// ABOUTME: Pure fmodel evolve function for the comment aggregate. Zero I/O.
// evolve(state, event) → new CommentState. replay(events) reduces over evolve from empty state.

import type { CommentEvent, CommentSnapshot, CommentState } from "./types";
import { emptyCommentState } from "./types";

export function evolve(state: CommentState, event: CommentEvent): CommentState {
  switch (event.type) {
    case "comment_added": {
      const newState = new Map(state);
      const snapshot: CommentSnapshot = {
        commentId: event.commentId,
        entityPath: event.entityPath,
        selectedText: event.selectedText,
        sectionHeading: event.sectionHeading,
        content: event.content,
        author: event.author,
        parentId: null,
        createdAt: event.createdAt,
        resolved: false,
        resolvedReason: null,
      };
      newState.set(event.commentId, snapshot);
      return newState;
    }

    case "reply_added": {
      const newState = new Map(state);
      const snapshot: CommentSnapshot = {
        commentId: event.commentId,
        entityPath: event.entityPath,
        selectedText: event.selectedText,
        sectionHeading: event.sectionHeading,
        content: event.content,
        author: event.author,
        parentId: event.parentCommentId,
        createdAt: event.createdAt,
        resolved: false,
        resolvedReason: null,
      };
      newState.set(event.commentId, snapshot);
      return newState;
    }

    case "comment_resolved": {
      const newState = new Map(state);
      const existing = newState.get(event.commentId);
      if (existing) {
        newState.set(event.commentId, {
          ...existing,
          resolved: true,
          resolvedReason: event.resolvedReason,
        });
      }
      return newState;
    }

    default:
      // Tolerate events from co-located sub-aggregates (e.g. suggestion_*)
      // that share the comment_events table.
      return state;
  }
}

export function replay(events: CommentEvent[]): CommentState {
  return events.reduce(evolve, new Map(emptyCommentState));
}
