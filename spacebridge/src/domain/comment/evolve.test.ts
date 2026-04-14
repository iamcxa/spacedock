// spacebridge/src/domain/comment/evolve.test.ts
// ABOUTME: Pure unit tests for comment evolve/replay. Zero I/O.

import { describe, it, expect } from "bun:test";
import { evolve, replay } from "./evolve";
import type { CommentEvent, CommentState } from "./types";

const NOW = 1_000_000;

describe("evolve — comment_added", () => {
  it("adds comment to empty state", () => {
    const event: CommentEvent = {
      type: "comment_added",
      commentId: "c1",
      entityPath: "/e.md",
      selectedText: "some text",
      sectionHeading: "## Directive",
      content: "Hello",
      author: "captain",
      parentId: null,
      createdAt: NOW,
    };
    const state = evolve(new Map(), event);
    expect(state.size).toBe(1);
    const snap = state.get("c1")!;
    expect(snap.commentId).toBe("c1");
    expect(snap.parentId).toBeNull();
    expect(snap.resolved).toBe(false);
    expect(snap.author).toBe("captain");
  });

  it("adds second comment without disturbing first", () => {
    const e1: CommentEvent = {
      type: "comment_added",
      commentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "First",
      author: "captain",
      parentId: null,
      createdAt: NOW,
    };
    const e2: CommentEvent = {
      type: "comment_added",
      commentId: "c2",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Plan",
      content: "Second",
      author: "fo",
      parentId: null,
      createdAt: NOW + 1,
    };
    const state = evolve(evolve(new Map(), e1), e2);
    expect(state.size).toBe(2);
    expect(state.get("c1")!.sectionHeading).toBe("## Directive");
    expect(state.get("c2")!.sectionHeading).toBe("## Plan");
  });
});

describe("evolve — reply_added", () => {
  it("adds reply with parentId set", () => {
    const addEvent: CommentEvent = {
      type: "comment_added",
      commentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Parent",
      author: "captain",
      parentId: null,
      createdAt: NOW,
    };
    const replyEvent: CommentEvent = {
      type: "reply_added",
      commentId: "c2",
      parentCommentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Reply",
      author: "fo",
      createdAt: NOW + 100,
    };
    const state = evolve(evolve(new Map(), addEvent), replyEvent);
    expect(state.size).toBe(2);
    const reply = state.get("c2")!;
    expect(reply.parentId).toBe("c1");
    expect(reply.resolved).toBe(false);
  });
});

describe("evolve — comment_resolved", () => {
  it("marks comment as resolved with reason", () => {
    const addEvent: CommentEvent = {
      type: "comment_added",
      commentId: "c1",
      entityPath: "/e.md",
      selectedText: "",
      sectionHeading: "## Directive",
      content: "Some comment",
      author: "captain",
      parentId: null,
      createdAt: NOW,
    };
    const resolveEvent: CommentEvent = {
      type: "comment_resolved",
      commentId: "c1",
      resolvedReason: "manual",
      resolvedAt: NOW + 500,
    };
    const state = evolve(evolve(new Map(), addEvent), resolveEvent);
    const snap = state.get("c1")!;
    expect(snap.resolved).toBe(true);
    expect(snap.resolvedReason).toBe("manual");
  });

  it("no-op when commentId not in state", () => {
    const resolveEvent: CommentEvent = {
      type: "comment_resolved",
      commentId: "ghost",
      resolvedReason: "manual",
      resolvedAt: NOW,
    };
    const state = evolve(new Map(), resolveEvent);
    expect(state.size).toBe(0);
  });
});

describe("replay", () => {
  it("replays 10 events and produces correct state", () => {
    const events: CommentEvent[] = [];
    for (let i = 1; i <= 5; i++) {
      events.push({
        type: "comment_added",
        commentId: `c${i}`,
        entityPath: "/e.md",
        selectedText: "",
        sectionHeading: "## Directive",
        content: `Comment ${i}`,
        author: "captain",
        parentId: null,
        createdAt: NOW + i,
      });
    }
    for (let i = 6; i <= 10; i++) {
      events.push({
        type: "reply_added",
        commentId: `c${i}`,
        parentCommentId: `c${i - 5}`,
        entityPath: "/e.md",
        selectedText: "",
        sectionHeading: "## Directive",
        content: `Reply ${i}`,
        author: "fo",
        createdAt: NOW + i,
      });
    }
    const state = replay(events);
    expect(state.size).toBe(10);
    // c6 is reply to c1
    expect(state.get("c6")!.parentId).toBe("c1");
    // reduce should produce same result
    const manualReduce = events.reduce(evolve, new Map());
    expect(manualReduce.size).toBe(state.size);
  });

  it("add + reply + resolve sequence produces correct state", () => {
    const events: CommentEvent[] = [
      {
        type: "comment_added",
        commentId: "c1",
        entityPath: "/e.md",
        selectedText: "",
        sectionHeading: "## Explore",
        content: "Comment",
        author: "captain",
        parentId: null,
        createdAt: NOW,
      },
      {
        type: "reply_added",
        commentId: "c2",
        parentCommentId: "c1",
        entityPath: "/e.md",
        selectedText: "",
        sectionHeading: "## Explore",
        content: "Reply",
        author: "fo",
        createdAt: NOW + 1,
      },
      {
        type: "comment_resolved",
        commentId: "c1",
        resolvedReason: "stage_advanced",
        resolvedAt: NOW + 2,
      },
    ];
    const state = replay(events);
    expect(state.get("c1")!.resolved).toBe(true);
    expect(state.get("c1")!.resolvedReason).toBe("stage_advanced");
    expect(state.get("c2")!.resolved).toBe(false);
  });
});
