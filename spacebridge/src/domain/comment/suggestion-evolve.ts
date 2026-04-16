// spacebridge/src/domain/comment/suggestion-evolve.ts
// ABOUTME: Pure fmodel evolve function for the suggestion aggregate. Zero I/O.
// evolveSuggestion(state, event) → new SuggestionState. replaySuggestions(events) reduces over evolveSuggestion from empty state.

import type { SuggestionEvent, SuggestionSnapshot, SuggestionState } from "./suggestion-types";
import { emptySuggestionState } from "./suggestion-types";

export function evolveSuggestion(state: SuggestionState, event: SuggestionEvent): SuggestionState {
  switch (event.type) {
    case "suggestion_added": {
      const newState = new Map(state);
      const snapshot: SuggestionSnapshot = {
        suggestionId: event.suggestionId,
        commentId: event.commentId,
        diff_from: event.diff_from,
        diff_to: event.diff_to,
        status: "pending",
        author: event.author as "captain" | "fo" | "guest",
        createdAt: event.createdAt,
      };
      newState.set(event.suggestionId, snapshot);
      return newState;
    }

    case "suggestion_accepted": {
      const newState = new Map(state);
      const existing = newState.get(event.suggestionId);
      if (existing) {
        newState.set(event.suggestionId, {
          ...existing,
          status: "accepted",
        });
      }
      return newState;
    }

    case "suggestion_rejected": {
      const newState = new Map(state);
      const existing = newState.get(event.suggestionId);
      if (existing) {
        newState.set(event.suggestionId, {
          ...existing,
          status: "rejected",
        });
      }
      return newState;
    }
  }
}

export function replaySuggestions(events: SuggestionEvent[]): SuggestionState {
  return events.reduce(evolveSuggestion, new Map(emptySuggestionState));
}
