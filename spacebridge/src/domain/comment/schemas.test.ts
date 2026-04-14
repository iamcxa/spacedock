// spacebridge/src/domain/comment/schemas.test.ts
// ABOUTME: Tests for Zod comment command/event schemas. Validates passthrough, discriminated unions.

import { describe, it, expect } from "bun:test";
import { parseCommand, parseEvent, CommentCommandSchema, CommentEventSchema } from "./schemas";

describe("parseCommand — add_comment", () => {
  it("parses valid add_comment command", () => {
    const raw = {
      type: "add_comment",
      commentId: "00000000-0000-0000-0000-000000000001",
      entityPath: "/path/entity.md",
      selectedText: "some text",
      sectionHeading: "## Directive",
      content: "My comment",
      author: "captain",
    };
    const cmd = parseCommand(raw);
    expect(cmd.type).toBe("add_comment");
    if (cmd.type === "add_comment") {
      expect(cmd.commentId).toBe(raw.commentId);
      expect(cmd.author).toBe("captain");
    }
  });

  it("preserves extra fields (passthrough)", () => {
    const raw = {
      type: "add_comment",
      commentId: "00000000-0000-0000-0000-000000000002",
      entityPath: "/path/entity.md",
      selectedText: "",
      sectionHeading: "## Plan",
      content: "With extra",
      author: "fo",
      extraField: "should survive",
    };
    const cmd = parseCommand(raw) as typeof raw;
    expect((cmd as Record<string, unknown>)["extraField"]).toBe("should survive");
  });

  it("throws on missing required field", () => {
    expect(() =>
      parseCommand({
        type: "add_comment",
        commentId: "00000000-0000-0000-0000-000000000003",
        // entityPath missing
        selectedText: "",
        sectionHeading: "## Directive",
        content: "Missing field",
        author: "captain",
      }),
    ).toThrow();
  });

  it("throws on invalid author value", () => {
    expect(() =>
      parseCommand({
        type: "add_comment",
        commentId: "00000000-0000-0000-0000-000000000004",
        entityPath: "/e.md",
        selectedText: "",
        sectionHeading: "## Directive",
        content: "Bad author",
        author: "admin", // invalid
      }),
    ).toThrow();
  });
});

describe("parseCommand — reply_to_comment", () => {
  it("parses valid reply command", () => {
    const cmd = parseCommand({
      type: "reply_to_comment",
      commentId: "00000000-0000-0000-0000-000000000005",
      parentCommentId: "00000000-0000-0000-0000-000000000001",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "A reply",
      author: "fo",
    });
    expect(cmd.type).toBe("reply_to_comment");
    if (cmd.type === "reply_to_comment") {
      expect(cmd.parentCommentId).toBe("00000000-0000-0000-0000-000000000001");
    }
  });
});

describe("parseCommand — resolve_comment", () => {
  it("parses valid resolve command", () => {
    const cmd = parseCommand({
      type: "resolve_comment",
      commentId: "00000000-0000-0000-0000-000000000001",
    });
    expect(cmd.type).toBe("resolve_comment");
  });
});

describe("parseCommand — resolve_by_stage_advance", () => {
  it("parses valid resolve_by_stage_advance command", () => {
    const cmd = parseCommand({
      type: "resolve_by_stage_advance",
      entityPath: "/e.md",
      sectionHeading: "## Explore",
    });
    expect(cmd.type).toBe("resolve_by_stage_advance");
  });
});

describe("parseEvent — comment_added", () => {
  it("parses valid comment_added event", () => {
    const evt = parseEvent({
      type: "comment_added",
      commentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Hello",
      author: "captain",
      parentId: null,
      createdAt: 1_000_000,
    });
    expect(evt.type).toBe("comment_added");
  });
});

describe("parseEvent — reply_added", () => {
  it("parses valid reply_added event", () => {
    const evt = parseEvent({
      type: "reply_added",
      commentId: "c2",
      parentCommentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Reply",
      author: "fo",
      createdAt: 1_000_001,
    });
    expect(evt.type).toBe("reply_added");
  });
});

describe("parseEvent — comment_resolved", () => {
  it("parses valid comment_resolved event", () => {
    const evt = parseEvent({
      type: "comment_resolved",
      commentId: "c1",
      resolvedReason: "stage_advanced",
      resolvedAt: 1_000_002,
    });
    expect(evt.type).toBe("comment_resolved");
    if (evt.type === "comment_resolved") {
      expect(evt.resolvedReason).toBe("stage_advanced");
    }
  });

  it("preserves extra fields (passthrough)", () => {
    const evt = parseEvent({
      type: "comment_resolved",
      commentId: "c1",
      resolvedReason: "manual",
      resolvedAt: 1_000_000,
      _traceId: "abc123",
    }) as Record<string, unknown>;
    expect(evt["_traceId"]).toBe("abc123");
  });
});
