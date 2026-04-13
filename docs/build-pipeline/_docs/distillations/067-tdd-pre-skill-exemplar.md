# Entity 067 -- Pre-Skill Exemplar of Ad-Hoc Distillation

**Date**: 2026-04-12
**Source**: `superpowers:test-driven-development` (Superpowers skill)
**Target**: `skills/build-plan/SKILL.md` (task schema) + `skills/task-execution/SKILL.md`
**Process used**: Ad-hoc captain-initiated distillation (no formal build-distill skill)
**Entity file**: `docs/build-pipeline/_archive/build-flow-tdd-discipline.md` (shipped)
**Context**: This document retroactively documents entity 067 as the "pre-skill exemplar" -- the first ad-hoc distillation that motivated creating the `build-distill` skill. It shows what ad-hoc distillation looks like vs what the formal skill produces.

---

## What Was Distilled

Entity 067 distilled `superpowers:test-driven-development` into the build pipeline's plan and execute stages. The gap was identified when the captain noticed that pre-pipeline entities (031-042) had followed red→green→refactor discipline via Superpowers TDD, but that discipline had evaporated during the pipeline distillation -- zero mentions of TDD, test-first, or red→green existed in any `skills/build-*/SKILL.md`.

**Key deliverables from entity 067**:
1. `test_first: true` task schema attribute for build-plan
2. TDD sub-cycle in task-execution (RED → GREEN → optional refactor)
3. Plan-checker dimension 6d intelligence for `test_first` task validation
4. build-brainstorm acceptance criteria shape enhancement (optional)

---

## What Worked (Strengths of Ad-Hoc Process)

- **Real gap identified**: The TDD discipline had genuinely evaporated from the pipeline. Captain's intuition was correct.
- **Actionable entity produced**: Entity 067 shipped with concrete deliverables (task schema + TDD mode + plan-checker dimension). The gap was real and the solution was concrete.
- **Fast**: No overhead of formal comparison methodology. Captain pointed to Superpowers TDD; SO explored; entity was created within one session.
- **Domain-specific insight**: The observation that "test-first" ordering matters (write test BEFORE implementation, not alongside) was correctly captured -- this is a nuanced TDD discipline point that a generic comparison might have missed.

---

## What Was Missed (Weaknesses of Ad-Hoc Process)

### 1. O-1 RED/GREEN Interaction Model Misframe

The initial distillation described TDD as "a cycle" (RED → GREEN → refactor repeated indefinitely). The Superpowers:TDD skill actually uses a "discipline" framing (single RED phase, single GREEN phase, optional refactor, then done per task). Captain corrected this framing, but the error would not have occurred with a formal Dimension 1 (Interaction Model) comparison that asked "how does the source skill structure its steps?"

**Impact**: Required a captain correction mid-session, adding interaction overhead. Could have been caught by the comparison dimension "Execution Architecture" (how work is structured step by step).

### 2. Confidence Numeric Scoring Initially Skipped

Build-explore's Hybrid Classification Heuristic includes numeric confidence scores (0-1) alongside qualitative labels (Confident/Likely/Unclear). The initial TDD distillation did not include this numeric scoring for assumptions -- it used qualitative labels only. Captain noticed and asked for numeric scores to be added.

**Impact**: Skipped a high-value signal. The numeric score gives the captain a quantitative sense of assumption risk before batch-confirming. With formal build-distill Step 5 (semi-interactive entity drafting), the captain sees each gap and the scoring system, preventing this omission.

### 3. No Formal Comparison Dimensions

The distillation was narrative: "Superpowers TDD does X; build pipeline does Y; gap is Z." There was no structured framework asking "how do these compare on Interaction Model, Context Strategy, Research Depth, Decision Locking, Verification Rigor, Execution Architecture, Audit Trail?"

**Impact**: The comparison was thorough in some areas (TDD mechanics) and thin in others (how Superpowers TDD's audit trail of test outputs could inform build pipeline's Stage Report). Structured dimensions ensure full coverage every time.

### 4. No Gap Scoring

Entity 067 identified one gap ("TDD discipline is missing") and one sub-gap ("acceptance criteria shape"). There was no scoring of gap severity (0-1), no threshold (>= 0.5 to create entity), and no ranking of multiple gaps.

**Impact**: For a single-gap distillation, this didn't matter. For multi-gap distillations (like the 5 GSD comparisons), ungrouped gaps produce a flat list where high-value and low-value gaps look identical. The formal scoring system routes captain attention to highest-value gaps first.

---

## Contrast: Ad-Hoc vs Formal Build-Distill

| Aspect | Entity 067 (ad-hoc) | Formal build-distill |
|--------|---------------------|----------------------|
| Gap identification | Captain intuition + SO exploration | 7 fixed dimensions applied to every comparison |
| Scoring | None | Qualitative bands (Low=0.25, Medium=0.5, High=0.75, Complete absence=1.0) |
| Entity creation threshold | None (every gap → entity) | >= 0.5 score + captain AskUserQuestion confirmation |
| Captain interaction | Unstructured Q&A | Semi-interactive Step 5 per qualifying gap |
| Audit trail | Entity file only | Separate comparison report in `_docs/distillations/` |
| Missed signals | O-1 misframe, numeric scoring | Caught by Dimension 1 (Interaction Model) + evidence requirement |
| Cross-run comparability | None (different every time) | Same 7 dimensions every run -- reports are comparable |

---

## Role as Exemplar

Entity 067 demonstrates:
1. **The value of ad-hoc distillation**: Real gaps are real. The TDD gap was genuine and entity 067 addressed it.
2. **The cost of ad-hoc distillation**: Framing errors and missed signals require captain corrections. Two corrections in one session (O-1 misframe + numeric scoring) motivated formalizing the process.
3. **What build-distill formalizes**: Not a replacement for captain intuition, but a structure that catches what intuition misses -- ensuring dimensions are covered, evidence is required, and signals aren't silently skipped.

Build-distill's first formal run (entity 068) covers 5 GSD skill pairs. Entity 067 would have been the output of `build-distill ~/.claude/skills/superpowers-test-driven-development/ skills/build-plan/` if the skill had existed at the time.

---

## Cross-Reference

- Entity 067 entity file: `docs/build-pipeline/_archive/build-flow-tdd-discipline.md`
- Build-distill skill: `skills/build-distill/SKILL.md`
- First formal run entity: `docs/build-pipeline/build-distill-skill-and-gsd-comparison.md` (entity 068)
- Comparison reports for first formal run: `docs/build-pipeline/_docs/distillations/gsd-*.md`
