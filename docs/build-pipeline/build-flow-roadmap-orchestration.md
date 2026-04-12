---
id: 069
title: Build-Flow Roadmap -- Multi-Entity Project Orchestration
status: draft
context_status:
source: build-distill
created: 2026-04-12
intent: feature
scale: Large
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

Add a "roadmap" concept to the build pipeline: a way to define a set of related entities as a project phase, sequence their execution, and track progress toward a named project goal.

Currently the captain must manually decide which entities to create and in what order -- there is no mechanism to say "entities 069-073 form Phase 3: Dashboard Overhaul" and have the pipeline sequence and track them. The pipeline is entity-centric; it has no project-level planning layer above the individual entity.

GSD's `new-project` + `new-milestone` solve this with a first-class project planning artifact (ROADMAP.md) created before execution begins. The build pipeline needs an equivalent: a `build-roadmap` skill that creates a roadmap document through questioning → requirements → phase structure, and a FO/INDEX.md integration that tracks phase completion.

### Key Deliverables

1. **`docs/build-pipeline/_index/ROADMAP.md`**: A new index file defining named phases, each with a goal and a list of entity IDs. FO consults this when dispatching to identify phase membership.

2. **`build-roadmap` skill**: Creates ROADMAP.md through a questioning → requirements → phase structure flow (parallel to GSD's new-project). Semi-interactive: captain defines the phase goal and entity scope; skill structures it into ROADMAP.md format.

3. **FO phase-awareness**: FO reads ROADMAP.md to identify whether entities share a phase context. Entities in the same phase may share a summary context note in their PLAN inputs ("Phase 3 goal: Dashboard Overhaul -- prior entities 069, 070 completed").

4. **Phase completion signal**: When all entities in a ROADMAP.md phase reach "shipped" status, FO or captain runs a phase-completion summary showing: entities completed, phase goal achieved/not-achieved, next phase recommendation.

### Why This Matters

The gap is complete absence (score 1.0 across 5 dimensions). The build pipeline is fundamentally entity-at-a-time with no project-level coordination. Multi-entity projects (like Phase E itself, or the Dashboard overhaul spanning entities 042-051) are coordinated by captain memory and manual status checks, not by the pipeline. This creates:
- Re-discovery of cross-entity decisions at every entity's plan stage
- No machine-readable definition of "this set of entities achieves this goal"
- No automatic phase completion signal when all related entities ship

### Constraints

- ROADMAP.md is additive -- no changes to existing entity lifecycle or INDEX.md format
- FO phase-awareness is informational only -- phase membership does not change dispatch order (captain still controls entity priority)
- build-roadmap skill is manually triggered (like build-distill) -- not a pipeline stage

## Captain Context Snapshot

- **Comparison report**: `docs/build-pipeline/_docs/distillations/gsd-roadmap-vs-build-flow.md`
- **Source skill**: `~/.claude/skills/gsd-new-project/SKILL.md` + `~/.claude/skills/gsd-new-milestone/SKILL.md`
- **Gap dimension**: Complete absence (1.0) across Interaction Model, Context Strategy, Research Depth, Decision Locking, Execution Architecture
- **Gap score**: 1.0 (highest gap in the GSD first pass)
- **Distillation run**: Entity 068, build-distill Wave 2 task-6
- **Related**: GSD creates PROJECT.md + ROADMAP.md + STATE.md; build pipeline has INDEX.md (status tracking) but no ROADMAP.md (phase planning)

## Acceptance Criteria

- `test -f docs/build-pipeline/_index/ROADMAP.md` returns 0 after build-roadmap runs on a sample project description (how to verify: `ls docs/build-pipeline/_index/ROADMAP.md`)
- ROADMAP.md contains at least one named phase with `goal:`, `entities:` (list of IDs), and `status:` (planned/in-progress/complete) fields (how to verify: `grep -c "goal:\|entities:\|status:" docs/build-pipeline/_index/ROADMAP.md` returns >= 3)
- `test -f skills/build-roadmap/SKILL.md` returns 0 (how to verify: file exists check)
- FO dispatch log shows phase-membership note in plan stage for entities in a shared ROADMAP.md phase (how to verify: `grep "Phase.*goal" {entity-stage-report}` returns a match for a multi-entity phase)
