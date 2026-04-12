# GSD plan-phase vs build-plan -- Comparison Report

**Date**: 2026-04-12
**Source**: `~/.claude/skills/gsd-plan-phase/SKILL.md` + `~/.claude/get-shit-done/workflows/plan-phase.md`
**Target**: `skills/build-plan/SKILL.md` + `skills/build-plan/references/plan-checker-prompt.md`
**Run by**: build-distill (entity 068, Wave 2 task-5)

---

## Cross-Comparison Gap Ranking (This Run)

| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1 | Context Strategy | 0.50 | yes -- cross-phase plan context |
| 2 | Interaction Model | 0.25 | no -- build-plan's non-interactive design is correct for ensign context |
| 3 | Audit Trail | 0.25 | no -- build-plan's CONTRACTS.md + Stage Report are stronger than GSD |
| 4 | Verification Rigor | 0.00 | no evidence of gap (both have plan-checker loops) |
| 5 | Research Depth | 0.00 | no evidence of gap (both dispatch researchers) |
| 6 | Decision Locking | 0.00 | no evidence of gap |
| 7 | Execution Architecture | 0.00 | no evidence of gap |

## All-Comparisons Aggregate (Entity 068 GSD First Pass)

| Comparison | Highest Gap Score | Top Dimension | Entity Draft? |
|------------|------------------|---------------|---------------|
| gsd-roadmap vs build-flow | 1.0 | All 5 dimensions (complete absence) | yes -- build-flow-roadmap-orchestration |
| gsd-discuss-assumptions vs build-explore | 0.75 | Context Strategy (domain-aware gray areas) | yes -- build-explore-domain-aware-gray-areas |
| gsd-discuss-phase vs build-clarify | 0.75 | Interaction Model (--auto/--power modes) | yes -- build-clarify-interaction-modes |
| gsd-research-phase vs build-research | 0.50 | Research Depth + Checkpoint/Continuation | yes -- 2 entities |
| **gsd-plan-phase vs build-plan** (this run) | **0.50** | **Context Strategy (cross-entity plan context)** | **yes -- cross-entity context awareness** |

---

## Source Summary: gsd-plan-phase

- **Purpose**: Create executable phase prompts (PLAN.md files) for a roadmap phase with integrated research and verification. Default flow: Research → Plan → Verify → Done.
- **Interaction Model**: Interactive orchestrator. Supports flags: `--auto` (skip interaction), `--skip-research`, `--gaps` (gap closure mode), `--skip-verify`, `--prd <file>` (bypass discuss-phase with PRD), `--reviews` (incorporate cross-AI review feedback), `--text` (plain-text mode for remote sessions).
- **Step Count**: 8+ steps in plan-phase.md workflow
- **Tools Used**: Read, Write, Bash, Glob, Grep, Task, AskUserQuestion, WebFetch, Context7
- **Output Artifacts**: `.planning/phases/{N}-{slug}/PLAN.md` with detailed phase tasks; `VERIFICATION.md` after checker pass
- **Subagent Dispatch Pattern**: Spawns gsd-phase-researcher (if research needed), gsd-planner, gsd-plan-checker. All via Task tool with fresh context.
- **Context Loading Strategy**: Loads ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, STATE.md, RESEARCH.md, VERIFICATION.md (gap mode), REVIEWS.md (reviews mode). On 500k+ context windows, also loads prior phase CONTEXT.md files for cross-phase consistency.

---

## Target Summary: build-plan

- **Purpose**: Plan-stage orchestrator. Reads clarified entity, dispatches parallel researchers (pre-dispatched by FO/SO before invocation), writes PLAN/UAT Spec/Validation Map, self-reviews, dispatches plan-checker, loops through capped revision cycle.
- **Interaction Model**: Non-interactive. Dispatched by FO as ensign subagent. No AskUserQuestion -- escalation via `feedback-to: captain` in Stage Report.
- **Step Count**: 9 steps (topic extraction, read research findings, contradiction resolution, write plan, self-review, plan-checker dispatch, revision loop ≤3, knowledge capture, workflow-index append + stage report)
- **Tools Used**: Read, Grep/Glob, Write/Edit, Bash, Skill (workflow-index, knowledge-capture)
- **Output Artifacts**: Entity body PLAN section, UAT Spec, Validation Map, Stage Report: plan; CONTRACTS.md append (unconditional); workflow-index append
- **Subagent Dispatch Pattern**: Research pre-dispatched by FO/SO (not by build-plan itself -- ensign constraint). Plan-checker dispatched by build-plan if Agent tool available (main orchestrator mode).
- **Context Loading Strategy**: Reads entity body (Brainstorming Spec, Explore Output, Clarify Output, Acceptance Criteria, Research Findings). No external project files -- all context flows through entity body.

---

## Dimensional Comparison

### Dimension 1: Interaction Model

**Source**: Interactive orchestrator with 7 flags. `--auto` skips all interaction. `--prd` parses PRD into CONTEXT.md bypassing discuss-phase. `--reviews` incorporates cross-AI feedback. User can steer research, review plan before verification, approve/reject.
(`~/.claude/get-shit-done/workflows/plan-phase.md:43-50` -- flags and their effects)

**Target**: Non-interactive by design. Runs as FO-dispatched ensign. Captain interaction not possible -- escalation via feedback-to in Stage Report.
(`skills/build-plan/SKILL.md:31` -- "NOT available: AskUserQuestion -- you run as an ensign subagent dispatched by FO. FO owns captain interaction.")

**Gap Direction**: divergent (not source-stronger -- build-plan's non-interactive design is correct for its execution context as an ensign; GSD's interactivity is appropriate for its user-facing role)
**Evidence**: `skills/build-plan/SKILL.md:31` -- explicit AskUserQuestion prohibition with rationale. This is an architectural choice, not a deficiency.

Score: Low (0.25) -- minor difference attributable to architectural context (ensign vs user-facing orchestrator). Not an actionable gap within the current pipeline architecture.

---

### Dimension 2: Context Strategy

**Source**: Loads ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, STATE.md, RESEARCH.md per phase. On 500k+ context windows, also loads prior phase CONTEXT.md files so cross-phase decisions are consistent.
(`~/.claude/get-shit-done/workflows/plan-phase.md:32-33` -- "When CONTEXT_WINDOW >= 500000, planner prompt includes prior phase CONTEXT.md files")

**Target**: Reads entity body only (Brainstorming Spec + Explore Output + Clarify Output + Acceptance Criteria + Research Findings). No ROADMAP.md equivalent -- the pipeline operates entity-by-entity, not phase-by-phase.
(`skills/build-plan/SKILL.md:39-47` -- Input Contract: 5 entity body sections; no external project state files)

**Gap Direction**: source-stronger (GSD loads cross-phase context; build-plan is entity-scoped)
**Evidence**: `~/.claude/get-shit-done/workflows/plan-phase.md:32-33` -- prior CONTEXT.md files for cross-phase consistency. `skills/build-plan/SKILL.md:39-47` -- entity body only.

Score: Medium (0.50) -- meaningful gap. Build-plan has no mechanism for cross-entity consistency ("use library X decided in entity 045" is invisible to build-plan for entity 068). GSD's cross-phase context loading prevents "rediscovering" already-made decisions.

---

### Dimension 3: Research Depth

**Source**: Optional research phase (can skip with `--skip-research` or force with `--research`). Researcher uses WebSearch + Context7 + WebFetch for ecosystem research.

**Target**: Research pre-dispatched by FO/SO using build-research (WebFetch, WebSearch, Context7 available). Same tools, different orchestration path. Build-plan reads pre-dispatched findings.

**Gap Direction**: equivalent (same research tool surface, different orchestration ownership)
**Evidence**: Both dispatch researchers with equivalent tool access. Build-plan's 5-researcher cap matches GSD's typical single-phase research scope.

Score: 0.00 -- no evidence of gap.

---

### Dimension 4: Decision Locking

**Source**: PLAN.md contains tasks with explicit verification steps. CONTEXT.md (from discuss-phase) provides locked decisions for planner. No unconditional cross-entity record.

**Target**: CONTRACTS.md append is unconditional -- every task's files_modified becomes a contract row. Stage Report: plan records all decisions. Entity body is the single source of truth.
(`skills/build-plan/SKILL.md:60-64` -- "CONTRACTS.md -- one row per (task, file) pair... This is unconditional")

**Gap Direction**: target-stronger (build-plan's unconditional CONTRACTS.md append creates cross-entity audit record; GSD has no equivalent)
**Evidence**: `skills/build-plan/SKILL.md:60-64` -- unconditional CONTRACTS.md append with stage=plan, status=planned. GSD plan-phase.md has no cross-entity contract mechanism.

Score: 0.00 -- build-plan is stronger here. Not an actionable gap.

---

### Dimension 5: Verification Rigor

**Source**: Spawns gsd-plan-checker via Task. Verification loop with max 3 iterations. `--skip-verify` flag to bypass. Verification via VERIFICATION.md written by checker.
(`~/.claude/get-shit-done/workflows/plan-phase.md` -- plan-checker spawn and iteration loop)

**Target**: Self-review step (Step 5) + plan-checker dispatch (Step 6) with max 3 iterations. 7 plan-checker dimensions (from `references/plan-checker-prompt.md`). Hard-blocks on checker failures.
(`skills/build-plan/SKILL.md:8` -- "self-review, dispatch a plan-checker subagent, loop through a capped revision cycle")

**Gap Direction**: equivalent (both have plan-checkers with iteration caps)
**Evidence**: Both dispatch checkers, both cap at 3 iterations. Build-plan has 7 named checker dimensions vs GSD's more generic checker criteria. Build-plan is marginally stronger on verification dimension specificity.

Score: 0.00 -- equivalent or build-plan is stronger. Not an actionable gap.

---

### Dimension 6: Execution Architecture

**Source**: Sequential orchestrator. Research → Plan → Verify → Done. Single agent at a time (gsd-planner, then gsd-plan-checker). No wave-parallel within plan-phase.

**Target**: Sequential 9-step orchestrator. Research pre-dispatched in parallel by FO (wave-parallel upstream). Build-plan itself is serial within its 9 steps.

**Gap Direction**: equivalent at the plan-phase level (both sequential); build pipeline achieves parallelism at the FO dispatch level, not within build-plan

**Evidence**: `skills/build-plan/SKILL.md:83-85` -- "Cap the topic count at 5 researchers per plan." Research parallelism is FO-owned, not build-plan-owned. GSD research is sequential too (single researcher spawn then optional continuation).

Score: 0.00 -- no evidence of gap.

---

### Dimension 7: Audit Trail

**Source**: Produces PLAN.md + VERIFICATION.md per phase. Cross-session readable by any agent.

**Target**: Produces entity body PLAN section + UAT Spec + Validation Map + Stage Report: plan + CONTRACTS.md rows + workflow-index append. Richer institutional memory per entity than GSD.
(`skills/build-plan/SKILL.md:53-66` -- Output Contract: 6 distinct artifacts)

**Gap Direction**: target-stronger (build-plan produces more audit artifacts than GSD plan-phase)
**Evidence**: `skills/build-plan/SKILL.md:53-66` -- 6 artifacts: Research Findings, PLAN, UAT Spec, Validation Map, Stage Report, CONTRACTS.md append + workflow-index. GSD produces 2: PLAN.md + VERIFICATION.md.

Score: Low (0.25) -- build-plan is stronger. Not an actionable gap.

---

## Gap Score Summary

| Dimension | Band | Score | Evidence |
|-----------|------|-------|----------|
| Context Strategy | Medium | 0.50 | GSD loads cross-phase CONTEXT.md; build-plan is entity-scoped only |
| Interaction Model | Low | 0.25 | Architectural divergence -- build-plan's non-interactive design is correct for ensign context |
| Audit Trail | Low | 0.25 | Build-plan stronger (6 artifacts vs GSD's 2) -- not an actionable gap |
| Verification Rigor | 0.0 | 0.00 | Equivalent -- both have plan-checker loops with 3-iteration cap |
| Research Depth | 0.0 | 0.00 | Equivalent tool surface, different orchestration ownership |
| Decision Locking | 0.0 | 0.00 | Build-plan stronger (unconditional CONTRACTS.md) -- not an actionable gap |
| Execution Architecture | 0.0 | 0.00 | Equivalent at plan-phase level; pipeline achieves parallelism at FO level |

---

## Proposed Entity Drafts

### Gap 1: Context Strategy (Score: 0.50) -- QUALIFIES

**Proposed entity title**: Cross-Entity Context Awareness in Build-Plan
**Directive summary**: When build-plan synthesizes research and writes the PLAN, load the last 3 shipped entities' CONTRACTS.md rows and Stage Reports to check for locked cross-entity decisions. Currently build-plan operates entity-scoped only -- a decision from entity 045 ("use SQLite for all persistence") is invisible when planning entity 068, potentially producing a plan that contradicts prior locked decisions. GSD prevents this by loading prior CONTEXT.md files before the planner runs.
**Draft acceptance criteria**:
- Build-plan Step 1 reads `docs/build-pipeline/_index/CONTRACTS.md` and extracts "locked" rows from the last 5 shipped entities
- When a research finding contradicts a CONTRACTS.md locked row, build-plan flags it in the Plan as a "Cross-entity conflict: {entity-id} locked {decision}" before proceeding
**Gap score**: 0.50 (Medium)
**Source comparison**: `plan-phase.md:32-33` -- "When CONTEXT_WINDOW >= 500000, planner prompt includes prior phase CONTEXT.md files so cross-phase decisions are consistent"
