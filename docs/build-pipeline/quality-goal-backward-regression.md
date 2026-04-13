---
id: 081
title: "Goal-backward verification + regression gate -- semantic quality checks"
status: draft
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

## Problem

Quality currently runs mechanical checks (tsc/test/lint/build) but does NOT verify whether the entity's GOAL was achieved. Tests passing doesn't mean the Acceptance Criteria are met -- code could be a stub, orphaned, or not wired into runtime. Additionally, no regression gate exists: execute may break prior entity functionality without detection.

## Scope

### Goal-Backward Verification

After execute passes mechanical checks, verify the entity's goal was achieved:

- Re-read `## Acceptance Criteria` and `## Directive`
- Verify each criterion is met by the actual code changes (not just "tests pass")
- Detect stub/orphan code: exists but isn't imported or wired into runtime path
- **Placement decision**: explore identified that quality is explicitly "mechanical, no judgment" -- goal-backward requires judgment. O-1 recommends placing this in build-review's pre-scan (review is "judgment-bearing") rather than quality. This must be resolved during clarify.

### Regression Gate

After execute, run tests from PRIOR shipped entities that touch overlapping files:

- Check CONTRACTS.md for file paths this entity modifies
- Find prior entities that also modified those paths
- Run their test suites (or the full test suite -- mapping strategy TBD per Q-1)
- If prior entity tests fail: block quality gate, route back to execute
- This IS mechanical (run tests, check pass/fail) and fits quality's contract

## Acceptance Criteria

- [ ] Given a completed execute stage, when goal-backward verification runs, then it re-reads each Acceptance Criterion and verifies it is met by actual code changes (how to verify: run verification on entity, confirm per-criterion output)
- [ ] Given a completed execute that produced stub code not wired into runtime, when goal-backward verification runs, then it detects the orphan and flags it (how to verify: create entity where execute writes a function never imported, verify orphan detection)
- [ ] Given entity modifying `daemon.ts` (also modified by prior entity 052), when regression gate runs, then it finds 052 via CONTRACTS.md and runs 052's test suite (how to verify: run on entity with overlapping CONTRACTS.md entries, verify prior test suite execution)
- [ ] Given a regression gate failure, when the gate reports, then the failure is classified as cross-entity regression and routed back to execute with prior entity context (how to verify: create scenario where prior entity test fails, verify routing to execute with regression classification)

## Open Decisions (inherited from parent 077)

- **O-1**: Goal-backward placement -- build-review pre-scan (recommended) vs new "verify" stage vs quality step. Must be resolved during this entity's clarify.
- **Q-1**: Regression gate test mapping -- full test suite vs co-location glob vs CONTRACTS.md test tracking. Must be resolved during this entity's clarify.

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-quality/SKILL.md`: "mechanical, no judgment" -- regression gate fits, goal-backward does NOT
- `skills/build-review/SKILL.md`: "judgment-bearing" -- candidate for goal-backward placement
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate concept
