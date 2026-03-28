---
id: 065
title: Clarify implementation vs validation boundaries for experimental tasks
status: ideation
source: CL
started: 2026-03-28T00:25:00Z
completed:
verdict:
score:
worktree:
---

Experimental tasks (like 058 terminology-experiment) blur the line between implementation and validation. The implementer builds infrastructure (harness, scripts, fixtures), but the experiment results are the actual deliverable. When the validator is told to "run the experiment," it ends up doing implementation work — producing the deliverable rather than verifying it.

In 058, the validator found and fixed harness bugs (token counting, team name collision, relative paths), then ran experiments and produced findings. This violated the independence principle that the validator agent type was designed to enforce (task 061).

## What needs clarifying

1. **README stage definitions** — implementation produces the deliverable (code, experiment results, analysis). Validation verifies the deliverable is sound. Current wording focuses on "write the code" which doesn't obviously cover "run the experiment and report results."

2. **FO validation dispatch** — the FO writes the validator's dispatch prompt. The dispatch should reinforce "verify the deliverable, don't produce it." The 058 dispatch explicitly said "RUN the experiment" which overrode the validator's built-in constraints.

## Scope

Changes to README stage definitions and/or FO template validation instructions. Possibly validator template if wording needs tightening. No infrastructure changes.
