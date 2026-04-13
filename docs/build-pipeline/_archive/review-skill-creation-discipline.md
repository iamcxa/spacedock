---
id: 073
title: Review Stage -- Skill Creation Discipline Check (Distill writing-skills into review)
status: archived
context_status: pending
source: captain observation during 068 UAT
created: 2026-04-12T16:05:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
auto_advance:
parent:
children:
---

> **Archived 2026-04-13**: Scope absorbed by entity 084 (review-forge-validation). Entity 084's Step 1f (conditional forge audit) and test existence sub-check subsume 073's skill creation discipline checks.

## Directive

> When an entity creates or modifies a skill (files under `skills/*/SKILL.md`), the review stage should verify that `superpowers:writing-skills` TDD discipline was followed. Currently, entity 068 created `skills/build-distill/SKILL.md` without any skill smoke tests, frontmatter validation, or invocation verification — and the review stage didn't flag this.

### Gap identified

- `superpowers:writing-skills` defines a TDD discipline for skill creation: write tests first, verify loading, verify invocation
- The build pipeline's review stage (`build-review` SKILL.md) has no checklist item for skill creation discipline
- Entity 068 (build-distill) created a new skill without following writing-skills TDD, and review passed without flagging it

### What this entity should do

1. Add a conditional review check to `build-review` SKILL.md: when the diff contains files matching `skills/*/SKILL.md`, run skill-specific verification:
   - Frontmatter validation (name, description match conventions)
   - Skill loads without error (`Skill: "{name}" --help` or equivalent)
   - Smoke test exists (`skills/*/tests/` or inline test)
2. Distill the key `superpowers:writing-skills` checks into a review sub-checklist
3. This should NOT require the full writing-skills workflow during review �� just verification that it WAS followed during execute

### Context

- Entity 068 as the exemplar of the gap (SKILL.md created without TDD)
- Entity 067 (TDD discipline) added `test_first` to task-execution but not to skill creation
- `superpowers:writing-skills` is the source discipline to distill from

## Acceptance Criteria

- When review stage detects `skills/*/SKILL.md` in diff, a skill discipline checklist fires (how to verify: create a test entity that modifies a SKILL.md and observe review output)
- The checklist includes at minimum: frontmatter validation, load verification, smoke test existence check (how to verify: grep checklist items in build-review SKILL.md)
