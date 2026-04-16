// spacebridge/src/domain/comment/suggestion-decider.ts
// ABOUTME: Pure fmodel decider for the suggestion aggregate. Zero I/O — no DB, no network, no fs.
// decideSuggestion(cmd, suggestionState, commentState, now) → SuggestionEvent[] or throws typed errors.

import {
  CommentNotFoundForSuggestion,
  GuestCannotDecideSuggestion,
  SuggestionNotFound,
  SuggestionNotPending,
} from "./suggestion-errors";
import type { CommentState } from "./types";
import type { SuggestionCommand, SuggestionEvent, SuggestionState } from "./suggestion-types";

export function decideSuggestion(
  cmd: SuggestionCommand,
  suggestionState: SuggestionState,
  commentState: CommentState,
  now: number,
): SuggestionEvent[] {
  switch (cmd.type) {
    case "add_suggestion": {
      if (!commentState.has(cmd.commentId)) {
        throw new CommentNotFoundForSuggestion(cmd.commentId);
      }
      return [
        {
          type: "suggestion_added",
          suggestionId: cmd.suggestionId,
          commentId: cmd.commentId,
          diff_from: cmd.diff_from,
          diff_to: cmd.diff_to,
          author: cmd.author,
          createdAt: now,
        },
      ];
    }

    case "accept_suggestion": {
      const suggestion = suggestionState.get(cmd.suggestionId);
      if (!suggestion) {
        throw new SuggestionNotFound(cmd.suggestionId);
      }
      if (suggestion.status !== "pending") {
        throw new SuggestionNotPending(cmd.suggestionId);
      }
      if (cmd.author === "guest") {
        throw new GuestCannotDecideSuggestion(cmd.suggestionId);
      }
      return [
        {
          type: "suggestion_accepted",
          suggestionId: cmd.suggestionId,
          acceptedBy: cmd.author,
          acceptedAt: now,
        },
      ];
    }

    case "reject_suggestion": {
      const suggestion = suggestionState.get(cmd.suggestionId);
      if (!suggestion) {
        throw new SuggestionNotFound(cmd.suggestionId);
      }
      if (suggestion.status !== "pending") {
        throw new SuggestionNotPending(cmd.suggestionId);
      }
      if (cmd.author === "guest") {
        throw new GuestCannotDecideSuggestion(cmd.suggestionId);
      }
      return [
        {
          type: "suggestion_rejected",
          suggestionId: cmd.suggestionId,
          rejectedBy: cmd.author,
          rejectedAt: now,
        },
      ];
    }
  }
}
