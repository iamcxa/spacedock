---
id: 087
title: "Pre-ship confidence gate -- 5-factor scoring with auto-fix loop"
status: draft
source: decomposition of entity 085 (stage report evidence and confidence)
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
depends-on: [082, 083]
parent: 085
context_status: pending
---

## Directive

> No holistic confidence assessment before shipping -- entities 051 (75%) and 052 (70%) shipped with known gaps. FO advances directly from UAT pass to shipped without scoring quality factors. Insert confidence check between UAT pass and shipped advance. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). Composite < 90% triggers auto-fix dispatch. Cap at 3 iterations, then escalate to captain.

## Captain Context Snapshot

- **Repo**: main @ 7e1e213
- **Session**: Entity 086 (evidence minimums) just completed clarify; continuing SO pipeline to 087
- **Domain**: Behavioral / Callable, Runnable / Invokable
- **Related entities**: 085 -- Stage Report evidence + confidence gate (epic, parent), 082 -- UAT evidence (clarify/ready, dependency), 083 -- Multi-language ratchet (clarify/ready, dependency), 086 -- Evidence minimums (clarify/ready, sibling)
- **Created**: 2026-04-13T16:15:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the confidence gate as FO routing logic in the UAT→shipped transition (per parent 085 explore O-1 recommendation). After UAT verdict = pass, FO reads Stage Reports from all prior stages (execute, quality, review, UAT) and computes a composite confidence score from 5 weighted factors: (1) test coverage 25% -- from quality Stage Report test count and entity 083's ratchet baselines, (2) type coverage 20% -- from quality Stage Report type-check results and 083's ratchet, (3) review severity 20% -- from review Stage Report classified findings (0 CRITICAL/HIGH = 100%, scale down by count), (4) AC completeness 20% -- from UAT Stage Report item pass rates and goal-backward findings, (5) integration breadth 15% -- from execute Stage Report files_modified coverage vs PLAN files_modified. If composite >= 90%, advance to shipped. If < 90%, identify the lowest-scoring factor, dispatch a targeted fix (re-enter execute with a generated fix task), then re-run quality→review→UAT→confidence for the fix. Cap at 3 iterations before escalating to captain with per-factor breakdown.

**ALTERNATIVE**: Instead of FO routing logic, create a dedicated "confidence" pipeline stage with its own skill and ensign, inserted between UAT and shipped in the profile definition. -- D-01 Rejected because adding a pipeline stage changes the stage graph, profile definitions, FO routing, and status script -- high blast radius for what is essentially a scoring computation that reads existing Stage Reports. FO routing keeps the check invisible to the stage graph while still being load-bearing.

**GUARDRAILS**:
- Confidence gate reads existing Stage Reports -- it does NOT re-run any checks. All data comes from prior stage outputs.
- Auto-fix dispatch re-enters the pipeline at execute with a generated task. It does NOT skip stages -- the fix flows through execute→quality→review→UAT→confidence normally.
- 3-iteration cap is hard -- no "just one more try" rationalization. Captain escalation on 3rd attempt is mandatory.
- Factor weights (25/20/20/20/15) are configurable in ops.config.json, not hardcoded in FO routing logic.
- Depends on entity 082 (UAT evidence format) and entity 083 (ratchet baselines) -- confidence gate cannot ship before these dependencies land.

**RATIONALE**: FO routing is correct because the confidence gate is a transition guard, not a pipeline stage. It reads already-produced Stage Report data and computes a score -- it does not execute commands, dispatch agents, or produce its own Stage Report. A pipeline stage would add cold-start context cost, stage graph complexity, and profile changes for a computation that is naturally a pre-transition check. The UAT→shipped transition is FO-owned (build-uat SKILL.md:186), making FO routing the architecturally natural insertion point.

## Acceptance Criteria

- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)
- [ ] Given the confidence gate auto-fix has iterated 3 times without reaching 90%, when the 3rd attempt completes, then the gate escalates to captain with a per-factor breakdown instead of retrying (how to verify: create scenario with persistent gap, observe escalation after 3 attempts)
- [ ] Given a completed UAT with composite confidence >= 90%, when the confidence gate fires, then it advances to shipped without blocking (how to verify: ship entity with full test + type coverage, observe direct advance)
- [ ] Given confidence gate factor weights in ops.config.json, when the weights are modified, then the gate uses the updated weights on the next run (how to verify: change weights in ops.config.json, re-run confidence gate, observe different composite score)

## Problem

No holistic confidence assessment before shipping -- entities 051 (75%) and 052 (70%) shipped with known gaps. FO advances directly from UAT pass to shipped without scoring quality factors.

## Scope

Insert confidence check between UAT pass and shipped advance. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). If composite < 90%, auto-iterate: dispatch targeted fix ensigns, re-verify, re-score. Only advance to shipped when >= 90%. Cap auto-fix at 3 iterations before escalating to captain.

## Acceptance Criteria

- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)
- [ ] Given the confidence gate auto-fix has iterated 3 times without reaching 90%, when the 3rd attempt completes, then the gate escalates to captain with a per-factor breakdown instead of retrying (how to verify: create scenario with persistent gap, observe escalation after 3 attempts)
- [ ] Given a completed UAT with composite confidence >= 90%, when the confidence gate fires, then it advances to shipped without blocking (how to verify: ship entity with full test + type coverage, observe direct advance)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- Entity 082 (UAT evidence): confidence gate scores UAT evidence quality -- depends-on
- Entity 083 (multi-language ratchet): confidence gate scores type/test coverage -- depends-on
- `skills/build-uat/SKILL.md`: UAT verdict consumed by confidence gate
- `docs/build-pipeline/README.md`: shipped stage transition documentation
