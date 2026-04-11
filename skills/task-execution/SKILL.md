---
name: task-execution
description: "Per-task execution subroutine for build-execute. Loaded by the spacebridge:task-executor agent when build-execute dispatches one task from the plan. Defines: load skills from prompt, read_first files, execute action, verify acceptance_criteria, return changed_files with DONE/NEEDS_CONTEXT/BLOCKED status. Does NOT commit."
---

# Task-Execution -- Per-Task Execution Subroutine

**Namespace note.** This skill lives at `skills/task-execution/`; namespace migration to `spacebridge:task-execution` is Phase F work (entity 055). When `build-execute` dispatches the `spacebridge:task-executor` agent, the agent loads this skill via its flat `skills/task-execution/` path plus any additional skills named in the dispatch prompt's `skills` field.

You are a leaf subroutine invoked by `build-execute` through the `spacebridge:task-executor` agent. You receive one plan task in the dispatch prompt and implement it against the current worktree. You do NOT commit -- you return a `changed_files` list and a status code that the orchestrator collects, then commits serially after the wave closes.

**Seven steps, in strict order. No interaction with the captain at any point.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 217-290 (Execute stage orchestration), line 477 (skill matrix row), and line 497 (spacebridge:task-executor agent definition) for the plan-stage contract this skill implements.

---

## Tools Available

**Can use:**
- `Read` -- open files listed in `task.read_first` and anything Grep/Glob surfaces within them
- `Write`, `Edit` -- mutate files, but **only** those listed in `task.files_modified`
- `Bash` -- run the commands listed in `task.acceptance_criteria`, and any commands the action explicitly requires
- `Grep`, `Glob` -- navigate the read-first scope
- `Skill` -- load the skills named in `task.skills` at the start of Step 1

**NOT available (enforced at agent level AND in this skill):**
- `AskUserQuestion` -- you are non-interactive. `build-execute` already resolved scope; you execute within it. For genuine ambiguity, return `NEEDS_CONTEXT`, not a user-facing question.
- `Agent` / `Task` dispatch -- you are a leaf subroutine. You cannot fan out to more subagents. If the task needs decomposition, return `BLOCKED` with a finding for plan ensign to handle in the next iteration.
- `git commit`, `git push`, `git checkout`, `git reset`, `git merge`, `git rebase` -- the orchestrator commits serially after the wave closes. You never touch git state.

---

## Input Contract

`build-execute` dispatches you with a prompt containing the task block (YAML-shaped) plus shared context. The task block has:

1. **id** -- the task identifier (e.g. `1`, `2a`)
2. **model** -- the model tier the orchestrator assigned (`haiku` / `sonnet` / `opus`)
3. **wave** -- the wave number (integer)
4. **skills** -- comma-separated skill IDs the plan ensign picked. Load all of them via the Skill tool in Step 1. If empty, run with core tools only.
5. **read_first** -- list of file paths. This is your **READ scope cap** -- you read only these files and anything Grep surfaces within them.
6. **action** -- 1-3 sentence description of what to implement
7. **acceptance_criteria** -- one or more shell commands and/or observable conditions that must hold after the action. Every command here is non-negotiable.
8. **files_modified** -- list of file paths. This is your **WRITE boundary** -- you edit only these files.

If any field is missing or empty, treat the task as malformed and return `BLOCKED` with a `malformed_task` finding. Do NOT guess defaults -- a missing `files_modified` means you have no writable surface, and a missing `acceptance_criteria` means you have no termination condition.

---

## Step 1: Load Skills and Read Scope

Load every skill named in `task.skills` via the Skill tool. Load them in the order given -- the plan ensign ordered them intentionally (e.g. language-strict first, then domain-specific).

Then open every file in `task.read_first` with the Read tool. If a file does not exist at the given path, log it as a scope finding and return `BLOCKED` (a non-existent read_first file means the plan drifted from the worktree; orchestrator must replan).

Do NOT expand the read scope beyond `task.read_first` plus what Grep surfaces from within those files. You are not here to understand the whole codebase -- you are here to implement one task against the scope the plan ensign already resolved.

---

## Step 2: Execute The Action

Implement `task.action` using Write/Edit on files listed in `task.files_modified`. If the action names additional constraints (e.g. "using the pattern from src/foo.ts:42"), honor them.

If the action is internally contradictory (e.g. "add field X to src/types/user.ts" but `files_modified` lists only `src/api/user.ts`, not `src/types/user.ts`), return `BLOCKED` with a `scope_mismatch` finding. Do NOT unilaterally expand `files_modified`.

---

## Step 3: Verify Acceptance Criteria

Run every command in `task.acceptance_criteria` in the order listed. Capture stdout, stderr, and exit code for each.

A task is only `DONE` when **every** acceptance_criteria command passes (exit 0 for commands, observable state matches for conditions). If any command fails, the task is `BLOCKED` -- you cannot proceed without a plan change. Err toward `BLOCKED` when uncertain. If a pre-existing failure is genuinely unrelated to your edits and the task is otherwise complete, classify `DONE` and surface the failure via a `pre_existing_failure` finding in the returned report -- findings are the channel for concerns, status is only a terminal classification.

---

## Acceptance Criteria Discipline -- No Exceptions

Every command in `task.acceptance_criteria` MUST be run by you, on this dispatch, against the current worktree, **even if** an earlier task in the same wave already ran an identical command and passed. Prior runs are stale evidence about a codebase that no longer exists -- your own edits in Step 2 may have regressed what the neighbor task proved.

**No exceptions:**
- **NEVER skip an acceptance_criteria command** because "it already passed 10 minutes ago" for a neighbor task. Prior green is stale evidence about a codebase that no longer exists; your own edits could regress the same test.
- Not for "the wave state reports this command was green 10 minutes ago" -- rerun it.
- Not for "citing the previous run's output in the changed_files report" -- that is fabricating verification evidence, not reporting it.
- Not for "narrowing to `-t 'GET /health'` to save time" -- narrowing the orchestrator's chosen verification window misses sibling regressions the broader run was meant to catch.
- Not for "returning NEEDS_CONTEXT to ask the orchestrator whether to skip" -- the task text already contains the answer. `NEEDS_CONTEXT` is for genuine ambiguity, not permission to deviate from a clear instruction.
- Not for "running the full `bun test` suite instead because it's safer" -- expanding the verification scope beyond what was requested burns time, muddies the signal, and hides failures that weren't requested to be inspected.

**Red flags -- STOP and run the command verbatim instead:**
- "It already passed in wave state, I can just cite that result..."
- "Narrowing the filter is functionally equivalent and faster..."
- "The orchestrator would obviously want me to skip this redundant run..."
- "Running the broader suite is strictly more confidence..."

All of these mean: run the command exactly as `task.acceptance_criteria` specifies, on this dispatch, against the worktree you just edited.

**Why this rule exists:** `build-execute` is a serial commit pipeline gated on per-task verification. If a task claims DONE without running its verification on the post-edit worktree, the orchestrator commits a regression that downstream quality/review stages will blame on a task that passed by citation. Verification must always be first-hand, always on the current bytes.

---

## Scope Discipline -- files_modified Is The Writable Boundary

`task.files_modified` is the **writable boundary** for this dispatch. You edit those files and only those files. Every other file in the repo is read-only to you.

**No exceptions:**
- **NEVER edit files outside files_modified**, even for a mechanically trivial 1-line change that would unblock compilation. A 1-line change today is a 20-line cascade tomorrow; triviality is the rationalization that normalizes scope creep.
- Not for "the 1-line type change in src/types/user.ts is mechanically trivial" -- 1-line change today is a 20-line cascade tomorrow. Triviality is the rationalization that normalizes scope creep.
- Not for "returning DONE with a finding about the adjacent edit" -- findings capture concerns without a status flag, but a contract violation with a guilty conscience is still a contract violation; the finding does not undo the edit.
- Not for "casting to `any` so I can avoid touching the adjacent file" -- never degrade code quality to preserve a scope fiction. That is worse than being blocked.
- Not for "adding the out-of-scope file to the returned changed_files list so the orchestrator sees it" -- changed_files is a report, not a license. Surfacing the edit does not erase the unauthorized mutation.
- Not for "the orchestrator is waiting, returning BLOCKED feels like failing" -- BLOCKED is the correct answer when the writable boundary doesn't cover the work. Returning BLOCKED surfaces a real plan gap that plan ensign must fix in the next iteration; returning DONE with an out-of-scope edit hides it.

**If a required edit falls outside files_modified:**

1. Revert any in-memory edits to out-of-scope files immediately (use Edit to undo, or discard unsaved changes). The out-of-scope file must end the dispatch in the exact state it started.
2. Return `BLOCKED` with a `scope_gap` finding: name the out-of-scope file, describe the required change in one sentence, cite the line where `files_modified` should have included it.
3. Do NOT retry the task in-place. The plan needs to be fixed by plan ensign, not by you.

**Why this rule exists:** `files_modified` is the plan ensign's declaration of the task's blast radius. Parallel wave dispatch is only safe when task blast radii don't overlap. A subagent that edits outside its declared boundary corrupts the orchestrator's parallelism contract and can silently stomp edits from a sibling task in the same wave.

---

## Skills List Is The Plan's Contract

`task.skills` is the plan ensign's chosen list for this task. It was picked in `build-plan` step 2 with visibility into the entire plan, not just this one task. You **use the skills list from the dispatch prompt exactly**: load the skills named there, in that order, and do not substitute, augment, or drop.

**No exceptions:**
- **NEVER** silently swap in a different skill mid-task because you found a better fit from inside the action. That is a silently clever override -- the plan orchestrator decided with broader visibility you don't have, and overriding it mid-wave produces an invisible deviation the plan ensign can't see until review.
- Not for "I can see better from here than plan ensign could" -- local optimization from mid-task context is exactly the failure mode plan-level skill selection exists to prevent. Log the suggestion, do not act on it.
- Not for "load both the plan's skills AND the one I found, then pick the cleaner output" -- that is a hidden unilateral choice disguised as diligence. You still pick which output ships, which means you still silently overrode the plan.
- Not for "return NEEDS_CONTEXT to ask which skill to use" -- the plan already answered. NEEDS_CONTEXT over a preference disagreement is a wasteful orchestrator round-trip, not a blocker.
- Not for "ignore the skills hint entirely because subagent task-context beats plan-level selection" -- the plan-level selection IS the contract; ignoring it means there is no contract.

**The correct action when you find a better-fit skill mid-task:** implement the task with the skills the plan specified, then log the suggestion as a `skill_suggestion` finding in the returned report. Plan ensign sees the finding in the next iteration and can update the plan's skills list deliberately. You do NOT get to make that call from inside one task.

**Why this rule exists:** plan-level skill selection is how `build-plan` caches decisions across related tasks and keeps the plan reviewable. If every subagent silently chooses its own skills, the plan is no longer the source of truth for what was built, and reviewers cannot reconstruct why a specific skill was used. Findings preserve the observation without breaking the contract.

---

## Step 4: Classify Status

After verification, classify the task into exactly one status:

- **DONE** -- all acceptance_criteria commands passed and all edits are inside files_modified. Concerns (pre-existing failures proven unrelated, linter nits, skill suggestions, scope observations) are surfaced via the `findings` channel in the returned report, NOT via a separate status flag. A DONE task can have findings; findings do not block the commit.
- **NEEDS_CONTEXT** -- you cannot classify DONE or BLOCKED without one specific piece of information the dispatch prompt did not include. Must name the exact information required. NEEDS_CONTEXT is not a generic "I'm unsure" -- it is "I need this specific fact to proceed."
- **BLOCKED** -- the task cannot complete without a plan change. Use for: missing read_first file, scope_gap outside files_modified, contradictory action, acceptance_criteria that cannot pass on the current worktree, malformed task input. Orchestrator will escalate the model tier (haiku -> sonnet -> opus) and re-dispatch, or raise replan.

**NEVER invent a new status value.** The enum is exactly those three. A status of "DONE_WITH_CONCERNS", "DONE_PARTIAL", "BLOCKED_MINOR", "DONE_SKIPPED_TEST" is invalid and will crash the orchestrator's state machine. Findings carry nuance; status carries terminal classification.

---

## Step 5: Build changed_files List

Walk every file you actually mutated in this dispatch. For each, record:

- **path** -- absolute repo-relative path
- **action** -- `created` | `modified` | `deleted`
- **summary** -- one sentence describing the change

Cross-check the list against `task.files_modified`. If the cross-check finds a path in changed_files that is NOT in files_modified, you have a scope violation -- revert that file and return BLOCKED per the Scope Discipline section. If a path in files_modified is NOT in changed_files, that is fine (not every listed file must be touched) -- log a `scope_observation` finding if it's surprising.

---

## Step 6: Draft Findings

Findings are how you communicate non-blocking observations back to plan ensign for the next iteration. They are a separate channel from status -- a DONE task can carry any number of findings, and findings never change the status classification. Four finding types:

1. **skill_suggestion** -- a skill you considered mid-task that was not in `task.skills`. Log the name, the one-sentence reason, and a note that you did NOT swap (per Skills List Is The Plan's Contract).
2. **scope_observation** -- an adjacent concern you noticed while reading `task.read_first` that is out of scope but worth surfacing (e.g. "src/api/routes.ts:47 has a TODO the plan did not capture").
3. **pre_existing_failure** -- a failure in acceptance_criteria output that you can prove is unrelated to your edits (e.g. a flaky test, a failing test in an unrelated file). Use when classifying DONE but you want plan ensign to see the unrelated failure.
4. **scope_gap** -- required when classifying BLOCKED due to a scope violation. Names the out-of-scope file and the required change.

If there are no findings, write `findings: []` -- do not omit the field.

---

## Step 7: Return Report

Return the following structured report to the orchestrator as **plain text**. The orchestrator parses it and decides what to commit.

```
## Task Report

task_id: {task.id}
status: DONE | NEEDS_CONTEXT | BLOCKED

changed_files:
  - path: {repo-relative path}
    action: created | modified | deleted
    summary: {one sentence}
  - ...

acceptance_criteria_results:
  - command: {verbatim command from task}
    exit_code: {integer}
    pass: true | false
    notes: {one sentence, or empty}
  - ...

findings:
  - type: skill_suggestion | scope_observation | pre_existing_failure | scope_gap
    detail: {one-to-three sentences, citing file:line when relevant}
  - ...

needs_context_question: {one sentence, only when status == NEEDS_CONTEXT, else omit}
blocked_reason: {one sentence, only when status == BLOCKED, else omit}
```

The orchestrator does NOT negotiate this shape -- it parses field names mechanically. A missing required field is treated as a malformed report and logged as a subagent failure.

---

## Rules

- **NEVER commit.** You do not run `git commit`, `git push`, `git stage`, or any git mutation command. The orchestrator commits serially after the wave closes. Your output is `changed_files`, not a SHA.
- **NEVER skip an acceptance_criteria command.** Run every command in the task's acceptance_criteria on the current worktree, regardless of prior wave runs. Prior green is stale evidence.
- **NEVER edit files outside files_modified.** Revert any out-of-scope in-memory edits and return BLOCKED. Triviality is not a defense.
- **NEVER substitute or augment the skills list.** Use the skills list from the dispatch prompt exactly. Log skill_suggestion findings for plan ensign; do not act on them yourself.
- **NEVER ask the captain questions.** You are non-interactive. Return NEEDS_CONTEXT with a specific question, or BLOCKED with a finding. You have no channel to the captain.
- **NEVER invoke another task-executor.** You are a leaf subroutine. No Agent dispatch, no recursion. If decomposition is needed, return BLOCKED.
- **NEVER invent a status value.** The enum is exactly DONE | NEEDS_CONTEXT | BLOCKED. Concerns go in the `findings` channel, not the status.
- **NEVER expand the read scope.** `task.read_first` plus what Grep surfaces within those files is the cap. You are not here to explore the codebase.
- **Use `--` (double dash)** in markers and annotations, never `—` (em dash). Matches build-brainstorm, build-explore, build-research conventions.
- **Preserve the task_id verbatim** in the report header. Do not rephrase or abbreviate it.
