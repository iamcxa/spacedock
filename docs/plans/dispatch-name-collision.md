---
id: 051
title: First-officer must use unique ensign names per dispatch
status: ideation
source: https://github.com/clkao/spacedock/issues/1
started: 2026-03-27T05:50:00Z
completed:
verdict:
score:
worktree:
---

When the first officer dispatches agents using the Agent tool, it reuses the same name (e.g., `{agent}-{slug}`) across sequential dispatches for the same entity. This causes shutdown request collisions: a pending `shutdown_request` sent to agent name `X` gets delivered to a newly spawned agent that reuses name `X`, killing it immediately.

## Reproduction

1. First officer dispatches `ensign-my-task` for stage A
2. Stage A completes. First officer sends `shutdown_request` to `ensign-my-task`
3. Before shutdown is fully processed, first officer dispatches a new agent with the **same name** `ensign-my-task` for stage B
4. The queued shutdown request arrives and the new agent approves it, terminating itself

## Root Cause

`SendMessage` routes by agent **name**, not agent ID. Shutdown requests queue and get delivered to whatever agent currently holds that name. Reusing a name before the previous shutdown completes causes the new agent to inherit the pending shutdown.

## Fix

The first-officer template dispatch should include the stage name in the agent name:

```
name="{agent}-{slug}-{stage}"
```

This ensures each dispatch gets a fresh name with no inherited shutdown requests.

## Affected File

`templates/first-officer.md` — the dispatch section where the agent name is set.
