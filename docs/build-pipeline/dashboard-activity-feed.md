---
id: 042
title: Dashboard — Entity Activity Feed + Chat Input
status: explore
profile: standard
source: 035 plan scope triage — deferred from dashboard-collaboration-ui
started: 2026-04-09T03:30:00Z
completed:
verdict:
score: 0.0
worktree:
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

## Coverage Infrastructure

- **Test framework**: `bun:test` (built-in, no vitest/jest)
- **Coverage command**: `bun test --coverage` (Bun native coverage, no separate script in package.json)
- **Coverage format**: Bun outputs text summary to stdout; no Istanbul JSON or LCOV files configured
- **Comparison script**: None found in `scripts/` or `.github/scripts/`
- **Baseline strategy**: No baseline file committed; no CI cache for coverage
- **Existing test files**: `server.test.ts`, `channel.test.ts`, `events.test.ts` (plus auth, comments, db, diff-utils, discovery, entity-resolver, frontmatter-io, gate, parsing, permission-tracker, snapshots)
- **Test pattern for new feature**: Follow `server.test.ts` — `createServer({dbPath: join(TMP, "test.db")})` with explicit temp db path to avoid prod DB pollution

## Stage Report: explore

1. **File list grouped by layer** — DONE

   **Domain / Server**
   - `tools/dashboard/src/server.ts` (1254 lines) — Bun HTTP server; GET /api/events has no entity filter (primary gap); POST /api/channel/send routes captain messages to FO
   - `tools/dashboard/src/events.ts` (91 lines) — EventBuffer with SQLite; `getAll()`/`getSince()` lack entity filter; adding `getByEntity(slug)` is the clean path
   - `tools/dashboard/src/channel.ts` (611 lines) — MCP channel server; `reply` tool publishes `channel_response` with optional entity slug; `forwardToCtlServer()` bridges two-instance WS gap

   **Types**
   - `tools/dashboard/src/types.ts` — `AgentEventType` union and `AgentEvent` interface; no changes needed for 042

   **Frontend / View**
   - `tools/dashboard/static/detail.html` — 3-column layout; right aside = comments panel; activity feed panel + chat input must be added (tab pattern recommended)
   - `tools/dashboard/static/detail.js` (1796 lines) — WS onmessage in `initGateReview()` IIFE; `channel_response` renders transient card in `#comment-threads` (no entity filter, no persistence); `entityPath` global available at line 27
   - `tools/dashboard/static/detail.css` — styles for comments panel; new `.activity-feed` styles needed

   **Tests**
   - `tools/dashboard/src/server.test.ts` — integration tests against real HTTP server; pattern to follow for entity filter tests
   - `tools/dashboard/src/events.test.ts` — unit tests for EventBuffer; should add `getByEntity` tests here

2. **Context lake insights stored** — DONE
   Insights stored for: server.ts, events.ts, detail.js, detail.html, types.ts, channel.ts

3. **Scale confirmation** — DONE
   Confirmed Medium. 6 files touched across 3 layers (server, events, frontend). No new modules needed. Largest changes: server.ts (+~10 lines), events.ts (+~15 lines), detail.js (+~80 lines), detail.html (+~20 lines), detail.css (+~30 lines).

4. **Coverage infrastructure** — DONE (see ## Coverage Infrastructure above)

5. **Existing patterns identified** — DONE

   **Event filtering**: None exists today. `GET /api/events` returns all events. Pattern to add: `const entity = url.searchParams.get("entity"); const events = entity ? eventBuffer.getByEntity(entity) : eventBuffer.getAll();`

   **WS message handling**: `connectDetailWs()` in IIFE at detail.js:925. All event routing in `detailWs.onmessage` at line 932. Pattern: `if (event.type === 'X' && event.entity === currentSlug) { ... }`. `currentSlug` derived from `entityPath` global (same pattern as line 961).

   **Chat/channel integration**: `/api/channel/send` endpoint (server.ts:606) already handles `{content, meta}` POST. Captain sends here; `onChannelMessage` callback forwards to FO via MCP. No new endpoint needed — chat input just POSTs to existing `/api/channel/send` with `meta: {entity: currentSlug}`.

6. **Gaps and risks** — DONE

   - **No entity filter in GET /api/events** — confirmed gap, straightforward fix
   - **channel_response has no entity scoping in WS handler** (detail.js:970) — currently ALL FO replies show regardless of which entity page you're on; 042 fixes this by filtering `event.entity === currentSlug` before rendering in activity feed
   - **captain_message type**: spec says `meta: {type: "captain_message"}` but server.ts maps all non-permission_response channel sends to `channel_message` type. Either use `channel_message` type consistently or add `captain_message` to VALID_EVENT_TYPES. Recommend: use `channel_message` type (already valid), no new type needed.
   - **Two-instance WS bridge**: channel.ts events published to channel server (8420) are forwarded to ctl server (8421) via `forwardToCtlServer()` — activity feed on ctl UI will see channel events correctly
   - **No bun:test coverage baseline** — no comparison infrastructure; plan stage should note this is new test coverage only
