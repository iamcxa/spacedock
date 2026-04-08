---
id: 035
title: Dashboard Collaboration UI — Entity Detail Review + Version History
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP5)
started: 2026-04-09
completed:
verdict:
score: 0.8
worktree: .worktrees/spacedock-ensign-dashboard-collaboration-ui
issue:
pr:
intent: feature
scale: Large
project: spacedock
---

## Dependencies

- 032 (SQLite Snapshots) — version history UI needs snapshot API
- 033 (MCP Tools) — real-time updates need MCP tool events

## Problem

The dashboard entity detail page is currently read-only display. Brainstorm collaboration requires it to be an interactive review surface: captain comments on spec sections, FO responds, versions are tracked, and rollback is possible.

## Scope

### 1. Entity Detail Page — 3-Panel Layout
Restructure existing detail page (`detail.html`, `detail.js`, `detail.css`):
- **Left**: Phase nav sidebar (existing, minor updates for brainstorm stage + approve button)
- **Center**: Spec panel (markdown render with text selection → add comment)
- **Right**: Comment panel (Notion-style threaded comments)
- **Bottom**: Entity activity feed with chat input + filters

### 2. Comment Panel (Notion-style)
Upgrade existing comment UI:
- Open threads sorted by time (newest first)
- Resolved threads collapsed with one-liner + resolve reason, expandable
- Manual resolve/unresolve buttons on each thread
- Auto-resolved threads labeled with reason (`section_updated`) and version
- Markdown rendering in comment content
- `selected_text` as blockquote at top of comment
- Multi-user support (author name + role display)

### 3. Text Selection → Add Comment
New JS interaction on spec panel:
- User selects text in rendered spec → popup appears with "Add Comment" button
- Popup captures `selected_text` and determines `section_heading` from DOM
- Creates comment via existing `/api/entity/comment` endpoint

### 4. Version History View
New panel (replaces spec panel when `[History]` toggled):
- Version timeline list (all versions with author, reason, timestamp)
- Diff picker: select any two versions to compare
- Section-aware diff rendering (unchanged collapsed, changed show inline diff)
- Per-changed-section `[⏪]` rollback button
- Rollback confirmation dialog with conflict warning

### 5. Permission Request UI
Enhance existing permission UI for `update_entity` operations:
- Show diff preview for body replacement and section remove
- Approve/deny buttons
- Reuses existing permission infrastructure from channel.ts

### 6. Entity Activity Feed
- Entity-scoped (filtered to this entity's events)
- Chat input at bottom (sends channel message with `meta.entity`)
- Filter bar: Stage, Type, Author dropdowns

### 7. Global Feed Filters (Home Page)
- Filter bar: Entity, Stage, Type, Author multi-select dropdowns
- AND logic for stacked filters
- URL querystring reflects active filters (shareable)

### 8. Brainstorm Gate UI
- `[Approve]` button in phase nav during brainstorm gate
- Profile display (shows current or recommended profile)

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 5 (Comment Lifecycle), Section 6 (Dashboard UI Changes).

## Acceptance Criteria

- Entity detail page renders in 3-panel layout
- Text selection on spec creates section-targeted comments
- Comment panel shows open/resolved threads with resolve/unresolve
- Auto-resolved comments display reason and version
- Version history shows timeline with diff between any two versions
- Section-level rollback works from version history UI
- Rollback confirmation shows conflict warning
- Permission request shows diff preview for body/remove operations
- Entity activity feed shows only this entity's events
- Chat input sends entity-scoped channel messages
- All feed filters work (stage, type, author)
- Global feed filters work with AND logic and URL querystring
- Brainstorm approve button triggers gate approval
