---
id: 079
title: "Plan-stage assumption re-validation -- verify clarify evidence before task generation"
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
scale: Small
project: spacedock
depends-on: [075]
parent: 077
---

## Problem

Build-plan currently trusts clarify-confirmed assumptions without verifying that the cited evidence still holds. Between clarify and plan, the codebase may have changed (other entities shipping, manual edits). Plan generates tasks based on potentially stale assumptions.

## Scope

### Plan Step 0.5: Clarify Assumption Re-Validation

Insert a new Step 0.5 in build-plan before Step 1 (Topic Extraction):

- For each `→ Confirmed:` assumption in the entity body, re-read the cited `file:line` evidence
- If evidence still holds: proceed (no annotation needed)
- If evidence is stale (file changed but claim still plausible): warn in plan output, proceed with caution
- If evidence is contradicted (file now says the opposite): flag as blocker, halt task generation, write `feedback-to: captain` in Stage Report

## Acceptance Criteria

- [ ] Given a clarify-confirmed assumption citing file:line evidence, when build-plan Step 0.5 runs, then it re-reads the cited file:line and verifies the evidence still holds (how to verify: run build-plan on entity with confirmed assumptions, confirm re-read log)
- [ ] Given a clarify assumption whose evidence is invalidated (file changed since clarify), when plan Step 0.5 detects the mismatch, then it flags a blocker and halts task generation (how to verify: modify cited file between clarify and plan, run plan, verify blocker output)

## References

- Parent entity 077: cross-phase skepticism validation gates
- Entity 075 (research dispatch): authoritative decisions on researcher dispatch
- `skills/build-plan/SKILL.md`: insertion point for Step 0.5
- GSD `plan-phase.md:33`: prior CONTEXT.md injection for cross-phase consistency
