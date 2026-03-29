---
id: 070
title: PR lifecycle timing and startup orphan detection
status: ideation
source: CL
started: 2026-03-28T12:00:00Z
completed:
verdict:
score: 0.80
worktree:
issue:
pr:
---

When a gated worktree stage (e.g., validation) is approved, the pr-merge mod should create the PR before advancing to the terminal stage. Currently the merge hook fires at the terminal stage, which means the entity is marked `done` while the PR is still open — semantically wrong. The entity should stay at its current stage until the PR merges.

The core problem: there's no metadata to distinguish "at a stage" vs "ready to transition to the next stage." The FO needs a way to know that a gated stage has been approved but the entity shouldn't advance yet because a PR is pending.

Additionally, startup orphan detection needs improvement. When the FO starts a new session, it should reliably detect entities with worktrees assigned but no active agents (crashed workers from previous sessions) and handle them — either re-dispatching or reporting to the captain.

## Seed Questions

- How should we represent "gate approved, PR pending" in entity state? New field? Status suffix? Convention in the pr-merge mod?
- The `gate` lifecycle hook (mentioned as "future" in the FO README) fires while waiting for captain approval — that's too early for PR creation. PR creation happens *after* approval. Do we need a `post-gate` or `transition` hook?
- CL noted: ideation is also gated but has nothing to PR. The solution must be stage-aware — only worktree stages with code to merge should trigger PR creation.
- For orphan detection: what's the right behavior? Auto-redispatch? Report and wait? Check worktree branch for stage reports first?
