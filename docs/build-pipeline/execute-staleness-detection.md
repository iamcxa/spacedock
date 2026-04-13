---
id: 080
title: "Execute-stage staleness detection -- file hash pre-check before wave dispatch"
status: draft
context_status: pending
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

## Directive

> Build-execute currently trusts that plan's `files_modified` targets are still in the expected state. Between plan and execute (or between waves), the codebase may change -- other entities shipping, FO daemon commits, manual edits. Execute dispatches task-executors against potentially stale files without warning.
>
> Insert a pre-check before each wave dispatch in build-execute that compares plan's `files_modified` targets against current file state (git hash or content hash). Staleness is a WARNING, not a blocker -- the captain (via FO routing) decides whether to re-plan.

## Captain Context Snapshot

- **Repo**: main @ 232efb3
- **Session**: No recent session context (entity created via decompose(077) at 468882a)
- **Domain**: Runnable / Invokable
- **Related entities**: 077 -- Cross-phase skepticism validation gates (epic/awaiting-clarify), 075 -- Research dispatch architecture (plan/ready), 079 -- Plan-stage assumption re-validation (clarify/ready), 078 -- Clarify-stage explore re-validation (draft)
- **Created**: 2026-04-13T10:15:00Z

## Brainstorming Spec

**APPROACH**: Insert a per-wave staleness pre-check inside build-execute's Step 4 wave loop. Before dispatching wave N's tasks, compare each task's `files_modified` targets against a baseline git state using `git diff --name-only {baseline} -- {file}`. The baseline for wave 0/1 is the plan-approval commit SHA (captured from `## Stage Report: plan` or the most recent `chore(plan):` commit in git log). For wave N>1, the baseline advances to the post-wave-(N-1) commit SHA (the serial commit from the prior wave's last task), so that expected intra-entity modifications by earlier waves don't trigger false positives. Two outcomes: (a) **files unchanged** -- proceed silently; (b) **files changed** -- emit a `⚠ stale-files: {list}` warning in execute output, log to Stage Report, and proceed with caution (default behavior -- staleness is a warning, not a blocker per parent 077 GUARDRAILS).

**ALTERNATIVE**: Check staleness once at stage entry (new Step 2.5) rather than per-wave -- a single `git diff` between plan-approval SHA and current HEAD for all `files_modified` across the entire plan. -- D-01 Rejected: single entry check misses inter-wave drift. FO daemon commits and parallel entity execution can modify files between waves. Per-wave checking at the narrowest window catches drift that a one-shot entry check would miss. The per-wave approach is also consistent with how wave dependency checks already work (Step 1 validates `read_first` paths per wave, not globally).

**GUARDRAILS**:
- Staleness is a WARNING (proceed-with-caution), not a blocker -- per parent 077 GUARDRAILS. Execute does NOT halt on stale files; captain (via FO routing) decides whether to re-plan
- Per-wave baseline advancement: wave N compares against post-wave-(N-1) state, not plan-time state, to avoid false positives from intra-entity modifications
- Binary git hash comparison only (parent 077 A-4) -- no semantic/LLM judgment. Files either changed or they didn't
- Do not modify wave topology or task ordering based on staleness detection -- that's plan ensign's job via `feedback-to: plan`
- Entity 075 decisions are authoritative -- staleness pre-check does not re-implement research dispatch

**RATIONALE**: Per-wave checking is correct because the execute stage's fundamental unit of work is the wave, not the stage. Each wave starts with a known baseline (prior wave's commits or plan-approval SHA), and the staleness check verifies that external changes haven't invalidated the assumptions task-executors will operate under. The binary git hash comparison is appropriate here (unlike 079's semantic comparison) because execute operates on files, not claims -- if a file changed, the task should know, regardless of whether the change is semantically compatible. The one-shot alternative misses inter-wave drift, which is a real risk in daemon-driven execution where FO ships other entities concurrently.

## Acceptance Criteria

- [ ] Given a plan with `files_modified` targets, when execute starts wave 1, then the pre-check compares each target file's current git hash against the plan-approval commit SHA and warns if any file changed (how to verify: modify a `files_modified` target between plan and execute, run execute, verify `⚠ stale-files:` warning in output listing the changed file)
- [ ] Given wave 1 completed and modified `src/server.ts`, when execute starts wave 2 with a task targeting `src/config.ts`, then the pre-check uses wave 1's final commit SHA as baseline, not plan-approval SHA (how to verify: confirm wave 2 pre-check does not flag `src/server.ts` as stale despite it changing since plan-time)
- [ ] Given a stale file detected, when the warning is emitted, then execute proceeds with task dispatch (not halted) and the staleness is logged in `## Stage Report: execute` (how to verify: run execute with stale files, verify tasks still execute AND Stage Report contains stale-files warning)

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-execute/SKILL.md`: insertion point for per-wave pre-check (Step 4 wave loop, line 122+)
- `skills/build-execute/SKILL.md`: Step 1 wave dependency sanity check (precedent for per-wave validation)
- GSD `execute-phase.md:748-793`: regression gate concept
