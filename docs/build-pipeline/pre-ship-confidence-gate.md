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
---

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
