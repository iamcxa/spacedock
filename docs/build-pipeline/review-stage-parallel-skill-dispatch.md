---
id: 069
title: Review Stage -- Parallel Ensign Skill Dispatch
status: draft
context_status: pending
source: captain
created: 2026-04-12T21:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
---

## Directive

> Redesign the review stage dispatch from "single ensign loads build-review skill which tries to fan-out agents internally" to "FO analyzes diff scope and dispatches 1-10 ensigns in parallel, each loading a single pr-review-toolkit skill."

Current problem: build-review skill wants to dispatch parallel review agents (code-reviewer, silent-failure-hunter, comment-analyzer, etc.) but ensigns are subagents without the Agent tool. The fan-out is structurally unreachable.

New design:
- FO (which HAS Agent tool) analyzes the diff to determine relevant review facets
- FO dispatches 1-10 ensigns in parallel via Agent(), each loading one pr-review-toolkit skill
- Number of ensigns scales with diff scope (small diff = 2-3, large diff = 6-10)
- FO collects all ensign results and synthesizes into classified findings table + Stage Report
- Pre-scan (CLAUDE.md compliance, stale refs, plan consistency) stays inline in FO or as a dedicated ensign
- knowledge-capture stays as FO post-completion step

Skills to dispatch as individual ensigns:
- pr-review-toolkit:code-reviewer
- pr-review-toolkit:silent-failure-hunter
- pr-review-toolkit:comment-analyzer
- pr-review-toolkit:pr-test-analyzer
- pr-review-toolkit:type-design-analyzer
- pr-review-toolkit:code-simplifier

Trailofbits skills (when installed + applicable):
- differential-review:diff-review
- sharp-edges:sharp-edges
- variant-analysis:variant-analysis

Changes required:
1. Update `skills/build-review/SKILL.md` to document the new dispatch pattern
2. Update `docs/build-pipeline/README.md` review stage comments if needed
3. Update `references/first-officer-shared-core.md` or `references/claude-first-officer-runtime.md` if the FO dispatch adapter needs changes for multi-ensign parallel dispatch at review time

## Acceptance Criteria

- FO dispatches N ensigns in parallel for review (N based on diff analysis)
- Each ensign loads exactly one pr-review-toolkit skill via Skill tool
- FO synthesizes all ensign findings into a single classified Stage Report
- Works in both bare mode (sequential) and teams mode (parallel)
