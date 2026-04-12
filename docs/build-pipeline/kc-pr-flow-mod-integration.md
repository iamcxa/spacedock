---
id: 063
title: PR Mod -- Integrate kc-pr-create Skill into Pipeline Shipped Stage
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

Replace the manual `gh pr create` flow in `docs/build-pipeline/_mods/pr-merge.md` with a new mod that delegates to the `kc-pr-flow:kc-pr-create` skill. The current `pr-merge.md` mod hardcodes PR creation logic that duplicates what `kc-pr-create` already handles (branch checks, PR format conventions, review integration). The new mod should invoke the skill via `Skill` tool, not re-implement PR creation.

Scope:
1. Create `docs/build-pipeline/_mods/kc-pr-flow.md` (or rename/replace `pr-merge.md`) with merge/idle/startup hooks that delegate to `kc-pr-create` for the actual PR creation step
2. Preserve the existing PR lifecycle tracking (startup/idle hooks for merged/closed state detection)
3. Ensure the skill invocation works from FO context (FO has Skill tool access)

Context: Entity 062 shipped via manual `gh pr create` because FO bypassed the mod flow entirely and didn't invoke `kc-pr-create`. This entity fixes both gaps.
