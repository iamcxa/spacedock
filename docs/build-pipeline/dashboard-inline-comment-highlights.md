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
