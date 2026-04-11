---
name: build-execute
description: "Execute stage orchestrator dispatched by FO. Sonnet orchestrator + haiku/sonnet/opus task subagents per task model hint. Pre-task skill selection, wave-parallel task dispatch via spacedock:task-executor agent, serial commits per task, unconditional workflow-index status transition on stage entry."
---

# Build-Execute -- Wave-Parallel Task Dispatch Orchestrator

**Namespace note.** This skill lives at `skills/build-execute/`; namespace migration to `spacebridge:build-execute` is Phase F work (entity 055). When FO dispatches the execute stage, the ensign loads this skill via its flat `skills/build-execute/` path.

You are the execute-stage orchestrator invoked by First Officer through the execute ensign. You read a planned entity, transition its CONTRACTS rows to in-flight, build the wave graph, dispatch `spacedock:task-executor` agents wave-by-wave with per-task model hints, collect their reports, commit serially after each wave, and finally write a `## Stage Report: execute` section back to the entity body. You are the execute-side counterpart to `build-plan`'s plan-approval workflow-index append.

**Nine steps, in strict order. Never skip, never reorder, never combine.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 217-290 for the execute stage orchestration diagram (your contract), line 467 for the skill matrix row, lines 274-276 for the BLOCKED escalation ladder, and line 497 for the `spacedock:task-executor` agent definition.

---

## Tools Available

**Can use:**
- `Read` -- open the entity file to parse `## PLAN`, `## Validation Map`, and acceptance criteria; open `docs/build-pipeline/_index/CONTRACTS.md` for cross-checks
- `Grep` / `Glob` -- locate referenced files during pre-task skill selection if a task lacks a `skills` hint
- `Write` / `Edit` -- append the `## Stage Report: execute` section to the entity body and update the `## Validation Map` status column per task
- `Bash` -- `git status`, `git diff`, `git rev-parse`, `git add`, `git commit` for serial per-task commits; `bun` for pre-task ToolSearch fallback if needed
- `Agent` -- dispatch `spacedock:task-executor` agents, one per wave task, with per-task model hint. You run in the **ensign orchestrator context** (sonnet), so Agent dispatch is available to you.
- `Skill` -- invoke `spacedock:workflow-index` (step 2, mandatory stage-entry transition) and `spacedock:knowledge-capture` (step 8, optional)

**NOT available:**
- `AskUserQuestion` -- you run as an ensign subagent dispatched by FO. FO owns captain interaction. If escalation is needed at step 7 or 8, write `feedback-to: {execute|plan|captain}` in the Stage Report and return; FO routes.

**Important dispatch constraint.** You are the orchestrator in your own ensign context -- you CAN dispatch `spacedock:task-executor` agents via the `Agent` tool. The task-executors you dispatch, however, run as nested subagents and **cannot themselves dispatch further Agent calls**. See `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`. Design every task dispatch to be leaf-complete -- the task-executor must have everything it needs in its prompt, and it will never fan out to more subagents. If a task genuinely needs decomposition, that is a plan defect -- the task-executor returns `BLOCKED` and you escalate per step 7.

---

## Input Contract

FO dispatches you after the plan stage completes. The entity body contains:

1. `## PLAN` -- task list with `id`, `model`, `wave`, `skills`, `read_first`, `action`, `acceptance_criteria`, `files_modified` per task (schema from `skills/build-plan/SKILL.md` step 4)
2. `## Validation Map` -- requirement/task/command/status/last-run table; you update status + last-run as tasks close
3. `## Research Findings`, `## UAT Spec`, `## Acceptance Criteria` -- informational context for task-executors
4. `## Stage Report: plan` -- confirms plan approval and lists the `workflow-index append` commit that created CONTRACTS rows at `status: planned`
5. Frontmatter status: `execute` (or equivalent terminal execute state advanced by FO on entry)

If `## PLAN` is missing, malformed, or `## Stage Report: plan` indicates plan did not approve (status != passed), write `## Stage Report: execute` with `feedback-to: plan` and return. Do NOT attempt to execute on partial input.

---

## Output Contract

After successful completion, the entity body contains:

- `## Validation Map` with `status`/`last run` columns updated per completed task
- `## Stage Report: execute` -- wave-by-wave dispatch log, per-task status (DONE/NEEDS_CONTEXT/BLOCKED transitions), BLOCKED escalations if any, serial commit SHAs, any findings surfaced by task-executors
- Entity frontmatter status: advanced to `quality` (or remains `execute` with `feedback-to: {plan|execute}` if step 7 escalated)

Additionally, outside the entity body:

- `docs/build-pipeline/_index/CONTRACTS.md` -- every row for this entity transitioned from `planned` to `in-flight` at step 2, committed as `chore(index): advance {slug} contracts to in-flight` BEFORE wave 1 dispatch
- Git: one conventional commit per completed task (e.g. `feat(execute): {slug} task-{id} -- {task action summary}`), plus the `chore(index):` transition commit from step 2

---

## Step 1: Read Entity and Build Wave Graph

Read the entity file. Parse `## PLAN` into an in-memory task list. Parse every task's `wave`, `skills`, `read_first`, `action`, `acceptance_criteria`, `files_modified`. Collect tasks into wave buckets -- wave 0 first (test infrastructure per Nyquist 6d, if declared), then wave 1, wave 2, etc.

**Wave dependency sanity check:** For each task in wave N, verify that every path in its `read_first` list either (a) already exists in the worktree at the base SHA, or (b) is listed in `files_modified` of a task in wave < N (strictly earlier). If any task in wave N depends on a file first written by another task in wave >= N, the wave graph has an ordering violation. Do NOT silently swap the tasks. Do NOT silently edit the plan to fix it. **Write `## Stage Report: execute` with a dimension_3 dependency violation finding, set `feedback-to: plan`, and return.** Plan ensign fixes wave topology, not execute orchestrator.

See the "Wave Graph Integrity -- No Silent Reorder" No-Exceptions block below for the full rationale.

---

## Step 2: Stage Entry -- workflow-index Transition Is Unconditional

**Before dispatching any wave 1 task subagent, you MUST transition all CONTRACTS rows for this entity from `planned` to `in-flight`.** This is the execute-side counterpart to `build-plan` step 9's unconditional append. It closes the Case B band-aid in `mods/workflow-index-maintainer.md` and restores stage-transition granularity to the cross-entity coherence detector.

First, build the deduped file list from step 1's parsed wave graph: union every `task.files_modified` across every wave into one flat list, removing duplicates. Step 1 already parsed `## PLAN` into the in-memory task list, so this is a local operation -- you do not re-read the entity file.

Then invoke the workflow-index skill via the `Skill` tool using the `update-status-bulk` operation (the per-entity multi-file transition API documented in `skills/workflow-index/references/write-mode.md` lines 60-94):

```
Skill("spacedock:workflow-index", args={
  mode: "write",
  target: "contracts",
  operation: "update-status-bulk",
  entry: {
    entity: "{current entity slug}",
    files: [{deduped file list from step 1}],
    new_status: "in-flight"
  }
})
```

The operation locates every CONTRACTS row matching `(entity, file)` for this entity's file list and flips `status` from `planned` to `in-flight`, committing atomically at the end per write-mode.md line 84. If the skill returns a row count less than the number of files passed, it means `build-plan` step 9 failed to append one or more files -- write `## Stage Report: execute` with `feedback-to: plan` and return. Do NOT attempt to repair the gap by calling `append` yourself; an execute-time append loses plan-time intent and masks the upstream failure.

The workflow-index skill commits the transition as `chore(index): advance entity-{slug} contracts to in-flight ({N} files)` automatically (per write-mode.md line 84). Verify the commit landed via `git log --oneline -1 -- docs/build-pipeline/_index/CONTRACTS.md` before proceeding.

**Only after the transition commit lands do you proceed to step 3.** Wave 1 dispatch is blocked on this step.

See `~/.claude/projects/-Users-kent-Project-spacedock/memory/workflow-index-lifecycle-gap.md` for the full rationale and the explicit mandate that **Phase E Plan 3 (build-execute) MUST add the transition call at stage entry.**

See the "Stage Entry -- workflow-index Transition Is Unconditional" No-Exceptions block below for the rationalization counter-language.

---

## Step 3: Pre-Task Skill Selection (One-Time, Before Dispatch Loop)

For every task in the wave graph (all waves, not just wave 1), resolve its skills list now:

1. **If `task.skills` hint present** -- trust it, record skills for dispatch. The plan ensign chose these in `build-plan` step 2 with plan-level visibility; you do not second-guess.
2. **If `task.skills` absent or empty** -- run one ToolSearch query from `task.action` keywords plus the file extensions in `task.files_modified`:
   - Example query: `"add email validation typescript test"` for a TS validation task in `src/models/User.ts`
   - `max_results: 3`, filter by description relevance
   - Judge the match; if none match, dispatch with an empty skills list and log a `skill_selection_fallback` finding in the Stage Report
3. **Record selected skills** in orchestrator state, keyed by task id. Cache across tasks in the same plan -- if task-3 and task-7 both request `typescript-strict`, resolve once.

Rationale: you (sonnet orchestrator) have reasoning budget for skill selection; task-executors (often haiku) do not. Skill selection is also plan-level -- caching across tasks in the same plan keeps the execution log coherent.

**Do NOT substitute skills a task-executor suggests mid-wave.** Skill selection happens here, once, before dispatch. If a task-executor returns a `skill_suggestion` finding, log it into the Stage Report and let plan ensign update the plan in the next iteration. You do not re-resolve skills mid-wave on a subagent's opinion.

---

## Step 4: Wave Dispatch Loop

Iterate waves sequentially (wave 0, then wave 1, then wave 2, ...). Inside each wave, dispatch tasks in parallel where possible.

### 4a -- Parallelism Decision

For each wave, decide serial vs parallel:
- Read the plan's explicit `serial="true"` hint on any task; if any task in the wave carries it, run the entire wave serial.
- Otherwise auto-detect: if any two tasks in the wave have overlapping `files_modified`, run the entire wave serial (sibling blast radius collision makes parallel unsafe).
- If no overlap and no serial hint, dispatch in parallel.

### 4b -- Parallel Dispatch Task Subagents

For each task in the wave (or one at a time for serial waves):

```
Agent(
  subagent_type="spacedock:task-executor",
  model=task.model,
  prompt="""
  ## Task

  <task id="{task.id}" model="{task.model}" wave="{task.wave}" skills="{resolved_skills}">
    <read_first>
  {task.read_first items, one per line}
    </read_first>

    <action>
  {task.action verbatim}
    </action>

    <acceptance_criteria>
  {task.acceptance_criteria items, one per line}
    </acceptance_criteria>

    <files_modified>
  {task.files_modified items, one per line}
    </files_modified>
  </task>

  ## Context

  Entity: {slug}
  Wave base SHA: {git rev-parse HEAD}
  Plan reference: {entity_path}#PLAN

  Load skill: skills/task-execution (flat path). Return per the task-execution
  step 7 output format with task_id, status (DONE | NEEDS_CONTEXT | BLOCKED),
  changed_files list, acceptance_criteria_results, findings. Do NOT commit --
  orchestrator commits serially after wave closes.
  """
)
```

Dispatch all parallel tasks in a **single message** so they run concurrently. For serial waves, dispatch one at a time and wait for each return before the next.

**Leaf dispatch rule.** The task-executor agent loads `skills/task-execution/SKILL.md` which is leaf-only by design. It reads, implements, verifies, reports. It does NOT commit and it does NOT dispatch further Agent calls. The task-executor's tool surface (per spec line 497) is `Read, Write, Edit, Bash, Grep, Glob, Skill` -- no `Agent`. Design each prompt as self-contained: all context the task-executor needs must be in the prompt text or reachable via the files named in `read_first`.

### 4c -- Collect Subagent Results

For each task-executor return:

- **DONE** -- record changed_files list; schedule for serial commit in step 4d. Any findings surfaced (skill_suggestion, scope_observation, pre_existing_failure) are logged to the Stage Report but do not block the commit.
- **NEEDS_CONTEXT** -- the task-executor named a specific piece of missing information. Gather it from the entity body, the plan, or the worktree. Re-dispatch the same task-executor (same model) with the extra context prepended to the prompt. Cap at 2 NEEDS_CONTEXT rounds per task; if still NEEDS_CONTEXT on the 3rd dispatch, reclassify as BLOCKED and follow the escalation ladder.
- **BLOCKED** -- follow the BLOCKED escalation ladder below.

### 4d -- Serial Git Commits After Wave Closes

Once every task in the wave has returned DONE (or been classified as permanently failed per step 7), commit the DONE tasks serially, one task per commit, in wave order. Never batch multiple tasks into a single commit.

For each DONE task, in order:

```bash
git add {task.files_modified}
git commit -m "feat(execute): {slug} task-{task.id} -- {one-line action summary}"
```

The pre-commit hook fires per commit (lint + tsc --incremental per spec line 290). Do NOT override the hook. If the hook fails on a task's commit, treat the task as BLOCKED retroactively -- revert the staged edits via `git restore --staged {files}` and escalate per step 7.

Update the `## Validation Map` after each successful commit: set `status: done` and `last run: {timestamp}` for the task's row. Do this with Edit (not Write) to avoid clobbering unrelated rows.

---

## BLOCKED Escalation Ladder

Per spec lines 274-276, a BLOCKED task is re-dispatched with escalating model tiers before terminal failure:

1. **First BLOCKED** -- re-dispatch the same task to the **next model tier up**. If the task ran on haiku, re-dispatch as sonnet. If it ran on sonnet, re-dispatch as opus. Include the first dispatch's `blocked_reason` in the re-dispatch prompt so the higher-tier executor knows why the lower tier couldn't resolve it.
2. **Second BLOCKED on sonnet** -- re-dispatch as opus with accumulated blocked_reasons from both prior attempts in the prompt.
3. **Third BLOCKED on opus** -- this is the terminal failure case. Write `## Stage Report: execute` with status `fail`, `feedback-to: execute`, and a **replan flag raised** advisory noting that even opus could not complete the task. Captain reads the Stage Report and decides whether to reset to plan for replan or manually unblock.

The escalation is **haiku -> sonnet -> opus**, in that order, once each. Never skip a tier. Never retry the same tier twice (that would be a retry loop that the global circuit-breaker rule in `~/.claude/CLAUDE.md` forbids). Model escalation is explicitly NOT a retry loop -- it is different strategies across capability tiers, which the circuit-breaker rule allows because each dispatch runs against a fundamentally different reasoning budget.

See the "BLOCKED Escalation Ladder" No-Exceptions block below for the rationalization counter-language.

---

## Step 5: Wave Completion

After every task in the wave has reached a terminal state (DONE committed, or BLOCKED escalated to failure), advance to the next wave. Do NOT start wave N+1 while any task in wave N is still in flight -- the wave barrier exists so that wave N+1 tasks can trust wave N's outputs exist in the worktree.

If any task in the wave ended in terminal failure after opus BLOCKED, do NOT proceed to the next wave. Skip directly to step 9 (write Stage Report with feedback-to: execute) and return. Partial wave execution does not advance the entity.

---

## Step 6: All Waves Complete

Once every wave has completed (all tasks DONE, all committed, all Validation Map rows updated), proceed to step 7 and optionally step 8. The orchestrator does not run additional verification at this point -- per spec lines 294-315, full-project verification is the **quality** stage's job, not execute's. Execute trusts per-task acceptance_criteria + pre-commit hooks + the upcoming quality stage to catch anything beyond the immediate task scope.

---

## Step 7: Deviations and Findings Triage

Before writing the Stage Report, consolidate all findings surfaced by task-executors:

- **skill_suggestion** findings -- log verbatim in the Stage Report under a `### Skill suggestions` subsection for plan ensign to consider in the next iteration
- **scope_observation** findings -- log verbatim under `### Scope observations`
- **pre_existing_failure** findings -- log verbatim under `### Pre-existing failures` with a note that the task classified DONE by proving the failure was unrelated
- **scope_gap** findings (from BLOCKED tasks) -- these are the terminal failure evidence; log under `### Unresolved scope gaps` with the cited file and required change description

Classify deviations per the spec's GSD-style taxonomy (line 284): bug-fix / critical-missing / blocker / architectural. This is a short judgment call -- for each terminal BLOCKED or unusual finding, pick one category and log it. If you cannot classify confidently, tag `uncategorized` and surface in the Stage Report.

---

## Step 8: Knowledge Capture (Optional, Capture Mode)

**Conditional step.** Only run step 8 if a task-executor surfaced a `scope_observation`, `pre_existing_failure`, or `skill_suggestion` finding that generalizes beyond this entity. Invoke:

```
Skill("spacedock:knowledge-capture", args={
  mode: "capture",
  findings: [...list of RawFinding objects from step 7...],
  source_stage: "execute",
  caller_context: { entity_slug: ..., repo_path: ... }
})
```

If no findings meet the D1/D2 threshold, skip step 8 entirely and record `knowledge capture: skipped -- no findings met D1/D2 threshold` in the Stage Report. **Never hide the skip** -- the Stage Report must explicitly state whether knowledge capture ran.

---

## Step 9: Stage Report + Advance

Write the Stage Report into the entity body:

```markdown
## Stage Report: execute

status: {passed|fail}
base SHA: {execute entry SHA}
final SHA: {HEAD after last commit}
waves: {N waves completed out of M declared}
tasks: {D done, B blocked, C needs_context-rounds}
workflow-index transition: {commit SHA from step 2}

### Per-task summary
- task-{id}: {DONE|BLOCKED} ({model tier used}) -- commit {sha} -- {one-line action}
- ...

### BLOCKED escalations (if any)
- task-{id}: haiku BLOCKED ({reason}) -> sonnet BLOCKED ({reason}) -> opus {DONE|BLOCKED} ({reason})
- ...

### Findings
#### Skill suggestions
- ...
#### Scope observations
- ...
#### Pre-existing failures
- ...
#### Unresolved scope gaps
- ...

knowledge capture: {d1_written: N, d2_pending: M} OR {skipped -- no findings met D1/D2 threshold}

{if fail:} feedback-to: {plan|execute}
{if fail with replan flag:} replan flag: raised
```

Advance entity frontmatter `status: quality` if and only if every wave closed DONE with no terminal failures. Otherwise leave frontmatter at `execute` and set `feedback-to` per step 7. Return control to FO.

---

## Rules -- No Exceptions

### Wave Graph Integrity -- No Silent Reorder

**Execute does NOT mutate wave topology.** The plan ensign owns wave assignment; execute honors it. If step 1's wave dependency sanity check surfaces an ordering violation (e.g., task-5 in wave 2 depends on task-6 in wave 3), write `## Stage Report: execute` with a dimension_3 dependency violation finding, set `feedback-to: plan`, and return. Plan ensign fixes the wave graph in its next iteration, not you.

**No exceptions. Never on any of these rationales:**
- **"It's a two-line swap, I'll save a full replan round-trip"** -- pragmatism dressed as diligence. Every orchestrator that silently swaps tasks is one that hides a plan defect from review. A replan round-trip is the cheap, visible cost; silent topology edits are the expensive, invisible cost that corrupt the plan contract execute depends on.
- **"I'm the orchestrator downstream, I can patch plan-checker's blind spot"** -- you are not patching a blind spot, you are creating an invisible deviation. Plan-checker Dim 3's whole purpose is to be the authoritative wave-graph validator. Compensating for its miss from downstream means the next plan with the same bug will land the same way -- you have fixed zero root causes.
- **"task-4 can still go; no reason to stall the whole wave"** -- partial wave dispatch silently edits the wave boundary. A wave is a barrier, not a list. If wave 2 is structurally wrong, dispatching a subset of wave 2 is dispatching a new wave topology you invented -- the plan did not author that shape.
- **"Feedback-to: plan is ceremony when the fix is obvious"** -- feedback-to: plan is how defects become visible to plan-checker for the next iteration. "Obvious" fixes applied silently are how the bug class survives forever; flagged fixes are how it gets fixed at the root. Ceremony is the point.
- **"Edit the plan body inline to fix the wave assignment"** -- plan body edits are plan ensign's job. If you edit the plan from execute context, you have silently forked the plan-of-record and the next plan-checker run will see your edit as plan ensign's choice. That is fabricating plan history.

**Red flags -- STOP and set feedback-to: plan instead:**
- "I can see the correct topology right here..."
- "Two-line swap is cheaper than a replan round-trip..."
- "Partial dispatch keeps the wave moving..."
- "Plan-checker obviously meant the other order..."

All of these mean: refuse to dispatch, write Stage Report with dimension_3 dependency violation finding, set feedback-to: plan, return.

**Why this rule exists:** wave topology is the plan ensign's declaration of the task dependency graph. Execute's parallel wave dispatch is only safe when the declared topology is correct. A wave-graph edit from execute context corrupts the plan-of-record and can silently land task outputs in the wrong order, which downstream quality and review stages will blame on tasks that were dispatched correctly against an incorrect plan.

### Stage Entry -- workflow-index Transition Is Unconditional

**Before dispatching any wave 1 task subagent, you MUST call `spacedock:workflow-index` via the Skill tool to transition all CONTRACTS rows for this entity from `planned` to `in-flight`.** This call is unconditional. It happens on every execute stage entry, for every entity, regardless of wave size, task count, or perceived latency cost.

**No exceptions. Never on any of these rationales:**
- **"Every second before first dispatch is wasted"** -- latency instinct applied to a 500ms Skill call is penny-wise pound-foolish. The transition commit is the only mechanism that keeps plan-checker Dim 7 cross-entity coherence accurate at stage-transition granularity. Skipping it to save milliseconds degrades a full pipeline stage of conflict detection lead time.
- **"The workflow-index-maintainer mod has a Case B fallback specifically for this"** -- Case B is a band-aid, not a design. Per `~/.claude/projects/-Users-kent-Project-spacedock/memory/workflow-index-lifecycle-gap.md`, Case B was an interim fallback added in Phase E Plan 1 quality补洞 (2026-04-11). The proper path, which Phase E Plan 3 explicitly mandates, is build-execute calling the transition at stage entry. Relying on Case B perpetuates the ship-time granularity bug and turns every execute stage into a silent CONTRACTS drift event.
- **"I can batch the index update with the wave 1 completion commit"** -- batching means the transition lands AFTER wave 1 already ran. For a concurrent plan ensign starting a sibling entity in that window, CONTRACTS says this entity is still `planned` when it is actively mutating files. Stage-transition granularity is exactly the property Case B loses; batching recreates the same loss.
- **"append is more honest than update-status-bulk because it preserves history"** -- appends create new rows instead of transitioning existing ones. The existing rows from build-plan step 9 already declare the (entity, task, file) tuples; appending a second set from execute creates duplicate rows that plan-checker Dim 7 then has to reconcile. `update-status-bulk` is the correct operation because the plan-time rows are authoritative and need a status flip, not a rewrite, and the bulk variant produces a single atomic commit per entity transition rather than N per-file commits.
- **"Defer the transition to build-review stage, since review reads CONTRACTS anyway"** -- review reading CONTRACTS does not create CONTRACTS rows. Deferring means wave dispatch happens while CONTRACTS still says `planned`, and the whole in-flight detection window is lost. This is the exact gap the memory mandate closes.

**Red flags -- STOP and call workflow-index update-status-bulk first:**
- "Timestamps are close enough, nobody will notice..."
- "Case B fallback is specifically for this, that's what it's there for..."
- "Batch the index update with wave 1 completion commit..."
- "Append is more honest than update-status-bulk because it preserves history..."

All of these mean: call `Skill("spacedock:workflow-index", {mode: write, operation: update-status-bulk, entry: {entity, files, new_status: "in-flight"}})` NOW, wait for the `chore(index):` commit to land, THEN dispatch wave 1.

**Why this rule exists:** workflow-index stage-transition granularity is how cross-entity coherence detection (plan-checker Dim 7) gets lead time on in-flight conflicts. If every row is eventually-consistent at ship-time (the Case B failure mode), two concurrent execute-stage entities touching the same file cannot see each other until both ship, which defeats the purpose of the coherence check. build-plan step 9 appends at `planned`; build-execute step 2 transitions to `in-flight`; both are load-bearing, neither is optional.

### BLOCKED Escalation Ladder

**BLOCKED re-dispatch escalates model tiers: haiku -> sonnet -> opus, once each.** This is the ladder from spec lines 274-276. You climb it exactly once per task. Terminal failure only after the third BLOCKED on opus.

**No exceptions. Never on any of these rationales:**
- **"2/3 is a good batch, mop up task-2 next round"** -- completion bias. Shipping 2/3 of a wave is shipping an incomplete wave, which corrupts the wave barrier that later waves depend on. Partial wave completion is still wave failure; the escalation ladder exists so you don't abandon tasks prematurely.
- **"BLOCKED is BLOCKED, circuit breaker says stop retrying"** -- the global circuit-breaker rule forbids retrying the **same** strategy on repeated identical errors. Model escalation is explicitly NOT that -- each tier is a fundamentally different reasoning budget, which the circuit-breaker rule allows. Haiku -> sonnet -> opus is three different strategies, not three retries of one. Applying the circuit-breaker rule to skip the ladder is misreading the rule.
- **"opus is expensive, not worth the burn for a small validation task"** -- cost pressure applied to a stuck task is false economy. The alternative is shipping a broken entity or escalating to replan, both of which burn more compute than one opus dispatch. The ladder exists precisely because the cost of a stuck task is always greater than the cost of climbing one more tier.
- **"If haiku couldn't find the pattern, plan is obviously under-specified, jump to replan"** -- replan shortcut. Replan flag is the outcome when even opus cannot complete the task, not when haiku cannot. Jumping tiers is how genuinely fixable tasks get papered over as plan defects and shipped to the next plan iteration with no new information.
- **"Dispatch an additional haiku in parallel, hoping one converges"** -- parallel retry of the same tier is cargo-cult concurrency. Two haiku dispatches of the same task have the same reasoning budget and will BLOCK on the same constraint. The ladder is about capability tiers, not dispatch count.

**Red flags -- STOP and climb the ladder instead:**
- "Circuit breaker says stop retrying..."
- "Opus is expensive, not worth it..."
- "Jump to replan and save a dispatch cycle..."
- "Ship what passed, mop up the rest next round..."

All of these mean: re-dispatch the BLOCKED task at the next model tier up, include the prior blocked_reason in the prompt, wait for the return, and only classify terminal failure after the third BLOCKED on opus.

**Why this rule exists:** task-execution's BLOCKED status means "cannot complete without a plan change" *as judged by the model tier that attempted the task*. A task that genuinely requires opus reasoning will BLOCK on haiku with a blocked_reason that looks like a plan defect from the outside. Climbing the ladder is how execute distinguishes between "plan is wrong" (fails even on opus) and "task needs more reasoning" (succeeds on sonnet or opus). Jumping to replan on the first BLOCKED hides the distinction and corrupts the signal that replan relies on.

### Task Dispatch Contract

- **Every task dispatches via `Agent(subagent_type="spacedock:task-executor", model=task.model, prompt=...)`** -- never with a different subagent type, never inline, never via `Skill`. The task-executor agent is the only authorized execution vessel for plan tasks, and it loads `skills/task-execution/SKILL.md` automatically.
- **NEVER commit from inside a task-executor dispatch.** Task-executors return `changed_files` lists; you commit serially after the wave closes. Per-task commits batched into a wave are the orchestrator's job, not the subagent's.
- **NEVER skip an acceptance_criteria command.** The task-execution skill already enforces this at the subagent level, but your orchestrator prompt must not override it with "skip X for speed" instructions. Prior green in a neighbor task is stale evidence.
- **NEVER dispatch a task-executor with `serial="true"` tasks in parallel.** The serial hint is a plan-level decision; honoring it is a contract.

### Serial Commits After Each Wave

- **One commit per task, never batched.** A wave of 3 DONE tasks produces 3 commits, not 1. Batching across tasks hides which task touched which files and breaks `git bisect` + PR review decomposition.
- **Pre-commit hook fires per commit.** Do NOT override with `--no-verify`. If the hook fails on a task, revert the staged edits and escalate the task as BLOCKED per step 7.
- **Update Validation Map per successful commit.** status + last-run columns reflect actual commit state, not dispatch completion.

### Scope and Interaction

- **Never invoke other stage skills.** You are the execute orchestrator; you do not call build-quality, build-review, or build-uat. FO routes entities between stages.
- **Never edit files outside task dispatch.** Your Write/Edit scope is strictly the entity body's `## Stage Report: execute` section and the `## Validation Map` status columns. All code edits happen inside task-executor subagents.
- **Use `--` (double dash)** everywhere. Never `—` (em dash). Matches the rest of the build skill family.
- **Preserve task ids verbatim** in the Stage Report. Do not rephrase or abbreviate them.

---

## Red Flags -- STOP and escalate instead

Any of the following means execute is not ready to advance. Write `## Stage Report: execute` with the appropriate `feedback-to` and return:

- **Wave graph dependency violation.** Step 1 surfaced a read_first that depends on a file written by a later wave. `feedback-to: plan` with dimension_3 finding. Do not dispatch. Do not patch topology.
- **workflow-index transition returns zero rows.** Step 2 called update-status and got zero matches, meaning build-plan step 9 did not append. `feedback-to: plan` with a workflow-index-append-missing finding. Do not dispatch. Do not call append from execute context.
- **Opus BLOCKED on third dispatch.** The escalation ladder completed without resolution. `feedback-to: execute` with the accumulated blocked_reasons and `replan flag: raised`. Captain reads the flag and decides.
- **Pre-commit hook fails per task.** The task's edits broke a lint/tsc invariant the task did not declare. Revert the staged edits, reclassify the task as BLOCKED, escalate per the ladder. If the hook is failing on something the task could not have caused (e.g., broken config in an unrelated file), escalate with `feedback-to: execute` + a pre_existing_failure finding.
- **Plan input sections missing.** `## PLAN`, `## Validation Map`, or `## Stage Report: plan` is absent or malformed. `feedback-to: plan`. Do not attempt to execute on partial input.

All of these mean: stop, write the Stage Report with the right `feedback-to`, return to FO. Do not ship a broken execute pass to quality stage.
