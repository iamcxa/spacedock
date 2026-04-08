---
id: 039
title: Dashboard Gate Review — Redesign for Brainstorm Era
status: needs-brainstorm
source: captain UI review during 030/032/037 dispatch — gate review feels too simple
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: enhancement
scale: Large
project: spacedock
---

## Status: needs-brainstorm

**DO NOT auto-dispatch.** This entity captures UI feedback that needs captain brainstorm before any implementation work begins.

## Problem (raw captain feedback)

The current Gate Review UI (added in 026 dashboard-gate-approval) is just two buttons: Approve / Request Changes. Based on the work done in spec `2026-04-08-pipeline-brainstorm-profiles-design.md` (brainstorm stage + dashboard collaboration), the gate review concept needs to be reframed and expanded.

The current model is binary — Captain approves or rejects. The new model should support:

- **Profile gate** (after brainstorm): Captain approves the recommended profile, can override (express → standard, etc.), or split entity
- **Plan gate** (after plan): Captain reviews the implementation plan, can comment on specific steps via comment panel, can approve/reject/request modifications
- **Quality/PR gates**: Same as today but with diff preview integration
- **Permission gates** (new): For `update_entity` with body replacement — captain sees diff before FO applies the change

## Open questions for brainstorm

- Should there be a unified "gate" concept or different gate types for different stages?
- How does the gate review surface relate to:
  - Comment panel (section-targeted feedback)
  - Activity feed chat input (general entity discussion)
  - Permission request UI (diff preview for body changes)
- Should gate decisions support intermediate states beyond approve/reject?
  - "Approve with concerns" — proceed but add tracked comments
  - "Defer" — not now, but not rejected; ensign waits
  - "Escalate" — needs deeper discussion, switches to brainstorm path A
- How are gate decisions logged in the version history / activity feed?
- Captain mentioned this in context of multi-user — should other reviewers also be able to gate?
- Auto-advance vs explicit gate: when quality stage runs and passes, should there be a "review pass" gate event captain sees, or silent advance?

## Related entities

- **026 dashboard-gate-approval** (shipped) — current implementation
- **035 dashboard-collaboration-ui** (queued) — gate review UI is part of this work package; brainstorm decides if 039 folds in or stays separate
- **033 dashboard-mcp-tool-expansion** (queued) — `update_entity` permission flow is the new "permission gate" type

## Next steps

When captain is ready: invoke brainstorm — this entity needs path A (interactive design discussion) because it touches multiple UX surfaces and architectural decisions about how gates work in the new collaboration model.
