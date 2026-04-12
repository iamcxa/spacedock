---
id: 077
title: "Cross-phase skepticism -- validation gates between pipeline stages"
status: draft
source: GSD distillation during 075 clarify session (2026-04-13); GSD verify-phase.md, execute-phase.md
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
depends-on: [075]
---

## Problem

Spacedock's build pipeline trusts prior phase conclusions by default. Plan trusts clarify's confirmed assumptions. Execute trusts plan's task list. Quality checks mechanical correctness (tsc/test/lint) but not goal achievement. This means errors that pass one phase propagate unchallenged through subsequent phases.

GSD codifies cross-phase skepticism as a mandatory design principle: each phase re-validates prior phase conclusions before building on them. Specifically:
- Discuss presents prior decisions as "revisit or keep?" (not immutable)
- Plan injects prior CONTEXT.md so planner can challenge decisions
- Execute runs a regression gate (prior phase test suites) before verification
- Execute does key-links verification (prior wave artifacts actually exist and are wired)
- Verify uses goal-backward reasoning: "task completion ≠ goal achievement"

Spacedock has SOME skepticism (explore Step 3.7 verifies brainstorm claims, quality runs tests, review dispatches independent reviewers) but the gaps are:
1. **Clarify trusts explore output uncritically** -- presents assumptions/options/questions to captain without verifying evidence is still valid or internally consistent. Captain is forced to be the skeptic instead of the decision-maker.
2. Plan does NOT re-validate clarify assumptions against current codebase state
3. Execute does NOT verify plan assumptions still hold (codebase may have moved)
4. Quality checks test pass/fail but NOT whether the entity's GOAL was achieved
5. No regression gate: execute may break prior entity functionality

## Scope

### Clarify-stage explore re-validation (build-clarify addition, captain direction 2026-04-13)
- Before presenting assumptions to captain, clarify re-validates explore's evidence
- Evidence freshness: re-read each assumption's `file:line` citation, verify it still says what explore claimed
- Internal consistency: cross-reference A-1~A-N for contradictions (A-1 says X, A-3 implies not-X)
- Option validity: verify options in comparison tables are genuinely different approaches, not rephrased versions
- Coverage check: run domain templates against entity spec, identify gray areas explore missed
- Research re-validation: if 075 researchers annotated findings, verify research conclusions against current codebase state
- Captain's role shifts from "verifier" to "decision-maker" -- clarify does the homework, captain picks directions
- Inspired by: GSD discuss-phase presents prior decisions as "revisit or keep?" (discuss-phase.md:492-496)

### Researcher vs Code-Explorer disambiguation (documentation addition)
- Add clear usage rules to SO agent and skill reference docs:
  - Code-Explorer: breadth-first file mapping. "What files exist and what layer are they?" Internal only (Read/Grep/Glob/Bash). Used in explore Step 2.
  - Researcher: depth-first claim validation. "Is this claim true?" Internal + external (Read/Grep/Glob/WebSearch/WebFetch). Used in brainstorm/explore/plan for assumption validation.
  - Overlap zone: both read codebase files. Difference: explorer reads to MAP, researcher reads to VALIDATE (trace 2+ levels deep, cross-reference patterns).
- Document in: SO-FO-DISPATCH-SPLIT.md, build-explore references, science-officer agent.md

### Plan-stage clarify re-validation (build-plan addition)
- Before generating tasks, plan reads clarify's confirmed assumptions and re-validates against current codebase
- Mechanism: for each `→ Confirmed:` assumption, run a quick grep/read to verify the cited evidence still holds
- If assumption is invalidated (codebase changed since clarify): flag as blocker, do not proceed to task generation
- Inspired by: GSD plan-phase injects prior CONTEXT.md (plan-phase.md:33)

### Execute-stage plan assumption check (build-execute addition)
- Before each wave, verify plan's referenced files still match expected state
- Mechanism: compare plan's `files_modified` targets against current file hashes
- If files changed since plan was written: warn (plan may be stale), offer re-plan or proceed with caution
- Inspired by: GSD execute regression gate (execute-phase.md:748-793)

### Goal-backward verification (build-quality or new stage)
- After execute passes mechanical checks (tsc/test/lint), verify the entity's GOAL was achieved
- Mechanism: re-read `## Acceptance Criteria` and `## Directive`, verify each criterion is met by the actual code changes (not just "tests pass")
- Stub/orphan detection: code exists but isn't wired into the runtime path
- Inspired by: GSD verify-phase goal-backward (verify-phase.md:7-18)

### Regression gate (build-quality addition)
- After execute, run tests from PRIOR shipped entities that touch overlapping files
- Mechanism: check CONTRACTS.md for file paths this entity modifies, find prior entities that also modified those paths, run their test suites
- If prior entity tests fail: block quality gate, route back to execute
- Inspired by: GSD execute regression gate (execute-phase.md:748-793)

## Acceptance Criteria

- [ ] Given explore produced an assumption citing `channel.ts:399` as evidence, when clarify starts, then it re-reads `channel.ts:399` and verifies the cited behavior still holds before presenting to captain
- [ ] Given two assumptions that contradict each other (A-1 says "daemon owns DB", A-3 says "shim has DB connection"), when clarify's consistency check runs, then it flags the contradiction as a new Open Question before presenting to captain
- [ ] Given explore surfaced 2 options that are semantically identical (rephrased versions), when clarify's option validity check runs, then it merges them and notes the dedup in the entity body
- [ ] Given explore missed a domain-template gray area that applies to the entity, when clarify's coverage check runs, then it adds the missing gray area as a new assumption or question
- [ ] Given researcher findings annotated on an assumption, when clarify re-validates, then it verifies the research conclusion still holds against current codebase (not just the timestamp)
- [ ] Given clarify self-verification passes with 0 issues, when captain sees the assumptions, then they are presented as pre-validated (captain decides, not verifies)
- [ ] Given a clarify-confirmed assumption citing file:line evidence, when build-plan starts, then it re-reads the cited file:line and verifies the evidence still holds
- [ ] Given a clarify assumption whose evidence is invalidated (file changed), when plan detects the mismatch, then it flags a blocker and halts task generation
- [ ] Given a plan with `files_modified` targets, when execute starts a wave, then it checks file hashes against plan-time state and warns if stale
- [ ] Given a completed execute stage, when quality runs, then it re-reads Acceptance Criteria and verifies each criterion is met by actual code (not just test pass)
- [ ] Given a completed execute that produced stub code, when goal-backward verification runs, then it detects the stub is not wired into runtime and flags it
- [ ] Given entity 052 modifying `spacebridge/src/daemon.ts`, when entity 053 executes and also touches that file, then regression gate runs 052's test suite to catch breakage
- [ ] Given a regression gate failure, when quality reports, then the failure is classified as cross-entity regression and routed back to execute with prior entity context

## References

- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate -- run prior phase test suites
- GSD `execute-phase.md:554-570`: Key-links verification between waves
- GSD `discuss-phase.md:492-496`: Prior decisions marked "revisit or keep?"
- GSD `plan-phase.md:33`: Prior CONTEXT.md injection for cross-phase consistency
- Entity 075 (research dispatch architecture): carries the principle, this entity carries the implementation
- `skills/build-plan/SKILL.md`: where plan-stage re-validation would be added
- `skills/build-execute/SKILL.md`: where execute-stage assumption check would be added
- `skills/build-quality/SKILL.md`: where goal-backward verification and regression gate would be added
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
