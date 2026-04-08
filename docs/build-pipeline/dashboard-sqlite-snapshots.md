---
id: 032
title: Dashboard SQLite Snapshot System — Entity Version History
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP2)
started: 2026-04-08
completed:
verdict:
score: 0.9
worktree: .worktrees/spacedock-ensign-dashboard-sqlite-snapshots
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None (independent module — blocks 033, 035)

## Problem

When FO updates entity specs during brainstorm collaboration, there's no version history. Captain can't see what changed, can't diff versions, and can't rollback bad updates. The only safety net is git, which doesn't provide section-level granularity.

## Scope

New `snapshots` module in dashboard:

1. **Schema**: `entity_snapshots` table in SQLite with version, body, frontmatter, author, reason, source (update/rollback/create), rollback metadata
2. **Core functions**: `createSnapshot()`, `getSnapshot()`, `listVersions()`, `diffVersions()` (section-aware)
3. **Section-level rollback**: Take section X content from version Y, apply to current doc, create new version
4. **HTTP API endpoints**: `GET /api/entity/versions`, `GET /api/entity/diff`, `POST /api/entity/rollback`
5. **Conflict detection**: Warning-only heuristic — list other sections modified between target version and current

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 4 (SQLite Snapshot System).

## Key Design Decisions

- Rollback is a new version (not undo) — always safe, can rollback the rollback
- Section-aware diff: parse markdown by headings, diff per section
- Warning-only conflict detection — never block rollback, just inform captain
- Snapshot created on every `update_entity` call — no opt-out

## Acceptance Criteria

- `entity_snapshots` table created and migrated
- `createSnapshot()` saves full document state with metadata
- `listVersions()` returns version timeline for an entity
- `diffVersions()` returns section-aware diff between any two versions
- Section-level rollback works: specify section heading + target version → new version created
- Rollback warns about other modified sections (non-blocking)
- HTTP API endpoints functional and tested
