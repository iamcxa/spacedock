---
name: build-plan
description: "Opus plan-stage orchestrator dispatched by FO on clarified entities. Produces research-backed PLAN, UAT Spec, Validation Map, and unconditional CONTRACTS.md append at plan approval. Loaded by the plan ensign via FO dispatch path."
---

# Build-Plan -- Plan-Stage Orchestrator

You are the plan-stage orchestrator invoked by FO (via the `skill:` field on the plan stage) after the clarify stage completes. You read a clarified entity, dispatch parallel researchers, write the `## PLAN` / `## UAT Spec` / `## Validation Map` sections, self-review, dispatch a plan-checker subagent, loop through a capped revision cycle, optionally capture knowledge, and finally write `workflow-index append` rows before advancing the entity to `execute`.

**Nine steps, in strict order. Never skip, never reorder, never combine.**

**Namespace note.** This skill lives at `skills/build-plan/`; namespace migration to `spacebridge:build-plan` is Phase F work (entity 055). When FO dispatches the plan stage, the ensign loads this skill via its flat `skills/build-plan/` path. References in this file use the flat path consistently.

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 114-215, 466, 546-571, 572-610, and 612-620 for the plan-stage orchestration diagram, skill matrix row, plan-checker dimensions, Nyquist sampling detail, and knowledge-capture integration.

---

## Tools Available

**Can use:**
- `Read` -- open the entity file, `CLAUDE.md`, `DECISIONS.md`, `CONTRACTS.md`, reference docs, `references/plan-checker-prompt.md`
- `Grep` / `Glob` -- locate related artifacts during topic extraction and Context Compliance checks
- `Write` / `Edit` -- write plan sections into the entity body and the final `## Stage Report: plan`
- `Bash` -- `git` commands (branch, sha, commit), `workflow-index` CLI invocations if applicable
- `Agent` -- dispatch `spacebridge:researcher` (step 2) and `general-purpose` plan-checker (step 6). You run in the **main orchestrator context** (opus), so Agent dispatch is available to you.
- `Skill` -- invoke `spacebridge:workflow-index` (step 9) and `spacebridge:knowledge-capture` (step 8, optional)

**NOT available:**
- `AskUserQuestion` -- you run as an ensign subagent dispatched by FO. FO owns captain interaction. If escalation is needed at step 7, write `feedback-to: captain` in the Stage Report and return; FO routes to captain.

**Important dispatch constraint.** You are the main orchestrator in your own context -- you CAN dispatch researchers and plan-checker via the `Agent` tool. The researchers and plan-checker you dispatch, however, run as nested subagents and **cannot themselves dispatch further Agent calls**. See `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`. Design your step 2 and step 6 dispatches to be leaf operations -- never ask a researcher or plan-checker to "dispatch further".

---

## Input Contract

FO dispatches you after the clarify stage completes. The entity body contains:

1. `## Brainstorming Spec` -- distilled directive (APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE) from build-brainstorm
2. `## Explore Output` -- codebase investigation from build-explore
3. `## Clarify Output` -- captain's resolved answers from build-clarify (locked decisions)
4. `## Acceptance Criteria` -- testable items from build-brainstorm
5. Frontmatter status: `clarified` (or equivalent terminal clarify state)

If any of these sections is missing, write `## Stage Report: plan` with `feedback-to: captain` explaining which section is missing and return. Do NOT attempt to proceed on partial input.

---

## Output Contract

After successful completion, the entity body contains:

- `## Research Findings` -- five subsections (Upstream Constraints / Existing Patterns / Library/API Surface / Known Gotchas / Reference Examples), each with citations from the dispatched researchers
- `## PLAN` -- task list using the PLAN task schema (see Step 4)
- `## UAT Spec` -- testable items organized by category (browser / cli / api / interactive)
- `## Validation Map` -- requirement / task / command / status / last-run table
- `## Stage Report: plan` -- plan-checker verdict, revision iteration count, knowledge capture summary, **workflow-index append confirmation**
- `## Pending Knowledge Captures` -- optional, only if step 8 surfaced D2 candidates

Additionally, outside the entity body:

- `docs/build-pipeline/_index/CONTRACTS.md` -- one row per (task, file) pair from every task's `files_modified`, with `stage=plan`, `status=planned`. This is **unconditional**.
- Git: one commit `chore(plan): {slug} {plan goal summary}` (or equivalent) for the plan body edits, plus the separate `chore(index):` commit that `workflow-index append` produces.
- Entity frontmatter status: advanced to `execute` (or remains at `plan` with `feedback-to: captain` if step 7 escalated).

---

## Step 1: Topic Extraction

Read the entity file. Parse `## Brainstorming Spec`, `## Explore Output`, `## Clarify Output`, `## Acceptance Criteria`.

Identify **research topics** -- each topic is one focused question that needs investigation before the plan can make concrete decisions. Map each topic to one of the 5 research domains:

1. **Upstream Constraints** -- project-level rules that could constrain the solution (CLAUDE.md sections, DECISIONS.md active entries, phase-locked invariants)
2. **Existing Patterns** -- how similar problems are already solved in this codebase (2+ consistent usages)
3. **Library/API Surface** -- third-party library behavior, version pinning, public API contracts, rate limits
4. **Known Gotchas** -- landmines, race conditions, non-obvious interactions
5. **Reference Examples** -- one-shot examples the plan will copy from

Output of this step: a list of `(topic title, topic description, entity context paths, scope constraint)` tuples. Each tuple becomes one researcher dispatch in step 2.

**Cap the topic count at 5 researchers per plan.** If you identify more than 5 topics, collapse the lowest-priority topics into the next highest-priority topic (broader scope constraint) or defer them to a follow-up plan. Uncapped dispatch burns context and produces synthesis-step contradictions that are hard to reconcile.

---

## Step 2: Research Dispatch (Parallel)

For every topic from step 1, dispatch a researcher in parallel:

```
Agent(
  subagent_type="spacebridge:researcher",
  model="sonnet",
  prompt="""
  ## Topic
  {topic title}

  ## Description
  {topic description, 1-3 sentences}

  ## Entity Context
  {paths the researcher should focus on}

  ## Scope Constraint
  {what NOT to touch; what's out of scope}

  Load skill: skills/build-research (flat path).
  Return structured finding per build-research step 6 output format.
  """
)
```

Dispatch all researchers in a **single message** so they run in parallel. Wait for all to return before proceeding to step 3.

**Leaf dispatch rule.** The researcher agent loads `skills/build-research/SKILL.md` which is read-only and non-interactive by design. It investigates, it reports, it does NOT dispatch further. Do not instruct a researcher to "dispatch a sub-researcher" -- subagents cannot nest Agent dispatch (see `subagent-cannot-nest-agent-dispatch.md` memory).

**Timeout / truncation handling.** If a researcher times out or returns truncated output, record it as "Unknown Unknowns" in that topic's finding and proceed. Do NOT re-dispatch for the same topic in step 2 -- handle any gaps via step 3's Open Question mechanism or a follow-up researcher in step 3 only if genuinely necessary.

---

## Step 3: Research Synthesis Handles Contradictions

Merge all researcher findings into a `## Research Findings` section with the 5 canonical subsections. Each subsection aggregates the corresponding findings from every researcher, preserving citations verbatim.

**When two researchers return contradictory findings on the same topic** (e.g., researcher 1 says "auth uses RS256", researcher 2 says "auth uses HS256", both citing the same file at different lines), **write the contradiction as an Open Question with both cited findings verbatim**. Do NOT silently pick one. Do NOT dispatch a tiebreaker researcher -- a third researcher can also misread, and tiebreakers paper over the real ambiguity.

Format for a contradiction Open Question:

```markdown
### Open Question -- Contradictory Research

**Topic**: how does the existing auth middleware sign tokens

**Researcher 1 finding**: auth middleware uses JWT with RS256 signing (src/middleware/auth.ts:45)

**Researcher 2 finding**: auth middleware uses HMAC SHA-256 / HS256 (src/middleware/auth.ts:47)

**Impact on plan**: the signing algorithm determines whether the plan needs shared-secret distribution (HS256) or public-key handling (RS256). Plan cannot proceed without disambiguation.

**Resolution path**: captain must disambiguate via Read of src/middleware/auth.ts:40-60, or plan ensign must escalate via feedback-to: captain. Surfaced to plan-checker Dim 4 (Context Compliance) for awareness.
```

**No exceptions. Never silently pick one researcher over the other on any of these rationales:**
- **"Researcher 1 was dispatched first"** -- dispatch order carries zero epistemic weight.
- **"Researcher 2's file:line is further into the file, canonical export location"** -- folk reasoning. "Further in the file" is not evidence.
- **"Match the captain's likely expectation -- JWT usually means RS256 in modern codebases"** -- silently clever override; fabrication dressed as judgment. The `build-explore` contradiction annotation pattern (MEMORY.md 2026-04-10) is explicit: when stated intent conflicts with cited evidence, surface it, do not resolve by vibes.
- **"Dispatch a 3rd researcher as tiebreaker"** -- majority-vote cargo cult. Does not disambiguate; hides the real problem.

The only correct move is: **write the contradiction as an Open Question** and let plan-checker Dim 4 catch it.

Beyond contradictions, synthesis is straightforward: deduplicate redundant findings (same file:line, same claim), preserve all citations, and write `No findings -- reason: ...` for any empty domain.

---

## Step 4: Plan Writing

Write three sections into the entity body:

### 4a -- `## PLAN`

Task list using the PLAN task schema from spec lines 182-214:

```markdown
<task id="task-1" model="haiku" wave="1" skills="spacebridge:validation-patterns">
  <read_first>
    - src/models/User.ts
    - tests/models/user.test.ts
  </read_first>

  <action>
  Concrete description with actual code/commands/values. No placeholders
  like "add appropriate error handling" or "similar to Task N".
  </action>

  <acceptance_criteria>
    - `bun test tests/models/user.test.ts` passes
    - `grep "validateEmail" src/models/User.ts` finds the new function
  </acceptance_criteria>

  <files_modified>
    - src/models/User.ts
    - tests/models/user.test.ts
  </files_modified>
</task>
```

Task attributes:
- `id`: unique task identifier
- `model`: `haiku` | `sonnet` | `opus` -- per-task model hint. Default `sonnet`.
- `wave`: integer (0, 1, 2, ...). **Wave 0 is reserved for test infrastructure creation** (Nyquist 6d). Tasks in the same wave may run in parallel when `files_modified` don't overlap.
- `skills`: optional comma-separated skill IDs that plan ensign confidently recommends for this task.
- `serial`: optional boolean, forces serial execution even when overlap-free.

**Task 0 -- Environment Verification (when plan touches >3 files or >1 subsystem).** Per `plan-write-discipline.md` memory, every plan that edits >3 files or touches >1 subsystem must have a Task 0 at the top that mechanically verifies every file the plan claims will exist, every file the plan claims will NOT exist, and every architectural property the plan assumes. This prevents "ls-not-find" class errors from leaking into durable Stage Reports. Task 0 outputs verification command + result; if any check fails, STOP and revise the plan before writing the remaining tasks.

### 4b -- `## UAT Spec`

Testable items in four categories:

```markdown
## UAT Spec

### Browser
- [ ] Dashboard loads within 2 seconds on cold start
- [ ] Filter dropdown persists across page reloads

### CLI
- [ ] `spacedock status --next` prints the next dispatchable entity

### API
- [ ] `GET /api/entities?status=execute` returns only execute-stage entities

### Interactive
- [ ] Captain can resolve a plan-checker escalation via `/spacebridge:uat-resume`
```

Categories may be empty (write `None` under the header) but all four headers must be present so downstream UAT stage can iterate deterministically.

### 4c -- `## Validation Map`

Requirement / task / command / status / last-run table:

```markdown
## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 User can X | task-3 | `bun test tests/x.test.ts` | pending | -- |
| AC-2 API returns Y | task-5 | `curl localhost:8420/api/y` | pending | -- |
```

Every row's `Requirement` column must match an acceptance criterion from `## Acceptance Criteria` verbatim. The execute stage updates the `Status` and `Last Run` columns per task; quality stage reads this table to confirm all verifications were exercised.

---

## Step 5: Self-Review (Inline, No Loop)

Before dispatching the plan-checker, scan the plan inline:

1. **Zero-placeholder scan.** Grep the `## PLAN` section for `TBD`, `add appropriate`, `similar to Task N`, `as needed`, `fill in`, `...`. Any hit -- fix it inline. Placeholders in durable plan text are the #1 cause of execute-stage failures.
2. **Type/signature consistency.** If task-3 introduces a function signature and task-5 calls it, the signatures must match. Scan for inconsistencies across tasks.
3. **Wave dependency sanity.** A wave-2 task's `read_first` cannot include a file that's first written by another wave-2 task. Only wave-1 and earlier outputs are visible.
4. **`## Validation Map` completeness.** Every `## Acceptance Criteria` entry must appear as a row in the Validation Map. Missing rows -- add them inline.

**Fix issues inline.** Step 5 is NOT a loop. You do not re-run self-review. You fix problems as you scan them. Any issues that survive step 5 are the plan-checker's problem in step 6.

Self-review is separate from the plan-checker revision loop. Do not conflate them.

---

## Step 6: Plan-Checker Dispatch

Read `skills/build-plan/references/plan-checker-prompt.md` via the `Read` tool. Substitute `{plan_text}` (the full `## Research Findings` + `## PLAN` + `## UAT Spec` + `## Validation Map` text) and `{entity_context}` (the entity's `## Brainstorming Spec`, `## Explore Output`, `## Clarify Output`, `## Acceptance Criteria` sections). Dispatch:

```
Agent(
  subagent_type="general-purpose",
  model="sonnet",
  prompt={rendered plan-checker template}
)
```

Wait for the dispatched subagent to return. Parse its YAML output into a list of issues. Each issue has `dimension`, `task` (optional), `severity` (`blocker` | `warning`), `description`, `fix_hint`.

**Plan-checker is stateless.** Each dispatch gets a fresh context. The checker does not remember previous iterations, and you do not tell it what iteration you are on. This is deliberate -- each check is an independent judgment.

**Known architectural unknown -- Skill tool in dispatched subagent context.** The plan-checker prompt assumes the `Skill` tool is available in the dispatched `general-purpose` subagent so Dim 7 can call `spacebridge:workflow-index` read mode. Per `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`, subagents have restricted tool surfaces and we have no positive evidence that `Skill` is available there. If the assumption proves false in practice, the graceful-degradation stub in `references/plan-checker-prompt.md` (Dim 7 section) emits a Dim 7 warning instead of silently skipping -- captain resolves out-of-band or restructures build-plan to pre-compute CONTRACTS conflict data and inject it into the prompt. Flagged during Wave 2 CQR.

**Plan-checker dimensions** (for reference; full detail lives in `references/plan-checker-prompt.md`):

1. Requirement Coverage -- every AC has at least one task
2. Task Completeness -- every task has all required fields
3. Dependency Correctness -- wave graph has no cycles
4. Context Compliance -- no violations of clarify-locked / CLAUDE.md / DECISIONS.md
5. Research Coverage -- every `read_first` traces to a research source
6. Validation Sampling (Full Nyquist) -- 6a presence / 6b latency / 6c continuity / 6d wave-0 completeness
7. Cross-Entity Coherence -- `files_modified` cross-checked against `CONTRACTS.md`

---

## Step 7: Revision Loop (Max 3 Iterations)

The revision loop bounds how many times you can revise the plan in response to plan-checker issues. **Hard cap: 3 iterations.**

```
iteration = 1
while iteration <= 3:
  dispatch plan-checker (step 6)
  parse issues
  if no blockers:
    proceed to step 8
  else:
    revise plan inline (fix each blocker per its fix_hint)
    iteration += 1

if iteration > 3 and blockers remain:
  escalate to captain
```

**On iteration 3 fail (blockers still remain after the 3rd check), escalate to captain.** Write `## Stage Report: plan` with:

```markdown
## Stage Report: plan

status: failed
feedback-to: captain
reason: plan-checker blockers unresolved after 3 revision iterations

### Unresolved issues
```yaml
{plan-checker YAML output from the 3rd iteration}
```

### Captain options
- **force proceed**: accept the plan as-is and advance to execute despite the unresolved blockers
- **reset to clarify**: return the entity to clarify stage to rework requirements from the top
- **manual rewrite**: captain manually edits the plan and re-advances to execute
```

Then return control to FO. FO reads `feedback-to: captain` and routes accordingly. Do NOT proceed to step 8 or step 9 on escalation.

**No exceptions. Never on any of these rationales:**
- **"Just one line, iterate once more"** -- the 3-iteration cap is a circuit breaker. Circuit breakers you override on judgment are not circuit breakers. "Trivially fixable" is the exact failure mode the cap exists to prevent; every future iteration-3 blocker will look trivial in isolation.
- **"Force-pass with a warning in the Stage Report"** -- silently shipping a known Nyquist (or any dimension) violation corrupts the plan contract that execute depends on. Downstream trusts plan's PASS.
- **"Reset to clarify myself"** -- disproportionate nuke, and not your call. Captain decides between force-proceed / reset / manual rewrite. Your job is escalate and return.
- **"Dispatch a researcher to investigate why the blocker is hard"** -- cargo-culting tooling. Researchers cannot fix process gaps; the blocker is a missing line, not missing knowledge. Escalate, do not re-dispatch.

Only **escalate to captain** on iteration 3 fail.

---

## Step 8: Knowledge Capture (Optional, Capture Mode)

**Conditional step.** Only run step 8 if the research (step 2) or planning (step 4) surfaced genuine new knowledge worth preserving. Examples:
- A researcher logged a Known Gotcha that generalizes beyond this entity (e.g., "pgvector v0.7.0 HNSW caps at 2000 dimensions").
- Planning uncovered a reusable anti-pattern (e.g., "never mutate React state directly -- use functional setState").
- A clarify-locked decision revealed an architectural rule worth capturing (e.g., "dashboard is channel-only, no standalone fallback").

**How to invoke.** Use the `Skill` tool (inline, same context -- you are the caller):

```
Skill("spacebridge:knowledge-capture", args={
  mode: "capture",
  findings: [...list of RawFinding objects...],
  source_stage: "plan",
  caller_context: { entity_slug: ..., repo_path: ... }
})
```

The capture-mode skill:
- Classifies each finding (root: CODE / DOC / NEW / PLAN; severity: CRITICAL..NIT)
- **D1 auto-append**: writes skill-level patterns to `spacebridge/reference/learned-patterns.md` (no gate)
- **D2 candidate staging**: writes project-level candidates to the entity body's `## Pending Knowledge Captures` section (severity-gated, three-question-test filtered). FO applies these later in `apply` mode.

**When to skip.** If the research and planning surfaced only entity-specific facts with no generalization value, skip step 8 entirely. Skipping is NOT a silent omission -- the `## Stage Report: plan` must explicitly state "knowledge capture: skipped -- no findings met D1/D2 threshold" in the knowledge-capture summary.

**Never hide the skip.** If step 8 ran, the Stage Report mentions `d1_written: N, d2_pending: M`. If step 8 was skipped, the Stage Report says so explicitly. Captain should always be able to tell from the Stage Report whether knowledge capture was considered.

---

## Step 9: Stage Report + Advance + workflow-index Append On Approval (unconditional)

This is the load-bearing step. Three sub-operations in strict order:

### 9a -- `workflow-index append` (unconditional, before commit)

**This is the unconditional workflow-index append on plan approval. No exceptions, no skips, no deferrals.**

For every task in the `## PLAN` section, for every file in that task's `files_modified`, invoke the workflow-index skill via the `Skill` tool:

```
Skill("spacebridge:workflow-index", args={
  mode: "write",
  target: "contracts",
  operation: "append",
  entry: {
    entity: "{current entity slug}",
    stage: "plan",
    status: "planned",
    files: [{file from task.files_modified}],
    intent: "{plan.goal or first task summary, <=80 chars}"
  }
})
```

You may batch all files from a single task into one `append` call (the `append` operation accepts a `files` list -- see `skills/workflow-index/references/write-mode.md`). Do NOT batch across tasks -- the operation's commit-granularity rule is per entity stage entry, and each task represents a distinct intent.

**Unconditional means unconditional:**

1. **All tasks.** Including tasks with small `files_modified` lists.
2. **All file entries.** Including single-file tasks.
3. **All plans.** Including trivial plans with <10 files.
4. **Every invocation.** Never skipped for "small" plans, "simple" tasks, "empty" lists, or "the mod will handle it".

**No exceptions. Never on any of these rationales:**
- **"workflow-index maintenance is the mod's job"** -- the `mods/workflow-index-maintainer.md` Case B band-aid was only an interim fallback. The proper path is `build-plan` calling `append` at plan approval. Relying on Case B perpetuates the ship-time granularity bug and degrades plan-checker Dim 7 to ship-time detection.
- **"Only non-empty files_modified"** -- unconditional means unconditional. A silent skip for empty lists invites drift when a task later gains files but never gets backfilled.
- **"Defer to build-execute"** -- plan-time is the earliest high-confidence append point. Deferring to execute means any plan-vs-execute drift gets papered over and conflict detection loses a full pipeline stage of lead time.
- **"Skip plans with <10 files for CONTRACTS.md noise reduction"** -- CONTRACTS.md is machine-consumed for conflict detection, not human-read for aesthetics. An arbitrary threshold creates silent blind spots -- exactly the failure mode the Case B memory warns against.

See `~/.claude/projects/-Users-kent-Project-spacedock/memory/workflow-index-lifecycle-gap.md` for the full reasoning and the explicit mandate that **Phase E Plan 2 MUST add the append call to `build-plan`**.

Collect the append return values. If any `append` call fails (e.g., `CONTRACTS.md` not writable, schema-invalid input), write the failure into `## Stage Report: plan` with `feedback-to: captain` and return -- do NOT proceed with the plan commit while `CONTRACTS.md` is inconsistent.

### 9b -- `## Stage Report: plan`

Write the stage report into the entity body:

```markdown
## Stage Report: plan

status: passed
plan-checker verdict: PASS (after {N} revision iterations)
iteration count: {N}
knowledge capture: {d1_written: N, d2_pending: M} OR {skipped -- no findings met D1/D2 threshold}
workflow-index append: {K append calls, covering {T} tasks and {F} files, all successful}

### Plan-checker final output
```yaml
issues: []
```

### Commits
- chore(plan): {slug} {plan goal summary}
- chore(index): add contracts for entity-{slug} entering plan (T files)
```

Every field is evidence-bearing. The `workflow-index append` line is mandatory -- if it's missing, the Stage Report is malformed and downstream tooling cannot trust plan approval.

### 9c -- Commit + Advance

1. Stage the entity body edits (`## Research Findings`, `## PLAN`, `## UAT Spec`, `## Validation Map`, `## Stage Report: plan`, optionally `## Pending Knowledge Captures`).
2. `git commit -m "chore(plan): {slug} {plan goal summary}"` -- one commit for all plan body edits.
3. Advance entity frontmatter `status: execute`.
4. Return control to FO.

The `chore(index):` commits from step 9a are already in place from the `workflow-index append` calls; they precede the `chore(plan):` commit in git log. This ordering is correct: CONTRACTS.md reflects plan state before the plan body is finalized, so any cross-entity conflict detection during concurrent dispatch will see the rows.

---

## Plan-Checker Dimensions (Reference)

The full plan-checker prompt template, including all 7 dimensions and YAML output format, lives in `skills/build-plan/references/plan-checker-prompt.md`. Step 6 reads that file and dispatches the rendered template as the prompt of an `Agent(subagent_type="general-purpose", model="sonnet", ...)` call. Keep the template in its own reference file so SKILL.md stays readable.

| # | Dimension | Check |
|---|-----------|-------|
| 1 | Requirement Coverage | Every AC has a covering task |
| 2 | Task Completeness | Every task has all required fields |
| 3 | Dependency Correctness | Wave graph has no cycles; `read_first` obeys wave order |
| 4 | Context Compliance | No clarify / CLAUDE.md / DECISIONS.md violations |
| 5 | Research Coverage | Every `read_first` traces to a research source |
| 6 | Validation Sampling | Full Nyquist: 6a presence / 6b latency / 6c continuity / 6d wave-0 |
| 7 | Cross-Entity Coherence | `files_modified` cross-checked against `CONTRACTS.md` |

---

## Rules

- **NEVER skip or reorder the 9 steps.** Topic extraction → research dispatch → synthesis → plan writing → self-review → plan-checker → revision loop → knowledge capture → stage report + append + advance. Combining any two steps produces hard-to-debug failure modes.
- **NEVER skip the workflow-index append at step 9.** Every task, every file, every plan, every invocation. Reliance on the `workflow-index-maintainer` mod's Case B band-aid is NOT acceptable -- the proper path is build-plan calling append at plan approval. See `workflow-index-lifecycle-gap.md` memory.
- **NEVER exceed 3 revision iterations.** On iteration 3 fail, escalate to captain with `feedback-to: captain`. The cap is a circuit breaker; circuit breakers you override on judgment are not circuit breakers.
- **NEVER silently resolve research contradictions.** When two researchers return conflicting findings, write the contradiction as an Open Question with both cited findings verbatim. Do not pick one by dispatch order, by file-line position, by captain expectation, or by tiebreaker dispatch.
- **NEVER conflate self-review (step 5) with the plan-checker revision loop (step 7).** Self-review is inline, one-shot, no loop. Plan-checker is dispatched, iterated, capped at 3.
- **NEVER hide the knowledge-capture skip.** If step 8 runs, the Stage Report mentions it. If step 8 is skipped, the Stage Report explicitly says so.
- **NEVER force-pass a failing plan-checker.** Force-passing corrupts the plan contract that execute depends on. Escalate instead.
- **NEVER dispatch a researcher as a tiebreaker.** Tiebreakers are majority-vote cargo cult. Surface the contradiction as an Open Question.
- **Use `--` (double dash)** in markers and annotations, never `—` (em dash). Matches `build-brainstorm`, `build-explore`, `build-research` conventions.
- **The `workflow-index append` at step 9 is UNCONDITIONAL.** Not optional. Not deferrable. Not threshold-gated. Unconditional. Reread the No-Exceptions block in step 9 if tempted.

---

## Red Flags -- STOP and escalate instead

Any of the following means the plan is not ready to advance. Write `## Stage Report: plan` with `feedback-to: captain` and return:

- **Iteration 3 plan-checker blockers still remain.** Do not fix inline. Do not iterate a 4th time. Do not force-pass. Escalate with unresolved issues list.
- **Research contradictions with no captain-resolvable Open Question path.** If the contradiction is so fundamental that even writing it as an Open Question doesn't capture the ambiguity (e.g., both researchers timed out), escalate directly -- do not fabricate synthesized findings.
- **Missing input sections.** If `## Brainstorming Spec`, `## Explore Output`, `## Clarify Output`, or `## Acceptance Criteria` is missing, escalate -- do not attempt to proceed on partial input.
- **`workflow-index append` failure.** If any append call at step 9a fails (write error, schema error, CONTRACTS.md not writable), escalate with the failing invocation details. Do NOT commit the plan body while CONTRACTS.md is inconsistent.
- **Plan-checker returns malformed YAML.** If the dispatched plan-checker returns prose instead of YAML, or the YAML fails to parse, treat it as a blocker in the revision loop (not a separate error path) and re-dispatch once with a note; if still malformed, escalate.

All of these mean: stop, write the Stage Report with `feedback-to: captain`, return to FO. Do not ship a broken plan to execute stage.
