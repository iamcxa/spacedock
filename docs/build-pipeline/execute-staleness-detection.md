---
id: 080
title: "Execute-stage staleness detection -- file hash pre-check before wave dispatch"
status: draft
source: decomposition of entity 077 (cross-phase skepticism)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [075]
parent: 077
---

## Problem

Build-execute currently trusts that plan's `files_modified` targets are still in the expected state. Between plan and execute (or between waves), the codebase may change -- other entities shipping, FO daemon commits, manual edits. Execute dispatches task-executors against potentially stale files without warning.

## Scope

### Execute Wave Pre-Check

Insert a pre-check before each wave dispatch in build-execute:

- Compare plan's `files_modified` targets against current file state (git hash or content hash)
- If files unchanged: proceed silently
- If files changed: warn in execute output, offer proceed-with-caution (default) or halt for re-plan
- Staleness is a WARNING, not a blocker -- the captain (via FO routing) decides whether to re-plan

## Acceptance Criteria

- [ ] Given a plan with `files_modified` targets, when execute starts a wave, then the Wave Pre-check compares file hashes against plan-time state and warns if stale (how to verify: modify a files_modified target between plan and execute, run execute, verify staleness warning)

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-execute/SKILL.md`: insertion point for Wave Pre-check (before wave dispatch in Step 3+)
- GSD `execute-phase.md:748-793`: regression gate concept
