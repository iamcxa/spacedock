---
id: 068
title: Build-Distill Skill -- Systematic External Pattern Absorption + GSD First Pass
status: draft
context_status: pending
source: captain
created: 2026-04-12T18:30:00+08:00
started:
completed:
verdict:
score: 0.70
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

- **Repo**: main @ 7d5abad (spacedock)
- **Session**: SO triage session — captain completed 067 (TDD) clarify, now wants to formalize the distillation process itself as a repeatable skill, with GSD as the first comparison target.
- **Domain**: Runnable / Invokable (new skill creation), Readable / Textual (SKILL.md + comparison reports), Organizational / Data-transforming (entity drafting from gap analysis)
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**:
  - 067 -- Build Flow TDD Discipline (clarify/ready — exemplar of ad-hoc distillation)
  - 061 -- Phase E Plan 2 (stale — build-plan/build-research, prior distillation)
  - 066 -- Overhaul Skill Implementation (draft — concurrent, no overlap)
- **Reference docs read**: GSD skills (discuss-phase 70 lines, research-phase 196 lines, plan-phase 53 lines, new-project 47 lines, new-milestone 45 lines, execute-phase 64 lines, verify-work 39 lines); all build-* skills read in entity 067 session
- **GSD architectural pattern**: Thin orchestrators (39-196 lines) delegating to workflow files + subagents, zero inline reference docs. Build flow: thick contracts (200-400 lines) with No-Exceptions blocks and inline references.
- **Created**: 2026-04-12T18:30:00+08:00

## Brainstorming Spec

**APPROACH**: Create `skills/build-distill/SKILL.md` as a non-interactive comparison skill (same interaction class as build-brainstorm — reads, analyzes, outputs). The skill takes two arguments: `source` (external skill path or name) and `target` (build-* skill path). It executes a 6-step process: (1) **Source Read** — dispatch a `spacedock:code-explorer` subagent on the source skill directory to map its SKILL.md, references, workflow files, and dispatched subagent definitions; (2) **Target Read** — dispatch a second code-explorer on the build-* target with the same mapping template; (3) **Dimensional Comparison** — compare across 7 dimensions: Interaction Model (interactive vs non-interactive), Context Strategy (how prior context is loaded), Research Depth (sources, subagent delegation, fresh-context isolation), Decision Locking (how decisions persist for downstream), Verification Rigor (plan-checker dimensions, iteration caps), Execution Architecture (wave-parallel, subagent dispatch model), and Audit Trail (what institutional memory is produced); (4) **Gap Scoring** — each dimension gets a score: 0.0 = build flow is equivalent or stronger, 0.5 = meaningful gap, 1.0 = complete absence in build flow. Score factors: frequency of use (how often the captain invokes this capability), downstream effect (how many stages depend on this), and captain pain points (journal evidence of friction); (5) **Entity Drafting** — for each gap ≥ 0.5, produce a draft entity with Directive, Captain Context Snapshot, and 2+ Acceptance Criteria, following the same format as entity 067; (6) **Audit Report** — write `docs/build-pipeline/_docs/distillations/{source}-vs-{target}.md` with the full dimensional comparison table, gap scores, and entity draft references. For the GSD first pass, run the skill 5 times (one per comparison pair in the Directive table) and aggregate results into a summary report.

**ALTERNATIVE**: Instead of a formal skill, maintain a comparison template as a reference doc (`references/distillation-template.md`) that the captain or SO follows manually during ad-hoc distillation sessions like entity 067. -- D-01 Rejected because the captain explicitly asked for a skill ("這個過程要有意識記錄下來作為一個新的 skill"), and the 067 experience showed that ad-hoc distillation misses structural comparisons (the O-1 RED/GREEN misframe would have been caught by a "compare interaction models" dimension). A template is better than nothing but lacks the repeatable execution and structured output that makes comparisons comparable across runs.

**GUARDRAILS**:
- Do NOT modify external skills (GSD, Superpowers) — build-distill is read-only on sources.
- Comparison reports are additive documentation — no code changes to existing build-* skills. Entity drafts from gap analysis are PROPOSALS; they enter the pipeline at `status: draft` and go through normal brainstorm→explore→clarify before any code is touched.
- The 7 comparison dimensions are the skill's core value — they must be explicitly defined in a reference doc (`skills/build-distill/references/comparison-dimensions.md`) so future runs use the same axes, not ad-hoc criteria.
- Entity stops at clarify (bootstrap recursion — same pattern as 067 and 066).
- Gap scores must cite evidence (journal entries, codebase patterns, captain feedback) — no subjective "feels like a gap" scoring. If no evidence exists for a dimension, score 0.0 with "no evidence of gap".

**RATIONALE**: The formal skill approach ensures consistency across distillation runs and builds institutional memory. Each comparison report becomes a dated artifact showing what was compared, what was found, and what entities were produced — this is the "evolution audit trail" the captain requested. The 7 dimensions are derived from the structural differences observed between GSD and build flow during this session: GSD's thin-orchestrator model, fresh-context subagent delegation, --auto/--chain/--power modes, and conversational UAT are all capabilities that map to specific dimensions. Scoring with evidence prevents opinion-driven distillation and grounds every entity draft in observable gaps. The code-explorer dispatch for source/target reading ensures the comparison starts from the same structured file mapping that build-explore uses, keeping the distillation compatible with the pipeline's existing information architecture.

## Acceptance Criteria

- `skills/build-distill/SKILL.md` exists with the 6-step process documented and at least one reference doc (`references/comparison-dimensions.md` defining the 7 dimensions). (how to verify: `test -f skills/build-distill/SKILL.md && test -f skills/build-distill/references/comparison-dimensions.md`)
- At least one GSD comparison report exists under `docs/build-pipeline/_docs/distillations/` with the full dimensional comparison table and numeric gap scores. (how to verify: `ls docs/build-pipeline/_docs/distillations/gsd-*.md` returns ≥1 file; `grep -c "Score:" {file}` returns ≥7 matching the 7 dimensions)
- The GSD first pass produces ≥3 draft entities in `docs/build-pipeline/` with `source: build-distill` in their frontmatter, each targeting a gap scored ≥0.5. (how to verify: `grep -rl "source: build-distill" docs/build-pipeline/*.md` returns ≥3 files)
- Entity 067 (TDD discipline) is retroactively documented in a distillation report as the "pre-skill exemplar" — showing what an ad-hoc distillation looks like vs what the skill produces. (how to verify: `grep "067" docs/build-pipeline/_docs/distillations/*.md` returns ≥1 match)

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
