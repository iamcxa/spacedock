---
id: 002
title: Entity Detail & Management UI
status: execute
source: commission seed
started: 2026-04-04T02:55:00Z
completed:
verdict:
score: 0.8
worktree: .worktrees/ensign-entity-detail-management-ui
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Brainstorming Spec

APPROACH:     Extend the workflow dashboard with entity detail views — click an entity to see its full markdown content rendered, stage reports, metadata, and body sections. Add basic management: triage classification, priority adjustment, and stage filtering.
ALTERNATIVE:  Separate detail app with its own server (rejected: fragmented UX, two ports to manage)
GUARDRAILS:   Entity files are the source of truth — UI reads markdown, does not maintain a separate database. Any management actions write back to the markdown files. Must handle different entity schemas across workflows.
RATIONALE:    Builds on dashboard foundation. Read-then-write pattern keeps markdown files as SOT while giving a visual management layer for workflows like email triage and financial analysis.

## Acceptance Criteria

- Click entity row in dashboard → detail view with rendered markdown body
- Stage report sections (`## Stage Report: *`) rendered with checklist formatting
- Metadata panel showing all frontmatter fields
- Classification/tagging support for triage workflows (writes tags to entity frontmatter)
- Priority score adjustment (slider or input, writes to `score:` field)
- Filter entities by stage, score range, or custom tags
- Back navigation to workflow overview
