---
id: 052
title: Replace "pipeline" with "workflow" where appropriate
status: ideation
source: CL
started: 2026-03-27T06:20:00Z
completed:
verdict:
score:
worktree:
---

Audit the codebase for uses of "pipeline" and replace with "workflow" where it refers to the user-facing concept. Spacedock creates workflows, not pipelines — the term "pipeline" is an implementation detail (the stages form a pipeline), but the user-facing abstraction is a "workflow."

Scope includes templates, skills, agent files, README, and generated output. Internal variable names and code comments that refer to the processing pipeline mechanism may be fine to keep.
