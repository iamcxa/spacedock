---
id: 013
title: Dashboard Inline Comment Highlights — Notion-like Comment Threading & Visual Markers
status: plan
source: UI testing feedback
started: 2026-04-06T13:10:00Z
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-inline-comment-highlights
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 011 completed (collaborative review, inline comments & suggestions)

## Brainstorming Spec

APPROACH:     Add Notion-like visual markers to the entity detail view for inline comments. When the captain selects text and comments, the selected range gets a persistent highlight (background color + underline). Clicking the highlight opens a comment thread popover showing the original comment and all FO responses inline. FO replies route to both the comment thread AND the activity feed (dual presence). Resolved comments fade their highlight. This transforms comments from "fire and forget into feed" to "anchored conversations on the document."
ALTERNATIVE:  Keep current model where comments only appear in the sidebar COMMENTS panel and responses go to feed (rejected: creates UX disconnect — captain can't see where they commented or find responses in context)
GUARDRAILS:   Highlights must survive re-render when entity file updates via WebSocket. Must handle overlapping selections gracefully (nested highlights). Comment anchoring must be resilient to minor text changes in the entity file (use offset + surrounding context for re-anchoring). Must not corrupt the entity markdown file — all highlight/thread state is client-side only.
RATIONALE:    Captain tested the collaborative review feature (011) and found two UX gaps: (1) after commenting, the selected area has no visual trace — you can't see where you commented, (2) FO responses go to the activity feed instead of appearing in context next to the original comment. The Notion inline comment model solves both — highlights show "where", threads show "what was discussed."

## Acceptance Criteria

- Selected text for comments gets persistent highlight styling (background + underline)
- Clicking a highlight opens a popover/thread showing original comment + responses
- FO reply appears in both the comment thread AND the activity feed (dual presence)
- Resolved comments: highlight fades (reduced opacity or removed)
- Highlights survive entity re-render (WebSocket update)
- Comments panel in sidebar still shows all comments (existing behavior preserved)

## Coverage Infrastructure

- **Test runner:** Bun built-in test runner (`bun test`)
- **Coverage command:** `bun test --coverage` (run from `tools/dashboard/`)
- **Coverage format:** Bun native table output (text-only; no Istanbul JSON or LCOV file emitted)
- **Coverage files:** No `coverage-final.json` or `lcov.info` — Bun prints inline table to stdout only
- **Baseline:** No committed baseline file; no CI cache for coverage baseline
- **Comparison script:** None found (no `.github/scripts/` directory exists)
- **Existing test files:** `auth.test.ts`, `comments.test.ts`, `discovery.test.ts`, `frontmatter-io.test.ts`, `gate.test.ts`, `parsing.test.ts` — all server-side TypeScript; no browser/DOM tests
- **Current pass rate:** 54 pass, 0 fail; `comments.ts` at 100% func / 97.94% line coverage
- **New tests needed:** Unit tests for highlight re-anchoring logic (pure function, testable); no DOM testing infrastructure exists

## Stage Report: explore

### Summary
Deep codebase exploration of the dashboard comment system — all 9 checklist items completed. Scale confirmed as **Medium** (7 files, 4 layers). The `.comment-highlight` CSS stub already exists in `detail.css`; the core work is DOM text-range injection in `detail.js` and `share.js`, a new comment reply API route in `server.ts`, and popover CSS.

### Checklist

1. **DONE** — Map all files related to comment system
   - `tools/dashboard/src/comments.ts` — sidecar read/write, all CRUD operations
   - `tools/dashboard/src/types.ts` — Comment, CommentReply, Suggestion, CommentThread interfaces
   - `tools/dashboard/src/server.ts` — REST routes: GET/POST /api/entity/comment(s), resolve, suggestion accept/reject; scoped share routes mirror all of these
   - `tools/dashboard/static/detail.js` — text selection, comment tooltip, sidebar rendering, loadComments()
   - `tools/dashboard/static/share.js` — guest comment flow, setupCommentTooltip(), loadComments() via share token
   - `tools/dashboard/static/detail.css` — `.comment-highlight` stub already exists (line 485-489)
   - `tools/dashboard/static/detail.html` — #entity-body target, #comment-tooltip, sidebar #comment-threads
   - `tools/dashboard/static/share.html` — mirrors detail structure: #entity-body + #comment-threads + #comment-tooltip

2. **DONE** — Document how selected_text is captured, stored, and retrieved
   - **Capture:** `mouseup` on `#entity-body` — `window.getSelection()` — `sel.toString().trim()` + `getSelectionContext()` (walks DOM backwards for nearest h2/h3)
   - **Store:** POST `/api/entity/comment` — `addComment()` in `comments.ts` — written to `<entity>.comments.json` sidecar file
   - **Retrieve:** GET `/api/entity/comments?path=` returns full `CommentThread`; `selected_text` is a plain string — no character offset or DOM range is persisted
   - **Re-anchoring challenge:** highlights must find `selected_text` in rendered DOM by text search (TreeWalker over text nodes); resilience to minor edits is not guaranteed but acceptable per spec guardrails

3. **DONE** — Document entity body rendering pipeline and highlight injection point
   - **Pipeline:** `loadEntity()` — API fetch — `renderBody(data.body)` — `marked.parse()` — `DOMPurify.sanitize()` — DOM nodes appended to `#entity-body`
   - **Highlight injection:** must run AFTER `renderBody()` completes; call `applyCommentHighlights(comments)` at end of `renderBody()` or in its caller
   - **Critical:** `window.loadEntity` is overridden by the gate review IIFE (detail.js line 783); new highlight call must go inside the overriding function's `.then()` callback, not the original `loadEntity()`
   - **DOM manipulation approach:** TreeWalker to find text nodes containing `selected_text`, then split text node + wrap with `<mark class="comment-highlight">` elements; must handle partial-node splits
   - **DOMPurify constraint:** highlights injected AFTER DOMPurify runs — no sanitization issue for client-side DOM manipulation post-render

4. **DONE** — Document WebSocket re-render flow and how highlights survive re-renders
   - **Re-render triggers:** (a) `acceptSuggestionAction()` calls `loadEntity()` after success; (b) gate review IIFE overrides `window.loadEntity`; (c) no periodic auto-refresh — only user actions trigger re-render
   - **Highlight survival strategy:** `applyCommentHighlights()` must be called at the end of every `loadEntity()` call path; function fetches comments and re-injects highlights from scratch after each body render
   - **WebSocket does NOT trigger body re-render** — gate review WS only updates gate panel UI, not body; comment WS in share.js only reloads comments sidebar, not body
   - **Conclusion:** highlights are safe to re-inject after every `loadEntity()` call; no special persistence needed

5. **DONE** — Identify share.js comment patterns and differences from detail.js
   - **Differences:** `setupCommentTooltip()` uses `getBoundingClientRect()` not `getClientRects()` (minor inconsistency); no `getSelectionContext()` — `section_heading` sent as `""`; no resolve button; author forced to `"guest"`
   - **Similarities:** same `#entity-body`, `#comment-tooltip`, `#comment-threads` DOM IDs; same marked+DOMPurify render pipeline; same sidecar comment store via share-scoped API routes
   - **Highlight injection point:** `showEntityDetail()` after body render — add `applyCommentHighlights(thread.comments, bodyEl)` after `loadComments()` resolves
   - **Re-render:** share.js does NOT call full re-render on WS events — only reloads comment sidebar; highlights re-applied only on WS "comment" event if loadComments() callback also re-applies highlights

6. **DONE** — Store context lake insights for each key file discovered
   - Insights stored for: `comments.ts`, `detail.js`, `share.js`, `detail.css`, `detail.html`, `share.html`, `server.ts`, `types.ts`

7. **DONE** — Confirm or revise scale
   - **Revised: Medium (6 files changed, 4 layers)**
   - `detail.js` — add applyCommentHighlights() + popover click handler
   - `share.js` — add applyCommentHighlights() in showEntityDetail()
   - `detail.css` — add popover CSS + resolved fade styles
   - `server.ts` — add POST /api/entity/comment/reply route + share equivalent
   - `comments.ts` — add addReply() function
   - `comments.test.ts` — add addReply tests
   - `types.ts` — no changes needed; CommentReply already defined

8. **DONE** — Document coverage infrastructure
   - See "Coverage Infrastructure" section above. Bun native coverage only; no Istanbul/LCOV. No CI baseline. New unit tests for highlight re-anchoring logic are feasible as pure functions. Browser E2E is mandatory per project policy for full-stack features.

9. **DONE** — File list grouped by layer with one-line purpose notes

   **Domain layer**
   - `tools/dashboard/src/comments.ts` — sidecar CRUD: add/resolve comment, add/accept/reject suggestion; needs addReply()
   - `tools/dashboard/src/types.ts` — TypeScript interfaces: Comment has thread: CommentReply[] already defined; no changes needed

   **Contract/Router layer**
   - `tools/dashboard/src/server.ts` — Bun HTTP server: all comment REST routes + scoped share routes; needs POST /api/entity/comment/reply

   **Frontend view layer**
   - `tools/dashboard/static/detail.js` — main page: text selection, submit, sidebar render; needs applyCommentHighlights() + popover
   - `tools/dashboard/static/share.js` — share page guest flow; needs same highlight injection in showEntityDetail()
   - `tools/dashboard/static/detail.css` — .comment-highlight stub exists; needs popover CSS + .resolved fade
   - `tools/dashboard/static/detail.html` — HTML shell; no changes needed
   - `tools/dashboard/static/share.html` — HTML shell; no changes needed

   **Test layer**
   - `tools/dashboard/src/comments.test.ts` — existing CRUD tests; addReply tests to be added
