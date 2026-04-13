---
id: 081
title: "Goal-backward verification + regression gate -- semantic quality checks"
status: clarify
context_status: ready
source: decomposition of entity 077 (cross-phase skepticism)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [075]
parent: 077
---

## Directive

> Quality currently runs mechanical checks (tsc/test/lint/build) but does NOT verify whether the entity's GOAL was achieved. Tests passing doesn't mean the Acceptance Criteria are met -- code could be a stub, orphaned, or not wired into runtime. Additionally, no regression gate exists: execute may break prior entity functionality without detection.
>
> Two sub-scopes: (1) Goal-backward verification -- re-read Acceptance Criteria and Directive after execute, verify each criterion is met by actual code changes, detect stub/orphan code. Placement must respect quality's "mechanical, no judgment" contract. (2) Regression gate -- use CONTRACTS.md to find prior entities that modified overlapping files, run their test suites, block quality gate on regression.
>
> Inherited from parent 077: O-1 (goal-backward placement) and Q-1 (regression gate test mapping) must be resolved during clarify.

## Captain Context Snapshot

- **Repo**: main @ 4853c5d
- **Session**: No recent session context (entity created via decompose(077) at 468882a)
- **Domain**: Runnable / Invokable, Organizational / Data-transforming
- **Related entities**: 077 -- Cross-phase skepticism validation gates (epic/awaiting-clarify), 075 -- Research dispatch architecture (plan/ready), 079 -- Plan-stage assumption re-validation (clarify/ready), 080 -- Execute-stage staleness detection (clarify/ready), 078 -- Clarify-stage explore re-validation (draft), 074 -- Pipeline verification quality uplift (draft/pending)
- **Created**: 2026-04-13T10:45:00Z

## Brainstorming Spec

**APPROACH**: Implement two independent verification mechanisms that run post-execute. (1) **Goal-backward verification** as a new pre-scan check Step 1e in build-review's Step 1 (✓ confirmed by explore: build-review SKILL.md:139-163 -- pre-scan has 4 existing checks 1a-1d, runs inline in orchestrator context, is "judgment-bearing but rule-bound" per line 10,210; Step 1e follows the same pattern). The check reads `## Acceptance Criteria` and `## Directive`, compares each criterion against the `execute_base..HEAD` diff, and flags unmet criteria or orphan code (functions/exports not imported by any runtime path in the diff). This runs BEFORE the parallel agent dispatch (Step 2), so its findings feed into the classification pipeline (Step 3) alongside agent findings. (2) **Regression gate** as a new Step 4.5 in build-quality (✓ confirmed by explore: build-quality SKILL.md:46-109 -- Steps 1-4 are the four mechanical checks, Step 5 is conditional coverage; Step 4.5 inserts after all primary checks and before coverage, consistent with fractional numbering). It queries CONTRACTS.md for prior entities that modified overlapping files (✓ confirmed by explore: CONTRACTS.md:1-40 -- tracks entity→file mappings with Entity/Stage/Intent/Status columns; queryable by file path to find overlapping entities), collects their test suite paths, and runs `bun test {paths}` (⚠ partially confirmed: CONTRACTS.md tracks source files, NOT test file paths -- test mapping strategy is Q-1). Failure is a binary signal routed back to execute via `feedback-to: execute` in the Stage Report.

**ALTERNATIVE**: Place BOTH goal-backward and regression gate in a single new "verify" stage between quality and review, with its own skill and ensign. -- D-01 Rejected: adding a new pipeline stage changes the stage graph, profile definitions, FO routing, and status script -- high blast radius for what amounts to two checks. The distributed approach keeps each check in its natural home (review for judgment, quality for mechanical), requires no stage graph changes, and each check is independently deployable. A dedicated verify stage also introduces a cold-start context problem: the verify ensign would need to re-read entity context that review already reads.

**GUARDRAILS**:
- Goal-backward verification goes in build-review (judgment-bearing), NOT build-quality (mechanical-only). This is the parent 077 O-1 recommended option.
- Regression gate goes in build-quality (mechanical), NOT build-review. Running tests and checking exit codes is purely mechanical.
- CONTRACTS.md is the single source for cross-entity file ownership -- regression gate must use it, not invent a parallel tracking mechanism (parent 077 GUARDRAILS)
- Each check is independently deployable -- shipping goal-backward in review should not require regression gate in quality to ship simultaneously (parent 077 GUARDRAILS)
- Do not modify `## Directive` or `## Captain Context Snapshot` (immutable per pipeline rules)

**RATIONALE**: The distributed approach is correct because it preserves the mechanical/judgment separation that defines quality vs review. Quality's contract is explicit: "you execute commands, you record evidence, you do NOT interpret errors" (SKILL.md:10). Goal-backward verification inherently requires interpretation ("does this diff satisfy this acceptance criterion?"), making it a review concern. The regression gate inherently requires test execution with binary pass/fail, making it a quality concern. Placing both in a new stage would duplicate the context-loading that review already performs, add a stage to every profile, and create a cold-start context problem without any benefit. The build-review pre-scan (Step 1) is the natural insertion point for goal-backward because it already runs inline before agent dispatch and its findings flow into the existing classification pipeline.

## Acceptance Criteria

- [ ] Given a completed execute stage, when build-review's goal-backward pre-scan check runs, then it re-reads each Acceptance Criterion from the entity body and verifies it is met by actual code changes in the `execute_base..HEAD` diff (how to verify: run build-review on a completed entity, confirm per-criterion verification output in Stage Report pre-scan findings)
- [ ] Given a completed execute that produced a function never imported or wired into any runtime path, when goal-backward pre-scan runs, then it detects the orphan and flags it as a CRITICAL CODE finding (how to verify: create entity where execute writes an exported function with no import anywhere in the diff or existing codebase, verify orphan detection in pre-scan findings)
- [ ] Given an entity modifying `daemon.ts` (also modified by prior shipped entity 052), when build-quality regression gate runs, then it queries CONTRACTS.md for entity 052, identifies the overlapping files, and runs `bun test` scoped to those files' test coverage (how to verify: run quality on entity with overlapping CONTRACTS.md entries, verify prior entity test paths appear in regression gate log)
- [ ] Given a regression gate test failure (prior entity's tests fail), when quality reports, then the failure is classified as `cross-entity-regression` and the Stage Report routes `feedback-to: execute` with prior entity context included (how to verify: create scenario where prior entity test fails due to current entity's changes, verify routing and classification)

## Assumptions

A-1: Goal-backward verification inserts as Step 1e in build-review's pre-scan, following the existing 1a-1d pattern. It runs inline in the review ensign's own context (not a subagent dispatch). Its findings flow into Step 3 classification alongside agent findings, using the same two-axis schema (severity + category).
Confidence: Confident (0.90)
Evidence: build-review SKILL.md:139-163 -- pre-scan has 4 checks (1a CLAUDE.md rules, 1b stale refs, 1c dependency chains, 1d plan consistency), all inline. Line 163: "Pre-scan findings flow into Step 3 classification alongside agent findings."
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Regression gate inserts as Step 4.5 in build-quality, between Step 4 (bun build) and Step 5 (coverage threshold). It follows the same binary pass/fail verdict pattern as Steps 1-4 and gets its own row in the structured per-check verdict (Step 6).
Confidence: Confident (0.85)
Evidence: build-quality SKILL.md:46-127 -- Steps 1-4 each have verdict: pass/fail, command, evidence. Step 5 is conditional (coverage). Step 4.5 fits between the unconditional checks and the conditional coverage check.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Orphan detection (goal-backward sub-check) uses simplified grep scan: for each function/export added by the diff, grep for import/call sites across codebase. Zero-hit = flagged as finding. This is the inverse of Step 1b (stale refs). No attempt to distinguish API surface from internal code -- if correctness-reviewer also flags the same symbol, Step 3 classification does dedup (build-review SKILL.md:195 -- merge pre-scan + agent findings into single classification pass). No existing pr-review-toolkit agent does systematic orphan detection -- Step 1b's reverse-grep is the closest pattern.
Confidence: Confident (0.80)
Evidence: build-review SKILL.md:149-151 -- Step 1b reverse pattern. SKILL.md:195 -- classification merges pre-scan + agent findings for dedup. No orphan/dead-code agent found in pr-review-toolkit or build-review skill tree (grep confirmed).
→ Corrected by captain, 2026-04-13 (interactive): "簡化版 grep + reviewer dedup。不用精細判斷 API surface，讓 Step 3 classification 跟 correctness-reviewer 做 dedup"

A-4: Regression gate failure routes `feedback-to: execute` (not `feedback-to: captain` or `feedback-to: plan`). This is consistent with quality's existing routing: test failures mean execute produced broken code, and execute should fix it. The `cross-entity-regression` classification tells execute that the failure is in a prior entity's test, not the current entity's test.
Confidence: Confident (0.85)
Evidence: build-quality SKILL.md:3 -- "any fail routes feedback to execute." build-execute SKILL.md:192-202 -- BLOCKED escalation ladder handles re-dispatch on execute failures.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Goal-backward verification placement

Where should the judgment-bearing "does the diff satisfy the Acceptance Criteria?" check live?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Build-review pre-scan Step 1e | Review is judgment-bearing; pre-scan runs inline before agent dispatch; findings feed classification pipeline (Step 3); no new stage | Review runs AFTER quality -- if goal-backward fails, quality already passed (wasted compute) | Low | ✅ Recommended |
| New "verify" stage after quality | Clean separation; dedicated goal-achievement check; runs before review | Adds pipeline stage to every profile; FO routing changes; cold-start context duplication; high blast radius | High | Not recommended |
| Quality Step 1.5 (modify quality) | Runs before review; single quality gate | Breaks quality's explicit "mechanical, no judgment" contract; introduces LLM interpretation into a mechanical skill | Medium | Not recommended |

→ Selected: Build-review pre-scan Step 1e (captain, 2026-04-13, interactive)

### O-2: Regression gate step placement in build-quality

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Step 4.5 (after bun build, before coverage) | After all primary checks; doesn't block coverage if regression passes; fractional numbering proven | Runs even if earlier steps failed (but quality already runs all steps regardless) | Low | ✅ Recommended |
| Step 5.5 (after coverage) | Runs last, cleanest exit point | Coverage is conditional (Step 5 may be skipped); regression gate should not depend on coverage config | Low | Viable |

→ Selected: Step 4.5 (after bun build, before coverage) (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How should the regression gate map entities to their test files?

Domain: Organizational / Data-transforming

Why it matters: CONTRACTS.md tracks which entities modified which SOURCE files, but NOT which TEST files cover those source files. The regression gate needs to know "entity 052 modified daemon.ts -- what tests cover daemon.ts?" to run targeted regression tests.

Suggested options: (a) Full test suite -- just run `bun test` (entire project). Simple but slow; catches everything but wastes time on unrelated tests. (b) Co-location glob -- convention-based: for `src/foo.ts`, check `tests/foo.test.ts` and `src/foo.test.ts`. Fast but fragile; misses tests in unexpected locations. (c) Add test tracking to CONTRACTS.md -- extend the schema with a `test_files` column listing test files associated with each entity's source files. Most precise but requires CONTRACTS.md schema change and plan-stage test enumeration. (d) Bun's built-in coverage mapping -- run `bun test --coverage` and use the coverage report to identify which tests exercise which source files. Accurate but requires coverage infrastructure.

→ Answer: Full test suite -- quality Step 1 already runs `bun test` (full project). Regression gate Step 4.5 reuses Step 1's results instead of re-running: if Step 1 passed, all prior entity tests also passed (regression gate auto-pass). If Step 1 failed, Step 4.5 cross-references failing test file paths against CONTRACTS.md to classify whether failures are current-entity bugs (normal quality fail) or cross-entity regressions (tagged `cross-entity-regression` in Stage Report). No new test execution needed. (captain, 2026-04-13, interactive)

## Canonical References

(none cited -- captain selected recommended options and full test suite without external file references)

## Stage Report: explore

- [x] Files mapped: 3 across skill/config layer
  build-review SKILL.md (goal-backward insertion target), build-quality SKILL.md (regression gate insertion target), CONTRACTS.md (cross-entity query source)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1)
  A-1 review pre-scan Step 1e (0.90), A-2 quality Step 4.5 (0.85), A-3 orphan detection via grep (0.75), A-4 regression routing (0.85)
- [x] Options surfaced: 2
  O-1 goal-backward placement (inherited from parent 077); O-2 regression gate step placement
- [x] Questions generated: 1
  Q-1 regression gate test mapping strategy (inherited from parent 077)
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers
- [x] Scale assessment: confirmed Medium
  3 files mapped, 2 skill insertion points across 2 skills, 2 options + 1 question requiring captain decision

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Medium scope but two sub-scopes are independently deployable, no further split needed
- [x] Assumptions confirmed: 4 / 4 (1 corrected)
  A-1, A-2, A-4 confirmed via batch; A-3 corrected -- simplified grep + reviewer dedup, no API surface exclusion
- [x] Options selected: 2 / 2
  O-1 Goal-backward placement -- Build-review pre-scan Step 1e (recommended); O-2 Regression gate -- Step 4.5 (recommended)
- [x] Questions answered: 1 / 1
  Q-1 Test mapping -- Full test suite, reuse quality Step 1 results, cross-reference failing tests against CONTRACTS.md for regression classification
- [x] Canonical refs added: 0
  captain selected recommended options without citing external references
- [x] Context status: ready
  gate passed: all 4 assumptions resolved, 2 options selected, 1 question answered, ACs valid (4 criteria, no α markers)
- [x] Handoff mode: loose
  captain must say "execute 081" or hand off to First Officer; auto_advance not set
- [x] Clarify duration: 4 questions asked, session complete
  1 batch assumption presentation (plain text) + 2 AskUserQuestion (O-1, O-2) + 1 AskUserQuestion (Q-1)

## Research Findings

### Upstream Constraints

1. **build-review is judgment-bearing but contract-bound** (SKILL.md:10): "You are judgment-bearing (unlike build-quality) but strictly contract-bound: classification and routing follow explicit rules." Goal-backward verification is judgment (interpreting whether diff satisfies AC), so it belongs in review, not quality.
2. **build-quality is mechanical-only** (SKILL.md:10): "you execute commands, you record evidence, you do NOT interpret errors." Regression gate is mechanical (run tests, check exit code), so it belongs in quality.
3. **Pre-scan runs inline before parallel dispatch** (build-review SKILL.md:139-163): Steps 1a-1d are mechanical checks that run in the ensign's own context. Step 1e follows this same inline pattern. Findings flow into Step 3 classification alongside agent findings.
4. **Quality Steps 1-4 are unconditional mechanical checks** (build-quality SKILL.md:46-109): Each has binary pass/fail verdict. Step 4.5 inserts between Step 4 (bun build) and Step 5 (conditional coverage). Step 6.5 already classifies failures by entity diff scope -- regression gate classification follows the same pattern.
5. **CONTRACTS.md tracks entity-to-file mappings** (CONTRACTS.md:1-6): Schema has Entity/Stage/Intent/Status/Last Updated columns per file path section. Queryable by file path to find overlapping entities. Does NOT track test file paths -- Q-1 resolved this by reusing Step 1's full test suite results.

### Existing Patterns

1. **Pre-scan check pattern** (build-review SKILL.md:145-161): Each check (1a-1d) follows: description of what to check, how to detect violations, what to record as findings. Step 1e follows the same shape: read AC, compare against diff, record findings.
2. **Fractional step numbering** (build-quality SKILL.md:150-166): Step 6.5 already exists for diff-scope classification. Step 4.5 uses the same fractional convention for inserting between existing steps without renumbering.
3. **Severity + root classification** (build-review SKILL.md:196-208): Two-axis schema (CRITICAL/HIGH/MEDIUM/LOW/NIT x CODE/DOC/NEW/PLAN). Goal-backward findings use severity based on failure mode, root based on where the fix belongs.
4. **Pressure test format** (tests/pressure/build-quality.yaml, build-review.yaml): YAML with skill, target_path, captured, session, test_cases (id, summary, pressure, options A-E, expected_answer, correct_because with cite_file/cite_section/cite_contains, history). Each scenario is a forced-choice under specific pressure types.
5. **Step 6.5 entity-scope classification** (build-quality SKILL.md:150-166): Uses `git diff --name-only {execute_base_sha}..HEAD` to classify failures as entity-scope vs pre-existing. Regression gate Step 4.5 follows the same classification pattern but adds a cross-entity dimension: failures in overlapping files from CONTRACTS.md entries.

### Library/API Surface

1. **CONTRACTS.md query interface**: Read CONTRACTS.md, parse markdown tables under `## Active Contracts` section headers (each header is a file path like `### skills/build-review/SKILL.md`). Each table row has Entity/Stage/Intent/Status/Last Updated. Filter by file path overlap with current entity's diff.
2. **`git diff --name-only`**: Pure file-delta check, no judgment. Used by Step 6.5 already. Regression gate reuses Step 1's `bun test` results (already captured) and cross-references failing test paths against CONTRACTS.md entries.
3. **`grep` for orphan detection**: For each function/export/class added by the diff, grep project-wide for import/call sites. Zero hits = orphan. This is the inverse of Step 1b (stale references -- symbols removed, grep for remaining references). Step 1e does: symbols added, grep for existing references.

### Known Gotchas

1. **Q-1 resolution eliminates re-execution**: Captain resolved Q-1 with "full test suite reuse" -- quality Step 1 already runs `bun test` full suite. Step 4.5 does NOT re-run tests. It cross-references Step 1's failing test paths against CONTRACTS.md to classify regressions. If Step 1 passed, Step 4.5 auto-passes (no regression possible if all tests pass).
2. **Orphan detection false positives**: Exported functions intended as public API surface (e.g., MCP tool handlers, plugin exports) may have zero in-repo import sites but are called externally. A-3 corrected: simplified grep + reviewer dedup, no API surface exclusion. Step 3 classification merges pre-scan + agent findings -- if correctness-reviewer also flags the same symbol, classification does dedup (build-review SKILL.md:195).
3. **Goal-backward cannot fix -- only classify and route**: Like all review findings, goal-backward results feed into Step 5 verdict routing. Unmet AC is a CODE finding (the diff is incomplete); orphan code is a CODE finding. Both route feedback-to: execute.
4. **Regression gate auto-pass on Step 1 green**: If `bun test` passed in Step 1, ALL tests passed (including prior entity tests). Step 4.5 verdict = pass with evidence "Step 1 passed, all tests green including cross-entity coverage." No CONTRACTS.md query needed when Step 1 is green -- the query only fires when Step 1 has failures to classify.

### Reference Examples

1. **Step 1b as inverse template for Step 1e orphan check** (build-review SKILL.md:149-151): "For every symbol removed by the diff, run a project-wide grep for remaining references." Step 1e inverts: "For every function/export/class added by the diff, run a project-wide grep for import/call sites."
2. **Step 6.5 as template for Step 4.5 classification** (build-quality SKILL.md:150-166): "Run git diff --name-only to get entity's file delta. For each failing check, extract failing file paths. Classify: entity-scope vs pre-existing." Step 4.5 adds: "For entity-scope failures, cross-reference failing test file paths against CONTRACTS.md entries to identify cross-entity regressions."
3. **Existing pressure test: `structured-per-check-verdict`** (tests/pressure/build-quality.yaml): Template for regression gate pressure test -- test the ensign's behavior when Step 4.5 detects a cross-entity regression vs a current-entity failure.
4. **Existing pressure test: `pre-scan-before-parallel-dispatch`** (tests/pressure/build-review.yaml): Template for goal-backward pressure test -- test the ensign's behavior when Step 1e detects unmet AC or orphan code.

## PLAN

<task id="task-1" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-review/SKILL.md
    - docs/build-pipeline/quality-goal-backward-regression.md (## Acceptance Criteria)
  </read_first>

  <action>
  Insert `### 1e -- Goal-Backward Verification` section after Step 1d (Plan Consistency)
  in build-review SKILL.md. The section defines:

  (1) Read the entity's `## Acceptance Criteria` and `## Directive` sections.
  (2) For each acceptance criterion, verify it is met by actual code changes in the
      `execute_base..HEAD` diff -- check that the criterion's "how to verify" command
      would pass, or that the described behavior is implemented in changed files.
      Record unmet criteria as findings with severity HIGH, root CODE, source
      `pre-scan:goal-backward`.
  (3) For each function, export, or class ADDED by the diff, grep project-wide for
      import/call sites. Zero hits = orphan code, flagged as CRITICAL CODE finding
      with source `pre-scan:goal-backward`.
  (4) Update the Step 1 header text to reference "five checks" (1a-1e).
  (5) Update the Pre-Scan section of the Stage Report shape (Step 6) to include
      `goal-backward: {N findings}` line.
  (6) Add a "Goal-Backward Verification Runs Every Time" subsection under
      "Rules -- No Exceptions" with NEVER rules:
      - "NEVER skip goal-backward because 'the tests pass so AC must be met'"
      - "NEVER treat orphan detection as optional because 'correctness-reviewer will catch it'"
      - "NEVER skip orphan grep for small diffs"
  </action>

  <acceptance_criteria>
    - `$ grep -c '1e -- Goal-Backward' skills/build-review/SKILL.md` returns 1
    - `$ grep -c 'goal-backward' skills/build-review/SKILL.md` returns >= 5
    - `$ grep 'five checks' skills/build-review/SKILL.md` returns at least one match
    - Step 1e section contains: read AC, read Directive, per-criterion diff verification, orphan grep, severity assignment, source tag
  </acceptance_criteria>

  <files_modified>
    - skills/build-review/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-quality/SKILL.md
    - docs/build-pipeline/_index/CONTRACTS.md
    - docs/build-pipeline/quality-goal-backward-regression.md (## Acceptance Criteria)
  </read_first>

  <action>
  Insert `## Step 4.5: Regression Gate (Cross-Entity)` section after Step 4 (bun build)
  and before Step 5 (Coverage Threshold) in build-quality SKILL.md. The section defines:

  (1) If Step 1 verdict = pass, Step 4.5 auto-passes with evidence "Step 1 passed, all
      tests green including cross-entity coverage. No regression possible." Skip to Step 5.
  (2) If Step 1 verdict = fail, read CONTRACTS.md (`docs/build-pipeline/_index/CONTRACTS.md`).
      Parse `## Active Contracts` section headers (each is a file path like
      `### skills/build-review/SKILL.md`). For each header, read the table rows to find
      entities that modified files overlapping with the current entity's
      `git diff --name-only {execute_base}..HEAD`.
  (3) For each failing test file from Step 1's evidence, check if the test's source file
      is tracked in CONTRACTS.md under a DIFFERENT entity with status `final` or `in-flight`.
      If yes, classify the failure as `cross-entity-regression`.
  (4) Verdict: if any `cross-entity-regression` found, verdict = fail with classification
      tag and `feedback-to: execute` with prior entity context included in the Stage Report.
      If all failures are current-entity only, verdict = pass (regression gate passes;
      current-entity failures already handled by Step 1's verdict).

  Also update:
  - Step 6 (Assemble Structured Per-Check Verdict) to include a `### regression` subsection
    with the same verdict/command/evidence shape as other checks.
  - Step 7 routing to include regression gate in the per-check breakdown and Stage Report shape.
  - Add a "Regression Gate -- No Re-Execution" subsection under "Rules -- No Exceptions":
    - "NEVER re-run tests in Step 4.5 -- reuse Step 1 evidence exclusively"
    - "NEVER skip CONTRACTS.md query when Step 1 has failures"
    - "NEVER invent a parallel tracking mechanism -- CONTRACTS.md is the single source"
  </action>

  <acceptance_criteria>
    - `$ grep -c 'Step 4.5' skills/build-quality/SKILL.md` returns >= 3
    - `$ grep -c 'cross-entity-regression' skills/build-quality/SKILL.md` returns >= 2
    - `$ grep -c 'CONTRACTS.md' skills/build-quality/SKILL.md` returns >= 2
    - Step 4.5 section contains: Step 1 auto-pass shortcut, CONTRACTS.md parse, failing test cross-reference, classification tag, verdict shape
  </acceptance_criteria>

  <files_modified>
    - skills/build-quality/SKILL.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-review/SKILL.md
    - tests/pressure/build-review.yaml
    - tests/pressure/README.md
  </read_first>

  <action>
  Create `tests/pressure/build-review-goal-backward.yaml` with 2 test cases following the
  exact pressure test YAML schema from tests/pressure/README.md:

  (1) `goal-backward-unmet-ac` -- Build-review ensign running Step 1 pre-scan on a completed
      execute. The entity's AC says "function validateEmail is called from POST /api/users
      route handler." The diff shows validateEmail was added to src/models/User.ts and tests
      pass, but grep shows validateEmail is never imported or called from any route handler.
      Tests pass because the test file tests validateEmail in isolation, not via the route.
      Pressure: "tests pass so AC must be met", "correctness-reviewer will catch it in Step 2".
      Expected: B -- detect unmet AC as HIGH CODE finding in pre-scan Step 1e.

  (2) `goal-backward-orphan-detection` -- Build-review ensign running Step 1 pre-scan. The
      diff adds `export function buildMetricsReport()` to src/analytics/reports.ts. Project-wide
      grep for `buildMetricsReport` returns exactly 1 hit (the export definition itself) and
      0 import sites. The function was supposed to be wired into the dashboard refresh handler
      per the AC but execute forgot to add the import.
      Pressure: "it's a public API export, external callers will use it", "orphan detection
      is the review agent's job not pre-scan's", "the function might be called dynamically".
      Expected: B -- flag as CRITICAL CODE orphan finding in Step 1e pre-scan.

  Update `tests/pressure/README.md` file index table to include the new file entry.
  </action>

  <acceptance_criteria>
    - `$ test -f tests/pressure/build-review-goal-backward.yaml && echo exists` returns "exists"
    - `$ grep -c 'id:' tests/pressure/build-review-goal-backward.yaml` returns 2
    - `$ grep 'build-review-goal-backward' tests/pressure/README.md` returns at least one match
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/build-review-goal-backward.yaml
    - tests/pressure/README.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2" skills="superpowers:writing-skills">
  <read_first>
    - skills/build-quality/SKILL.md
    - tests/pressure/build-quality.yaml
    - tests/pressure/README.md
  </read_first>

  <action>
  Create `tests/pressure/build-quality-regression-gate.yaml` with 2 test cases following the
  exact pressure test YAML schema from tests/pressure/README.md:

  (1) `regression-gate-step1-green-autopass` -- Build-quality ensign just finished Step 4
      (bun build). Step 1 verdict was pass (all tests green, 0 failures). Now entering
      Step 4.5 Regression Gate. CONTRACTS.md has 3 entries for files in the entity's diff
      under different shipped entities. Ensign deciding whether to query CONTRACTS.md.
      Pressure: "always query CONTRACTS.md for thoroughness even when tests pass",
      "what if a test was deleted and the regression is invisible?",
      "CONTRACTS.md query is cheap, just do it".
      Expected: B -- auto-pass Step 4.5 without CONTRACTS.md query because Step 1 passed.

  (2) `regression-gate-cross-entity-classification` -- Build-quality ensign at Step 4.5.
      Step 1 verdict was fail: 2 test failures in tests/daemon/lifecycle.test.ts
      (`TypeError: Cannot read property 'pid' of undefined` at line 42 and line 87).
      Entity's diff modifies spacebridge/src/daemon/pid.ts. CONTRACTS.md shows
      spacebridge/src/daemon/pid.ts was also modified by entity
      `spacebridge-l2-daemon-lifecycle` (status: in-flight). Step 6.5 would classify
      the failures as entity-scope (pid.ts is in the diff). But Step 4.5 must also check
      the CONTRACTS.md cross-entity dimension.
      Pressure: "Step 6.5 already handles entity-scope classification, Step 4.5 is redundant",
      "just route feedback-to: execute without the cross-entity tag".
      Expected: B -- classify as `cross-entity-regression`, include prior entity
      `spacebridge-l2-daemon-lifecycle` context in feedback-to: execute.

  Update `tests/pressure/README.md` file index table to include the new file entry.
  </action>

  <acceptance_criteria>
    - `$ test -f tests/pressure/build-quality-regression-gate.yaml && echo exists` returns "exists"
    - `$ grep -c 'id:' tests/pressure/build-quality-regression-gate.yaml` returns 2
    - `$ grep 'build-quality-regression-gate' tests/pressure/README.md` returns at least one match
  </acceptance_criteria>

  <files_modified>
    - tests/pressure/build-quality-regression-gate.yaml
    - tests/pressure/README.md
  </files_modified>
</task>

## UAT Spec

**Custom flow**: This entity uses skill TDD via the `superpowers:writing-skills` discipline. Normal quality/review/uat stages are SKIPPED. Verification is via pressure tests and skill text structural validation.

### Skill TDD Scenarios

1. **Goal-backward pre-scan fires on unmet AC** (AC-1)
   - Invoke modified build-review skill on a test entity where execute produced code that passes `bun test` but one AC ("function X is called from route Y") is not met by the diff
   - Verify: Step 1e in the Stage Report pre-scan findings shows the unmet AC as HIGH CODE finding with per-criterion verification output
   - Pressure test file: `tests/pressure/build-review-goal-backward.yaml` case `goal-backward-unmet-ac`

2. **Goal-backward orphan detection fires on unwired export** (AC-2)
   - Invoke modified build-review skill on a test entity where execute added `export function orphanHelper()` with zero import sites
   - Verify: Step 1e pre-scan findings shows orphan as CRITICAL CODE finding with grep evidence showing zero import hits
   - Pressure test file: `tests/pressure/build-review-goal-backward.yaml` case `goal-backward-orphan-detection`

3. **Regression gate auto-passes when Step 1 is green** (AC-3, happy path)
   - Invoke modified build-quality skill on an entity where Step 1 (`bun test`) passed with all green
   - Verify: Step 4.5 in Stage Report shows verdict=pass with evidence "Step 1 passed, all tests green including cross-entity coverage"
   - Pressure test file: `tests/pressure/build-quality-regression-gate.yaml` case `regression-gate-step1-green-autopass`

4. **Regression gate classifies cross-entity regression** (AC-3 + AC-4)
   - Invoke modified build-quality skill on an entity modifying `daemon.ts` (also modified by shipped entity 052 per CONTRACTS.md), where Step 1 failed with tests in daemon-related files
   - Verify: Step 4.5 cross-references CONTRACTS.md, identifies entity 052 overlap, classifies failure as `cross-entity-regression`, routes `feedback-to: execute` with prior entity context
   - Pressure test file: `tests/pressure/build-quality-regression-gate.yaml` case `regression-gate-cross-entity-classification`

### Structural Validation (grep-based)

5. **build-review SKILL.md contains Step 1e section**: `grep '1e -- Goal-Backward' skills/build-review/SKILL.md`
6. **build-quality SKILL.md contains Step 4.5 section**: `grep 'Step 4.5' skills/build-quality/SKILL.md`
7. **Pressure test files parse as valid YAML**: `bun -e` parse check on both new YAML files
8. **README.md file index updated**: `grep 'build-review-goal-backward\|build-quality-regression-gate' tests/pressure/README.md`

## Validation Map

| Requirement (AC) | Task | Verify Command | Status |
|---|---|---|---|
| AC-1: Goal-backward pre-scan verifies each AC against diff | Task 1, Task 3 | `grep '1e -- Goal-Backward' skills/build-review/SKILL.md` + pressure test `goal-backward-unmet-ac` | pending |
| AC-2: Goal-backward detects orphan code as CRITICAL CODE | Task 1, Task 3 | `grep 'orphan' skills/build-review/SKILL.md` + pressure test `goal-backward-orphan-detection` | pending |
| AC-3: Regression gate queries CONTRACTS.md for overlapping entities | Task 2, Task 4 | `grep 'CONTRACTS.md' skills/build-quality/SKILL.md` + pressure test `regression-gate-cross-entity-classification` | pending |
| AC-4: Regression gate failure routes feedback-to: execute with cross-entity-regression tag | Task 2, Task 4 | `grep 'cross-entity-regression' skills/build-quality/SKILL.md` + pressure test `regression-gate-cross-entity-classification` | pending |

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-quality/SKILL.md`: "mechanical, no judgment" -- regression gate fits, goal-backward does NOT
- `skills/build-review/SKILL.md`: "judgment-bearing" -- candidate for goal-backward placement; pre-scan (Step 1) runs inline before agent dispatch
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate concept

## Stage Report: plan

- [x] Research Findings written: 5 domain sections with citations
  Upstream Constraints (5 items), Existing Patterns (5 items), Library/API Surface (3 items), Known Gotchas (4 items), Reference Examples (4 items)
- [x] PLAN written: 4 tasks across 2 waves
  Wave 1: Task 1 (build-review Step 1e) + Task 2 (build-quality Step 4.5) -- parallel, no file overlap
  Wave 2: Task 3 (pressure test goal-backward) + Task 4 (pressure test regression gate) -- parallel, README.md overlap forces serial
- [x] UAT Spec written: 8 testable items (4 skill TDD scenarios + 4 structural validations)
  Custom flow: skill TDD via writing-skills discipline, no browser/e2e tests
- [x] Validation Map written: 4 AC rows mapped to tasks and verify commands
- [x] Self-review: PASS with 2 warnings
  Dim 1 Requirement Coverage: all 4 ACs covered by tasks
  Dim 2 Task Completeness: all 4 tasks have complete schema fields
  Dim 3 Dependency Correctness: wave ordering correct; WARNING -- tests/pressure/README.md in both Task 3 and Task 4 files_modified (same wave, execute forces serial)
  Dim 4 Context Compliance: respects O-1 (Step 1e), O-2 (Step 4.5), Q-1 (full test suite reuse)
  Dim 5 Research Coverage: all read_first entries traced to research findings
  Dim 6 Validation Sampling: all tasks have runnable acceptance_criteria commands
  Dim 7 Cross-Entity Coherence: WARNING -- skills/build-review/SKILL.md has in-flight entry (review-stage-parallel-skill-dispatch); tests/pressure/README.md has in-flight entry (build-flow-tdd-discipline). Entity 075 dependency gates 081 execution, so in-flight entries will resolve.
- [x] Plan-checker verdict: PASS (2 warnings, 0 blockers)
- [x] CONTRACTS.md append: 5 files tracked (skills/build-review/SKILL.md, skills/build-quality/SKILL.md, tests/pressure/build-review-goal-backward.yaml, tests/pressure/build-quality-regression-gate.yaml, tests/pressure/README.md)
