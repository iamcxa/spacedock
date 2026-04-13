---
id: 056
title: "Role-aware lease manager (fmodel core)"
status: plan
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-13T18:00:00+08:00
completed:
verdict:
score: 1.0
worktree: .worktrees/spacedock-ensign-spacebridge-role-aware-lease-manager
issue:
pr:
intent: feature
scale: Large
project: spacedock
depends-on: [050]
note: "Entity 055 archived (SO done, namespace → 050, QO deferred). This entity now absorbs CoordinationClient wiring from 055 AC7. Hard-blocked on PR2 to clkao/spacedock (CoordinationClient interface + FO delegation) — design exists in spacebridge doc §5.1-5.3 but no code yet."
---

## Directive

> Implement the role-aware lease manager as a full fmodel CQRS aggregate inside the spacebridge plugin. This is the core coordination primitive: commands (acquire, release, extend, expire), a pure decider, event-sourced state with Drizzle persistence, and the real CoordinationClient implementation that replaces the current stub. Includes a lease janitor for expiry, unix socket RPC bridge, and FO prompt integration for work discovery via `getAvailableWork`. Design doc §5.1-5.3 defines the complete interface and domain model.

## Captain Context Snapshot

- **Repo**: main @ 4a0700b
- **Session**: SO pipeline for spacebridge entities (053/054/056). 056 selected first as dependency chain root.
- **Domain**: Behavioral/Callable, Organizational/Data-transforming, Runnable/Invokable
- **Scope flag**: ⚠️ likely-decomposable (Large, 3 domains, multiple subsystems -- but fmodel aggregate is cohesive by design; decomposition risk is low)
- **Related entities**: 050 -- Spacebridge plugin skeleton + Drizzle LCD schema (shipped, PR #32), 052 -- L2 daemon lifecycle (shipped, archived), 054 -- Entity detail page + comments API (draft, consumes lease owner info), 053 -- War room view + SSE (draft, displays owner session badge from lease), 057 -- Multi-root session registry (draft, depends on 056)
- **Created**: 2026-04-13T16:30:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the lease manager as a pure fmodel CQRS aggregate in `spacebridge/src/domain/lease/` (✓ confirmed by explore: spacebridge/src/ exists with domain-ready layout, no domain/ dir yet -- new module). The domain layer has three parts: (1) a pure `decider` function that takes `LeaseCommand` + `LeaseState` and returns `LeaseEvent[]` -- covering acquire (conflict detection: same entity+role = reject), release (done/abort outcome), extend (reset expiry), and expire (janitor-triggered) (✓ confirmed by explore: design doc §5.3:484-496 shows exact decider signature and switch/case structure); (2) an `evolve` function that applies events to state; (3) Zod schemas for commands and events with `.passthrough()` per design doc §3.5. The existing `CoordinationClient` interface in `spacebridge/src/ipc/coordination-client-stub.ts` already defines the exact API shape (✓ confirmed by explore: coordination-client-stub.ts:25-30 -- full interface with all 4 methods) -- entity 056 replaces the stub implementation with a real client that sends commands over the existing unix socket IPC channel (✓ confirmed by explore: socket-server.ts:82-98 already routes `coordination-request` messages; types.ts:26-27 defines CoordinationRequestPayload/CoordinationResponsePayload). The daemon hosts the decider in-process; shim sessions send commands via RPC and receive events back (✓ confirmed by explore: daemon.ts:79-89 `onCoordinationRequest` handler calls stub methods -- surgical replacement point). Drizzle persistence uses a dedicated `lease_events` table (append-only event log) alongside the existing `entity_leases` snapshot table for fast reads (✓ confirmed by explore: schema.ts:27-40 entity_leases exists with fmodel columns; see O-1 for dual-table vs event-only strategy). On daemon restart, the evolve function replays events from `lease_events` to rebuild `LeaseState`. A janitor runs on `setInterval` inside the daemon, scanning for leases past `expires_at` and emitting `expire` commands through the same decider pipeline. FO integration modifies the FO prompt/skill to call `getAvailableWork('FO')` before entity selection and `acquireEntity` before dispatching ensigns (⚠ contradicted: FO prompt/skill lives in spacedock ENGINE (clkao/spacedock), not in spacebridge -- requires PR2 to clkao/spacedock which has not merged -- see Q-1).

**ALTERNATIVE**: Skip the fmodel CQRS pattern and implement leases as a plain Drizzle CRUD state table -- `INSERT` on acquire, `UPDATE` on extend, `DELETE` on release, with a `WHERE NOT EXISTS` subquery for conflict detection. -- D-01 Rejected: loses replay capability (tunnel participants catching up on lease history), loses pure-function testability (tests need a real DB instead of `assert.deepEqual(decide(cmd, state), events)`), and contradicts design doc §3.5 which explicitly classifies entity leases as 🟢 full CQRS. The CQRS pattern is not optional here -- it's the design doc's architectural decision.

**GUARDRAILS**:
- Pure decider must have zero I/O -- no database calls, no network, no filesystem. Tests use `assert.deepEqual` with no mocks (design doc §5.3)
- LCD schema discipline for any new tables: `text` strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data (design doc §3.3)
- Zod event schemas use `.passthrough()` not `.strip()` to avoid silent field loss during schema evolution (design doc §3.5, entity 050 GUARDRAILS)
- CoordinationClient interface is frozen -- the stub already defines the contract (`getAvailableWork`, `acquireEntity`, `releaseEntity`, `extendLease`). Implementation must match the existing interface exactly, not extend it
- Lease conflict detection is (entity_slug, role) pair -- same entity CAN have leases from different roles simultaneously (SO + FO working on same entity is valid)
- PR2 dependency: the engine-side `CoordinationClient` interface extraction and FO delegation wiring is a separate upstream PR. 056 implements the bridge side. Domain + persistence + RPC work is unblocked without PR2; FO integration AC is gated on PR2 (✓ resolved by explore: daemon.ts:56 uses stub locally, socket-server.ts:82 routes coordination-request independently of engine -- see Q-1 for scope decision)

**RATIONALE**: The fmodel CQRS aggregate pattern is mandated by the design doc for lease management. It provides three concrete benefits over the CRUD alternative: (1) pure decider enables exhaustive unit testing of conflict logic without database fixtures; (2) event replay rebuilds state on daemon restart without a separate snapshot-consistency mechanism; (3) event log enables downstream consumers (SSE feed, activity timeline) to stream lease changes in real-time by tailing the event sequence. The existing codebase provides strong foundations -- the `CoordinationClient` interface is already defined and stubbed (entity 052), the Drizzle schema has fmodel-compatible columns on `entity_leases` (entity 050), and the unix socket IPC channel is operational. This entity fills the gap between the stub and a working coordination layer.

## Acceptance Criteria

- [ ] Given a `LeaseCommand` of type `acquire` and a `LeaseState` with no conflicting lease, when `decide()` is called, then it returns an `acquired` event with a new lease (how to verify: `bun test spacebridge/src/domain/lease/decider.test.ts` -- pure function, no DB)
- [ ] Given a `LeaseCommand` of type `acquire` and a `LeaseState` with an existing lease on the same (entity, role), when `decide()` is called, then it throws `LeaseConflict` (how to verify: `bun test` -- assert throws with conflict details)
- [ ] Given two sessions calling `acquireEntity` for the same (entity, role) concurrently, when both RPC calls reach the daemon, then exactly one succeeds and the other receives a LeaseConflict error (how to verify: integration test with 2 parallel `acquireEntity` calls over unix socket)
- [ ] Given an active lease, when `extendLease` is called before expiry, then the lease's `expires_at` is reset to `now + lease_duration` (how to verify: `bun test` -- decider returns `extended` event with new expiry)
- [ ] Given a lease past its `expires_at`, when the janitor interval fires, then an `expire` command is emitted and the lease is freed (how to verify: integration test with short expiry + `setTimeout` assertion)
- [ ] Given a daemon restart with events in `lease_events` table, when the daemon boots, then `evolve` replays all events and `LeaseState` matches the pre-restart state (how to verify: integration test -- write events, restart, assert state equality)
- [ ] Given `getAvailableWork('FO')` is called, when some entities are leased by other sessions, then those entities are excluded from the result (how to verify: `bun test` -- seed leases, assert filtered list)
- [ ] Given `releaseEntity(token, 'done')`, when the release event is applied, then the entity becomes eligible for next-phase work (how to verify: `bun test` -- release, then `getAvailableWork` includes it)
- [ ] Given `releaseEntity(token, 'abort')`, when the release event is applied, then the entity remains in its current phase (retryable) (how to verify: `bun test` -- abort, then `getAvailableWork` still returns it for same phase)
- [ ] Given any new Drizzle table added, when its schema is inspected, then it follows LCD discipline: integer PKs, integer epoch-ms timestamps, text strings (how to verify: `grep -E 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/*.sql` returns 0 matches)

## References

- Design doc §5.1 (Role-aware CoordinationClient API): full interface definition -- `spacebridge/src/ipc/coordination-client-stub.ts` already implements the interface shape
- Design doc §5.2 (Default in-process implementation): engine fallback that bridge replaces
- Design doc §5.3 (Bridge implementation -- unix socket RPC): fmodel decider and event type definitions
- Design doc §3.3 (LCD schema discipline): column type rules
- Design doc §3.5 (Scoped fmodel CQRS): lease classified as 🟢 full CQRS domain
- Entity 050 (shipped): Drizzle schema with `entity_leases` table and fmodel-compatible columns
- Entity 052 (shipped): daemon lifecycle + unix socket IPC infrastructure

## Assumptions

A-1: Synchronous decider processing in daemon -- JS single-threaded event loop provides natural command serialization without explicit locks or queues.
Confidence: Confident (0.90)
Evidence: bin/daemon.ts:79-89 -- `onCoordinationRequest` handler runs each request to completion before yielding to event loop; decider is pure synchronous function (no awaits between state read and event apply)
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Event ordering guaranteed by SQLite autoincrement + single-threaded event loop -- no explicit sequence counter management needed.
Confidence: Confident (0.95)
Evidence: schema.ts:28 -- `id: integer("id").primaryKey({ autoIncrement: true })` on entity_leases; all writes go through the daemon's single event loop
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Default lease duration of 5 minutes (300,000ms), configurable via `SPACEBRIDGE_LEASE_DURATION_MS` environment variable.
Confidence: Confident (0.85)
Evidence: ipc/coordination-client-stub.ts:45 -- stub uses `300_000` (5 min); daemon.ts:21 -- `SPACEBRIDGE_STATE_DIR` env var pattern establishes precedent for env-based configuration
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Janitor failure is safe -- append-only expire commands mean partial scan leaves no corrupted state; next interval picks up remaining expired leases.
Confidence: Confident (0.85)
Evidence: design doc §5.3:499 -- "Janitors run as scheduled commands that produce expire events through the same pipeline"; append-only event model means no rollback-on-failure concern
→ Confirmed: captain, 2026-04-13 (batch)

A-5: New `lease_events` table follows fmodel column pattern already established in schema.ts (id, event_type, aggregate_id, sequence_number, payload, timestamp).
Confidence: Confident (0.90)
Evidence: schema.ts:18-23 -- sessions table fmodel columns; schema.ts:37-39 -- entity_leases fmodel columns; same pattern on all 5 tables
→ Confirmed: captain, 2026-04-13 (batch)

A-6: Keep coordination-client-stub.ts for testing; create separate `coordination-client-bridge.ts` for real implementation.
Confidence: Confident (0.90)
Evidence: ipc/coordination-client-stub.ts:3 -- ABOUTME explicitly says "noop placeholder for entity 056 (real implementation)"; stub is valuable for unit tests that don't need real coordination
→ Confirmed: captain, 2026-04-13 (batch)

A-7: Inject `entityScanner` dependency into CoordinationClient for `getAvailableWork` -- daemon provides filesystem scanner now, entity 057 (session registry) replaces with DB-backed scanner later.
Confidence: Confident (0.85)
Evidence: design doc §5.1:398 -- getAvailableWork returns entities "in the role's phase and not currently leased"; entity 057 depends on 056 per dependency chain. Dependency inversion keeps 056 self-contained while forward-compatible with 057's cached projection.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Persistence strategy -- dual table vs event-only

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Dual table: `lease_events` (append-only log) + `entity_leases` (snapshot projection) | Fast reads via snapshot table; SSE clients tail event log; standard CQRS pattern; entity_leases already exists in schema.ts | Two tables to keep in sync; projection update after every event | Medium | Recommended |
| Event-only: `lease_events` only, rebuild `LeaseState` in memory on startup | Single source of truth; no projection drift risk | Startup cost scales with event count; no fast DB query for "who holds lease on X?"; getAvailableWork requires full replay | Medium | Viable |
| Snapshot-only: use existing `entity_leases` as mutable state table (CRUD) | Simplest; fast reads | Loses event replay (design doc mandate); loses SSE tail capability; contradicts 🟢 full CQRS classification | Low | Not recommended |

Design doc invariant check: §5.3 explicitly shows event types (acquired, released, extended, expired) implying an event log exists. §3.5 classifies leases as 🟢 full CQRS. Dual table satisfies both. Return value trace: `getAvailableWork` queries snapshot table → returns `EntityRef[]` → shim uses slug to call `acquireEntity` → no downstream consumer depends on event log for reads. Dual table is safe.

→ Selected: Dual table -- captain, 2026-04-13

### O-2: Idempotency on expired/released leases

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Fail with typed error (LeaseNotFound / LeaseExpired) | Explicit; caller knows the lease is gone; prevents silent stale-token usage | Shim must handle error; extend-after-expire during network delay triggers error | Low | Recommended |
| Silent no-op (return success) | Tolerates network delays; simpler client code | Masks bugs; caller thinks extend succeeded when lease is already gone; stale tokens linger | Low | Not recommended |
| Conditional: no-op for extend, error for release | Extend is heartbeat (tolerate staleness); release is intent (must know if lease is gone) | Inconsistent behavior between operations; harder to reason about | Medium | Viable |

Return value trace: `extendLease` returns `void` → shim's periodic timer ignores return → but if lease is already expired, shim should detect and re-acquire. Silent no-op prevents re-acquisition. Fail-with-error lets shim detect and react. Fail is safer.

→ Selected: Fail with typed error (LeaseNotFound / LeaseExpired) -- captain, 2026-04-13

## Open Questions

Q-1: Should entity 056 include FO integration (AC-6: "FO uses CoordinationClient for work discovery"), or defer it to a follow-up entity gated on PR2?

Domain: Behavioral/Callable

Why it matters: FO prompt/skill modifications require changes to clkao/spacedock engine (PR2). Without PR2, the bridge-side CoordinationClient works but no engine consumer calls it. Including deferred FO integration AC in 056 creates a "partially done" entity. Excluding it scopes 056 to purely bridge-side work (domain + persistence + RPC + janitor) which is fully shippable and testable.

Suggested options: (a) Include FO AC as deferred/conditional -- 056 ships with bridge-side complete, FO AC marked as pending-PR2, (b) Exclude FO AC entirely -- create entity 056b or add to 057's scope for FO wiring after PR2, (c) Include and implement a bridge-only FO simulator for testing (mock FO calls getAvailableWork via RPC)

→ Answer: (c) Simulator test -- 056 includes an integration test that simulates FO calling getAvailableWork → acquireEntity → work → releaseEntity over RPC. Proves end-to-end API correctness without PR2. PR2 merge later only needs to wire real FO to the already-validated API. -- captain, 2026-04-13

Q-2: What janitor scan interval should be used? This affects lease expiry latency vs daemon CPU overhead.

Domain: Runnable/Invokable

Why it matters: Too frequent (1s) wastes CPU scanning when no leases are near expiry. Too infrequent (5min) means orphaned leases block work for minutes. The janitor emits `expire` commands through the decider, so the interval directly affects how quickly other sessions can acquire a lease abandoned by a crashed session.

Suggested options: (a) 30 seconds (reasonable balance -- worst case 30s orphan delay), (b) 10 seconds (aggressive -- responsive but more DB queries), (c) Adaptive -- start at 30s, reduce to 10s when any lease is within 60s of expiry

→ Answer: (a) 30 seconds -- reasonable balance between orphan recovery latency and CPU overhead. Configurable via SPACEBRIDGE_JANITOR_INTERVAL_MS env var (per A-3 pattern). -- captain, 2026-04-13

## Stage Report: explore

- [x] Files mapped: 13 across domain(new), contract, ipc, daemon, schema
  domain: 0 existing + ~8 new files (decider, evolve, types, janitor, bridge-client, tests); ipc: 6 files (server, client, types, framing, stub, index); daemon: 4 files (index, auto-fork, lock, pid); schema: 2 (schema.ts, db.ts)
- [x] Assumptions formed: 7 (Confident: 7, Likely: 0, Unclear: 0)
  A-1 through A-7 all Confident (0.85-0.95) via line-number evidence from shipped entity 050/052 infrastructure
- [x] Options surfaced: 2
  O-1 persistence strategy (dual table vs event-only); O-2 idempotency on expired leases
- [x] Questions generated: 2
  Q-1 FO integration scope vs PR2 dependency (α marker → Q); Q-2 janitor scan interval
- [x] α markers resolved: 1 / 1
  α-1 (PR2 dependency) resolved: bridge-side unblocked, FO integration gated on PR2 → escalated to Q-1
- [x] Scale assessment: confirmed Large
  13 existing files mapped + ~8 new files to create across 4 layers; fmodel aggregate cohesion prevents decomposition despite 3-domain scope
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident >=0.85, no external tech claims, pure fmodel pattern defined in design doc)

## Stage Report: clarify

- [x] Assumptions confirmed: 7 / 7
  All batch-confirmed by captain, 2026-04-13. Zero reclassified.
- [x] Options selected: 2 / 2
  O-1: Dual table (event log + snapshot projection). O-2: Fail with typed error (LeaseNotFound/LeaseExpired).
- [x] Questions answered: 2 / 2
  Q-1: Simulator test -- include FO integration test over RPC, no PR2 dependency. Q-2: 30s janitor interval, env-configurable.
- [x] Sufficiency gate: PASS
  All assumptions confirmed, all options selected, all questions answered, zero unresolved items.
