---
id: 022
title: Workflow Location Architecture — Definition vs Entity Split Paths
status: explore
source: captain discussion (session 2026-04-07)
started:
completed:
verdict:
score: 0.6
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None (architectural discussion, can proceed independently)

## Brainstorming Spec

APPROACH:     Split workflow files into two locations: workflow definition (README.md + _mods/) in user-scoped `~/.claude/workflows/build-pipeline/`, entity files in project-local `{project_root}/.spacedock/pipeline/`. Dashboard uses `--root` to find entities, FO uses user-scoped path for workflow definition. Requires status tool and FO both support split paths.
ALTERNATIVE:  (A) Keep everything project-local (current) — works but `/build` only runs in spacedock repo, no cross-project pipelines. (B) Move everything user-scoped — entity isolation lost, all projects mixed together. (C) Symlink — direction-dependent, fragile.
GUARDRAILS:   Existing API compatibility (dashboard, status tool, FO). Entity isolation per project must be preserved. Daemon state already uses `~/.spacedock/` — align with that convention. Must work with git worktree dispatch model.
RATIONALE:    Captain identified this tension: the current project-local setup means `/build` only discovers workflows in the spacedock repo. For cross-project use (Carlove, Recce), the workflow definition needs to be user-scoped while entities remain project-local. Partial decisions already exist: daemon state is user-scoped, skills/build/SKILL.md references `~/.claude/workflows/`, and the standalone plugin plan says "skill in plugin, workflow data in project."

## Design Tension Matrix

| Aspect | Project-local (current) | User-scoped | Hybrid (proposed) |
|--------|------------------------|-------------|-------------------|
| Dashboard finds entities | ✅ --root direct | ❌ needs discovery change | ✅ entities stay project-local |
| Worktree location | ✅ same repo .worktrees/ | ❓ which project? | ✅ project-local worktrees |
| Cross-repo /build | ❌ only spacedock | ✅ any repo discovers | ✅ definition user-scoped |
| Entity isolation | ✅ per project | ❌ all mixed | ✅ per project |

## Acceptance Criteria

- Workflow definition (README.md + _mods/) discoverable from any project via user-scoped path
- Entity files remain in project-local directory ({project_root}/.spacedock/pipeline/ or similar)
- Dashboard `--root` entity discovery unchanged
- Status tool supports split definition/entity paths
- FO startup discovers definition from user-scoped, entities from project-local
- Existing build pipeline entities migrate cleanly
- `/build` skill works from any project repo
