---
id: 009
title: Dashboard Entity Visibility — Show All Entities with Stage Filtering
status: explore
source: session discussion
started:
completed:
verdict:
score: 0.9
worktree: .worktrees/ensign-dashboard-entity-visibility
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Features 001-006 completed (dashboard server, entity table)
- No dependency on 007 (channel plugin) or 008 (standalone plugin)

## Brainstorming Spec

APPROACH:     Dashboard shows ALL entities (active + archived) by default. Archived/shipped entities render with reduced opacity (gray text, muted badge). The stage chips in the workflow card header become clickable filters — click a chip to show only entities in that stage, click again to deselect. Multiple chips can be selected. "All" is the default (no filter). Entity count in header reflects visible count.
ALTERNATIVE:  Collapsible "Completed" section below active entities (rejected: hides the "war room" overview — captain wants one glance to see everything, not expand/collapse)
GUARDRAILS:   Active entities must remain visually prominent — shipped entities should NOT compete for attention. Filter state is client-side only (URL query param or sessionStorage), no backend state. Must handle workflows with many archived entities (100+) without performance issues.
RATIONALE:    The "war room" dashboard should show the full picture at a glance — how many features shipped, what's in progress, what's queued. Hiding archived entities loses context. Stage chips already display counts, making them interactive filters is a natural UX extension.

## Acceptance Criteria

- Dashboard scans `_archive/` directory and includes shipped entities in the table
- Shipped/archived entities display with reduced opacity (e.g., 0.5) and muted status badge
- Entity count in workflow card header shows total (e.g., "features · 7 total")
- Stage chips are clickable — clicking filters the table to show only that stage
- Active filter chip gets a visual highlight (brighter background/border)
- Click active chip again to deselect (back to showing all)
- Multiple chips can be selected simultaneously (OR filter)
- Default state: all entities visible, no filter active
- Filter persists across auto-refresh cycles (sessionStorage or URL param)
- Works for all workflows, not just build-pipeline
