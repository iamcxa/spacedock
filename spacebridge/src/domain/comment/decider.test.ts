// spacebridge/src/domain/comment/decider.test.ts
// ABOUTME: Pure unit tests for comment decider. Zero I/O — no DB, no network.
// Tests cover all command types and error conditions.

import { describe, expect, it } from "bun:test";
import { decide } from "./decider";
import {
  CommentAlreadyResolved,
  CommentNotFound,
  DuplicateCommentId,
  ParentCommentNotFound,
} from "./errors";
import type { CommentSnapshot, CommentState } from "./types";

const NOW = 1_000_000;

function makeState(snapshots: Partial<CommentSnapshot>[] = []): CommentState {
  const state: CommentState = new Map();
  for (const s of snapshots) {
    const snap: CommentSnapshot = {
      commentId: s.commentId ?? "c1",
      entityPath: s.entityPath ?? "/path/to/entity.md",
      selectedText: s.selectedText ?? "",
      sectionHeading: s.sectionHeading ?? "## Directive",
      content: s.content ?? "Test comment",
      author: s.author ?? "captain",
      parentId: s.parentId ?? null,
      createdAt: s.createdAt ?? NOW - 1000,
      resolved: s.resolved ?? false,
      resolvedReason: s.resolvedReason ?? null,
    };
    state.set(snap.commentId, snap);
  }
  return state;
}

describe("add_comment", () => {
  it("returns comment_added event from empty state", () => {
    const events = decide(
      {
        type: "add_comment",
        commentId: "c1",
        entityPath: "/path/entity.md",
        selectedText: "some text",
        sectionHeading: "## Directive",
        content: "First comment",
        author: "captain",
      },
      new Map(),
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("comment_added");
    if (events[0].type === "comment_added") {
      expect(events[0].commentId).toBe("c1");
      expect(events[0].parentId).toBeNull();
      expect(events[0].createdAt).toBe(NOW);
      expect(events[0].author).toBe("captain");
    }
  });

  it("throws DuplicateCommentId when commentId already exists", () => {
    const state = makeState([{ commentId: "c1" }]);
    expect(() =>
      decide(
        {
          type: "add_comment",
          commentId: "c1",
          entityPath: "/path/entity.md",
          selectedText: "",
          sectionHeading: "## Directive",
          content: "Duplicate",
          author: "fo",
        },
        state,
        NOW,
      ),
    ).toThrow(DuplicateCommentId);
  });

  it("stores guest author correctly", () => {
    const events = decide(
      {
        type: "add_comment",
        commentId: "guest-c1",
        entityPath: "/path/entity.md",
        selectedText: "",
        sectionHeading: "## Plan",
        content: "Guest comment",
        author: "guest",
      },
      new Map(),
      NOW,
    );
    expect(events[0].type).toBe("comment_added");
    if (events[0].type === "comment_added") {
      expect(events[0].author).toBe("guest");
    }
  });
});

describe("reply_to_comment", () => {
  it("returns reply_added event with parent_id", () => {
    const state = makeState([{ commentId: "c1" }]);
    const events = decide(
      {
        type: "reply_to_comment",
        commentId: "c2",
        parentCommentId: "c1",
        entityPath: "/path/entity.md",
        selectedText: "",
        sectionHeading: "## Directive",
        content: "A reply",
        author: "fo",
      },
      state,
      NOW,
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("reply_added");
    if (events[0].type === "reply_added") {
      expect(events[0].parentCommentId).toBe("c1");
      expect(events[0].commentId).toBe("c2");
    }
  });

  it("throws ParentCommentNotFound when parent does not exist", () => {
    expect(() =>
      decide(
        {
          type: "reply_to_comment",
          commentId: "c2",
          parentCommentId: "nonexistent",
          entityPath: "/path/entity.md",
          selectedText: "",
          sectionHeading: "## Directive",
          content: "Reply to ghost",
          author: "captain",
        },
        new Map(),
        NOW,
      ),
    ).toThrow(ParentCommentNotFound);
  });

  it("throws CommentAlreadyResolved when parent is resolved", () => {
    const state = makeState([{ commentId: "c1", resolved: true, resolvedReason: "manual" }]);
    expect(() =>
      decide(
        {
          type: "reply_to_comment",
          commentId: "c2",
          parentCommentId: "c1",
          entityPath: "/path/entity.md",
          selectedText: "",
          sectionHeading: "## Directive",
          content: "Reply to resolved",
          author: "captain",
        },
        state,
        NOW,
      ),
    ).toThrow(CommentAlreadyResolved);
  });

  it("throws ParentCommentNotFound when parent is itself a reply (no nested replies)", () => {
    const state = makeState([
      { commentId: "c1", parentId: null },
      { commentId: "c2", parentId: "c1" },
    ]);
    expect(() =>
      decide(
        {
          type: "reply_to_comment",
          commentId: "c3",
          parentCommentId: "c2",
          entityPath: "/path/entity.md",
          selectedText: "",
          sectionHeading: "## Directive",
          content: "Nested reply attempt",
          author: "captain",
        },
        state,
        NOW,
      ),
    ).toThrow(ParentCommentNotFound);
  });

  it("throws DuplicateCommentId when reply commentId already exists", () => {
    const state = makeState([{ commentId: "c1" }, { commentId: "c2" }]);
    expect(() =>
      decide(
        {
          type: "reply_to_comment",
          commentId: "c2",
          parentCommentId: "c1",
          entityPath: "/path/entity.md",
          selectedText: "",
          sectionHeading: "## Directive",
          content: "Duplicate reply ID",
          author: "fo",
        },
        state,
        NOW,
      ),
    ).toThrow(DuplicateCommentId);
  });
});

describe("resolve_comment", () => {
  it("returns comment_resolved event with reason=manual", () => {
    const state = makeState([{ commentId: "c1" }]);
    const events = decide({ type: "resolve_comment", commentId: "c1" }, state, NOW);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("comment_resolved");
    if (events[0].type === "comment_resolved") {
      expect(events[0].commentId).toBe("c1");
      expect(events[0].resolvedReason).toBe("manual");
      expect(events[0].resolvedAt).toBe(NOW);
    }
  });

  it("throws CommentNotFound when comment does not exist", () => {
    expect(() => decide({ type: "resolve_comment", commentId: "ghost" }, new Map(), NOW)).toThrow(
      CommentNotFound,
    );
  });

  it("throws CommentAlreadyResolved when comment is already resolved", () => {
    const state = makeState([{ commentId: "c1", resolved: true, resolvedReason: "manual" }]);
    expect(() => decide({ type: "resolve_comment", commentId: "c1" }, state, NOW)).toThrow(
      CommentAlreadyResolved,
    );
  });
});

describe("resolve_by_stage_advance", () => {
  it("bulk resolves all comments at matching sectionHeading", () => {
    const state = makeState([
      { commentId: "c1", sectionHeading: "## Explore", entityPath: "/e.md" },
      { commentId: "c2", sectionHeading: "## Explore", entityPath: "/e.md" },
      { commentId: "c3", sectionHeading: "## Plan", entityPath: "/e.md" },
    ]);
    const events = decide(
      {
        type: "resolve_by_stage_advance",
        entityPath: "/e.md",
        sectionHeading: "## Explore",
      },
      state,
      NOW,
    );
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.type).toBe("comment_resolved");
      if (e.type === "comment_resolved") {
        expect(e.resolvedReason).toBe("stage_advanced");
      }
    }
    const resolvedIds = events.map((e) => (e.type === "comment_resolved" ? e.commentId : ""));
    expect(resolvedIds).toContain("c1");
    expect(resolvedIds).toContain("c2");
    expect(resolvedIds).not.toContain("c3");
  });

  it("does not resolve already-resolved comments", () => {
    const state = makeState([
      {
        commentId: "c1",
        sectionHeading: "## Explore",
        entityPath: "/e.md",
        resolved: true,
        resolvedReason: "manual",
      },
      { commentId: "c2", sectionHeading: "## Explore", entityPath: "/e.md" },
    ]);
    const events = decide(
      {
        type: "resolve_by_stage_advance",
        entityPath: "/e.md",
        sectionHeading: "## Explore",
      },
      state,
      NOW,
    );
    expect(events).toHaveLength(1);
    if (events[0].type === "comment_resolved") {
      expect(events[0].commentId).toBe("c2");
    }
  });

  it("returns empty array when no comments match", () => {
    const state = makeState([{ commentId: "c1", sectionHeading: "## Plan", entityPath: "/e.md" }]);
    const events = decide(
      {
        type: "resolve_by_stage_advance",
        entityPath: "/e.md",
        sectionHeading: "## Explore",
      },
      state,
      NOW,
    );
    expect(events).toHaveLength(0);
  });

  it("only resolves comments for matching entityPath", () => {
    const state = makeState([
      { commentId: "c1", sectionHeading: "## Explore", entityPath: "/e1.md" },
      { commentId: "c2", sectionHeading: "## Explore", entityPath: "/e2.md" },
    ]);
    const events = decide(
      {
        type: "resolve_by_stage_advance",
        entityPath: "/e1.md",
        sectionHeading: "## Explore",
      },
      state,
      NOW,
    );
    expect(events).toHaveLength(1);
    if (events[0].type === "comment_resolved") {
      expect(events[0].commentId).toBe("c1");
    }
  });
});
