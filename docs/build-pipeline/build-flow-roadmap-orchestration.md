---
id: 070
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

Add a "roadmap" concept to the build pipeline with DAG-based entity dependency management: a way to define related entities as a project phase, express their dependency graph, sequence execution via topological sort, and track progress toward a named project goal.

Currently the captain must manually decide which entities to create and in what order -- there is no mechanism to say "entities 069-073 form Phase 3: Dashboard Overhaul" and have the pipeline sequence and track them. The pipeline is entity-centric; it has no project-level planning layer above the individual entity. The `depends-on` field is a flat list that only means "wait until shipped" -- it cannot express stage-level dependencies, transitive chains, or diamond patterns. The FO cannot visualize or reason about the dependency graph.

GSD's `new-project` + `new-milestone` solve the phase-planning gap with ROADMAP.md. The DAG gap is unique to the build pipeline's entity-at-a-time dispatch model. This entity merges both: roadmap for phase grouping, DAG for dependency resolution and visualization.

### Key Deliverables

**Phase Planning (Roadmap)**

1. **`docs/build-pipeline/_index/ROADMAP.md`**: A new index file defining named phases, each with a goal and a list of entity IDs. FO consults this when dispatching to identify phase membership.

2. **`build-roadmap` skill**: Creates ROADMAP.md through a questioning → requirements → phase structure flow (parallel to GSD's new-project). Semi-interactive: captain defines the phase goal and entity scope; skill structures it into ROADMAP.md format.

3. **Phase completion signal**: When all entities in a ROADMAP.md phase reach "shipped" status, FO or captain runs a phase-completion summary showing: entities completed, phase goal achieved/not-achieved, next phase recommendation.

**Entity Dependency DAG**

4. **`depends-on` schema evolution**: Support stage-level dependencies alongside entity-level. New format: `depends-on: [{entity: 061, stage: plan}, 054]` -- mixed object (stage-level) and string (entity-level, defaults to shipped). Backward compatible: bare strings keep current semantics.

5. **DAG resolution in `status` script**: `status --next` uses topological sort to compute dispatch order. Transitive dependencies resolved automatically (A→B→C: A is not dispatchable until C is satisfied). Diamond dependencies correctly handled (A→B, A→C, D→B, D→C: D waits for both B and C). Cycle detection with error reporting.

6. **FO DAG-awareness**: FO reads the dependency graph to determine dispatch order (actionable, not just informational). Entities in the same phase share a summary context note in their PLAN inputs ("Phase 3 goal: Dashboard Overhaul -- prior entities 069, 070 completed"). Cross-phase dependencies are surfaced at dispatch time.

7. **Dashboard DAG visualization**: Entity nodes + dependency edges + phase grouping rendered as an interactive graph. Nodes colored by status (draft/execute/shipped). Critical path highlighted. Clickable nodes → entity detail. Phase boundaries as grouping boxes.

### Why This Matters

The gap is complete absence (score 1.0 across 5 dimensions). The build pipeline is fundamentally entity-at-a-time with no project-level coordination. Multi-entity projects (like Phase E itself, or the Dashboard overhaul spanning entities 042-051) are coordinated by captain memory and manual status checks, not by the pipeline. This creates:
- Re-discovery of cross-entity decisions at every entity's plan stage
- No machine-readable definition of "this set of entities achieves this goal"
- No automatic phase completion signal when all related entities ship
- Linear `depends-on` cannot express the real dependency graph (stage-level, transitive, diamond)
- FO dispatches entities without knowing the critical path or bottleneck entities
- Captain cannot see which entities are blocked and why at a glance

### Constraints

- ROADMAP.md is additive -- no changes to existing entity lifecycle or INDEX.md format
- `depends-on` schema evolution is backward compatible -- bare strings keep current "wait until shipped" semantics
- DAG resolution is deterministic -- topological sort with stable tie-breaking (by ID)
- build-roadmap skill is manually triggered (like build-distill) -- not a pipeline stage
- Dashboard graph is read-only visualization -- no drag-and-drop entity reordering (captain uses entity files for that)

### Decomposition Note

This entity is Large and likely needs decomposition during explore/clarify into:
- Child A: `depends-on` schema + `status` script DAG resolution (foundation)
- Child B: ROADMAP.md + build-roadmap skill (phase planning)
- Child C: FO DAG-awareness + phase context injection (dispatch integration)
- Child D: Dashboard DAG visualization (UI, depends on A+B)

## Captain Context Snapshot

- **Comparison report**: `docs/build-pipeline/_docs/distillations/gsd-roadmap-vs-build-flow.md`
- **Source skill**: `~/.claude/skills/gsd-new-project/SKILL.md` + `~/.claude/skills/gsd-new-milestone/SKILL.md`
- **Gap dimension**: Complete absence (1.0) across Interaction Model, Context Strategy, Research Depth, Decision Locking, Execution Architecture
- **Gap score**: 1.0 (highest gap in the GSD first pass)
- **Distillation run**: Entity 068, build-distill Wave 2 task-6
- **Related**: GSD creates PROJECT.md + ROADMAP.md + STATE.md; build pipeline has INDEX.md (status tracking) but no ROADMAP.md (phase planning)

## Acceptance Criteria

**Phase Planning:**
- `test -f docs/build-pipeline/_index/ROADMAP.md` returns 0 after build-roadmap runs on a sample project description (how to verify: `ls docs/build-pipeline/_index/ROADMAP.md`)
- ROADMAP.md contains at least one named phase with `goal:`, `entities:` (list of IDs), and `status:` (planned/in-progress/complete) fields (how to verify: `grep -c "goal:\|entities:\|status:" docs/build-pipeline/_index/ROADMAP.md` returns >= 3)
- `test -f skills/build-roadmap/SKILL.md` returns 0 (how to verify: file exists check)
- FO dispatch log shows phase-membership note in plan stage for entities in a shared ROADMAP.md phase (how to verify: `grep "Phase.*goal" {entity-stage-report}` returns a match for a multi-entity phase)

**Entity DAG:**
- `depends-on` supports mixed format: `depends-on: [{entity: 061, stage: plan}, 054]` parses correctly in status script (how to verify: create test entity with mixed depends-on, run `status --next`, confirm stage-level dep blocks until that stage completes)
- `status --next` uses topological sort: entity A depending on B is not dispatchable until B satisfies the dependency (how to verify: seed 3 entities A→B→C, confirm only C is dispatchable initially)
- Cycle detection: `status --next` reports error for circular deps instead of hanging (how to verify: create A→B→A cycle, confirm error message)
- Dashboard renders entity dependency graph with nodes colored by status and edges showing dependency direction (how to verify: browser — open dashboard, see graph with correct topology matching `depends-on` fields)
