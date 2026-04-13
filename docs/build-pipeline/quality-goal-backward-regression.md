---
id: 081
title: "Goal-backward verification + regression gate -- semantic quality checks"
status: draft
context_status: pending
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

**APPROACH**: Implement two independent verification mechanisms that run post-execute. (1) **Goal-backward verification** as a new pre-scan check in build-review's Step 1 (pre-scan is already "inline in orchestrator context" and "judgment-bearing but rule-bound" per build-review SKILL.md:141,210). The check reads `## Acceptance Criteria` and `## Directive`, compares each criterion against the `execute_base..HEAD` diff, and flags unmet criteria or orphan code (functions/exports not imported by any runtime path in the diff). This runs BEFORE the parallel agent dispatch (Step 2), so its findings feed into the classification pipeline (Step 3) alongside agent findings. (2) **Regression gate** as a new Step 1.5 or Step 5.5 in build-quality -- purely mechanical (run tests, check exit code), consistent with quality's "no judgment" contract. It queries CONTRACTS.md for prior entities that modified overlapping files, collects their test suite paths, and runs `bun test {paths}`. Failure is a binary signal routed back to execute via `feedback-to: execute` in the Stage Report.

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

## Open Decisions (inherited from parent 077)

- **O-1**: Goal-backward placement -- build-review pre-scan (recommended) vs new "verify" stage vs quality step. Must be resolved during this entity's clarify.
- **Q-1**: Regression gate test mapping -- full test suite vs co-location glob vs CONTRACTS.md test tracking. Must be resolved during this entity's clarify.

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-quality/SKILL.md`: "mechanical, no judgment" -- regression gate fits, goal-backward does NOT
- `skills/build-review/SKILL.md`: "judgment-bearing" -- candidate for goal-backward placement; pre-scan (Step 1) runs inline before agent dispatch
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file ownership for regression gate scope
- GSD `verify-phase.md:7-18`: "Task completion ≠ Goal achievement" principle
- GSD `execute-phase.md:748-793`: Regression gate concept
