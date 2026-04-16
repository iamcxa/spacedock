---
id: 117
title: "Spacebridge Design System -- Dark-Mode-First Tokens + Component Library + Theme Toggle"
status: draft
context_status: none
source: entity 060 shape (US-2, 2026-04-16)
created: 2026-04-16T20:00:00+08:00
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

Ship a coherent design system for Spacebridge: dark mode as default theme on first load, consistent typography scale, spacing scale, and component library with theme-toggle capability. All Spacebridge UI components must consume design tokens (no hardcoded hex or absolute-pixel values outside the token file). Architecture doc must include a "cloud multi-tenant compatibility" note confirming no hostname or session coupling in the token/component layer (US-7 compatibility with entity 100).

## Captain Context Snapshot

Spawned from entity 060 shape work (2026-04-16). Captain pain: "顏色不對 — 應該要是 dark mode" + "UX 不好". US-2 expanded from dark-mode to full design system per captain directive. US-7 requires 100-compatibility in architecture.

Domain: `spacebridge-ui-design-system`.
