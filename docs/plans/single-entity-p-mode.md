---
id: 080
title: Single-entity -p mode for first-officer
status: backlog
source: CL
started:
completed:
verdict:
score:
worktree:
issue:
pr:
---

The first-officer currently assumes an interactive session with a captain. When invoked via `claude -p`, it needs to:

1. Accept a target entity slug in the prompt
2. Run that single entity through all stages
3. Print the final artifact (e.g., `answers.json`) to stdout
4. Exit cleanly — no waiting for captain, no idle loop

Possible approaches:

- A flag in the prompt: "Run {slug} through all stages and exit"
- A CLI-level feature: `claude -p --agent first-officer --entity {slug}`
- A spacedock mod or hook that intercepts the `-p` mode

The core change is in the first-officer template's event loop: after the target entity reaches done, instead of running `status --next` and waiting, it outputs the result and terminates.
