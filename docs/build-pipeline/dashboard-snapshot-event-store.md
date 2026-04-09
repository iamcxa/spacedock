---
id: 044
title: Dashboard — Snapshot Event Store (fmodel) + Diff Engine Fix
status: draft
source: session testing — v5 diff always shows same "### Summary modified" due to heading collision
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
---

## Draft status

This entity is in `draft` stage — captured during captain testing of version history. FO will not auto-dispatch (`manual: true` on draft stage). Captain advances `status: draft → brainstorm` when ready.

## Problem

### 1. Duplicate heading collision in diff engine

`diffVersions()` in `snapshots.ts` uses `new Map(sections.map(s => [s.heading, s]))` to compare sections between versions. When an entity has duplicate heading names (e.g., two `### Summary` under different parent sections like `## Stage Report: explore` and `## Stage Report: research`), the Map keeps only the last entry — the first is silently dropped.

**Observed**: comparing any version pair for entity 008 always shows `### Summary: modified` because the Map collision mixes Summary sections from different Stage Reports. Captain reported: "不管是 v5 跟哪一個版本比較，diff 都是一樣的".

**Root cause**: heading text is not a unique key within an entity. `parseSections()` returns flat sections without parent context.

### 2. Architectural question: fmodel event store

Current snapshot store captures pre-write state as full-body snapshots in SQLite. This is simple but has limitations:
- No concept of "what changed" — only full snapshots, diff is computed on read
- Snapshot-per-write is wasteful for frontmatter-only updates (body identical)
- No event replay capability — can't reconstruct "who changed what when" timeline
- Rollback is section-level (good) but stored as a full-body snapshot (wasteful)

**Alternative**: fmodel-style event sourcing where entity changes are stored as typed events (FrontmatterUpdated, SectionAppended, SectionReplaced, SectionRemoved, Rollback) and the current state is derived by replaying events. This would:
- Naturally solve the duplicate heading problem (events reference sections by index/path, not heading text)
- Enable granular "who changed what" audit trail
- Make diff computation trivial (compare event payloads, not full-body diffs)
- Support undo/redo at the operation level, not just section rollback
- Align with the dashboard's existing event-driven architecture (EventBuffer, WS events)

**Trade-off**: fmodel adds conceptual complexity (event → state projection, snapshot materialization for read performance). The current full-body snapshot is simple and "good enough" for small entities. fmodel pays off when entities are large or frequently updated.

## Scope

### Phase A: Fix duplicate heading collision (minimal)
- Change `parseSections` to return parent-prefixed keys (e.g., `## Stage Report: explore > ### Summary`)
- Or use index-based keys in `diffVersions` Map
- Update rollback to use the same key scheme
- Backward-compatible with existing snapshots

### Phase B: Evaluate fmodel event store (spike)
- Prototype: define event types for entity mutations
- Prototype: event → state projection function
- Benchmark: compare read/write performance vs current full-body snapshots
- Decision gate: captain reviews spike results before committing to migration

### Phase C: Migration (if Phase B approved)
- Replace `SnapshotStore.createSnapshot` with `EventStore.append(event)`
- Replace `SnapshotStore.diffVersions` with event-based diff
- Replace `SnapshotStore.rollbackSection` with compensating event
- Migrate existing snapshots to events (one-time conversion)
- Update version-history.js to render event timeline instead of snapshot timeline

## Dependencies

- 035 (Dashboard Collaboration UI) — version history panel foundation
- 033 (MCP Tools) — update_entity creates snapshots

## Acceptance Criteria

### Phase A
- Entities with duplicate section headings produce correct per-section diffs
- Rollback targets the correct section even when headings are duplicated
- Existing snapshots continue to work (backward compatible)

### Phase B
- Spike document comparing fmodel vs current approach
- Performance benchmarks for read/write/diff operations
- Captain decision: proceed to Phase C or keep current approach

### Phase C (conditional)
- All entity mutations stored as events
- Version history shows event-level detail (not just full-body diff)
- Event replay produces identical state to current file
- Undo/redo at operation level
