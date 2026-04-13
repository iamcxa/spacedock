---
id: 056
title: "Role-aware lease manager (fmodel core)"
status: draft
context_status: pending
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
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

**APPROACH**: Implement the lease manager as a pure fmodel CQRS aggregate in `spacebridge/src/domain/lease/`. The domain layer has three parts: (1) a pure `decider` function that takes `LeaseCommand` + `LeaseState` and returns `LeaseEvent[]` -- covering acquire (conflict detection: same entity+role = reject), release (done/abort outcome), extend (reset expiry), and expire (janitor-triggered); (2) an `evolve` function that applies events to state; (3) Zod schemas for commands and events with `.passthrough()` per design doc §3.5. The existing `CoordinationClient` interface in `spacebridge/src/ipc/coordination-client-stub.ts` already defines the exact API shape -- entity 056 replaces the stub implementation with a real client that sends commands over the existing unix socket IPC channel (entity 052 shipped the daemon + socket infrastructure). The daemon hosts the decider in-process; shim sessions send commands via RPC and receive events back. Drizzle persistence uses a dedicated `lease_events` table (append-only event log) alongside the existing `entity_leases` snapshot table for fast reads. On daemon restart, the evolve function replays events from `lease_events` to rebuild `LeaseState`. A janitor runs on `setInterval` inside the daemon, scanning for leases past `expires_at` and emitting `expire` commands through the same decider pipeline. FO integration modifies the FO prompt/skill to call `getAvailableWork('FO')` before entity selection and `acquireEntity` before dispatching ensigns.

**ALTERNATIVE**: Skip the fmodel CQRS pattern and implement leases as a plain Drizzle CRUD state table -- `INSERT` on acquire, `UPDATE` on extend, `DELETE` on release, with a `WHERE NOT EXISTS` subquery for conflict detection. -- D-01 Rejected: loses replay capability (tunnel participants catching up on lease history), loses pure-function testability (tests need a real DB instead of `assert.deepEqual(decide(cmd, state), events)`), and contradicts design doc §3.5 which explicitly classifies entity leases as 🟢 full CQRS. The CQRS pattern is not optional here -- it's the design doc's architectural decision.

**GUARDRAILS**:
- Pure decider must have zero I/O -- no database calls, no network, no filesystem. Tests use `assert.deepEqual` with no mocks (design doc §5.3)
- LCD schema discipline for any new tables: `text` strings, `integer` PKs with autoincrement, `integer` epoch-ms timestamps, no JSON for queryable data (design doc §3.3)
- Zod event schemas use `.passthrough()` not `.strip()` to avoid silent field loss during schema evolution (design doc §3.5, entity 050 GUARDRAILS)
- CoordinationClient interface is frozen -- the stub already defines the contract (`getAvailableWork`, `acquireEntity`, `releaseEntity`, `extendLease`). Implementation must match the existing interface exactly, not extend it
- Lease conflict detection is (entity_slug, role) pair -- same entity CAN have leases from different roles simultaneously (SO + FO working on same entity is valid)
- PR2 dependency: the engine-side `CoordinationClient` interface extraction and FO delegation wiring is a separate upstream PR. 056 implements the bridge side. If PR2 hasn't merged, the FO integration AC is deferred but the domain + persistence + RPC work is unblocked (needs clarification -- deferred to explore)

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
