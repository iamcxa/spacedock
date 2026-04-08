---
id: 042
title: Dashboard — Entity Activity Feed + Chat Input
status: plan
profile: standard
source: 035 plan scope triage — deferred from dashboard-collaboration-ui
started: 2026-04-09T03:30:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-dashboard-activity-feed
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Draft status

This entity is in `draft` stage — captured during 035 plan scope triage. FO will not auto-dispatch (`manual: true` on draft stage). Captain advances `status: draft → brainstorm` when ready.

## Problem

The entity detail page needs an entity-scoped activity feed showing only events for the current entity (not the global feed), with a chat input so the captain can send entity-targeted channel messages to the FO.

Currently:
- `GET /api/events` returns ALL events with no entity filter
- No chat input on the detail page
- FO replies appear as transient WS cards (not persisted in the feed)

## Scope

### 1. Server: entity filter for `/api/events`
- Add `?entity=<slug>` query param to `GET /api/events` in `server.ts`
- Filter `eventBuffer.getAll()` by `event.entity === slug` when param present

### 2. Detail page: entity activity feed panel
- New `#activity-feed` section below comment panel (or as a tab)
- On load: fetch `GET /api/events?entity=<slug>` and render event list
- WS handler: append new events when `event.entity` matches current entity
- Filter bar: Type, Stage, Author dropdowns (AND logic)

### 3. Chat input
- Textarea + send button at bottom of activity feed
- POST to channel with `meta: { type: "captain_message", entity: slug }`
- Sent messages appear immediately in the feed

## Dependencies

- 035 (Dashboard Collaboration UI) — layout foundation
- 033 (MCP Tools) — channel message routing

## Acceptance Criteria

- Activity feed shows only current entity's events
- New events appear in real-time via WS
- Chat input sends entity-scoped channel message
- Filter bar filters by type/stage/author
