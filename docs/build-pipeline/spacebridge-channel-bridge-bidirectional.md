---
id: 099
title: "Spacebridge channel bridge — UI ↔ daemon ↔ CC bidirectional communication"
status: uat
context_status: ready
source: captain observation (2026-04-14 — new UI has no channel support, blocks cutover)
created: 2026-04-14T13:00:00+08:00
started: 2026-04-15T18:55:00+08:00
completed:
verdict:
score: 0.92
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

## Stage Report: quality

**Verdict**: fail
**Ran at**: 2026-04-15T15:30:00Z
**HEAD**: 90734d8
**feedback-to**: execute

### test
verdict: pass
command: bun test
evidence:
```
bun test v1.3.9 (cf6cdbbb)
[nextjs] [nextjs] ready on port 18421

spacebridge/src/domain/session/evolve.test.ts:
[session/evolve] session_reconnected for unknown session ghost -- no-op

 749 pass
 0 fail
 1855 expect() calls
Ran 749 tests across 72 files. [20.28s]
```

### lint
verdict: fail
command: bunx biome check .
evidence:
```
biome.json:2:14 deserialize -- configuration schema version mismatch (CLI 2.3.4 vs config 2.4.10)

Linting errors across 19 locations:
bin/daemon.ts:213:37 lint/suspicious/noExplicitAny (1 occurrence)
bin/daemon.ts:410:60 lint/style/noNonNullAssertion (1 occurrence)
src/domain/comment/auto-resolve.test.ts:118,131,132 lint/style/noNonNullAssertion (3 occurrences)
src/domain/comment/evolve.test.ts:25,88,114 lint/style/noNonNullAssertion (3 occurrences)
src/domain/comment/persistence.test.ts:280 lint/style/noNonNullAssertion (1 occurrence)
src/ipc/channel-provider-bridge.test.ts:33,50,82,83,97,98,107,108,120 lint/suspicious/noExplicitAny (9 occurrences)
src/ipc/framing.test.ts:126 lint/suspicious/noExplicitAny (1 occurrence)

× Some errors were emitted while running checks.
```

### typecheck
verdict: fail
command: bunx tsc --noEmit
evidence:
```
error TS2322: src/domain/lease/decider.test.ts(20,5)
  Type 'Map<string, LeaseToken>' is not assignable to expected 'Map<`${string}::${string}`, LeaseToken>'
  Type 'string' is not assignable to '`${string}::${string}`'

error TS2339: src/domain/session/registry.ts(135,35)
  Property 'disconnect' does not exist on type 'SessionRegistry | PromiseLike<SessionRegistry>'

error TS2339: src/domain/session/registry.ts(154,26)
  Property 'getActiveProjectRoots' does not exist on type 'SessionRegistry | PromiseLike<SessionRegistry>'

error TS2345: src/ipc/coordination-client-bridge.ts(90,38)
  Argument of type 'string' is not assignable to parameter of type '`${string}::${string}`'

error TS2345: src/ipc/coordination-client-bridge.ts(124,40)
  Argument of type 'string' is not assignable to parameter of type '`${string}::${string}`'

error TS2345: src/ipc/coordination-concurrent.test.ts(84,34)
  Argument of type '"sess-1"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'

error TS2345: src/ipc/coordination-concurrent.test.ts(85,34)
  Argument of type '"sess-2"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'

error TS2345: src/ipc/fo-simulator.integration.test.ts(81,33)
  Argument of type '"fo-session-1"' is not assignable to parameter of type '`${string}-${string}-${string}-${string}-${string}`'

Total: 8 errors
```

### build
verdict: skipped
command: bun build
evidence:
```
Build script not found in spacebridge/package.json. Spacebridge is a library (exports drizzle-orm + zod utilities), not a bundled application.
```

### regression
verdict: fail
command: n/a -- reuses Step 1 evidence
classification: current-entity-only
evidence:
```
Step 1 passed all tests (749 green). Regression gate auto-pass: no cross-entity regression possible when full test suite passes.

However, lint and typecheck failures below exist and must be verified against CONTRACTS.md for cross-entity scope.
- Lint: 19 issues in src/domain/comment, src/ipc, bin/daemon.ts -- must verify if these files are entity-099-owned or multi-entity
- Typecheck: 8 errors in src/domain/lease, src/domain/session, src/ipc -- must verify ownership

Note: Without git diff output showing file deltas from execute_base_sha, classification assumes current-entity scope for all failures. FO should verify against CONTRACTS.md.
```

### ratchet
verdict: pass
command: n/a -- composite per-language ratchet checks
evidence:
```
#### typescript
type_coverage: pass (includes src/**/*.ts, bin/**/*.ts per tsconfig include; 47/47 files covered)
test_count: pass (current=749 tests >= baseline not set, first run initialization)
ts_strict: pass (tsconfig.json "strict": true confirmed)
ts_as_any: pass (current=12 `as any` casts, no baseline for first run)
ts_ignore: pass (current=0 @ts-ignore/@ts-expect-error, no baseline for first run)

First run -- baselines will be initialized only if overall quality verdict becomes pass.
```

### coverage
verdict: skipped
command: n/a
evidence:
```
no threshold configured in workflow ops config
```

notes: ops.config.json absent from workflow directory; ratchet baselines not initialized pending overall pass verdict.
