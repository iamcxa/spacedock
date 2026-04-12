---
id: 063
title: PR Review Loop Mod -- kc-pr-create Integration + Shipped Stage Closed-Loop
status: draft
context_status: pending
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

## Captain Context Snapshot

- **Repo**: main @ c299e5e
- **Session**: Entity 062 shipped (PR #28 merged), entities 063/064 drafted, Phase E audit 11/12 complete
- **Domain**: Runnable/Invokable, Behavioral/Callable, Readable/Textual
- **Related entities**: 062 -- Phase E Plan 4 Dogfood Trail of Bits (shipped), 064 -- Dashboard Mod Visibility (draft)
- **Created**: 2026-04-12T04:30:00Z

## Brainstorming Spec

**APPROACH**: Create `mods/pr-review-loop.md` as a skill-delegating mod with three hooks (startup, idle, merge) that replaces the hardcoded PR logic in `docs/build-pipeline/_mods/pr-merge.md`. The merge hook delegates PR creation entirely to `kc-pr-flow:kc-pr-create` via `Skill` tool — the mod provides the entity context (title, branch, files changed) but the skill owns branch push, PR formatting, and GitHub interaction. The idle hook polls PR state via `gh pr view --json state,reviewDecision`; on `changes_requested`, it delegates to `kc-pr-flow:kc-pr-review-resolve` for automated review comment triage and fix-forward routing back to the execute stage. On `MERGED`, it advances the entity to terminal stage and archives. The startup hook mirrors idle's PR state checks (defense in depth). The existing `pr-merge.md` gets a deprecation notice pointing to the new mod. The FO shared core's Merge and Cleanup section is updated to reference the new mod's skill delegation pattern.

**ALTERNATIVE**: Extend the existing `docs/build-pipeline/_mods/pr-merge.md` in-place by adding skill delegation calls and review loop logic to its existing hooks, keeping one mod file rather than creating a replacement. -- D-01 Rejected because: (a) pr-merge.md lives in `docs/build-pipeline/_mods/` while the canonical mod directory is `mods/` (where `workflow-index-maintainer.md` already lives), perpetuating the inconsistency; (b) the review closed-loop is genuinely new capability that would overload pr-merge's original "push and create PR" scope; (c) clean deprecation-then-replacement is safer than in-place surgery on a mod that existing documentation references.

**GUARDRAILS**:
- Captain approval guardrail MUST be preserved in the merge hook — present PR summary and wait for explicit captain approval before push/create (same pattern as current pr-merge.md)
- Thin wrapper principle — mod describes *when* to call skills and *what context to pass*, never re-implements skill logic (entity 062 lesson, MEMORY.md thin-wrapper-agent-pattern)
- Eventually-consistent error handling — mod errors must not block FO startup or entity dispatch (same pattern as workflow-index-maintainer error handling)
- Do not delete `pr-merge.md` — deprecation notice only; deletion deferred to a follow-up entity after one milestone cycle
- Mod frontmatter format must match `workflow-index-maintainer.md` (name, description, version fields)

**RATIONALE**: Creating a new mod in the canonical `mods/` directory with pure skill delegation is the cleanest path because it follows the validated thin wrapper pattern (entity 062), keeps the mod focused on orchestration rather than implementation, and treats the review closed-loop as a first-class capability rather than a bolt-on. The deprecation-then-replacement strategy avoids breaking existing documentation references while clearly signaling the migration path. The three-hook structure (startup/idle/merge) mirrors workflow-index-maintainer's proven pattern, giving FO a consistent interface for both mods.

## Acceptance Criteria

- AC1: `mods/pr-review-loop.md` exists with startup, idle, and merge hooks documented (how to verify: file exists, grep for `## Hook: startup`, `## Hook: idle`, `## Hook: merge`)
- AC2: merge hook specifies `kc-pr-flow:kc-pr-create` invocation via Skill tool, not raw `gh pr create` (how to verify: grep merge hook section for `kc-pr-flow:kc-pr-create`, confirm no `gh pr create` command)
- AC3: idle hook specifies `changes_requested` detection and routing to `kc-pr-flow:kc-pr-review-resolve` (how to verify: grep idle hook for `changes_requested` and `kc-pr-review-resolve`)
- AC4: `docs/build-pipeline/_mods/pr-merge.md` has deprecation notice with pointer to `mods/pr-review-loop.md` (how to verify: grep pr-merge.md for "deprecated" and "pr-review-loop")
- AC5: `references/first-officer-shared-core.md` Merge and Cleanup section references the new mod (how to verify: grep shared core for `pr-review-loop`)
