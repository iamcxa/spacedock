---
id: 038
title: Dashboard Phase Nav — Progress State + Notion-style Layout
status: needs-brainstorm
source: captain UI review during 030/032/037 dispatch
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: enhancement
scale: Medium
project: spacedock
---

## Status: needs-brainstorm

**DO NOT auto-dispatch.** This entity captures UI feedback that needs captain brainstorm before any implementation work begins.

## Problem (raw captain feedback)

The current phase nav sidebar (added in 029 dashboard-phase-navigation, PR #18) doesn't communicate stage progress clearly:

1. **No done vs not-done distinction** — Visually all stages look the same. Captain can't tell at a glance which stages have completed for the entity.

2. **All stages clickable** — Currently every stage in the nav is a clickable link, including stages that haven't run yet (no content to show). Should only completed stages be clickable, with future stages as static labels.

3. **Layout preference** — Captain wants the phase nav style closer to Notion / similar platforms (sidebar list on the left with clear hierarchy and state indicators).

## Open questions for brainstorm

- What does "done" mean exactly? Has stage report? Has commit? Has artifacts?
- How to indicate stages with feedback cycles (executed multiple times)?
- Should the nav show pipeline profile (full/standard/express) so captain knows which stages are even applicable?
- Should skipped stages be shown grayed out, or hidden entirely?
- What does "Notion-style" specifically mean — page tree on left, breadcrumbs, collapsible sections?
- Does this also apply to the global entity list (entity index page)?

## Related entities

- **029 dashboard-phase-navigation** (shipped) — current implementation
- **035 dashboard-collaboration-ui** (queued) — would naturally include this work; needs brainstorm to decide if 038 folds into 035 or stays separate

## Next steps

When captain is ready: invoke brainstorm — this entity is a candidate for path A (interactive design) since it involves visual/UX decisions captain wants control over.
