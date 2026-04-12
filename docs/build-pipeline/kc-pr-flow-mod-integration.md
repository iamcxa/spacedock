---
id: 063
title: PR Review Loop Mod -- kc-pr-create Integration + Shipped Stage Closed-Loop
status: draft
context_status:
source: captain
created: 2026-04-12T04:30:00Z
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
profile:
auto_advance:
parent:
children:
---

## Directive

Implement `mods/pr-review-loop.md` -- the shipped stage closed-loop mod required by Phase E spec (line 950, Success Criterion #5). This mod replaces the manual `gh pr create` flow in `docs/build-pipeline/_mods/pr-merge.md` with a skill-delegating design that uses `kc-pr-flow:kc-pr-create` for PR creation and adds a review closed-loop (PR state polling, review comment triage, fix-forward routing).

### Why this entity exists

1. **Spec gap**: Phase E Success Criterion #5 requires two mods -- `workflow-index-maintainer` (shipped) and `pr-review-loop` (not yet created). This is the only remaining Phase E gap.
2. **Entity 062 lesson**: FO bypassed the mod flow entirely during shipped stage, manually calling `gh pr create` instead of delegating to a mod + skill. The current `pr-merge.md` mod hardcodes PR creation logic that duplicates what `kc-pr-create` already handles.
3. **Thin wrapper principle**: Mods should be skill callers, not skill re-implementations (same design principle as the thin wrapper agent pattern from entity 062).

### Scope

1. **Create `mods/pr-review-loop.md`** with three hooks:
   - `merge` hook: delegate to `kc-pr-flow:kc-pr-create` skill for PR creation (branch push, PR format, review integration). Captain approval guardrail preserved.
   - `idle` hook: poll PR state via `gh pr view`. On `MERGED` -> advance entity to terminal stage + archive. On `changes_requested` -> route review comments back to execute via feedback-to. On `CLOSED` without merge -> report to captain.
   - `startup` hook: same PR-state checks as idle (defense in depth).

2. **Deprecate `docs/build-pipeline/_mods/pr-merge.md`**: Add a deprecation notice pointing to `mods/pr-review-loop.md`. Do not delete yet -- existing workflows may reference it. Delete in a follow-up entity after one milestone cycle.

3. **Review comment triage** (the "closed-loop" part): When idle hook detects `changes_requested`, use `kc-pr-flow:kc-pr-review-resolve` skill to triage review comments, validate fixes, and push updates. This is the feedback loop that `pr-merge.md` lacks entirely.

4. **FO shared core alignment**: Ensure `references/first-officer-shared-core.md` Merge and Cleanup section references the new mod and its skill delegation pattern.

### Acceptance Criteria

- AC1: `mods/pr-review-loop.md` exists with startup, idle, and merge hooks
- AC2: merge hook invokes `kc-pr-flow:kc-pr-create` via Skill tool (not raw `gh pr create`)
- AC3: idle hook detects `changes_requested` and routes to `kc-pr-flow:kc-pr-review-resolve`
- AC4: `docs/build-pipeline/_mods/pr-merge.md` has deprecation notice
- AC5: Phase E spec Success Criterion #5 fully satisfied (both mods exist)

### Context

- Phase E spec: `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` line 950
- Current shipped stage design: `docs/build-pipeline/README.md` lines 123-127
- Existing mod: `docs/build-pipeline/_mods/pr-merge.md` (version 0.8.2)
- Skills to integrate: `kc-pr-flow:kc-pr-create`, `kc-pr-flow:kc-pr-review-resolve`
- Entity 062 lesson: FO skipped mod flow, manually created PR #28
