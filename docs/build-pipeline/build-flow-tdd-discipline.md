---
id: 067
title: Build Flow TDD Discipline -- Distill superpowers:test-driven-development into Plan + Execute
status: plan
context_status: ready
source: captain
created: 2026-04-12T17:30:00+08:00
started: 2026-04-12T22:00:00Z
completed:
verdict:
score: 0.75
worktree: .worktrees/spacedock-ensign-build-flow-tdd-discipline
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

**APPROACH**: Add an optional `test_first: true` boolean to the build-plan task schema. When a task carries this flag, three pipeline touchpoints activate: (1) **build-plan Step 4** generates the task's `action` as a red→green cycle — "write failing test for {behavior}, verify test fails, implement {behavior}, verify test passes" — and its `acceptance_criteria` includes both a failure-phase command (`bun test {file}` expected to exit non-zero before implementation) and a success-phase command (same command expected to exit zero after implementation); (2) **task-execution Step 2** splits into a 3-phase sub-cycle when `test_first: true` (✓ confirmed by explore: skills/task-execution/SKILL.md:61 -- Step 2 "Execute The Action" is a single-phase step today, extensible with conditional sub-phases without touching Step 3 verification) — RED (write test file, run acceptance_criteria failure command, assert non-zero exit), GREEN (implement the code, run acceptance_criteria success command, assert zero exit), optional REFACTOR (edit, re-run, assert still zero) — if the test passes on the first RED run (before implementation), the task returns `NEEDS_CONTEXT` with a `vacuous_test` finding because the test doesn't actually test anything; (3) **plan-checker dimension 6d** is extended with a `test_first` validation sub-rule (✓ confirmed by explore: skills/build-plan/references/plan-checker-prompt.md:88-90 -- 6d currently only validates `<automated>MISSING</automated>` Wave 0 matches; additive sub-rule is clean): any task with `test_first: true` must have at least one test file in `files_modified`, and its `acceptance_criteria` must include both a RED-phase and GREEN-phase verification command. Additionally, build-plan's topic extraction heuristic (Step 4) recommends `test_first: true` for tasks that create new functions, endpoints, handlers, or behavioral logic — but NOT for config changes, documentation, pure refactoring, infrastructure setup, or tasks where the behavior is already covered by an existing test.

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

## Assumptions

A-1: RED phase is validated by non-zero exit code from the test runner. Any non-zero exit (assertion failure, compile error, runtime error) counts as RED-verified. Only exit code 0 triggers vacuous_test detection.
Confidence: Confident (0.95)
Evidence: skills/task-execution/SKILL.md:73 -- "DONE when every acceptance_criteria command passes (exit 0 for commands)"; inverse (non-zero = fail) is the standard test runner contract used consistently across task-execution Step 3 and build-execute Step 4b.
→ Confirmed: captain, 2026-04-12 (batch)

A-2: `test_first` is troops-agnostic -- the flag is a task schema attribute consumed by whatever executes the task (task-executor today, troops per entity 065 tomorrow). No dispatch-layer changes needed.
Confidence: Confident (0.85)
Evidence: skills/task-execution/SKILL.md:36 -- Input Contract defines the task block shape independently of dispatch mechanism; agents/task-executor.md:1 loads the skill by flat path regardless of how FO dispatched it.
→ Confirmed: captain, 2026-04-12 (batch)

A-3: REFACTOR phase is bounded by the same `files_modified` scope discipline. Task-executor may restructure code within `files_modified` after GREEN, then re-run GREEN-phase acceptance_criteria to verify no regression. No new permissions or scope expansion.
Confidence: Confident (0.95)
Evidence: skills/task-execution/SKILL.md:101-137 -- "Scope Discipline -- files_modified Is The Writable Boundary" No-Exceptions block applies to all edits including refactor; no carve-out for post-GREEN changes.
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Existing plans without `test_first` are treated as `test_first: false` -- no migration needed. The attribute is optional with default `false`, matching the existing pattern for `serial` (optional boolean, default false).
Confidence: Confident (0.90)
Evidence: skills/build-plan/SKILL.md:174 -- "`serial`: optional boolean, forces serial execution even when overlap-free"; same optional-boolean-default-false pattern for additive schema attributes.
→ Confirmed: captain, 2026-04-12 (batch)

A-5: New pressure test fixtures follow the existing YAML schema established in `tests/pressure/` (18 existing fixtures). Schema fields: `skill`, `target_path`, `captured`, `session`, `test_cases[]` with `id`, `summary`, `pressure[]`, `options`, `expected_answer`, `correct_because`.
Confidence: Confident (0.95)
Evidence: tests/pressure/README.md:48 -- schema definition; tests/pressure/task-execution.yaml:14 -- 3 scenarios as exemplar of the format.
→ Confirmed: captain, 2026-04-12 (batch)

## Option Comparisons

### RED/GREEN command differentiation in acceptance_criteria

How does plan-checker and task-execution distinguish which `acceptance_criteria` commands are RED-phase (expected to fail before implementation) vs GREEN-phase (expected to pass after implementation)?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Ordering convention: RED commands first, GREEN commands second, separated by a `# ---` comment delimiter | Simple, no schema change to acceptance_criteria format; plan-checker can validate by counting sections; task-execution splits on delimiter | Fragile if plan-writer forgets delimiter; ambiguous when a task has only GREEN commands (non-TDD task) | Low | Recommended |
| Separate fields: `red_criteria` and `green_criteria` as sibling XML tags alongside `acceptance_criteria` | Explicit, no ambiguity; plan-checker validates field presence directly; task-execution reads two distinct fields | Schema change is larger (2 new fields instead of 1 flag); every downstream consumer (build-execute, plan-checker, task-execution) must be updated to parse new fields; breaks the "single flat list" contract that acceptance_criteria discipline relies on | High | Not recommended |
| Inline markers: prefix each command with `[RED]` or `[GREEN]` | Flexible ordering; works within existing flat list; easy to grep | Markers pollute the command string (must be stripped before execution); introduces a parsing step in task-execution that doesn't exist today | Medium | Viable |

→ Selected: Other -- All three options rejected. The question itself was misframed: RED/GREEN differentiation does not belong in acceptance_criteria. When `test_first: true`, task-executor loads `superpowers:test-driven-development` as an additional skill via `task.skills`. The TDD skill governs the RED→GREEN→REFACTOR cycle internally -- the same test command (vitest/bun test/pytest/cargo test) naturally returns RED before implementation and GREEN after. acceptance_criteria remains a single flat list of post-GREEN verification commands, unchanged from today. This is how GSD's subagent-driven-development already works: subagents are told "follow TDD" and load the TDD skill, not given RED/GREEN YAML annotations. Framework-agnostic TDD consciousness, not mechanical YAML tracking. (captain, 2026-04-12, interactive)

## Open Questions

Q-1: Should entity 067 address the `<automated>MISSING</automated>` documentation gap in build-plan SKILL.md while touching dimension 6d?

Domain: Readable / Textual

Why it matters: Code-explorer found that the `<automated>MISSING</automated>` sentinel token appears only in `plan-checker-prompt.md:90` (dimension 6d validation), NOT in `build-plan/SKILL.md` step 4a (task schema documentation). Plan-writers have no guidance on when/how to emit this token. Since entity 067 is already extending 6d with `test_first` validation, this is the natural place to backfill the gap -- but it broadens scope beyond TDD.

Suggested options: (a) Address it in entity 067 as a "while we're here" fix to the authoring guidance in build-plan step 4a, (b) Leave it for a separate entity -- the gap predates 067 and is not TDD-specific, (c) Document the gap in 067's Stage Report as a finding for future work

→ Answer: While-we're-here fix -- add authoring guidance for `<automated>MISSING</automated>` sentinel to build-plan step 4a alongside the test_first changes. Same file already in scope, marginal cost near zero, pure additive documentation. (captain, 2026-04-12, interactive)

Q-2: Is build-brainstorm acceptance criteria shape enhancement (Directive deliverable 4) in scope or explicitly deferred?

Domain: Runnable / Invokable

Why it matters: Deliverable 4 is marked "(optional)" in the Directive. If in scope, it adds build-brainstorm/SKILL.md step 4 to the files_modified list and expands the entity by 1-2 tasks. If deferred, entity 067 is purely plan+execute-side and build-brainstorm remains untouched. The captain's stated goal was "繼續蒸餾" (continue distilling) which could encompass brainstorm-side improvements or stay focused on the execution gap.

Suggested options: (a) In scope -- add given/when/then guidance to build-brainstorm step 4, making the full spec→plan→execute TDD chain coherent, (b) Deferred -- keep 067 focused on plan+execute, create a follow-up entity for brainstorm AC shape, (c) Partial -- add a non-binding "prefer testable phrasing" note to build-brainstorm without changing the AC generation algorithm

→ Answer: Full -- in scope. Add given/when/then guidance to build-brainstorm step 4, making the complete brainstorm→plan→execute TDD chain coherent. This aligns with captain's "繼續蒸餾" intent: TDD consciousness should permeate the entire pipeline from spec generation through execution, not just the execute side. build-brainstorm/SKILL.md step 4 becomes an additional file in scope. (captain, 2026-04-12, interactive)

## Decomposition Recommendation

Scope flag present but decomposition not recommended: all changes flow linearly through a single `test_first` attribute (plan schema → plan-checker validation → task-execution consumption). No independent sub-scopes exist -- you cannot ship plan schema changes without plan-checker validation, and task-execution changes are meaningless without the schema definition. 11 files across 3 layers is well within Medium scale.

## Canonical References

- `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/test-driven-development/` -- Superpowers TDD skill: rigid RED→GREEN→REFACTOR discipline, framework-agnostic, "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" iron law. Key design input: TDD cycle is governed by the skill's execution flow, not by YAML markers in acceptance_criteria. (captain cited during O-1 resolution)
- `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/subagent-driven-development/SKILL.md` -- GSD subagent-driven-development: line 274 says "Subagents should use: superpowers:test-driven-development". Implementer prompt says "follow TDD if task says to". Key pattern: subagents load TDD skill, orchestrator doesn't track RED/GREEN. (captain cited during O-1 resolution)
- Captain clarification (2026-04-12): "不只是用 subagent 做 red-flag test 也包含各種語言與框架的測試，例如 vitest 等，但應該不是去限制用哪個語言或框架，而是一開始就要帶有 TDD 意識去執行" -- TDD discipline must be framework-agnostic (vitest/jest/pytest/cargo test/bun:test). The pipeline should instill TDD consciousness, not mandate specific tools. (captain, Step 2 batch confirmation context)

## Stage Report: explore

- [x] Files mapped: 11 across contract, test, config
  contract: 6 files (build-plan SKILL.md, plan-checker-prompt.md, task-execution SKILL.md, build-execute SKILL.md, build-brainstorm SKILL.md, agents/task-executor.md); test: 4 files (pressure tests for task-execution, build-plan, build-execute, build-plan-execute-contract); config: 1 file (agents/task-executor.md)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 RED=non-zero exit; A-2 troops-agnostic; A-3 REFACTOR scope-bounded; A-4 no migration; A-5 pressure test schema convention
- [x] Options surfaced: 1
  O-1 RED/GREEN command differentiation mechanism (ordering convention recommended)
- [x] Questions generated: 2
  Q-1 `<automated>MISSING</automated>` gap backfill scope; Q-2 build-brainstorm AC shape in/out of scope
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  11 files mapped, 5-8 files_modified estimated, consistent with Medium (5-15 files)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Scope flag present but explore determined single-attribute linear flow, no independent sub-scopes
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed via batch with numeric confidence scores (0.85-0.95)
- [x] Options selected: 1 / 1
  O-1 RED/GREEN differentiation -- all 3 options rejected; captain redirected to load superpowers:test-driven-development skill instead of YAML tracking
- [x] Questions answered: 2 / 2
  Q-1 while-we're-here fix for <automated>MISSING</automated> gap; Q-2 full scope for brainstorm AC shape (given/when/then)
- [x] Canonical refs added: 3
  superpowers TDD skill path; GSD subagent-driven-development; captain TDD-consciousness clarification (framework-agnostic)
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered, 4 ACs present, canonical refs populated
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 067" for FO to advance status to plan
- [x] Clarify duration: 4 interactions, session complete
  1 batch confirmation + 1 option (rejected→Other) + 2 AskUserQuestion calls (Q-1, Q-2)
