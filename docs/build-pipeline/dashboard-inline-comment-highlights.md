---
id: 013
title: Dashboard Inline Comment Highlights — Notion-like Comment Threading & Visual Markers
status: explore
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

## Technical Claims

CLAIM-1: [type: framework-api] "TreeWalker with NodeFilter.SHOW_TEXT can search text nodes in rendered HTML for re-anchoring comment highlights after re-render"
CLAIM-2: [type: framework-pattern] "Text node splitting via Range.surroundContents() or manual splitText() + mark wrapping works reliably on marked.js-rendered HTML"
CLAIM-3: [type: library-api] "DOMPurify pipeline runs BEFORE highlight injection — highlights are injected into live DOM after marked.parse() -> DOMPurify.sanitize() -> DOM append"
CLAIM-4: [type: project-convention] "CSS .comment-highlight stub exists at detail.css:485-489 with blue styling"
CLAIM-5: [type: project-convention] "Comment type has thread: CommentReply[] field in types.ts, and addComment() initializes it as empty array"
CLAIM-6: [type: project-convention] "window.loadEntity override in gate review IIFE (detail.js ~line 783) is the injection point for post-render highlight calls"
CLAIM-7: [type: project-convention] "share.js showEntityDetail() is a parallel render path that also needs highlight injection"
CLAIM-8: [type: library-api] "DOMPurify.sanitize() default config allows mark tag in ALLOWED_TAGS"
CLAIM-9: [type: framework-pattern] "Overlapping highlights can be handled with nested mark elements"
CLAIM-10: [type: framework-api] "Range.getClientRects() returns per-line rects for multi-line selections (already implemented)"

## Research Report

**Claims analyzed**: 10
**Recommendation**: PROCEED (with 2 corrections noted)

### Verified (8 claims)

- CLAIM-1: HIGH — TreeWalker + NodeFilter.SHOW_TEXT is the standard DOM API for text node traversal
  Explorer: No existing usage in codebase, but this is a vanilla DOM API needing no library
  Web: MDN docs confirm TreeWalker with SHOW_TEXT iterates text nodes while preserving HTML structure; can reassign currentNode for flexible navigation
  Note: Well-suited for re-anchoring — walk text nodes, accumulate text, find offset match for comment.selected_text

- CLAIM-3: HIGH — DOMPurify pipeline confirmed as pre-highlight
  Explorer: detail.js:69-77 shows marked.parse() -> DOMPurify.sanitize() -> DOM append via temp container; highlights inject AFTER this pipeline completes on the live DOM
  Web: DOMPurify operates on HTML strings, not live DOM — post-render DOM manipulation (adding mark elements) is unaffected
  Important: loadEntity() re-renders the entire body, wiping any injected highlights. Highlights MUST be re-applied after every renderBody() call.

- CLAIM-4: HIGH — CSS stub confirmed exactly as described
  Explorer: detail.css:485-489 contains `.entity-body .comment-highlight { background: rgba(88, 166, 255, 0.15); border-bottom: 2px solid #58a6ff; cursor: pointer; }`
  Note: Blue styling matches dashboard theme. No change needed for Notion-like UX — blue is the project's accent color.

- CLAIM-5: HIGH — Comment.thread and addComment() confirmed
  Explorer: types.ts:124 `thread: CommentReply[]` on Comment interface; CommentReply at line 127 has {content, author, timestamp}; comments.ts:43 initializes `thread: []` in addComment()
  Note: Backend data model is ready for threading. Frontend thread rendering is the new work.

- CLAIM-6: HIGH — window.loadEntity override is correct injection point
  Explorer: detail.js:782-805 — gate review IIFE assigns `window.loadEntity = function()` that calls renderBody(data.body) at line 790, then renderStageReports, renderTags, initScore, loadComments, and updateGatePanel
  Note: Highlight injection should go immediately after renderBody() returns (line 790), before other post-render work.

- CLAIM-7: HIGH — share.js is a confirmed parallel render path
  Explorer: share.js:106-127 showEntityDetail() renders via `DOMPurify.sanitize(marked.parse(data.body))` assigned to `bodyEl.innerHTML` at line 114-115, then calls loadComments(path) and setupCommentTooltip(path)
  Note: This path uses innerHTML assignment (not DOM append like detail.js). Highlight injection goes after innerHTML assignment, before/alongside loadComments().

- CLAIM-8: HIGH — DOMPurify allows mark by default
  Web: DOMPurify's default ALLOWED_TAGS list includes mark. WebSearch confirmed this explicitly.
  Note: Informational — highlights are injected post-DOMPurify, so this only matters if mark tags somehow appear in the markdown source (they won't).

- CLAIM-10: HIGH — Already implemented
  Explorer: detail.js:287 uses `range.getClientRects()` with fallback to `getBoundingClientRect()`
  Note: No action needed — this correction from a prior research cycle is already in the code.

### Corrected (2 claims)

- CLAIM-2: HIGH CORRECTION — Range.surroundContents() has critical limitation
  Web (MDN): surroundContents() throws an InvalidStateError if the range partially contains any non-Text node. This means it FAILS when the selected text crosses element boundaries (e.g., text spanning bold+italic, or text inside a list item crossing into the next).
  Web (dom-highlight-range): The correct approach is per-text-node wrapping: iterate all text nodes in the range using TreeWalker, splitText() at start/end boundaries, wrap each text node segment individually with a mark element.
  Web (CSS Custom Highlight API): An alternative approach that avoids DOM manipulation entirely — now supported in all major browsers since Firefox 140 (June 2025). Uses CSS ::highlight() pseudo-element with no DOM changes.
  **Fix**: Do NOT use surroundContents(). Use the per-text-node splitText() + wrap pattern (as demonstrated by dom-highlight-range library). For each text node in the range: (1) splitText at startOffset if it's the start node, (2) splitText at endOffset if it's the end node, (3) wrap the relevant text node with document.createElement('mark'). Consider CSS Custom Highlight API as a future enhancement (simpler, no DOM mutation) but the DOM approach is fine for this scope.

- CLAIM-9: MEDIUM CORRECTION — Overlapping highlights need segment splitting, not naive nesting
  Web: HTML does not support true overlapping tags. While nested mark elements (mark inside mark) are valid HTML, overlapping ranges that cross each other's element boundaries cannot be naively wrapped. The correct approach is: when a new highlight overlaps an existing one, split the ranges into non-overlapping segments where each segment gets its own mark element, potentially with multiple CSS classes (e.g., `.highlight-comment-A.highlight-comment-B`).
  Note: This is a medium-severity correction because the spec's GUARDRAILS mention "handle overlapping selections gracefully (nested highlights)" — the word "nested" is technically correct IF the overlap is contained, but the implementation must use segment splitting for partial overlaps.
  **Fix**: When applying highlights, check for existing mark elements in the target range. If found, split the new highlight around existing marks, creating separate segments. Each mark can carry data-comment-id attributes to track which comment(s) each segment belongs to.

### Unverifiable (0 claims)

None — all claims were verified or corrected with cited sources.

### Additional Finding: CSS Custom Highlight API

During CLAIM-2 verification, discovered that the CSS Custom Highlight API is now available in all major browsers (Chrome, Edge, Safari, Firefox 140+). This API allows styling arbitrary text ranges via CSS `::highlight()` pseudo-element WITHOUT modifying the DOM. Benefits:
- No DOM mutation means no interference with re-renders
- No splitText/mark wrapping complexity
- No overlapping highlight conflicts
- Survives re-render naturally if ranges are re-created

However, for this feature's scope (Small scale), the traditional DOM approach with per-text-node wrapping is simpler to implement and sufficient. The CSS Custom Highlight API could be a future enhancement.

### Recommendation Criteria

- 2 corrections found, both at implementation-detail level (how to wrap text, how to handle overlaps)
- Neither correction affects the overall architecture, data model, or control flow
- Both corrections have clear, well-documented fixes
- **Recommendation: PROCEED** — corrections are implementation-level and do not require plan revision

## Stage Report: research

- [x] Claims extracted from plan (10 claims)
- [x] Explorer verification completed (direct codebase search — 8 claims verified, 2 needed web confirmation)
- [x] Context7 verification — SKIPPED (Context7 MCP tools not available in environment; substituted with WebFetch of official documentation)
- [x] Web research verification completed (WebSearch + WebFetch for DOMPurify docs, MDN Range/TreeWalker, CSS Custom Highlight API, dom-highlight-range library)
- [x] Cross-reference synthesis completed (all 10 claims resolved: 8 verified, 2 corrected)
- [x] Research report written to entity
- [x] Corrections documented with cited sources and fix guidance

## Stage Report: plan

### Summary
Formal implementation plan created via `superpowers:writing-plans`. 6 tasks across 4 layers (domain, router, frontend view, test). TDD ordering: tests first in Task 1, quality gate in Task 6. Both research corrections incorporated — no `Range.surroundContents()`, segment splitting for overlaps. Plan saved to `docs/superpowers/specs/2026-04-06-dashboard-inline-comment-highlights.md`.

### Checklist

1. **DONE** — Read entity file for explore + research findings
   - Full entity file read including explore report (9 items), coverage infrastructure, and file map
2. **DONE** — Use `Skill: "superpowers:writing-plans"` to create formal plan
   - Plan produced with 6 tasks, bite-sized steps, complete code in every step
3. **DONE** — Plan incorporates both research corrections (no surroundContents, segment splitting)
   - Research Corrections section at top of plan explicitly states both rules
   - `applyCommentHighlights()` uses TreeWalker + `splitText()` + `<mark>` wrapping (never `surroundContents`)
   - Overlapping highlights decomposed into non-overlapping segments via breakpoint algorithm
4. **DONE** — Plan has TDD test-first ordering
   - Task 1: write failing `addReply` tests -> run to verify fail -> implement -> run to verify pass
   - Task 6: quality gate (type-check, test, build)
5. **DONE** — Plan specifies concrete file paths and injection points
   - All 6 files with exact paths; injection points reference specific line numbers (e.g., `detail.js:780`, `server.ts:222`, `detail.css:489`, `share.js:129`)
6. **DONE** — Plan includes quality gate steps (type-check, tests, lint, build)
   - Task 6 runs `bunx tsc --noEmit`, `bun test`, server startup verification, and lint check
7. **DONE** — Save plan to `docs/superpowers/specs/` directory
   - Saved to `docs/superpowers/specs/2026-04-06-dashboard-inline-comment-highlights.md`
8. **DONE** — Commit plan document
   - Committed with stage report
