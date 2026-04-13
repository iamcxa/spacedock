---
id: 057
title: "Multi-root session registry + file watcher"
status: clarify
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [053]
---

## Directive

> The spacebridge daemon serves all repos on a machine, not just one. It needs a session registry (🟢 fmodel CQRS domain) to track which CC sessions are connected, which project roots they own, and their liveness via heartbeat. The registry's active project roots drive workflow discovery (consuming entity 018's `discoverWorkflows` primitive) and file watcher scope. Without the registry, the daemon cannot aggregate cross-repo state or detect crashed sessions.

## Captain Context Snapshot

- **Repo**: main @ 8d19748
- **Session**: SO pipeline for spacebridge entities. 056/053/054 context ready. 057 next in queue.
- **Domain**: Behavioral/Callable, Organizational/Data-transforming, Runnable/Invokable
- **Related entities**: 053 -- Next.js war room + SSE live feed (draft, context ready -- consumes file watcher events via SSE), 056 -- Role-aware lease manager (draft, context ready -- sibling fmodel CQRS aggregate, same domain/ layout pattern), 050 -- Plugin skeleton + Drizzle schema (shipped -- `sessions` table already exists with fmodel-compatible columns), 018 -- Multi-root workflow discovery (explore -- `discoverWorkflows` primitive consumed here)
- **Created**: 2026-04-13T18:30:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the session registry as a pure fmodel CQRS aggregate in `spacebridge/src/domain/session/` (✓ confirmed by explore: entity 056 establishes identical pattern in `domain/lease/`; no `domain/` dir exists yet -- both 056 and 057 create it) following the same pattern established by entity 056's lease manager in `spacebridge/src/domain/lease/`. The domain layer has three parts: (1) a pure `decider` function that takes `SessionCommand` (register, heartbeat, disconnect) + `SessionState` (map of active sessions) and returns `SessionEvent[]` (✓ confirmed by explore: design doc §4.3:337-346 defines exact type signatures) -- covering register (duplicate session_id = reject), heartbeat (update `last_heartbeat`, reject if session not found), and disconnect (explicit removal); (2) an `evolve` function that applies events to state; (3) Zod schemas for commands and events with `.passthrough()` per design doc §3.5 (✓ confirmed by explore: entity 050/056 GUARDRAILS enforce .passthrough()). The existing `sessions` table in `schema.ts` (lines 10-23) already has fmodel-compatible columns (`eventType`, `aggregateId`, `sequenceNumber`, `payload`) (✓ confirmed by explore: schema.ts:10-23 verified) -- entity 057 adds a dedicated `session_events` append-only event log table alongside the existing snapshot table, mirroring the dual-table strategy from entity 056 (lease_events + entity_leases) (✓ confirmed by explore: entity 056 APPROACH uses identical dual-table pattern). On `session_registered` event, the daemon calls `discoverWorkflows()` with the union of all active sessions' `projectRoot` values to recompute the discovery scope (⚠ contradicted: discovery.ts:42 `discoverWorkflows(root: string)` takes a SINGLE root, not an array. Entity 018 is in explore status, not shipped -- see O-1). On `session_disconnected` (explicit or heartbeat timeout), the session is removed and discovery scope recomputes. A heartbeat monitor runs on `setInterval` inside the daemon (default 30s interval, configurable), scanning for sessions where `now - last_heartbeat > timeout_threshold` and emitting `disconnect` commands through the decider pipeline for stale sessions. Drizzle persistence appends events to `session_events`; on daemon restart, `evolve` replays all events to rebuild `SessionState`. The file watcher component uses Bun's native `fs.watch` API to watch the union of workflow directories derived from the session registry's active project roots. Watcher scope dynamically expands when a new session registers (new project root -> discover its workflow dirs -> add watchers) and contracts when a session disconnects (if no other session shares that project root -> remove watchers). File change events are debounced at ~100ms per (file, change-type) pair using a `Map<string, Timer>` pattern. Debounced events are classified as 🟡 event-log entries (observations, no decider -- per design doc §3.5) and appended to the `events` table (existing, schema.ts:44-58) (⚠ partial fit: events table has NOT NULL `entity` and `stage` columns that don't naturally map to file change events -- see O-2), then pushed to all connected SSE clients (✓ confirmed by explore: entity 053 O-2 polls events table at 500ms, so writing to events table IS the push mechanism).

**ALTERNATIVE**: Use a polling-based session liveness check instead of heartbeat commands -- the daemon periodically scans `/proc/{pid}` (Linux) or `kill -0 {pid}` (cross-platform) to detect crashed sessions, with no heartbeat command in the CQRS flow. File watcher uses `chokidar` instead of Bun's native `fs.watch` for cross-platform consistency. -- D-01 Rejected: PID polling detects only process death, not session health (a Claude Code process could be alive but the MCP channel disconnected -- the session is dead but the process isn't). Heartbeat commands through the CQRS decider provide explicit liveness signals and integrate cleanly with the event-sourced model (every heartbeat is an auditable event). For file watching, Bun's native `fs.watch` is sufficient -- spacebridge targets Bun-only environments (design doc §2 runtime requirement), and `chokidar` adds a 3rd-party dependency for cross-platform support that isn't needed.

**GUARDRAILS**:
- Pure decider must have zero I/O -- no database calls, no network, no filesystem. Tests use `assert.deepEqual` with no mocks (same discipline as entity 056, design doc §5.3) (✓ confirmed by explore: entity 056 GUARDRAILS[1] identical)
- LCD schema discipline for the new `session_events` table: `text` strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data (design doc §3.3) (✓ confirmed by explore: db.ts applySchema uses this exact pattern for all 5 tables)
- Zod event schemas use `.passthrough()` not `.strip()` to avoid silent field loss during schema evolution (design doc §3.5, entity 050 GUARDRAILS) (✓ confirmed by explore: 3 entities enforce this rule)
- File watcher events are 🟡 event-log only -- no decider. They are environmental observations appended to the `events` table, not command-driven (design doc §3.5 classification) (✓ confirmed by explore: design doc §3.5:258 explicitly classifies file change events as 🟡)
- Debounce window ~100ms per (file, change-type) pair to collapse git operation bursts (design doc §4.4) (✓ confirmed by explore: design doc §4.4:357 specifies this exact debounce strategy)
- `discoverWorkflows` is entity 018's primitive -- 057 consumes it, does not reimplement it. If 018 is not yet shipped, use a stub/interface that matches 018's expected contract (⚠ contradicted: current discoverWorkflows(root: string) is single-root; see O-1 for workaround strategy)

**RATIONALE**: The fmodel CQRS pattern is mandated by the design doc (§4.3 explicitly marks session registry as 🟢 full CQRS) and provides three concrete benefits: (1) pure decider enables exhaustive unit testing of register/heartbeat/disconnect logic without database fixtures; (2) event replay rebuilds session state on daemon restart without snapshot-consistency hacks; (3) event log enables downstream consumers (SSE feed, war room UI) to stream session changes in real-time. The architecture mirrors entity 056's lease manager pattern -- same domain/ layout, same dual-table strategy, same Zod+passthrough discipline -- creating consistency across fmodel aggregates. Bun's native `fs.watch` is chosen over `chokidar` because spacebridge's runtime requirement is Bun-only; adding a Node.js-ecosystem file watcher dependency contradicts the design doc's Bun-native stance. The debounce-then-append-to-events-table pipeline for file changes follows the 🟡 event-log-only classification, keeping the file watcher simple (no decider complexity for environmental observations).

## Acceptance Criteria

- [ ] Given a `SessionCommand` of type `register` with a unique `session_id`, when `decide()` is called on an empty `SessionState`, then it returns a `session_registered` event containing the full session record (how to verify: `bun test spacebridge/src/domain/session/decider.test.ts` -- pure function, no DB)
- [ ] Given a `SessionCommand` of type `register` with a `session_id` that already exists in `SessionState`, when `decide()` is called, then it throws a duplicate session error (how to verify: `bun test` -- assert throws with conflict details)
- [ ] Given a `SessionCommand` of type `heartbeat` for an active session, when `decide()` is called, then it returns a `session_heartbeat` event with the updated timestamp (how to verify: `bun test` -- pure function)
- [ ] Given a session whose `last_heartbeat` is older than `timeout_threshold`, when the heartbeat monitor fires, then a `disconnect` command is emitted through the decider and the session is removed from state (how to verify: integration test with short timeout + timer assertion)
- [ ] Given 3 active sessions with project roots `/repo-a`, `/repo-b`, `/repo-a`, when `discoverWorkflows` is called with the union of distinct roots, then it receives `["/repo-a", "/repo-b"]` (how to verify: `bun test` -- assert deduplication)
- [ ] Given the file watcher is active on `/repo-a/.claude/workflows/`, when a file changes, then a debounced event is appended to the `events` table within ~100ms and pushed to SSE clients (how to verify: integration test -- write file, assert event appears after debounce window)
- [ ] Given session B disconnects and only session A remains (on `/repo-a`), when the watcher scope recomputes, then watchers for `/repo-b`'s workflow dirs are removed (how to verify: integration test -- assert watcher count decreases)
- [ ] Given a daemon restart with events in `session_events` table, when the daemon boots, then `evolve` replays all events and `SessionState` matches the pre-restart state (how to verify: integration test -- write events, restart, assert state equality)

## References

- Design doc §4.3 (Session registry and multi-root discovery): registry design with fmodel types
- Design doc §4.4 (File watcher): watcher scope, debouncing, event classification
- Entity 018 (multi-root-workflow-discovery): `discoverWorkflows` primitive consumed here

## Assumptions

A-1: Pure decider + evolve pattern for the session aggregate follows entity 056's lease manager pattern in `spacebridge/src/domain/lease/`.
Confidence: 🟢 Confident (0.95)
Evidence: entity 056 APPROACH -- identical fmodel CQRS pattern (decider + evolve + Zod schemas). Design doc §4.3:327 explicitly marks session registry as 🟢 full CQRS. §3.5:257 lists "Session registry" first in the full CQRS table.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Socket server's existing `onRegister` and `onDisconnect` hooks are the integration points for session registry commands -- no new IPC message types needed.
Confidence: 🟢 Confident (0.90)
Evidence: socket-server.ts:20-24 -- `onRegister(session: RegisterPayload, send)` and `onDisconnect(sessionId)` already called on shim connect/disconnect. RegisterPayload (types.ts:44-49) contains projectRoot, sessionId, pid -- matching design doc Session type.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Heartbeat IPC handling follows the same pattern as register/rpc-request/coordination-request handlers in socket-server.ts (type check -> extract payload -> call handler -> send ack).
Confidence: 🟢 Confident (0.90)
Evidence: socket-server.ts:45-98 -- three existing message type handlers use identical pattern. types.ts:24 already defines `"heartbeat"` as IpcRequestType and `"heartbeat-ack"` as IpcResponseType. Gap: socket-server.ts does NOT handle heartbeat messages yet -- entity 057 adds the handler.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: `sessions` table serves as snapshot; a new `session_events` table is the append-only event log, mirroring entity 056's dual-table strategy (lease_events + entity_leases).
Confidence: 🟢 Confident (0.90)
Evidence: schema.ts:10-23 -- sessions table has fmodel columns (event_type, aggregate_id, sequence_number, payload) as structural placeholders. Entity 056 APPROACH establishes dual-table as the pattern. db.ts:31-44 applies sessions DDL inline.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Zod schemas for SessionCommand/SessionEvent use `.passthrough()` per design doc §3.5.
Confidence: 🟢 Confident (0.95)
Evidence: Design doc §3.5:251-258 -- explicit `.passthrough()` rule for fmodel schemas. Entities 050 and 056 GUARDRAILS both enforce this. Three consistent usages across entity specs.
→ Confirmed: captain, 2026-04-13 (batch)

A-6: `RegisterPayload` shape in types.ts maps directly to the design doc's Session type -- no schema translation layer needed for the register command.
Confidence: 🟢 Confident (0.95)
Evidence: types.ts:44-49 -- `RegisterPayload { projectRoot, sessionId, pid, protocolVersion }` matches design doc §4.3:328-334 Session type fields (id->sessionId, projectRoot, pid, connected_at derived from timestamp at registration time).
→ Confirmed: captain, 2026-04-13 (batch)

A-7: Heartbeat timeout detection uses `setInterval` in the daemon process, scanning for `now - last_heartbeat > threshold`, consistent with entity 056's lease janitor pattern.
Confidence: 🟡 Likely (0.75)
Evidence: Entity 056 APPROACH -- "janitor runs on setInterval inside the daemon, scanning for leases past expires_at and emitting expire commands". Same timeout-scan-emit pattern applies to session heartbeats. But entity 056 is not yet shipped -- pattern is planned, not proven in code.
→ Confirmed: captain, 2026-04-13 (batch)

A-8: Session registry is a daemon-internal module -- shims interact via existing IPC messages (register/heartbeat), not via a separate RPC interface like CoordinationClient.
Confidence: 🟢 Confident (0.85)
Evidence: socket-server.ts:20-24 -- onRegister/onDisconnect are daemon callbacks, not RPC methods. Entity 053 O-3 decision -- Next.js reads sessions table directly for project_root lookup. No external consumer needs a `SessionRegistryClient` interface.
→ Confirmed: captain, 2026-04-13 (batch)

A-9: Bun's `import { watch } from "fs"` API supports `{ recursive: true }` directory watching, multiple simultaneous watchers, and dynamic add/remove via `.close()` + re-create.
Confidence: 🟢 Confident (0.85)
Evidence: No codebase usage of `fs.watch`. Design doc §4.4:355 specifies "Bun's native fs.watch or chokidar". (✓ research: Bun 1.3.9/macOS实测 -- recursive watching works, multiple watchers independent, dynamic scope viable. Gotcha: macOS FSEvents only emits "rename" events, never "change" -- debounce key should be filename only, not (file, change-type) pair. Watcher silently stops if watched dir deleted -- must proactively .close() on disconnect.)
→ Confirmed: captain, 2026-04-13 (batch)

A-10: Error handling for malformed IPC messages follows the existing try/catch pattern in socket-server.ts.
Confidence: 🟢 Confident (0.90)
Evidence: socket-server.ts:64-78 and 82-98 -- all handlers wrap async operations in try/catch, send error response to caller, socket stays open. Line 100-103: top-level catch logs and continues.
→ Confirmed: captain, 2026-04-13 (batch)

A-11: Register command is idempotent -- if a session_id already exists in SessionState, the decider emits a `session_reconnected` event (updating socket/pid/timestamp) instead of rejecting. Handles network reconnects where the shim re-registers without explicit disconnect.
Confidence: 🟢 Confident (0.85)
Evidence: socket-server.ts:48 -- `sessionSockets.set(sessionId, socket)` already overwrites the socket mapping on duplicate sessionId without checking existence. IPC layer already tolerates re-registration; domain layer should match.
→ Confirmed: captain, 2026-04-13 (interactive)

A-12: On daemon graceful shutdown (SIGTERM/SIGINT), the registry emits `disconnect` commands for all active sessions through the decider pipeline before process exit. Ensures event log completeness -- restart replay shows 0 active sessions, shims reconnect and re-register naturally.
Confidence: 🟢 Confident (0.85)
Evidence: CQRS discipline requires event log completeness for all state transitions. Entity 056 lease janitor establishes the "daemon emits system-initiated events" pattern. Without this, restart creates phantom sessions until heartbeat timeout.
→ Confirmed: captain, 2026-04-13 (interactive)

A-13: Shim-side heartbeat sender is in-scope for 057 -- socket-client.ts adds a `setInterval` that sends `heartbeat` IPC messages to the daemon at a configurable interval (default 10s). Without shim-side sending, daemon-side heartbeat monitoring (A-7) has no input and all sessions timeout immediately.
Confidence: 🟢 Confident (0.90)
Evidence: types.ts:24 -- `"heartbeat"` already defined as IpcRequestType. socket-client.ts exists as the shim-side IPC client. Daemon receiver (A-3) and shim sender are two sides of the same feature -- splitting them across entities makes e2e verification impossible.
→ Confirmed: captain, 2026-04-13 (interactive)

## Option Comparisons

### O-1: `discoverWorkflows` single-root gap -- how to call multi-root discovery when entity 018 hasn't shipped

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Call `discoverWorkflows(root)` once per distinct project root and union results | Works today with zero changes to discovery.ts; entity 018 can later optimize internally; dedup at caller is trivial (Set by dir) | N calls instead of 1; caller owns dedup logic; slightly less efficient for many roots | Low | Recommended |
| Stub `discoverWorkflowsMulti(roots)` wrapper inside spacebridge that iterates | Clean API surface for session registry; single entry point; future-compatible with 018 | Reimplements part of entity 018 scope; potential divergence if 018 ships differently; more code to maintain | Medium | Viable |
| Block on entity 018 shipping multi-root support | Uses canonical implementation; no workaround code | Blocks 057; 018 is in explore status with no timeline; unnecessary coupling | High | Not recommended |

Return value trace: `discoverWorkflows(root)` returns `Workflow[] = [{dir, commissioned_by}]`. Per-root iteration + `Set<string>` dedup by `dir` produces the same union. No downstream consumer depends on a single-call API shape.

Design doc invariant check: §4.3 says "daemon calls discoverWorkflows([...all_distinct_project_roots])" -- the design doc envisions a multi-root API. Option A achieves the same semantic result without modifying the existing single-root implementation. When entity 018 ships, the iteration can be replaced by a single call.

→ Selected: 每個 project root 各呼叫一次 discoverWorkflows，結果取 union (captain, 2026-04-13, interactive)

### O-2: File watcher events -- how file change events map to the existing `events` table schema

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Use `events` table with sentinel values (entity="*", stage="watcher", agent="file-watcher") | No new table; SSE endpoint (053 O-2) already polls events table; file changes appear in unified feed automatically; `detail` column carries the actual file path | Sentinel values are semantically loose; `entity="*"` doesn't match the column's original intent; NOT NULL constraints require non-null sentinels for every row | Low | Recommended |
| Create new `file_change_events` table (🟡 event-log schema) | Clean separation per design doc §3.5 classification; schema matches file change semantics exactly (path, change_type, workflow_dir); no sentinel values | SSE endpoint must poll two tables; entity 053 O-2 only polls `events`; new table + DDL in db.ts; dashboard queries become JOINs or UNIONs | Medium | Viable |
| Make `entity` and `stage` nullable on `events` table | File changes use NULL when not entity-specific; preserves single-table simplicity | Schema migration on existing table; changes contract for ALL events table consumers; nullable columns weaken query safety; LCD discipline prefers NOT NULL | Medium | Not recommended |

Return value trace: Entity 053 SSE route handler polls `events` table at 500ms (O-2 decision). If file changes go to `events` table (Option A), the SSE endpoint works without modification. If separate table (Option B), 053's route handler needs a second query + merge. Downstream: `EventSource` consumer in war room LiveFeed component receives events of any type -- file change events would need a `type: "file_change"` discriminator for UI rendering.

Design doc invariant check: §3.5 classifies file change events as 🟡 event-log only (no decider). Both Option A and B satisfy this -- the question is table placement, not fmodel classification. §4.5 confirms single DB. §3.3 LCD discipline: sentinel values are text columns with constant values, which is LCD-compliant.

→ Selected: 用 events table + sentinel 值 (entity="*", stage="watcher") (captain, 2026-04-13, interactive)

## Open Questions

Q-1: When a file change is detected in a workflow directory, should the watcher emit events for ALL files or only entity-related files?

Domain: Behavioral/Callable, Organizational/Data-transforming

Why it matters: The watcher scope is "union of workflow directories" but not every file in a workflow dir is an entity. Emitting events for all file changes creates noise in the SSE feed (git operations, editor temp files, archive moves). Filtering to entity files reduces noise but adds parsing overhead and may miss legitimate changes (README updates, index changes, new entity creation).

Suggested options: (a) All files -- emit for every file change in watched dirs, let the UI filter/render selectively. Simplest watcher, noisiest feed. Debounce handles git burst noise. (b) Markdown files only (`*.md`) -- captures entities + README + docs without non-markdown noise. Simple glob filter, no parsing overhead. (c) Entity files only -- filter to `*.md` files with valid entity frontmatter. Quietest feed, but requires frontmatter parsing on every change event (perf cost). (d) All files with type classification -- emit all but tag each event with a type (entity, docs, config, other) so the UI can filter. More metadata, richer feed.

→ Answer: (b) 僅 Markdown 檔 (*.md) -- 捕捉 entity 檔 + README + docs，過濾掉非 markdown 噪音。簡單 glob filter，零 parsing 開銷。 (captain, 2026-04-13, interactive)

## Canonical References

- `spacebridge/src/ipc/socket-server.ts` -- onRegister/onDisconnect hooks (A-2), heartbeat handler gap (A-3), session socket map (A-11)
- `spacebridge/src/ipc/types.ts` -- RegisterPayload shape (A-6), heartbeat IPC type (A-3, A-13)
- `spacebridge/src/schema.ts` -- sessions table fmodel columns (A-4)
- `spacebridge/src/db.ts` -- inline DDL pattern for new tables (A-4)
- `spacebridge/src/ipc/coordination-client-stub.ts` -- CoordinationClient interface pattern (A-8 comparison)
- `tools/dashboard/src/discovery.ts` -- discoverWorkflows single-root API (O-1)
- `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md` -- §4.3 session registry, §4.4 file watcher, §3.5 fmodel classification

## Stage Report: explore

- [x] Files mapped: 11 across domain(new), ipc, schema, daemon, discovery
  domain: 0 existing + ~6 new (types.ts, decider.ts, evolve.ts, repository.ts, watcher.ts, decider.test.ts); ipc: 2 modify (socket-server.ts heartbeat handler, types.ts already done); schema: 2 modify (schema.ts + db.ts for session_events table); discovery: 1 read-only (discovery.ts consumed, not modified)
- [x] Assumptions formed: 9 (Confident: 7, Likely: 2, Unclear: 0)
  A-1 through A-6, A-8 Confident (0.85-0.95); A-7 Likely (0.75, 056 janitor pattern planned but not shipped); A-9 Likely (0.70, Bun fs.watch pending research)
- [x] Options surfaced: 2
  O-1 discoverWorkflows single-root gap; O-2 file watcher events table fit
- [x] Questions generated: 1
  Q-1 file change event scope (all files vs entity-only vs markdown-only)
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  ~11 files across 5 layers; session registry + file watcher are tightly coupled (watcher scope derives from registry state); no decomposition warranted
- [x] Research dispatched: 1 researcher for 1 topic (post-brainstorm Step 3.5, Bun fs.watch)
  A-9 (Bun fs.watch API): confirmed working, Likely->Confident (0.85). macOS FSEvents only emits "rename", debounce key = filename only.

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Entity is Medium scope, no decomposition recommendation from explore
- [x] Re-validation: 9 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 1 coverage gap (A-10 added), 0 research re-validated
  All file:line citations verified against files read this session; A-10 error handling pattern added from Behavioral/Callable template
- [x] Assumptions confirmed: 13 / 13 (0 corrected)
  A-1 through A-10 confirmed batch; A-11 (register idempotency), A-12 (graceful shutdown), A-13 (shim heartbeat sender) confirmed interactive
- [x] Options selected: 2 / 2
  O-1 per-root iteration + union (recommended); O-2 events table + sentinel values (recommended)
- [x] Questions answered: 1 / 1
  Q-1 markdown files only (*.md) -- simple glob filter, zero parsing overhead
- [x] Open exploration: 3 gray areas surfaced (1 from templates, 1 from directive, 1 via freeform)
  A-11 register idempotency (template: Behavioral/Callable idempotency); A-12 graceful shutdown (directive-implied); A-13 shim heartbeat sender (captain freeform reflection)
- [x] Canonical refs added: 7
  socket-server.ts, types.ts, schema.ts, db.ts, coordination-client-stub.ts, discovery.ts, design doc
- [x] Context status: ready
  Gate passed: all 13 assumptions confirmed, all 2 options selected, all 1 Qs answered
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 057" to advance
- [x] Clarify duration: 7 questions asked, session complete
  1 batch confirmation + 2 option selections + 1 Q answer + 3 exploration iterations
