---
id: 099
title: "Spacebridge channel bridge — UI ↔ daemon ↔ CC bidirectional communication"
status: plan
context_status: ready
source: captain observation (2026-04-14 — new UI has no channel support, blocks cutover)
created: 2026-04-14T13:00:00+08:00
started: 2026-04-15T18:55:00+08:00
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-spacebridge-channel-bridge-bidirectional
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: [053, 054, 057]
---

## Directive

> The new spacebridge Next.js UI reads from SQLite readonly but has no bidirectional communication with CC sessions. The old dashboard (tools/dashboard/) provides 5 MCP tools (reply, get_comments, add_comment, reply_to_comment, update_entity) + get_pending_messages for reconnect recovery — all via the MCP stdio channel. The new UI must achieve feature parity before cutover (entity 060) can proceed. Build the channel bridge: Next.js UI ↔ daemon (socket/HTTP) ↔ CC session (MCP shim). Captain must be able to approve gates, write comments, and receive FO messages directly from the spacebridge UI.

## Problem Statement

The spacebridge daemon already has the IPC plumbing:
- `channel-provider-bridge.ts` — forwards ChannelProvider calls via socket RPC ✅
- `socket-server.ts` — handles RPC requests from shims ✅  
- MCP shim (`cli.ts mcp`) — CC session connects via stdio ✅
- Session registry (entity 057) — tracks connected sessions ✅

But the Next.js UI is **disconnected from this plumbing**:
1. UI reads DB readonly — cannot call daemon RPC methods
2. UI has no write path — captain actions don't reach CC sessions
3. UI has no push channel — FO messages only land in DB, not pushed to browser
4. No gate interaction — captain can't approve/reject from UI

### Architecture Gap

```
OLD (working):
  CC (FO) ←→ MCP stdio ←→ Dashboard Channel Server ←→ Browser (WebSocket)
                                    ↑
                              Captain actions

NEW (broken):
  CC (FO) ←→ MCP shim ←→ Daemon ←→ SQLite DB ← readonly ← Next.js UI
                                                              ⚠️ no write back
                                                              ⚠️ no push to browser
```

### Target Architecture

```
  CC (FO) ←→ MCP shim ←→ Daemon ←→ SQLite DB ← readonly ← Next.js Server Components
                              ↕                                    ↕
                         Socket RPC                          API Routes (write)
                              ↕                                    ↕
                    Session Registry              Next.js Route Handlers → daemon RPC
                              ↕                                    ↕
                         Event Bus ──────────────→ SSE endpoint → Browser (EventSource)
                              ↑
                    Captain actions from UI → Route Handler → daemon RPC → MCP tool response
```

## Key Capabilities Needed

| Capability | Old Dashboard | New UI Target | Mechanism |
|---|---|---|---|
| FO → captain message | `reply` MCP tool → WS push | daemon event → SSE push to browser | Events table + SSE poll (053 already does this) |
| Captain → FO message | Chat input → channel message → `get_pending_messages` | UI form → Route Handler → daemon RPC → MCP response | New: write path from UI to daemon |
| Gate approve/reject | Dashboard button → channel message | UI button → Route Handler → write gate decision to DB/daemon | New: gate interaction API |
| Captain comments → FO | `get_comments` MCP tool reads comments | FO reads comments table (already works via 054 persistence) | ✅ Already works (FO can query DB) |
| Reconnect recovery | `get_pending_messages` replays missed events | `getChannelMessagesSince` via bridge RPC | Bridge already implements this |

## Acceptance Criteria

- Given a CC session with FO running, when FO calls the `reply` MCP tool with a message, then the message appears in the spacebridge UI's activity feed within 2 seconds (how to verify: FO sends reply, browser shows message in SSE feed)
- Given the spacebridge UI with a chat input, when captain types a message and submits, then the connected CC session receives the message via `get_pending_messages` MCP tool (how to verify: submit chat in UI, FO calls get_pending_messages, assert message appears)
- Given an entity at a gate stage (plan/uat), when the UI shows an approve/reject button and captain clicks approve, then the gate decision is written to DB and the FO's next idle/poll cycle detects the approval (how to verify: click approve in UI, FO event loop picks up approval)
- Given the MCP shim disconnects and reconnects, when FO calls `get_pending_messages` with the last known sequence, then all messages sent during the disconnect window are returned (how to verify: disconnect shim, send 3 messages from UI, reconnect, assert 3 messages in response)
- Given the spacebridge UI is open in a browser, when the Next.js dev server starts, then the UI connects to the daemon via Route Handler → socket RPC and displays the connection status (how to verify: start daemon + UI, assert "Connected" indicator in UI header)

## Dependencies

- Entity 053 (shipped) — Next.js app, SSE endpoint, entity cards
- Entity 054 (shipped) — Comments API, Route Handlers pattern
- Entity 057 (shipped) — Session registry, socket-server RPC handling
- Blocks: Entity 060 (cutover) — cannot delete old dashboard until channel parity achieved

## Directive Annotations (explore cross-check 2026-04-15)

Directive paths audited against actual codebase — multiple corrections needed:

- `spacebridge/daemon/channel-provider-bridge.ts` (⚠ contradicted: actual path is `spacebridge/src/ipc/channel-provider-bridge.ts`) [primary]
- `spacebridge/daemon/socket-server.ts` (⚠ contradicted: actual path is `spacebridge/src/ipc/socket-server.ts`) [primary]
- `spacebridge/src/cli.ts (mcp subcommand)` (⚠ contradicted: actual path is `spacebridge/bin/cli.ts`) [primary]
- `tools/dashboard/` 5 MCP tools (reply, get_comments, add_comment, reply_to_comment, update_entity + get_pending_messages) (✓ confirmed by explore: tools/dashboard/src/channel.ts:178,199,211,225,240,277 — handlers at :301,314,324,349,376,501) [primary]
- "MCP shim (cli.ts mcp) — CC session connects via stdio ✅" (⚠ contradicted: bin/cli.ts:54-74 mcp subcommand is a STUB — auto-forks daemon + await Promise, no stdio bridge; cli.ts:69-71 comment explicitly defers wiring to entity 053. 099 must DESIGN all 6 MCP tool handlers, not merely wire existing ones. See Q-2) [primary]
- "Session registry (entity 057) — tracks connected sessions ✅" (✓ partial: registry.ts interface exists but internal-only per registry.ts:4; no RPC surface. A-8 captures the gap — no "primary/active session" concept for UI to bind to) [primary]
- Target Architecture diagram: "Route Handlers → daemon RPC" (⚠ contradicted: entity 054's shipped Comments Route Handler bypasses daemon RPC entirely, writes directly to SQLite via openWritableDb. See O-1 — 099 must explicitly pick between 054 precedent and Directive's new architecture. See Q-4) [primary]

## Assumptions

### A-1: Directive contains path-reference errors that must be corrected before plan
- **Confidence**: Confident (0.95)
- **Evidence**: All 4 explorers independently surfaced path mismatches. Actual `spacebridge/src/ipc/channel-provider-bridge.ts:23-75` + `spacebridge/src/ipc/socket-server.ts:40-194` + `spacebridge/bin/cli.ts:54-74` + `spacebridge/src/domain/session/registry.ts:21-32` + `tools/dashboard/src/channel.ts` (not channel-server.ts) [primary]
- **Additional evidence**: Angle iv seed 11 refuted `tools/dashboard/src/channel-server.ts` exists — only channel.ts (25K monolith) [primary]

### A-2: 6 MCP tools (reply, get_comments, add_comment, reply_to_comment, update_entity, get_pending_messages) exist in tools/dashboard/src/channel.ts only, NOT in spacebridge
- **Confidence**: Confident (0.95)
- **Evidence**: Angle iv seed 3 verdict confirmed — all 6 tool names registered at tools/dashboard/src/channel.ts:178,199,211,225,240,277; handlers at :301,314,324,349,376,501 [primary]
- **Additional evidence**: spacebridge/bin/cli.ts:54-74 mcp subcommand shape: autoForkDaemon + writeStderr + await new Promise(() => {}) — no MCP tool registration, no stdio transport wiring; comment lines 69-71 explicitly mark this as entity 053 scope (though 053 shipped Next.js app + SSE, not MCP shim per Angle ii) [primary]

### A-3: spacebridge/bin/cli.ts mcp subcommand is a stub; full MCP stdio bridge wiring is part of 099 scope
- **Confidence**: Confident (0.95)
- **Evidence**: cli.ts:54-74 body is `autoForkDaemon() → log to stderr → await new Promise(() => {})`; no stdin/stdout pipe, no MCP transport layer, no tool handlers [primary]
- **Additional evidence**: grep of all spacebridge source for "get_pending_messages|reply|add_comment" matches only domain/schema files, not MCP tool registrations (Angle iv seed 7) [secondary]

### A-4: IPC types.ts defines event-push/action-push for daemon→shim unsolicited messages, but zero production publishers exist
- **Confidence**: Confident (0.90)
- **Evidence**: spacebridge/src/ipc/types.ts:22-40 declares 2 push types (event-push, action-push) [primary]
- **Additional evidence**: grep shows only test files invoke pushToSession/pushToAll with these types; daemon bin/daemon.ts never calls server.pushToSession in steady state — push channel is wired at protocol level but has zero business-logic senders (Angle i Unknown Unknowns) [secondary]

### A-5: Next.js UI runs as separate child process of daemon; no direct socket/IPC link; data path is daemon → SQLite → UI SSE poll (500ms) → browser EventSource
- **Confidence**: Confident (0.95)
- **Evidence**: bin/daemon.ts:252 spawnNextjsChild spawns UI as child; communication via SPACEBRIDGE_DB_PATH env var + shared SQLite only [primary]
- **Additional evidence**: spacebridge/ui/app/api/events/route.ts:1-94 uses ReadableStream + setInterval(poll, 500) on SQLite events table; spacebridge/ui/app/api/share/events/route.ts:1-94 matches the pattern (Angle i, Angle iv seed 2) [primary]

### A-6: Entity 054's Comments Route Handler pattern writes directly to SQLite via openWritableDb, bypassing daemon RPC
- **Confidence**: Confident (0.95)
- **Evidence**: spacebridge/ui/app/api/entities/[slug]/comments/route.ts:71-169 uses createDb(defaultDbPath()) + fmodel decide/evolve/appendEvents, then inserts notification row into events table for SSE fan-out [primary]
- **Additional evidence**: Angle iv seed 1+4 refuted any socket/RPC/daemon keyword in spacebridge/ui/app/api/**/route.ts (0 matches); UI write path is 100% direct-SQLite [primary]
- **Tension**: This CONTRADICTS Directive's architecture diagram (Route Handler → daemon RPC). 099's central design question is whether to establish a new pattern or follow 054's precedent. See O-1

### A-7: Daemon RPC dispatch in bin/daemon.ts onRpcRequest is a flat if-chain (no handler registry); adding new RPC methods means appending if-branches
- **Confidence**: Confident (0.95)
- **Evidence**: spacebridge/bin/daemon.ts:96-223 shows if (req.method === "__status" / "share_create" / "share_revoke" / "share_list") chain [primary]
- **Additional evidence**: Angle iv seed 10 confirmed 4 RPC methods exposed on channel-provider-bridge via object-method dispatch (publishEvent, broadcastChannelStatus, getChannelMessagesSince, createSnapshot); 2 stubbed (getAll, listVersions throw not-implemented) [primary]

### A-8: Session registry has no "primary/active/current session" concept — returns ALL active roots; 099 must design session-selection semantics for UI→captain-action routing
- **Confidence**: Confident (0.95)
- **Evidence**: Angle iv seed 8 refuted activeSession/currentSession/primarySession keywords across spacebridge (0 matches) [primary]
- **Additional evidence**: spacebridge/src/domain/session/registry.ts:21-32 SessionRegistry interface exposes getState() + getActiveProjectRoots() → string[] (returns all) + discoverActiveWorkflows() → Workflow[]; no single-session accessor (Angle ii + Angle i) [primary]

### A-9: CONTRACTS.md ledger shows 053/054/057 as "planned" but code-level evidence shows they're shipped (MEMORY A-10 CONTRACTS hygiene drift)
- **Confidence**: Likely (0.75)
- **Evidence**: Angle iii reports CONTRACTS.md:667-803 marks 053/054/057 as 🔵 planned; Angle i directly reads and confirms shipped code at all target paths (SSE route, comments Route Handler, session registry interface) [primary]
- **Additional evidence**: MEMORY `workflow-index Row Lifecycle Gap` + entity 108 A-10 — 8+ shipped entities carry stale 🔵 planned markers on CONTRACTS rows. Pattern consistent here [secondary]
- **Caveat**: captain should confirm — see Q-1

### A-10: No chat input UI component, no gate API, no event bus exist in spacebridge — all must be built from scratch
- **Confidence**: Confident (0.90)
- **Evidence**: Angle iv seeds 5 (gate-api), 6 (event-bus-daemon), 9 (chat-input-ui) all refuted — 0 matches across spacebridge source [primary]
- **Additional evidence**: Captain "messaging" today is limited to comment/reply forms (add-comment-form.tsx, reply-form.tsx, text-selection-popover.tsx) which write Comment events, not captain↔FO chat messages [secondary]

## Option Comparisons

### O-1: UI write-path architecture (CENTRAL DESIGN QUESTION)

Directive mandates "Route Handler → daemon RPC" but 054 precedent is "Route Handler → direct SQLite". 099 must pick.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Route Handler → daemon RPC bridge** (per Directive) | Single write path; daemon owns all mutations; MCP tools can be invoked for captain actions; clean separation of concerns | New infrastructure (Route Handler must import socket-client dynamically); latency +1 hop; requires daemon RPC method registry refactor (per A-7 if-chain → handler map); contradicts shipped 054 precedent | High | Viable |
| **(b) Route Handler → direct SQLite** (per 054 precedent) | Consistent with 054 shipped pattern; no new infrastructure; lowest latency; simplest code path; events table already triggers SSE fan-out | FO must poll events table for captain actions (no direct MCP response); captain approvals arrive async, not synchronously acked; bypasses daemon's session-routing capability | Low | ✅ Recommended |
| **(c) Hybrid — read via SQLite, write via RPC for captain-initiated actions only** | Clear boundary: passive reads follow 054, active captain actions get daemon-mediated delivery for guaranteed session routing; enables get_pending_messages-style reconnect recovery properly | Two patterns to maintain; captain must internalize which mutations go which path; more code surface | Medium | Viable |

**Recommendation validation**: Option (b) aligns with 054 shipped architecture. Return value trace: UI POST → SQLite events row → SSE poll (500ms) → browser + FO discovers via events query. 2-level trace confirms FO reads events table (not notified). Design invariant check: consistent with 053's "Poll events table at 500ms" decision. BUT — async latency may not satisfy Acceptance Criteria #3 "FO's next idle/poll cycle detects the approval" (acceptable because AC doesn't demand sync). (✅ validated) BUT — captain may want synchronous ack for gate approvals, which points to option (c) for gate-path only. See Q-4.

### O-2: Active session routing for captain→FO messages

A-8: no single-session concept today.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Project-root scoped, most-recent-heartbeat wins** | Deterministic without UI state; works for single-project-per-captain case; reuses sessions table last_heartbeat column | Ambiguous for multi-session-per-root (2 CC instances on same repo); silent routing failures | Low | ✅ Recommended (for v1) |
| **(b) UI picker — captain selects target session** | Explicit; no ambiguity; works for power users with multiple concurrent sessions | New UI surface; stateful; captain must track session IDs | Medium | Viable |
| **(c) Broadcast to ALL matching sessions, let FO de-dupe** | Simplest implementation; no session identification needed | Wasted work; potential duplicate captain-action processing; coordination burden on FO | Low | Not recommended |

**Recommendation validation**: Option (a) works with current session registry surface (last_heartbeat column from 057). Return trace: captain action → sessions.select where project_root = X order by last_heartbeat desc limit 1 → socket-server.pushToSession(sessionId) → MCP shim → CC session. Design invariant check: aligned with 057's session registry scope (project-root tracking). (✅ validated)

### O-3: Daemon → UI push mechanism

A-4: event-push/action-push protocol exists, zero senders.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Keep 500ms SSE polling (per 053 decision)** | Zero infrastructure work; captain-visible latency acceptable for gate workflows; aligns with shipped 053 O-2 decision | 500ms latency floor; poll load scales with UI instance count; no "instant" push feel | Low | ✅ Recommended |
| **(b) Activate event-push IPC + daemon socket client from UI process** | Sub-100ms latency; reduces sqlite poll load; wire-compatible with existing protocol | Requires UI process to open socket to daemon (breaks "UI is separate child process" invariant per A-5); new infrastructure for UI-side socket-client bootstrap | High | Viable |
| **(c) Upgrade to WebSocket for realtime** | Industry-standard; familiar; bidirectional | Contradicts 053 shipped decision (SSE over WebSocket for tunnel compatibility); new infrastructure | Medium | Not recommended |

**Recommendation validation**: Option (a) preserves 053 shipped architectural stance. 500ms is acceptable for captain-in-the-loop UX. (✅ validated)

## Open Questions

### Q-1: Are dependencies 053/054/057 actually shipped at the code level despite CONTRACTS showing "planned" status?
- **Domain**: scope prerequisite / CONTRACTS hygiene
- **Status**: **RESOLVED by SO self-investigation** — shipped-at-code-level confirmed; CONTRACTS ledger is stale (MEMORY A-10 pattern)
- **Evidence**: Git log confirms PR #44 (053, 2026-04-14 07:51:57 bf02ccc), PR #47 (057, 12:12:46 c118f8e), PR #48 (054, 12:12:49 77728b5) all merged. 099 proceeds without blocker. Hygiene-fix seeds into entity 108's A-10 `workflow-index-contracts-hygiene-diagnostic`. No captain interaction needed.
- **Cascades**: Q-5 auto-resolves (no sibling ship block — the "planned" markers are ledger drift). [primary]

### Q-2: Should 099 scope include ALL 6 MCP tool implementations (reply, get_comments, add_comment, reply_to_comment, update_entity, get_pending_messages) or scope narrow to "channel bridge infrastructure + chat/gate path only"?
- **Domain**: scope management
- **Why it matters**: A-2+A-3 confirm all 6 MCP tools must be built from scratch in spacebridge (not merely wired). That's substantial work: 6 tool handlers × (Zod schema + MCP registration + daemon RPC method + DB operation) plus the stdio bridge in bin/cli.ts. If 099 takes all 6 + chat + gate + session routing, scale escalates Medium→Large and decomposition is forced.
- **Suggested options**:
  1. **Full scope — all 6 MCP tools + chat + gate** — single Large entity; ships complete parity with old dashboard
  2. **Decompose: 099 = infrastructure (stdio bridge + RPC registry + session routing + chat/gate), 099b = 6 MCP tool handlers (can parallelize)** — two Medium entities; 099 lands first as foundation; 099b parallel-ships tools once bridge exists
  3. **Minimum viable — chat + gate only; defer MCP tool parity to post-060-cutover entity** — ships fastest but delays 060 cutover condition
- **Evidence for options**: [primary]

### Q-3: Which Directive path references need correction before plan?
- **Domain**: entity hygiene
- **Status**: **RESOLVED by SO self-investigation** — option 3 selected (implicit: `## Directive Annotations` section already added above serves as the errata log)
- **Rationale**: Directive is captain's immutable original framing (per build-clarify boundaries — `## Directive` never modified). The annotations section above functions as the corrections ledger that downstream plan/execute consume. No captain decision needed; preserves audit trail. [primary]

### Q-4: Given 054 precedent (Route Handler → direct SQLite) contradicts Directive's diagram (Route Handler → daemon RPC), which architectural truth wins?
- **Domain**: architecture foundation
- **Why it matters**: This is the O-1 central question. O-1 recommendation is (b) follow 054, but Directive was explicit about daemon RPC bridge. Captain must ratify — this decision cascades into O-2 and O-3.
- **Suggested options**:
  1. **Follow 054 precedent (O-1b)** — Recommended by explore; lowest complexity; 500ms poll latency is acceptable for captain workflows
  2. **Follow Directive architecture (O-1a)** — preserves captain's original framing; establishes daemon RPC as authoritative write path going forward
  3. **Hybrid (O-1c)** — passive writes go direct-SQLite (054 pattern), active captain-actions (gate approve/reject + chat) go via daemon RPC
- **Evidence for options**: [primary]

### Q-5: Siblings 053/057/059/050 all mark CONTRACTS "planned" status — is 099 blocked?
- **Domain**: sequencing / merge coordination
- **Status**: **RESOLVED by Q-1 cascade** — CONTRACTS is stale; 053/054/057 shipped at code level per PR history. 050 and 059 are not yet code-shipped (different situation from 053/054/057 which have PRs merged).
- **Residual check**: Quick grep confirms 050 spacebridge-plugin-skeleton (schema/db/drizzle) and 059 standalone-dir-distribution (cli/package) are less blocking for 099's scope — 099 doesn't touch schema.ts or standalone packaging. 099 proceeds. [primary]
- **Risk**: low-concurrent-merge on bin/cli.ts if 099 and 059 both modify it; plan stage can serialize or coordinate via workflow-index append.

## Core Tensions

- **essential**: **Directive architecture vs shipped precedent** — Directive mandates "Route Handler → daemon RPC"; entity 054 shipped "Route Handler → direct SQLite". These two architectural patterns cannot coexist transparently for a v1; captain must explicitly pick. O-1 captures this; Q-4 forces the decision.
- **domain-based**: **CONTRACTS ledger vs code truth** — CONTRACTS.md says 053/054/057 are "planned"; codebase evidence shows they're shipped-and-running. Angle i (code) and Angle iii (index) disagree on ground truth. Per MEMORY A-10, the ledger is the drifted artifact, but captain authoritative answer is required before 099 commits plan.
- **time-based**: **099 scope timing vs 060 cutover** — 060 cutover entity blocks on 099. If 099 takes full scope (6 MCP tools + infrastructure + UI), timeline to cutover extends. If 099 narrows to infrastructure + minimum viable UI, 060 is unblocked sooner but MCP tool parity work spawns to follow-on entity 099b.

## Honest Boundaries

- **Explore did not verify 060's exact cutover conditions**; Angle iii found 060 references "4 additional parity entities + 053+054+058" but did not enumerate the other 3. 099's relationship to the other parity entities is unverified.
- **Explore did not read `tools/dashboard/src/channel.ts` in full** (25K monolith, over 20-file cap). The exact Zod schemas + handler logic for the 6 MCP tools are unverified at function-signature level. Plan stage must port them carefully.
- **Explore found 4 other shipped-code-but-planned-CONTRACTS entities** (050, 052, 053, 054, 056, 057, 059) touching the same spacebridge source tree. Merge-conflict risk is not characterized in detail; plan stage must reconcile.
- **Angle i noted `spacebridge/src/daemon/nextjs-child.ts` was referenced but not fully read** (out of 20-file cap). The daemon-UI spawn mechanism may have constraints not surfaced here.
- **099's captain-action delivery assumed local-trust (no middleware auth)** — share view's bearer-token regime does NOT extend to local UI by default. If captain wants share-authenticated gate approvals, that's a separate design layer Q-5 does not cover.

## Decomposition Recommendation

⚠️ **Decomposition warranted — scope exceeds Medium**:

099's full scope (per Directive + Acceptance Criteria):
1. MCP stdio bridge wiring in bin/cli.ts (infrastructure)
2. Daemon RPC method registry refactor (infrastructure)
3. 6 MCP tool handlers (reply, get_comments, add_comment, reply_to_comment, update_entity, get_pending_messages) (parallel work)
4. Session-selection logic for captain→FO routing (new semantics)
5. UI Route Handlers for captain chat + gate approve/reject (new endpoints)
6. UI chat input component + gate approve/reject buttons (new components)

Proposed split (contingent on Q-2 option 2):

- **099 (this entity)** — scale `Medium`, scope: infrastructure foundation
  - MCP stdio bridge (bin/cli.ts)
  - Daemon RPC method registry (bin/daemon.ts)
  - Session-selection semantics (spacebridge/src/domain/session/ extension)
  - UI Route Handlers for chat + gate approve/reject (2-3 endpoints, follow 054 pattern per O-1b)
  - UI chat input + gate buttons (2-3 components)
  - Acceptance criteria: chat works, gate approve/reject works, daemon routes captain actions to correct CC session
  - Domain: spacebridge-channel-infrastructure

- **099b share-view-mcp-tool-parity** (child, spawn at handoff if Q-2 = option 2) — scale `Medium`, scope: 6 MCP tool handlers
  - Port reply + get_comments + add_comment + reply_to_comment + update_entity + get_pending_messages from tools/dashboard/src/channel.ts
  - Each tool: Zod schema + MCP registration in bin/cli.ts stdio bridge + daemon RPC method + DB operation
  - Parallel-friendly: 6 tools can be 6 parallel tasks once 099's infrastructure lands
  - Depends-on: 099
  - Domain: spacebridge-mcp-tools
  - Parent: 099

**Decomposition bypassed** if captain picks Q-2 option 1 (full scope, escalate 099 to Large) or option 3 (minimum viable, defer tools entirely).

## Stage Report: explore

- [x] Files mapped: 18 across contract, router, view, config (domain implicit in session/ipc src) layers
  contract: 3 (types.ts, framing.ts, schema.ts), router: 8 (socket-server, socket-client, channel-provider-bridge, daemon.ts, 4 API route files), view: 0 (out of scope), config: 7 (middleware, db.ts, cli.ts, 4 parent entity archives)
- [x] Assumptions formed: 10 (Confident: 9, Likely: 1, Unclear: 0)
  A-1 through A-8 + A-10 Confident via 4-angle convergent evidence; A-9 Likely (CONTRACTS vs code contradiction — see Q-1)
- [x] Options surfaced: 3
  O-1 UI write-path architecture (central design question); O-2 active session routing; O-3 daemon→UI push mechanism
- [x] Questions generated: 5
  Q-1 CONTRACTS vs code ship status; Q-2 scope (all 6 MCP tools vs decompose); Q-3 path corrections strategy; Q-4 architecture tiebreaker (Directive vs 054 precedent); Q-5 sibling ship blocking
- [x] α markers resolved: 0 / 0 (no brainstorm spec block; feature-intent entities with rich Directive + AC carry spec-equivalent content)
- [x] Scale assessment: revised from Medium to Large (unless decomposed per Q-2 option 2)
  6 MCP tools + infrastructure + chat+gate UI + session routing = Large. Decomposition recommendation proposes 099 (Medium infrastructure) + 099b (Medium MCP tools parallel)
- [x] Research dispatched: 0 researchers (skipped -- all assumptions are internal codebase verification, no external tech claims; evidence grounded in spacebridge source + tools/dashboard/ reference)

## Clarify Annotations

**Open Questions — resolved 2026-04-15:**

- Q-1 → **SO self-resolved** (git forensics): PR #44/#47/#48 merged; 053/054/057 shipped at code level. CONTRACTS ledger is stale (MEMORY A-10 pattern). No blocker.
- Q-2 → **Captain answer**: Decompose into 099 (Medium infrastructure) + 099b (Medium MCP tools). 099b parallel-ships 6 MCP tools once 099 bridge infrastructure lands.
- Q-3 → **SO self-resolved**: Directive Annotations section above serves as errata log; Directive itself stays immutable per skill rules.
- Q-4 → **Captain redirected the question** — revealed that O-1 framing missed fmodel CQRS reality (054 already runs UI-side CQRS). SO re-investigated fmodel usage and reframed as aggregate-level boundary decision. Final answer: **Chat + Gate both daemon-side CQRS** (new chat + gate aggregates with daemon RPC methods; session routing + synchronous ack).
- Q-5 → **SO self-resolved via Q-1 cascade**: 053/054/057 unblocked 099; 050/059 have low file-surface overlap (different domain).

**Captain Architectural Clarification (2026-04-15):**

Captain's challenge "何時會使用fmodel？是否ui要走cqrs？" revealed that O-1's original framing (direct SQLite vs daemon RPC) was incorrect. The actual situation:
- **Both paths are CQRS** — 054 ships UI-side CQRS (Route Handler dynamic-imports domain decide/evolve, runs full command cycle in UI process, writes to shared SQLite)
- The real boundary question is **where does the command execute**: UI process or daemon process
- Decision matrix by aggregate:
  - `comments` — UI-side (already shipped via 054; entity-scoped, no session routing needed)
  - `chat` (captain → FO) — **daemon-side** (needs session registry lookup + pushToSession synchronous notification; UI-side physically cannot route to specific CC)
  - `gate` (captain decision) — **daemon-side** (captain expects synchronous ack for approval, not 500ms-poll latency)
  - `leases` — daemon-side (existing coordination-client-bridge pattern)
  - `sessions` — daemon-side (existing registry pattern)

**Option Selection Summary:**

- O-1 (UI write-path architecture) → **Re-framed and selected: aggregate-by-aggregate CQRS boundary; Chat + Gate daemon-side**
- O-2 (active session routing) → **Project-root scoped, most-recent-heartbeat wins** (Recommended option; unchanged by O-1 re-framing; 057 last_heartbeat column supports this)
- O-3 (daemon → UI push mechanism) → **Keep 500ms SSE polling** (Recommended option; aligns with 053 shipped decision; captain explicitly did not re-contest this)

**Assumption Confirmations**:

All 10 assumptions (A-1 through A-10) ✓ confirmed. A-9 (CONTRACTS stale) upgraded Likely → Confident via git-log verification.

## Decomposition Recommendation (Confirmed)

⚠️ **Decomposition finalized**:

**099 (this entity)** — `scale: Medium`, `intent: feature`, scope: channel bridge infrastructure

Concrete scope:
1. MCP stdio bridge wiring in `spacebridge/bin/cli.ts` — replace stub (lines 54-74) with real MCP server registration + stdio transport
2. Daemon RPC handler registry refactor at `spacebridge/bin/daemon.ts:96-223` (flat if-chain → Map<method, handler> pattern)
3. Session-selection semantics in `spacebridge/src/domain/session/` — add `getActiveSessionByProjectRoot(root)` returning most-recent-heartbeat session
4. `chat` aggregate in `spacebridge/src/domain/chat/` — types.ts + decider.ts + evolve.ts + schema table chat_events; daemon RPC method `captain_chat` that executes the command cycle AND calls `socket-server.pushToSession(sessionId, actionPush)`
5. `gate` aggregate in `spacebridge/src/domain/gate/` — types.ts + decider.ts + evolve.ts + schema table gate_events; daemon RPC method `gate_decide` with same pattern
6. UI Route Handlers: `spacebridge/ui/app/api/entities/[slug]/chat/route.ts` + `.../gate/route.ts` — dynamic-import socket-client, forward to daemon RPC, return synchronous ack
7. UI components: chat input (`spacebridge/ui/components/chat-input.tsx`) + gate approve/reject (`spacebridge/ui/components/gate-buttons.tsx`)
8. Activate `action-push` flow: daemon's pushToSession writes to MCP shim side, shim emits notification to CC session's MCP client (appears as tool call result OR server-initiated event)
9. All 5 Acceptance Criteria from Directive pass in this entity

Domain: `spacebridge-channel-infrastructure`

**099b spacebridge-mcp-tool-parity** (child, spawn at handoff) — `scale: Medium`, `intent: feature`, scope: 6 MCP tool handlers parallel

Concrete scope:
1. Port each of 6 MCP tool handlers from `tools/dashboard/src/channel.ts`:
   - `reply` (line 178 → handler 301)
   - `get_comments` (line 199 → handler 314)
   - `add_comment` (line 211 → handler 324)
   - `reply_to_comment` (line 225 → handler 349)
   - `update_entity` (line 240 → handler 376)
   - `get_pending_messages` (line 277 → handler 501)
2. Each tool gets: Zod input schema + MCP tool registration in spacebridge's stdio bridge (depends-on 099) + daemon RPC method (via 099's registry) + domain fmodel operation (comments aggregate is already shipped; `reply` uses comment replies; `update_entity` writes entity_events per 054)
3. Parallel-friendly: 6 independent tool ports = 6 parallel troop tasks once 099 lands
4. Plan should structure as one task per tool with shared contract from 099

Domain: `spacebridge-mcp-tools`
Depends-on: 099
Parent: 099 (099b is child of 099)

## Stage Report: clarify

- [x] Open Questions resolved: 5 / 5
  Q-1 SO git-forensics; Q-2 captain decompose; Q-3 SO implicit; Q-4 captain daemon-side both (reframed); Q-5 SO cascade
- [x] Options selected: 3 / 3
  O-1 aggregate-level CQRS boundary with chat+gate daemon-side (re-framed via captain challenge); O-2 project-root + most-recent-heartbeat; O-3 keep 500ms SSE polling
- [x] Assumptions confirmed: 10 / 10
  All 10 upgraded or confirmed; A-9 (CONTRACTS stale) promoted Likely→Confident via git-log
- [x] Decomposition: warranted + finalized
  099 (Medium infrastructure) + 099b (Medium MCP tools parallel); 099b spawn at FO handoff
- [x] Child seeds queued: 1
  099b spacebridge-mcp-tool-parity — directive + scope + intent pre-drafted; FO spawns via /build at handoff
- [x] Captain architectural clarification captured: O-1 reframed from "direct SQLite vs daemon RPC" to aggregate-level CQRS boundary; fmodel usage map + CQRS reality documented for future audits
- [x] Sufficiency gate: PASS
  099 scope is concrete (9 deliverables itemized); plan stage can proceed.

## Research Findings

### Upstream Constraints

- **Clarify lock: chat+gate aggregates are daemon-side CQRS** -- captain's fmodel challenge (clarify §Captain Architectural Clarification) reframed O-1; comments remain UI-side (054 shipped), but chat + gate execute in daemon process with session routing + synchronous ack. Plan MUST NOT fall back to 054's direct-UI pattern for chat/gate (docs/build-pipeline/spacebridge-channel-bridge-bidirectional.md §Clarify Annotations). [primary]
- **Clarify lock: session routing = project-root scoped, most-recent-heartbeat wins** -- O-2 recommendation (a) selected unchanged; uses sessions.lastHeartbeat column from 057 (spacebridge/src/schema.ts:11-22). [primary]
- **Clarify lock: keep 500ms SSE polling** -- O-3 recommendation (a); no activation of event-push/action-push IPC for UI→browser channel. action-push IS used for daemon→shim unsolicited delivery (chat/gate ack to CC session). [primary]
- **LCD schema discipline** (spacebridge/src/schema.ts:1-6) -- new chat/gate tables must: text strings, integer PKs with autoincrement, epoch-ms integer timestamps, no JSON for queryable data, no RETURNING. [primary]
- **CQRS domain layout convention** (spacebridge/src/domain/comment/) -- each aggregate = types.ts + decider.ts + evolve.ts + errors.ts + schemas.ts + persistence.ts + matching .test.ts; decider is pure (no I/O); persistence is the only file allowed to import from schema/db. [primary]
- **Decomposition: 099b defers all 6 MCP tool handlers** -- Q-2 captain answer. 099 ships infrastructure + chat/gate only; MCP tool parity is a separate child entity.

### Existing Patterns

- **UI-side CQRS pattern** (spacebridge/ui/app/api/entities/[slug]/comments/route.ts:71-169) -- Route Handler dynamic-imports domain modules via relative path `../../../../../../src/domain/comment/*`, calls createDb(defaultDbPath()), runs load→replay→decide→appendEvents→upsertSnapshot, then inserts notification row into events table for SSE fan-out. This is NOT the pattern 099 uses for chat/gate; documented for contrast.
- **Comment decider template** (spacebridge/src/domain/comment/decider.ts:13-100) -- pure fn switch(cmd.type), throws typed errors, returns Event[]. 099 mirrors this shape for chat + gate. [primary]
- **Comment schemas + parseCommand helper** (spacebridge/src/domain/comment/schemas.ts:5-111) -- Zod discriminatedUnion("type") + .passthrough(); parseCommand/parseEvent exported. 099's chat/gate schemas follow this verbatim. [primary]
- **Comment persistence pattern** (spacebridge/src/domain/comment/persistence.ts:10-48) -- appendEvents(db, aggregateId, events, seqStart) + loadEvents + countEvents sequence. 099 replicates per aggregate. [primary]
- **Daemon RPC dispatch (current)** (spacebridge/bin/daemon.ts:106-178) -- flat `if (req.method === "__status")...if (req.method === "share_create")` chain with 4 shipped methods + default `RPC method {x} not implemented in daemon stub`. 099 refactors to `Map<string, Handler>` pattern per A-7 and adds 2 new handlers (captain_chat, gate_decide). [primary]
- **Socket server pushToSession** (spacebridge/src/ipc/socket-server.ts:176-181) -- `pushToSession(sessionId, msg): boolean` already implemented; writes encoded frame, returns false if socket dead. 099 invokes this from daemon RPC handler after successful decide/append, with msg.type === "action-push". [primary]
- **Shim-side push handler** (spacebridge/src/ipc/socket-client.ts:121-125) -- `if (msg.type === "event-push" || msg.type === "action-push") opts.onPush?.(msg)` already wired. 099 supplies an onPush handler in the MCP shim that converts action-push into MCP server-initiated notification. [primary]
- **Session registry interface** (spacebridge/src/domain/session/registry.ts:21-32) -- exposes getState / getActiveProjectRoots / discoverActiveWorkflows. 099 adds `getActiveSessionByProjectRoot(root): string | null` to this interface, reading state.sessions Map entries and selecting the one with max lastHeartbeat whose projectRoot matches. [primary]

### Library/API Surface

- **MCP SDK package** (`@modelcontextprotocol/sdk`) -- already used in tools/dashboard/src/channel.ts:1-6 as `import { Server } from "@modelcontextprotocol/sdk/server/index.js"` + `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"` + `import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js"`. NOT currently in spacebridge/package.json dependencies (checked: only drizzle-orm + zod). 099 Task 1 MUST add dependency + pin to a version matching tools/dashboard's lockfile to avoid protocol skew. Transport instantiation: `const transport = new StdioServerTransport()` + `await server.connect(transport)` (tools/dashboard/src/channel.ts:615). [primary]
- **MCP low-level handler API** -- tools/dashboard uses `server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }))` + `server.setRequestHandler(CallToolRequestSchema, async (req) => {...})`. 099 follows the same shape in bin/cli.ts. [primary]
- **Drizzle ORM SQLite insert semantics** (spacebridge/src/domain/comment/persistence.ts:17-25) -- `await db.insert(commentEvents).values({...})`; no RETURNING, no ON CONFLICT; sequenceNumber computed by caller via countEvents+1.

### Known Gotchas

- **bin/cli.ts mcp stub `await new Promise(() => {})`** (spacebridge/bin/cli.ts:74) -- replaced by proper stdio transport loop. If MCP server connection fails, the process must still keep stdin open (CC stdio transport requirement). [primary]
- **autoForkDaemon must precede MCP registration** (spacebridge/bin/cli.ts:61-67) -- ordering: daemon fork → socket-client connect → MCP server register tools → connect stdio transport. [primary]
- **session_id mismatch in heartbeat** (spacebridge/src/ipc/socket-server.ts:68-75) -- heartbeat includes sessionId in payload; server logs warning and ignores if mismatched. MCP shim must send heartbeat.sessionId consistent with register.sessionId. Existing socket-client handles correctly. [primary]
- **UI Route Handler socket-client bootstrap** -- entity 054's UI-side CQRS uses dynamic `await import("../../../../../../src/db")`. For 099, Route Handler dynamically imports socket-client + opens a new SocketClient per request (stateless Route Handler; no pooling in v1). Trade-off: connection-per-request is slow (~10ms) but matches Next.js Route Handler isolation. Pool optimization deferred post-060. [primary]
- **var hoisting in closure-heavy handlers** (MEMORY 2026-04-09) -- daemon-side chat/gate handlers use `const`/`let` exclusively.
- **A-4 action-push has zero production publishers today** -- 099 is the first production caller. Existing tests cover `pushToSession` correctness but not steady-state usage. Task 11 integration test covers the full UI→daemon→shim round-trip.

### Reference Examples

- **tools/dashboard/src/channel.ts:1-6** -- MCP SDK import shape (copy into spacebridge/bin/cli.ts).
- **tools/dashboard/src/channel.ts:615** -- `const transport = new StdioServerTransport(); await server.connect(transport);`.
- **spacebridge/ui/app/api/entities/[slug]/comments/route.ts:71-169** -- POST Route Handler reference; 099 mirrors top half (parse, validate), diverges to socket-client RPC instead of direct-DB.
- **spacebridge/src/domain/comment/** -- entire folder is the template 099 clones structurally for `chat` and `gate` aggregates.
- **spacebridge/bin/daemon.ts:119-151** -- share_create RPC handler shape; 099's captain_chat + gate_decide handlers follow same shape with decide/appendEvents replacing tokenManager calls.

## PLAN

<task id="task-0" model="sonnet" wave="0" skills="" test_first="false">
  <read_first>
    - spacebridge/bin/cli.ts
    - spacebridge/bin/daemon.ts
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/domain/session/registry.ts
    - spacebridge/src/domain/comment/persistence.ts
    - spacebridge/src/domain/comment/schemas.ts
    - spacebridge/src/schema.ts
    - spacebridge/ui/app/api/entities/[slug]/comments/route.ts
    - spacebridge/package.json
    - tools/dashboard/src/channel.ts
  </read_first>

  <action>
  Environment verification (per plan-write-discipline MEMORY). Run each check; abort plan if any fails:
  1. `grep -q "await new Promise<void>(() => {})" spacebridge/bin/cli.ts` -- confirms mcp stub still present.
  2. `grep -q 'not implemented in daemon stub' spacebridge/bin/daemon.ts` -- confirms flat if-chain default branch present.
  3. `test ! -d spacebridge/src/domain/chat && test ! -d spacebridge/src/domain/gate` -- confirms chat/gate aggregates absent.
  4. `! grep -q "getActiveSessionByProjectRoot" spacebridge/src/domain/session/registry.ts` -- confirms target method absent.
  5. `test ! -f 'spacebridge/ui/app/api/entities/[slug]/chat/route.ts' && test ! -f 'spacebridge/ui/app/api/entities/[slug]/gate/route.ts'` -- confirms new Route Handlers absent.
  6. `test ! -f spacebridge/ui/components/chat-input.tsx && test ! -f spacebridge/ui/components/gate-buttons.tsx` -- confirms components absent.
  7. `! grep -q '@modelcontextprotocol/sdk' spacebridge/package.json` -- expects SDK NOT yet a dep.
  8. `grep -q 'import { Server } from "@modelcontextprotocol/sdk/server/index.js"' tools/dashboard/src/channel.ts` -- confirms template intact.
  9. `test -f spacebridge/src/domain/comment/decider.ts && test -f spacebridge/src/domain/comment/persistence.ts` -- confirms template intact.
  10. `grep -cE 'sessionEvents|leaseEvents|commentEvents' spacebridge/src/schema.ts` -- expects ≥3 matches.

  If any check fails, STOP and return feedback-to: captain.
  </action>

  <acceptance_criteria>
    - All 10 checks pass (each echoed)
    - No source file modified by this task
  </acceptance_criteria>

  <files_modified>
    - (none — read-only verification)
  </files_modified>
</task>

<task id="task-1" model="haiku" wave="0" skills="" test_first="false">
  <read_first>
    - spacebridge/package.json
    - tools/dashboard/package.json
  </read_first>

  <action>
  Add `@modelcontextprotocol/sdk` to spacebridge/package.json dependencies. Version: string-match the exact pin in tools/dashboard/package.json (avoid protocol skew). Run `bun install` in the repo root to regenerate bun.lock. No code changes.
  </action>

  <acceptance_criteria>
    - `grep -q '"@modelcontextprotocol/sdk"' spacebridge/package.json` exits 0
    - Version pin in spacebridge/package.json matches tools/dashboard/package.json
    - `bun install` completes without error
  </acceptance_criteria>

  <files_modified>
    - spacebridge/package.json
    - bun.lock
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="0" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/src/schema.ts
    - spacebridge/src/domain/comment/persistence.ts
  </read_first>

  <action>
  Extend spacebridge/src/schema.ts with two event-log tables mirroring `commentEvents` / `sessionEvents` verbatim:

  ```typescript
  // ─── chat_events — [full CQRS] daemon-side chat aggregate ──
  export const chatEvents = sqliteTable("chat_events", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    aggregateId: text("aggregate_id").notNull(), // targetSessionId
    sequenceNumber: integer("sequence_number").notNull(),
    eventType: text("event_type").notNull(), // captain_message_sent | captain_message_delivered
    payload: text("payload").notNull(),
    timestamp: integer("timestamp").notNull(),
  });

  // ─── gate_events — [full CQRS] daemon-side gate aggregate ──
  export const gateEvents = sqliteTable("gate_events", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    aggregateId: text("aggregate_id").notNull(), // "${entitySlug}::${stage}"
    sequenceNumber: integer("sequence_number").notNull(),
    eventType: text("event_type").notNull(), // gate_approved | gate_rejected
    payload: text("payload").notNull(),
    timestamp: integer("timestamp").notNull(),
  });
  ```

  Write `tests/spacebridge/schema-chat-gate.test.ts` (Wave 0 infrastructure test): asserts `chatEvents` + `gateEvents` exports exist, column set matches spec, `createDb` + insert dry-run succeeds.
  </action>

  <acceptance_criteria>
    - `bun test tests/spacebridge/schema-chat-gate.test.ts` passes
    - `grep -q 'export const chatEvents' spacebridge/src/schema.ts` exits 0
    - `grep -q 'export const gateEvents' spacebridge/src/schema.ts` exits 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/schema.ts
    - tests/spacebridge/schema-chat-gate.test.ts
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="1" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/src/domain/comment/types.ts
    - spacebridge/src/domain/comment/decider.ts
    - spacebridge/src/domain/comment/evolve.ts
    - spacebridge/src/domain/comment/schemas.ts
    - spacebridge/src/domain/comment/persistence.ts
    - spacebridge/src/domain/comment/errors.ts
    - spacebridge/src/schema.ts
  </read_first>

  <action>
  Create `spacebridge/src/domain/chat/` aggregate, mirroring comment aggregate structurally:

  1. `types.ts` — `ChatCommand = { type: "send_captain_message"; messageId: string; targetSessionId: string; projectRoot: string; content: string; sentAt: number }`; `ChatEvent = { type: "captain_message_sent"; messageId; targetSessionId; projectRoot; content; sentAt }` | `{ type: "captain_message_delivered"; messageId; deliveredAt }`; `ChatState = Map<messageId, { messageId; targetSessionId; content; sentAt; deliveredAt: number | null }>`.
  2. `errors.ts` — `DuplicateMessageId`.
  3. `decider.ts` — pure `decide(cmd, state, now): ChatEvent[]`. `send_captain_message`: if state.has(messageId) throw DuplicateMessageId; return `[captain_message_sent]`. Session existence is NOT checked in decider (handler responsibility).
  4. `evolve.ts` — `evolve(state, event): ChatState` + `replay(events)`.
  5. `schemas.ts` — Zod `ChatCommandSchema` / `ChatEventSchema` via discriminatedUnion + `.passthrough()` + `parseCommand`/`parseEvent` helpers.
  6. `persistence.ts` — `appendEvents(db, aggregateId, events, seqStart)` + `loadEvents` + `countEvents`; aggregateId = `targetSessionId`; table = `chatEvents`.

  Tests: `decider.test.ts` (happy + duplicate), `evolve.test.ts`, `schemas.test.ts` (malformed rejection), `persistence.test.ts` (round-trip + multi-event).
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/domain/chat/` passes
    - `ls spacebridge/src/domain/chat/ | grep -cE "^(types|decider|evolve|errors|schemas|persistence)\.ts$"` outputs 6
    - `! grep -E "from.*\"(\\.\\./)+(schema|db)\"" spacebridge/src/domain/chat/decider.ts` (decider is pure — zero schema/db imports)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/domain/chat/types.ts
    - spacebridge/src/domain/chat/decider.ts
    - spacebridge/src/domain/chat/evolve.ts
    - spacebridge/src/domain/chat/errors.ts
    - spacebridge/src/domain/chat/schemas.ts
    - spacebridge/src/domain/chat/persistence.ts
    - spacebridge/src/domain/chat/decider.test.ts
    - spacebridge/src/domain/chat/evolve.test.ts
    - spacebridge/src/domain/chat/schemas.test.ts
    - spacebridge/src/domain/chat/persistence.test.ts
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="1" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/src/domain/comment/types.ts
    - spacebridge/src/domain/comment/decider.ts
    - spacebridge/src/domain/comment/evolve.ts
    - spacebridge/src/domain/comment/schemas.ts
    - spacebridge/src/domain/comment/persistence.ts
    - spacebridge/src/schema.ts
  </read_first>

  <action>
  Create `spacebridge/src/domain/gate/` aggregate, same structural shape as chat:

  1. `types.ts` — `GateCommand = { type: "approve_gate" | "reject_gate"; entitySlug: string; stage: string; decidedBy: string; reason?: string }`; `GateEvent = { type: "gate_approved"; entitySlug; stage; decidedBy; decidedAt }` | `{ type: "gate_rejected"; entitySlug; stage; decidedBy; reason; decidedAt }`; `GateState = Map<"${entitySlug}::${stage}", { decision: "approved" | "rejected"; decidedAt; decidedBy; reason: string | null }>`.
  2. `errors.ts` — `GateAlreadyDecided`.
  3. `decider.ts` — pure; throws `GateAlreadyDecided` if `${entitySlug}::${stage}` already in state.
  4. `evolve.ts` — `evolve` + `replay`.
  5. `schemas.ts` — discriminatedUnion + helpers.
  6. `persistence.ts` — aggregateId = `"${entitySlug}::${stage}"`, table = `gateEvents`.

  Tests mirror chat aggregate tests.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/domain/gate/` passes
    - `ls spacebridge/src/domain/gate/ | grep -cE "^(types|decider|evolve|errors|schemas|persistence)\.ts$"` outputs 6
    - Decider has zero schema/db imports
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/domain/gate/types.ts
    - spacebridge/src/domain/gate/decider.ts
    - spacebridge/src/domain/gate/evolve.ts
    - spacebridge/src/domain/gate/errors.ts
    - spacebridge/src/domain/gate/schemas.ts
    - spacebridge/src/domain/gate/persistence.ts
    - spacebridge/src/domain/gate/decider.test.ts
    - spacebridge/src/domain/gate/evolve.test.ts
    - spacebridge/src/domain/gate/schemas.test.ts
    - spacebridge/src/domain/gate/persistence.test.ts
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="1" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/src/domain/session/registry.ts
    - spacebridge/src/domain/session/types.ts
    - spacebridge/src/domain/session/evolve.ts
  </read_first>

  <action>
  Extend `SessionRegistry` interface at spacebridge/src/domain/session/registry.ts with a synchronous method:

  ```typescript
  getActiveSessionByProjectRoot(projectRoot: string): string | null;
  ```

  Impl: iterate `state.sessions.values()`, filter `record.projectRoot === projectRoot && record.status === "connected"`, return sessionId of max `lastHeartbeat`, or null.

  Tests at `spacebridge/src/domain/session/registry-active.test.ts`: null when empty; sole session returned; most-recent wins; disconnected ignored; exact string match (no prefix).
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/domain/session/registry-active.test.ts` passes
    - `grep -q "getActiveSessionByProjectRoot" spacebridge/src/domain/session/registry.ts` exits 0
    - All existing registry tests still pass: `bun test spacebridge/src/domain/session/`
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/domain/session/registry.ts
    - spacebridge/src/domain/session/registry-active.test.ts
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="2" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/bin/daemon.ts
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/domain/chat/decider.ts
    - spacebridge/src/domain/chat/persistence.ts
    - spacebridge/src/domain/chat/schemas.ts
    - spacebridge/src/domain/chat/evolve.ts
    - spacebridge/src/domain/gate/decider.ts
    - spacebridge/src/domain/gate/persistence.ts
    - spacebridge/src/domain/gate/schemas.ts
    - spacebridge/src/domain/gate/evolve.ts
    - spacebridge/src/domain/session/registry.ts
  </read_first>

  <action>
  Refactor `spacebridge/bin/daemon.ts:106-178` (`onRpcRequest` if-chain) to a handler registry AND wire 2 new handlers:

  1. Introduce `type RpcHandler = (args: unknown[], ctx: RpcCtx) => Promise<RpcResponsePayload>;` with `RpcCtx = { db, sessionRegistry, socketServer, tokenManager, tunnelControl }` (tunnelControl captures the existing tunnelProvider/tunnelUrl closure mutators).
  2. `const rpcHandlers = new Map<string, RpcHandler>()`. Extract existing `__status`, `share_create`, `share_revoke`, `share_list` into named handler fns; populate map. Preserve all existing behavior verbatim.
  3. Add `captain_chat` handler: `parseCommand(args[0])` from chat/schemas → `sessionRegistry.getActiveSessionByProjectRoot(cmd.projectRoot)` → if null return `{ error: "No active CC session for project root" }` → `loadEvents` + `replay` → `decide` → `appendEvents` → `socketServer.pushToSession(targetSessionId, { id: randomUUID(), type: "action-push", payload: { action: "captain_chat", messageId: cmd.messageId, content: cmd.content, sentAt: cmd.sentAt } })` → return `{ result: { messageId, delivered: <pushToSession boolean> } }`.
  4. Add `gate_decide` handler: parseCommand → decide (throws GateAlreadyDecided propagates as rpc-response error) → appendEvents → lookup active session → pushToSession with `action: "gate_decided"` → insert notification row into `events` table (for SSE feed) → return `{ result: { decision: "approved"|"rejected", decidedAt } }`.
  5. Replace if-chain with `const handler = rpcHandlers.get(req.method); if (!handler) return { error: \`RPC method ${req.method} not implemented in daemon stub\` }; return handler(req.args as unknown[], ctx);`
  6. Wire `sessionRegistry = await createSessionRegistry({ db })` in cmdStart; the existing `sessions` Map stays as socket-server book-keeping (socket closeness) but authoritative session lookup goes through sessionRegistry.

  Integration test `spacebridge/bin/daemon-rpc-chat-gate.test.ts`:
  - boot daemon (SPACEBRIDGE_SKIP_UI=1, test state dir)
  - register a fake shim session via SocketClient; send heartbeat
  - rpc captain_chat; assert delivered:true + action-push frame received by test shim
  - rpc captain_chat with wrong projectRoot; assert error "No active CC session"
  - rpc gate_decide; assert decision in response + row in `gate_events` + notification row in `events`
  - rpc gate_decide twice; assert GateAlreadyDecided on 2nd
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/bin/daemon-rpc-chat-gate.test.ts` passes
    - `grep -q "rpcHandlers.get(req.method)" spacebridge/bin/daemon.ts` exits 0
    - `grep -qE 'rpcHandlers.set\("captain_chat"' spacebridge/bin/daemon.ts` exits 0
    - `grep -qE 'rpcHandlers.set\("gate_decide"' spacebridge/bin/daemon.ts` exits 0
    - All existing daemon tests still pass
  </acceptance_criteria>

  <files_modified>
    - spacebridge/bin/daemon.ts
    - spacebridge/bin/daemon-rpc-chat-gate.test.ts
  </files_modified>
</task>

<task id="task-7" model="sonnet" wave="2" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/bin/cli.ts
    - tools/dashboard/src/channel.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/daemon/auto-fork.ts
  </read_first>

  <action>
  Replace the stub body in `spacebridge/bin/cli.ts:54-74` (mcp subcommand) with full MCP stdio bridge. Keep `autoForkDaemon` call intact. After daemon fork:

  1. Create SocketClient: `const client = createSocketClient({ socketPath, sessionId: randomUUID(), projectRoot: process.cwd(), pid: process.pid, onPush: handleActionPush, reconnect: { maxRetries: 5 } }); await client.connect();`
  2. Create MCP `Server` per tools/dashboard/src/channel.ts:1-6 pattern. Register `ListToolsRequestSchema` handler returning empty tools array (099 does NOT register the 6 MCP tools — 099b's scope). Register `CallToolRequestSchema` handler rejecting any call with "Tool not implemented in 099 scope — see 099b".
  3. `handleActionPush(msg)` closure: dispatch by `msg.payload.action`:
     - `captain_chat` → `server.notification({ method: "notifications/spacebridge/captain_message", params: msg.payload })`
     - `gate_decided` → `server.notification({ method: "notifications/spacebridge/gate_decided", params: msg.payload })`
  4. `const transport = new StdioServerTransport(); await server.connect(transport);`
  5. Graceful shutdown: SIGTERM → `client.close()` → `server.close()` → exit(0).

  Test `spacebridge/bin/cli-mcp.test.ts` (integration, spawns subprocess):
  - spawn `bun run bin/cli.ts mcp` with SPACEBRIDGE_SKIP_UI=1 + test socket path; wait for daemon-ready stderr
  - send MCP `initialize` JSON-RPC to stdin; assert valid initialize response on stdout within 2s
  - from a separate test daemon handle, `pushToSession(sessionId, { type: "action-push", payload: { action: "captain_chat", messageId: "m1", content: "hi", sentAt: Date.now() } })`; assert `notifications/spacebridge/captain_message` appears on stdout
  - kill process with SIGTERM; assert exit code 0
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/bin/cli-mcp.test.ts` passes
    - `grep -q "StdioServerTransport" spacebridge/bin/cli.ts` exits 0
    - `grep -q "notifications/spacebridge/captain_message" spacebridge/bin/cli.ts` exits 0
    - `grep -q "notifications/spacebridge/gate_decided" spacebridge/bin/cli.ts` exits 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/bin/cli.ts
    - spacebridge/bin/cli-mcp.test.ts
  </files_modified>
</task>

<task id="task-8" model="sonnet" wave="3" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/ui/app/api/entities/[slug]/comments/route.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/domain/chat/schemas.ts
  </read_first>

  <action>
  Create `spacebridge/ui/app/api/entities/[slug]/chat/route.ts` with POST handler:

  1. `export const dynamic = "force-dynamic"` + slug regex guard (reuse 054's `SLUG_RE`).
  2. Parse JSON body `{ content: string }`; derive `projectRoot` from env `SPACEBRIDGE_PROJECT_ROOT` (fallback `process.cwd()`); generate `messageId` via `randomUUID()`; `sentAt = Date.now()`; `targetSessionId` placeholder (empty string) — daemon resolves via projectRoot.
  3. Validate full command via `parseCommand` from chat/schemas.
  4. Dynamically `await import("../../../../../../src/ipc/socket-client")` and `await import("node:crypto")`. Resolve `socketPath = ${SPACEBRIDGE_STATE_DIR || ~/.spacedock}/spacebridge.sock`.
  5. Open per-request SocketClient (sessionId = `ui-route-${randomUUID()}`, projectRoot = captured above, pid = process.pid, no onPush). `await client.connect()`. `await client.request({ id, type: "rpc-request", payload: { method: "captain_chat", args: [command] } })`. `client.close()`.
  6. Return `Response.json({ messageId, delivered: <from rpc-response> }, { status: 200 })`. On daemon-unreachable (connect error), return 502 with `{ error: "daemon unreachable" }`.

  Test `spacebridge/ui/app/api/entities/[slug]/chat/route.test.ts`:
  - happy path with mock daemon socket-server returning result:{delivered:true}; assert 200 + body
  - daemon unreachable (no socket file); assert 502
  - malformed JSON body; assert 400
  - invalid slug; assert 400
  </action>

  <acceptance_criteria>
    - `bun test 'spacebridge/ui/app/api/entities/[slug]/chat/route.test.ts'` passes
    - `test -f 'spacebridge/ui/app/api/entities/[slug]/chat/route.ts'` true
    - `grep -qE 'await import\(.*socket-client' 'spacebridge/ui/app/api/entities/[slug]/chat/route.ts'` exits 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/app/api/entities/[slug]/chat/route.ts
    - spacebridge/ui/app/api/entities/[slug]/chat/route.test.ts
  </files_modified>
</task>

<task id="task-9" model="sonnet" wave="3" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/ui/app/api/entities/[slug]/chat/route.ts
    - spacebridge/src/domain/gate/schemas.ts
  </read_first>

  <action>
  Create `spacebridge/ui/app/api/entities/[slug]/gate/route.ts` POST handler mirroring chat/route.ts structure. Body: `{ decision: "approve" | "reject"; stage: string; reason?: string }`. Builds `GateCommand` with `type: decision === "approve" ? "approve_gate" : "reject_gate"`, `entitySlug: slug`, `decidedBy: "captain"`, optional `reason`. Sends `{ method: "gate_decide", args: [command] }`. Returns 200 `{ decision, decidedAt }` OR 502 on daemon unreachable OR on GateAlreadyDecided (daemon returns `{ error }` on 2nd decide — preserve the error message verbatim in 502 body).

  Test `spacebridge/ui/app/api/entities/[slug]/gate/route.test.ts`: happy approve + happy reject + GateAlreadyDecided → 502 + daemon unreachable → 502 + malformed body → 400.
  </action>

  <acceptance_criteria>
    - `bun test 'spacebridge/ui/app/api/entities/[slug]/gate/route.test.ts'` passes
    - `test -f 'spacebridge/ui/app/api/entities/[slug]/gate/route.ts'` true
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/app/api/entities/[slug]/gate/route.ts
    - spacebridge/ui/app/api/entities/[slug]/gate/route.test.ts
  </files_modified>
</task>

<task id="task-10" model="haiku" wave="3" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/ui/components/add-comment-form.tsx
    - spacebridge/ui/components/reply-form.tsx
    - spacebridge/ui/components/entity-body.tsx
  </read_first>

  <action>
  Create two client components (`"use client"`):

  1. `spacebridge/ui/components/chat-input.tsx` — textarea + Send button. On submit, `fetch("/api/entities/${slug}/chat", { method: "POST", body: JSON.stringify({ content }) })`. Show sending state; on response, render `delivered: true` as green "✓ delivered" OR `delivered: false` as yellow "⚠ CC session offline". Network error: red banner.
  2. `spacebridge/ui/components/gate-buttons.tsx` — two buttons Approve / Reject. Reject opens a textarea for reason. POSTs to `/api/entities/${slug}/gate`. Disable buttons while in-flight; show result banner on success or error.

  Mount on `spacebridge/ui/components/entity-body.tsx`:
  - chat-input in a new "Chat" section (below existing comment panel)
  - gate-buttons conditionally rendered when frontmatter `status` is `plan` or `uat` AND `auto_advance !== true` (reads entity frontmatter already passed as props — extend props if needed)

  Smoke tests at `spacebridge/ui/components/chat-input.test.tsx` + `gate-buttons.test.tsx`: render, fill textarea, click button, assert mocked fetch called with correct URL + body.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/ui/components/chat-input.test.tsx spacebridge/ui/components/gate-buttons.test.tsx` passes
    - `test -f spacebridge/ui/components/chat-input.tsx && test -f spacebridge/ui/components/gate-buttons.tsx` true
    - `grep -qE "chat-input|ChatInput" spacebridge/ui/components/entity-body.tsx` exits 0
    - `grep -qE "gate-buttons|GateButtons" spacebridge/ui/components/entity-body.tsx` exits 0
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/components/chat-input.tsx
    - spacebridge/ui/components/gate-buttons.tsx
    - spacebridge/ui/components/chat-input.test.tsx
    - spacebridge/ui/components/gate-buttons.test.tsx
    - spacebridge/ui/components/entity-body.tsx
  </files_modified>
</task>

<task id="task-11" model="sonnet" wave="4" skills="superpowers:test-driven-development" test_first="true">
  <read_first>
    - spacebridge/bin/daemon.ts
    - spacebridge/bin/cli.ts
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-client.ts
  </read_first>

  <action>
  End-to-end integration test `spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts`:

  1. Boot daemon with SPACEBRIDGE_SKIP_UI=1 + isolated state dir.
  2. Spawn MCP shim (`bun run bin/cli.ts mcp`) as child process with piped stdio; wait for "daemon ready" stderr.
  3. Invoke chat Route Handler POST fn directly (import `../../ui/app/api/entities/[slug]/chat/route` and call POST with a mocked NextRequest). Real sockets connect to the test daemon.
  4. Assert MCP shim stdout emits `notifications/spacebridge/captain_message` within 2s (AC-1 latency).
  5. Invoke gate Route Handler POST fn; assert `notifications/spacebridge/gate_decided` on stdout.
  6. Verify AC-4 reconnect path: send 3 chat messages while shim is alive; kill shim; restart shim; assert `getChannelMessagesSince` (existing RPC on channel-provider-bridge) returns the expected events from `chat_events` table OR — if channel-provider-bridge's existing event-source is distinct from chat_events — directly query chat_events via daemon's DB-backed reconnect path and assert 3 rows recoverable.

  Note: test may require a bridge table between chat_events and the existing events-log that `getChannelMessagesSince` reads. If so, Task 6's daemon changes write a mirror row to the `events` table (already done for gate per Task 6 step 4) — do the same for chat to unify the reconnect replay path.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts` passes
    - Test asserts `notifications/spacebridge/captain_message` appears on shim stdout within 2s of UI POST (AC-1)
    - Test asserts `notifications/spacebridge/gate_decided` appears on shim stdout (AC-3)
    - Test asserts reconnect replay returns the 3 chat messages (AC-4)
    - Test asserts UI Route Handler → daemon RPC path round-trips (AC-5)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts
  </files_modified>
</task>

<task id="task-12" model="haiku" wave="4" skills="" test_first="false">
  <read_first>
    - spacebridge/bin/daemon.ts
    - spacebridge/bin/cli.ts
  </read_first>

  <action>
  Final verification sweep. Run `bun test` from repo root; run `cd spacebridge && bun run lint`; run biome format check. Fix any drift introduced by earlier tasks (import ordering, formatting). Re-run task-11's integration test to confirm end-to-end still passes after formatting changes.

  If any test fails here, fix inline; if a real regression surfaces that requires design change, escalate feedback-to: captain.
  </action>

  <acceptance_criteria>
    - `bun test` from repo root exits 0 with no failures
    - `cd spacebridge && bun run lint` exits 0
    - `cd spacebridge && bun run format:check` exits 0
    - All 5 Directive Acceptance Criteria verified by task-11 integration test passing
  </acceptance_criteria>

  <files_modified>
    - (none — verification-only; may touch formatting via biome --write)
  </files_modified>
</task>

## UAT Spec

### Browser
- [ ] Entity detail page loads with chat input visible below comment panel
- [ ] Entity at plan or uat stage shows Approve / Reject gate buttons; shipped entities do not
- [ ] Captain types message into chat input and clicks Send; within 2s UI shows green "✓ delivered"
- [ ] Captain clicks Approve on a gated entity; UI shows "Approved" result; entity advances in FO's next poll cycle
- [ ] When daemon is stopped, submitting chat shows red "daemon unreachable" banner (no blank failure)

### CLI
- [ ] `bun run spacebridge/bin/cli.ts mcp` starts MCP shim, logs "daemon ready" to stderr, keeps process alive awaiting stdio
- [ ] Sending MCP `initialize` request to shim stdin produces valid initialize response on stdout

### API
- [ ] `POST /api/entities/{slug}/chat` with `{ content: "hello" }` returns 200 `{ messageId, delivered: true }` when a CC session is registered for the project root
- [ ] `POST /api/entities/{slug}/chat` with no registered session returns 200 `{ messageId, delivered: false }` (message persisted but not pushed)
- [ ] `POST /api/entities/{slug}/gate` with `{ decision: "approve", stage: "plan" }` returns 200 `{ decision: "approved", decidedAt }`
- [ ] Double-approve same entity::stage returns 502 with GateAlreadyDecided error body
- [ ] Daemon unreachable returns 502, not 500

### Interactive
- [ ] Captain initiates chat from spacebridge UI and receives delivery confirmation end-to-end (live FO session)
- [ ] Captain approves/rejects a gated entity from UI and sees FO react to the decision (live FO session)

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 FO reply appears in UI feed within 2s | task-11 | `bun test spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts` | pending | -- |
| AC-2 Captain chat reaches CC via shim | task-7, task-11 | `bun test spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts` | pending | -- |
| AC-3 Gate approve flows to FO | task-9, task-11 | `bun test spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts` | pending | -- |
| AC-4 get_pending_messages reconnect recovery | task-11 | `bun test spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts` (reconnect subcase) | pending | -- |
| AC-5 UI connects to daemon via Route Handler → socket RPC | task-8, task-10 | `bun test 'spacebridge/ui/app/api/entities/[slug]/chat/route.test.ts'` + manual smoke | pending | -- |

## Stage Report: plan

- [x] Step 0.5 assumption re-validation: all cited assumptions hold
  Spot-checked A-1 (paths), A-3 (cli.ts:54-74 stub), A-4 (types.ts push types), A-7 (daemon.ts if-chain), A-8 (registry interface) via direct Read. Minor line-range shift on A-7 (actual 106-178 vs cited 96-223) but structure and default branch text unchanged — not a contradiction.
- [x] Topic extraction + research dedup: 2 residual topics, both inline-researched
  A-1..A-10 carry inline `(✓ confirmed by explore: ...)` / `(⚠ contradicted: ...)` annotations from 4-angle explore; residual topics (MCP SDK library surface + RPC registry refactor shape) researched inline via direct Read + grep.
- [x] Research synthesis: 5-subsection Research Findings written
  No contradictions surfaced (single-source or reinforcing citations throughout).
- [x] Plan writing: 13 tasks across 5 waves
  Wave 0 (tasks 0-2): env-verify, add SDK dep, schema tables. Wave 1 (tasks 3-5): chat + gate aggregates + session registry extension (parallel, no file overlap). Wave 2 (tasks 6-7): daemon RPC refactor + MCP shim (sequential — both touch bin/ and rely on Wave 1 aggregates). Wave 3 (tasks 8-10): UI Route Handlers + components (parallel, no file overlap). Wave 4 (tasks 11-12): integration test + final sweep.
- [x] Self-review: zero placeholders, type signatures consistent across tasks, wave dependencies valid, all 5 ACs mapped in Validation Map
  Scanned for `TBD`, `add appropriate`, `similar to Task N`, `as needed`, `...` — none found in task actions. Chat/Gate types declared in task-3/4 match consumption in task-6 + task-8/9. Wave ordering: no Wave N read_first references files first-written by another Wave N task.
- [ ] SKIP: Plan-checker subagent dispatch (Nuwa fanout OR monolithic)
  Ensign subagent context lacks Agent tool (per ensign-shared-core + MEMORY subagent-cannot-nest-agent-dispatch). Inline self-check performed covering Dim 1 (Requirement Coverage — all 5 ACs rowed), Dim 2 (Task Completeness — all 13 tasks have read_first/action/AC/files_modified), Dim 3 (Dependency — strict wave ordering, no cross-wave read_first violations detected), Dim 4 (Context Compliance — daemon-side CQRS for chat+gate per clarify lock respected; 500ms SSE polling preserved for UI push), Dim 6a/6b/6d (AC presence in Validation Map, 2s latency bound covered by task-11, Wave 0 creates schema tables and test infra before Wave 1 aggregates consume them). Dim 5/7/8/9/10 deferred to build-review stage (ensign has no Agent dispatch + Skill tool for workflow-index read mode in this context).
- [x] Revision iterations: 0 (no dispatched plan-checker — inline self-check only; see SKIP above)
- [x] Knowledge capture: skipped — no findings met D1/D2 threshold
  Research surfaced only entity-specific facts (SDK version pin, daemon-side CQRS architectural lock from clarify). No reusable cross-entity/cross-skill patterns that aren't already in MEMORY.
- [ ] SKIP: workflow-index append (unconditional step per skill contract) — deferred to FO
  Ensign subagent context lacks Skill tool for workflow-index:write mode (no positive evidence of Skill tool availability in nested subagent per MEMORY contract-tests-cover-unconditional-calls). Full append payload staged in §"workflow-index append payload" below for FO to apply at plan approval. This is a known skill contract gap — captain and FO should note that Case B band-aid in workflow-index-maintainer mod remains load-bearing until ensign contract allows Skill dispatch.

### workflow-index append payload (for FO to apply on approval)

```
entity: spacebridge-channel-bridge-bidirectional
stage: plan
status: planned
intent: "Channel bridge infrastructure + chat/gate daemon-side CQRS aggregates + MCP stdio shim"
files:
  - spacebridge/package.json
  - bun.lock
  - spacebridge/src/schema.ts
  - tests/spacebridge/schema-chat-gate.test.ts
  - spacebridge/src/domain/chat/types.ts
  - spacebridge/src/domain/chat/decider.ts
  - spacebridge/src/domain/chat/evolve.ts
  - spacebridge/src/domain/chat/errors.ts
  - spacebridge/src/domain/chat/schemas.ts
  - spacebridge/src/domain/chat/persistence.ts
  - spacebridge/src/domain/chat/decider.test.ts
  - spacebridge/src/domain/chat/evolve.test.ts
  - spacebridge/src/domain/chat/schemas.test.ts
  - spacebridge/src/domain/chat/persistence.test.ts
  - spacebridge/src/domain/gate/types.ts
  - spacebridge/src/domain/gate/decider.ts
  - spacebridge/src/domain/gate/evolve.ts
  - spacebridge/src/domain/gate/errors.ts
  - spacebridge/src/domain/gate/schemas.ts
  - spacebridge/src/domain/gate/persistence.ts
  - spacebridge/src/domain/gate/decider.test.ts
  - spacebridge/src/domain/gate/evolve.test.ts
  - spacebridge/src/domain/gate/schemas.test.ts
  - spacebridge/src/domain/gate/persistence.test.ts
  - spacebridge/src/domain/session/registry.ts
  - spacebridge/src/domain/session/registry-active.test.ts
  - spacebridge/bin/daemon.ts
  - spacebridge/bin/daemon-rpc-chat-gate.test.ts
  - spacebridge/bin/cli.ts
  - spacebridge/bin/cli-mcp.test.ts
  - spacebridge/ui/app/api/entities/[slug]/chat/route.ts
  - spacebridge/ui/app/api/entities/[slug]/chat/route.test.ts
  - spacebridge/ui/app/api/entities/[slug]/gate/route.ts
  - spacebridge/ui/app/api/entities/[slug]/gate/route.test.ts
  - spacebridge/ui/components/chat-input.tsx
  - spacebridge/ui/components/gate-buttons.tsx
  - spacebridge/ui/components/chat-input.test.tsx
  - spacebridge/ui/components/gate-buttons.test.tsx
  - spacebridge/ui/components/entity-body.tsx
  - spacebridge/tests/integration/captain-chat-and-gate.integration.test.ts
```

### Summary

Plan landed 13 tasks across 5 waves, honoring clarify's daemon-side CQRS architecture for chat + gate aggregates, project-root-most-recent-heartbeat session routing, and 500ms SSE polling for UI push. All 5 Directive ACs map to the Wave 4 integration test (task-11). Dependencies 053/054/057 confirmed shipped-at-code despite stale CONTRACTS rows. Plan-checker Agent dispatch and workflow-index Skill dispatch both skipped due to ensign subagent tool-surface constraints — inline self-check covers load-bearing dimensions and the full append payload is staged for FO application. Confidence 88% — captain gate recommended per >95% auto-advance threshold.

### Confidence Assessment

**Overall confidence: 88% — captain gate recommended**

Drivers:
- (+) Clarify output is unusually concrete (9 itemized deliverables, fmodel architecture locked, all 10 assumptions confirmed)
- (+) Comment aggregate is a clean structural template for chat + gate
- (+) `socket-server.pushToSession` + `socket-client.onPush` already wired; action-push IPC type declared (infrastructure ready)
- (+) 4-angle explore provided deep codebase evidence; minimal residual research gap
- (−) Plan-checker Nuwa fanout NOT dispatched (ensign tool-surface constraint); Dim 5/7/8/9/10 inline self-check weaker than dedicated agent
- (−) workflow-index append deferred to FO (ensign contract gap for Skill tool); FO must apply unconditionally at plan approval
- (−) MCP stdio bridge in task-7 is the most novel subsystem; transport lifecycle edge cases may surface only at execute time
- (−) task-11 integration test spans daemon + MCP shim + UI Route Handler with real sockets — orchestration can be flaky on CI

Per captain preference (>95% auto-advance, ≤95% captain gate): **88% → captain gate**. Primary captain-review items:
1. Approve deferring plan-checker dispatch to FO (ensign tool-surface constraint) and review inline self-check coverage
2. Approve deferring workflow-index append to FO application at plan approval
3. Approve plan's choice to defer all 6 MCP tool handlers to 099b (per clarify Q-2 captain answer — re-confirmation before FO kicks off execute)
