---
id: 061
title: Phase E Plan 2 -- build-research + build-plan Skills
status: draft
context_status: pending
source: /build
created: 2026-04-11T04:12:22Z
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

> Phase E Plan 2: implement build-research + build-plan skills per docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md sections 5 and 6. The plan must stop the entity at clarify stage (do NOT advance to plan stage); captain takes the clarify Stage Report to superpowers:writing-plans for execution structure. CRITICAL constraint per workflow-index-lifecycle-gap.md memory: the new build-plan skill MUST call `workflow-index append` on plan approval to create CONTRACTS.md rows at the earliest correct point — this closes the Case B band-aid in workflow-index-maintainer mod. Workflow dir: docs/build-pipeline/. Project: spacedock. Branch: phase-e/plan-1-foundation @ e7b8fcf.

## Captain Context Snapshot

- **Repo**: phase-e/plan-1-foundation @ e7b8fcf (spacedock)
- **Session**: Plan 1 quality 补洞 just shipped (6 commits) — workflow-index, knowledge-capture, FO step 3.6, and skill-creator trigger eval all GREEN; tests/pressure/ YAML suite preserved; captain directed: stop fixating on testing infra, advance Phase E.
- **Domain**: Runnable / Invokable (new skills), Readable / Textual (SKILL.md + references docs), Organizational / Data-transforming (changes pipeline stage skill registry + workflow-index call sites)
- **Related entities**:
  - `entity-body-rendering-hotfixes` (status: clarify) — Phase D dogfood, untouched per spec §Current State
  - `spacedock-plugin-architecture-v2` (status: draft) — relates to namespace decision
- **Reference docs read**: docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md (sections 5-6 + skill matrix at lines 458-512)
- **Created**: 2026-04-11T04:12:22Z

## Brainstorming Spec

**APPROACH**: Create two new skills under `skills/build-research/SKILL.md` and `skills/build-plan/SKILL.md`, following Phase D conventions for build-* skills. **build-plan** is the plan-stage orchestrator (opus): reads the clarified entity body → identifies research topics across 5 domains → dispatches N parallel `researcher` subagents (each running build-research) → synthesizes findings into a `## Research Findings` section → writes structured `## PLAN`, `## UAT Spec`, `## Validation Map` sections → self-reviews → dispatches an inline plan-checker subagent (general-purpose, sonnet) for 7-dimension verification → revises up to 3 iterations → **on plan approval, calls `workflow-index append` for each file in PLAN's `files_modified` list with `stage: plan`, `status: planned`** (closes the Case B band-aid). **build-research** is the subroutine skill loaded by the `researcher` agent: takes a single research topic, executes Read/Grep/Glob/WebFetch/WebSearch/Context7 investigation, returns structured findings with citations. The Plan 2 entity itself **stops at clarify stage** because executing the plan stage requires the very skill we are building — captain takes the clarify Stage Report directly to `superpowers:writing-plans` for the implementation plan structure, then runs subagent-driven-development per Phase E Plan 1 conventions. (Namespace placement: skills land in `skills/build-*` matching the existing pattern, OR in a new `spacebridge` plugin per spec §New Skills line 53 — needs clarification -- deferred to explore. Spec internally contradicts itself: line 44 says "go straight into spacebridge:*", line 74 says namespace migration is Phase F work.)

**ALTERNATIVE**: Bundle build-research as an inline subroutine inside build-plan SKILL.md with no separate skill file and no separate `researcher` agent. The plan orchestrator would do research itself (sequentially or by spawning generic Task() workers without a registered skill contract). -- D-01 Rejected because the spec explicitly defines build-research as a separate registered skill loaded by a separate `spacebridge:researcher` agent (spec lines 54, 57, 476, 496); the parallel-dispatch design depends on each researcher having a fresh context window per topic; and an inline-only approach would also defeat the per-task model dispatch (researchers run sonnet × N while plan orchestrator runs opus × 1).

**GUARDRAILS**:
- **CRITICAL — workflow-index append on plan approval**: build-plan MUST call `workflow-index append` for every file in the PLAN's `files_modified` list at the moment plan-checker emits an `approved` verdict. Use `stage: plan`, `status: planned`, and `intent` from the entity's first task summary. Without this, the Case B band-aid in `mods/workflow-index-maintainer.md` becomes permanent and Dim 7 cross-entity coherence degrades to ship-time-only granularity. (Source: `workflow-index-lifecycle-gap.md` memory + spec line 561 Dim 7.)
- **No edits to existing Discuss skills**: build-brainstorm, build-explore, build-clarify shipped in Phase D and are out of scope. Phase E is additive — only new files under `skills/build-research/`, `skills/build-plan/`, and a new `agents/researcher.md`.
- **Stop-at-clarify enforcement**: this entity must NOT advance past clarify stage. Captain bridges to writing-plans manually. Driven by `plan-generation-methodology.md` memory — same recursion-bootstrap rule that Plan 1 used.
- **Plan-write discipline (Task 0 mandatory)**: when captain hands the clarify Stage Report to writing-plans, the resulting plan MUST start with Task 0 — Environment Verification (mechanically verify file existence claims, namespace assumptions, current pipeline state). Per `plan-write-discipline.md` memory — directly motivated by Plan 1 Task 20's "spacedock is not a plugin" misdiagnosis.
- **Pressure tests for both skills**: extend `tests/pressure/` with `build-research-*.yaml` and `build-plan-*.yaml` fixtures (≥3 scenarios each, matching the YAML schema established in Plan 1 quality 补洞). DO NOT touch the framework GSD todo or convert YAML→JSON.

**RATIONALE**: This approach preserves the spec's mandated separation between the stage skill orchestrator (build-plan, opus, single instance per entity) and the research worker (build-research, sonnet, N parallel instances). The separation is what enables per-task model dispatch and parallel research with independent context windows — both load-bearing properties of Phase E's "lower cost" guiding principle. The inline alternative is cheaper to write but cannot deliver the parallel-dispatch design and would violate the spec's skill registration matrix. Stopping the dogfood entity at clarify is the only way to avoid the chicken-and-egg of needing build-plan to plan build-plan — `plan-generation-methodology.md` memory documents the writing-plans bridge as the explicit mechanism until `/evolve-workflow` exists. The workflow-index append constraint is the most important non-obvious requirement and is captured first in GUARDRAILS so that explore and clarify cannot lose it. Phase E Plan 1's pressure testing surfaced this as a hard prerequisite for Phase E's cross-entity coherence promise to actually function in steady state instead of degrading to retroactive Case B writes.

## Acceptance Criteria

- `skills/build-research/SKILL.md` exists and contains the required structured sections per spec §New Skills row for build-research (Inputs, Process, Output with citations). (how to verify: `Read skills/build-research/SKILL.md` then `grep -E "^##? (Inputs|Process|Output)" skills/build-research/SKILL.md` returns ≥3 matches)
- `skills/build-plan/SKILL.md` exists and contains at least one explicit `workflow-index append` invocation gated on plan-checker approval. (how to verify: `grep -nE "workflow-index.*append|append.*stage.*plan|stage:\s*plan" skills/build-plan/SKILL.md` returns ≥1 match AND that match is in the post-approval section, not in a comment or example block)
- `skills/build-plan/SKILL.md` contains the inline plan-checker prompt template covering all 7 dimensions defined in spec lines 546-571, dispatched via `Agent(subagent_type="general-purpose", model="sonnet")`. (how to verify: `grep -c "Dimension [1-7]" skills/build-plan/SKILL.md` returns ≥7 AND `grep "general-purpose" skills/build-plan/SKILL.md` returns ≥1 match)
- Pressure test fixtures exist: `tests/pressure/build-research-*.yaml` (≥3 scenarios) and `tests/pressure/build-plan-*.yaml` (≥3 scenarios), parseable as YAML. (how to verify: `ls tests/pressure/build-research-*.yaml tests/pressure/build-plan-*.yaml` returns ≥2 files; each parses with `python3 -c "import yaml; yaml.safe_load(open(f))"` without error; pressure scenarios cover the workflow-index append failure mode + the stop-at-approval-without-call mode + the namespace contradiction-detection mode)
- The Phase E Plan 2 entity itself reaches `status: clarify` / `context_status: ready` and is held there (does NOT advance to plan stage). (how to verify: read `docs/build-pipeline/phase-e-plan-2-research-and-plan-skills.md` frontmatter, assert `status: clarify` and `context_status: ready`, and confirm absence of `started:` timestamp for plan stage in any Stage Report appended to the entity body)
- Namespace decision is documented in the clarify Stage Report — either "skills land at `skills/build-*` matching current pattern (defer spacebridge migration to Phase F per spec line 74)" OR "create spacebridge plugin first as a Phase E dependency". (how to verify: `grep -A 3 "[Nn]amespace" docs/build-pipeline/phase-e-plan-2-research-and-plan-skills.md` returns at least one decision block in the Stage Report section)

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
