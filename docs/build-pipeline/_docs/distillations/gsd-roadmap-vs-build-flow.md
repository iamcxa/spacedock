# GSD roadmap (new-project + new-milestone) vs build flow -- Comparison Report

**Date**: 2026-04-12
**Source**: `~/.claude/skills/gsd-new-project/SKILL.md` + `~/.claude/skills/gsd-new-milestone/SKILL.md`
**Target**: "none" -- no build-flow equivalent (per A-3: "No equivalent" scores 1.0)
**Run by**: build-distill (entity 068, Wave 2 task-6)

---

## Cross-Comparison Gap Ranking (This Run)

| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1 | Interaction Model | 1.0 | yes -- build-flow-roadmap-orchestration |
| 2 | Context Strategy | 1.0 | yes -- (same entity covers this) |
| 3 | Research Depth | 1.0 | yes -- (same entity covers this) |
| 4 | Decision Locking | 1.0 | yes -- (same entity covers this) |
| 5 | Execution Architecture | 1.0 | yes -- (same entity covers this) |
| 6 | Verification Rigor | 0.50 | yes -- (partially covered by roadmap entity) |
| 7 | Audit Trail | 0.25 | no -- INDEX.md + CONTRACTS.md partially cover roadmap tracking |

---

## Source Summary: gsd-new-project + gsd-new-milestone

- **Purpose (new-project)**: Initialize a new project through unified flow: questioning → research (optional) → requirements → roadmap. Creates PROJECT.md, config.json, research/, REQUIREMENTS.md, ROADMAP.md, STATE.md.
- **Purpose (new-milestone)**: Brownfield equivalent of new-project. Project exists. Gathers "what's next", updates PROJECT.md, runs requirements → roadmap cycle. Continues phase numbering.
- **Interaction Model**: Both are interactive orchestrators. `--auto` flag on new-project for fully automatic flow after config questions. Both use AskUserQuestion for questioning. Both delegate to workflow files.
- **Step Count**: new-project delegates to `new-project.md` workflow (6 stages: questioning → research → requirements → roadmap → STATE.md → commits). new-milestone delegates to `new-milestone.md` (similar 5 stages).
- **Tools Used**: Read, Write, Bash, Task, AskUserQuestion
- **Output Artifacts**: `.planning/PROJECT.md`, `.planning/config.json`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/research/` directory. Cross-phase structure defined in ROADMAP.md as ordered phases.
- **Subagent Dispatch Pattern**: Research is optional (spawns researcher if needed for new features). Planner runs inline.
- **Context Loading Strategy**: Loads prior PROJECT.md (for new-milestone) to build on existing decisions. Questioning workflow gathers vision, constraints, success criteria from captain.

---

## Target Summary: build flow (entity-by-entity pipeline)

- **Purpose**: Process individual entities through stages (brainstorm → explore → clarify → plan → execute → UAT → quality → shipped). No cross-entity orchestration, no multi-entity planning, no roadmap concept.
- **Interaction Model**: Entity-scoped. Captain directs which entity to work on. FO processes one entity at a time. No mechanism to plan 5 entities in sequence as a "project roadmap".
- **Step Count**: N/A -- build flow is a pipeline of stages, not a skill.
- **Tools Used**: N/A -- pipeline uses multiple skills.
- **Output Artifacts**: Entity files in `docs/build-pipeline/`. INDEX.md tracks entity status. CONTRACTS.md tracks cross-entity file ownership. No ROADMAP.md equivalent.
- **Subagent Dispatch Pattern**: FO dispatches per-entity ensigns. No multi-entity planning dispatch.
- **Context Loading Strategy**: Per-entity entity body. No project-level planning context.

Note: The closest build-flow analog to "roadmap" is the entity pipeline itself (INDEX.md showing all entities and their stages). But INDEX.md is a status tracker, not a multi-entity planning artifact -- it records what was done, not what sequence was planned and why.

---

## Dimensional Comparison

### Dimension 1: Interaction Model

**Source**: Interactive multi-stage questioning (AskUserQuestion) to gather project vision, constraints, and phase structure. `--auto` flag available for streamlined flow. User drives what the roadmap phases are.
(`gsd-new-project/SKILL.md:17-19` -- "unified flow: questioning → research → requirements → roadmap")

**Target**: No equivalent -- build flow has no project-initialization or roadmap-creation capability. Captain adds entities ad-hoc or through SO brainstorm sessions.

**Gap Direction**: source-stronger (complete absence in build flow)
**Evidence**: `docs/build-pipeline/README.md` (if exists) -- entity pipeline status tracker, no roadmap planning. Entity 068 Directive explicitly notes "No equivalent" for roadmap/new-milestone.

Score: Complete absence (1.0)

---

### Dimension 2: Context Strategy

**Source**: PROJECT.md persists project vision, constraints, and technology choices across all phases. STATE.md tracks current project state, blockers, and decisions. REQUIREMENTS.md captures scoped requirements. All subsequent skills (discuss-phase, research-phase, plan-phase) load these files.
(`gsd-new-project/SKILL.md:22-34` -- creates PROJECT.md, STATE.md, REQUIREMENTS.md as persistent cross-phase context)

**Target**: No project-level context files. CONTRACTS.md + DECISIONS.md are cross-entity records, but they are not project-vision artifacts -- they are contract/decision indexes for pipeline-internal coordination. No "what is this project trying to achieve" file.

**Gap Direction**: source-stronger (complete absence of project-level context in build flow)
**Evidence**: `docs/build-pipeline/_index/DECISIONS.md` -- empty placeholder (confirmed in entity 068 Research Findings). No PROJECT.md or REQUIREMENTS.md equivalent.

Score: Complete absence (1.0)

---

### Dimension 3: Research Depth

**Source**: Optional research phase during new-project -- investigates domain before defining requirements. For brownfield new-milestone, research applies to NEW features only.
(`gsd-new-project/SKILL.md:25` -- "creates .planning/research/ -- domain research (optional)")

**Target**: Build-research handles per-entity research. No project-level domain research before requirements are defined.

**Gap Direction**: source-stronger (complete absence of pre-requirements domain research in build flow)
**Evidence**: Build flow has no pre-requirements stage. Entities start at brainstorm with a captain directive -- no upstream research-before-scoping phase.

Score: Complete absence (1.0)

---

### Dimension 4: Decision Locking

**Source**: REQUIREMENTS.md captures scoped requirements. ROADMAP.md locks the phase structure. PROJECT.md captures vision and constraints. These persist across all sessions and are the authoritative source for planning.
(`gsd-new-project/SKILL.md:23-34` -- "REQUIREMENTS.md -- scoped requirements", "ROADMAP.md -- phase structure")

**Target**: No requirements or roadmap locking mechanism. Captain decides scope ad-hoc per entity directive. No "locked phase structure" concept.

**Gap Direction**: source-stronger (complete absence of multi-entity scope locking in build flow)
**Evidence**: Entity directives are freeform. CONTRACTS.md records what was planned, not what was scoped upfront.

Score: Complete absence (1.0)

---

### Dimension 5: Verification Rigor

**Source**: ROADMAP.md review step where captain approves the phase structure before work begins. No plan-checker equivalent for the roadmap itself.
(`gsd-new-milestone/SKILL.md:43` -- "Preserve all workflow gates (validation, questioning, research, requirements, roadmap approval, commits)")

**Target**: No roadmap verification -- no multi-entity plan to verify. Per-entity build-plan has plan-checker with 7 dimensions, but that is entity-scoped.

**Gap Direction**: source-stronger (complete absence of multi-entity plan verification in build flow)
**Evidence**: Build flow has no mechanism to verify that a set of entities together achieves a coherent project goal.

Score: Medium (0.50) -- partial absence. Entity-level verification exists (plan-checker) but project-level "do these entities form a coherent plan" verification is absent. Not a complete absence because entity verification is strong.

---

### Dimension 6: Execution Architecture

**Source**: Multi-phase orchestration across sessions. Phase N completion triggers phase N+1 planning. STATE.md tracks current position in the roadmap.
(`gsd-new-project/SKILL.md:35` -- "After this command: Run /gsd-plan-phase 1 to start execution")

**Target**: No multi-entity sequencing. FO processes entities independently. INDEX.md shows status but has no sequencing rules -- entity ordering is captain-driven ad-hoc.

**Gap Direction**: source-stronger (complete absence of multi-entity sequencing in build flow)
**Evidence**: No mechanism in build flow to define "entity 069 depends on entity 068" or "entities 069-073 form Phase 3".

Score: Complete absence (1.0)

---

### Dimension 7: Audit Trail

**Source**: PROJECT.md + STATE.md + ROADMAP.md together form a project-level audit trail: what was planned, what was decided, what was completed, what's next.

**Target**: INDEX.md tracks entity status across the pipeline. CONTRACTS.md tracks cross-entity file ownership. Together these provide a post-hoc audit of what happened, but not a pre-planned roadmap audit.
(`docs/build-pipeline/_index/` -- INDEX.md and CONTRACTS.md)

**Gap Direction**: source-stronger
**Evidence**: INDEX.md records status (planned, in-flight, shipped) per entity. ROADMAP.md in GSD records the planned phase sequence with goals before execution begins. INDEX.md is reactive; ROADMAP.md is proactive.

Score: Low (0.25) -- INDEX.md partially covers this. The gap is between reactive tracking (build flow) and proactive planning (GSD roadmap).

---

## Gap Score Summary

| Dimension | Band | Score | Evidence |
|-----------|------|-------|----------|
| Interaction Model | Complete absence | 1.0 | No build-flow equivalent for project initialization and phase planning |
| Context Strategy | Complete absence | 1.0 | No PROJECT.md, STATE.md, or REQUIREMENTS.md equivalent in build flow |
| Research Depth | Complete absence | 1.0 | No pre-requirements domain research phase in build flow |
| Decision Locking | Complete absence | 1.0 | No multi-entity scope locking or ROADMAP.md equivalent |
| Execution Architecture | Complete absence | 1.0 | No multi-entity sequencing or cross-session phase progression |
| Verification Rigor | Medium | 0.50 | Entity-level verification exists; project-level verification absent |
| Audit Trail | Low | 0.25 | INDEX.md covers tracking; no proactive roadmap planning artifact |

---

## Proposed Entity Drafts

### Gap 1: Complete Roadmap / Multi-Entity Orchestration Gap (Score: 1.0) -- QUALIFIES

**Proposed entity title**: Build-Flow Roadmap -- Multi-Entity Project Orchestration
**Directive summary**: Add a "roadmap" concept to the build pipeline: a way to define a set of related entities as a project phase, sequence their execution, and track progress toward a project goal. Currently the captain must manually decide which entities to create and in what order -- there is no mechanism to say "entities 069-073 form Phase 3: Dashboard Overhaul" and have the pipeline sequence and track them. GSD's new-project + ROADMAP.md solve this by creating a first-class project planning artifact before execution begins.
**Draft acceptance criteria**:
- `docs/build-pipeline/_index/ROADMAP.md` can be created with named phases, each containing a goal and a list of entity IDs (or planned entity titles)
- FO consults ROADMAP.md when dispatching -- entities in the same phase share context (STATE.md equivalent) and FO can identify "all Phase 3 entities complete" to signal phase done
- A `build-roadmap` skill creates ROADMAP.md through questioning → requirements → phase structure (parallel to GSD's new-project flow)
**Gap score**: 1.0 (Complete absence)
**Source comparison**: `gsd-new-project/SKILL.md:22-35` -- full project initialization creating PROJECT.md + ROADMAP.md + STATE.md

Note: This is the largest gap in the GSD-vs-build-flow comparison. All 5 complete-absence dimensions stem from the same root missing capability: multi-entity project orchestration. One entity (build-flow-roadmap-orchestration) is proposed to address all 5 complete-absence dimensions.

### Gap 2: Project-Level Verification (Score: 0.50) -- QUALIFIES

**Proposed entity title**: Build-Flow Roadmap Phase Completion Gate
**Directive summary**: Add a phase-completion gate: when all entities in a ROADMAP.md phase reach "shipped" status, FO or captain runs a cross-entity verification that confirms the phase goal was achieved. Currently entities are verified individually (UAT + quality per entity) but no mechanism confirms "the set of entities in Phase 3 together achieves the Dashboard Overhaul goal". GSD's roadmap approval step provides this.
**Draft acceptance criteria**:
- When `build-flow-roadmap-orchestration` (entity from Gap 1) exists and a phase's entities all reach shipped, FO prompts captain with a phase-completion summary
- Phase-completion summary includes: entities completed, goals achieved (from ROADMAP.md phase goal), entities deferred, next phase recommendation
**Gap score**: 0.50 (Medium)
**Source comparison**: `gsd-new-milestone/SKILL.md:43` -- "roadmap approval" gate before execution begins

Note: This entity depends on Gap 1 (ROADMAP.md concept). Should be implemented as a child of the roadmap orchestration entity, not independently.
