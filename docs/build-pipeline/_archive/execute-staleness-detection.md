---
id: 080
title: "Execute-stage staleness detection -- file hash pre-check before wave dispatch"
status: shipped
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

## Research Findings

### Upstream Constraints

- Entity 075 (research dispatch architecture) is shipped and archived (`docs/build-pipeline/_archive/explore-research-dispatch-for-likely-assumptions.md`, status: shipped, completed: 2026-04-13T10:45:00Z). Dependency satisfied -- staleness pre-check does not re-implement research dispatch per GUARDRAILS.
- Parent 077 GUARDRAILS mandate: staleness is a WARNING, not a blocker. Execute proceeds with caution; captain decides whether to re-plan. Binary comparison only (A-4), no semantic/LLM judgment.
- `CLAUDE.md` global rule: root cause first -- the staleness warning surfaces the symptom (file changed), not a proposed fix. Consistent with warning-not-blocker design.

### Existing Patterns

- **build-quality Step 6.5** (`skills/build-quality/SKILL.md:156`): uses `git diff --name-only {execute_base_sha}..HEAD` for diff-scope classification. Same git primitive, same baseline variable. The staleness pre-check reuses this exact pattern but compares against per-wave baselines instead of a single execute-entry baseline.
- **build-execute Step 1** (`skills/build-execute/SKILL.md:62-69`): wave dependency sanity check validates `read_first` paths per wave before dispatch. The staleness pre-check is the same concept applied to `files_modified` targets -- per-wave validation before dispatch is an established pattern in this skill.
- **build-execute Step 4 mode detection** (`skills/build-execute/SKILL.md:146-150`): `git log --oneline {execute_base_sha}..HEAD` already establishes the `execute_base_sha` variable and demonstrates git log queries within the wave loop context.
- **Stage Report subsection hierarchy** (`skills/build-execute/SKILL.md:264-280`): `### Per-task summary` (line 264), `### BLOCKED escalations` (line 268), `### Findings` (line 272) are top-level subsections. New `### Stale-file warnings` subsection fits at the same hierarchy level per captain-corrected A-4.

### Library/API Surface

- `git diff --name-only {sha} -- {file1} {file2} ...` returns only file paths that changed between the SHA and current working tree/HEAD. For files that did not exist at the baseline SHA, git reports them as "added" not "modified" -- the pre-check filters for modifications only (A-1 confirmed). Zero content overhead vs `--stat` or full diff. Accepts multiple file paths in a single invocation, avoiding per-file shell loops.
- `git rev-parse HEAD` after serial commits in Step 4d captures the post-wave commit SHA for baseline advancement. Already in the `Bash` tool list (`skills/build-execute/SKILL.md:24`).

### Known Gotchas

- **Worktree isolation (A-3)**: In worktree execution (standard FO dispatch path), concurrent entities are on separate git branches. The staleness pre-check only detects external drift in main-branch execution (no worktree), which occurs when FO daemon ships other entities to main between waves. The pre-check is still useful in worktree mode for detecting manual edits or rebases, but its primary value is main-branch drift detection.
- **chore(index) commits between plan and execute (A-2)**: `execute_base_sha` is captured at stage entry. Intervening commits between plan approval and execute entry are `chore(index):` commits that only touch `docs/build-pipeline/_index/CONTRACTS.md`. Since CONTRACTS.md is never in any task's `files_modified`, these commits don't produce false positives. Using `execute_base_sha` is functionally equivalent to plan-approval SHA for source files.
- **New files in `files_modified`**: Some plan tasks create new files (not present at baseline). `git diff --name-only {baseline} -- {new-file}` returns the file as "added" (A status), not "modified" (M status). The pre-check must filter for M-status only, or equivalently, only flag files that existed at baseline AND changed. Using `git diff --diff-filter=M --name-only {baseline} -- {files}` is the precise filter.

### Reference Examples

- No external reference examples needed. The insertion pattern follows build-execute's own Step 1 wave validation structure: check condition per wave -> if violation found, log warning/error -> proceed or halt based on severity. The staleness check follows the "proceed with warning" branch.

## PLAN

goal: Insert per-wave staleness pre-check into build-execute SKILL.md and update Stage Report format

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - skills/build-execute/SKILL.md
  </read_first>

  <action>
  Insert a new subsection `### 4.0 -- Per-Wave Staleness Pre-Check` between `## Step 4: Wave Execution Loop` (line 122) and `### Two execution modes` (line 128) in `skills/build-execute/SKILL.md`. The subsection defines the staleness pre-check that runs before each wave's task dispatch.

  Content to insert:

  ```markdown
  ### 4.0 -- Per-Wave Staleness Pre-Check

  Before dispatching wave N's tasks (or verifying teammate commits in Mode A), compare the wave's `files_modified` targets against a baseline git state. This is a WARNING mechanism -- staleness does not block dispatch.

  **Baseline selection:**
  - Wave 0 and wave 1: use `execute_base_sha` (captured at stage entry, functionally equivalent to plan-approval state for source files per entity 080 A-2).
  - Wave N > 1: use the post-wave-(N-1) commit SHA (the last serial commit from step 4d of the prior wave). This prevents intra-entity modifications by earlier waves from triggering false positives.

  **Detection command:**
  Collect all `files_modified` from every task in the current wave into a deduped list. Run:
  ```bash
  git diff --diff-filter=M --name-only {baseline} -- {file1} {file2} ...
  ```
  The `--diff-filter=M` flag restricts output to modified files only, excluding files with "added" status (new files the plan will create -- per entity 080 A-1, these are not stale).

  **Two outcomes:**
  - **(a) No output** -- all target files unchanged since baseline. Proceed silently to wave dispatch.
  - **(b) One or more file paths returned** -- these files were modified externally since the baseline. Emit a warning to orchestrator output:
    ```
    wave {N}: ⚠ stale-files [{file1}, {file2}] -- baseline {baseline_sha} ({baseline_sha_short})
    ```
    Collect the warning in orchestrator memory (keyed by wave number) for inclusion in `## Stage Report: execute` under `### Stale-file warnings`. **Proceed with wave dispatch** -- staleness is a warning, not a blocker (per parent 077 GUARDRAILS).

  **Baseline advancement:** After step 4d completes (serial commits for the wave), capture the new HEAD as the baseline for the next wave:
  ```bash
  wave_baseline=$(git rev-parse HEAD)
  ```
  This `wave_baseline` replaces `execute_base_sha` as the comparison target for wave N+1's pre-check.
  ```

  Additionally, add a sentence to the existing `### 4d -- Serial Git Commits After Wave Closes` subsection, after the `Update the ## Validation Map` paragraph (line 188), instructing the orchestrator to capture the post-wave SHA:

  ```markdown
  **Baseline advancement for staleness pre-check:** After the last commit in this wave, capture the post-wave HEAD via `git rev-parse HEAD` and store it as `wave_baseline` for the next wave's Step 4.0 pre-check. For the first wave, this replaces `execute_base_sha` as the staleness baseline.
  ```
  </action>

  <acceptance_criteria>
    - `grep "4.0 -- Per-Wave Staleness Pre-Check" skills/build-execute/SKILL.md` finds the new subsection
    - `grep "diff-filter=M --name-only" skills/build-execute/SKILL.md` finds the detection command
    - `grep "wave_baseline" skills/build-execute/SKILL.md` finds the baseline advancement instruction
    - `grep "⚠ stale-files" skills/build-execute/SKILL.md` finds the warning format
    - The new subsection appears BEFORE `### Two execution modes` in the file
    - The baseline advancement paragraph appears AFTER the Validation Map update paragraph in step 4d
  </acceptance_criteria>

  <files_modified>
    - skills/build-execute/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - skills/build-execute/SKILL.md
  </read_first>

  <action>
  Update the `## Step 9: Stage Report + Advance` section's Stage Report template in `skills/build-execute/SKILL.md` (lines 254-286) to include the new `### Stale-file warnings` subsection. Insert it between `### BLOCKED escalations (if any)` and `### Findings`, at the same hierarchy level.

  The template block currently reads:
  ```markdown
  ### BLOCKED escalations (if any)
  - task-{id}: haiku BLOCKED ({reason}) -> sonnet BLOCKED ({reason}) -> opus {DONE|BLOCKED} ({reason})
  - ...

  ### Findings
  ```

  Change it to:
  ```markdown
  ### BLOCKED escalations (if any)
  - task-{id}: haiku BLOCKED ({reason}) -> sonnet BLOCKED ({reason}) -> opus {DONE|BLOCKED} ({reason})
  - ...

  ### Stale-file warnings
  - wave {N}: ⚠ stale-files [{file1}, {file2}] -- baseline {sha} ({sha_short})
  - ...
  (omit subsection if no stale files detected across any wave)

  ### Findings
  ```

  This placement matches captain-corrected A-4: top-level subsection alongside `### Per-task summary` and `### BLOCKED escalations`, not under `### Findings` (which is task-scoped, while stale-file warnings are wave-scoped).
  </action>

  <acceptance_criteria>
    - `grep "### Stale-file warnings" skills/build-execute/SKILL.md` finds the new subsection in the Stage Report template
    - The `### Stale-file warnings` subsection appears AFTER `### BLOCKED escalations` and BEFORE `### Findings` in the template
    - The format shows `wave {N}: ⚠ stale-files` pattern per A-4
  </acceptance_criteria>

  <files_modified>
    - skills/build-execute/SKILL.md
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] Invoke modified build-execute skill with a plan whose `files_modified` target has been externally modified since `execute_base_sha`. Verify the orchestrator emits `⚠ stale-files (wave 1): [{file}]` warning in output listing the changed file. (Skill TDD: create a test scenario where a file in `files_modified` is modified between plan-approval and wave 1 dispatch, assert warning presence in orchestrator output)
- [ ] Invoke modified build-execute skill with a 2-wave plan where wave 1 modifies `src/a.ts` and wave 2 targets `src/b.ts`. Externally modify `src/b.ts` between wave 1 and wave 2. Verify wave 2 pre-check uses wave 1's final commit SHA as baseline and flags `src/b.ts` as stale. Verify wave 2 pre-check does NOT flag `src/a.ts` (which changed in wave 1 but is expected). (Skill TDD: baseline advancement scenario)
- [ ] Invoke modified build-execute skill with stale files detected. Verify tasks still execute (not halted) AND `## Stage Report: execute` contains `### Stale-file warnings` subsection with the warning. (Skill TDD: warning-not-blocker + Stage Report integration)
- [ ] Invoke modified build-execute skill with a plan whose `files_modified` includes a new file (not present at baseline SHA). Verify the pre-check does NOT flag it as stale. (Skill TDD: new-file skip scenario, validates `--diff-filter=M` behavior)

### API
None

### Interactive
None

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: wave 1 pre-check compares files_modified against plan-approval SHA and warns on change | task-1 | `grep "4.0 -- Per-Wave Staleness Pre-Check" skills/build-execute/SKILL.md && grep "diff-filter=M --name-only" skills/build-execute/SKILL.md` | done | 2026-04-13 |
| AC-2: wave 2 pre-check uses wave 1's final commit SHA as baseline, not plan-approval SHA | task-1 | `grep "wave_baseline" skills/build-execute/SKILL.md && grep "post-wave-(N-1) commit SHA" skills/build-execute/SKILL.md` | done | 2026-04-13 |
| AC-3: stale file warning does not halt dispatch and is logged in Stage Report | task-2 | `grep "### Stale-file warnings" skills/build-execute/SKILL.md && grep "Proceed with wave dispatch" skills/build-execute/SKILL.md` | done | 2026-04-13 |

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

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 1 append call, covering 2 tasks and 1 file (skills/build-execute/SKILL.md), committed as a2bb4ac

### Plan-checker final output
```yaml
issues:
  - dimension: dependency_correctness
    task: task-1, task-2
    severity: warning
    description: "task-1 and task-2 both modify skills/build-execute/SKILL.md in wave 1 -- parallelism concern"
    fix_hint: "Execute will force serial; no action needed. Tasks edit non-overlapping sections (Step 4 vs Step 9)."
```

### Plan-checker execution note
Plan-checker ran inline (ensign context lacks Agent tool per `references/agent-dispatch-guide.md`). All 7 dimensions evaluated: Dim 1 (Requirement Coverage) PASS, Dim 2 (Task Completeness) PASS, Dim 3 (Dependency Correctness) 1 warning (same-file overlap in wave 1), Dim 4 (Context Compliance) PASS, Dim 5 (Research Coverage) PASS, Dim 6 (Validation Sampling) PASS (6c exempt -- <3 tasks), Dim 7 (Cross-Entity Coherence) PASS (skills/build-execute/SKILL.md not in CONTRACTS.md -- new territory).

### Dispatch Gaps
- Plan-checker dispatched inline (not via Agent subagent) due to ensign tool surface constraint. Evaluation quality is equivalent for a 2-task Small entity.

### Commits
- chore(plan): execute-staleness-detection plan -- per-wave staleness pre-check for build-execute
- chore(index): add contracts for entity-execute-staleness-detection entering plan (1 file)

## Stage Report: execute

status: passed
base SHA: b942b73
final SHA: fb0dbb8
waves: 1 wave completed out of 1 declared
tasks: 2 done, 0 blocked, 0 needs_context-rounds
workflow-index transition: skipped -- entity 080 CONTRACTS row was appended by plan stage (a2bb4ac); execute inline fallback (Mode B, no FO team dispatch, ensign context)

### Dispatch Mode
Mode B -- inline serial fallback. No FO-dispatched task-executor teammates. Both tasks executed serially by orchestrator in wave 1 order. Same-file overlap (plan-checker Dim 3 warning) handled by serial execution.

### Per-task summary
- task-1: DONE (sonnet) -- commit 8941c07 -- insert Step 4.0 Per-Wave Staleness Pre-Check subsection into build-execute SKILL.md
- task-2: DONE (sonnet) -- commit fb0dbb8 -- add Stale-file warnings subsection to Stage Report template in Step 9

### BLOCKED escalations (if any)
(none)

### Stale-file warnings
(none -- no stale files detected; single-file entity on isolated worktree branch)

### Findings
#### Skill suggestions
(none)
#### Scope observations
- task-1 and task-2 both modified `skills/build-execute/SKILL.md` in wave 1 (non-overlapping sections: Step 4 vs Step 9). Plan-checker Dim 3 flagged this as a warning; serial Mode B execution resolved it without incident.
#### Pre-existing failures
(none)
#### Unresolved scope gaps
(none)

knowledge capture: skipped -- no findings met D1/D2 threshold

## Files Modified

- `skills/build-execute/SKILL.md` -- task-1 (8941c07): inserted `### 4.0 -- Per-Wave Staleness Pre-Check` subsection between Step 4 header and `### Two execution modes`; added baseline advancement paragraph to `### 4d -- Serial Git Commits After Wave Closes`
- `skills/build-execute/SKILL.md` -- task-2 (fb0dbb8): inserted `### Stale-file warnings` subsection in Stage Report template between `### BLOCKED escalations` and `### Findings`

## References

- Parent entity 077: cross-phase skepticism validation gates
- `skills/build-execute/SKILL.md`: insertion point for per-wave pre-check (Step 4 wave loop, line 122+)
- `skills/build-execute/SKILL.md`: Step 1 wave dependency sanity check (precedent for per-wave validation)
- GSD `execute-phase.md:748-793`: regression gate concept
