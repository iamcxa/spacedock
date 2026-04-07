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
