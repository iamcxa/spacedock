---
id: 036
title: Pipeline Brainstorm + Profiles — Integration & E2E
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP6)
started:
completed:
verdict:
score: 0.7
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- 031 (Pipeline Definition)
- 032 (SQLite Snapshots)
- 033 (MCP Tools)
- 034 (FO Dispatch Logic)
- 035 (Dashboard UI)

## Problem

Individual work packages (031-035) build isolated components. Integration testing verifies they work together as a complete brainstorm + profile system end-to-end.

## Scope

### 1. Brainstorm Flow E2E
- Create test entity → FO triage → executability assessment
- Express path: 5/5 entity → profile assigned → skips to execute
- Path B: ensign dispatched → analysis posted → captain reviews on dashboard
- Path A: superpowers:brainstorming invoked → spec produced → profile assigned

### 2. Dashboard Collaboration Loop
- Captain comments on spec section → FO notified via channel → FO reads comment → FO updates section → comment auto-resolved → captain sees update + resolved thread

### 3. Version History + Rollback
- Multiple FO updates → captain opens version history → diff between versions → section rollback → verify new version created → verify warning on cross-reference

### 4. Profile Routing
- Express entity: brainstorm → execute → quality → shipped (skips 8 stages)
- Standard entity: brainstorm → explore → plan → execute → quality → pr-draft → pr-review → shipped
- Full entity: all 12 stages
- Mid-pipeline profile change: add e2e to standard entity → verify it runs after quality

### 5. Entity Split
- Entity enters brainstorm → captain decides to split → FO creates children → parent marked split → children dispatched independently

### 6. Permission Flow
- FO calls update_entity with body → permission request appears in dashboard → captain approves → update applied
- Captain denies → update rejected → FO notified

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — all sections.

## Acceptance Criteria

- Full brainstorm flow completes for all 3 paths (A/B/C)
- Express entity completes pipeline with only 4 stages
- Dashboard comment → FO response → spec update loop works end-to-end
- Version diff + section rollback works from dashboard UI
- Entity split creates valid child entities that enter pipeline independently
- Permission request for body replacement works through dashboard
- Profile change mid-pipeline only affects forward stages
