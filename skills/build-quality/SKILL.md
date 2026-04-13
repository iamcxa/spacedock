---
name: build-quality
description: "Mechanical full-project verification stage skill dispatched by FO as the quality ensign. Runs bun test, bun lint, tsc --noEmit, and bun build across the entire project, then writes a structured per-check Stage Report with evidence. Binary pass/fail per check, no judgment, any fail routes feedback to execute."
---

# Build-Quality -- Mechanical Full-Project Verification

**Namespace note.** This skill lives at `skills/build-quality/`; namespace migration to `spacebridge:build-quality` happens when spacebridge plugin skeleton is created (entity 050). When FO dispatches the quality ensign, the agent loads this skill via its flat `skills/build-quality/` path.

You are a stage skill invoked by First Officer through the quality ensign agent. You run four mechanical project-wide checks on the current working tree, collect raw command output, and write a `## Stage Report: quality` section back to the entity body. You are **non-interactive** and **mechanical**: you execute commands, you record evidence, you do NOT interpret errors and you do NOT attempt fixes.

**Seven steps, in strict order. No interaction with the captain at any point.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 294-315 for the stage contract and line 468 for the skill matrix row.

---

## Tools Available

**Can use:**
- `Bash` -- run `bun test`, `bun lint`, `bunx tsc --noEmit`, `bun build`, project ops-config reads, and `find` for config file scanning (Step 0.5 language detection)
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

## Step 0.5: Language and Runner Detection

Auto-detect which languages are present in the project by scanning for config files at the repo root and one level of subdirectories. This step runs once; Steps 1-4 consume its output.

**Detection table:**

| Config file | Language | Test runner | Type checker | Linter | Build |
|-------------|----------|-------------|--------------|--------|-------|
| `tsconfig.json` | TypeScript | `bun test` (default), `vitest run` (if vitest.config.*), `npx jest` (if jest.config.*) | `bunx tsc --noEmit -p {tsconfig_path}` | `bun lint` (if eslint config exists) | `bun build` (if build script in package.json) |
| `pyproject.toml` or `setup.py` | Python | `pytest` (if pytest in deps), `python -m unittest discover` (fallback) | `pyright` (if pyright in deps or pyrightconfig.json), `mypy` (if mypy in deps) | `ruff check .` (if ruff in deps) | n/a |
| `go.mod` | Go | `go test ./...` | `go vet ./...` (built-in) | `golangci-lint run` (if installed) | `go build ./...` |
| `Cargo.toml` | Rust | `cargo test` | (built-in to cargo check) | `cargo clippy` (if installed) | `cargo build` |

**Procedure:**

1. Scan for config files: `find . -maxdepth 2 -name "tsconfig.json" -o -name "pyproject.toml" -o -name "setup.py" -o -name "go.mod" -o -name "Cargo.toml" | head -20`
2. For each detected config, resolve the runner by checking for runner-specific config files (vitest.config.ts, jest.config.js, pyrightconfig.json, etc.) in the same directory or repo root.
3. Produce a `detected_languages` list of `{language, config_path, test_cmd, typecheck_cmd, lint_cmd, build_cmd}` objects.
4. If no config files found, default to the legacy hardwired commands: `{language: "typescript", test_cmd: "bun test", typecheck_cmd: "bunx tsc --noEmit", lint_cmd: "bun lint", build_cmd: "bun build"}`.

**Evidence:** Record the full find output and the resolved runner list in the evidence snippet for this step. The evidence is informational only -- Step 0.5 never fails.

**TS enhanced sub-detection:** For each detected TypeScript config, also record:
- `strict_mode`: whether `"strict": true` is set in compilerOptions
- `include_globs`: the `include` array from the tsconfig
These are consumed by Step 4.75 for TS-specific ratchets.

---

## Step 1: Run `bun test` (Full Suite, Not Targeted)

Execute the full project test suite:

```bash
bun test
```

Capture exit code, stdout, and stderr. Record the last 40 lines of combined output (or the entire output if shorter) as the evidence snippet for this check. If any tests fail, also capture the full failing-test blocks (test name + assertion message + stack) for inclusion in the Stage Report.

**No scope narrowing.** Even if execute only touched one file, you run the full suite. Even if the previous quality run failed on two tests and execute reported DONE, you run the full suite. Re-entry after a fix still runs the **bun test full suite** -- that is the whole point of the quality gate.

**Runner-aware execution.** If Step 0.5 detected multiple languages, run the test command for EACH detected language sequentially. Record per-language test output. The overall Step 1 verdict is `fail` if ANY language's test command fails. Per-language results are recorded as sub-sections in the evidence snippet:

```
#### typescript
command: bun test
exit_code: 0
output: {snippet}

#### python
command: pytest
exit_code: 0
output: {snippet}
```

If Step 0.5 produced only the legacy default (single TypeScript), run `bun test` exactly as before -- no behavioral change for single-language projects.

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

**Runner-aware execution.** If Step 0.5 detected multiple languages, run the lint command for EACH detected language sequentially. Record per-language lint output. The overall Step 2 verdict is `fail` if ANY language's lint command fails. Per-language results are recorded as sub-sections in the evidence snippet (same shape as Step 1). If Step 0.5 produced only the legacy default (single TypeScript), run `bun lint` exactly as before -- no behavioral change for single-language projects.

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

**Runner-aware execution.** If Step 0.5 detected multiple languages, run the typecheck command for EACH detected language sequentially. For TypeScript, run `bunx tsc --noEmit -p {tsconfig_path}` for EACH detected tsconfig.json (there may be multiple: spacebridge/tsconfig.json, tools/dashboard/tsconfig.json). Record per-language typecheck output. The overall Step 3 verdict is `fail` if ANY language's typecheck command fails. Per-language results are recorded as sub-sections in the evidence snippet (same shape as Step 1). If Step 0.5 produced only the legacy default (single TypeScript), run `bunx tsc --noEmit` exactly as before -- no behavioral change for single-language projects.

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

**Runner-aware execution.** If Step 0.5 detected multiple languages, run the build command for EACH detected language sequentially. Record per-language build output. The overall Step 4 verdict is `fail` if ANY language's build command fails. Per-language results are recorded as sub-sections in the evidence snippet (same shape as Step 1). If Step 0.5 produced only the legacy default (single TypeScript), run `bun build` exactly as before -- no behavioral change for single-language projects.

**Verdict for this check:**
- Exit code 0 with no reported errors → `pass`
- Non-zero exit or any reported build error → `fail`

---

## Step 4.5: Regression Gate (Cross-Entity)

This step classifies whether Step 1 test failures are caused by the current entity's changes breaking a prior entity's test coverage. It does NOT re-run tests -- it reuses Step 1's already-captured results.

**(1) Auto-pass shortcut.** If Step 1 verdict = `pass` (all tests green, exit code 0, zero failing-test lines), Step 4.5 verdict = `pass` with evidence:

```
Step 1 passed, all tests green including cross-entity coverage. No regression possible.
```

Skip to Step 5. Do NOT query CONTRACTS.md when Step 1 is green -- if all tests passed, prior entity tests also passed by definition.

**(2) CONTRACTS.md query when Step 1 failed.** If Step 1 verdict = `fail`, read `docs/build-pipeline/_index/CONTRACTS.md`. Parse the `## Active Contracts` section: each subsection header is a file path (e.g., `### skills/build-review/SKILL.md`), and each table row under it has columns `Entity | Stage | Intent | Status | Last Updated`. Run:

```bash
git diff --name-only {execute_base}..HEAD
```

to get the current entity's file delta. For each file path in the delta, check if CONTRACTS.md has a subsection for that path with a DIFFERENT entity's row (status `final` or `in-flight`).

**(3) Cross-entity regression classification.** For each failing test file from Step 1's evidence, check if the test's corresponding source file appears in CONTRACTS.md under a DIFFERENT entity (not the current one) with status `final` or `in-flight`. If yes, classify that failure as `cross-entity-regression`.

Convention: for a failing test at `tests/foo/bar.test.ts`, the corresponding source file is typically `src/foo/bar.ts` or the closest co-located source. Use the file paths from Step 1's failing-test output (stack traces, file references) to identify which source files are involved.

**(4) Verdict.**
- If any `cross-entity-regression` classified failure found: verdict = `fail`, classification tag = `cross-entity-regression`, `feedback-to: execute` with prior entity context (entity slug + overlapping file path from CONTRACTS.md) included in the Stage Report.
- If all Step 1 failures are current-entity only (no CONTRACTS.md cross-entity match): verdict = `pass` for the regression gate. The current-entity failures are already handled by Step 1's `fail` verdict and `feedback-to: execute`. Step 4.5 does not duplicate that routing.

---

## Step 4.75: Ratchet Checks (Per-Language)

Two ratchet invariants per detected language, plus TS-specific enhanced ratchets. Ratchets compare current counts against persisted baselines in ops.config.json. On first run (no baseline), skip with warning and write initial baselines.

**Read baselines.** Read `{workflow_dir}/ops.config.json`. Parse the `ratchet_baselines` key. If the file is absent or the key is missing, treat all baselines as absent (first run).

### Ratchet 1: Type Coverage

For each detected language, verify that every source file is covered by at least one type-check config.

**TypeScript procedure:**
1. Enumerate all .ts files: `find . -name "*.ts" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.worktrees/*"`
2. For each tsconfig.json detected in Step 0.5, parse its `include` globs and `exclude` globs.
3. For each .ts file, check if it matches at least one tsconfig's include pattern (and is not excluded). Files not covered by any tsconfig are flagged.
4. Verdict: if any .ts file is uncovered, `fail`. Evidence: list each uncovered file path.

**Python procedure:**
1. Enumerate all .py files: `find . -name "*.py" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/__pycache__/*"`
2. Check if a type checker config exists (pyrightconfig.json, mypy.ini, or pyproject.toml with [tool.pyright] or [tool.mypy]).
3. If no type checker config, all .py files are uncovered. If config exists, check its include/exclude rules.
4. Verdict: same as TS -- uncovered files → `fail`.

**Other languages:** Go and Rust have built-in type checking (go vet, cargo check). Type coverage ratchet is auto-pass for these -- record "built-in type checking, all source files covered by language toolchain" in evidence.

### Ratchet 2: Test Count

For each detected language, count current tests and compare against baseline.

**Procedure:**
1. Run the detected test command with count extraction:
   - TypeScript/bun: parse `bun test` output for pass/fail/skip counts
   - Python/pytest: `pytest --co -q` (collect-only, outputs test count)
   - Go: `go test ./... -v 2>&1 | grep -c "=== RUN"`
   - Rust: `cargo test -- --list 2>&1 | grep -c "test "`
2. Compare `count(current) >= count(baseline)` from ops.config.json.
3. If no baseline exists (first run): skip comparison, record current count as initial baseline. Emit `ratchet: skipped -- first run, baseline initialized at {count}`.
4. If `count(current) < count(baseline)`: verdict `fail`. Evidence: `test count regression: current={N} < baseline={M}, delta={N-M}`.
5. If `count(current) >= count(baseline)`: verdict `pass`. Update baseline to current count (deferred to Step 7 -- baselines only written on overall quality pass).

### TS Enhanced Ratchets

These sub-ratchets apply only to detected TypeScript configs. They are tracked as sub-counts within the ratchet evidence, not as separate Stage Report check categories.

**TS-E1: Strict mode verification.**
For each tsconfig.json, verify `"strict": true` is set. If strict is false or absent, emit a `warning` (not fail on first detection -- the ratchet tracks whether strict was enabled at baseline time). If strict was true at baseline and is now false: `fail`.

**TS-E2: `as any` cast count.**
Run: `grep -rc "as any" --include="*.ts" {src_dirs} | tail -1` (total count).
Compare against baseline. `count(current) > count(baseline)` → `fail`. New casts must not be added.

**TS-E3: `@ts-ignore` / `@ts-expect-error` count.**
Run: `grep -rc "@ts-ignore\|@ts-expect-error" --include="*.ts" {src_dirs} | tail -1` (total count).
Compare against baseline. `count(current) > count(baseline)` → `fail`. Suppressions must not increase.

### Baseline Update Rule

Baselines are written to ops.config.json ONLY when the overall quality verdict is `pass` (all checks green, Step 7). This ensures the ratchet never ratchets down from a failing state. The update happens in Step 7 after the verdict is determined, not in Step 4.75.

**ops.config.json schema for ratchet_baselines:**

```json
{
  "ratchet_baselines": {
    "typescript": {
      "test_count": 342,
      "as_any_count": 5,
      "ts_ignore_count": 2,
      "strict_mode": true,
      "uncovered_files": []
    },
    "python": {
      "test_count": 87,
      "uncovered_files": []
    }
  }
}
```

### Evidence Shape

Record per-language ratchet results in the evidence snippet. This evidence feeds into the Stage Report `### ratchet` check category (see Step 6).

```
#### typescript
type_coverage: pass (47/47 files covered by 2 tsconfigs)
test_count: pass (current=342 >= baseline=340)
ts_strict: pass (all tsconfigs have strict: true)
ts_as_any: pass (current=5 <= baseline=5)
ts_ignore: pass (current=2 <= baseline=2)

#### python
type_coverage: skipped (no python detected)
test_count: skipped (no python detected)
```

### Verdict

- All ratchets pass for all detected languages → `pass`
- Any ratchet fails for any language → `fail`
- First run with no baselines → `pass` (baselines initialized, no comparison possible)

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

Collect the six check results from Steps 1-5 (including Step 4.75) into a structured verdict per check category. This is the core of the Stage Report -- each check is its own pass/fail row with its own evidence snippet. Do NOT aggregate. Do NOT flatten to a single "mostly passing" summary. Do NOT compute percentages.

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

Repeat this shape for `lint`, `typecheck`, `build`, `regression`, `ratchet`, `coverage`.

For `regression` (Step 4.5), use this shape:

```
### regression
verdict: {pass|fail}
command: n/a -- reuses Step 1 evidence
classification: {cross-entity-regression | current-entity-only | auto-pass (Step 1 green)}
evidence:
```
{If auto-pass: "Step 1 passed, all tests green including cross-entity coverage. No regression possible."}
{If cross-entity-regression: prior entity slug + overlapping file path from CONTRACTS.md + failing test reference}
{If current-entity-only: "Step 1 failures are entity-scope only; no CONTRACTS.md cross-entity match found"}
```
{if fail:} prior-entity: {entity-slug}
{if fail:} overlapping-file: {file path from CONTRACTS.md}
```

---

## Step 6.5: Classify Failures by Entity Diff Scope

This step runs ONLY when (a) at least one check has verdict=fail AND (b) the dispatch prompt included an execute_base_sha. If either condition is unmet, skip to Step 7 and treat all failures as entity-scope (the safe default).

This step does NOT narrow the test suite (that is prohibited by Rule "Full Suite, Not Targeted"). It classifies ROUTING after the full suite has already run. The distinction: Step 1-5 answer "does the project pass?"; Step 6.5 answers "who broke it?".

1. Run `git diff --name-only {execute_base_sha}..HEAD` to get the entity's file delta.
2. For each failing check, extract the failing file paths from the evidence (test file for bun test, source file for tsc, etc.).
3. Classify each failure:
   - **entity-scope** -- at least one failing file appears in the entity's diff. Normal feedback-to: execute.
   - **pre-existing** -- NO failing file appears in the entity's diff. Logged in Stage Report as `scope: pre-existing ({file} not in entity diff {execute_base_sha}..HEAD)`. Does NOT trigger feedback-to: execute.
4. Record the classification inline in each check's Stage Report subsection (add a `scope:` line after `verdict:`).

**Aggregate routing override:** If ALL failures are classified pre-existing, the overall verdict becomes `pass (pre-existing failures noted)` and no `feedback-to` is emitted. FO advances normally. If ANY failure is entity-scope, the overall verdict is `fail` with `feedback-to: execute` containing only the entity-scope evidence.

**This is NOT git blame or history spelunking.** `git diff --name-only` is a pure file-delta check with zero judgment. It answers "did this entity's execute stage touch the failing file?" -- a mechanical question. The prohibition on `git blame` and `git log -p` in the Tools Available section targets causal investigation ("who introduced this and why?"), which remains prohibited.

---

## Step 7: Determine Routing and Write Stage Report

### Routing Rule

- **All non-skipped checks `pass`** (including `pass (pre-existing failures noted)` from Step 6.5) → verdict `pass`, no `feedback-to` field, FO advances entity to `review`.
- **Any check `fail` with entity-scope classification** → verdict `fail`, `feedback-to: execute`, Stage Report includes the entity-scope failing output verbatim, FO routes entity back to `execute`.
- **All failures pre-existing (Step 6.5 override)** → verdict `pass (pre-existing failures noted)`, no `feedback-to`, Stage Report includes pre-existing failures as informational evidence. FO advances and optionally spawns a follow-up entity for the pre-existing drift.

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

### regression
verdict: {pass|fail}
command: n/a -- reuses Step 1 evidence
classification: {cross-entity-regression | current-entity-only | auto-pass (Step 1 green)}
evidence:
```
{see Step 4.5 verdict shape}
```
{if fail:} prior-entity: {entity-slug}
{if fail:} overlapping-file: {file path from CONTRACTS.md}

### ratchet
verdict: {pass|fail|skipped}
command: n/a -- composite of per-language ratchet checks
evidence:
```
{per-language ratchet results from Step 4.75}
{if fail: which language, which ratchet, current vs baseline counts}
{if skipped: "first run -- baselines initialized, no comparison"}
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

**Baseline update.** After determining overall verdict `pass`, update ops.config.json `ratchet_baselines` with current counts from Step 4.75. Use Read + Write to atomically update the file. If ops.config.json does not exist, create it with the `ratchet_baselines` key only. Do NOT update baselines if overall verdict is `fail` or `pass (pre-existing failures noted)` -- baselines only advance on a clean overall pass.

Write the report with the Write or Edit tool into the entity body at the `## Stage Report: quality` anchor (create the section if absent; replace in full if the section already exists from a prior quality run). Do not edit any other part of the entity.

---

## Rules -- No Exceptions

### Regression Gate -- No Re-Execution

- **NEVER re-run tests in Step 4.5.** Step 4.5 reuses Step 1 evidence exclusively. The full suite already ran in Step 1; re-running it in Step 4.5 is redundant, costs tokens, and would produce identical results. Evidence reuse is the contract.
- **NEVER skip CONTRACTS.md query when Step 1 has failures.** When Step 1 verdict = fail, CONTRACTS.md query is mandatory. The query is lightweight (one file read + table parse) and is the only way to distinguish current-entity failures from cross-entity regressions. Skipping it when failures exist means cross-entity regressions go undetected and get misrouted as simple execute bounces.
- **NEVER invent a parallel tracking mechanism for cross-entity file ownership.** CONTRACTS.md is the single source of truth for which entities modified which files. Do NOT grep git history, do NOT scan commit messages, do NOT maintain a local cache. CONTRACTS.md is authoritative and is maintained by the pipeline.
- **NEVER query CONTRACTS.md when Step 1 passed.** If Step 1 is green, all tests passed -- including any tests from prior entities that touch overlapping files. A green Step 1 is a mathematical guarantee that no cross-entity regression exists. Querying CONTRACTS.md when tests are green is wasted computation that adds no signal.
- **NEVER emit `feedback-to: execute` twice** (once from Step 1 and once from Step 4.5) for a cross-entity regression. Step 4.5's `feedback-to: execute` supersedes Step 1's by adding the `cross-entity-regression` classification tag and prior entity context. The Stage Report contains exactly one `feedback-to` directive with all relevant classification context merged.

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

- **The Stage Report contains a structured verdict per check category**, not an aggregate. Each of `test`, `lint`, `typecheck`, `build`, `ratchet`, `coverage` gets its own `verdict: {pass|fail|skipped}` row with its own evidence snippet.
- **NEVER report "MOSTLY PASSING (3/4)".** Prose-fuzzy aggregation hides which gate closed; downstream automation cannot branch on "mostly". FO needs to know exactly which check failed to route feedback correctly.
- **NEVER apply a 75% threshold** or any other percentage-based aggregation. There is no 75% threshold. Any single failing check closes the quality gate.
- **NEVER report a bare "FAIL with failing-test count".** Under-reporting. Captain and execute need the per-check breakdown plus the verbatim failing output to plan the fix, not just a count.
- **NEVER escalate to `build-review` as "NEEDS REVIEW".** Quality reports, review judges. A concrete test failure with a clear signature is a fix, not a judgment call. Escalating blurs ownership and breaks the stage contract. Route via `feedback-to: execute`.

### Routing and Scope

- **Any single entity-scope failing check** → `feedback-to: execute`. Not review, not captain, not UAT. Pre-existing failures (Step 6.5 classification) are logged but do NOT trigger feedback-to.
- **The diff-scope prohibition (Rule "Full Suite, Not Targeted") applies to TEST RUNS, not to ROUTING.** Always run the full suite. Then use Step 6.5 to classify failures for routing purposes. These are separate concerns: the full suite catches drift; the classification prevents routing drift back to the wrong entity's execute stage.
- **Never invoke other skills** from within quality. You are a leaf stage skill.
- **Never edit code** -- your Write/Edit scope is strictly the entity body's `## Stage Report: quality` section.
- **Use `--` (double dash)** everywhere. Never `—` (em dash). Matches the rest of the build skill family.

### Ratchet Discipline

- **NEVER update baselines on a failing quality run.** Baselines are written to ops.config.json ONLY when the overall verdict is `pass`. Writing baselines on partial-pass or fail ratchets the floor down, defeating the invariant. Step 7 baseline update is gated on overall verdict.
- **NEVER skip type coverage enumeration by trusting tsc exit code alone.** `tsc --noEmit` only checks files within tsconfig `include`. The type coverage ratchet must independently enumerate all source files and verify each is covered by at least one tsconfig. This is the entity 052 lesson: tsc can report 0 errors while files go unchecked.
- **NEVER ratchet on first run.** First run with no ops.config.json or no `ratchet_baselines` key initializes baselines and skips comparison. Ratcheting on first run would fail every bootstrapping entity.
- **NEVER interpret ratchet failures.** Like all quality checks, ratchet results are verbatim counts. "The as-any count increased by 2" is the full evidence. Do not suggest which casts to remove or why they were added.
- **NEVER hardwire runner commands in ratchet count extraction.** Use the runner resolved in Step 0.5. If Step 0.5 detected vitest, the test count extraction runs against vitest output, not bun test output.

### Evidence Minimum

- **NEVER write a per-check verdict block without the actual command output in the evidence field.** Every check (test, lint, typecheck, build, regression, coverage) must include the raw command output (last 40 lines or full output if shorter) in a fenced code block under `evidence:`. A verdict of `pass` with an empty evidence block is a fabricated pass -- it claims green without showing what ran. A verdict of `fail` with only a test count and no assertion messages is under-reporting per the existing "NEVER report a bare FAIL" rule.
- **NEVER write a `pass` verdict without evidence proving the pass.** The evidence for a pass is the command's stdout showing zero errors/failures. An empty evidence block or a bare "all checks pass" string is not evidence -- it is a claim. The evidence field exists so that quality's downstream consumers (review, captain, audit) can verify the pass without re-running the command.
- **NEVER omit the test count from the test check evidence.** The evidence block for `### test` must include the total test count (e.g., `342 tests passed`) extracted from `bun test` output. A pass verdict without a test count cannot be audited -- "tests passed" could mean 1 test or 342 tests. The count is the denominator that makes the verdict meaningful.
- **NEVER omit a rationale from a `skipped` verdict block.** When a check verdict is `skipped` (coverage threshold not configured, lint/typecheck/build not available), the evidence field must contain the verbatim skip reason (e.g., `"no threshold configured in workflow ops config"`, `"Script not found 'lint'"`). A `skipped` block with an empty evidence field is indistinguishable from a fabricated skip.
