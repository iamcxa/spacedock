---
id: 010
title: Dashboard Feed Persistence — localStorage History for Activity Feed
status: pr-draft
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
