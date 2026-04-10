---
id: 056
title: "Role-aware lease manager (fmodel core)"
status: draft
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
depends-on: [055]
note: "Also depends on PR2 merged into clkao/spacedock (CoordinationClient interface + FO delegation)"
---

## Problem

Multi-session coordination requires exclusive entity ownership per role. Without a lease manager, two FO sessions could dispatch workers for the same entity simultaneously, causing conflicting writes and corrupted state. The lease manager is the core coordination primitive: it implements `CoordinationClient` as a 🟢 full fmodel CQRS aggregate with commands (acquire, release, extend, expire), a pure decider, and event-sourced state. This is the largest and most architecturally significant entity in the Phase F roadmap.

## Scope

- fmodel CQRS aggregate for entity leases:
  - Commands: `acquire`, `release`, `extend`, `expire` (janitor-emitted)
  - Events: `acquired`, `released`, `extended`, `expired`
  - Pure decider function: conflict detection (same entity + same role = reject), expiry validation
  - Evolve function: apply events to lease state
- `CoordinationClient` bridge implementation over unix socket RPC:
  - `getAvailableWork(role)`: query entities in role's phase, exclude currently leased
  - `acquireEntity(slug, role, sessionId)`: acquire lease via decider
  - `releaseEntity(token, outcome)`: release with done/abort outcome
  - `extendLease(token)`: heartbeat extension before expiry
- Lease janitor: periodic scan for expired leases, emit `expire` commands
- Drizzle persistence for lease events (event replay on daemon restart)
- FO prompt integration: FO calls `getAvailableWork('FO')` before picking work, `acquireEntity` before dispatching
- Lease conflict error handling: clear error messages when contention occurs

## Acceptance Criteria

- [ ] Pure decider passes unit tests: acquire succeeds when no conflict, rejects on conflict, extend resets expiry
- [ ] Two sessions cannot hold leases on the same (entity, role) simultaneously
- [ ] Lease expiry janitor frees orphaned leases within configured timeout
- [ ] `getAvailableWork` correctly excludes leased entities
- [ ] Event replay restores lease state correctly after daemon restart
- [ ] FO uses `CoordinationClient` for work discovery and lease acquisition (not direct entity scanning)
- [ ] Lease release with `outcome: 'done'` advances entity eligibility for next phase
- [ ] Lease release with `outcome: 'abort'` leaves entity in current phase (retryable)
- [ ] Drizzle event table follows LCD schema discipline
- [ ] Load test: 10 concurrent acquire attempts on same entity, exactly 1 succeeds

## References

- Design doc §5.1 (Role-aware CoordinationClient API): full interface definition
- Design doc §5.2 (Default in-process implementation): engine fallback that this replaces in bridge mode
- Design doc §5.3 (Bridge implementation — unix socket RPC): fmodel decider and event types
