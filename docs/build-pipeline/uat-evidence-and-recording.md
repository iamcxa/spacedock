---
id: 082
title: "UAT evidence and recording -- CLI e2e recording + inline evidence writing"
status: draft
source: decomposition of entity 074 (pipeline verification quality uplift)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 074
---

## Problem

Build-uat captures CLI item evidence as text-only stdout snippets. No terminal recordings (.cast files). Entity files reference evidence by path, not inline — captain must manually open files to evaluate UAT pass/fail.

## Scope

### Gap 1: CLI items should trigger e2e-flow recording

Build-uat SKILL.md Step 2b should invoke `e2e-pipeline:e2e-flow` with `type: cli` before running the command, and `e2e-pipeline:e2e-test` to capture the recording. Fallback: if e2e-pipeline not installed, proceed with text-only evidence.

### Gap 2: E2E evidence written inline into entity

UAT Results section should include inline screenshot references (markdown image syntax), asciinema embeds or transcript snippets, and structured `## E2E Evidence` section. Entity file alone must be sufficient to evaluate UAT pass/fail.

## Acceptance Criteria

- [ ] Given a CLI UAT item, when build-uat Step 2b runs with e2e-pipeline available, then it produces a .cast recording file AND text evidence (how to verify: run a CLI UAT item, check for .cast file in artifacts alongside stdout capture)
- [ ] Given a completed UAT stage, when the entity file is read, then evidence is inline (markdown images for browser items, transcript blocks for CLI items) not just path references (how to verify: read entity file after UAT, see rendered evidence without opening external files)
- [ ] Given e2e-pipeline is not installed, when a CLI UAT item runs, then it falls back to text-only evidence with no error (how to verify: run UAT without e2e-pipeline, confirm graceful fallback)

## References

- Parent entity 074: pipeline verification quality uplift
- `skills/build-uat/SKILL.md`: Steps 2b and 5 are the insertion targets
- `e2e-pipeline` skill: CLI flow recording capability
