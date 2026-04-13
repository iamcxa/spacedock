---
id: 079
title: "Plan-stage assumption re-validation -- verify clarify evidence before task generation"
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
scale: Small
project: spacedock
depends-on: [075]
parent: 077
---

## Directive

> Build-plan currently trusts clarify-confirmed assumptions without verifying that the cited evidence still holds. Between clarify and plan, the codebase may have changed (other entities shipping, manual edits). Plan generates tasks based on potentially stale assumptions.
>
> Insert a new Step 0.5 in build-plan before Step 1 (Topic Extraction) that re-reads each clarify-confirmed assumption's `file:line` citation, verifies the evidence still matches, and either proceeds silently (evidence holds), warns (stale but plausible), or blocks (contradicted).
>
> Scope: `skills/build-plan/SKILL.md` Step 0.5 insertion only. References entity 075 (research dispatch) decisions as authoritative. Child of entity 077 (cross-phase skepticism).

## Captain Context Snapshot

- **Repo**: main @ be942e5
- **Session**: No recent session context (entity created via decompose(077) at 468882a)
- **Domain**: Runnable / Invokable, Organizational / Data-transforming
- **Related entities**: 077 -- Cross-phase skepticism validation gates (epic/awaiting-clarify), 075 -- Research dispatch architecture (plan/ready), 076 -- Clarify open exploration loop (plan/ready), 078 -- Clarify-stage explore re-validation (draft), 074 -- Pipeline verification quality uplift (draft/pending)
- **Created**: 2026-04-13T09:30:00Z

## Brainstorming Spec

**APPROACH**: Insert a Step 0.5 ("Assumption Evidence Re-Validation") in `skills/build-plan/SKILL.md` between the current preamble and Step 1 (Topic Extraction). Step 0.5 iterates over each `→ Confirmed:` annotation in the entity body, extracts the `file:line` citation from the original assumption's `Evidence:` field, re-reads that file region using `Read`, and compares the current content against the assumption's claim. Three outcomes: (a) **evidence holds** -- proceed silently, no annotation; (b) **evidence stale** -- file changed but the claim is still plausible (e.g., line numbers shifted but semantics preserved) -- emit a `⚠ stale-evidence:` warning in plan output and proceed with caution; (c) **evidence contradicted** -- file now demonstrates the opposite of the assumption's claim -- flag as blocker, halt task generation, write `feedback-to: captain` in the Stage Report with the specific contradiction. The gate uses fractional step numbering (0.5) following the pattern proven in entity 076 (Step 4.5 in build-clarify), ensuring no existing steps are renumbered.

**ALTERNATIVE**: Instead of a pre-Step-1 gate that blocks task generation, embed assumption re-validation as a check WITHIN Step 1 Topic Extraction -- as topics are extracted, each one that references a confirmed assumption gets an inline freshness check. If stale, the topic is flagged but task generation continues, producing a plan that includes remediation tasks for stale assumptions. -- D-01 Rejected: embedding in Step 1 mixes concerns (topic extraction + evidence validation) and produces plans that may be built on false premises. A contradicted assumption could generate tasks that solve the wrong problem. The pre-gate pattern is cleaner: validate inputs BEFORE processing them, consistent with how explore Step 3.7 validates brainstorm claims before generating questions.

**GUARDRAILS**:
- Fractional step numbering (Step 0.5) -- no renumbering of existing Steps 1-9 (proven pattern from entity 076 A-1)
- Entity 075 decisions are authoritative -- if researchers annotated findings on assumptions, Step 0.5 respects 075's dispatch architecture (SO orchestrates, hybrid annotation format) and does not re-implement research dispatch
- Staleness is a WARNING (proceed-with-caution), contradiction is a BLOCKER (halt) -- no ambiguous middle ground per parent 077 GUARDRAILS
- CONTRACTS.md is not involved in this entity -- assumption re-validation uses file:line citations from explore output, not cross-entity file ownership
- The skill runs as an ensign subagent -- it does NOT have `AskUserQuestion`. Escalation to captain happens via `feedback-to: captain` in Stage Report, and FO routes to captain

**RATIONALE**: The pre-gate approach is correct because it follows the "validate inputs before processing" principle that already exists in the pipeline: explore Step 3.7 validates brainstorm claims before generating questions. Step 0.5 generalizes this to the plan stage, validating clarify-confirmed assumptions before generating tasks. The fractional numbering is proven (entity 076), the three-outcome classification (hold/stale/contradicted) maps directly to the severity levels parent 077 defined, and the `feedback-to: captain` escalation path is the established ensign-to-FO-to-captain routing pattern. Embedding in Step 1 would produce plans contaminated by stale premises -- it's better to never start than to build on sand.

## Acceptance Criteria

- [ ] Given a clarify-confirmed assumption citing `file:line` evidence (e.g., `→ Confirmed: ... Evidence: skills/build-clarify/SKILL.md:91-108`), when build-plan Step 0.5 runs, then it re-reads the cited file region and verifies the content still supports the assumption's claim (how to verify: run build-plan on entity with confirmed assumptions containing file:line citations, confirm Step 0.5 log shows re-read of each citation)
- [ ] Given a clarify-confirmed assumption whose cited file has changed to contradict the claim (e.g., assumption says "Step 1 has no validation" but Step 1 now includes validation), when build-plan Step 0.5 detects the mismatch, then it writes a blocker in `## Stage Report: plan` with `feedback-to: captain` and halts task generation (how to verify: modify the cited file between clarify and plan execution, run build-plan, verify Stage Report contains blocker with contradiction detail and no `## PLAN` section was generated)
- [ ] Given a clarify-confirmed assumption whose cited file has shifted line numbers but the semantic claim still holds, when build-plan Step 0.5 runs, then it emits a `⚠ stale-evidence:` warning in plan output and proceeds with task generation (how to verify: reformat the cited file to shift line numbers without changing semantics, run build-plan, verify warning emitted AND plan generation continues)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- `skills/build-plan/SKILL.md`: insertion point for Step 0.5
- GSD `plan-phase.md:33`: prior CONTEXT.md injection for cross-phase consistency
