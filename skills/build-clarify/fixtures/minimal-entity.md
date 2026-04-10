---
id: fixture-001
title: Forge Fixture -- Minimal Clarify Regression
status: draft
context_status: awaiting-clarify
source: forge-fixture
created: 2026-04-10T00:00:00+08:00
started:
completed:
intent: test
scale: Small
project: spacedock
---

## Directive

> Test fixture for build-clarify regression. Exercises: 1 assumption confirm, 1 option select, 1 question answer.

## Captain Context Snapshot

- **Repo**: fixture (no real repo)
- **Session**: forge solo regression test
- **Domain**: Runnable/Invokable

## Brainstorming Spec

**APPROACH**: Use a single configuration file at the root to control fixture behavior.

**ALTERNATIVE**: Environment variables. Rejected because they mix test state across runs.

**GUARDRAILS**:
- Must not write outside the fixture directory
- Must not hit the network

**RATIONALE**: Single file keeps the fixture self-contained.

## Acceptance Criteria

- Fixture entity survives clarify round-trip without manual intervention
- All three gray areas get annotations

## Assumptions

A-1: Fixture uses JSON format for the configuration file.
Confidence: Likely
Evidence: scripts/forge.sh:42 -- existing forge scripts use JSON

## Option Comparisons

### Configuration file location

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Repo root | Simple path, no search | Clutters root | Low | ✅ Recommended |
| `.forge/` subdirectory | Organized | Extra search step | Low | |

## Open Questions

Q-1: Should the fixture support custom assertion hooks?

Domain: Runnable/Invokable

Why it matters: Custom hooks let downstream test writers add project-specific checks.

Suggested options: (a) Yes via hook file, (b) No keep minimal, (c) Phase 2 feature

## Canonical References

## Stage Report: explore

- [x] Files mapped: 0 (fixture is self-contained)
  no real code paths -- this is a forge contract fixture
- [x] Assumptions formed: 1
  A-1 Likely confidence
- [x] Options surfaced: 1
  O-1 configuration file location
- [x] Questions generated: 1
  Q-1 custom assertion hook support
- [x] α markers resolved: 0 / 0
  no α markers in fixture
- [x] Scale assessment: confirmed
  fixture is trivial Small scope by construction
