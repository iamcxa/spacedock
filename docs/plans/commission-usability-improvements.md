---
title: Commission Usability Improvements
status: ideation
source: testflight-001 feedback
started:
completed:
verdict:
score:
---

## Problem

The commission skill drops the user straight into questions without any greeting or context. After generation and pilot run, it doesn't tell the user what to do next — specifically how to launch a fresh session with the first-officer agent to continue working the pipeline.

## Proposed Improvements

1. **Greet on invocation** — When `/spacedock commission` is invoked, greet the user and briefly explain what's about to happen before asking the first question.

2. **Post-completion guidance** — After the pilot run (or after generation if the pilot run is skipped/fails), tell the user how to launch a new session with the first-officer agent. Something like: "To continue working this pipeline, start a new Claude Code session and run with the first-officer agent."

## Acceptance Criteria

- [ ] Commission skill greets the user on invocation before asking Question 1
- [ ] After Phase 3 completes, the skill tells the user how to launch a fresh session with first-officer
- [ ] Instructions are specific and actionable (exact command or agent name to use)
