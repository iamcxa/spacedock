---
id: 080
title: "Execute-stage staleness detection -- file hash pre-check before wave dispatch"
status: execute
context_status: ready
source: decomposition of entity 077 (cross-phase skepticism)
started: 2026-04-13T13:00:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-execute-staleness-detection
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

**APPROACH**: Insert a per-wave staleness pre-check inside build-execute's Step 4 wave loop (✓ confirmed by explore: build-execute SKILL.md:122-165 -- Step 4 is the wave loop; Step 4b per-task execution is the inner loop where pre-check inserts before each wave). Before dispatching wave N's tasks, compare each task's `files_modified` targets against a baseline git state using `git diff --name-only {baseline} -- {file}` (✓ confirmed by explore: build-execute SKILL.md:24 -- `git diff` in tool list; line 148 -- `git log` already used for teammate detection). The baseline for wave 0/1 is `execute_base_sha` (✓ confirmed by explore: build-execute SKILL.md:146,258 -- already tracked; functionally equivalent to plan-approval state for source files since intervening `chore(index):` commits only touch CONTRACTS.md). For wave N>1, the baseline advances to the post-wave-(N-1) commit SHA (the serial commit from the prior wave's last task), so that expected intra-entity modifications by earlier waves don't trigger false positives. Two outcomes: (a) **files unchanged** -- proceed silently; (b) **files changed** -- emit a `⚠ stale-files: {list}` warning in execute output, log to Stage Report, and proceed with caution (default behavior -- staleness is a warning, not a blocker per parent 077 GUARDRAILS).

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

## Assumptions

A-1: Files not present at baseline SHA are skipped by the pre-check -- they are new files the plan will create. `git diff --name-only {baseline} -- {new-file}` returns empty for files that didn't exist at baseline, so no false positive occurs.
Confidence: Confident (0.90)
Evidence: git semantics -- `git diff` between a SHA and working tree for a non-existent-at-SHA file shows it as added (expected), not modified (stale). The pre-check filters for modifications only, not additions.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Use `execute_base_sha` (already tracked by build-execute) as the wave 0/1 baseline rather than extracting plan-approval SHA separately. These are functionally equivalent for source files because the only intervening commits are `chore(index):` which touch CONTRACTS.md only.
Confidence: Confident (0.90)
Evidence: build-execute SKILL.md:146,258 -- `execute_base_sha` captured at stage entry; line 95 -- `chore(index):` commits only modify `docs/build-pipeline/_index/CONTRACTS.md`
→ Confirmed: captain, 2026-04-13 (batch)

A-3: In worktree execution (the standard FO dispatch path), concurrent entities are isolated on separate branches. The per-wave pre-check only detects external drift in main-branch execution (no worktree), which occurs when FO daemon ships other entities to main between waves.
Confidence: Confident (0.85)
Evidence: build-execute SKILL.md:10 -- execute runs on worktree branch; entity frontmatter `worktree:` field tracks the branch. Git branches are isolated -- commits on branch A don't appear on branch B until merge.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Stale-file warnings are collected in orchestrator memory during the wave loop and written to `## Stage Report: execute` as a new top-level `### Stale-file warnings` subsection alongside `### Per-task summary` and `### BLOCKED escalations` -- same hierarchy level, wave-scoped. NOT under `### Findings` (which holds per-task findings from task-executor returns). Format: `- wave {N}: ⚠ stale-files [{file1}, {file2}] -- baseline {sha}, current {sha}`.
Confidence: Confident (0.85)
Evidence: build-execute SKILL.md:264-280 -- Per-task summary (line 264) and BLOCKED escalations (line 268) are top-level subsections. Stale-file warnings are per-wave (not per-task), matching the same hierarchy. Captain selected "New top-level subsection" over Findings subsection and inline approaches.
→ Corrected by captain, 2026-04-13 (interactive): "New top-level `### Stale-file warnings` subsection at same hierarchy as `### Per-task summary` and `### BLOCKED escalations`, not under `### Findings` which is task-scoped"

A-5: `git diff --name-only {baseline} -- {files}` is the right detection mechanism -- binary changed/unchanged, lightest possible check. No need for `--stat` or full diff content. The warning reports WHICH files changed, not HOW they changed.
Confidence: Confident (0.90)
Evidence: git semantics -- `--name-only` returns file paths only with zero content overhead. The staleness check needs a boolean signal per file (changed or not), not a content diff. Consistent with parent 077 A-4 "binary file content comparison."
→ Confirmed: captain, 2026-04-13 (batch)

## Canonical References

(none cited -- captain confirmed/corrected assumptions without external file references)

## Stage Report: explore

- [x] Files mapped: 1 across skill/config layer
  build-execute SKILL.md (sole insertion target -- Step 4 wave loop, Stage Report format)
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1)
  A-1 new-file skip (0.90), A-2 execute_base_sha baseline (0.90), A-3 worktree isolation (0.85), A-4 Stage Report findings subsection (0.75), A-5 git diff --name-only (0.90)
- [x] Options surfaced: 0
  All gray areas resolved to Track A assumptions with git semantics or codebase precedent
- [x] Questions generated: 0
  No genuinely open questions -- entity scope is narrow (per-wave git diff insertion) with clear git-level mechanics
- [x] α markers resolved: 0 / 0
  Brainstorming spec contained no α markers (decomposition-born entity with well-defined scope from parent 077)
- [x] Scale assessment: confirmed Small
  1 file mapped, single insertion point within Step 4 wave loop

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (1 corrected)
  A-1, A-2, A-3, A-5 confirmed via batch; A-4 corrected -- stale-file warnings as top-level `### Stale-file warnings` subsection (not under `### Findings`)
- [x] Options selected: 0 / 0
  no option comparisons surfaced by explore
- [x] Questions answered: 0 / 0
  no open questions surfaced by explore
- [x] Canonical refs added: 0
  captain confirmed/corrected without citing external references
- [x] Context status: ready
  gate passed: all 5 assumptions resolved, 0 options, 0 questions, ACs valid (3 criteria, no α markers)
- [x] Handoff mode: loose
  captain must say "execute 080" or hand off to First Officer; auto_advance not set
- [x] Clarify duration: 2 questions asked, session complete
  1 batch assumption presentation (plain text) + 1 AskUserQuestion (A-4 Stage Report location correction)

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-execute/SKILL.md`: insertion point for per-wave pre-check (Step 4 wave loop, line 122+)
- `skills/build-execute/SKILL.md`: Step 1 wave dependency sanity check (precedent for per-wave validation)
- GSD `execute-phase.md:748-793`: regression gate concept
