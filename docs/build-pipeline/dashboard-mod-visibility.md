---
id: 064
title: Dashboard -- Mod Visibility in Pipeline UI
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

The dashboard pipeline visualization (stage graph) currently shows only stages -- mods (`_mods/*.md`) are invisible in the UI. Users cannot tell which mods are registered or which hooks they provide by looking at the dashboard.

Add mod visibility to the pipeline UI:
1. Show registered mods alongside the stage graph (e.g., as annotations, sidebar items, or hook indicators on stages)
2. For each mod, display which hook types it provides (startup, idle, merge)
3. Optionally show mod status (last fired, error state)

The pipeline graph already reads stage definitions from README.md frontmatter. Mods are discovered by scanning `_mods/*.md` for `## Hook:` sections -- the same discovery logic FO uses at startup.

Context: Captain observed that the build-pipeline dashboard shows 10 stages with counts and feedback arrows, but zero indication that `pr-merge.md` and `workflow-index-maintainer.md` mods exist and actively participate in the workflow lifecycle.
