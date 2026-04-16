---
id: 118
title: "Spacebridge Dependency Graph View -- Port Legacy dependency-graph.js to Next.js"
status: draft
context_status: none
source: entity 060 shape (US-1 parity, 2026-04-16)
created: 2026-04-16T20:01:00+08:00
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

Port the legacy dashboard's `tools/dashboard/static/dependency-graph.js` dependency visualization to Spacebridge's Next.js UI. The legacy version renders entity dependency relationships as an interactive graph. The new version should provide equivalent functionality using React components within the war room or a dedicated page, consuming the same entity frontmatter `depends-on` data via the existing API.

## Captain Context Snapshot

Spawned from entity 060 shape work (2026-04-16). Legacy dashboard has `dependency-graph.js` in `tools/dashboard/static/`; Spacebridge has no equivalent. Required for parity audit (US-1) before cutover PR can merge.

Domain: `spacebridge-ui-parity`.
