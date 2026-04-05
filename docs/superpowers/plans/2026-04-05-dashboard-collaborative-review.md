# Dashboard Collaborative Review — Inline Comments & Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Docs-style inline comments and suggestion mode to the entity detail view, enabling the captain to select text, comment, and accept/reject AI-suggested edits that write back to entity files.

**Architecture:** Comments are stored in JSON sidecar files (`{slug}.comments.json`) alongside entity `.md` files — persistent, no database, readable by FO agents. The frontend uses native `window.getSelection()` for text selection, a floating tooltip for "Add comment", and a sidebar panel for comment threads. Suggestions from FO arrive as structured JSON via the existing channel protocol (`meta.type="comment"` / `meta.type="suggestion"`). Accepted suggestions write back to the entity file body via `splitFrontmatter()` + `string.replace()`, preserving YAML frontmatter. Concurrent edit protection uses re-read + string match, returning 409 Conflict if the file changed.

**Tech Stack:** Bun (runtime + test runner), TypeScript (backend), vanilla JS (frontend), marked.js + DOMPurify (markdown rendering), native Selection API (text selection), JSON files (comment persistence)

**Research corrections incorporated:**
1. Tooltip positioning uses `range.getClientRects()` (last rect) instead of `getBoundingClientRect()` for accurate multi-line selection positioning
2. Suggestion write-back restricted to simple text runs — `getSelection().toString()` strips markdown syntax, so suggestions only apply to plain text selections (not bold/code/links)
3. Sidebar comments panel uses `max-height` + `overflow-y: auto` for long threads in the 320px sidebar
4. File race conditions acceptable — single-threaded Bun event loop serializes requests; external writes handled by 409 Conflict

---

## File Structure

### Backend — New files

| File | Responsibility |
|------|---------------|
| `tools/dashboard/src/comments.ts` | Comment/suggestion persistence layer: CRUD operations on JSON sidecar files, `applyBodyEdit()` for suggestion write-back |
| `tools/dashboard/src/comments.test.ts` | Unit tests for comment CRUD, suggestion write-back, concurrent edit detection |

### Backend — Modified files

| File | Changes |
|------|---------|
| `tools/dashboard/src/types.ts` | Add `Comment`, `Suggestion`, `CommentThread` interfaces; extend `AgentEventType` with `"comment"` and `"suggestion"` |
| `tools/dashboard/src/server.ts` | Add 4 routes: `GET /api/entity/comments`, `POST /api/entity/comment`, `POST /api/entity/comment/resolve`, `POST /api/entity/suggestion/accept` |
| `tools/dashboard/src/channel.ts` | No changes needed — `meta` is already `Record<string, string>` and forwards verbatim |

### Frontend — Modified files

| File | Changes |
|------|---------|
| `tools/dashboard/static/detail.html` | Add `#comments-panel` section in sidebar, add comment tooltip scaffold |
| `tools/dashboard/static/detail.css` | Add styles for comment tooltip, comment cards, suggestion diff highlights (ins/del), comments panel |
| `tools/dashboard/static/detail.js` | Add text selection listener, comment tooltip, comment rendering, suggestion diff rendering, accept/reject handlers, comments panel management |
| `tools/dashboard/static/activity.js` | Extend `renderChannelResponse()` to detect JSON-structured suggestion replies and route to detail page |

---

## Task 1: Add Comment and Suggestion Types

**Files:**
- Modify: `tools/dashboard/src/types.ts:73-108`

- [ ] **Step 1: Add Comment and Suggestion interfaces to types.ts**

Add the following types after the existing `PermissionVerdict` interface (after line 108):

```typescript
// --- Collaborative Review Types ---

export interface Comment {
  id: string;
  entity_path: string;
  selected_text: string;
  section_heading: string;
  content: string;
  author: "captain" | "fo";
  timestamp: string; // ISO 8601
  resolved: boolean;
  thread: CommentReply[];
}

export interface CommentReply {
  content: string;
  author: "captain" | "fo";
  timestamp: string;
}

export interface Suggestion {
  id: string;
  comment_id: string;
  diff_from: string;
  diff_to: string;
  status: "pending" | "accepted" | "rejected";
  timestamp: string;
}

export interface CommentThread {
  comments: Comment[];
  suggestions: Suggestion[];
}
```

Extend the `AgentEventType` union (line 75) to include `"comment"` and `"suggestion"`:

```typescript
export type AgentEventType = "dispatch" | "completion" | "gate" | "feedback" | "merge" | "idle"
  | "channel_message" | "channel_response" | "permission_request" | "permission_response"
  | "comment" | "suggestion";
```

- [ ] **Step 2: Verify types compile**

Run: `cd tools/dashboard && bunx tsc --noEmit src/types.ts 2>&1 || echo "No tsconfig — skip type-check"`

If no tsconfig exists, verify manually: `bun build src/types.ts --outdir /tmp/typecheck 2>&1`

Expected: No errors (types are standalone interfaces with no imports)

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/src/types.ts
git commit -m "feat(review): add Comment, Suggestion, CommentThread types"
```

---

## Task 2: Comment Persistence Layer — Tests First

**Files:**
- Create: `tools/dashboard/src/comments.test.ts`

- [ ] **Step 1: Write test file for comment CRUD and applyBodyEdit**

Create `tools/dashboard/src/comments.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tools/dashboard && bun test src/comments.test.ts 2>&1`

Expected: FAIL — module `./comments` does not exist yet.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/src/comments.test.ts
git commit -m "test(review): add comment CRUD and applyBodyEdit tests (red)"
```

---

## Task 3: Comment Persistence Layer — Implementation

**Files:**
- Create: `tools/dashboard/src/comments.ts`

- [ ] **Step 1: Implement comments.ts**

Create `tools/dashboard/src/comments.ts`:

```typescript
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { splitFrontmatter } from "./frontmatter-io";
import type { Comment, CommentReply, Suggestion, CommentThread } from "./types";

function sidecarPath(entityPath: string): string {
  return entityPath.replace(/\.md$/, ".comments.json");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readSidecar(entityPath: string): CommentThread {
  const path = sidecarPath(entityPath);
  if (!existsSync(path)) {
    return { comments: [], suggestions: [] };
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as CommentThread;
}

function writeSidecar(entityPath: string, thread: CommentThread): void {
  writeFileSync(sidecarPath(entityPath), JSON.stringify(thread, null, 2));
}

export function getComments(entityPath: string): CommentThread {
  return readSidecar(entityPath);
}

export function addComment(
  entityPath: string,
  input: { selected_text: string; section_heading: string; content: string; author?: "captain" | "fo" }
): Comment {
  const thread = readSidecar(entityPath);
  const comment: Comment = {
    id: generateId(),
    entity_path: entityPath,
    selected_text: input.selected_text,
    section_heading: input.section_heading,
    content: input.content,
    author: input.author ?? "captain",
    timestamp: new Date().toISOString(),
    resolved: false,
    thread: [],
  };
  thread.comments.push(comment);
  writeSidecar(entityPath, thread);
  return comment;
}

export function resolveComment(entityPath: string, commentId: string): Comment {
  const thread = readSidecar(entityPath);
  const comment = thread.comments.find((c) => c.id === commentId);
  if (!comment) throw new Error("Comment not found: " + commentId);
  comment.resolved = true;
  writeSidecar(entityPath, thread);
  return comment;
}

export function addSuggestion(
  entityPath: string,
  input: { comment_id: string; diff_from: string; diff_to: string }
): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion: Suggestion = {
    id: generateId(),
    comment_id: input.comment_id,
    diff_from: input.diff_from,
    diff_to: input.diff_to,
    status: "pending",
    timestamp: new Date().toISOString(),
  };
  thread.suggestions.push(suggestion);
  writeSidecar(entityPath, thread);
  return suggestion;
}

export function applyBodyEdit(fileText: string, diffFrom: string, diffTo: string): string {
  const [fm, body] = splitFrontmatter(fileText);
  if (!body.includes(diffFrom)) {
    throw new Error("Text not found in entity body: diff_from text not found");
  }
  const newBody = body.replace(diffFrom, diffTo);
  // Reconstruct file: frontmatter + body
  const fmLines = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    fmLines.push(`${key}: ${value}`);
  }
  fmLines.push("---");
  return fmLines.join("\n") + newBody;
}

export function acceptSuggestion(entityPath: string, suggestionId: string): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion = thread.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found: " + suggestionId);

  // Re-read entity file (concurrent edit protection)
  const fileText = readFileSync(entityPath, "utf-8");
  const updated = applyBodyEdit(fileText, suggestion.diff_from, suggestion.diff_to);
  writeFileSync(entityPath, updated);

  suggestion.status = "accepted";
  writeSidecar(entityPath, thread);
  return suggestion;
}

export function rejectSuggestion(entityPath: string, suggestionId: string): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion = thread.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found: " + suggestionId);
  suggestion.status = "rejected";
  writeSidecar(entityPath, thread);
  return suggestion;
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test src/comments.test.ts 2>&1`

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/src/comments.ts
git commit -m "feat(review): implement comment persistence layer (green)"
```

---

## Task 4: Backend API Routes

**Files:**
- Modify: `tools/dashboard/src/server.ts:1-7` (imports) and after line 153 (new routes)

- [ ] **Step 1: Add imports to server.ts**

Add `getComments`, `addComment`, `resolveComment`, `acceptSuggestion` imports at line 5:

```typescript
import {
  getComments,
  addComment,
  resolveComment,
  acceptSuggestion as acceptSuggestionAction,
} from "./comments";
```

Note: alias to `acceptSuggestionAction` to avoid collision if needed; the name is clear in context.

- [ ] **Step 2: Add GET /api/entity/comments route**

Insert after the `/api/entity/tags` route block (after line 153), inside the `routes:` object:

```typescript
      "/api/entity/comments": {
        GET: (req) => {
          const url = new URL(req.url);
          const filepath = url.searchParams.get("path");
          if (!filepath) {
            logRequest(req, 400);
            return jsonResponse({ error: "path required" }, 400);
          }
          if (!validatePath(filepath, projectRoot)) {
            logRequest(req, 403);
            return jsonResponse({ error: "Forbidden" }, 403);
          }
          try {
            const thread = getComments(filepath);
            logRequest(req, 200);
            return jsonResponse(thread);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 3: Add POST /api/entity/comment route**

```typescript
      "/api/entity/comment": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              path: string;
              selected_text: string;
              section_heading: string;
              content: string;
            };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const comment = addComment(body.path, {
              selected_text: body.selected_text,
              section_heading: body.section_heading,
              content: body.content,
            });
            logRequest(req, 200);
            return jsonResponse(comment);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 4: Add POST /api/entity/comment/resolve route**

```typescript
      "/api/entity/comment/resolve": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; comment_id: string };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const comment = resolveComment(body.path, body.comment_id);
            logRequest(req, 200);
            return jsonResponse(comment);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 5: Add POST /api/entity/suggestion/accept route**

```typescript
      "/api/entity/suggestion/accept": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; suggestion_id: string };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const suggestion = acceptSuggestionAction(body.path, body.suggestion_id);
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            if (err instanceof Error && err.message.includes("not found")) {
              logRequest(req, 409);
              return jsonResponse({ error: "Conflict: " + err.message }, 409);
            }
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 6: Verify server compiles**

Run: `cd tools/dashboard && bun build src/server.ts --outdir /tmp/server-check 2>&1`

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/src/server.ts
git commit -m "feat(review): add comment/suggestion API routes"
```

---

## Task 5: Frontend — Comments Panel HTML + CSS

**Files:**
- Modify: `tools/dashboard/static/detail.html:27-54` (sidebar)
- Modify: `tools/dashboard/static/detail.css` (append new styles)

- [ ] **Step 1: Add comments panel and tooltip scaffold to detail.html**

In `detail.html`, insert a new `#comments-panel` section inside the `<aside class="detail-sidebar">` element, before the closing `</aside>` tag (after line 53):

```html
            <section class="comments-panel" id="comments-panel">
                <h3>Comments</h3>
                <div id="comment-threads" class="comment-threads">
                    <div class="empty-state">Select text to add a comment</div>
                </div>
            </section>
```

Also add the floating tooltip just before `</body>` (before the script tags, after line 55):

```html
    <div id="comment-tooltip" class="comment-tooltip" style="display:none;">
        <textarea id="comment-input" class="comment-textarea" placeholder="Add a comment..." rows="2"></textarea>
        <div class="tooltip-actions">
            <button id="comment-submit" class="btn btn-small">Comment</button>
            <button id="comment-cancel" class="btn btn-small btn-secondary">Cancel</button>
        </div>
    </div>
```

- [ ] **Step 2: Add CSS styles for comments panel, tooltip, and suggestion diffs**

Append the following to the end of `detail.css`:

```css
/* --- Collaborative Review: Comments Panel --- */

.comments-panel {
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    max-height: 60vh;
    overflow-y: auto;
}

.comments-panel h3 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b949e;
    margin-bottom: 0.75rem;
}

.comment-threads {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.comment-threads .empty-state {
    color: #8b949e;
    font-size: 0.85rem;
    font-style: italic;
}

.comment-card {
    border: 1px solid #21262d;
    border-radius: 6px;
    padding: 0.75rem;
    background: #0d1117;
    cursor: pointer;
}

.comment-card:hover {
    border-color: #58a6ff;
}

.comment-card.resolved {
    opacity: 0.5;
}

.comment-selected-text {
    font-size: 0.8rem;
    color: #8b949e;
    border-left: 2px solid #58a6ff;
    padding-left: 0.5rem;
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.comment-content {
    font-size: 0.85rem;
    color: #c9d1d9;
    margin-bottom: 0.4rem;
}

.comment-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: #8b949e;
}

.comment-resolve-btn {
    background: none;
    border: 1px solid #21262d;
    color: #8b949e;
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
}

.comment-resolve-btn:hover {
    border-color: #3fb950;
    color: #3fb950;
}

/* --- Comment Tooltip (floating) --- */

.comment-tooltip {
    position: fixed;
    z-index: 1000;
    background: #161b22;
    border: 1px solid #58a6ff;
    border-radius: 8px;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    width: 280px;
}

.comment-textarea {
    width: 100%;
    background: #0d1117;
    border: 1px solid #21262d;
    border-radius: 4px;
    color: #c9d1d9;
    font-size: 0.85rem;
    padding: 0.5rem;
    resize: none;
    font-family: inherit;
}

.comment-textarea::placeholder { color: #8b949e; }

.tooltip-actions {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.5rem;
    justify-content: flex-end;
}

/* --- Suggestion Diff Highlights --- */

.suggestion-card {
    border: 1px solid #f0883e;
    border-radius: 6px;
    padding: 0.75rem;
    background: #0d1117;
    margin-top: 0.5rem;
}

.suggestion-diff {
    font-size: 0.85rem;
    font-family: monospace;
    line-height: 1.6;
    margin-bottom: 0.5rem;
}

.diff-del {
    background: rgba(248, 81, 73, 0.15);
    color: #f85149;
    text-decoration: line-through;
}

.diff-ins {
    background: rgba(63, 185, 80, 0.15);
    color: #3fb950;
}

.suggestion-actions {
    display: flex;
    gap: 0.4rem;
}

.suggestion-actions .btn-accept {
    background: #238636;
    color: #fff;
}

.suggestion-actions .btn-accept:hover {
    background: #2ea043;
}

.suggestion-actions .btn-reject {
    background: #21262d;
    color: #f85149;
}

.suggestion-actions .btn-reject:hover {
    background: #30363d;
}

/* --- Selection highlight in entity body --- */

.entity-body .comment-highlight {
    background: rgba(88, 166, 255, 0.15);
    border-bottom: 2px solid #58a6ff;
    cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add tools/dashboard/static/detail.html tools/dashboard/static/detail.css
git commit -m "feat(review): add comments panel HTML + CSS scaffolding"
```

---

## Task 6: Frontend — Text Selection and Comment Creation

**Files:**
- Modify: `tools/dashboard/static/detail.js` (append new functions)

- [ ] **Step 1: Add text selection listener, tooltip logic, and comment API calls**

Append the following to the end of `detail.js` (after `loadEntity();` on line 239):

```javascript
// --- Collaborative Review: Text Selection + Comment System ---

var commentTooltip = document.getElementById('comment-tooltip');
var commentInput = document.getElementById('comment-input');
var commentSubmitBtn = document.getElementById('comment-submit');
var commentCancelBtn = document.getElementById('comment-cancel');
var commentThreadsContainer = document.getElementById('comment-threads');

var pendingSelection = null; // { text, sectionHeading, rect }

// --- Text Selection Listener ---

function getSelectionContext(range) {
    // Walk up from range start to find nearest preceding h2/h3
    var node = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    // Walk backwards through siblings and up through parents
    var heading = '';
    var current = node;
    while (current && current.id !== 'entity-body') {
        // Check previous siblings for headings
        var sibling = current.previousElementSibling;
        while (sibling) {
            var tag = sibling.tagName;
            if (tag === 'H2' || tag === 'H3' || tag === 'H1') {
                heading = sibling.textContent || '';
                break;
            }
            sibling = sibling.previousElementSibling;
        }
        if (heading) break;
        current = current.parentNode;
    }
    return '## ' + heading;
}

document.getElementById('entity-body').addEventListener('mouseup', function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    var selectedText = sel.toString().trim();
    if (!selectedText) return;

    var range = sel.getRangeAt(0);
    // Research correction #1: use getClientRects() for accurate multi-line positioning
    var rects = range.getClientRects();
    var rect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

    var sectionHeading = getSelectionContext(range);

    pendingSelection = {
        text: selectedText,
        sectionHeading: sectionHeading,
    };

    showCommentTooltip(rect);
});

function showCommentTooltip(rect) {
    commentInput.value = '';
    commentTooltip.style.display = '';
    commentTooltip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    commentTooltip.style.left = Math.max(8, rect.left + window.scrollX) + 'px';
    commentInput.focus();
}

function hideCommentTooltip() {
    commentTooltip.style.display = 'none';
    pendingSelection = null;
    window.getSelection().removeAllRanges();
}

// --- Comment Submission ---

function submitComment() {
    if (!pendingSelection || !entityPath) return;
    var content = commentInput.value.trim();
    if (!content) return;

    apiFetch('/api/entity/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: entityPath,
            selected_text: pendingSelection.text,
            section_heading: pendingSelection.sectionHeading,
            content: content,
        }),
    }).then(function (comment) {
        hideCommentTooltip();
        loadComments();
        // Send comment to FO via channel
        sendCommentToChannel(comment);
    });
}

function sendCommentToChannel(comment) {
    fetch('/api/channel/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: comment.content,
            meta: {
                type: 'comment',
                entity_path: comment.entity_path,
                section_heading: comment.section_heading,
                selected_text: comment.selected_text,
                comment_id: comment.id,
            },
        }),
    });
}

commentSubmitBtn.addEventListener('click', submitComment);
commentCancelBtn.addEventListener('click', hideCommentTooltip);
commentInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        submitComment();
    }
    if (e.key === 'Escape') {
        hideCommentTooltip();
    }
});

// Close tooltip when clicking outside
document.addEventListener('mousedown', function (e) {
    if (commentTooltip.style.display !== 'none' && !commentTooltip.contains(e.target)) {
        hideCommentTooltip();
    }
});

// --- Comment Rendering in Sidebar ---

function loadComments() {
    if (!entityPath) return;
    apiFetch('/api/entity/comments?path=' + encodeURIComponent(entityPath))
        .then(function (thread) {
            renderComments(thread);
        });
}

function renderComments(thread) {
    while (commentThreadsContainer.firstChild) commentThreadsContainer.removeChild(commentThreadsContainer.firstChild);

    if (thread.comments.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Select text to add a comment';
        commentThreadsContainer.appendChild(empty);
        return;
    }

    // Show unresolved comments first, then resolved
    var sorted = thread.comments.slice().sort(function (a, b) {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    sorted.forEach(function (comment) {
        var card = document.createElement('div');
        card.className = 'comment-card' + (comment.resolved ? ' resolved' : '');

        var selectedText = document.createElement('div');
        selectedText.className = 'comment-selected-text';
        selectedText.textContent = '"' + comment.selected_text + '"';
        card.appendChild(selectedText);

        var content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content;
        card.appendChild(content);

        var meta = document.createElement('div');
        meta.className = 'comment-meta';

        var author = document.createElement('span');
        author.textContent = comment.author + ' \u2022 ' + comment.section_heading.replace('## ', '');
        meta.appendChild(author);

        if (!comment.resolved) {
            var resolveBtn = document.createElement('button');
            resolveBtn.className = 'comment-resolve-btn';
            resolveBtn.textContent = 'Resolve';
            resolveBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                resolveCommentAction(comment.id);
            });
            meta.appendChild(resolveBtn);
        }

        card.appendChild(meta);

        // Render suggestions linked to this comment
        var linkedSuggestions = (thread.suggestions || []).filter(function (s) {
            return s.comment_id === comment.id;
        });
        linkedSuggestions.forEach(function (suggestion) {
            card.appendChild(renderSuggestionCard(suggestion));
        });

        commentThreadsContainer.appendChild(card);
    });
}

function renderSuggestionCard(suggestion) {
    var card = document.createElement('div');
    card.className = 'suggestion-card';

    var diff = document.createElement('div');
    diff.className = 'suggestion-diff';

    var del = document.createElement('span');
    del.className = 'diff-del';
    del.textContent = suggestion.diff_from;
    diff.appendChild(del);

    diff.appendChild(document.createTextNode(' \u2192 '));

    var ins = document.createElement('span');
    ins.className = 'diff-ins';
    ins.textContent = suggestion.diff_to;
    diff.appendChild(ins);

    card.appendChild(diff);

    if (suggestion.status === 'pending') {
        var actions = document.createElement('div');
        actions.className = 'suggestion-actions';

        var acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn btn-small btn-accept';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', function () {
            acceptSuggestionAction(suggestion.id);
        });
        actions.appendChild(acceptBtn);

        var rejectBtn = document.createElement('button');
        rejectBtn.className = 'btn btn-small btn-reject';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', function () {
            rejectSuggestionAction(suggestion.id);
        });
        actions.appendChild(rejectBtn);

        card.appendChild(actions);
    } else {
        var status = document.createElement('div');
        status.className = 'comment-meta';
        status.textContent = suggestion.status === 'accepted' ? '\u2713 Accepted' : '\u2717 Rejected';
        card.appendChild(status);
    }

    return card;
}

// --- Comment/Suggestion Actions ---

function resolveCommentAction(commentId) {
    apiFetch('/api/entity/comment/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, comment_id: commentId }),
    }).then(function () {
        loadComments();
    });
}

function acceptSuggestionAction(suggestionId) {
    apiFetch('/api/entity/suggestion/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, suggestion_id: suggestionId }),
    }).then(function () {
        loadComments();
        loadEntity(); // Re-render body with accepted changes
    }).catch(function (err) {
        if (err.message && err.message.indexOf('409') !== -1) {
            alert('Conflict: The entity file was modified. Please reload and try again.');
            loadEntity();
            loadComments();
        }
    });
}

function rejectSuggestionAction(suggestionId) {
    // Reject is POST to accept endpoint with reject — but we need a reject endpoint
    // Use the accept endpoint pattern: POST /api/entity/suggestion/accept with a reject flag
    // Actually, for simplicity, add reject as a separate client-side call
    // For now, resolve the comment to dismiss the suggestion
    // TODO: Add a proper reject endpoint if needed
    apiFetch('/api/entity/comment/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, comment_id: findCommentForSuggestion(suggestionId) }),
    }).then(function () {
        loadComments();
    });
}

// Load comments on initial entity load
var _originalLoadEntity = loadEntity;
loadEntity = function () {
    _originalLoadEntity();
    // Delay slightly so entity loads first
    setTimeout(loadComments, 100);
};

// Re-trigger initial load with comments
loadEntity();
```

**Wait** — the `rejectSuggestionAction` above has a problem: it needs a proper reject endpoint, and `findCommentForSuggestion` doesn't exist. Let me fix this properly.

- [ ] **Step 2: Add POST /api/entity/suggestion/reject route to server.ts**

Add after the suggestion/accept route in `server.ts`:

```typescript
      "/api/entity/suggestion/reject": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; suggestion_id: string };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const { rejectSuggestion } = await import("./comments");
            const suggestion = rejectSuggestion(body.path, body.suggestion_id);
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

Also add `rejectSuggestion` to the imports at the top of `server.ts`:

```typescript
import {
  getComments,
  addComment,
  resolveComment,
  acceptSuggestion as acceptSuggestionAction,
  rejectSuggestion as rejectSuggestionAction,
} from "./comments";
```

And use the aliased import in the route instead of dynamic import:

```typescript
      "/api/entity/suggestion/reject": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; suggestion_id: string };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const suggestion = rejectSuggestionAction(body.path, body.suggestion_id);
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 3: Fix rejectSuggestionAction in detail.js**

Replace the `rejectSuggestionAction` function in detail.js with:

```javascript
function rejectSuggestionAction(suggestionId) {
    apiFetch('/api/entity/suggestion/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: entityPath, suggestion_id: suggestionId }),
    }).then(function () {
        loadComments();
    });
}
```

- [ ] **Step 4: Fix the loadEntity override to avoid double initial load**

Replace the `loadEntity` override block at the bottom of detail.js with:

```javascript
// Override loadEntity to also load comments after entity data loads
var _originalLoadEntity = loadEntity;
loadEntity = function () {
    if (!entityPath) return;
    apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function (data) {
            document.getElementById('entity-title').textContent = data.frontmatter.title || '(untitled)';
            document.title = (data.frontmatter.title || 'Entity') + ' \u2014 Spacedock';
            renderMetadata(data.frontmatter);
            renderBody(data.body);
            renderStageReports(data.stage_reports);
            renderTags(data.tags);
            initScore(data.frontmatter.score || '0');
            loadComments();
        });
};

// Re-trigger with comments support
loadEntity();
```

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/detail.js tools/dashboard/src/server.ts
git commit -m "feat(review): add text selection, comment UI, and suggestion accept/reject"
```

---

## Task 7: Frontend — Channel Integration for Suggestions

**Files:**
- Modify: `tools/dashboard/static/activity.js:194-228` (renderChannelResponse)

- [ ] **Step 1: Extend renderChannelResponse to detect suggestion JSON**

Replace the `renderChannelResponse` function in `activity.js` (lines 194-228) with a version that detects JSON-structured suggestion replies from FO:

```javascript
  function renderChannelResponse(entry) {
    if (!feedContainer) return;
    removeEmptyState();

    var text = entry.event.detail || "";

    // Check if FO response is a structured suggestion
    var suggestion = null;
    try {
      var parsed = JSON.parse(text);
      if (parsed && parsed.type === "suggestion" && parsed.comment_id) {
        suggestion = parsed;
      }
    } catch (e) {
      // Not JSON — render as normal chat bubble
    }

    if (suggestion) {
      renderSuggestionBubble(entry, suggestion);
      // Also store the suggestion via API so it appears in the comments panel
      storeSuggestionFromChannel(suggestion);
      return;
    }

    var isLong = text.length > 100;

    var bubble = document.createElement("div");
    bubble.className = "chat-bubble fo" + (isLong ? " truncated" : "");

    var content = document.createElement("div");
    content.className = "bubble-content";
    content.textContent = text;
    bubble.appendChild(content);

    if (isLong) {
      var toggle = document.createElement("span");
      toggle.className = "show-more";
      toggle.textContent = "Show more \u2193";
      toggle.addEventListener("click", function () {
        var isTruncated = bubble.classList.contains("truncated");
        bubble.classList.toggle("truncated");
        toggle.textContent = isTruncated ? "Show less \u2191" : "Show more \u2193";
      });
      bubble.appendChild(toggle);
    }

    var time = document.createElement("span");
    time.className = "bubble-time";
    time.textContent = timeAgo(entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.insertBefore(bubble, feedContainer.firstChild);
    capFeedItems();
  }

  function renderSuggestionBubble(entry, suggestion) {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble fo suggestion-bubble";

    var header = document.createElement("div");
    header.className = "bubble-content";
    header.textContent = "Suggested edit:";
    bubble.appendChild(header);

    var diff = document.createElement("div");
    diff.style.fontFamily = "monospace";
    diff.style.fontSize = "0.85rem";
    diff.style.margin = "0.5rem 0";

    var del = document.createElement("span");
    del.style.background = "rgba(248, 81, 73, 0.15)";
    del.style.color = "#f85149";
    del.style.textDecoration = "line-through";
    del.textContent = suggestion.diff_from;
    diff.appendChild(del);

    diff.appendChild(document.createTextNode(" \u2192 "));

    var ins = document.createElement("span");
    ins.style.background = "rgba(63, 185, 80, 0.15)";
    ins.style.color = "#3fb950";
    ins.textContent = suggestion.diff_to;
    diff.appendChild(ins);

    bubble.appendChild(diff);

    var time = document.createElement("span");
    time.className = "bubble-time";
    time.textContent = timeAgo(entry.event.timestamp);
    bubble.appendChild(time);

    feedContainer.insertBefore(bubble, feedContainer.firstChild);
    capFeedItems();
  }

  function storeSuggestionFromChannel(suggestion) {
    // Get entity path from URL params (detail page) or skip on dashboard page
    var params = new URLSearchParams(window.location.search);
    var entityPath = params.get("path");
    if (!entityPath) return;

    fetch("/api/entity/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: entityPath,
        selected_text: suggestion.diff_from,
        section_heading: "",
        content: "AI suggested edit",
      }),
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        // Trigger comment reload if on detail page
        if (typeof loadComments === "function") loadComments();
      })
      .catch(function () { /* Best effort */ });
  }
```

- [ ] **Step 2: Commit**

```bash
git add tools/dashboard/static/activity.js
git commit -m "feat(review): detect suggestion JSON in channel responses"
```

---

## Task 8: Integration Verification

**Files:** No new files — verification only.

- [ ] **Step 1: Run all tests**

Run: `cd tools/dashboard && bun test 2>&1`

Expected: All tests pass (both `discovery.test.ts` and `comments.test.ts`).

- [ ] **Step 2: Verify server starts without errors**

Run: `cd tools/dashboard && timeout 3 bun run src/server.ts --port 18420 --root /tmp 2>&1 || true`

Expected: Server starts successfully, prints banner message. Times out after 3 seconds (that's fine — it means it started).

- [ ] **Step 3: Verify all modified files have no syntax errors**

Run:
```bash
cd tools/dashboard
bun build src/server.ts --outdir /tmp/build-check 2>&1
bun build src/comments.ts --outdir /tmp/build-check 2>&1
```

Expected: Both build without errors.

- [ ] **Step 4: Commit any remaining changes**

If tests required fixes, commit them:
```bash
git add -A tools/dashboard/
git commit -m "fix(review): integration fixes from verification"
```

---

## Quality Gate Checklist

- [ ] `bun test` passes — all comment CRUD tests and existing discovery tests
- [ ] `bun build src/server.ts` compiles without errors
- [ ] Types are consistent across all files (Comment, Suggestion, CommentThread used identically)
- [ ] No regressions in existing functionality (entity detail, score, tags, channel messaging)
- [ ] Research correction #1 applied: `getClientRects()` used for tooltip positioning
- [ ] Research correction #2 applied: suggestion write-back operates on body text only (simple text matching)
- [ ] Research correction #3 applied: `max-height: 60vh; overflow-y: auto` on comments panel
- [ ] Research correction #4 acknowledged: single-threaded Bun + 409 Conflict for concurrent edit protection

## Known Limitations

1. **Rendered-vs-source text mismatch**: `getSelection().toString()` strips markdown syntax (`**bold**` becomes `bold`). Suggestion write-back works for plain text selections only. Selections spanning formatted text (bold, code, links) will create comments but suggestions may fail to match on write-back. This is documented as an acceptable trade-off per research recommendation (approach c).

2. **No real-time comment sync**: Comments are loaded via HTTP polling (on each `loadComments()` call), not pushed via WebSocket. A future enhancement could broadcast comment events through the existing WebSocket pub/sub.

3. **Single-user scope**: The 409 Conflict protection is adequate for a single captain + background ensign agents. Multi-user concurrent editing would need optimistic locking (ETags).
