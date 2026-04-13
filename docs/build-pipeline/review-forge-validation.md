---
id: 084
title: "Review forge validation -- conditional forge audit + skill invocation testing"
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
scale: Small
project: spacedock
depends-on: [081]
parent: 074
---

## Problem

Skill entities ship without forge validation. Entity 068 created `skills/build-distill/SKILL.md` without forge audit, TDD, or invocation testing. The writing-skills verification was a manual afterthought. Entity 073 (review-skill-creation-discipline) describes this gap but is `status: draft` — never executed. This entity absorbs 073's scope.

## Scope

### Review: Conditional forge-audit sub-check

When the `execute_base..HEAD` diff contains `skills/*/SKILL.md`, build-review pre-scan adds a conditional check that runs `kc-plugin-forge` audit (frontmatter, structure, conventions, reference integrity). This is Step 1f in the pre-scan (after entity 081's Step 1e goal-backward verification).

### UAT: Skill invocation test item type

Build-uat gains a `type: skill-invocation` item type. When an entity's diff contains a skill file, UAT dispatches a bare invocation test — load the skill, verify it produces expected output shape. The "forge back half."

### Entity 073 absorption

Entity 073 (review-skill-creation-discipline, `status: draft`, `context_status: pending`) is a strict subset. Archive 073 when this entity is created.

## Acceptance Criteria

- [ ] Given a diff containing `skills/build-foo/SKILL.md`, when build-review pre-scan runs, then Step 1f fires a forge audit and reports findings (how to verify: create entity with SKILL.md change, observe forge audit in pre-scan output)
- [ ] Given a diff with NO skill files, when build-review pre-scan runs, then Step 1f is skipped silently (how to verify: run review on non-skill entity, confirm no forge check in output)
- [ ] Given a UAT spec with `type: skill-invocation`, when build-uat runs, then it loads the skill and verifies output shape (how to verify: create skill entity with skill-invocation UAT item, observe invocation test result)

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 073 (review-skill-creation-discipline): absorbed — archive on creation
- Entity 081 (goal-backward verification): Step 1e occupies the first conditional pre-scan slot; this entity uses Step 1f
- `skills/build-review/SKILL.md`: pre-scan Step 1 insertion target
- `skills/build-uat/SKILL.md`: new item type target
- `kc-plugin-forge` skill: forge audit capability
