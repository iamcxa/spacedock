---
id: 068
title: Build-Distill Skill -- Systematic External Pattern Absorption + GSD First Pass
status: draft
context_status:
source: captain
created: 2026-04-12T18:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

Create the `build-distill` skill (`skills/build-distill/SKILL.md`) — a repeatable process for absorbing external system patterns into the build pipeline. Then execute its first pass: compare GSD's roadmap, research, plan, and discussion capabilities against the current build flow equivalents, identify gaps, and produce entity drafts for each significant gap.

### Why this skill exists

Entity 067 (TDD discipline) was an ad-hoc distillation — captain noticed a gap, SO explored, captain corrected framing by pointing back to Superpowers TDD. This worked but was unstructured: no formal comparison methodology, no gap scoring, no audit trail. The `build-distill` skill formalizes this process so every future distillation follows the same rigor.

### The skill's process

1. **Source Read**: Deep-read the external skill/approach (e.g., GSD discuss-phase SKILL.md, all reference docs, examples)
2. **Target Read**: Deep-read the build flow equivalent (e.g., build-clarify SKILL.md, all reference docs)
3. **Comparative Analysis**: Structured comparison across dimensions:
   - What source does that target doesn't (gaps)
   - What target does that source doesn't (unique strengths to preserve)
   - What both do differently (design divergences — deliberate vs accidental)
4. **Gap Scoring**: Each gap gets a numeric impact score (0-1) based on: frequency of use, downstream effect, captain pain points
5. **Entity Drafting**: For each gap scoring ≥0.5, draft a distillation entity with directive, context, and acceptance criteria
6. **Audit Trail**: Write comparison report to `docs/build-pipeline/_docs/distillations/{source}-vs-{target}.md` for institutional memory

### First pass: GSD → Build Flow

Compare these GSD capabilities against their build flow counterparts:

| GSD Capability | Build Flow Equivalent | Expected Gap Areas |
|---|---|---|
| `discuss-phase` (adaptive questioning, --auto, --chain, --power modes) | `build-clarify` (AskUserQuestion loop) | Question generation intelligence, auto-mode, power-mode bulk |
| `research-phase` (deep research before planning) | `build-research` (parallel researcher subagents) | Research depth, source diversity, synthesis quality |
| `plan-phase` (PLAN.md with verification loop) | `build-plan` (opus orchestrator + plan-checker) | Plan structure, verification dimensions, iteration quality |
| `roadmap` / `new-milestone` (multi-phase project planning) | No equivalent | Complete gap — build flow is single-entity, no multi-entity orchestration |
| `discuss-phase` assumptions/options/questions model | `build-explore` (hybrid classification) | Classification heuristic quality, gray area template coverage |

### Constraints

- The skill itself is a NEW file (`skills/build-distill/SKILL.md` + references)
- The GSD comparison reports are NEW files under `docs/build-pipeline/_docs/distillations/`
- Entity drafts produced by the first pass become real entities in the pipeline (sibling to 067)
- Entity stops at clarify (bootstrap recursion — build-distill needs build-plan to plan it, but build-plan doesn't exist for skills yet in this meta sense)

### Context

- Entity 067 as exemplar of ad-hoc distillation (TDD)
- GSD skills: `~/.claude/plugins/cache/gsd-marketplace/` (discuss-phase, plan-phase, research-phase, etc.)
- Current build-* skills: `skills/build-brainstorm/`, `skills/build-explore/`, `skills/build-clarify/`, `skills/build-plan/`, `skills/build-execute/`, etc.
- Captain's framing: "取得別人的長處與目前的比較，強化我們自己的"

## Captain Context Snapshot

- **Repo**: main @ 9a9fe41 (spacedock)
- **Session**: SO triage session — captain completed 067 (TDD) clarify, now wants to formalize the distillation process itself as a repeatable skill, with GSD as the first comparison target.
- **Domain**: Runnable / Invokable (new skill creation), Readable / Textual (SKILL.md + comparison reports), Organizational / Data-transforming (entity drafting from gap analysis)
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**:
  - 067 -- Build Flow TDD Discipline (clarify/ready — exemplar of ad-hoc distillation)
  - 061 -- Phase E Plan 2 (stale — build-plan/build-research, prior distillation)
  - 066 -- Overhaul Skill Implementation (draft — concurrent, no overlap)
- **Created**: 2026-04-12T18:30:00+08:00

## Brainstorming Spec

(brainstorm stage will populate)

## Acceptance Criteria

(brainstorm stage will populate)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
