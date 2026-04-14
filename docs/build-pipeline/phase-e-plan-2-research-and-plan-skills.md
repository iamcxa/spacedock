---
id: 061
title: Phase E Plan 2 -- build-research + build-plan Skills
status: clarify
context_status: ready
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

**APPROACH**: Create two new skills under `skills/build-research/SKILL.md` and `skills/build-plan/SKILL.md` (⚠ contradicted: both files already exist with full implementations, created during Phase E Plan 2 execution per git commits e375ec7, 98bf2e2 -- see Q-1), following Phase D conventions for build-* skills. **build-plan** is the plan-stage orchestrator (opus): reads the clarified entity body → identifies research topics across 5 domains → dispatches N parallel `researcher` subagents (each running build-research) → synthesizes findings into a `## Research Findings` section → writes structured `## PLAN`, `## UAT Spec`, `## Validation Map` sections → self-reviews → dispatches an inline plan-checker subagent (general-purpose, sonnet) for 7-dimension verification (✓ confirmed by explore: now 8 dimensions per entity 083 upgrade, skills/build-plan/SKILL.md:315-323) → revises up to 3 iterations → **on plan approval, calls `workflow-index append` for each file in PLAN's `files_modified` list with `stage: plan`, `status: planned`** (closes the Case B band-aid). (✓ confirmed by explore: skills/build-plan/SKILL.md:410-446, unconditional Step 9a with No-Exceptions block) **build-research** is the subroutine skill loaded by the `researcher` agent: takes a single research topic, executes Read/Grep/Glob/WebFetch/WebSearch/Context7 investigation, returns structured findings with citations. The Plan 2 entity itself **stops at clarify stage** because executing the plan stage requires the very skill we are building — captain takes the clarify Stage Report directly to `superpowers:writing-plans` for the implementation plan structure, then runs subagent-driven-development per Phase E Plan 1 conventions. (✓ resolved by explore: namespace settled at `skills/build-*` under `spacedock:` namespace, migration to `spacebridge:` deferred to entity 050. Evidence: agents/researcher.md:20, skills/build-plan/SKILL.md:12, git commit 15772ac)

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

## Assumptions

A-1: Skills `build-research` and `build-plan` already exist with full implementations matching spec requirements.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-research/SKILL.md:1-200` -- 6-step research subroutine with 5-domain output structure; `skills/build-plan/SKILL.md:1-530` -- 9-step plan orchestrator with workflow-index append, plan-checker, revision loop
→ Confirmed: captain, 2026-04-14 (batch)

A-2: The `agents/researcher.md` wrapper correctly loads the `build-research` skill as a leaf agent.
Confidence: 🟢 Confident (0.95)
Evidence: `agents/researcher.md:7` -- `skills: ["spacedock:build-research"]`; agent description matches spec for fresh-context research vessel
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Workflow-index append is unconditionally integrated at plan approval (Step 9a) with No-Exceptions enforcement.
Confidence: 🟢 Confident (0.95)
Evidence: `skills/build-plan/SKILL.md:410-446` -- dedicated Step 9a section titled "unconditional, before commit" with No-Exceptions rationale block citing `workflow-index-lifecycle-gap.md` memory
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Plan-checker covers 8 dimensions (expanded from spec's original 7 by entity 083), dispatched as `Agent(subagent_type="general-purpose", model="sonnet")`.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-plan/SKILL.md:315-323` -- 8 dimensions listed (Requirement Coverage, Task Completeness, Dependency Correctness, Context Compliance, Research Coverage, Validation Sampling, Cross-Entity Coherence, Type/Test Coverage); `skills/build-plan/SKILL.md:301` -- `subagent_type="general-purpose"`
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Namespace is settled: `skills/build-*` under `spacedock:` namespace, migration to `spacebridge:` deferred to entity 050.
Confidence: 🟢 Confident (0.95)
Evidence: `agents/researcher.md:20` -- "Namespace migration to spacebridge:researcher happens when spacebridge plugin skeleton is created (entity 050)"; `skills/build-plan/SKILL.md:12` -- same deferral; git commit `15772ac fix(phase-e-plan-2): spacebridge:* -> spacedock:* namespace sweep`
→ Confirmed: captain, 2026-04-14 (batch)

A-6: AC3's grep verification command (`grep -c "Dimension [1-7]"`) is stale -- the actual format uses a numbered list ("1. Requirement Coverage" etc.), not "Dimension N" strings. Verification intent is met but literal grep fails.
Confidence: 🟢 Confident (0.90)
Evidence: `skills/build-plan/SKILL.md:315-323` -- uses format `1. Requirement Coverage -- ...`, not `Dimension 1: ...`
→ Confirmed: captain, 2026-04-14 (batch)

A-7: AC1 and AC3 grep verification commands are stale but should NOT be modified in the AC text. Stale commands and correct alternatives documented in Stage Report: clarify instead.
Confidence: 🟢 Confident (0.95)
Evidence: AC1 `grep "^##? (Inputs|Process|Output)"` returns 0 (actual: `## Input Contract`, `## Step N`); AC3 `grep "Dimension [1-7]"` returns 0 (actual: `1. Requirement Coverage`)
→ Confirmed: captain, 2026-04-14 (interactive)

## Option Comparisons

### O-1: Pressure test coverage gap closure

AC4 requires `build-research-*.yaml` (≥3 scenarios) and `build-plan-*.yaml` (≥3 scenarios). Current state: 1 `build-research.yaml` (no suffix, doesn't match `build-research-*` glob), 2 files matching `build-plan-*` glob + 1 `build-plan.yaml` (no suffix). Total build-* pressure coverage: 19 files across the test suite.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Relax AC4 to match existing naming convention | Acknowledges naming evolved during execution; 19 build-* pressure tests provide comprehensive coverage already | AC4 text no longer matches its own grep verification commands | Low | Recommended |
| Create missing fixtures to match AC4 exactly | Fully satisfies original AC as written; adds explicit edge case coverage for build-research | Creates ceremony for existing coverage; test suite already exercises these paths | Low | Viable |

→ Selected: Relax AC4 to match existing naming convention (captain, 2026-04-14, interactive)

## Open Questions

Q-1: Entity 061's primary deliverables (build-research SKILL, build-plan SKILL, researcher agent) already exist in the codebase, fully implemented during Phase E Plan 2 execution (git: `e375ec7`, `98bf2e2`, `15772ac`). The entity is still at `context_status: pending`. How should the entity lifecycle be handled?

Domain: Organizational/Data-transforming
Why it matters: The APPROACH says "Create two new skills" but both already exist. Clarify needs to decide whether to (a) verify ACs against existing code, annotate gaps, and fast-track to ready, or (b) archive the entity as pre-shipped. AC5 requires the entity to reach `status: clarify` / `context_status: ready`, which is achievable via fast-track verification. The pressure test gap (O-1) and stale AC3 grep command (A-6) are the only remaining deltas between current state and full AC satisfaction.
Suggested options: (a) Fast-track -- verify ACs against existing code, resolve O-1, update stale AC3 grep, advance to ready; (b) Archive as pre-shipped -- mark entity as completed with annotation that deliverables were shipped via Phase E Plan 2 commits

→ Answer: Fast-track -- verify ACs against existing code, annotate gaps, advance to ready (captain, 2026-04-14, interactive)

Q-2: Entity 092 (plan-file-separation) has `depends-on: [061]`. Once 061 reaches `context_status: ready`, is 092's dependency satisfied and ready for FO plan dispatch?

Domain: Organizational/Data-transforming
Why it matters: 092 was blocked waiting for 061's design decisions (plan output target, namespace, skill structure). With 061's fast-track confirmation, all relevant decisions are locked: build-plan exists at `skills/build-plan/`, outputs to entity body, namespace is `spacedock:`.
Suggested options: (a) Dependency satisfied -- 092 can proceed to plan; (b) Additional coordination needed

→ Answer: Dependency satisfied -- 092 can proceed to plan (captain, 2026-04-14, interactive)

## Decomposition Recommendation

Not warranted. 11 files across 4 layers (skill, agent, test, index) with all primary deliverables already implemented. Remaining work is documentation/verification, not implementation.

## Canonical References

- `docs/build-pipeline/plan-file-separation-executor-context.md` (entity 092) -- depends-on 061, dependency satisfied per Q-2
- `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` -- Phase E spec, authoritative source for skill design (sections 5-6, skill matrix lines 458-512)

## Stage Report: explore

- [x] Files mapped: 11 across skill, agent, test, index
  skill: 3 files (build-research SKILL + build-plan SKILL + plan-checker-prompt), agent: 1 (researcher.md), test: 4 (build-research + build-plan pressure tests), index: 2 (CONTRACTS.md + INDEX.md), entity: 1
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 through A-6 all Confident (0.90-0.95) via direct file read and git history
- [x] Options surfaced: 1
  O-1 pressure test coverage gap closure strategy
- [x] Questions generated: 1
  Q-1 entity lifecycle disposition (deliverables already exist)
- [x] α markers resolved: 1 / 1
  α-1 (namespace placement) resolved: spacedock:*, defer to entity 050
- [x] Scale assessment: Medium confirmed
  11 files matches Medium range (5-15); no revision needed
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident, no external tech claims)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, explore determined "Not warranted"
- [x] Re-validation: 7 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence fresh (written in same session as explore)
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1 through A-6 confirmed via batch; A-7 confirmed interactive (stale AC grep commands)
- [x] Options selected: 1 / 1
  O-1 Pressure test gap -- Relax AC4 to match existing naming convention (recommended)
- [x] Questions answered: 2 / 2
  Q-1 fast-track to ready (deliverables pre-shipped); Q-2 entity 092 dependency satisfied
- [x] Open exploration: 1 gray area surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 1 via captain selection)
  AC verification command staleness (A-7); entity 092 dependency (Q-2)
- [x] Canonical refs added: 2
  entity 092 plan-file-separation; Phase E spec (sections 5-6)
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 061" to advance
- [x] Clarify duration: 5 questions asked, session complete
  1 batch confirmation + 2 option/Q AskUserQuestion + 2 exploration iterations

### Stale AC Verification Commands (per A-7)

AC1 original: `grep -E "^##? (Inputs|Process|Output)" skills/build-research/SKILL.md` → returns 0
AC1 correct: `grep -E "^## (Input Contract|Step [0-9]|Output)" skills/build-research/SKILL.md` → returns ≥3

AC3 original: `grep -c "Dimension [1-7]" skills/build-plan/SKILL.md` → returns 0
AC3 correct: `grep -cE "^[0-9]+\. " skills/build-plan/SKILL.md` within the Plan-Checker Dimensions section → returns 8

AC4 original: `ls tests/pressure/build-research-*.yaml` → returns 0
AC4 relaxed: `ls tests/pressure/build-research*.yaml` → returns 1 (`build-research.yaml`)

### Namespace Decision (per AC6)

Skills land at `skills/build-*` matching current pattern (defer spacebridge migration to Phase F per spec line 74, entity 050). Evidence: git commit `15772ac fix(phase-e-plan-2): spacebridge:* -> spacedock:* namespace sweep`.
