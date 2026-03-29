---
id: 077
title: Add merge hook guardrail to prevent skipping mod hooks at merge time
status: ideation
source: 073 merge incident — FO skipped pr-merge hook and went straight to local merge
started: 2026-03-29T19:25:00Z
completed:
verdict:
score: 0.75
worktree:
---

When the captain approved 073 at the validation gate, the FO went straight to `git merge` without running the pr-merge mod's merge hook. The hook should have presented a PR summary and waited for push approval. Instead the entity was locally merged, archived, and cleaned up — bypassing the PR workflow entirely.

## Root cause

The merge hook step is a single sentence embedded in one of 5 branching paths in the gate approval flow:

> "Run merge hooks (from `_mods/`) here, before any status change."

The FO had been doing local merges all session (072 had no PR, 068/059 were startup PR detections). The local-merge pattern was grooved in, and the merge hook step didn't interrupt the flow.

## Proposed fix

Add a bold guardrail (matching the GATE APPROVAL and GATE IDLE guardrail pattern) that fires before any merge operation. Pull it out of the branching paths and make it a standalone check.

Also consider: a pre-merge checklist in the approve+terminal path to force the FO to verify hooks before proceeding.
