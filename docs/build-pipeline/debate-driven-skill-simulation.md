---
id: 088
title: "Debate-driven skill simulation -- role-play ensign dispatch for skill testing"
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
depends-on: []
parent: 085
---

## Problem

Skill entities ship without interaction testing. Entity 068 created build-distill SKILL.md without any verification that the skill works in a real interaction flow. Structural validation (forge audit from entity 084) and runtime smoke tests catch loading errors but not interaction failures.

## Scope

For skill entities, UAT (or a new sub-step) dispatches 2+ ensigns that each load the new skill and interact. Example: one ensign plays "SO invoking build-distill", another plays "captain responding" with fixture answers. Interaction log becomes evidence. May be deferred if design complexity warrants -- this entity is the design + implementation scope.

## Acceptance Criteria

- [ ] Given a skill entity in UAT, when debate-driven simulation fires, then 2+ ensigns are dispatched to role-play skill interaction and the interaction log is captured as evidence (how to verify: run UAT on skill entity, observe simulation dispatch and interaction log in UAT Results)
- [ ] Given a Class 3 (captain-interactive) skill, when simulation runs, then the "captain" ensign uses fixture answers from the entity's own clarify Q&A history (how to verify: observe fixture answers in simulation log match the entity's clarify decisions)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- Entity 084 (review forge validation): structural validation is the "front half"; this entity is deeper interaction testing
- `skills/build-uat/SKILL.md`: simulation dispatched from UAT stage
- `skills/build-review/SKILL.md`: debate-driven reviewer pattern as architectural precedent
