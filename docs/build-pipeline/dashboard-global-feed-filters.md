---
id: 043
title: Dashboard — Global Feed Filters (Home Page)
status: draft
source: 035 plan scope triage — deferred from dashboard-collaboration-ui
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Draft status

This entity is in `draft` stage — captured during 035 plan scope triage. FO will not auto-dispatch (`manual: true` on draft stage). Captain advances `status: draft → brainstorm` when ready.

## Problem

The home page activity feed (`index.html` / `app.js`) shows all events with no filtering. As the pipeline grows, captains need to focus on specific entities, stages, types, or authors.

## Scope

### 1. Filter bar UI (home page)
- Multi-select dropdowns: Entity, Stage, Type, Author
- AND logic: stacked filters narrow results
- URL querystring reflects active filters (e.g. `?entity=035&stage=build&type=comment`) — shareable links

### 2. Client-side filter application
- Filters apply to already-loaded events (no server round-trip needed for initial filter)
- WS events filtered before appending to feed
- "Clear filters" button resets all

### 3. URL state persistence
- On page load: read querystring → apply filters automatically
- On filter change: update querystring via `history.replaceState`

## Dependencies

- None — entirely in `app.js` / `index.html` / `style.css`

## Acceptance Criteria

- Filter bar renders on home page with Entity/Stage/Type/Author dropdowns
- Stacked filters apply AND logic to event list
- Active filters reflected in URL querystring
- Sharing the URL reproduces the same filtered view
- Clear filters restores unfiltered view
