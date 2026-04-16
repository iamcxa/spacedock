// spacebridge/src/domain/comment/suggestion-decider.test.ts
// ABOUTME: Unit tests for the pure suggestion decider. Zero I/O.

import { describe, expect, test } from "bun:test";
import { decideSuggestion } from "./suggestion-decider";
import {
  CommentNotFoundForSuggestion,
  GuestCannotDecideSuggestion,
  SuggestionNotFound,
  SuggestionNotPending,
} from "./suggestion-errors";
import type { CommentSnapshot, CommentState } from "./types";
import type { SuggestionSnapshot, SuggestionState } from "./suggestion-types";

const NOW = 1_700_000_000_000;

function makeCommentState(...ids: string[]): CommentState {
  const state: CommentState = new Map();
  for (const id of ids) {
    state.set(id, {
      commentId: id,
      entityPath: "docs/build-pipeline/test.md",
      selectedText: "some text",
      sectionHeading: "## Section",
      content: "A comment",
      author: "captain",
      parentId: null,
      createdAt: NOW - 1000,
      resolved: false,
      resolvedReason: null,
    } satisfies CommentSnapshot);
  }
  return state;
}

function makeSuggestionState(
  ...snaps: Partial<SuggestionSnapshot>[]
): SuggestionState {
  const state: SuggestionState = new Map();
  for (const s of snaps) {
    const snap: SuggestionSnapshot = {
      suggestionId: s.suggestionId ?? "s-1",
      commentId: s.commentId ?? "c-1",
      diff_from: s.diff_from ?? "old text",
      diff_to: s.diff_to ?? "new text",
      status: s.status ?? "pending",
      author: s.author ?? "fo",
      createdAt: s.createdAt ?? NOW - 500,
    };
    state.set(snap.suggestionId, snap);
  }
  return state;
}

describe("decideSuggestion — add_suggestion", () => {
  test("returns suggestion_added event when comment exists", () => {
    const events = decideSuggestion(
      {
        type: "add_suggestion",
        suggestionId: "s-1",
        commentId: "c-1",
        diff_from: "old",
        diff_to: "new",
        author: "fo",
      },
      new Map(),
      makeCommentState("c-1"),
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "suggestion_added",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old",
      diff_to: "new",
      author: "fo",
      createdAt: NOW,
    });
  });

  test("throws CommentNotFoundForSuggestion when comment does not exist", () => {
    expect(() =>
      decideSuggestion(
        {
          type: "add_suggestion",
          suggestionId: "s-1",
          commentId: "c-missing",
          diff_from: "old",
          diff_to: "new",
          author: "captain",
        },
        new Map(),
        new Map(),
        NOW,
      ),
    ).toThrow(CommentNotFoundForSuggestion);
  });

  test("guest author can add a suggestion", () => {
    const events = decideSuggestion(
      {
        type: "add_suggestion",
        suggestionId: "s-2",
        commentId: "c-1",
        diff_from: "a",
        diff_to: "b",
        author: "guest",
      },
      new Map(),
      makeCommentState("c-1"),
      NOW,
    );
    expect(events[0].type).toBe("suggestion_added");
  });
});

describe("decideSuggestion — accept_suggestion", () => {
  test("returns suggestion_accepted event for a pending suggestion", () => {
    const events = decideSuggestion(
      { type: "accept_suggestion", suggestionId: "s-1", author: "captain" },
      makeSuggestionState({ suggestionId: "s-1", status: "pending" }),
      new Map(),
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "suggestion_accepted",
      suggestionId: "s-1",
      acceptedBy: "captain",
      acceptedAt: NOW,
    });
  });

  test("throws SuggestionNotFound when suggestion does not exist", () => {
    expect(() =>
      decideSuggestion(
        { type: "accept_suggestion", suggestionId: "s-missing", author: "captain" },
        new Map(),
        new Map(),
        NOW,
      ),
    ).toThrow(SuggestionNotFound);
  });

  test("throws SuggestionNotPending when suggestion is already accepted", () => {
    expect(() =>
      decideSuggestion(
        { type: "accept_suggestion", suggestionId: "s-1", author: "fo" },
        makeSuggestionState({ suggestionId: "s-1", status: "accepted" }),
        new Map(),
        NOW,
      ),
    ).toThrow(SuggestionNotPending);
  });

  test("throws SuggestionNotPending when suggestion is already rejected", () => {
    expect(() =>
      decideSuggestion(
        { type: "accept_suggestion", suggestionId: "s-1", author: "fo" },
        makeSuggestionState({ suggestionId: "s-1", status: "rejected" }),
        new Map(),
        NOW,
      ),
    ).toThrow(SuggestionNotPending);
  });

  test("throws GuestCannotDecideSuggestion when guest attempts accept", () => {
    expect(() =>
      decideSuggestion(
        { type: "accept_suggestion", suggestionId: "s-1", author: "guest" },
        makeSuggestionState({ suggestionId: "s-1", status: "pending" }),
        new Map(),
        NOW,
      ),
    ).toThrow(GuestCannotDecideSuggestion);
  });
});

describe("decideSuggestion — reject_suggestion", () => {
  test("returns suggestion_rejected event for a pending suggestion", () => {
    const events = decideSuggestion(
      { type: "reject_suggestion", suggestionId: "s-1", author: "fo" },
      makeSuggestionState({ suggestionId: "s-1", status: "pending" }),
      new Map(),
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "suggestion_rejected",
      suggestionId: "s-1",
      rejectedBy: "fo",
      rejectedAt: NOW,
    });
  });

  test("throws GuestCannotDecideSuggestion when guest attempts reject", () => {
    expect(() =>
      decideSuggestion(
        { type: "reject_suggestion", suggestionId: "s-1", author: "guest" },
        makeSuggestionState({ suggestionId: "s-1", status: "pending" }),
        new Map(),
        NOW,
      ),
    ).toThrow(GuestCannotDecideSuggestion);
  });

  test("throws SuggestionNotFound when suggestion does not exist", () => {
    expect(() =>
      decideSuggestion(
        { type: "reject_suggestion", suggestionId: "s-missing", author: "captain" },
        new Map(),
        new Map(),
        NOW,
      ),
    ).toThrow(SuggestionNotFound);
  });
});
