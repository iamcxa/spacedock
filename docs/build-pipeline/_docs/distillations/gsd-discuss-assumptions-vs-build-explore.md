# GSD discuss-phase (assumptions model) vs build-explore -- Comparison Report

**Date**: 2026-04-12
**Source**: `~/.claude/skills/gsd-discuss-phase/SKILL.md` + `~/.claude/get-shit-done/workflows/discuss-phase.md` (gray_area_identification section)
**Target**: `skills/build-explore/SKILL.md` + `skills/build-explore/references/hybrid-classification-heuristic.md`
**Run by**: build-distill (entity 068, Wave 2 task-7)

Note: This comparison focuses specifically on the gray area identification and classification subsystem -- how each system identifies what needs clarification and routes it for resolution. GSD discuss-phase is read for its gray_area_identification block; build-explore is read for its Steps 4-5 (Gray Area Identification + Hybrid Classification).

---

## Cross-Comparison Gap Ranking (This Run)

| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1 | Context Strategy | 0.75 | yes -- build-explore-domain-aware-gray-areas |
| 2 | Interaction Model | 0.50 | yes -- (covered by interaction modes entity from comparison 1) |
| 3 | Decision Locking | 0.25 | no -- both produce equivalent routing output |
| 4 | Research Depth | 0.00 | no evidence of gap (both read codebase to generate gray areas) |
| 5 | Verification Rigor | 0.00 | no evidence of gap |
| 6 | Execution Architecture | 0.00 | no evidence of gap (both sequential single-context) |
| 7 | Audit Trail | 0.00 | no evidence of gap |

## All-Comparisons Aggregate (Entity 068 GSD First Pass)

| Comparison | Highest Gap Score | Top Dimension | Entity Draft? |
|------------|------------------|---------------|---------------|
| gsd-roadmap vs build-flow | 1.0 | All 5 dimensions (complete absence) | yes -- build-flow-roadmap-orchestration |
| **gsd-discuss-assumptions vs build-explore** (this run) | **0.75** | **Context Strategy (domain-aware gray areas)** | **yes -- build-explore-domain-aware-gray-areas** |
| gsd-discuss-phase vs build-clarify | 0.75 | Interaction Model (--auto/--power modes) | yes -- build-clarify-interaction-modes |
| gsd-research-phase vs build-research | 0.50 | Research Depth + Checkpoint/Continuation | yes -- 2 entities |
| gsd-plan-phase vs build-plan | 0.50 | Context Strategy (cross-entity plan context) | yes -- cross-entity context awareness |

---

## Source Summary: gsd-discuss-phase (gray area identification)

- **Purpose**: Identify implementation decisions the user cares about -- things that could go multiple ways and would change the result. Generate PHASE-SPECIFIC gray areas (not generic categories).
- **Interaction Model**: User selects which gray areas to discuss (user-selects-which pattern). Then deep-dive each selected area until satisfied. Interactive: AskUserQuestion per gray area discussion.
- **Step Count**: 3-step gray area process: (1) Read phase goal from ROADMAP.md, (2) Understand domain type (users SEE/CALL/RUN/READ/being ORGANIZED), (3) Generate phase-specific gray areas for THAT phase
- **Context Loading Strategy**: Starts from ROADMAP.md phase goal. Understands what KIND of thing is being built (domain type). Generates gray areas specific to the phase goal -- not generic "what about error handling?"
- **Output Artifacts**: Curated list of gray areas presented to user. User selects subset. Selected areas become the discussion agenda.
- **Key Pattern**: Phase-goal-driven. Gray areas are derived from "what decisions for THIS phase specifically would change the outcome?"
- **Anti-pattern explicitly avoided**: "Don't use generic category labels (UI, UX, Behavior). Generate specific gray areas."

---

## Target Summary: build-explore (Steps 4-5)

- **Purpose**: Identify gray areas from codebase analysis, classify them into Assumptions/Options/Questions for downstream clarify stage.
- **Interaction Model**: Non-interactive. Writes findings to entity body for build-clarify to consume.
- **Step Count**: 2 steps: Step 4 (Gray Area Identification using domain templates from gray-area-templates.md), Step 5 (Hybrid Classification into Track A/B/C using confidence thresholds)
- **Context Loading Strategy**: Starts from entity domain classification (from build-brainstorm Step 2 domain tags). Applies matching domain-specific templates from `references/gray-area-templates.md`. Codebase analysis from Step 2 (file mapping) informs which gray areas already have precedent.
- **Output Artifacts**: Track A (Assumptions), Track B (Option Comparisons), Track C (Open Questions) -- all written to entity body.
- **Key Pattern**: Codebase-evidence-driven. Gray areas are classified by evidence level (2+ usages = Confident assumption, 1 = Likely, none = Option or Question). Numeric confidence scores (0-1) per assumption.
- **Key strength**: Hybrid Classification Heuristic provides explicit quantitative thresholds for routing decisions. Every gray area gets exactly one Track assignment. Minimizes captain interaction by preferring Track A over B over C.

---

## Dimensional Comparison

### Dimension 1: Interaction Model

**Source**: User-selects-which pattern -- ALL gray areas are presented at once, user picks which to discuss. Then deep-dive-until-satisfied for each selected area. User can redirect, go deeper, or skip. Fully interactive.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:69-106` -- gray_area_identification: "User selects which to discuss")

**Target**: Non-interactive. All gray areas are classified and written to entity body. Build-clarify handles user interaction. Build-explore produces the full set; captain sees them all at clarify time.
(`skills/build-explore/SKILL.md:8` -- "This skill is non-interactive -- never ask the captain questions")

**Gap Direction**: source-stronger (GSD lets user SELECT which gray areas to dive into; build-explore produces all and defers selection to clarify)
**Evidence**: `~/.claude/get-shit-done/workflows/discuss-phase.md:97-99` -- "User selects which to discuss". `skills/build-explore/SKILL.md:8` -- non-interactive.

Score: Medium (0.50) -- meaningful difference. GSD's user-selects-which pattern allows the captain to skip low-value gray areas before the discussion even starts. Build-explore produces all gray areas and the captain sees them all at clarify time, which may feel overwhelming for entities with many gray areas. However, build-clarify's batch confirmation (Step 2) partially addresses this by letting the captain confirm all Confident assumptions at once.

Note: This gap is partially addressed by the build-clarify interaction modes entity proposed in comparison 1. --auto mode would implicitly implement a "skip low-value areas" behavior by auto-confirming Confident assumptions.

---

### Dimension 2: Context Strategy

**Source**: Phase-goal-driven gray area generation. Derives gray areas FROM the phase goal by understanding domain type (SEE/CALL/RUN/READ/ORGANIZED). Domain type drives the questions asked -- not a fixed template.
(`~/.claude/get-shit-done/workflows/discuss-phase.md:76-99` -- "Understand the domain" as a dynamic classification step; generates "phase-specific gray areas, not generic categories")

**Target**: Template-driven gray area generation. Applies fixed domain templates from `references/gray-area-templates.md` based on domain tags assigned by build-brainstorm. Template coverage is the same regardless of what the specific entity directive says.
(`skills/build-explore/SKILL.md:145-155` -- Step 4: "Read references/gray-area-templates.md. Apply the domain-specific template(s) matching the entity's domain(s)")

**Gap Direction**: source-stronger (GSD generates phase-specific gray areas from the phase goal; build-explore applies fixed templates)
**Evidence**: `~/.claude/get-shit-done/workflows/discuss-phase.md:82-97` -- "Don't use generic category labels. Generate specific gray areas" with examples showing phase-specific derivation. `skills/build-explore/SKILL.md:145-148` -- "Apply the domain-specific template(s) matching the entity's domain(s)".

Score: High (0.75) -- significant gap. Build-explore's template-based approach is consistent but context-blind: the same "Behavioral/Callable" template applies to any callable feature regardless of its specific goal. GSD's phase-goal-driven approach generates different gray areas for "authentication API" vs "notification API" even though both are Behavioral/Callable. This means build-explore may miss critical gray areas specific to the entity's goal while generating generic ones.

Evidence of captain pain: entity 067 session -- SO initially generated generic gray areas for TDD discipline; captain corrected framing by pointing back to Superpowers TDD, which is a "specific phase goal" correction that GSD's approach would have caught earlier.

---

### Dimension 3: Research Depth

**Source**: Gray area identification is analysis-only -- no research. Uses phase goal + domain understanding. No codebase reads in gray area identification itself (those happen at research-phase).

**Target**: Gray area identification is codebase-informed. Step 2 file mapping feeds into Step 4 -- areas where codebase has precedent can be auto-classified as Assumptions rather than gray areas. Research depth is higher because codebase is read before gray area generation.
(`skills/build-explore/SKILL.md:142-155` -- Step 4 consumes Step 2's file mapping results)

**Gap Direction**: target-stronger (build-explore's codebase-informed gray areas reduce false positives; GSD generates gray areas without codebase context)
**Evidence**: `skills/build-explore/references/hybrid-classification-heuristic.md:12-25` -- Track A confidence levels derived from codebase evidence count. GSD's gray area identification has no codebase evidence check.

Score: 0.00 -- build-explore is stronger here. Not an actionable gap.

---

### Dimension 4: Decision Locking

**Source**: User discussion produces decisions that feed CONTEXT.md (locked decisions for downstream). The gray area + user selection + discussion = decision. Locking is explicit.

**Target**: Classification output (A/B/C) routes gray areas to clarify. Build-clarify produces annotations (`→ Confirmed`, `→ Selected`, `→ Answer`). Locking happens at clarify, not explore.

**Gap Direction**: divergent (different stage owns locking; both achieve locking eventually)
**Evidence**: Both systems produce decisions that downstream planning consumes. GSD discuss-phase does it in one session; build flow splits across explore + clarify.

Score: Low (0.25) -- minor difference. Both produce equivalent locked decisions; timing differs.

---

### Dimension 5: Verification Rigor

**Source**: No verification step for gray area identification.

**Target**: Track classification heuristic provides verification: priority rule (prefer A over B over C), confidence threshold table, explicit "if Unclear, reconsider Track B/C" check.
(`skills/build-explore/references/hybrid-classification-heuristic.md:6-8` -- "Only escalate to a higher track when the evidence genuinely requires it")

**Gap Direction**: target-stronger (build-explore has explicit classification heuristic; GSD relies on "understand the domain" judgment)
**Evidence**: `skills/build-explore/references/hybrid-classification-heuristic.md:142-153` -- classification walkthrough with 7 decision steps. GSD has no equivalent classification rigor for gray area routing.

Score: 0.00 -- build-explore is stronger. Not an actionable gap.

---

### Dimension 6: Execution Architecture

**Source**: Sequential: read phase goal → understand domain → generate gray areas → present to user. Single-context.

**Target**: Sequential: domain classification (from brainstorm) → gray area templates → hybrid classification. Single-context.

**Gap Direction**: equivalent
**Evidence**: Both sequential single-context. No parallel dispatch in either gray area identification step.

Score: 0.00 -- no evidence of gap.

---

### Dimension 7: Audit Trail

**Source**: Gray areas and user selections are consumed into CONTEXT.md. No separate gray area audit -- the decisions produced are the audit.

**Target**: Track A/B/C classifications written to entity body as Assumptions/Option Comparisons/Open Questions with evidence citations. Full audit trail of what was classified and why (including Confidence levels and Evidence fields).
(`skills/build-explore/SKILL.md:176-186` -- Step 6 writes classified items with evidence to entity body)

**Gap Direction**: target-stronger (build-explore's entity body contains the classification evidence; GSD collapses to decisions only)
**Evidence**: `skills/build-explore/references/hybrid-classification-heuristic.md:28-49` -- Track A format includes Confidence + Evidence fields. GSD's CONTEXT.md contains decisions without classification evidence.

Score: 0.00 -- build-explore is stronger. Not an actionable gap.

---

## Gap Score Summary

| Dimension | Band | Score | Evidence |
|-----------|------|-------|----------|
| Context Strategy | High | 0.75 | GSD generates phase-specific gray areas from phase goal; build-explore applies fixed templates |
| Interaction Model | Medium | 0.50 | GSD's user-selects-which pattern; build-explore produces all and defers selection |
| Decision Locking | Low | 0.25 | Divergent timing (explore+clarify vs discuss); equivalent outcome |
| Research Depth | 0.0 | 0.00 | Build-explore stronger (codebase-informed gray areas) -- not an actionable gap |
| Verification Rigor | 0.0 | 0.00 | Build-explore stronger (explicit classification heuristic) -- not an actionable gap |
| Execution Architecture | 0.0 | 0.00 | No evidence of gap -- both sequential single-context |
| Audit Trail | 0.0 | 0.00 | Build-explore stronger (classification evidence in entity body) -- not an actionable gap |

---

## Proposed Entity Drafts

### Gap 1: Context Strategy (Score: 0.75) -- QUALIFIES

**Proposed entity title**: Build-Explore Domain-Aware Gray Area Generation
**Directive summary**: Enhance build-explore's gray area identification to derive phase-specific gray areas from the entity directive and domain goal, not just from fixed templates. Currently build-explore applies the same "Behavioral/Callable" template to any callable feature; GSD generates different questions for "authentication API" vs "notification API" by analyzing what the PHASE GOAL specifically implies. The enhancement would make build-explore read the entity Directive + Brainstorming Spec APPROACH to extract goal-specific gray areas before applying domain templates.
**Draft acceptance criteria**:
- Build-explore Step 4 reads `## Directive` and extracts 2-3 goal-specific gray areas before loading domain templates
- Goal-specific gray areas are deduplicated against template-generated ones; final gray area list contains at least one directive-derived item for entities where the Directive names a specific domain constraint or non-generic goal
- `grep "directive-derived\|goal-specific" {entity-file}` returns a match in the Stage Report: explore for entities with specific directives
**Gap score**: 0.75 (High)
**Source comparison**: `~/.claude/get-shit-done/workflows/discuss-phase.md:76-99` -- "Understand the domain" step generating phase-specific gray areas from phase goal; "Don't use generic category labels. Generate specific gray areas."
Evidence of captain pain: entity 067 session -- generic TDD gray areas generated initially; captain corrected framing by pointing to Superpowers TDD. Phase-goal-driven approach would have derived "compare against Superpowers:TDD" as a specific gray area from the directive.

### Gap 2: Interaction Model (Score: 0.50) -- QUALIFIES

Note: This gap is substantially covered by the build-clarify interaction modes entity proposed in comparison 1 (gsd-discuss-phase-vs-build-clarify). The --auto mode on build-clarify would implement "skip low-value gray areas" behavior. Recommend bundling this into the existing build-clarify-interaction-modes entity rather than creating a separate entity.

**Disposition**: Bundle into build-clarify-interaction-modes entity from comparison 1. No separate entity created.
