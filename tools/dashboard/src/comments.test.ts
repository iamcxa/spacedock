import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  getComments,
  addComment,
  resolveComment,
  addSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  applyBodyEdit,
} from "./comments";

const TMP = join(import.meta.dir, "__test_comments__");
const ENTITY_PATH = join(TMP, "test-entity.md");
const SIDECAR_PATH = join(TMP, "test-entity.comments.json");

const ENTITY_CONTENT = [
  "---",
  "id: 001",
  "title: Test Entity",
  "status: explore",
  "score: 0.8",
  "---",
  "",
  "## Brainstorming Spec",
  "",
  "This is the first paragraph of the spec.",
  "",
  "This is the second paragraph with more details.",
  "",
  "## Acceptance Criteria",
  "",
  "- Captain can select text",
  "- Comments appear as annotations",
  "",
].join("\n");

beforeAll(() => {
  mkdirSync(TMP, { recursive: true });
});

beforeEach(() => {
  writeFileSync(ENTITY_PATH, ENTITY_CONTENT);
  if (existsSync(SIDECAR_PATH)) rmSync(SIDECAR_PATH);
});

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("getComments", () => {
  test("returns empty thread when no sidecar file exists", () => {
    const thread = getComments(ENTITY_PATH);
    expect(thread.comments).toEqual([]);
    expect(thread.suggestions).toEqual([]);
  });

  test("returns existing comments from sidecar file", () => {
    const comment = {
      id: "c1",
      entity_path: ENTITY_PATH,
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "This needs more detail",
      author: "captain",
      timestamp: "2026-04-05T10:00:00Z",
      resolved: false,
      thread: [],
    };
    writeFileSync(SIDECAR_PATH, JSON.stringify({ comments: [comment], suggestions: [] }));
    const thread = getComments(ENTITY_PATH);
    expect(thread.comments.length).toBe(1);
    expect(thread.comments[0].id).toBe("c1");
  });
});

describe("addComment", () => {
  test("creates sidecar file and adds comment", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Needs more detail",
    });
    expect(comment.id).toBeTruthy();
    expect(comment.author).toBe("captain");
    expect(comment.resolved).toBe(false);
    expect(existsSync(SIDECAR_PATH)).toBe(true);

    const thread = getComments(ENTITY_PATH);
    expect(thread.comments.length).toBe(1);
  });

  test("appends to existing comments", () => {
    addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Comment 1",
    });
    addComment(ENTITY_PATH, {
      selected_text: "second paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Comment 2",
    });
    const thread = getComments(ENTITY_PATH);
    expect(thread.comments.length).toBe(2);
  });
});

describe("resolveComment", () => {
  test("marks comment as resolved", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Needs work",
    });
    resolveComment(ENTITY_PATH, comment.id);
    const thread = getComments(ENTITY_PATH);
    expect(thread.comments[0].resolved).toBe(true);
  });

  test("throws on unknown comment id", () => {
    expect(() => resolveComment(ENTITY_PATH, "nonexistent")).toThrow("Comment not found");
  });
});

describe("addSuggestion", () => {
  test("adds suggestion linked to comment", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Change this",
    });
    const suggestion = addSuggestion(ENTITY_PATH, {
      comment_id: comment.id,
      diff_from: "first paragraph",
      diff_to: "opening paragraph",
    });
    expect(suggestion.id).toBeTruthy();
    expect(suggestion.status).toBe("pending");

    const thread = getComments(ENTITY_PATH);
    expect(thread.suggestions.length).toBe(1);
  });
});

describe("applyBodyEdit", () => {
  test("replaces text in body while preserving frontmatter", () => {
    const result = applyBodyEdit(
      ENTITY_CONTENT,
      "first paragraph of the spec",
      "opening paragraph of the spec"
    );
    expect(result).toContain("opening paragraph of the spec");
    expect(result).toContain("---\nid: 001");
    expect(result).not.toContain("first paragraph of the spec");
  });

  test("only replaces first occurrence", () => {
    const text = [
      "---",
      "id: 001",
      "---",
      "",
      "hello world",
      "",
      "hello world again",
    ].join("\n");
    const result = applyBodyEdit(text, "hello world", "goodbye world");
    expect(result).toContain("goodbye world");
    expect(result).toContain("hello world again");
  });

  test("throws when diff_from not found in body", () => {
    expect(() => applyBodyEdit(ENTITY_CONTENT, "nonexistent text", "replacement")).toThrow(
      "not found"
    );
  });

  test("does not match text inside frontmatter", () => {
    expect(() => applyBodyEdit(ENTITY_CONTENT, "Test Entity", "New Title")).toThrow("not found");
  });
});

describe("acceptSuggestion", () => {
  test("applies suggestion to entity file and marks accepted", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph of the spec",
      section_heading: "## Brainstorming Spec",
      content: "Change this",
    });
    const suggestion = addSuggestion(ENTITY_PATH, {
      comment_id: comment.id,
      diff_from: "first paragraph of the spec",
      diff_to: "opening paragraph of the spec",
    });
    const result = acceptSuggestion(ENTITY_PATH, suggestion.id);
    expect(result.status).toBe("accepted");

    const updatedFile = readFileSync(ENTITY_PATH, "utf-8");
    expect(updatedFile).toContain("opening paragraph of the spec");
    expect(updatedFile).not.toContain("first paragraph of the spec");
    expect(updatedFile).toContain("id: 001"); // frontmatter preserved
  });

  test("returns 409-style error when text no longer matches", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph of the spec",
      section_heading: "## Brainstorming Spec",
      content: "Change this",
    });
    const suggestion = addSuggestion(ENTITY_PATH, {
      comment_id: comment.id,
      diff_from: "first paragraph of the spec",
      diff_to: "opening paragraph",
    });
    // Simulate external edit — overwrite entity file
    writeFileSync(ENTITY_PATH, ENTITY_CONTENT.replace("first paragraph of the spec", "CHANGED"));
    expect(() => acceptSuggestion(ENTITY_PATH, suggestion.id)).toThrow("not found");
  });
});

describe("rejectSuggestion", () => {
  test("marks suggestion as rejected without modifying file", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Change this",
    });
    const suggestion = addSuggestion(ENTITY_PATH, {
      comment_id: comment.id,
      diff_from: "first paragraph",
      diff_to: "opening paragraph",
    });
    const result = rejectSuggestion(ENTITY_PATH, suggestion.id);
    expect(result.status).toBe("rejected");

    const fileContent = readFileSync(ENTITY_PATH, "utf-8");
    expect(fileContent).toContain("first paragraph");
  });
});
