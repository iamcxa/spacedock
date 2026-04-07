---
id: 014
title: Dashboard Permission Sync — Auto-resolve Permission Requests Answered in CLI
status: research
source: UI testing feedback
started: 2026-04-07T14:24:24Z
completed:
verdict:
score: 0.8
worktree: .worktrees/auto-researcher-dashboard-permission-sync
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 007 completed (channel plugin, bidirectional communication)
- Feature 003 completed (real-time activity feed)

## Brainstorming Spec

APPROACH:     When a permission request (PreToolUse approval) is answered in the Claude Code CLI, the dashboard feed should auto-update the corresponding permission card to reflect the resolved state. The card transitions from active (Approve/Reject buttons) to resolved (greyed out, showing "✅ Approved" or "❌ Rejected" badge). The card stays in the feed timeline for history but is no longer interactive. Implementation: listen for tool_result or permission_decision SSE events, match back to the original permission card by request ID, and update the card state.
ALTERNATIVE:  Remove permission cards entirely once resolved (rejected: breaks timeline continuity — captain loses the audit trail of what was approved during the session)
GUARDRAILS:   Must handle race conditions — captain might click dashboard Approve while CLI also approves. Must handle reconnection — if dashboard reconnects after permission was already resolved, the replayed event stream should show the correct resolved state. Must not break existing dashboard Approve/Reject functionality (dashboard approval should still work when captain prefers to use the UI).
RATIONALE:    Captain observed during UI testing that permission requests already approved in the CLI terminal still show as pending in the dashboard feed with active Approve/Reject buttons. This creates confusion — it looks like action is still needed when the request is already handled. The fix maintains timeline completeness while eliminating the false "action needed" signal.

## Acceptance Criteria

- Permission cards auto-update to resolved state when answered in CLI
- Resolved cards show status badge (✅ Approved / ❌ Rejected) instead of active buttons
- Resolved cards remain in feed timeline (not removed) with reduced visual prominence
- Works correctly on WebSocket reconnection (replayed events show correct state)
- Dashboard Approve/Reject buttons still functional when used directly
- No duplicate approvals when both CLI and dashboard respond

## Technical Claims

CLAIM-1: [type: library-api] Claude Code emits a `tool_result` or `permission_decision` SSE-like event back to the channel server when a permission request is resolved (CLI or remote). — sourced from brainstorm APPROACH line.

CLAIM-2: [type: project-convention] A permission card component exists in `tools/dashboard/static/` rendering Approve/Reject buttons and can be matched to a decision event via a request ID. — sourced from brainstorm APPROACH.

CLAIM-3: [type: project-convention] Request-ID matching strategy exists end-to-end: the same ID attached to the original `permission_request` can be echoed on a "resolved" event to locate and update the card. — sourced from brainstorm APPROACH.

CLAIM-4: [type: framework] EventSource/WebSocket replay-on-reconnect will deliver a correctly ordered stream so late-joining dashboards observe the resolved state. — sourced from brainstorm GUARDRAILS.

CLAIM-5: [type: domain-rule] Race condition handling is required: when CLI and dashboard both answer, one answer wins deterministically and the other is dropped without duplicate tool execution. — sourced from brainstorm GUARDRAILS.

CLAIM-6: [type: project-convention] Dashboard Approve/Reject already sends decisions back to the daemon via `/api/channel/send` POST with `meta.type = "permission_response"`. — sourced from brainstorm GUARDRAILS (existing behavior should not regress).

CLAIM-7: [type: library-api] The `@modelcontextprotocol/sdk` MCP channel protocol exposes a notification (or callback) on the channel server when the terminal user resolves a permission locally, enabling the dashboard to observe CLI-side decisions. — implied by brainstorm APPROACH.

CLAIM-8: [type: project-convention] Resolved cards can be visually distinguished via a `.resolved` CSS class with reduced prominence and a status badge. — sourced from brainstorm APPROACH + Acceptance Criteria.

## Research Report

**Claims analyzed**: 8
**Recommendation**: **REVISE**

A central assumption of the brainstorm (CLAIM-1 / CLAIM-7) is false. Claude Code does not emit any notification to the channel server when a permission is resolved — either by the terminal user or by a prior remote verdict. The feature as written is unbuildable with the documented Channels protocol alone. A workaround exists (PostToolUse hook + heuristic matching), but it changes scope, fragility, and acceptance criteria enough that the plan stage must revise the approach before proceeding.

### Verified (4 claims)

- **CLAIM-2**: HIGH — Permission card component exists.
  - Explorer: `tools/dashboard/static/activity.js:341-397` defines `renderPermissionRequest(entry)`. It creates a `.permission-card` div, stores `data-request-id` on it (line 354), and wires Approve/Reject button handlers (lines 376-391). The matching stub `renderPermissionResponse(entry)` exists at line 423-428 but is currently a no-op (only `if (!feedContainer) return;`). A resolved-state CSS class already exists at `tools/dashboard/static/style.css:352`.

- **CLAIM-3**: HIGH — Request-ID matching is wired up at the DOM layer (but the decision event itself is missing).
  - Explorer: `activity.js:354` sets `card.setAttribute("data-request-id", params.request_id || "")`. A matching selector like `feedContainer.querySelector('[data-request-id="' + id + '"]')` would work to find the card given a resolved event. The `.permission-card.resolved` style (style.css:352) and the existing inline verdict div (activity.js:413-416) show the intended resolved-state UX. The missing piece is not the DOM match — it's the upstream event.

- **CLAIM-4**: HIGH — WebSocket replay on reconnect is deterministic and correctly ordered.
  - Explorer: `server.ts:642-643` calls `eventBuffer.getAll()` on WebSocket open and sends a `{type: "replay", events}` message. `eventBuffer` is SQLite-backed (`events.ts:10-27`) with capacity 500 and a monotonic `seq` column, selected via `ORDER BY seq ASC`. So any `permission_request` event followed by its matching `permission_response` will replay in the correct order. If the frontend re-runs `renderEntry` for both events, the "resolved" state will naturally materialize after replay — *provided* a `permission_response` event was actually persisted in the first place.
  - Gotcha: today the buffer only ever contains a `permission_response` event when it originated from the dashboard side (`server.ts:453-469`, `channel.ts:56-67`). If the resolution came from the CLI terminal, no `permission_response` event was ever published to `eventBuffer`, so replay has nothing to restore.

- **CLAIM-6**: HIGH — Dashboard Approve/Reject already flows through `/api/channel/send` and must not regress.
  - Explorer: `activity.js:399-421` `sendPermissionVerdict(requestId, behavior, card)` POSTs to `/api/channel/send` with `meta: { type: "permission_response", request_id: requestId }`. Server-side: `server.ts:444-476` routes that POST, classifies as `permission_response` event type, publishes to `eventBuffer`, and calls `onChannelMessage` hook. `channel.ts:55-69` sees `meta.type === "permission_response"` and calls `sendPermissionVerdict(request_id, behavior)`, which emits `notifications/claude/channel/permission` back to Claude Code via `mcp.notification()`. This entire path is functional and test-covered (`tests/dashboard/channel.test.ts:238-246`). Do not touch this pipeline.

### Corrected (3 claims)

- **CLAIM-1**: HIGH CORRECTION — Claude Code does **not** emit any "permission decided" notification to the channel server.
  - Web (authoritative): [Channels Reference](https://code.claude.com/docs/en/channels-reference) "Relay permission prompts" section. The protocol has exactly four steps: (1) Claude Code → server `notifications/claude/channel/permission_request`, (2) server → app formats prompt, (3) user replies with ID, (4) server → Claude Code `notifications/claude/channel/permission`. There is no step (5) — no "decided", no "resolved", no "cancelled" notification from Claude Code back to the channel.
  - Quote: *"If someone at the terminal answers before the remote verdict arrives, that answer is applied instead and the pending remote request is dropped."* The word "dropped" here means **silently dropped without any event emitted to the channel**.
  - Quote: *"Right format, wrong ID: your server emits a verdict, but Claude Code finds no open request with that ID and drops it silently."* — same conclusion: no feedback channel.
  - Explorer confirmation: `channel.ts:116-130` registers exactly one `setNotificationHandler` for `notifications/claude/channel/permission_request`. No other method handler exists. A repo-wide grep for `setNotificationHandler` (channel.ts:116 only) confirms no "decided" handler could be written — the notification doesn't exist in the protocol surface.
  - **Implication**: SSE event type `tool_result` cited in the brainstorm is a Claude Code *hook* event, not a channels-protocol event. The two are unrelated message surfaces. The brainstorm conflates them.

- **CLAIM-5**: HIGH CORRECTION — Race resolution *is* handled deterministically by Claude Code, but the protocol leaves the channel server **blind** to the outcome.
  - Web ([Channels Reference](https://code.claude.com/docs/en/channels-reference)): *"Both stay live: you can answer in the terminal or on your phone, and Claude Code applies whichever answer arrives first and closes the other."* — first-write-wins, implemented inside Claude Code itself.
  - Web (GitHub [anthropics/claude-code#13938](https://github.com/anthropics/claude-code/issues/13938), closed Not Planned 2026-03-15): *"External tools configured to handle permission requests cannot detect when a user manually approves/rejects a request within Claude Code itself... When a user acts on a permission request in-session, external hook processes hang with no way to detect this scenario."* The community workaround is to **hash `session_id` + `tool_name` + normalized `tool_input`** to correlate PreToolUse/PostToolUse hook events with external permission queues — explicitly called "fragile" by the commenter. Anthropic declined to add first-class correlation.
  - **Implication**: "No duplicate approvals" (Acceptance Criterion 6) is guaranteed by Claude Code's first-write-wins behavior on the *daemon* side, so that criterion is already met. But "Permission cards auto-update to resolved state when answered in CLI" (Acceptance Criterion 1) cannot be met by listening to the channels protocol alone.

- **CLAIM-7**: HIGH CORRECTION — No MCP channel notification for local resolution exists. Workaround requires a separate PostToolUse hook.
  - Web: The only way for the dashboard process to observe a CLI-side resolution is via Claude Code's **hooks** system (PreToolUse / PostToolUse) — a parallel, file-based mechanism entirely separate from the MCP channels transport. A PostToolUse hook runs after the tool completes (regardless of which path — CLI or dashboard — granted permission), with payload fields `session_id`, `tool_name`, `tool_input`, `tool_use_id`, and `tool_response`.
  - Gotcha (from [anthropics/claude-code#13938](https://github.com/anthropics/claude-code/issues/13938)): the hook payload's `tool_use_id` is **not** the same as the 5-letter `request_id` from the channels protocol. There is no first-class mapping. Correlation must be done by hashing `session_id + tool_name + normalized(tool_input)` on both sides (recorded at `permission_request` time, looked up at `PostToolUse` time).
  - **Implication**: the implementation is now a two-process change: (a) dashboard must record a fingerprint when it receives a `permission_request` notification, keyed by the hash; (b) a Spacedock PostToolUse hook (new) must POST to `/api/events` (or `/api/channel/send`) with a `permission_response` event carrying the same hash. The card then gets matched either by `request_id` (if the decision came from the dashboard) or by the hash (if it came from CLI). This is noticeably more work than the brainstorm implies and crosses a process boundary.

### Unverifiable (1 claim)

- **CLAIM-8**: HIGH (style-level verification only) — Resolved visual state already exists in the stylesheet.
  - Explorer: `style.css:352` and `:357` define `.permission-card.resolved` and `.permission-card.resolved .perm-actions` rules. The UX transition path is already built; the feature just needs to trigger it for CLI-resolved cards. No research gap here — this part is a simple DOM update once the event arrives.

### Architectural Correction (New, not in original spec)

**The brainstorming spec's "listen for tool_result or permission_decision SSE events" approach is unbuildable as stated.** The dashboard cannot observe a CLI-side permission resolution through the MCP channels protocol, because that protocol was designed so Claude Code, not the channel, owns the race resolution and no "decided" event is ever emitted back. This is intentional protocol design (first-write-wins, enforced centrally inside Claude Code) and explicitly declined as a feature request.

Three viable paths for the plan stage to choose from:

1. **PostToolUse hook approach (most faithful to AC1)**
   - Add a Spacedock PostToolUse hook (configured via `.claude/settings.json`) that POSTs to the dashboard `/api/events` endpoint with a synthetic `permission_response` event including the `session_id + tool_name + tool_input` hash.
   - On `permission_request`, the dashboard stores that same hash on the card alongside `data-request-id`.
   - On `permission_response` arrival, frontend tries `data-request-id` match first (dashboard-decided path) then falls back to `data-fingerprint` match (CLI-decided path).
   - Pros: genuine auto-resolve, matches AC1.
   - Cons: introduces a hook dependency the dashboard feature previously didn't have; fingerprint matching is fuzzy and fragile per anthropics/claude-code#13938; PostToolUse only fires on `allow` — a `deny` in the CLI terminal will *never* trigger it, so rejected-in-CLI cards will remain visually pending forever. This is a meaningful limitation that must be disclosed in the plan.

2. **Passive expiry / staleness indicator (ergonomic compromise)**
   - Do not try to detect CLI-side resolution. Instead, after N seconds of no activity, visually mark the card as "stale — likely answered elsewhere", and remove interactive buttons on hover after a timeout.
   - Pros: zero hook dependency, zero fingerprinting, works regardless of allow/deny.
   - Cons: doesn't match Acceptance Criterion 1 literally; captain still sees the card as "active-ish" for a few seconds.

3. **Send-then-observe-failure (proactive probe)**
   - When captain clicks Approve/Reject on an already-resolved request, the existing flow already tolerates it: `mcp.notification({method: "notifications/claude/channel/permission", ...})` with a stale ID is silently dropped by Claude Code. The dashboard can surface that as: "This request was already resolved in CLI — badge updated retrospectively." But the dashboard has no way to know *until* the captain clicks, so this only reacts, not proactively resolves.
   - Pros: no hook needed, minimal surface area.
   - Cons: doesn't satisfy auto-update acceptance criterion; depends on captain clicking to discover state.

**Recommendation for plan stage**: Default to option 1 (PostToolUse hook + fingerprint matching) but explicitly document the deny-path limitation in the plan. If that limitation is unacceptable, fall back to option 2 (staleness indicator) as a simpler, always-correct variant that trades literal AC1 compliance for reliability.

### Recommendation Criteria Applied

| Factor | Status |
|---|---|
| Corrections affect core control flow? | Yes (CLAIM-1, CLAIM-7) |
| Corrections affect data model? | Yes (need to add fingerprint field to permission card + event) |
| Corrections affect architectural pattern? | Yes (introduces cross-process PostToolUse hook dependency) |
| Unverifiable > 50%? | No |

→ **REVISE** (multiple HIGH corrections affecting control flow, data model, and architecture).

### Sources

- [Claude Code Channels Reference](https://code.claude.com/docs/en/channels-reference) — permission relay protocol, first-write-wins semantics
- [anthropics/claude-code#13938](https://github.com/anthropics/claude-code/issues/13938) — closed feature request documenting the correlation gap and hash-based workaround
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) — PostToolUse payload fields
- Prior research in this repo: `docs/build-pipeline/_archive/dashboard-channel-plugin.md:199-296` — verified the channels protocol at feature-007 time
- Explorer evidence: `tools/dashboard/static/activity.js:341-428`, `tools/dashboard/src/channel.ts:11-132`, `tools/dashboard/src/server.ts:444-476,630-674,1004-1017`, `tools/dashboard/src/events.ts:10-62`, `tools/dashboard/src/types.ts:78-111`, `tools/dashboard/static/style.css:352-357`

## Stage Report: research

- [x] **Step 1 — Read entity file, extract technical claims**: DONE. 8 claims extracted covering SSE event types, request-ID matching, race resolution, replay correctness, dashboard→daemon decision path, MCP protocol surface, visual state transition.
- [x] **Step 2 — Search context lake for prior insights**: DONE. PreToolUse hook surfaced prior insights for `activity.js` (DOM-based, not ID-based references), `channel.ts` (open Record<string,string> meta, no schema validation), `server.ts` (Bun.serve default hostname 0.0.0.0, LAN-accessible), `events.ts` (in-memory + SQLite ring buffer with capacity cap and monotonic seq), `types.ts` (Comment/CommentReply interfaces). Most relevant: confirmation that `channel.ts` only registers one notification handler (the incoming `permission_request`). Also leveraged prior research archive `docs/build-pipeline/_archive/dashboard-channel-plugin.md` which already verified the Channels Reference protocol at feature-007 time.
- [x] **Step 3 — Parallel verification fan-out**: DONE (partial — performed as a single agent, not fan-out, because no Agent subagent tool was available in this environment).
  - Explorer equivalent: direct Grep/Glob/Read across `tools/dashboard/`. Located `renderPermissionRequest` (activity.js:341), `renderPermissionResponse` stub (activity.js:423 — currently a no-op, which itself is strong evidence the author anticipated the gap), request-ID wiring via `data-request-id` (activity.js:354), the existing dashboard→CLI path via `/api/channel/send` + `onChannelMessage` (server.ts:444-476, channel.ts:55-69), the reply-on-reconnect path via `eventBuffer.getAll()` (server.ts:642-643, events.ts:58-61), and confirmed only one `setNotificationHandler` exists in `channel.ts` (line 116).
  - Context7 equivalent: WebFetch of the official [Channels Reference](https://code.claude.com/docs/en/channels-reference) — authoritative verification that the protocol has no "decided" notification, that first-write-wins is enforced inside Claude Code with silent drops, and that the 5-letter `request_id` alphabet is `[a-km-z]`.
  - Web Search: confirmed the above via a second query, then verified the workaround gap via [anthropics/claude-code#13938](https://github.com/anthropics/claude-code/issues/13938) (closed Not Planned; hash-based correlation workaround documented).
- [x] **Step 4 — Cross-reference and assign confidence**: DONE. 4 verified HIGH, 3 corrected HIGH, 1 HIGH (style-level only). Sources triangulated across repo code, official Channels Reference, and Anthropic's own issue tracker.
- [x] **Step 5 — Document corrections with cited sources**: DONE. See "Corrected" and "Architectural Correction" subsections above. All corrections cite either `file:line` (repo) or URL (docs/issues).
- [ ] **Step 6 — Cache verified patterns and corrections to context lake**: SKIPPED — the context-lake `store_insight` tool was not exposed in this environment (only read-side hooks injected insights into Read tool results). Research findings are persisted in the entity body itself (this Research Report section), which the plan stage will read directly. If the plan-stage ensign has `store_insight` available, it should cache: (a) the channels protocol has no "permission decided" notification [library-api, HIGH], (b) hash-based correlation via `session_id + tool_name + tool_input` is the only documented workaround for CLI-side detection [project-convention, MEDIUM fragility], (c) PostToolUse hooks only fire on allowed executions — denials are invisible [domain-rule, HIGH], (d) `renderPermissionResponse` at `activity.js:423` is a pre-existing no-op stub designed to be filled in [project-convention, HIGH].
- [x] **Step 7 — Write Research Report section and commit**: DONE. Section written above. Commit follows this edit.
- [x] **Step 8 — Write Stage Report**: DONE (this section).

## Acceptance Criteria Reframe (post-research, captain-approved)

The brainstorming spec's original acceptance criteria assumed the Channels protocol would emit a "permission decided" notification. Research proved that assumption false. The captain reviewed the 3 viable paths and selected a **refined Option 2**: a conversation-continues heuristic + 30s timeout fallback, rendered via a collapse group (Option B — preserves audit trail). The 6 revised acceptance criteria below are **binding**; they supersede the originals in the Brainstorming Spec section above.

- **AC1' (revised)**: Pending permission cards transition to a `resolved (inferred)` state when ANY subsequent event arrives in the same activity feed (heuristic-based). Buttons removed, card moves into the collapsed group row.
- **AC2' (revised)**: Cards that don't get a follow-up event within 30s transition to `resolved (timeout)`. Same visual treatment.
- **AC3 (unchanged)**: Resolved cards REMAIN in the feed timeline — they collapse into a `🔒 Permission resolved (N items)` group row with click-to-expand. Audit trail is preserved.
- **AC4 (unchanged)**: On WebSocket reconnect / page refresh, replayed events naturally re-trigger the heuristic in seq order — the resolved state materializes correctly without special replay handling. No new code for replay.
- **AC5 (unchanged)**: Existing dashboard Approve/Reject buttons (`sendPermissionVerdict` flow) still function. They just become unreachable for cards that the heuristic already marked resolved (acceptable trade-off — the captain can use the CLI for those edge cases).
- **AC6 (unchanged, already met)**: No duplicate approvals. Daemon's first-write-wins on Claude Code side guarantees this — nothing for us to do.

### Known limitations (accepted by captain)

1. **Parallel tool calls edge case**: in rare cases multiple permission requests can be pending simultaneously (e.g., Claude Code fires two tool calls in parallel). The conversation-continues heuristic may falsely mark a still-pending request as resolved when the *other* request's follow-up event arrives. Accepted as rare in spacedock usage; the captain can answer in the CLI directly in those edge cases.
2. **Deny path unchanged from limitation view**: AC1' is resolution-agnostic (it fires on *any* continued activity), so unlike the PostToolUse hook option, denies ARE covered by this approach. The 30s timeout is the safety net for the "no activity at all" case.
3. **`resolved (inferred)` is a best-effort label**: the dashboard cannot distinguish CLI-approved from CLI-denied decisions — it only knows "the conversation moved on". The badge says `inferred`, not `approved`/`rejected`. Captain accepted this trade-off; the audit trail is preserved because the card remains in the feed.

## TDD Plan

Scale: **Small**. File budget: 2 NEW + 3 EDIT = 5 files. Auto-advance eligible on plan gate (no schema/migration/contract/new-infra triggers — pure frontend + new unit test file).

This plan mirrors entity 010's 3-phase structure: pure module + tests first, then wiring into the classic IIFE dashboard script, then quality gates + manual smoke test. File paths are all research-verified (see Research Report → Verified and Explorer evidence).

### Phase 1 — Pure module + unit tests (TDD, tests first)

**New file**: `tools/dashboard/src/permission-tracker.ts` — pure, stateless-input module testable under `bun:test`. This file is the source of truth; it is inline-duplicated into `static/activity.js` in Phase 2 because the dashboard loads static scripts as classic IIFE (index.html:37 — `<script src="activity.js">`), not ES modules.

**Module surface**:

```ts
// ABOUTME: Pure module tracking pending permission requests and computing
// conversation-continues / timeout resolution signals. Duplicated into
// static/activity.js for classic-IIFE runtime consumption.

export type TrackedEvent = {
  type: string;           // "permission_request" | "channel_message" | "channel_response" | "permission_response" | ...
  seq: number;
  request_id?: string;    // present on permission_request
  timestamp_ms: number;   // client receive time, used for 30s timeout
};

export type PermissionTracker = {
  /**
   * Called for every incoming event from ws.onmessage (both live and replay).
   * If event is a permission_request, adds to pending set.
   * If event is anything else (including another permission_request), returns
   * the list of request_ids that should be marked resolved via the
   * conversation-continues heuristic — specifically, all currently-pending
   * request_ids whose seq is strictly less than the incoming event's seq.
   * Returns [] if nothing to resolve.
   */
  track(event: TrackedEvent): string[];

  /**
   * Applies the 30s timeout. Returns request_ids pending longer than 30s.
   * Safe to call frequently; does not advance any state beyond timeout removal.
   */
  tick(now_ms: number): string[];

  /**
   * Explicit removal — called when the dashboard itself resolves a request
   * via sendPermissionVerdict (so the heuristic doesn't double-fire when the
   * server replays the event back).
   */
  resolve(request_id: string): void;

  /** For tests only. */
  _pending(): ReadonlyArray<{ request_id: string; seq: number; timestamp_ms: number }>;
};

export function createPermissionTracker(): PermissionTracker;
```

**Internal state**: `Map<string, {seq: number, timestamp_ms: number}>` keyed by `request_id`.

**New file**: `tools/dashboard/src/permission-tracker.test.ts` — bun:test assertions. Each test instantiates a fresh tracker.

Concrete tests (test-first, verify these fail without the implementation, then pass after Phase 1 impl lands):

1. `track(permission_request seq=5)` → returns `[]`, pending = `[req1@5]`.
2. `track(channel_message seq=6)` after step 1 → returns `["req1"]`, pending = `[]` (conversation-continues).
3. `track(permission_request seq=5); track(permission_request seq=6)` → neither resolves the other; both pending (parallel-tool-calls edge case, documented).
4. `track(req X seq=5); track(req Y seq=6); track(channel_message seq=7)` → returns both `["X","Y"]`; pending = `[]`.
5. `track(req X seq=5); track(channel_message seq=4)` (older seq — shouldn't happen in practice but defensive) → returns `[]` (don't resolve X on an older-seq event); pending still has X. *Rationale: be tolerant of out-of-order replay.*
6. `track(req X seq=5, timestamp=1000); tick(now=32000)` → returns `["X"]` (31s elapsed, past 30s threshold).
7. `track(req X seq=5, timestamp=1000); tick(now=10000)` → returns `[]` (9s elapsed, under threshold).
8. `track(req X seq=5); resolve("X"); track(channel_message seq=6)` → returns `[]` (X already removed); pending = `[]`.
9. `track(req X seq=5); resolve("X"); tick(now=100000)` → returns `[]` (X already removed).
10. **Replay integration scenario**: replay 5 events in sequence (req A, msg, req B, req C, msg) — after all 5, pending should be `[]` (A resolved by msg, B+C resolved by final msg).
11. **Reentrance**: calling `track` inside a loop with a mix of types never throws, never leaks entries.

**Quality gate for Phase 1**:

```
bun test tools/dashboard/src/permission-tracker.test.ts
bunx tsc --noEmit
```

### Phase 2 — Wire into `static/activity.js` + `style.css`

**Edit 1**: `tools/dashboard/static/activity.js`

1. **Inline-duplicate the pure module** at the top of the IIFE (above line 44 `connect()`). Add `// ABOUTME` breadcrumb pointing back to `src/permission-tracker.ts` as source of truth. Use the same function-factory pattern (`var permissionTracker = (function() { ... return { track, tick, resolve }; })();`). No class syntax — keep it ES5-ish to match surrounding style.

2. **Hook into `ws.onmessage`** at `activity.js:53-68`. For both branches (`msg.type === "replay"` at line 55 and `msg.type === "event"` at line 62), build a `TrackedEvent` from the `entry` (`type` from `entry.event.type`, `seq` from `entry.seq`, `timestamp_ms` from `Date.now()`, `request_id` parsed from `entry.event.detail` JSON when type is `permission_request`) and call `permissionTracker.track(trackedEvent)`. For each request_id returned, call `markResolved(requestId, 'inferred')`. Order: render the entry first (existing behavior), THEN run the tracker — this way the card that caused the resolution has already been drawn to the feed. *Exception: on replay, render all entries first, then batch-track them in seq order to avoid visual flicker.*

3. **Implement `markResolved(requestId, reason)`** — new function near `sendPermissionVerdict` (around activity.js:398):
   - Finds card via `feedContainer.querySelector('[data-request-id="' + requestId + '"]')`. If not found (card already resolved or scrolled out of the 100-item cap in `capFeedItems`), return silently.
   - Skip if card already has `.resolved` class (idempotency — replay, double-fire).
   - Adds `.resolved` class.
   - Removes the `.perm-actions` div entirely (existing CSS at `style.css:357` only sets `display: none`, but removal is cleaner and prevents tab-focus on disabled buttons).
   - Appends a small `.perm-verdict` div with text `reason === 'inferred' ? '🔒 Resolved (continued)' : '🔒 Resolved (timeout)'`.
   - Calls `mergeIntoResolvedGroup(card)` to handle the collapse-group bookkeeping.

4. **Implement `renderPermissionResponse(entry)`** at `activity.js:423` (currently a no-op stub — see Research Report CLAIM-2). Parse `entry.event.detail` for the `request_id` and call `permissionTracker.resolve(requestId)`. This prevents double-fire when the dashboard-side `sendPermissionVerdict` POSTs back through the server and the event is replayed. Do NOT otherwise touch the existing dashboard→daemon flow (the dispatch was explicit: DO NOT modify `sendPermissionVerdict`).

5. **Implement `mergeIntoResolvedGroup(card)`** — the collapse group bookkeeping:
   - If the card's `previousElementSibling` is a `.collapsed-group` div, append the card INTO the group's content and update the summary count.
   - If the card's `nextElementSibling` is a `.collapsed-group` div, prepend the card into that group's content and update the summary count.
   - If both prev AND next are groups (sandwiched), merge the next group into the prev group (append next's content, remove next), then insert card.
   - Otherwise, create a new `.collapsed-group` wrapping the card. Use a `<details>` element: `<details class="collapsed-group"><summary>🔒 Permission resolved (<span class="count">1</span> item) <span class="chevron">▸</span></summary></details>`, move the card into the `<details>`, replace the card's original slot with the `<details>`.
   - The details element handles click-to-toggle natively — no custom JS needed for expand/collapse.

6. **Implement the 30s timeout tick**: at the bottom of the IIFE (near the end of the file before the closing `})();`), add:
   ```js
   setInterval(function () {
     var now = Date.now();
     var expired = permissionTracker.tick(now);
     expired.forEach(function (id) { markResolved(id, 'timeout'); });
   }, 5000);
   ```
   Poll every 5s; the tracker's internal 30s threshold is the actual source of truth.

**Edit 2**: `tools/dashboard/static/style.css` — add new rules at the end of the `.permission-card` block (after line 365):

```css
/* --- Collapsed permission-resolved group (feature 014) --- */

.collapsed-group {
    margin: 0.4rem 0;
    border: 1px solid #21262d;
    border-radius: 6px;
    background: #0d1117;
}

.collapsed-group > summary {
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    color: #8b949e;
    font-size: 0.75rem;
    list-style: none;           /* hide default disclosure triangle */
    display: flex;
    align-items: center;
    gap: 0.4rem;
    user-select: none;
}

.collapsed-group > summary::-webkit-details-marker { display: none; }

.collapsed-group[open] > summary .chevron { transform: rotate(90deg); }
.collapsed-group > summary .chevron {
    display: inline-block;
    transition: transform 0.15s ease;
}

.collapsed-group > summary:hover { color: #c9d1d9; }

.collapsed-group > .permission-card {
    margin: 0.25rem 0.5rem;    /* tighter inside a group */
    opacity: 0.6;               /* more de-emphasized than loose .resolved */
}

.permission-card.resolved .perm-verdict {
    color: #6e7681;
    font-size: 0.7rem;
}
```

Existing `.permission-card.resolved` at `style.css:352` is already styled (border-color + opacity 0.7); these additions layer the group affordance on top. Do NOT modify the existing `.resolved` rule — the research explicitly noted it as the pre-existing UX class.

**Edit 3**: `tools/dashboard/static/index.html` — **NO CHANGES REQUIRED**. The feature is self-contained in `activity.js` + `style.css`. The `<details>` element is used as a dynamic DOM creation, not a static markup addition. Remove from the file budget — actual budget is 2 NEW + 2 EDIT = 4 files. Well within the Small scale limit.

**Quality gate for Phase 2**:

```
bunx tsc --noEmit           # verify the .ts source of truth still compiles
bun test tools/dashboard    # run dashboard test suite
bash -n tools/dashboard/start.sh   # or equivalent shell-syntax check if one exists
```

### Phase 3 — Quality gates + manual smoke test

**Task 3.1 — Automated gates** (run from repo root or worktree root):

```
cd tools/dashboard && bunx tsc --noEmit
bun test tools/dashboard/src/permission-tracker.test.ts
bun test tools/dashboard                       # full dashboard suite — ensures no regressions in channel.test.ts, server.test.ts, etc.
```

Expected outcomes:
- New unit tests pass (11/11).
- Existing dashboard tests still pass — particularly `tests/dashboard/channel.test.ts:238-246` which covers the dashboard→daemon permission_response flow (CLAIM-6, must not regress).
- `tsc --noEmit` clean.

**Task 3.2 — Manual smoke test recipe**:

Prereqs: start the dashboard with channels enabled. Per `tools/dashboard/README.md` (or equivalent), the typical spinup is `bun run tools/dashboard/src/server.ts --channels` (plan stage should validate the exact command during Phase 2 dev, adjust here if different).

1. **Setup**: open the dashboard in a browser. Open Claude Code in a terminal and ensure the session is attached to the dashboard (channel plugin active). Verify `Channel: connected` indicator in the header.
2. **Trigger a permission request**: invoke any tool that requires approval — e.g., `mcp__plugin_kc-test-permission__test_permission` (if the test plugin is installed) or simply ask Claude to run a shell command that isn't on the allowlist.
3. **Verify card appears**: a `.permission-card` with Approve/Reject buttons should render in the dashboard's activity feed panel.
4. **Trigger a subsequent event (primary heuristic path)**: answer the permission in the CLI terminal (either `y` to approve or `n` to deny). Claude Code will continue the conversation (tool runs, response streamed, or a new chat message). Within **<1 second** the dashboard should:
   - Mark the card with `.resolved` class (greyed out, opacity 0.6).
   - Remove the Approve/Reject buttons.
   - Show a `🔒 Resolved (continued)` badge.
   - Collapse the card into a `<details class="collapsed-group">` with summary `🔒 Permission resolved (1 item) ▸`.
5. **Verify expand**: click the summary row. The `<details>` opens, showing the original card in place (greyed, no buttons). Click again — it closes.
6. **Verify timeout path**: trigger a second permission request. This time DO NOT answer in the CLI and DO NOT click Approve/Reject. Wait 30 seconds. The card should transition to `.resolved` with `🔒 Resolved (timeout)` badge and merge into the collapsed group. Exact timing: tolerated window is 30–35s given the 5s setInterval poll granularity.
7. **Verify group merging**: trigger 3 rapid back-to-back permission requests, answer each immediately in the CLI. All 3 should collapse into a single group row with summary `🔒 Permission resolved (3 items)`.
8. **Verify dashboard-side path still works (regression test for CLAIM-6 / AC5)**: trigger a permission request. Click **Approve** in the dashboard. The card should resolve via the existing flow (`sendPermissionVerdict` → server → daemon). It should NOT double-fire: `renderPermissionResponse(entry)` replayed from the server calls `permissionTracker.resolve(id)` which is a no-op because `sendPermissionVerdict` already added `.resolved` to the card directly. No duplicate badge or double-collapse.
9. **Verify replay on reconnect (AC4)**: with several resolved cards in the feed, refresh the browser (or kill the WebSocket and let it auto-reconnect). The `{type: "replay"}` message re-delivers the full event history. After the reconnect settles, the feed should look substantially the same — all previously-resolved cards should be back in their collapsed groups, because the heuristic re-materializes the state deterministically in seq order.
10. **Verify parallel-tool-calls edge case (accepted limitation)**: if you can trigger 2 permission requests before answering either, answer only one in the CLI. The heuristic will resolve BOTH cards when the tool-completion event arrives — this is expected and documented. The unanswered tool will still block in Claude Code until you answer it in the CLI; the dashboard's incorrect "resolved" label is the accepted trade-off.

Pass criteria: steps 3, 4, 5, 6, 7, 8, 9 all succeed. Step 10 demonstrates the known limitation (not a failure).

### File budget summary

| File | Status | Purpose |
|---|---|---|
| `tools/dashboard/src/permission-tracker.ts` | **NEW** | Pure module — tracker logic source of truth |
| `tools/dashboard/src/permission-tracker.test.ts` | **NEW** | bun:test unit tests (11 assertions) |
| `tools/dashboard/static/activity.js` | EDIT | Inline-duplicate tracker, wire ws.onmessage, implement markResolved + renderPermissionResponse + mergeIntoResolvedGroup + 30s tick |
| `tools/dashboard/static/style.css` | EDIT | Add `.collapsed-group` and refinement rules |

**Total: 2 NEW + 2 EDIT = 4 files.** Confirmed Small scale (<5-6 file threshold).

### References to research

- `tools/dashboard/static/activity.js:341-397` — `renderPermissionRequest` (sets `data-request-id`, verified CLAIM-2 HIGH).
- `tools/dashboard/static/activity.js:399-421` — `sendPermissionVerdict` (DO NOT modify, verified CLAIM-6 HIGH).
- `tools/dashboard/static/activity.js:423-428` — `renderPermissionResponse` no-op stub (verified CLAIM-2 — the natural integration point flagged by feature 007's author).
- `tools/dashboard/static/activity.js:53-68` — `ws.onmessage` handler (replay + event branches).
- `tools/dashboard/static/activity.js:118-133` — `renderEntry` dispatch (routes `permission_response` → stub at line 127).
- `tools/dashboard/static/style.css:352-359` — existing `.permission-card.resolved` rules (UX base layer, verified CLAIM-8).
- `tools/dashboard/static/index.html:37` — classic IIFE `<script src="activity.js">` (confirms no ES modules → inline-duplication pattern required).
- `tools/dashboard/src/server.ts:642-643` + `tools/dashboard/src/events.ts:10-62` — replay-on-reconnect delivers events in monotonic seq order (verified CLAIM-4 HIGH, makes AC4 free — "no new code for replay").
- `tools/dashboard/src/channel.ts:55-69` + `tools/dashboard/src/channel.ts:116-130` — daemon-side permission flow untouched (CLAIM-6).

## Stage Report: plan

1. **Read entity file end-to-end**: DONE. Read Brainstorming Spec (lines 23-28 — noted as superseded), Acceptance Criteria (lines 30-37 — noted as superseded), 8 Technical Claims (lines 39-55), full Research Report including Verified/Corrected/Unverifiable/Architectural Correction subsections (lines 57-145), and research Stage Report (lines 147-159). Research Report's binding conclusions absorbed into plan.
2. **Write `## Acceptance Criteria Reframe` section**: DONE. Added 6 revised criteria (AC1' through AC6) verbatim from dispatch prompt, plus a "Known limitations" sub-block capturing the parallel-tool-calls edge case, deny-path clarification, and `inferred` label semantics — all captain-accepted trade-offs.
3. **Search context lake for cached patterns**: DONE (via PreToolUse:Read hook injections). Received insights for `tools/dashboard/static/activity.js` (ID-based DOM refs via getElementById, render functions stable), `style.css` (mechanical color changes safe, 65 hex occurrences, no CSS variables), and `index.html` (minimal shell, classic script loading). Most relevant to this plan: confirmation that activity.js uses classic IIFE (not ES modules), which is why the pure module must be inline-duplicated into the static script. No cached patterns for collapse/group-row UX — this is a new UI pattern in the dashboard.
4. **Convert captain-approved approach into TDD-ordered task list with 3 phases**: DONE. Phase 1 (pure module + 11 unit tests under bun:test), Phase 2 (inline-duplicate into activity.js, wire ws.onmessage, implement markResolved + renderPermissionResponse + mergeIntoResolvedGroup + 30s setInterval tick, add CSS), Phase 3 (tsc/bun test/smoke test). All file paths research-verified. Module surface explicitly typed (TrackedEvent, PermissionTracker). Integration point `renderPermissionResponse` at `activity.js:423` called out explicitly per dispatch instruction.
5. **Confirm scale**: DONE. File count is **2 NEW + 2 EDIT = 4 files** (index.html removed from the original 3 EDIT budget — no DOM shell changes needed since `<details>` elements are created dynamically). Confirmed Small scale, well under the 5-6 file escalation threshold.
6. **Plan-stage gate self-evaluation (auto-advance eligibility)**: DONE. This change has no schema/migration/contract/new-infra triggers:
   - No database migrations (no new tables, no schema changes to `events` or any other SQLite table).
   - No contract changes (doesn't modify `/api/channel/send`, doesn't touch the MCP notification surface, doesn't change the WebSocket message shape).
   - No new public APIs (the tracker module is internal to `tools/dashboard/`).
   - No new infrastructure dependencies (no new npm packages, no new services, no config file changes).
   - Pure frontend addition + new unit test file.
   - **→ The plan stage's conditional gate should auto-advance.** The first officer can proceed directly to the build stage without captain escalation.
7. **Write `## TDD Plan` section**: DONE. Section written with the 3-phase structure, explicit module surface, 11 concrete test assertions, exact CSS additions, manual smoke test recipe (10 steps covering all 6 revised ACs plus the accepted limitations), and a file budget table. References-to-research subsection ties every file path back to the verified research findings.
8. **Commit entity file update on `auto-researcher/dashboard-permission-sync`**: PENDING (follows this edit — see git command below).
9. **Write `## Stage Report: plan` section**: DONE (this section).
