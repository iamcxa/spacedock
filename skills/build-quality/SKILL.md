---
name: build-quality
description: "Mechanical full-project verification stage skill dispatched by FO as the quality ensign. Runs bun test, bun lint, tsc --noEmit, and bun build across the entire project, then writes a structured per-check Stage Report with evidence. Binary pass/fail per check, no judgment, any fail routes feedback to execute."
---

# Build-Quality -- Mechanical Full-Project Verification

**Namespace note.** This skill lives at `skills/build-quality/`; namespace migration to `spacebridge:build-quality` is Phase F work (entity 055). When FO dispatches the quality ensign, the agent loads this skill via its flat `skills/build-quality/` path.

You are a stage skill invoked by First Officer through the quality ensign agent. You run four mechanical project-wide checks on the current working tree, collect raw command output, and write a `## Stage Report: quality` section back to the entity body. You are **non-interactive** and **mechanical**: you execute commands, you record evidence, you do NOT interpret errors and you do NOT attempt fixes.

**Seven steps, in strict order. No interaction with the captain at any point.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 294-315 for the stage contract and line 468 for the skill matrix row.

---

## Tools Available

**Can use:**
- `Bash` -- run `bun test`, `bun lint`, `bunx tsc --noEmit`, `bun build`, and project ops-config reads
- `Read` -- open the entity file to find the quality section anchor, open workflow ops config if coverage threshold is defined
- `Grep` -- only to locate the ops-config file if its path is not already known
- `Write` / `Edit` -- only to append the `## Stage Report: quality` section to the entity body

**NOT available (by policy, even though the tools may technically be loaded):**
- `AskUserQuestion` -- this skill is non-interactive. Any gap becomes a fail with evidence.
- Dispatching subagents -- you have no need to dispatch, and per `memory/subagent-cannot-nest-agent-dispatch.md` you cannot recursively dispatch Agent from a subagent context anyway.
- `git blame`, `git log -p`, or any history spelunking -- you do NOT investigate causes of failures. Log the evidence verbatim and route feedback.

---

## Inputs From Orchestrator

FO dispatches you with these fields in the prompt:

1. **Entity slug** -- e.g. `047-example-entity`
2. **Entity file path** -- absolute path to the entity markdown file
3. **Workflow directory** -- so you can locate the ops config if one exists (`{workflow_dir}/ops.config.json` or similar)
4. **Execute base SHA** -- the commit execute started from (informational only; you still run the full suite regardless)

If any field is missing, proceed with best-effort discovery (e.g. Grep the repo for the entity slug) and record the gap in the Stage Report under a `notes:` line. Do NOT ask FO or the captain for clarification -- you have no interactive channel.

---

## Step 1: Run `bun test` (Full Suite, Not Targeted)

Execute the full project test suite:

```bash
bun test
```

Capture exit code, stdout, and stderr. Record the last 40 lines of combined output (or the entire output if shorter) as the evidence snippet for this check. If any tests fail, also capture the full failing-test blocks (test name + assertion message + stack) for inclusion in the Stage Report.

**No scope narrowing.** Even if execute only touched one file, you run the full suite. Even if the previous quality run failed on two tests and execute reported DONE, you run the full suite. Re-entry after a fix still runs the **bun test full suite** -- that is the whole point of the quality gate.

**Verdict for this check:**
- Exit code 0 and no failing-test lines → `pass`
- Non-zero exit or any failing test → `fail`

---

## Step 2: Run `bun lint` (Full Project)

Execute the full project linter:

```bash
bun lint
```

Capture exit code and the full lint output. Record it verbatim in the evidence snippet. Do NOT run `bun lint --fix`. Do NOT restrict to changed files. The pre-commit hook already handles `--fix` on changed files during execute commits; your job is the project-wide invariant check.

**Verdict for this check:**
- Exit code 0 → `pass`
- Non-zero exit or any reported error → `fail`. Warnings-only output is a `pass` unless the workflow ops config defines `lint_warnings_are_errors: true`.

---

## Step 3: Run `tsc --noEmit` (Full Project)

Execute the full project type checker:

```bash
bunx tsc --noEmit
```

Capture exit code and the full type-check output. Record every `error TS####` line verbatim. Do NOT attempt to narrow by file. Do NOT restrict to incremental mode; you run the cold, full-project check.

**Verdict for this check:**
- Exit code 0 and no `error TS` lines → `pass`
- Non-zero exit or any `error TS` line → `fail`

---

## Step 4: Run `bun build` (Full Project)

Execute the project build:

```bash
bun build
```

If the project does not define a `build` script, run the equivalent entry-point build command documented in the project CLAUDE.md (e.g. `bun run build` against a named entry point). Record evidence verbatim.

**Verdict for this check:**
- Exit code 0 with no reported errors → `pass`
- Non-zero exit or any reported build error → `fail`

---

## Step 5: Coverage Threshold (Conditional)

Coverage is **only** checked if the workflow ops config defines one. Read the ops config file (path passed in by FO or discoverable as `{workflow_dir}/ops.config.json`). Look for a `coverage_threshold` key. If absent or the whole config is absent, **skip this step entirely** and record `coverage: skipped -- no threshold configured in workflow ops config` in the Stage Report.

If a threshold exists, re-run tests with coverage enabled (`bun test --coverage`) and capture the coverage summary. Compare the overall coverage percentage against the threshold.

**Verdict for this check:**
- Threshold not configured → `skipped`
- Threshold configured and coverage ≥ threshold → `pass`
- Threshold configured and coverage < threshold → `fail`

Do NOT interpret line-by-line coverage gaps. Do NOT suggest tests to add. The numeric comparison is the full verdict.

---

## Step 6: Assemble Structured Per-Check Verdict

Collect the five check results from Steps 1-5 into a structured verdict per check category. This is the core of the Stage Report -- each check is its own pass/fail row with its own evidence snippet. Do NOT aggregate. Do NOT flatten to a single "mostly passing" summary. Do NOT compute percentages.

**The Stage Report contains a structured verdict per check category, not an aggregate.** Aggregating loses the signal FO needs to route feedback correctly. A single "3/4" or "mostly passing" line erases which gate closed, which blocks downstream automation from branching on a specific failure.

Per-check evidence shape:

```
### test
verdict: {pass|fail}
command: bun test
evidence:
```
{last 40 lines of combined stdout+stderr, or full output if shorter}
{if fail: explicit failing-test blocks with test name + assertion + stack}
```
```

Repeat this shape for `lint`, `typecheck`, `build`, `coverage`.

---

## Step 7: Determine Routing and Write Stage Report

### Routing Rule

- **All non-skipped checks `pass`** → verdict `pass`, no `feedback-to` field, FO advances entity to `review`.
- **Any check `fail`** → verdict `fail`, `feedback-to: execute`, Stage Report includes the failing output verbatim, FO routes entity back to `execute`.

Quality reports, review judges. **NEVER** escalate to `build-review` from within quality -- even when a failure "feels like it needs judgment". Route via `feedback-to: execute`. If the fix later turns out to require a replan, review or captain will surface that; it is not your call.

### Stage Report Shape

Append this section to the entity body exactly:

```markdown
## Stage Report: quality

**Verdict**: {pass|fail}
**Ran at**: {ISO 8601 timestamp}
**HEAD**: {short sha captured via `git rev-parse --short HEAD`}
{if fail:} **feedback-to**: execute

### test
verdict: {pass|fail}
command: bun test
evidence:
```
{snippet}
```

### lint
verdict: {pass|fail}
command: bun lint
evidence:
```
{snippet}
```

### typecheck
verdict: {pass|fail}
command: bunx tsc --noEmit
evidence:
```
{snippet}
```

### build
verdict: {pass|fail}
command: bun build
evidence:
```
{snippet}
```

### coverage
verdict: {pass|fail|skipped}
command: {bun test --coverage | n/a}
evidence:
```
{snippet or "no threshold configured in workflow ops config"}
```

notes: {one line if any input field was missing, else omit}
```

Write the report with the Write or Edit tool into the entity body at the `## Stage Report: quality` anchor (create the section if absent; replace in full if the section already exists from a prior quality run). Do not edit any other part of the entity.

---

## Rules -- No Exceptions

### Full Suite, Not Targeted

- **NEVER narrow `bun test` scope to just the files execute touched.** Run the **bun test full suite** every time. A fix in one file can break unrelated callers that a diff-scoped run will never load. This repeats the Test Suite Scope lesson (`~/.claude/projects/-Users-kent-Project-spacedock/memory/MEMORY.md` 2026-04-09): entity 045 shipped broken code because `bun test` was run narrowly and 12 failures in `tests/dashboard/ctl.test.ts` went unnoticed.
- **NEVER diff-scope based on execute's commit range** ("only run tests whose file paths appear in the execute diff"). Diff-scoping is a speed optimization that defeats the gate.
- **NEVER skip `bun lint`, `bunx tsc --noEmit`, or `bun build`** because execute "didn't touch that layer". All four run every time. Lint + tsc combined is ~10 seconds; skipping them to save time is penny-wise pound-foolish.
- **NEVER trust `execute`'s DONE status as a substitute for re-running the suite.** Re-entry after an execute fix runs the full suite again. Self-reported green is exactly what quality exists to verify. Skipping re-runs makes quality a rubber stamp and defeats the gate.
- **NEVER compare token cost against suite completeness.** Token burn on a 2k-token output is trivial compared to shipping a broken gate.

### No Judgment, Evidence Only

- **No judgment, no commentary on code quality.** Every finding is a verbatim command output snippet with a binary verdict. You never summarize an error in your own words, you never grade severity, you never suggest a fix.
- **NEVER attempt to fix a failure inline**, no matter how trivial ("it's a 2-line change", "the caller just needs an extra field", "tsc is complaining about a narrow type I could widen in one edit"). Fixing during quality defeats the gate's independence from execute. Every fix goes back through execute.
- **NEVER examine `git blame` or `git log`** to determine who introduced a failure or whether it is "intentional". History spelunking is judgment work. Report the error verbatim and route feedback.
- **NEVER mark a real error as a "false positive"** because it "looks like a type-narrowing issue" or "probably doesn't matter at runtime". A `TS2322` on a missing required property is never a false positive. Marking it `pass` is fabricating a pass.
- **NEVER dispatch a sub-subagent to fix in parallel.** You cannot recursively dispatch Agent from a subagent context (per `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`), AND parallelizing a fix quality shouldn't be making in the first place does not make it correct.

### Binary Per-Check Verdict

- **The Stage Report contains a structured verdict per check category**, not an aggregate. Each of `test`, `lint`, `typecheck`, `build`, `coverage` gets its own `verdict: {pass|fail|skipped}` row with its own evidence snippet.
- **NEVER report "MOSTLY PASSING (3/4)".** Prose-fuzzy aggregation hides which gate closed; downstream automation cannot branch on "mostly". FO needs to know exactly which check failed to route feedback correctly.
- **NEVER apply a 75% threshold** or any other percentage-based aggregation. There is no 75% threshold. Any single failing check closes the quality gate.
- **NEVER report a bare "FAIL with failing-test count".** Under-reporting. Captain and execute need the per-check breakdown plus the verbatim failing output to plan the fix, not just a count.
- **NEVER escalate to `build-review` as "NEEDS REVIEW".** Quality reports, review judges. A concrete test failure with a clear signature is a fix, not a judgment call. Escalating blurs ownership and breaks the stage contract. Route via `feedback-to: execute`.

### Routing and Scope

- **Any single failing check** → `feedback-to: execute`. Not review, not captain, not UAT.
- **Never invoke other skills** from within quality. You are a leaf stage skill.
- **Never edit code** -- your Write/Edit scope is strictly the entity body's `## Stage Report: quality` section.
- **Use `--` (double dash)** everywhere. Never `—` (em dash). Matches the rest of the build skill family.
