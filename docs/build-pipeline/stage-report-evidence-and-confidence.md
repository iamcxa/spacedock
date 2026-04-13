---
id: 085
title: "Stage Report evidence minimums + pre-ship confidence gate"
status: draft
source: decomposition of entity 074 (pipeline verification quality uplift)
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
parent: 074
---

## Problem

Stage Reports often contain checklist items marked DONE with minimal evidence ("all checks pass" without showing what was checked). No holistic confidence assessment before shipping — entities 051 (75%) and 052 (70%) shipped with known gaps. No debate-driven skill simulation exists.

## Scope

### Gap 3: Stage Report evidence minimums

Add "evidence minimum" rules to each stage skill's Rules section:
- Execute: per-task commit SHA, files changed count, test evidence per AC
- Quality: actual command output (first/last N lines), test count, fail details
- Review: classified findings table with file:line citations
- UAT: per-item evidence table with inline artifacts

### Gap 5: Debate-driven skill simulation (design decision)

For skill entities, UAT (or a new sub-step) dispatches 2+ ensigns that each load the new skill and interact. Example: one ensign plays "SO invoking build-distill", another plays "captain responding" with fixture answers. Interaction log becomes evidence. May be deferred if design complexity warrants.

### Gap 7: Pre-ship confidence gate

Insert confidence check between UAT and shipped. Five factors scored 0-100% (test coverage 25%, type coverage 20%, review severity 20%, AC completeness 20%, integration breadth 15%). If composite < 90%, auto-iterate: dispatch targeted fix ensigns, re-verify, re-score. Only advance to shipped when >= 90%.

## Acceptance Criteria

- [ ] Given a completed execute stage, when Stage Report is written, then it includes per-task commit SHA, files changed count, and at minimum 1 line of test evidence per AC (how to verify: read execute Stage Report, confirm evidence fields present)
- [ ] Given all 4 stage skills, when their Rules sections are read, then each has a documented "evidence minimum" requirement (how to verify: grep "evidence minimum" in execute/quality/review/uat SKILL.md Rules)
- [ ] Given a completed UAT with composite confidence < 90%, when the confidence gate fires, then it identifies which factors pull score down and dispatches targeted fix ensigns (how to verify: ship entity with low type coverage, observe auto-fix cycle before PR)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 082 (UAT evidence): confidence gate scores UAT evidence quality — depends-on
- Entity 083 (multi-language ratchet): confidence gate scores type/test coverage — depends-on
- `skills/build-execute/SKILL.md`: Stage Report evidence target
- `skills/build-quality/SKILL.md`: Stage Report evidence target
- `skills/build-review/SKILL.md`: Stage Report evidence target
- `skills/build-uat/SKILL.md`: Stage Report evidence + confidence gate target
