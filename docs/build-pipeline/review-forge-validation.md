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
context_status: pending
---

## Directive

> Skill entities ship without forge validation. Entity 068 created `skills/build-distill/SKILL.md` without forge audit, TDD, or invocation testing. The writing-skills verification was a manual afterthought. Entity 073 (review-skill-creation-discipline) describes this gap but is `status: draft` — never executed. This entity absorbs 073's scope. Two insertion points: (1) build-review pre-scan gains Step 1f — conditional forge audit when diff contains skill files. (2) build-uat gains `type: skill-invocation` item type for bare invocation testing.

## Captain Context Snapshot

- **Repo**: main @ 5615b60
- **Session**: Entity 081 (goal-backward verification) is in execute — it occupies Step 1e in build-review pre-scan; 084 uses Step 1f
- **Domain**: Runnable / Invokable, Readable / Textual
- **Related entities**: 073 -- Review Stage Skill Creation Discipline (draft/pending, absorbed by this entity), 081 -- Goal-backward verification (execute/ready, occupies Step 1e), 074 -- Pipeline Verification Quality Uplift (epic, parent)
- **Created**: 2026-04-13T14:00:00+08:00

## Brainstorming Spec

**APPROACH**: Two insertion points into existing pipeline skills. (1) Build-review pre-scan gains Step 1f: when the `execute_base..HEAD` diff contains `skills/*/SKILL.md`, dispatch `kc-plugin-forge` audit (frontmatter structure, naming conventions, reference integrity) and report findings as a conditional review sub-check. (2) Build-uat gains a `type: skill-invocation` item type: when an entity's diff contains a skill file, UAT dispatches a bare invocation test — load the skill and verify it produces expected output shape (not full E2E, just "does it load and respond"). Entity 073 is absorbed: its scope is a strict subset of this entity's review sub-check.

**ALTERNATIVE**: Instead of using `kc-plugin-forge` for the review check, build a custom skill validation checklist directly inside build-review (frontmatter parsing, file structure checks, naming convention validation). -- D-01 Rejected because kc-plugin-forge already implements comprehensive skill auditing; duplicating its logic in build-review creates maintenance burden and divergence risk.

**GUARDRAILS**:
- Entity 081 occupies Step 1e (goal-backward verification); this entity uses Step 1f — do not alter Step 1e
- Build-review pre-scan must remain conditional — forge audit only fires when diff contains `skills/*/SKILL.md`; no overhead on non-skill entities
- Skill-invocation UAT items must gracefully degrade if the skill requires interactive input (Class 3 skills); structural validation (loads, frontmatter, references) is the baseline
- Entity 073 must be archived (`status: archived`) when this entity's work begins, to prevent scope confusion
- `kc-plugin-forge` is an external dependency — if unavailable, the review sub-check should warn, not block

**RATIONALE**: Leveraging kc-plugin-forge for the review-side check is the natural choice because it was designed exactly for skill auditing (frontmatter validation, structure checking, convention enforcement). Building a custom validator would duplicate existing capability. The two-prong strategy (review checks "was discipline followed?" while UAT checks "does the skill actually work?") creates defense in depth — review catches structural violations, UAT catches runtime failures.

## Acceptance Criteria

- [ ] Given a diff containing `skills/build-foo/SKILL.md`, when build-review pre-scan runs, then Step 1f fires a forge audit and reports findings (how to verify: create entity with SKILL.md change, observe forge audit in pre-scan output)
- [ ] Given a diff with NO skill files, when build-review pre-scan runs, then Step 1f is skipped silently (how to verify: run review on non-skill entity, confirm no forge check in output)
- [ ] Given a UAT spec with `type: skill-invocation`, when build-uat runs, then it loads the skill and verifies output shape (how to verify: create skill entity with skill-invocation UAT item, observe invocation test result)
- [ ] Given entity 073, when entity 084 execution begins, then 073 is archived with `status: archived` and a note referencing absorption by 084 (how to verify: read entity 073 frontmatter after 084 execution starts)

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
