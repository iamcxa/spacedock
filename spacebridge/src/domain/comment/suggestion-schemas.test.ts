// spacebridge/src/domain/comment/suggestion-schemas.test.ts
// ABOUTME: Tests for suggestion Zod schemas — commands, events, passthrough, helpers.

import { describe, expect, it } from "bun:test";
import { ZodError } from "zod";
import {
  parseSuggestionCommand,
  parseSuggestionEvent,
} from "./suggestion-schemas";

describe("parseSuggestionCommand", () => {
  it("parses a valid add_suggestion command", () => {
    const raw = {
      type: "add_suggestion",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old text",
      diff_to: "new text",
      author: "captain",
    };
    const result = parseSuggestionCommand(raw);
    expect(result.type).toBe("add_suggestion");
    expect(result.suggestionId).toBe("s-1");
    expect(result.diff_from).toBe("old text");
  });

  it("throws ZodError when diff_from is missing", () => {
    const raw = {
      type: "add_suggestion",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_to: "new text",
      author: "captain",
    };
    expect(() => parseSuggestionCommand(raw)).toThrow(ZodError);
  });

  it("parses a valid accept_suggestion command", () => {
    const raw = {
      type: "accept_suggestion",
      suggestionId: "s-1",
      author: "fo",
    };
    const result = parseSuggestionCommand(raw);
    expect(result.type).toBe("accept_suggestion");
  });

  it("parses a valid reject_suggestion command", () => {
    const raw = {
      type: "reject_suggestion",
      suggestionId: "s-1",
      author: "captain",
    };
    const result = parseSuggestionCommand(raw);
    expect(result.type).toBe("reject_suggestion");
  });

  it("passthrough preserves extra fields on add_suggestion", () => {
    const raw = {
      type: "add_suggestion",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old",
      diff_to: "new",
      author: "captain",
      extraField: "preserved",
    };
    const result = parseSuggestionCommand(raw) as typeof raw;
    expect(result.extraField).toBe("preserved");
  });

  it("accepts guest author in add_suggestion", () => {
    const raw = {
      type: "add_suggestion",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old",
      diff_to: "new",
      author: "guest",
    };
    const result = parseSuggestionCommand(raw);
    expect(result.author).toBe("guest");
  });
});

describe("parseSuggestionEvent", () => {
  it("parses a valid suggestion_added event", () => {
    const raw = {
      type: "suggestion_added",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old",
      diff_to: "new",
      author: "captain",
      createdAt: 1000,
    };
    const result = parseSuggestionEvent(raw);
    expect(result.type).toBe("suggestion_added");
    expect(result.createdAt).toBe(1000);
  });

  it("parses a valid suggestion_accepted event", () => {
    const raw = {
      type: "suggestion_accepted",
      suggestionId: "s-1",
      acceptedBy: "fo",
      acceptedAt: 2000,
    };
    const result = parseSuggestionEvent(raw);
    expect(result.type).toBe("suggestion_accepted");
  });

  it("parses a valid suggestion_rejected event", () => {
    const raw = {
      type: "suggestion_rejected",
      suggestionId: "s-1",
      rejectedBy: "captain",
      rejectedAt: 3000,
    };
    const result = parseSuggestionEvent(raw);
    expect(result.type).toBe("suggestion_rejected");
  });

  it("passthrough preserves extra fields on suggestion_added event", () => {
    const raw = {
      type: "suggestion_added",
      suggestionId: "s-1",
      commentId: "c-1",
      diff_from: "old",
      diff_to: "new",
      author: "fo",
      createdAt: 1000,
      metadata: "extra",
    };
    const result = parseSuggestionEvent(raw) as typeof raw;
    expect(result.metadata).toBe("extra");
  });
});
