---
id: 119
title: "Spacebridge Entity Body Editor -- Full Render + Edit Parity with Legacy detail.html"
status: draft
context_status: none
source: entity 060 shape (US-1 parity, 2026-04-16)
created: 2026-04-16T20:02:00+08:00
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

Ensure Spacebridge's entity detail page (`spacebridge/ui/app/entity/[slug]/page.tsx`) reaches full render + interaction parity with the legacy `tools/dashboard/static/detail.html`. Scope includes: stage report rendering, brainstorming spec sections, assumptions/options/questions display, inline comment threads, markdown rendering fidelity, and any interactive features present in the legacy detail page. Identify gaps via parity audit (entity 060 US-1) and close them.

## Captain Context Snapshot

Spawned from entity 060 shape work (2026-04-16). Captain reports "UI 與舊版不符合". Legacy detail.html has rich entity body rendering; Spacebridge has entity detail but completeness unverified. Entity 047 (entity body rendering hotfixes) shipped for legacy; need equivalent quality in Spacebridge.

Domain: `spacebridge-ui-parity`.
