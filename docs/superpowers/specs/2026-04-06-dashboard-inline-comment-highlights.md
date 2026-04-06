# Dashboard Inline Comment Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Notion-style yellow highlights on commented text with click-to-open comment thread popovers, working on both the detail page and share page.

**Architecture:** Backend adds an `addReply()` function and `/api/entity/comment/reply` route (+ share-scoped equivalent). Frontend injects `<mark>` elements into rendered entity body by walking text nodes with TreeWalker, splitting at match boundaries (never using `Range.surroundContents()`). Overlapping highlights are handled by segment splitting -- overlapping ranges decomposed into non-overlapping segments, each `<mark>` carrying multiple `data-comment-id` attributes. Click on highlight opens a positioned popover showing the comment thread. Resolved comments get faded styling.

**Tech Stack:** Bun (server + test runner), vanilla JS (frontend), TypeScript (backend), CSS

---

## Research Corrections (MUST follow)

1. **Do NOT use `Range.surroundContents()`** -- it throws `InvalidStateError` when the selection crosses element boundaries (e.g., `<em>` inside a `<p>`). Instead, use per-text-node `splitText()` + `<mark>` wrapping.
2. **Overlapping highlights need segment splitting** -- when two comments select overlapping text, split the overlap into non-overlapping segments. Each segment gets its own `<mark>` element with `data-comment-ids` listing all comments that cover it.

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `tools/dashboard/src/comments.ts` | Add `addReply()` function |
| Modify | `tools/dashboard/src/comments.test.ts` | Add `addReply` tests |
| Modify | `tools/dashboard/src/server.ts` | Add `POST /api/entity/comment/reply` + share equivalent |
| Modify | `tools/dashboard/static/detail.js` | Add `applyCommentHighlights()`, popover click handler, integrate into `loadEntity` |
| Modify | `tools/dashboard/static/share.js` | Add highlight injection in `showEntityDetail()` |
| Modify | `tools/dashboard/static/detail.css` | Popover CSS, resolved fade, hover glow |

---

### Task 1: Add `addReply()` -- failing test

**Files:**
- Test: `tools/dashboard/src/comments.test.ts`
- Modify: `tools/dashboard/src/comments.ts`

- [ ] **Step 1: Write the failing tests for `addReply`**

Add this test block at the end of `comments.test.ts`, before the final closing:

```typescript
describe("addReply", () => {
  test("appends reply to comment thread array", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Needs work",
    });
    const reply = addReply(ENTITY_PATH, comment.id, {
      content: "Fixed it",
      author: "fo",
    });
    expect(reply.content).toBe("Fixed it");
    expect(reply.author).toBe("fo");
    expect(reply.timestamp).toBeTruthy();

    const thread = getComments(ENTITY_PATH);
    const updated = thread.comments.find((c) => c.id === comment.id);
    expect(updated!.thread.length).toBe(1);
    expect(updated!.thread[0].content).toBe("Fixed it");
  });

  test("throws on unknown comment id", () => {
    expect(() =>
      addReply(ENTITY_PATH, "nonexistent", { content: "reply", author: "fo" })
    ).toThrow("Comment not found");
  });

  test("appends multiple replies in order", () => {
    const comment = addComment(ENTITY_PATH, {
      selected_text: "first paragraph",
      section_heading: "## Brainstorming Spec",
      content: "Thread test",
    });
    addReply(ENTITY_PATH, comment.id, { content: "Reply 1", author: "fo" });
    addReply(ENTITY_PATH, comment.id, { content: "Reply 2", author: "captain" });

    const thread = getComments(ENTITY_PATH);
    const updated = thread.comments.find((c) => c.id === comment.id);
    expect(updated!.thread.length).toBe(2);
    expect(updated!.thread[0].content).toBe("Reply 1");
    expect(updated!.thread[1].content).toBe("Reply 2");
  });
});
```

Also update the import at the top of `comments.test.ts`:

```typescript
import {
  getComments,
  addComment,
  resolveComment,
  addSuggestion,
  acceptSuggestion,
  rejectSuggestion,
  applyBodyEdit,
  addReply,
} from "./comments";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/dashboard && bun test comments`

Expected: FAIL -- `addReply` is not exported from `./comments`

- [ ] **Step 3: Implement `addReply` in comments.ts**

Add this function at the end of `comments.ts` (after `rejectSuggestion`):

```typescript
export function addReply(
  entityPath: string,
  commentId: string,
  input: { content: string; author: "captain" | "fo" | "guest" }
): CommentReply {
  const thread = readSidecar(entityPath);
  const comment = thread.comments.find((c) => c.id === commentId);
  if (!comment) throw new Error("Comment not found: " + commentId);
  const reply: CommentReply = {
    content: input.content,
    author: input.author,
    timestamp: new Date().toISOString(),
  };
  comment.thread.push(reply);
  writeSidecar(entityPath, thread);
  return reply;
}
```

Also update the import at the top of `comments.ts`:

```typescript
import type { Comment, CommentReply, Suggestion, CommentThread } from "./types";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tools/dashboard && bun test comments`

Expected: All tests PASS (existing 54 + 3 new = 57 total)

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/src/comments.ts tools/dashboard/src/comments.test.ts
git commit -m "feat(comments): add addReply() for comment threading"
```

---

### Task 2: Add `POST /api/entity/comment/reply` route

**Files:**
- Modify: `tools/dashboard/src/server.ts:222` (insert before `/api/entity/comment/resolve`)

- [ ] **Step 1: Add the reply route to the static route table**

In `server.ts`, locate the route table entry `"/api/entity/comment/resolve"` (line 222). Insert the new route **before** it:

```typescript
      "/api/entity/comment/reply": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              path: string;
              comment_id: string;
              content: string;
              author?: "captain" | "fo" | "guest";
            };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!body.content) return jsonResponse({ error: "Missing field: content" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const reply = addReply(body.path, body.comment_id, {
              content: body.content,
              author: body.author ?? "captain",
            });
            logRequest(req, 200);
            return jsonResponse(reply);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
```

- [ ] **Step 2: Add `addReply` to the import from `./comments`**

Find the import line in `server.ts` that imports from `"./comments"` and add `addReply`:

```typescript
import { getComments, addComment, resolveComment, addSuggestion, acceptSuggestion, rejectSuggestion, addReply } from "./comments";
```

- [ ] **Step 3: Add share-scoped reply route**

In the dynamic share route handler (around line 819, after the `subRoute === "comment" && req.method === "POST"` block), add a new block:

```typescript
          if (subRoute === "comment/reply" && req.method === "POST") {
            try {
              const body = await req.json() as {
                path: string;
                comment_id: string;
                content: string;
              };
              if (!body.path || !body.comment_id || !body.content) {
                logRequest(req, 400);
                return jsonResponse({ error: "Missing required fields" }, 400);
              }
              if (!shareRegistry.isInScope(token, body.path)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Entity not in share scope" }, 403);
              }
              if (!validatePath(body.path, projectRoot)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Forbidden" }, 403);
              }
              const reply = addReply(body.path, body.comment_id, {
                content: body.content,
                author: "guest",
              });
              logRequest(req, 200);
              return jsonResponse(reply);
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              logRequest(req, 500);
              return jsonResponse({ error: "Internal server error" }, 500);
            }
          }
```

**Note:** The share route regex is `/^\/api\/share\/([a-f0-9]+)\/entity\/(.+)$/` -- for `subRoute === "comment/reply"` this matches `POST /api/share/:token/entity/comment/reply`. The `(.+)` captures everything after `entity/`, so `comment/reply` is correctly matched.

- [ ] **Step 4: Run type-check**

Run: `cd tools/dashboard && bunx tsc --noEmit`

Expected: No type errors

- [ ] **Step 5: Run existing tests to ensure nothing broke**

Run: `cd tools/dashboard && bun test`

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add tools/dashboard/src/server.ts
git commit -m "feat(server): add POST /api/entity/comment/reply route + share equivalent"
```

---

### Task 3: Add highlight + popover CSS

**Files:**
- Modify: `tools/dashboard/static/detail.css:489` (after existing `.comment-highlight` stub)

- [ ] **Step 1: Extend `.comment-highlight` and add popover styles**

The existing `.comment-highlight` stub (lines 485-489) already has the base blue highlight. Add these rules immediately after line 489:

```css
.entity-body .comment-highlight:hover {
    background: rgba(88, 166, 255, 0.30);
}

.entity-body .comment-highlight.resolved {
    background: rgba(88, 166, 255, 0.06);
    border-bottom-color: rgba(88, 166, 255, 0.3);
}

/* --- Comment Popover --- */

.comment-popover {
    position: absolute;
    z-index: 1000;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 0.75rem;
    max-width: 360px;
    min-width: 240px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    font-size: 0.875rem;
    color: #c9d1d9;
}

.comment-popover .popover-comment {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #21262d;
}

.comment-popover .popover-comment:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
}

.comment-popover .popover-author {
    font-weight: 600;
    color: #58a6ff;
    margin-right: 0.5rem;
}

.comment-popover .popover-time {
    color: #484f58;
    font-size: 0.75rem;
}

.comment-popover .popover-text {
    margin-top: 0.25rem;
    line-height: 1.4;
}

.comment-popover .popover-reply-form {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #21262d;
}

.comment-popover .popover-reply-input {
    flex: 1;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #c9d1d9;
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    outline: none;
}

.comment-popover .popover-reply-input:focus {
    border-color: #58a6ff;
}

.comment-popover .popover-reply-btn {
    background: #238636;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0.375rem 0.75rem;
    cursor: pointer;
    font-size: 0.8125rem;
    white-space: nowrap;
}

.comment-popover .popover-reply-btn:hover {
    background: #2ea043;
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/dashboard/static/detail.css
git commit -m "feat(css): add comment popover and resolved highlight styles"
```

---

### Task 4: Implement `applyCommentHighlights()` in detail.js

**Files:**
- Modify: `tools/dashboard/static/detail.js`

This is the core frontend function. It walks the rendered entity body DOM, finds text matching each comment's `selected_text`, and wraps matches in `<mark class="comment-highlight">` elements. It handles overlapping highlights via segment splitting.

**XSS safety note:** The popover builds HTML from `escapeHtml()`, which uses `textContent`-based escaping. All user-supplied strings (author, content) pass through `escapeHtml()` before being set via `innerHTML`. This is a safe pattern -- equivalent to building a DOM string from pre-escaped fragments.

- [ ] **Step 1: Add the `applyCommentHighlights` function**

Add this function block inside the gate review IIFE in `detail.js`, before the `// --- Initialize ---` section (before line 780):

```javascript
  // --- Comment Highlights ---

  function applyCommentHighlights(comments) {
    var bodyEl = document.getElementById('entity-body');
    if (!bodyEl || !comments || !comments.length) return;

    // Remove existing highlights before re-applying
    var existingMarks = bodyEl.querySelectorAll('.comment-highlight');
    for (var m = existingMarks.length - 1; m >= 0; m--) {
      var parent = existingMarks[m].parentNode;
      while (existingMarks[m].firstChild) parent.insertBefore(existingMarks[m].firstChild, existingMarks[m]);
      parent.removeChild(existingMarks[m]);
    }
    bodyEl.normalize();

    // Build intervals: [{start, end, commentId, resolved}] on flattened text
    var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
    var node;
    var fullText = '';
    var nodeOffsets = []; // {node, start, end}
    while ((node = walker.nextNode())) {
      var start = fullText.length;
      fullText += node.textContent;
      nodeOffsets.push({ node: node, start: start, end: fullText.length });
    }

    // Find intervals for each comment's selected_text
    var intervals = [];
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      if (!c.selected_text) continue;
      var idx = fullText.indexOf(c.selected_text);
      if (idx === -1) continue;
      intervals.push({
        start: idx,
        end: idx + c.selected_text.length,
        commentId: c.id,
        resolved: c.resolved
      });
    }
    if (!intervals.length) return;

    // Build segment breakpoints for overlapping highlights
    var points = [];
    for (var i = 0; i < intervals.length; i++) {
      points.push(intervals[i].start);
      points.push(intervals[i].end);
    }
    points = points.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
    points.sort(function (a, b) { return a - b; });

    // Build segments: each segment is a range [points[i], points[i+1]) with list of covering comment IDs
    var segments = [];
    for (var i = 0; i < points.length - 1; i++) {
      var segStart = points[i];
      var segEnd = points[i + 1];
      var ids = [];
      var allResolved = true;
      for (var j = 0; j < intervals.length; j++) {
        if (intervals[j].start <= segStart && intervals[j].end >= segEnd) {
          ids.push(intervals[j].commentId);
          if (!intervals[j].resolved) allResolved = false;
        }
      }
      if (ids.length > 0) {
        segments.push({ start: segStart, end: segEnd, commentIds: ids, resolved: allResolved });
      }
    }

    // Apply highlights by walking segments in reverse (to preserve offsets)
    for (var s = segments.length - 1; s >= 0; s--) {
      var seg = segments[s];
      wrapTextRange(nodeOffsets, seg.start, seg.end, seg.commentIds, seg.resolved);
    }
  }

  function wrapTextRange(nodeOffsets, rangeStart, rangeEnd, commentIds, resolved) {
    for (var i = 0; i < nodeOffsets.length; i++) {
      var info = nodeOffsets[i];
      if (info.end <= rangeStart || info.start >= rangeEnd) continue;

      var node = info.node;
      var nodeStart = info.start;
      var localStart = Math.max(0, rangeStart - nodeStart);
      var localEnd = Math.min(node.textContent.length, rangeEnd - nodeStart);

      if (localStart > 0) {
        var before = node.splitText(localStart);
        var splitLen = node.textContent.length;
        info.node = before;
        info.start = nodeStart + splitLen;
        node = before;
        localEnd = localEnd - localStart;
        localStart = 0;
      }
      if (localEnd < node.textContent.length) {
        node.splitText(localEnd);
      }

      var mark = document.createElement('mark');
      mark.className = 'comment-highlight' + (resolved ? ' resolved' : '');
      mark.setAttribute('data-comment-ids', commentIds.join(','));
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
      break;
    }
  }
```

- [ ] **Step 2: Add popover click handler**

Add this function right after `wrapTextRange`:

```javascript
  // --- Comment Popover ---

  var activePopover = null;

  function showCommentPopover(mark, comments) {
    hideCommentPopover();
    var ids = (mark.getAttribute('data-comment-ids') || '').split(',');
    var matching = comments.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    if (!matching.length) return;

    var popover = document.createElement('div');
    popover.className = 'comment-popover';

    for (var i = 0; i < matching.length; i++) {
      var c = matching[i];
      var div = document.createElement('div');
      div.className = 'popover-comment';

      var authorSpan = document.createElement('span');
      authorSpan.className = 'popover-author';
      authorSpan.textContent = c.author;
      div.appendChild(authorSpan);

      var timeSpan = document.createElement('span');
      timeSpan.className = 'popover-time';
      timeSpan.textContent = new Date(c.timestamp).toLocaleString();
      div.appendChild(timeSpan);

      var textDiv = document.createElement('div');
      textDiv.className = 'popover-text';
      textDiv.textContent = c.content;
      div.appendChild(textDiv);

      popover.appendChild(div);

      // Thread replies
      if (c.thread && c.thread.length) {
        for (var r = 0; r < c.thread.length; r++) {
          var reply = c.thread[r];
          var replyDiv = document.createElement('div');
          replyDiv.className = 'popover-comment';

          var replyAuthor = document.createElement('span');
          replyAuthor.className = 'popover-author';
          replyAuthor.textContent = reply.author;
          replyDiv.appendChild(replyAuthor);

          var replyTime = document.createElement('span');
          replyTime.className = 'popover-time';
          replyTime.textContent = new Date(reply.timestamp).toLocaleString();
          replyDiv.appendChild(replyTime);

          var replyText = document.createElement('div');
          replyText.className = 'popover-text';
          replyText.textContent = reply.content;
          replyDiv.appendChild(replyText);

          popover.appendChild(replyDiv);
        }
      }

      // Reply form (only for first/primary comment)
      if (i === 0) {
        var form = document.createElement('div');
        form.className = 'popover-reply-form';
        var input = document.createElement('input');
        input.className = 'popover-reply-input';
        input.placeholder = 'Reply...';
        input.type = 'text';
        var btn = document.createElement('button');
        btn.className = 'popover-reply-btn';
        btn.textContent = 'Reply';
        var capturedId = c.id;
        btn.onclick = function () {
          var text = input.value.trim();
          if (!text) return;
          submitReply(capturedId, text);
        };
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') btn.click();
        });
        form.appendChild(input);
        form.appendChild(btn);
        popover.appendChild(form);
      }
    }

    // Position relative to mark element
    var rect = mark.getBoundingClientRect();
    var bodyEl = document.getElementById('entity-body');
    var bodyRect = bodyEl.getBoundingClientRect();
    popover.style.top = (rect.bottom - bodyRect.top + 8) + 'px';
    popover.style.left = (rect.left - bodyRect.left) + 'px';

    bodyEl.style.position = 'relative';
    bodyEl.appendChild(popover);
    activePopover = popover;

    setTimeout(function () {
      document.addEventListener('click', handlePopoverOutsideClick);
    }, 0);
  }

  function hideCommentPopover() {
    if (activePopover && activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
    }
    activePopover = null;
    document.removeEventListener('click', handlePopoverOutsideClick);
  }

  function handlePopoverOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target) && !e.target.classList.contains('comment-highlight')) {
      hideCommentPopover();
    }
  }

  function submitReply(commentId, content) {
    apiFetch('/api/entity/comment/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: entityPath,
        comment_id: commentId,
        content: content,
      }),
    }).then(function () {
      hideCommentPopover();
      if (typeof loadComments === 'function') loadComments();
      window.loadEntity();
    });
  }
```

- [ ] **Step 3: Wire click handler for highlights on entity body**

Add this event listener right after the popover functions (before `// --- Initialize ---`):

```javascript
  document.getElementById('entity-body').addEventListener('click', function (e) {
    var mark = e.target.closest('.comment-highlight');
    if (mark && cachedComments) {
      e.stopPropagation();
      showCommentPopover(mark, cachedComments);
    }
  });
```

- [ ] **Step 4: Add comment caching + integrate into loadEntity override**

Add a `cachedComments` variable near the top of the IIFE (after `var detailWs = null;` around line 720):

```javascript
  var cachedComments = null;
```

Then modify the `window.loadEntity` override (line 783-805). After the existing `if (typeof loadComments === 'function') loadComments();` line (line 794), add:

```javascript
        // Fetch comments and apply highlights
        apiFetch('/api/entity/comments?path=' + encodeURIComponent(entityPath))
          .then(function (threadData) {
            cachedComments = threadData.comments || [];
            applyCommentHighlights(cachedComments);
          });
```

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/detail.js
git commit -m "feat(detail): add comment highlight injection + popover with reply"
```

---

### Task 5: Add highlight injection in share.js

**Files:**
- Modify: `tools/dashboard/static/share.js`

- [ ] **Step 1: Add `applyCommentHighlights` and popover functions to share.js**

Add these functions inside the share.js IIFE. The logic is identical to detail.js but uses the share-scoped API. Add before the `loadComments` function (before line 129):

```javascript
  // --- Comment Highlights (share page) ---

  var cachedComments = null;
  var activePopover = null;

  function applyCommentHighlights(comments) {
    var bodyEl = document.getElementById('entity-body');
    if (!bodyEl || !comments || !comments.length) return;

    // Remove existing highlights before re-applying
    var existingMarks = bodyEl.querySelectorAll('.comment-highlight');
    for (var m = existingMarks.length - 1; m >= 0; m--) {
      var parent = existingMarks[m].parentNode;
      while (existingMarks[m].firstChild) parent.insertBefore(existingMarks[m].firstChild, existingMarks[m]);
      parent.removeChild(existingMarks[m]);
    }
    bodyEl.normalize();

    var walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT, null);
    var node;
    var fullText = '';
    var nodeOffsets = [];
    while ((node = walker.nextNode())) {
      var start = fullText.length;
      fullText += node.textContent;
      nodeOffsets.push({ node: node, start: start, end: fullText.length });
    }

    var intervals = [];
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      if (!c.selected_text) continue;
      var idx = fullText.indexOf(c.selected_text);
      if (idx === -1) continue;
      intervals.push({
        start: idx,
        end: idx + c.selected_text.length,
        commentId: c.id,
        resolved: c.resolved
      });
    }
    if (!intervals.length) return;

    var points = [];
    for (var i = 0; i < intervals.length; i++) {
      points.push(intervals[i].start);
      points.push(intervals[i].end);
    }
    points = points.filter(function (v, idx, arr) { return arr.indexOf(v) === idx; });
    points.sort(function (a, b) { return a - b; });

    var segments = [];
    for (var i = 0; i < points.length - 1; i++) {
      var segStart = points[i];
      var segEnd = points[i + 1];
      var ids = [];
      var allResolved = true;
      for (var j = 0; j < intervals.length; j++) {
        if (intervals[j].start <= segStart && intervals[j].end >= segEnd) {
          ids.push(intervals[j].commentId);
          if (!intervals[j].resolved) allResolved = false;
        }
      }
      if (ids.length > 0) {
        segments.push({ start: segStart, end: segEnd, commentIds: ids, resolved: allResolved });
      }
    }

    for (var s = segments.length - 1; s >= 0; s--) {
      var seg = segments[s];
      wrapTextRange(nodeOffsets, seg.start, seg.end, seg.commentIds, seg.resolved);
    }
  }

  function wrapTextRange(nodeOffsets, rangeStart, rangeEnd, commentIds, resolved) {
    for (var i = 0; i < nodeOffsets.length; i++) {
      var info = nodeOffsets[i];
      if (info.end <= rangeStart || info.start >= rangeEnd) continue;

      var node = info.node;
      var nodeStart = info.start;
      var localStart = Math.max(0, rangeStart - nodeStart);
      var localEnd = Math.min(node.textContent.length, rangeEnd - nodeStart);

      if (localStart > 0) {
        var before = node.splitText(localStart);
        var splitLen = node.textContent.length;
        info.node = before;
        info.start = nodeStart + splitLen;
        node = before;
        localEnd = localEnd - localStart;
        localStart = 0;
      }
      if (localEnd < node.textContent.length) {
        node.splitText(localEnd);
      }

      var mark = document.createElement('mark');
      mark.className = 'comment-highlight' + (resolved ? ' resolved' : '');
      mark.setAttribute('data-comment-ids', commentIds.join(','));
      node.parentNode.insertBefore(mark, node);
      mark.appendChild(node);
      break;
    }
  }

  function showCommentPopover(mark, comments) {
    hideCommentPopover();
    var ids = (mark.getAttribute('data-comment-ids') || '').split(',');
    var matching = comments.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    if (!matching.length) return;

    var popover = document.createElement('div');
    popover.className = 'comment-popover';

    for (var i = 0; i < matching.length; i++) {
      var c = matching[i];
      var div = document.createElement('div');
      div.className = 'popover-comment';

      var authorSpan = document.createElement('span');
      authorSpan.className = 'popover-author';
      authorSpan.textContent = c.author;
      div.appendChild(authorSpan);

      var timeSpan = document.createElement('span');
      timeSpan.className = 'popover-time';
      timeSpan.textContent = new Date(c.timestamp).toLocaleString();
      div.appendChild(timeSpan);

      var textDiv = document.createElement('div');
      textDiv.className = 'popover-text';
      textDiv.textContent = c.content;
      div.appendChild(textDiv);

      popover.appendChild(div);

      if (c.thread && c.thread.length) {
        for (var r = 0; r < c.thread.length; r++) {
          var reply = c.thread[r];
          var replyDiv = document.createElement('div');
          replyDiv.className = 'popover-comment';

          var replyAuthor = document.createElement('span');
          replyAuthor.className = 'popover-author';
          replyAuthor.textContent = reply.author;
          replyDiv.appendChild(replyAuthor);

          var replyTime = document.createElement('span');
          replyTime.className = 'popover-time';
          replyTime.textContent = new Date(reply.timestamp).toLocaleString();
          replyDiv.appendChild(replyTime);

          var replyText = document.createElement('div');
          replyText.className = 'popover-text';
          replyText.textContent = reply.content;
          replyDiv.appendChild(replyText);

          popover.appendChild(replyDiv);
        }
      }

      if (i === 0) {
        var form = document.createElement('div');
        form.className = 'popover-reply-form';
        var input = document.createElement('input');
        input.className = 'popover-reply-input';
        input.placeholder = 'Reply...';
        input.type = 'text';
        var btn = document.createElement('button');
        btn.className = 'popover-reply-btn';
        btn.textContent = 'Reply';
        var capturedId = c.id;
        btn.onclick = function () {
          var text = input.value.trim();
          if (!text) return;
          submitReply(capturedId, text);
        };
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') btn.click();
        });
        form.appendChild(input);
        form.appendChild(btn);
        popover.appendChild(form);
      }
    }

    var rect = mark.getBoundingClientRect();
    var bodyEl = document.getElementById('entity-body');
    var bodyRect = bodyEl.getBoundingClientRect();
    popover.style.top = (rect.bottom - bodyRect.top + 8) + 'px';
    popover.style.left = (rect.left - bodyRect.left) + 'px';

    bodyEl.style.position = 'relative';
    bodyEl.appendChild(popover);
    activePopover = popover;

    setTimeout(function () {
      document.addEventListener('click', handlePopoverOutsideClick);
    }, 0);
  }

  function hideCommentPopover() {
    if (activePopover && activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
    }
    activePopover = null;
    document.removeEventListener('click', handlePopoverOutsideClick);
  }

  function handlePopoverOutsideClick(e) {
    if (activePopover && !activePopover.contains(e.target) && !e.target.classList.contains('comment-highlight')) {
      hideCommentPopover();
    }
  }

  function submitReply(commentId, content) {
    fetch('/api/share/' + token + '/entity/comment/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentCommentPath,
        comment_id: commentId,
        content: content,
      }),
    }).then(function () {
      hideCommentPopover();
      loadComments(currentCommentPath);
    });
  }
```

- [ ] **Step 2: Wire highlight click handler on entity-body**

Add after the highlight functions, before `loadComments`:

```javascript
  document.getElementById('entity-body').addEventListener('click', function (e) {
    var mark = e.target.closest('.comment-highlight');
    if (mark && cachedComments) {
      e.stopPropagation();
      showCommentPopover(mark, cachedComments);
    }
  });
```

- [ ] **Step 3: Inject highlights in `showEntityDetail`**

Modify `showEntityDetail()` (line 106). After the `loadComments(path);` call (line 120), add highlight injection:

```javascript
    // Apply highlights after body render + comments load
    fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(path))
      .then(function (res) { return res.json(); })
      .then(function (thread) {
        cachedComments = thread.comments || [];
        applyCommentHighlights(cachedComments);
      });
```

- [ ] **Step 4: Re-apply highlights on WebSocket comment event**

In the WebSocket `onmessage` handler (around line 224), modify the existing comment event handler. After the existing `loadComments(currentCommentPath);` line, add:

```javascript
            // Re-fetch and re-apply highlights after new comment
            fetch('/api/share/' + token + '/entity/comments?path=' + encodeURIComponent(currentCommentPath))
              .then(function (res) { return res.json(); })
              .then(function (thread) {
                cachedComments = thread.comments || [];
                applyCommentHighlights(cachedComments);
              });
```

Note: `applyCommentHighlights` already removes existing `<mark>` elements before re-applying, so no separate cleanup is needed.

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/share.js
git commit -m "feat(share): add comment highlight injection + popover with reply"
```

---

### Task 6: Quality gate -- type-check, test, build

**Files:** None (verification only)

- [ ] **Step 1: Run type-check**

Run: `cd tools/dashboard && bunx tsc --noEmit`

Expected: No type errors

- [ ] **Step 2: Run all tests**

Run: `cd tools/dashboard && bun test`

Expected: 57 tests pass (54 existing + 3 new addReply tests)

- [ ] **Step 3: Verify server starts**

Run: `cd tools/dashboard && timeout 5 bun run src/server.ts || true`

Expected: Server starts without crash, prints listening banner

- [ ] **Step 4: Verify no lint issues (if linter configured)**

Run: `cd tools/dashboard && bunx biome check src/ 2>/dev/null || echo "No linter configured"`

---

## Acceptance Criteria Mapping

| Criterion | Task |
|-----------|------|
| Selected text gets persistent highlight styling | Task 4 (detail.js), Task 5 (share.js), Task 3 (CSS) |
| Clicking highlight opens popover with thread | Task 4 (popover), Task 5 (share popover) |
| FO reply in thread AND activity feed (dual presence) | Task 1 (addReply), Task 2 (API route) |
| Resolved comments: highlight fades | Task 3 (`.resolved` CSS), Task 4/5 (resolved flag in segment splitting) |
| Highlights survive re-render | Task 4 (highlights re-applied on every `loadEntity` call) |
| Comments panel preserved | No changes to existing sidebar rendering -- new code is additive only |
