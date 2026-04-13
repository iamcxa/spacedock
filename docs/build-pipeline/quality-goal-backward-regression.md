---
id: 081
title: "Goal-backward verification + regression gate -- semantic quality checks"
status: draft
context_status: awaiting-clarify
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

A-2: Regression gate inserts as Step 4.5 in build-quality, between Step 4 (bun build) and Step 5 (coverage threshold). It follows the same binary pass/fail verdict pattern as Steps 1-4 and gets its own row in the structured per-check verdict (Step 6).
Confidence: Confident (0.85)
Evidence: build-quality SKILL.md:46-127 -- Steps 1-4 each have verdict: pass/fail, command, evidence. Step 5 is conditional (coverage). Step 4.5 fits between the unconditional checks and the conditional coverage check.

A-3: Orphan detection (goal-backward sub-check) uses `grep` across the codebase for each function/export added by the diff. If no import or call site exists outside the diff itself, it's flagged as an orphan. This is the same technique build-review Step 1b (stale references) uses in reverse -- 1b finds dangling references TO removed symbols, 1e finds dangling exports FROM added symbols.
Confidence: Likely (0.75)
Evidence: build-review SKILL.md:149-151 -- Step 1b runs project-wide grep for removed symbols. Orphan detection is the inverse: project-wide grep for ADDED symbols, flagging zero-hit results.

A-4: Regression gate failure routes `feedback-to: execute` (not `feedback-to: captain` or `feedback-to: plan`). This is consistent with quality's existing routing: test failures mean execute produced broken code, and execute should fix it. The `cross-entity-regression` classification tells execute that the failure is in a prior entity's test, not the current entity's test.
Confidence: Confident (0.85)
Evidence: build-quality SKILL.md:3 -- "any fail routes feedback to execute." build-execute SKILL.md:192-202 -- BLOCKED escalation ladder handles re-dispatch on execute failures.

## Option Comparisons

### O-1: Goal-backward verification placement

Where should the judgment-bearing "does the diff satisfy the Acceptance Criteria?" check live?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Build-review pre-scan Step 1e | Review is judgment-bearing; pre-scan runs inline before agent dispatch; findings feed classification pipeline (Step 3); no new stage | Review runs AFTER quality -- if goal-backward fails, quality already passed (wasted compute) | Low | ✅ Recommended |
| New "verify" stage after quality | Clean separation; dedicated goal-achievement check; runs before review | Adds pipeline stage to every profile; FO routing changes; cold-start context duplication; high blast radius | High | Not recommended |
| Quality Step 1.5 (modify quality) | Runs before review; single quality gate | Breaks quality's explicit "mechanical, no judgment" contract; introduces LLM interpretation into a mechanical skill | Medium | Not recommended |

### O-2: Regression gate step placement in build-quality

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Step 4.5 (after bun build, before coverage) | After all primary checks; doesn't block coverage if regression passes; fractional numbering proven | Runs even if earlier steps failed (but quality already runs all steps regardless) | Low | ✅ Recommended |
| Step 5.5 (after coverage) | Runs last, cleanest exit point | Coverage is conditional (Step 5 may be skipped); regression gate should not depend on coverage config | Low | Viable |

## Open Questions

Q-1: How should the regression gate map entities to their test files?

Domain: Organizational / Data-transforming

Why it matters: CONTRACTS.md tracks which entities modified which SOURCE files, but NOT which TEST files cover those source files. The regression gate needs to know "entity 052 modified daemon.ts -- what tests cover daemon.ts?" to run targeted regression tests.

Suggested options: (a) Full test suite -- just run `bun test` (entire project). Simple but slow; catches everything but wastes time on unrelated tests. (b) Co-location glob -- convention-based: for `src/foo.ts`, check `tests/foo.test.ts` and `src/foo.test.ts`. Fast but fragile; misses tests in unexpected locations. (c) Add test tracking to CONTRACTS.md -- extend the schema with a `test_files` column listing test files associated with each entity's source files. Most precise but requires CONTRACTS.md schema change and plan-stage test enumeration. (d) Bun's built-in coverage mapping -- run `bun test --coverage` and use the coverage report to identify which tests exercise which source files. Accurate but requires coverage infrastructure.

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

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-quality/SKILL.md`: "mechanical, no judgment" -- regression gate fits, goal-backward does NOT
- `skills/build-review/SKILL.md`: "judgment-bearing" -- candidate for goal-backward placement; pre-scan (Step 1) runs inline before agent dispatch
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate concept
