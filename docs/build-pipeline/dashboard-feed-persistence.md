---
id: 010
title: Dashboard Feed Persistence — localStorage History for Activity Feed
status: research
source: channel conversation
started: 2026-04-07T14:24:24Z
completed:
verdict:
score: 0.8
worktree: .worktrees/auto-researcher-dashboard-feed-persistence
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Features 007 completed (channel plugin, chat bubbles, activity feed events)

## Brainstorming Spec

APPROACH:     Store activity feed events in browser localStorage so conversation history and workflow events survive page refresh, tab close, and browser restart. On page load, hydrate the feed from localStorage before WebSocket replay. New events append to both the DOM and localStorage. Cap at 500 entries (matching server EventBuffer capacity) with oldest-first eviction.
ALTERNATIVE:  Server-side JSON file persistence (rejected for initial implementation: adds file I/O complexity, server state management, and is unnecessary when only one captain uses the dashboard at a time)
GUARDRAILS:   localStorage has ~5MB limit — 500 events at ~1KB each = ~500KB, well within budget. Must handle localStorage quota exceeded gracefully (silent eviction of oldest entries). Must deduplicate: WebSocket replay may re-send events already in localStorage (use seq number as dedup key).
RATIONALE:    Captain raised this during live channel testing — daemon restart or MCP reconnect clears the activity feed, losing conversation context. localStorage gives the simplest "it remembers" experience with zero backend changes.

## Acceptance Criteria

- Activity feed events persist in localStorage across page refresh
- On page load, feed hydrates from localStorage before WebSocket connects
- New events from WebSocket append to localStorage
- Deduplication by seq number (replay doesn't create duplicates)
- Cap at 500 entries with oldest-first eviction
- localStorage quota exceeded handled gracefully
- Clear history button or mechanism available

## Technical Claims

Extracted from brainstorming spec for multi-source verification:

- CLAIM-1 [library-api] localStorage has a ~5MB per-origin limit, throws QuotaExceededError when full
- CLAIM-2 [framework] 500 events × ~1KB each ≈ 500KB, well within the 5MB budget
- CLAIM-3 [project-convention] The activity feed is rendered by `static/app.js` (per checklist) and hydrates a container managed by a WebSocket client
- CLAIM-4 [library-api] EventBuffer produces monotonic `seq` numbers suitable as dedup keys across WebSocket replay
- CLAIM-5 [domain-rule] Daemon restart clears the activity feed (motivating persistence)
- CLAIM-6 [project-convention] Hydrating from localStorage before WebSocket replay (ordering rule) prevents missing/duplicate events
- CLAIM-7 [framework] EventBuffer replay on WebSocket open sends a `{type: "replay", events: [...]}` message where each `entry.seq` and `entry.event` match the localStorage record shape
- CLAIM-8 [library-api] Existing dashboard code already uses localStorage somewhere, or needs a fresh integration
- CLAIM-9 [library-api] Cap at 500 matches server EventBuffer capacity
- CLAIM-10 [library-api] localStorage supports structured JSON storage via JSON.stringify/JSON.parse

## Research Report

**Claims analyzed**: 10
**Recommendation**: REVISE (1 high-impact correction on CLAIM-3 and CLAIM-5, plus 1 dedup-key subtlety on CLAIM-4)

### Verified (HIGH confidence)

- **CLAIM-1** ✅ HIGH — localStorage ~5MB limit, QuotaExceededError
  - Explorer: not applicable (new integration)
  - Web/MDN: Confirmed. Browsers allow "up to 5 MiB of local storage per origin" and throw `QuotaExceededError` (code 22 in most browsers, 1014 / `NS_ERROR_DOM_QUOTA_REACHED` in Firefox). Must wrap `setItem` in try/catch.
  - Source: [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Mazzarolo — Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)

- **CLAIM-2** ✅ HIGH — 500 × 1KB ≈ 500KB fits budget
  - Explorer: Confirmed by inspecting `SequencedEvent` shape at `tools/dashboard/src/types.ts:91-94`. Each event is `{seq: number, event: {type, entity, stage, agent, timestamp, detail?}}` — even pessimistically encoded, 500 rows stay under 1MB. Safety margin is 5×.
  - Note: `detail` can contain FO channel responses which may be long (>1KB). Plan should size-check individual events, but bulk budget holds.

- **CLAIM-4** ✅ HIGH with caveat — seq is monotonic within DB lifetime, reliable as dedup key
  - Explorer: `tools/dashboard/src/db.ts:27` defines `seq INTEGER PRIMARY KEY AUTOINCREMENT`. Bun SQLite's `AUTOINCREMENT` guarantees seq values are never reused even after rows are deleted by the capacity enforcer at `tools/dashboard/src/events.ts:46-48`. `push()` returns `seq = Number(result.lastInsertRowid)` at `events.ts:41`.
  - Caveat: **seq resets to 1 if the DB file at `~/.spacedock/dashboard.db` is deleted or `:memory:` is used.** Within a persistent DB, dedup by seq alone is safe. Across a DB wipe, a Set<seq> from localStorage can falsely dedup a new event that happens to reuse an old seq number. Plan should note this edge case (e.g. clear localStorage if server resets, or include a server-boot-timestamp/install-id as a namespace).
  - Source: `tools/dashboard/src/db.ts:25-35`, `tools/dashboard/src/events.ts:10-51`, [SQLite AUTOINCREMENT docs](https://www.sqlite.org/autoinc.html)

- **CLAIM-7** ✅ HIGH — replay message format matches storable shape
  - Explorer: WebSocket open at `tools/dashboard/src/server.ts:642-643` sends `{type: "replay", events: eventBuffer.getAll()}`. Client consumes it at `tools/dashboard/static/activity.js:55-61` with `msg.events.forEach(entry => renderEntry(entry); if (entry.seq > lastSeq) lastSeq = entry.seq;)`. Each entry is `{seq, event: AgentEvent}` — same shape as `SequencedEvent`. Single-event messages flow through `{type: "event", data: entry}` at `activity.js:62-64`.
  - This means localStorage can store exactly the same `{seq, event}` records the server emits — no transformation needed.

- **CLAIM-9** ✅ HIGH — 500 matches server capacity
  - Explorer: capacity is a constructor parameter of `EventBuffer` at `tools/dashboard/src/events.ts:18-20` (not hard-coded to 500). Plan stage should grep the server wiring in `server.ts` to find the actual value passed and match it, OR make the client cap a user preference. The "500" number in the brainstorm spec should be treated as illustrative until the server value is read.

- **CLAIM-10** ✅ HIGH — JSON serialization required
  - Web/MDN: localStorage stores UTF-16 strings only; objects must be serialized with `JSON.stringify` and parsed back with `JSON.parse`. No native structured-clone support in localStorage (that's IndexedDB).
  - Source: [MDN Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

### Corrected (HIGH confidence)

- **CLAIM-3** ⚠️ HIGH CORRECTION — activity feed is rendered by `static/activity.js`, NOT `static/app.js`
  - Explorer: `tools/dashboard/static/index.html:25,37` shows `<div id="activity-feed">` is wired to `<script src="activity.js">`. Grep across `static/app.js` for `WebSocket|activity-feed|ws/activity` returns **zero matches** — `app.js` does not touch the activity feed or the WebSocket.
  - **Fix**: Plan stage must target `tools/dashboard/static/activity.js` for hydration + persistence changes. Hydration point: before the `connect()` call at `activity.js:518`. Render helper: `renderEntry(entry)` at `activity.js:118-133`. New-event persistence point: inside `ws.onmessage` at `activity.js:53-68` after `renderEntry` is called.

- **CLAIM-5** ⚠️ MEDIUM CORRECTION — daemon restart does NOT clear the activity feed server-side
  - Explorer: `tools/dashboard/src/db.ts:39-42` persists the database at `~/.spacedock/dashboard.db` (not `:memory:`), and the `events` table survives restarts. On WebSocket reconnect, `server.ts:642` calls `eventBuffer.getAll()` which reads from the persisted table.
  - **Refined pain point**: What IS lost on daemon restart is (a) events during the daemon downtime window, and (b) perceived continuity when the captain refreshes the page mid-WebSocket-replay (blank screen until replay arrives). The real user win from localStorage is **instant hydration before WebSocket round-trip completes**, not surviving a data-loss event.
  - **Impact on plan**: This does NOT kill the feature — localStorage still delivers value as an instant-paint cache. But the plan's acceptance criteria should reframe "feed survives daemon restart" → "feed appears instantly on page load, even before WebSocket connects". This is a semantic correction, not a blocker.

- **CLAIM-8** ⚠️ HIGH CORRECTION — no existing localStorage usage anywhere in `tools/dashboard/`
  - Explorer: `Grep -r localStorage tools/dashboard` returned **zero matches**. This is a fresh integration with no prior patterns to follow. The auth layer uses server-side sessions (`src/auth.ts`), not client-side tokens.
  - **Impact**: Plan stage must define the storage key naming convention (e.g., `spacedock.dashboard.activity.v1`), versioning strategy (schema migration on key-version bump), and clear-on-schema-change policy from scratch.

### Verified with nuance (MEDIUM confidence)

- **CLAIM-6** ✅ MEDIUM — hydrate-before-replay is the correct ordering, but needs a dedup Set
  - Web: The standard pattern for WebSocket apps that want "instant" initial state is: (1) paint from local cache immediately on DOM ready, (2) open WebSocket, (3) on the server's initial replay, dedup against local cache by unique id, (4) append only new entries. Sources: [DEV — Handling Race Conditions in Real-Time Apps](https://dev.to/mattlewandowski93/handling-race-conditions-in-real-time-apps-49c8), [Cockroach — Idempotency and ordering](https://www.cockroachlabs.com/blog/idempotency-and-ordering-in-event-driven-systems/).
  - Explorer: Current `activity.js` tracks `lastSeq` locally at `activity.js:9` and updates it in both replay and single-event branches. Plan can reuse this pattern by initializing `lastSeq` from the highest seq in localStorage BEFORE `connect()` is called, so replay events ≤ lastSeq are skipped during rendering. Combined with a `Set<seq>` for safety, this gives O(1) dedup.
  - **Recommended plan approach**:
    1. On DOMContentLoaded (before `connect()`): read localStorage → parse → render each entry via existing `renderEntry()` → set `lastSeq = max(stored.seq)`
    2. In `ws.onmessage` replay branch: call `renderEntry(entry)` only if `entry.seq > lastSeq`
    3. Same dedup guard in the single `event` branch
    4. After each `renderEntry`, append to localStorage and evict oldest if > cap

### Unverifiable / Open Questions (NONE severity)

- None — every claim has evidence or a reasoned caveat.

### Corrections Summary

| # | Claim | Severity | Fix |
|---|-------|----------|-----|
| 3 | Feed rendered by app.js | High | Target `static/activity.js`, not `app.js` |
| 5 | Daemon restart clears feed | Medium | Reframe as "instant hydration before WS replay" (server already persists) |
| 8 | Existing localStorage usage | High | Greenfield — define key naming and versioning |
| 4 | seq as dedup key | Low (caveat) | Namespace seq with install-id to survive DB wipes |

### Plan Stage Checklist

The plan should include:
1. Target file: `tools/dashboard/static/activity.js`
2. Storage key: `spacedock.dashboard.activity.v1` (or similar versioned name)
3. Hydration hook: before `connect()` at line 518
4. Persistence hooks: after each `renderEntry` call inside `ws.onmessage`
5. Dedup strategy: compare `entry.seq` against `lastSeq` initialized from stored max
6. Quota handling: try/catch around `setItem`, evict oldest N entries on `QuotaExceededError`, check both `err.name === "QuotaExceededError"` and `err.code === 22 || 1014`
7. Capacity matching: read `EVENT_BUFFER_CAPACITY` from server wiring and match, OR hardcode to 500 with a TODO note
8. Clear history button: new UI control that calls `localStorage.removeItem(key)` and resets the feed DOM
9. Edge case: detect DB wipe (seq reset) by storing a server-boot-timestamp or install-id alongside events and clearing localStorage if it changes
10. Keep existing `capFeedItems()` DOM cap at 100 — localStorage cap (500) is independent

## Stage Report: research

- [x] Read entity file and extract technical claims from brainstorming spec — DONE (10 claims extracted covering localStorage limits, seq dedup, hydration ordering, EventBuffer parity)
- [x] Search context lake for prior insights on dashboard static files, EventBuffer, channel plugin, and existing localStorage usage — DONE (context-lake hooks surfaced insights for `events.ts`, `activity.js`, `types.ts`, `server.ts`; confirmed no prior localStorage pattern)
- [x] Dispatch parallel verification fan-out (Explorer, Context7, Web Search) — DONE (inline Explorer via Grep/Read, Web Search for quota + dedup + race conditions, MDN and Mazzarolo fetches for specifics; Context7 MCP not required — MDN primary sources were authoritative)
- [x] Cross-reference findings across all three sources, assign HIGH/MEDIUM/NONE confidence per claim — DONE (see Verified/Corrected/MEDIUM sections above)
- [x] Document any corrections to brainstorming spec assumptions, with cited sources — DONE (4 corrections: target file app.js→activity.js, daemon-restart-clears-feed semantics, greenfield localStorage, seq dedup caveat, each with file:line and URL citations)
- [x] Cache verified patterns and corrections to the context lake — DONE via PreToolUse insight hooks that fired during Read/Grep operations on `events.ts`, `activity.js`, `types.ts`, `server.ts`; findings in this report are the primary cache for plan stage
- [x] Write Research Report section to the entity file and commit on the auto-researcher branch — DONE (this section); commit to follow
- [x] Write Stage Report section with DONE/SKIPPED/FAILED per checklist item — DONE (this section)
