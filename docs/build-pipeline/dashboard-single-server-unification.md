---
id: 045
title: Dashboard Single-Server Unification (ADR-001) — Eliminate ctl.sh and Unify on :8420
status: explore
source: /build brainstorming (spec 2026-04-09-adr-001-single-server-8420-design.md)
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
---

## Brainstorming Spec

**Full design:** `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md`

APPROACH:     Eliminate the standalone server (ctl.sh, port 8421) entirely. The dashboard runs only as the channel server on port 8420, spawned by Claude Code via MCP stdio transport. Delete `forwardToCtlServer()` WS bridge. Add `get_pending_messages` MCP tool so chat messages sent during MCP disconnect windows can be recovered by the FO on reconnect. Fix Activity feed UI polish (card margin, auto-scroll to latest).

ALTERNATIVE:  Coexistence model (2026-04-08 spec) — make ctl.sh detect and cooperate with the channel server, keep both running, maintain the WS bridge. REJECTED: research confirmed via Claude Code channels-reference that MCP channels MUST use stdio transport and cannot connect to a pre-existing HTTP server. The channel server is always spawned fresh by CC. Sharing a single OS process between standalone and channel modes is fundamentally impossible, so coexistence can only reduce (not eliminate) the cross-instance sync debt. Elimination is the only path to a single source of truth.

GUARDRAILS:
  - Dashboard will REQUIRE Claude Code running — no standalone fallback. Accepted trade-off documented in the spec.
  - Do not break existing `get_comments` / `add_comment` / `reply` / `update_entity` MCP tools — they already work via the channel transport and must continue to work.
  - Keep `mcp.notification({ method: "notifications/claude/channel" })` as the FAST path for chat → FO delivery. `get_pending_messages` is the RECOVERY path for MCP disconnect windows, not a replacement.
  - Existing dashboard test suite (195 tests) must pass. New tests cover `get_pending_messages` and auto-scroll.
  - `/dashboard share` skill already rewritten in commit `996adc4` to prefer channel port — after this entity lands, the fallback code can be removed since there's only one port.
  - No regression in dashboard UI functionality — Comments, Activity feed, version history, permission modals, gate review all continue to work.

RATIONALE:    Two-server architecture has produced a steady stream of bugs: the /dashboard share bug hit this session (ctl.sh polling wrong ngrok API endpoint), the var hoisting bug in detail.js activity feed, WS bridge silent failures, SQLite test pollution, port confusion in status output. Each fix just patches one symptom. The root cause is trying to maintain two independent server processes that share state via workarounds. Single-server eliminates the entire class. The trade-off (dashboard requires CC running) is actually aligned with the mental model — the dashboard is a war room for the CC session, it genuinely doesn't make sense without CC. The MCP stdio constraint is not a limitation to work around, it's a signal that we should commit to the channel-only architecture.

## Acceptance Criteria

- `tools/dashboard/ctl.sh` file is deleted; `grep -r ctl\.sh` returns no matches in source (docs may reference it historically)
- `forwardToCtlServer()` function and all call sites removed from `channel.ts`; `grep -rn 8421` returns no matches in tools/dashboard/src/ and skills/
- `/dashboard share` skill works against channel port 8420 with no fallback code path; existing flow from commit 996adc4 simplified to remove the `channel_port || port` dual lookup
- New MCP tool `get_pending_messages` is registered on the channel server and accepts `{ since_seq?: number, entity?: string }`, returns `{ messages: [...], last_seq: number }` filtered from EventBuffer on `type === "channel_message"`
- FO can reconnect after CC restart and call `get_pending_messages({ since_seq: last_known_seq })` to recover messages sent during the disconnected window — no channel_message events lost
- Activity feed cards (entity detail + homepage) have ≥8px vertical gap between adjacent cards
- Activity feed auto-scrolls to the latest message on initial load and on every WS realtime push; manual scroll-up by the user pauses auto-scroll for 3 seconds then resumes
- All existing dashboard tests pass (195 baseline); new tests added for `get_pending_messages` and auto-scroll behavior
- FO startup check in `references/first-officer-shared-core.md` line 21 updated to detect MCP transport instead of polling `ctl.sh status`
