---
id: 045
title: Dashboard Single-Server Unification (ADR-001) — Eliminate ctl.sh and Unify on :8420
status: explore
source: /build brainstorming (spec 2026-04-09-adr-001-single-server-8420-design.md)
started: 2026-04-09T08:55:00Z
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-dashboard-single-server-unification
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile: standard
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

## Stage Report: explore

- [x] Read the full ADR-001 design spec and entity brainstorming spec. Note any gaps.
  Spec is complete. One gap for plan stage: acceptance criterion says "rename channel_port state file to just port" (spec scope item 7) but the share skill reads `channel_port` by name — plan must decide whether to rename the file or just remove the ctl.sh `port` file that causes ambiguity. Another gap: spec says "FO persists last_seq in fo-state.json" but no FO file currently exists for this; plan must note this is FO responsibility and out of scope for the dashboard entity.

- [x] Context lake `search_insights` called for every candidate file before reading.
  Cache hits: 7/7 (ctl.sh, channel.ts, server.ts, events.ts, detail.js, activity.js, detail.css, first-officer-shared-core.md — all stale but present). skills/dashboard/SKILL.md: 1 hit (stale). style.css: 1 hit (stale). Total: 9 hits, 0 misses for files that existed in the lake.

- [x] Map DEMOLITION TARGETS — grep for ctl.sh, 8421, forwardToCtlServer.
  **ctl.sh refs (code — must be removed):** `tools/dashboard/ctl.sh` (entire file, DELETE), `tools/dashboard/src/channel.ts:589` (comment "so ctl.sh can detect"), `skills/dashboard/SKILL.md:11,16,261-284,303-309,343-346` (ctl.sh invocations), `references/first-officer-shared-core.md:21` (ctl.sh status/start commands).
  **ctl.sh refs (docs/historical — may stay):** `tools/dashboard/CHANGELOG.md:12`, `tools/dashboard/README.md:9,12,23,24,82,175`.
  **8421 refs (code — must be removed):** `skills/dashboard/SKILL.md:296,343`.
  **8421 refs (docs/historical — may stay):** `docs/build-pipeline/_archive/*`, `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md` (the spec itself).
  **forwardToCtlServer (code — must be removed):** `tools/dashboard/src/channel.ts:45-58` (function def), `328,356,411,463,481` (5 call sites).

- [x] Read tools/dashboard/ctl.sh top-to-bottom. Document modes, flags, callers.
  Modes: start, stop, status (+ --all), logs (+ --follow), restart, tunnel (start/stop/status). Flags: --port, --root, --channel, --tunnel, --all, --follow. External callers: skills/dashboard/SKILL.md (all subcommands), references/first-officer-shared-core.md:21. No hooks or tests call ctl.sh. State files: pid, port, root, dashboard.log, tunnel_url, tunnel_pid, channel_port. The channel_port file is written by channel.ts (not ctl.sh) — survives demolition. The pid/port/root/tunnel_* files are ctl.sh-only and disappear with ctl.sh.

- [x] Read tools/dashboard/src/channel.ts. Document MCP tools, forwardToCtlServer, notification path, channel_message shape.
  5 MCP tools: reply, get_comments, add_comment, reply_to_comment, update_entity. forwardToCtlServer() at lines 45-58 (fire-and-forget POST to $STATE_DIR/port). 5 call sites: lines 328, 356, 411, 463, 481 — all after publishEvent() calls. Notification push: `mcp.notification({ method: "notifications/claude/channel", params: { content, meta } })` at line 134. channel_message shape: {type:"channel_message", entity:"slug"|"", stage:"", agent:"captain", timestamp:ISO, detail:content_string}. new get_pending_messages tool inserts in ListToolsRequestSchema (after line 278) and CallToolRequestSchema handler (after line 489).

- [x] Read tools/dashboard/src/server.ts. Identify standalone vs channel-mode branches.
  No standalone-mode conditional branches inside createServer() — the factory is mode-agnostic. The ONLY standalone-specific code is the CLI entry point block (lines 1247-1284, `if import.meta.main`) which calls createServer() without onChannelMessage. This entire block is the demolition target in server.ts. The publishEvent() and broadcastChannelStatus() functions (lines 1214-1242) are channel-agnostic. POST /api/events endpoint (line 612) was the bridge target for forwardToCtlServer() — keep for FO event emission.

- [x] Read tools/dashboard/src/events.ts. Document EventBuffer, query methods, insertion point.
  EventBuffer: SQLite-backed, capacity 500. Methods: push(event), getSince(afterSeq), getAll(), getByEntity(entity), clear(). INSERTION POINT: add `getChannelMessagesSince(afterSeq: number, entity?: string): SequencedEvent[]` — SQL filter on type='channel_message' AND seq > afterSeq AND optionally entity=entity. Uses existing rowToSequencedEvent() helper. No schema changes. channel_message is in VALID_EVENT_TYPES line 4.

- [x] Read static/detail.js activity feed and WS handler. Identify scroll container, render trigger, auto-scroll gaps.
  Activity feed container: `document.getElementById('activity-feed')` (line 954). Cards: createActivityCard() at line 981, class=`activity-event`. WS realtime push handler: lines 1227-1232 — appends to activityEvents then calls renderActivityFeed() which clears and re-renders. NO scrollTop reset after renderActivityFeed(). NO manual-scroll tracking. INSERT POINTS: (1) CSS gap on .activity-event in detail.css; (2) add `container.scrollTop=container.scrollHeight` after renderActivityFeed() in loadActivityFeed() ~line 947; (3) same after renderActivityFeed() in onmessage handler line 1231; (4) add scroll event listener on container with a 3s pause flag.

- [x] Read skills/dashboard/SKILL.md and first-officer-shared-core.md. Document edit targets.
  SKILL.md: line 11 (ctl.sh reference in description), line 16 (resolve ctl.sh path step), lines 261-284 (stop/status/logs/restart all use `bash {ctl} ...`), lines 303-309 (Share Step 1 ctl.sh status/start), lines 343-346 (PORT resolution fallback to standalone `port` file), lines 296+343 (8421 references). first-officer-shared-core.md: line 21 (step 6.5, exact text: "run `tools/dashboard/ctl.sh status --root {project_root}`" + start command).

- [x] Read references/first-officer-shared-core.md line 21 and surrounding text.
  Confirmed: line 21 is step 6.5 in Startup section. Full text: 'Check dashboard — run `tools/dashboard/ctl.sh status --root {project_root}`. If not running, prompt captain: "Dashboard is not running. Start it? (http://localhost:8420/)" Wait for captain response. Yes — run `tools/dashboard/ctl.sh start --root {project_root}`. No — skip.' Plan stage must draft replacement text. No other ctl.sh references in first-officer-shared-core.md.

- [x] Discover test infrastructure — list test files, runner, baseline count.
  Test files (14): channel.test.ts, server.test.ts, events.test.ts, comments.test.ts, auth.test.ts, snapshots.test.ts, db.test.ts, permission-tracker.test.ts, gate.test.ts, discovery.test.ts, diff-utils.test.ts, parsing.test.ts, entity-resolver.test.ts, frontmatter-io.test.ts. Runner: bun:test. Baseline run: `bun test` → **105 tests, 101 pass, 4 fail, 4 errors** across 14 files. NOTE: the spec claims 195 tests; actual is 105. The 4 failures are pre-existing (gate.test.ts + server.test.ts unhandled errors). Plan stage must reconcile — 195 may be from a different session's count. New tests for get_pending_messages go in events.test.ts or a new channel-messages.test.ts.

- [x] Coverage infrastructure — check test:coverage script, .github/scripts/, baseline file.
  No `test:coverage` script in package.json. No `.github/scripts/` directory. No committed coverage baseline file. Coverage command (if needed): `bun test --coverage` (no config). No Istanbul/LCOV output configured. Quality stage must SKIP delta comparison — no baseline exists.

## Coverage Infrastructure

No test:coverage script in package.json. No .github/scripts/coverage-* files. No committed baseline. Coverage format: bun's built-in `--coverage` flag (text output only, no JSON/LCOV). Quality stage should SKIP coverage delta check. Verify test pass/fail count instead (baseline: 101 pass / 4 pre-existing failures as of explore).

- [x] store_insight for every file discovered. Tags applied.
  Stored insights for: ctl.sh [purpose/gotcha], channel.ts [purpose/pattern], server.ts [purpose/gotcha], events.ts [purpose/pattern], detail.js [purpose/pattern], activity.js [purpose/pattern], detail.css [purpose], style.css [purpose], skills/dashboard/SKILL.md [purpose], references/first-officer-shared-core.md [purpose]. Total: 10 store_insight calls.

- [x] Validate scale estimate. Count files the change will touch.
  Demolition (delete): 1 (ctl.sh). Code edits: channel.ts, server.ts, events.ts, detail.js, detail.css, style.css, skills/dashboard/SKILL.md, references/first-officer-shared-core.md = 8 files. New test file: 1 (channel-messages.test.ts or additions to events.test.ts). Total: ~10 files. Scale = **Medium confirmed**. Within the 6-15 range.

- [x] Group final file list by layer.

### Summary

Exhaustive file map produced for 10 files across 5 layers. Scale is Medium (confirmed). Key findings: (1) forwardToCtlServer has exactly 5 call sites in channel.ts — all removable in a single pass; (2) server.ts has no standalone-mode branches inside createServer() — only the CLI entry point block needs deletion; (3) events.ts already has all needed SQL infrastructure — getChannelMessagesSince() is a 10-line addition; (4) detail.js renderActivityFeed() clears-and-redraws on every WS push with no scrollTop reset — two insertions fix both initial-load and realtime auto-scroll; (5) test baseline is 105 tests (not 195 as spec claimed — plan stage should recount and use 105 as the working baseline); (6) no coverage infrastructure exists so quality stage skips delta comparison.

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
