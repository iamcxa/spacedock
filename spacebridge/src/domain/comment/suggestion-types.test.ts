// spacebridge/src/domain/comment/suggestion-types.test.ts
// ABOUTME: Tests for suggestion domain types — emptySuggestionState and type literal correctness.

import { describe, expect, it } from "bun:test";
import {
  emptySuggestionState,
  type AddSuggestionCommand,
  type AcceptSuggestionCommand,
  type RejectSuggestionCommand,
  type SuggestionAddedEvent,
  type SuggestionAcceptedEvent,
  type SuggestionRejectedEvent,
} from "./suggestion-types";

describe("emptySuggestionState", () => {
  it("is an empty Map", () => {
    expect(emptySuggestionState).toBeInstanceOf(Map);
    expect(emptySuggestionState.size).toBe(0);
  });
});

describe("command type literals", () => {
  it("AddSuggestionCommand has type add_suggestion", () => {
    const cmd: AddSuggestionCommand = {
      type: "add_suggestion",
      suggestionId: "s1",
      commentId: "c1",
      diff_from: "old text",
      diff_to: "new text",
      author: "captain",
    };
    expect(cmd.type).toBe("add_suggestion");
  });

  it("AcceptSuggestionCommand has type accept_suggestion", () => {
    const cmd: AcceptSuggestionCommand = {
      type: "accept_suggestion",
      suggestionId: "s1",
      author: "fo",
    };
    expect(cmd.type).toBe("accept_suggestion");
  });

  it("RejectSuggestionCommand has type reject_suggestion", () => {
    const cmd: RejectSuggestionCommand = {
      type: "reject_suggestion",
      suggestionId: "s1",
      author: "captain",
    };
    expect(cmd.type).toBe("reject_suggestion");
  });
});

describe("event type literals", () => {
  it("SuggestionAddedEvent has type suggestion_added", () => {
    const evt: SuggestionAddedEvent = {
      type: "suggestion_added",
      suggestionId: "s1",
      commentId: "c1",
      diff_from: "old",
      diff_to: "new",
      author: "captain",
      createdAt: 1000,
    };
    expect(evt.type).toBe("suggestion_added");
  });

  it("SuggestionAcceptedEvent has type suggestion_accepted", () => {
    const evt: SuggestionAcceptedEvent = {
      type: "suggestion_accepted",
      suggestionId: "s1",
      acceptedBy: "fo",
      acceptedAt: 2000,
    };
    expect(evt.type).toBe("suggestion_accepted");
  });

  it("SuggestionRejectedEvent has type suggestion_rejected", () => {
    const evt: SuggestionRejectedEvent = {
      type: "suggestion_rejected",
      suggestionId: "s1",
      rejectedBy: "captain",
      rejectedAt: 3000,
    };
    expect(evt.type).toBe("suggestion_rejected");
  });
});
