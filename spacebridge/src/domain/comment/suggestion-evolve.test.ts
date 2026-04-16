// spacebridge/src/domain/comment/suggestion-evolve.test.ts
// ABOUTME: Tests for the pure suggestion evolve function. All cases are pure data — no I/O.

import { describe, expect, it } from "bun:test";
import { evolveSuggestion, replaySuggestions } from "./suggestion-evolve";
import { emptySuggestionState } from "./suggestion-types";
import type { SuggestionEvent } from "./suggestion-types";

const BASE_ADDED_EVENT: SuggestionEvent = {
  type: "suggestion_added",
  suggestionId: "s-001",
  commentId: "c-001",
  diff_from: "old text",
  diff_to: "new text",
  author: "fo",
  createdAt: 1000,
};

describe("evolveSuggestion", () => {
  it("suggestion_added creates a pending snapshot", () => {
    const state = evolveSuggestion(new Map(emptySuggestionState), BASE_ADDED_EVENT);
    const snapshot = state.get("s-001");
    expect(snapshot).toBeDefined();
    expect(snapshot?.status).toBe("pending");
    expect(snapshot?.suggestionId).toBe("s-001");
    expect(snapshot?.commentId).toBe("c-001");
    expect(snapshot?.diff_from).toBe("old text");
    expect(snapshot?.diff_to).toBe("new text");
    expect(snapshot?.author).toBe("fo");
    expect(snapshot?.createdAt).toBe(1000);
  });

  it("suggestion_accepted transitions status to accepted", () => {
    const stateWithPending = evolveSuggestion(new Map(emptySuggestionState), BASE_ADDED_EVENT);
    const state = evolveSuggestion(stateWithPending, {
      type: "suggestion_accepted",
      suggestionId: "s-001",
      acceptedBy: "captain",
      acceptedAt: 2000,
    });
    const snapshot = state.get("s-001");
    expect(snapshot?.status).toBe("accepted");
  });

  it("suggestion_rejected transitions status to rejected", () => {
    const stateWithPending = evolveSuggestion(new Map(emptySuggestionState), BASE_ADDED_EVENT);
    const state = evolveSuggestion(stateWithPending, {
      type: "suggestion_rejected",
      suggestionId: "s-001",
      rejectedBy: "captain",
      rejectedAt: 2000,
    });
    const snapshot = state.get("s-001");
    expect(snapshot?.status).toBe("rejected");
  });

  it("suggestion_accepted preserves other fields", () => {
    const stateWithPending = evolveSuggestion(new Map(emptySuggestionState), BASE_ADDED_EVENT);
    const state = evolveSuggestion(stateWithPending, {
      type: "suggestion_accepted",
      suggestionId: "s-001",
      acceptedBy: "captain",
      acceptedAt: 2000,
    });
    const snapshot = state.get("s-001");
    expect(snapshot?.diff_from).toBe("old text");
    expect(snapshot?.diff_to).toBe("new text");
    expect(snapshot?.commentId).toBe("c-001");
  });

  it("unknown suggestionId on accept is a no-op", () => {
    const state = evolveSuggestion(new Map(emptySuggestionState), {
      type: "suggestion_accepted",
      suggestionId: "s-999",
      acceptedBy: "captain",
      acceptedAt: 2000,
    });
    expect(state.size).toBe(0);
  });
});

describe("replaySuggestions", () => {
  it("replay of empty list returns empty state", () => {
    const state = replaySuggestions([]);
    expect(state.size).toBe(0);
  });

  it("replay of [added, accepted] produces accepted snapshot", () => {
    const events: SuggestionEvent[] = [
      BASE_ADDED_EVENT,
      {
        type: "suggestion_accepted",
        suggestionId: "s-001",
        acceptedBy: "captain",
        acceptedAt: 2000,
      },
    ];
    const state = replaySuggestions(events);
    expect(state.get("s-001")?.status).toBe("accepted");
  });

  it("replay of [added, rejected] produces rejected snapshot", () => {
    const events: SuggestionEvent[] = [
      BASE_ADDED_EVENT,
      {
        type: "suggestion_rejected",
        suggestionId: "s-001",
        rejectedBy: "fo",
        rejectedAt: 3000,
      },
    ];
    const state = replaySuggestions(events);
    expect(state.get("s-001")?.status).toBe("rejected");
  });

  it("replay of multiple suggestions produces correct final state", () => {
    const events: SuggestionEvent[] = [
      BASE_ADDED_EVENT,
      {
        type: "suggestion_added",
        suggestionId: "s-002",
        commentId: "c-002",
        diff_from: "foo",
        diff_to: "bar",
        author: "captain",
        createdAt: 1500,
      },
      {
        type: "suggestion_accepted",
        suggestionId: "s-001",
        acceptedBy: "captain",
        acceptedAt: 2000,
      },
    ];
    const state = replaySuggestions(events);
    expect(state.size).toBe(2);
    expect(state.get("s-001")?.status).toBe("accepted");
    expect(state.get("s-002")?.status).toBe("pending");
  });
});
