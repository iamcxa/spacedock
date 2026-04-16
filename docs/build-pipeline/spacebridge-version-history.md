---
id: 121
title: "Spacebridge Version History -- Entity Timeline + Diff View Parity"
status: draft
context_status: none
source: entity 060 shape (US-1 parity, 2026-04-16)
created: 2026-04-16T20:04:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
parent: 060
children:
depends-on: []
---

## Directive

Port the legacy dashboard's entity version history / timeline view to Spacebridge's Next.js UI. The legacy version shows entity state changes over time (stage transitions, gate decisions, comments, commits). The new version should provide equivalent or better functionality, rendering the entity's event history from the events table with timestamps, diffs between versions, and stage transition markers.

## Captain Context Snapshot

Spawned from entity 060 shape work (2026-04-16). Legacy dashboard has version history rendering; Spacebridge needs equivalent for parity audit (US-1) before cutover PR can merge.

Domain: `spacebridge-ui-parity`.
