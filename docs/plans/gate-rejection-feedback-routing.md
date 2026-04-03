---
id: 086
title: Gate rejection paths don't route to Feedback Rejection Flow
status: backlog
source: github issue #22 (observed in task 080)
started:
completed:
verdict:
score: 0.6
worktree:
issue: "#22"
pr:
---

When the captain rejects at a validation gate with `feedback-to`, the FO follows the generic "Reject + redo" path instead of entering the Feedback Rejection Flow. It shuts down both agents and dispatches fresh ones sequentially, instead of keeping the implementer alive and routing findings to it.

The gate resolution paths in `references/first-officer-shared-core.md` need an explicit entry for `feedback-to` stages that takes priority over generic redo.

See issue #22 for full analysis. Also related to the rejection flow E2E test flakiness observed in 084 validation — the FO sometimes stops at rejection instead of auto-bouncing.
