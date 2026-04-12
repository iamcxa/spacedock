---
id: 067
title: Build Flow TDD Discipline -- Distill superpowers:test-driven-development into Plan + Execute
status: draft
context_status: pending
source: captain
created: 2026-04-12T17:30:00+08:00
started:
completed:
verdict:
score: 0.75
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

Distill `superpowers:test-driven-development` discipline into the build pipeline's plan and execute stages. The pre-pipeline entities (031-042, archived) explicitly followed red→green→refactor via Superpowers TDD skill, but that discipline evaporated during the pipeline distillation — zero mentions of TDD, test-first, or red→green exist in any `skills/build-*/SKILL.md` today.

### The Gap

Current testing in the pipeline is structural and post-hoc:
- **build-plan**: Wave 0 reserves a slot for "test infrastructure" (Nyquist 6d), but individual tasks have no TDD flag or test-first ordering
- **task-execution**: Runs `acceptance_criteria` commands AFTER implementation — verification, not TDD
- **build-quality**: Full-project `bun test` / `tsc` / lint after ALL execution — too late for red→green

### Key Deliverables

1. **build-plan task schema extension**: Add optional `test_first: true` attribute to task schema. When set, plan-checker Nyquist 6d validates that the task's `action` describes writing the test BEFORE the implementation, and `acceptance_criteria` includes both the "verify test fails" and "verify test passes" steps.

2. **task-execution TDD mode**: When the dispatched task has `test_first: true`, task-executor follows a strict sub-cycle within Step 2 (Execute Action):
   - Write failing test → run test → verify RED (non-zero exit)
   - Implement → run test → verify GREEN (zero exit)
   - Optional refactor → run test → verify still GREEN
   If the test passes on the first run (before implementation), return `NEEDS_CONTEXT` with a finding — the test doesn't actually test anything.

3. **build-plan intelligence**: Plan orchestrator should recommend `test_first: true` for tasks that create new functions, endpoints, or behavior (not for config, docs, or pure refactoring). Plan-checker dimension 6d should flag tasks with `test_first: true` that lack test files in `files_modified`.

4. **build-brainstorm acceptance criteria shape** (optional): Enhance acceptance criteria generation to prefer given/when/then or arrange/act/assert patterns that naturally translate to test-first tasks in build-plan.

### Constraints

- Do NOT modify `superpowers:test-driven-development` itself — that skill remains the standalone Superpowers version
- Changes are additive to existing task schema — `test_first` is optional, default false, backward compatible
- Entity stops at clarify (same bootstrap recursion as entities 061 and 066 — captain bridges to writing-plans for execution)

### Context

- Archived TDD examples: `docs/build-pipeline/_archive/dashboard-dependency-graph.md` (Tasks 1-2 TDD), `_archive/observability-integration.md` (all 8 tasks TDD)
- Current task schema: `skills/build-plan/SKILL.md` step 4 (lines 145-176)
- Current task-execution: `skills/task-execution/SKILL.md` steps 1-7
- Plan-checker Nyquist dim: `skills/build-plan/references/plan-checker-prompt.md` dimension 6
- Superpowers TDD skill: available via `Skill: "superpowers:test-driven-development"`

## Captain Context Snapshot

- **Repo**: main @ 5ed401f (spacedock)
- **Session**: SO triage session — captain identified that GSD + Superpowers → build-flow distillation is incomplete on the TDD axis. Spec and plan sides well-distilled (Phase D + E). Execution-side TDD is the open seam.
- **Domain**: Runnable / Invokable (skill enhancement), Readable / Textual (SKILL.md contract edits), Organizational / Data-transforming (task schema extension)
- **Scope flag**: ⚠️ likely-decomposable
- **Related entities**:
  - 061 -- Phase E Plan 2 (stale — build-plan/build-research shipped outside pipeline)
  - 065 -- Flatten Dispatch Troops Architecture (draft — concurrent; troops would execute TDD-flagged tasks)
  - 066 -- Overhaul Skill Implementation (draft — concurrent; no overlap)
- **Reference docs read**: skills/build-plan/SKILL.md (step 4 task schema), skills/task-execution/SKILL.md (steps 2-3), skills/build-plan/references/plan-checker-prompt.md (dimensions 6a-6d), docs/build-pipeline/_archive/dashboard-dependency-graph.md (TDD exemplar), docs/build-pipeline/_archive/observability-integration.md (TDD exemplar)
- **Created**: 2026-04-12T17:30:00+08:00

## Brainstorming Spec

**APPROACH**: Add an optional `test_first: true` boolean to the build-plan task schema. When a task carries this flag, three pipeline touchpoints activate: (1) **build-plan Step 4** generates the task's `action` as a red→green cycle — "write failing test for {behavior}, verify test fails, implement {behavior}, verify test passes" — and its `acceptance_criteria` includes both a failure-phase command (`bun test {file}` expected to exit non-zero before implementation) and a success-phase command (same command expected to exit zero after implementation); (2) **task-execution Step 2** splits into a 3-phase sub-cycle when `test_first: true` — RED (write test file, run acceptance_criteria failure command, assert non-zero exit), GREEN (implement the code, run acceptance_criteria success command, assert zero exit), optional REFACTOR (edit, re-run, assert still zero) — if the test passes on the first RED run (before implementation), the task returns `NEEDS_CONTEXT` with a `vacuous_test` finding because the test doesn't actually test anything; (3) **plan-checker dimension 6d** is extended with a `test_first` validation sub-rule: any task with `test_first: true` must have at least one test file in `files_modified`, and its `acceptance_criteria` must include both a RED-phase and GREEN-phase verification command. Additionally, build-plan's topic extraction heuristic (Step 4) recommends `test_first: true` for tasks that create new functions, endpoints, handlers, or behavioral logic — but NOT for config changes, documentation, pure refactoring, infrastructure setup, or tasks where the behavior is already covered by an existing test.

**ALTERNATIVE**: Make TDD the default execution mode for all non-trivial tasks — build-plan auto-classifies tasks into TDD vs non-TDD based on `files_modified` patterns (any task touching `*.test.*` files alongside implementation files is auto-TDD), with no explicit opt-in flag needed. -- D-01 Rejected because many tasks legitimately modify test files without following TDD rhythm (updating snapshots, fixing flaky tests, adding regression tests after a bug is already fixed). Auto-classification by file pattern produces false positives that force meaningless red→green ceremonies on tasks where the test was written after understanding the fix. The opt-in flag preserves plan-author intent — the plan orchestrator decides TDD applicability with full plan-level context, not a file-pattern heuristic with task-local visibility.

**GUARDRAILS**:
- `test_first` is optional, default `false` — fully backward compatible with every existing plan and task. No plan that omits the flag changes behavior.
- Do NOT modify `superpowers:test-driven-development` itself — that skill remains the standalone Superpowers version for use outside the build pipeline.
- Entity stops at clarify (same bootstrap recursion as entities 061 and 066 — captain bridges to writing-plans for execution structure since the very skills being enhanced are the ones that would plan/execute the enhancement).
- Task-execution's RED→GREEN sub-cycle must maintain the existing scope discipline (`files_modified` is the writable boundary) and acceptance_criteria discipline (no skipping commands). The TDD sub-cycle adds phases within Step 2 but does not expand permissions.
- Plan-checker 6d extension must be additive — existing 6d behavior (Wave 0 completeness for `<automated>MISSING</automated>` references) is unchanged; the `test_first` validation is a new sub-rule alongside it.

**RATIONALE**: The opt-in flag approach preserves the pipeline's current strengths (flexible task types, clean schema, no ceremony for config/doc tasks) while adding a structured TDD path that the plan orchestrator recommends for behavior-creating tasks. This mirrors how the pre-pipeline archived entities (031-042) used TDD — deliberately, per-task, for behavior creation — without the overhead of forcing it on every task type. The plan-checker validation ensures TDD discipline isn't advisory — it's enforced at the plan gate, just as Nyquist 6a-6c enforce verification presence today. The `vacuous_test` detection (test passes before implementation) is the critical safety net: it catches the most common TDD antipattern where a test is written to pass from the start, defeating the purpose of red→green. Journal entries confirm TDD "caught real bugs" when applied deliberately (2026-03-04 session) and was "one of the most architecturally significant" patterns (2026-03-27 session) — the value is proven; the gap is purely that the pipeline doesn't encode it.

## Acceptance Criteria

- `skills/build-plan/SKILL.md` task schema section includes `test_first` as an optional boolean attribute with documentation of when to recommend it. (how to verify: `grep -n "test_first" skills/build-plan/SKILL.md` returns ≥2 matches — one in schema definition, one in recommendation heuristic)
- `skills/task-execution/SKILL.md` Step 2 describes the RED→GREEN→REFACTOR sub-cycle activated by `test_first: true`, including the vacuous-test detection (test passes before implementation → `NEEDS_CONTEXT`). (how to verify: `grep -c "test_first\|RED.*GREEN\|vacuous" skills/task-execution/SKILL.md` returns ≥3)
- `skills/build-plan/references/plan-checker-prompt.md` dimension 6d includes a `test_first` validation sub-rule that checks for test files in `files_modified` and dual-phase acceptance_criteria. (how to verify: `grep -A 5 "test_first" skills/build-plan/references/plan-checker-prompt.md` returns the sub-rule text within the 6d section)
- Pressure test fixtures exist: `tests/pressure/build-tdd-*.yaml` (≥3 scenarios) covering: (a) task with `test_first: true` and missing test file in `files_modified` → plan-checker blocker; (b) task with `test_first: true` where RED phase passes → `vacuous_test` NEEDS_CONTEXT; (c) task with `test_first: false` (or omitted) → unchanged behavior, no TDD sub-cycle. (how to verify: `ls tests/pressure/build-tdd-*.yaml` returns ≥3 files; each parses with `python3 -c "import yaml; yaml.safe_load(open(f))"` without error)

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
