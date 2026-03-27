---
id: 049
title: Replace hardcoded CL references with captain/user in skills and artifacts
status: ideation
source: CL
started: 2026-03-26T00:00:00Z
completed:
verdict:
score: 0.65
worktree:
---

The refit skill has ~18 hardcoded "CL" references that should be "the captain" or "the user." The generated first-officer at .claude/agents/first-officer.md also has hardcoded "CL" (fixable by refit once the skill is fixed). Entity files using `source: CL` are data, not a code issue.

A second developer trying to use Spacedock shouldn't be addressed as "CL."
