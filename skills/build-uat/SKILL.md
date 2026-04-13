---
name: build-uat
description: "UAT stage orchestrator dispatched by FO. Runs e2e-pipeline automated items (browser / cli / api) first, then captain interactive sign-off via sequential AskUserQuestion calls. Classifies fails as infra (auto route to execute) vs assertion (captain review). Supports skip / resume via /spacedock:uat-resume wrapper that re-runs only skipped items."
---

# Build-UAT -- User-Observable Behavior Verification

**Namespace note.** This skill lives at `skills/build-uat/`; namespace migration to `spacebridge:build-uat` happens when spacebridge plugin skeleton is created (entity 050). When FO dispatches the UAT ensign, the agent loads this skill via its flat `skills/build-uat/` path. The same flat path is loaded when `/spacedock:uat-resume` invokes this skill in skip-only mode -- per spec line 490, uat-resume is a thin wrapper, not a separate execution path.

You are a stage skill invoked by First Officer through the UAT ensign agent (or by `/spacedock:uat-resume` in skip-only mode). You run automated e2e-pipeline checks against the entity's `## UAT Spec`, then hand the surviving items to the captain for interactive sign-off. You are **orchestrator-with-captain**: you dispatch other skills, you record evidence, you interact with the captain sequentially.

**Seven steps, in strict order. Steps 1-3 are automated; Step 4 is captain-interactive; Steps 5-7 finalize and route.**

See `docs/superpowers/specs/2026-04-11-phase-e-build-flow-restructure.md` lines 375-440 for the stage contract, line 470 for the skill matrix row, and line 490 for the uat-resume wrapper contract.

---

## Tools Available

**Must use:**
- `AskUserQuestion` -- DEFERRED tool for captain interactive sign-off. Load via `ToolSearch` at the start of Step 4 before any question, matching the Phase D-shipped `build-clarify` pattern (`skills/build-clarify/SKILL.md` line 28-30):
  ```
  ToolSearch(query: "select:AskUserQuestion", max_results: 1)
  ```
- `Skill` -- invoke e2e-pipeline skills (`e2e-pipeline:e2e-map`, `e2e-pipeline:e2e-flow`, `e2e-pipeline:e2e-test`) for browser items AND for CLI items when e2e-pipeline is available (recording mode), and `spacedock:knowledge-capture` at Step 7 when gotchas surfaced.
- `Bash` -- run CLI / API items (declared commands, `curl`, `gh`). Also used for git commit and ISO timestamp capture.
- `Read` -- open the entity file to parse `## UAT Spec` and, on skip-only mode re-entry, parse the prior `## UAT Results` rows.
- `Grep` / `Glob` -- locate the entity file if the workflow directory is passed but the absolute entity path is not.
- `Write` / `Edit` -- append `## UAT Results` rows and `## Stage Report: uat` to the entity body; update frontmatter `uat_pending_count` on advance.

**NOT available (by policy):**
- `Agent` / nested subagent dispatch -- you run INSIDE the ensign subagent, and per `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md` you cannot recursively dispatch Agent from a subagent context anyway. The interactive step stays in the orchestrator loop.
- `AskUserQuestion` before Step 4 -- automated phase is non-interactive. Infra fails route to execute without captain involvement.

---

## Inputs From Orchestrator

FO (or `/spacedock:uat-resume`) dispatches you with these fields in the prompt:

1. **Entity slug** -- e.g. `047-example-entity`
2. **Entity file path** -- absolute path to the entity markdown file
3. **Workflow directory** -- so you can locate e2e mappings and the ops config
4. **Mode** -- either `normal` (full UAT run, first pass through the entity) or `skip-only` (uat-resume re-entry, re-run only items whose prior `## UAT Results` row had status `skipped`)
5. **Execute base SHA** -- informational; UAT runs against current working tree regardless
6. **skip_interactive_passed** -- boolean, default false. When true (set by FO during auto-fix iteration re-entry from the pre-ship confidence gate), interactive items whose prior `## UAT Results` row had `status: pass` are auto-passed without captain interaction. Only new or previously-failed interactive items enter Step 4. See `references/confidence-gate.md` Section 9 for the Q-2 resolution that defines this behavior.

If `mode` is absent, treat it as `normal`. If `skip_interactive_passed` is absent, treat it as `false`. If the entity file path is missing, Grep the workflow directory for the slug and proceed -- do NOT ask for clarification (you have no interactive channel before Step 4, and even at Step 4 the channel is for UAT sign-off, not input repair).

---

## Step 1: Parse UAT Spec and (Conditional) Prior Results

Read the entity body and locate `## UAT Spec`. Parse each item into a structured record:

- **id** (e.g. `item-1`, `item-2`) -- must be stable across reruns
- **type** -- one of `browser`, `cli`, `api`, `interactive`, `skill-invocation`
- **description** -- the captain-authored prose describing what to verify
- **command / url / flow reference** -- type-specific execution anchor

If the entity has no `## UAT Spec` section, STOP. Append a Stage Report with verdict `fail`, `feedback-to: plan`, and evidence line `entity missing ## UAT Spec -- build-plan did not generate UAT items`. Do not invent items.

**Skip-only mode branch.** If `mode: skip-only`, also read the existing `## UAT Results` section. Build a set `items_to_rerun` containing only item ids whose prior row had `status: skipped`. If the set is empty, skip directly to Step 6 with verdict `pass` (nothing to do). Store the prior rows untouched -- you will NOT rewrite them; Step 5 appends new results.

---

## Step 1.5: Detect e2e-pipeline Availability

Probe for e2e-pipeline CLI recording capability via ToolSearch:

```
ToolSearch(query: "select:e2e-pipeline:e2e-flow", max_results: 1)
```

- **Found**: set `e2e_recording_available = true`. CLI items in Step 2b will invoke e2e-pipeline:e2e-flow with `cli_only: true` to produce .cast recordings alongside text evidence.
- **Not found (empty result)**: set `e2e_recording_available = false`. CLI items proceed with text-only evidence (current behavior). Log: "e2e-pipeline not available -- CLI items will use text-only evidence."

This probe runs once per UAT session. The flag is consumed by Step 2b only. Browser items in Step 2a already probe e2e-pipeline independently (their failure mode is infra-level fail, not graceful fallback, because browser items require e2e-pipeline by design).

---

## Step 2: Run Automated Items (browser / cli / api)

For each item that is NOT `type: interactive`, and in skip-only mode also NOT in a prior-pass row, execute automation. Skip `type: interactive` entirely -- those run in Step 4 with captain. `type: skill-invocation` items run in Step 2d below.

### 2a -- Browser Items via e2e-pipeline

Per spec lines 393-397: "Check /e2e-map coverage, update if stale. Generate flow YAML via /e2e-flow. Execute via /e2e-test. Collect screenshots, video, trace."

For each browser item:

1. Invoke `Skill` tool with `e2e-pipeline:e2e-map` -- confirm or update the page mapping for the target surface. If the mapping run reports the target page absent, record the item as an **infra-level fail** and continue (Step 3 will route it).
2. Invoke `Skill` tool with `e2e-pipeline:e2e-flow` -- generate a flow YAML from the UAT item's description and the mapping. If the flow generator reports insufficient selectors, record as infra-level fail.
3. Invoke `Skill` tool with `e2e-pipeline:e2e-test` -- execute the flow. Capture screenshots, video, trace as artifact paths returned by the skill. Record exit code, the assertion verdict per step, and artifact references.

### 2b -- CLI Items

Two execution paths depending on e2e-pipeline availability (from Step 1.5):

**If `e2e_recording_available`**: e2e-pipeline executes the command inside an asciinema recording session. Do NOT run a separate Bash call -- e2e-test already runs the command.

1. Invoke `Skill` tool with `e2e-pipeline:e2e-flow` passing `cli_only: true` and the item's declared command as the source description. This generates a CLI-only flow YAML with `Execute external` steps.
2. Invoke `Skill` tool with `e2e-pipeline:e2e-test` to execute the flow. The e2e-pipeline Phase 2.5 runs `asciinema rec` which executes the command and produces a `.cast` recording file. Capture stdout, stderr, exit code from the e2e-test result, plus the `.cast` file path and any derived media paths (gif, mp4).
3. Record both text evidence (stdout/stderr, last 40 lines) and `.cast` path in the provisional result row. Text evidence is the primary (for pass/fail evaluation), `.cast` is supplementary (for captain review). Pass/fail is determined by the command's exit code and stdout/stderr assertions from the e2e-test execution.

**If NOT `e2e_recording_available`**: run the declared command via Bash directly. Capture stdout, stderr, and exit code. Record the last 40 lines of combined output (or the entire output if shorter) as text evidence. No warning, no error -- this is the baseline path.

**Recording failure is non-blocking.** If e2e-pipeline invocation fails (skill error, asciinema not installed, .cast file not produced), fall back to the NOT-available path: run the command via Bash directly and proceed with text-only evidence. A recording failure does NOT change the item's pass/fail status.

### 2c -- API Items

Run the declared `curl` or `gh` command via Bash. Capture HTTP status code, response body (truncate at 2KB), and exit code. Record evidence verbatim.

### 2d -- Skill Invocation Items

For each `type: skill-invocation` item:

1. **Pre-classify for interactivity.** Read the target skill's SKILL.md and grep for `AskUserQuestion`. If found, the skill is Class 3 (captain-interactive) -- skip runtime invocation and use structural-only validation (sub-step 3 below). Record as `pass` with notes "Class 3 -- structural validation only".

2. **Runtime invocation test (non-Class-3 only).** Invoke the skill via the Skill tool with a minimal probe prompt (e.g., "List your capabilities" or the item's declared command). Capture the output shape: did the skill load? Did it produce structured output? Did it error? Record exit status and first 40 lines of output as evidence.

3. **Structural validation (always runs).** Regardless of runtime test result:
   - Verify SKILL.md exists at the declared path
   - Verify frontmatter has `name` and `description` fields
   - Verify any `references/` paths cited in SKILL.md resolve to existing files
   - Record each check as pass/fail with file:line evidence

Record a provisional result row: `{item_id} | skill-invocation | {pass|fail-infra|fail-assertion} | {evidence} | {notes}`.

**Infra-level fail conditions for skill-invocation**: Skill tool unavailable, SKILL.md file not found, frontmatter parse error. These route to execute per Step 3 classification.

**Assertion fail conditions**: Runtime invocation produced output but shape does not match expected (per item description), or structural validation found broken references. These route to captain review per Step 3 classification.

For every automated item, record a provisional result row in scratch:

```
{item_id} | {type} | {pass|fail-infra|fail-assertion} | {evidence refs} | {notes}
```

Do NOT append to `## UAT Results` yet -- Step 5 does the canonical write.

---

## Step 3: Classify Fails and Decide Routing

For every `fail` result from Step 2, classify as exactly one of:

- **Infra-level fail** -- automation itself could not run the assertion. Symptoms: browser crash, URL returned 404, command not found, required binary missing (`bun` not on PATH, `gh` not authenticated), selector not in mapping, test runner panic before user code ran. These are execute-side bugs: either the feature was never wired up, the route wasn't registered, or a dependency is missing.
- **Assertion fail with evidence** -- automation ran cleanly and the real assertion did not hold. Symptoms: screenshot shows wrong text, CLI stdout does not match expected pattern, API response status differs from spec, selector matched but value assertion failed. These are user-observable behavior gaps where captain judgment is required (intended change? spec outdated? retry the run?).

**Per-item routing is mandatory.** Every item is classified into exactly one bucket: `pass`, `fail-infra`, `fail-assertion`, or `pending-interactive`. Each item's route is then computed from its own bucket, NEVER from what other items in the run look like. A run may contain a mix of `fail-infra`, `fail-assertion`, `pass`, and `pending-interactive` items; each is routed independently on its own merits.

**Routing for `fail-infra` items.** Append result to scratch with type `fail-infra`. These items contribute to the terminal verdict `fail` with `feedback-to: execute` at Step 6. They do NOT enter Step 4 captain review -- the captain has no judgment to contribute about a 404 route or a missing binary. Each `fail-infra` item is recorded independently in the Stage Report at Step 7.

**Routing for `fail-assertion` items.** Append to scratch with type `fail-assertion`. These continue to Step 4 for captain review with full evidence (screenshots, diffs, raw output). Captain decides per item: retry / override (mark pass with reason) / feedback (route back to execute with notes). An item's entry into Step 4 is governed solely by its own `fail-assertion` classification and is NOT affected by the presence or absence of `fail-infra` items elsewhere in the run.

**Terminal verdict is an aggregate of independent per-item routes.** At Step 6, the run verdict is `fail` with `feedback-to: execute` if (a) any item is `fail-infra`, OR (b) any captain decision in Step 4 resulted in retry / feedback without resolution. The aggregate verdict combines the independent per-item routes at the end -- it does NOT change captain-review status for assertion fails mid-flight. Every `fail-assertion` item still sees captain review in Step 4, even when the run already has `fail-infra` items that guarantee the terminal verdict.

---

## Step 4: Captain Interactive Sign-off

This step runs only if Step 3 left at least one of the following: (a) one or more `type: interactive` items in the spec, or (b) one or more `fail-assertion` items from Step 3, or (c) automated items that passed but need captain final-pass acknowledgement per spec line 409. In skip-only mode, run this step only if the skipped items now need captain sign-off.

### 4a -- Load AskUserQuestion via ToolSearch

Before presenting anything to the captain, load the deferred tool schema:

```
ToolSearch(query: "select:AskUserQuestion", max_results: 1)
```

This matches `skills/build-clarify/SKILL.md` line 28-30 exactly. Do NOT attempt to call `AskUserQuestion` before this load -- calling a deferred tool without loading its schema errors with `InputValidationError`.

### 4b -- Present Automated Evidence

Before the interactive loop, present a plain-text summary of automated results to the captain so they have context:

```
Automated UAT results for {entity-slug}:
  item-2 (browser)   pass  -- screenshot: .e2e/screenshots/item-2.png
  item-3 (cli)       pass  -- stdout matched "Created X"
  item-5 (api)       pass  -- 200, body matched spec
  item-1 (browser) FAIL-ASSERTION -- screenshot shows "Confirm", spec says "Submit"
```

No AskUserQuestion here -- this is an informational preface only.

### 4c -- Interactive Items and Assertion Fails, One Per Call

For EACH item requiring captain judgment (interactive items + fail-assertion items), in spec order:

1. Build the AskUserQuestion payload:
   - `header`: <=12 char label derived from the item id / description
   - `question`: `"{item_id}: {item description}"` -- for fail-assertion items, prepend `(evidence shows mismatch) ` so the captain sees the failure framing immediately
   - `options`: `{pass, fail, skip-with-reason}`. For fail-assertion, add a fourth option `retry-automation` so captain can request a rerun if the failure looks flaky.

2. Call `AskUserQuestion(...)` ONCE for this one item. NEVER batch multiple items into a single call, not even when the remaining items are homogeneous. NEVER substitute plain text for AskUserQuestion ("plain text is safer"). Sequential, tool-mediated calls are the only supported shape.

3. Record the captain's answer directly into the scratch results record for that item BEFORE presenting the next question. This ordering matters: if the session is interrupted mid-loop, the partial state is visible in scratch and can be recovered. Batching loses this recoverability.

4. If captain picked `retry-automation`, re-run the automation for that single item (Step 2 logic for its type), then present a follow-up AskUserQuestion with the new evidence.

5. If captain picked `skip-with-reason`, prompt via plain text for the reason string, then record `status: skipped, reason: {verbatim}` in scratch.

After the loop, every item has a final status: `pass`, `fail`, or `skipped`.

---

## Step 5: Write UAT Results to Entity Body

Append a `## UAT Results` section to the entity body (or, in skip-only mode, APPEND new rows to the existing section without rewriting prior rows). Row format:

```
| item | type | status | evidence | notes | re-attempt |
| ---- | ---- | ------ | -------- | ----- | ---------- |
| item-1 | browser | pass | ![item-1](../../../.e2e/screenshots/item-1.png) | -- | 0 |
| item-2 | cli | pass | (see transcript below) | -- | 0 |
| item-3 | api | pass | HTTP 200 `{"id": "abc"}` | -- | 0 |
| item-4 | cli | skipped | -- | captain: no staging db available | 0 |
| ...
```

**Inline evidence rules by type:**

- **Browser items**: markdown image syntax `![{item-id}]({relative-path-to-screenshot})`. If multiple screenshots exist, list them on consecutive lines within the cell. Path is relative to the entity file location.
- **CLI items**: If `.cast` recording exists, reference it: `[recording]({relative-path-to-cast-file})`. Always include a fenced transcript block immediately after the UAT Results table under a `### Evidence: {item-id}` sub-heading:
  ```
  ### Evidence: {item-id}

  ```terminal
  $ {command}
  {first 20 lines of stdout/stderr}
  [... truncated ({total_lines} lines total) ...]
  {last 20 lines of stdout/stderr}
  ```

  Recording: `{relative-path-to-cast-file}` (if available)
  ```
  Cap transcript blocks at 20 lines from the start and 20 lines from the end. If total output is <= 40 lines, include it all without truncation marker.
- **API items**: inline the HTTP status code and first 5 lines of response body in the evidence cell. Truncate response body at 512 characters with `[truncated]` marker.
- **Interactive items**: captain's verbatim answer from Step 4.

**Machine-parseability constraint (entity 085 dependency).** Every `### Evidence: {item-id}` block uses a consistent structure: fenced `terminal` code block for CLI, markdown image for browser, inline for API. Entity 085's confidence gate can parse these by scanning for `### Evidence:` headers and extracting the block type from the fence language tag or image syntax.

**`## E2E Evidence` section (appended after `## UAT Results`).** After writing all UAT Results rows and per-item `### Evidence:` blocks, append a summary table:

```
## E2E Evidence

| Item | Type | Artifact | Path |
| ---- | ---- | -------- | ---- |
| item-1 | browser | screenshot | .e2e/screenshots/item-1.png |
| item-1 | browser | video | .e2e/reports/20260413/verification.mp4 |
| item-2 | cli | cast-recording | .e2e/reports/20260413/recording.cast |
| item-2 | cli | transcript | (inline in ### Evidence: item-2) |
| item-3 | api | response | (inline in evidence cell) |
```

Every automated item gets at least one row. `transcript` and `response` artifacts with path `(inline in ...)` indicate the evidence is embedded in the entity body, not in a separate file. Browser items may have multiple rows (screenshot + video + trace). This table is the single machine-readable artifact index for the entity -- entity 085's confidence gate reads this table to score evidence completeness.

In skip-only mode, append new artifact rows to the existing `## E2E Evidence` table without rewriting prior rows (same rule as `## UAT Results`).

**Skip-only mode preservation.** In skip-only mode, you MUST NOT rewrite prior rows. Append only the new rows for items that were re-run. The resulting `## UAT Results` section will contain: (a) the original rows from the first UAT pass, unchanged, followed by (b) the new rows for re-runs. Captain reading the section can see the temporal history. `item-1 | browser | pass | ... | 0` from the first pass stays; a new row `item-1 | browser | pass | ... | 1` (if it happened to be re-run) appears below.

The `re-attempt` column is the count of retries triggered by captain `retry-automation` choices in Step 4, not the total re-runs across UAT sessions. Re-runs across sessions are inferred from new-row presence.

---

## Step 6: Compute Verdict and Update Frontmatter

Tally final item statuses. Apply routing rules:

- **All items pass** -> verdict `pass`, no `feedback-to`, FO advances entity to `shipped`.
- **Any `fail` status (regardless of infra vs assertion) remains after Step 4** -> verdict `fail`, `feedback-to: execute`, FO routes entity back to `execute`. Captain may also annotate the Stage Report with a replan flag in plain text; it is advisory.
- **Any `skipped` status with captain ack, no `fail` statuses** -> verdict `pass`, FO advances to `shipped`, AND update entity frontmatter `uat_pending_count: {count of skipped items across history}`. Per spec line 430-431, a skipped UAT item with captain ack does NOT block advance; the count surfaces for later `/spacebridge:uat-audit` listing.

**Skip-only mode verdict.** Recompute `uat_pending_count` as the total count of `status: skipped` rows across the entire `## UAT Results` section (including prior rows you did not rewrite). If all previously-skipped items now have a new `pass` row, the count drops to 0. If some re-runs still failed or were skipped again, the count reflects the surviving skip count.

**Auto-fix iteration re-entry.** When the pre-ship confidence gate (`references/confidence-gate.md`) triggers an auto-fix loop, the entity re-enters the pipeline at execute and flows back through quality → review → UAT. On this re-entry:
- Mode is `normal` (not skip-only) -- the fix may have changed behavior that automated items must verify.
- BUT if `skip_interactive_passed: true` is set (input field 6 above): interactive items whose prior `## UAT Results` row had `status: pass` with captain sign-off are **auto-passed** without captain interaction. These items are treated as if the captain said "pass" again.
- Only automated items (browser, CLI, API) and any NEW interactive items introduced by the fix task, plus any previously-failed interactive items, run fresh.
- The prior `## UAT Results` section is preserved. New result rows are appended below prior rows (same append-only rule as skip-only mode). Captain reading the section sees the full temporal history.

This follows the Q-2 resolution (entity 087 clarify stage): automated-only re-run on confidence gate auto-fix iteration. See `references/confidence-gate.md` Section 9 for the full specification.

---

## Step 7: Write Stage Report, Capture Knowledge, Commit

### 7a -- Stage Report

Append this section to the entity body exactly:

```markdown
## Stage Report: uat

**Verdict**: {pass|fail}
**Ran at**: {ISO 8601 timestamp}
**HEAD**: {short sha via `git rev-parse --short HEAD`}
**Mode**: {normal|skip-only}
{if fail:} **feedback-to**: execute

### summary
- total items: {n}
- pass: {n}
- fail: {n}
- skipped: {n}
- infra-level fails: {n}
- assertion fails: {n}
- uat_pending_count (post-run): {n}

### automated evidence

For each automated item, write an inline evidence block matching the format from Step 5:

- **Browser items**: `item-{n} (browser): PASS/FAIL` followed by markdown image `![item-{n}]({screenshot-path})` on the next line
- **CLI items**: `item-{n} (cli): PASS/FAIL` followed by a summary line (`exit={code}, {line_count} lines captured`) and `.cast` path if available: `recording: {cast-path}`
- **API items**: `item-{n} (api): PASS/FAIL -- HTTP {status}, body: {first 80 chars of response}`

Example:
```
### automated evidence
- item-1 (browser): PASS
  ![item-1](../../../.e2e/screenshots/item-1.png)
- item-2 (cli): PASS -- exit=0, 15 lines captured
  recording: ../../../.e2e/reports/20260413/recording.cast
- item-3 (api): PASS -- HTTP 200, body: {"status":"ok","count":3}
```

The Stage Report `### automated evidence` is a compact summary. The full transcript blocks live in `## UAT Results` (Step 5). The Stage Report references them implicitly -- a reader needing full evidence scrolls up to `## UAT Results` and the `### Evidence: {item-id}` sub-headings.

### captain decisions
- item-1: pass (interactive)
- item-2: skipped (reason: {verbatim})
- ...

notes: {one line if any input field was missing, else omit}
```

### 7b -- Knowledge Capture (Conditional)

Per spec line 433: if UAT surfaced a gotcha (recurring infra fail pattern, non-obvious selector drift, flaky assertion, version-specific regression), invoke `spacedock:knowledge-capture` in **capture mode** via the Skill tool. You are running as an ensign subagent, so per `skills/knowledge-capture/SKILL.md` Critical Invariants you MUST use `mode: capture` -- you cannot use `mode: apply` (apply mode requires FO's `--agent` context for native AskUserQuestion access). Capture mode stages D2 candidates into the entity body's `## Pending Knowledge Captures` section; FO handles the apply loop later.

Skip this sub-step if no gotchas surfaced.

### 7c -- Commit

Single commit containing all entity body changes from this session:

```bash
git add {entity-file}
git commit -m "uat: {slug} -- {verdict summary}"
```

Example verdict summary: `"all items pass"`, `"item-5 skipped (captain ack), pending_count=1"`, `"item-1 assertion fail, feedback-to execute"`.

If `mode: skip-only`, include the mode in the message: `"uat-resume: {slug} -- item-5 now pass, pending_count=0"`.

---

## Rules -- No Exceptions

### Skip-Only Mode

- **In skip-only mode, re-run ONLY items whose prior status was skipped.** Do NOT re-run items whose prior row had `status: pass`. Do NOT re-run items whose prior row had `status: fail` that already went through an execute-loop and came back pass in a later row. Skip-only is a narrow re-entry path per spec line 490 -- the wrapper is thin by design, not a full sanity pass.
- **NEVER re-run prior-pass items "to be safe".** Completeness instinct is wrong here. The prior pass is canonical; re-running it invalidates captain's earlier acknowledgement and burns tokens on work that already shipped.
- **NEVER rewrite prior `## UAT Results` rows.** Append only. The temporal history is evidence; rewriting it erases context.
- **NEVER return `NEEDS_CONTEXT` because skip-only semantics feel ambiguous.** The semantics are defined here. Ambiguity felt during execution is rationalization, not signal.
- **NEVER return `BLOCKED` claiming partial UAT runs violate stage purity.** Partial runs are the supported shape for this stage; the entity's shipped state is compatible with pending skips per spec lines 430-431.

### Fail Classification -- Infra vs Assertion Routing

- **An infra-level fail routes to execute without captain review.** Browser crashes, 404 routes, missing binaries, unregistered endpoints -- these are execute bugs. The captain has no judgment to contribute about whether a 404 "should be a 404"; the 404 means execute did not finish wiring up the feature. Route via `feedback-to: execute` at Step 6 without consuming a captain hop.
- **An assertion fail with evidence routes to captain review.** Automation ran cleanly, the real assertion did not hold, there is a screenshot / stdout / response body showing the actual value. This is judgment territory: the spec might be out of date, the change might be intentional but overlooked in the spec, or the code might genuinely be wrong. Captain adjudicates at Step 4.
- **NEVER route both fail types uniformly.** "A fail is a fail" is incorrect -- the two categories have different captain-decidable content. Conflating them wastes captain hops on non-decisions (routing 404s through captain) or skips real judgment calls (routing assertion fails straight to execute without the evidence the captain needed to see).
- **NEVER batch captain review of infra fails with assertion fails "so captain sees everything".** Captain visibility is served by the Stage Report at Step 7, which lists every fail with its classification and evidence. Step 4 is for decisions, not for exhaustive display.
- **NEVER override this classification to "be consistent".** Consistency in the Stage Report comes from every row having the same shape, not from every fail taking the same route.

### Captain Interaction -- One AskUserQuestion Per Call

- **Call AskUserQuestion one per call, not batched.** Matches spec line 421 and the Phase D-shipped `skills/build-clarify/SKILL.md` precedent at lines 166 + 327. One question per message, sequential. Record the captain's answer into scratch before presenting the next question.
- **NEVER batch multiple UAT items into a single AskUserQuestion payload.** Multi-select looks efficient on paper but destroys the per-item recovery path -- if the session is interrupted mid-answer, a batched call loses the partial state. Sequential calls survive interruption because each answer lands in scratch before the next call.
- **NEVER substitute plain text for AskUserQuestion in the sign-off loop.** Plain text feels simpler but lacks the structured-option guarantee (captain can reply with anything), and the option schema is load-bearing for result parsing. The only plain-text moment in Step 4 is the informational evidence summary in 4b and the reason prompt after `skip-with-reason` -- never the judgment call itself.
- **NEVER dispatch a subagent to handle the interactive loop.** You already ARE the ensign subagent; per `~/.claude/projects/-Users-kent-Project-spacedock/memory/subagent-cannot-nest-agent-dispatch.md`, subagents cannot recursively dispatch Agent. "Keep the orchestrator stateless" is backwards rationalization -- the orchestrator IS the state-holder here by design.
- **NEVER auto-defer interactive items to `/spacedock:uat-resume` "to keep the pipeline moving".** Auto-defer without captain input is not a skip -- it's abandonment. Real skips require captain to name a reason in Step 4 first.

### Skill Invocation -- Pre-Classify Before Runtime

- **ALWAYS grep for AskUserQuestion in the target SKILL.md before runtime invocation.** Class 3 skills will block automation on interactive prompts. Pre-classification is deterministic and prevents hangs.
- **NEVER skip structural validation because runtime invocation passed.** Runtime success does not guarantee frontmatter correctness or reference integrity. Structural validation is the baseline; runtime is additive.
- **NEVER runtime-invoke a skill without the pre-classification step.** Even if the item description says "non-interactive", grep the SKILL.md -- the description may be wrong or stale.

### Stage Contract and Scope

- **Captain judgment is scoped to Step 4.** Steps 1-3 run fully automated; Step 4 is the only captain-facing moment. Do NOT ask the captain to approve mapping choices, flow generation, or classification -- those are orchestrator decisions.
- **One dispatch = one UAT run.** Do not loop back to Step 1 after Step 6 routes feedback. The next UAT pass is a fresh dispatch with a new `## UAT Results` append.
- **Never invoke build-review, build-plan, or build-execute from within UAT.** You are a leaf orchestrator above e2e-pipeline; upward routing goes through FO via the Stage Report's `feedback-to` field.
- **Never edit source code.** Your Write/Edit scope is strictly the entity body (UAT Results, Stage Report, frontmatter `uat_pending_count`) and nothing else.
- **Use `--` (double dash)** everywhere. Never `—` (em dash). Matches the rest of the build skill family.

### Evidence Minimum

- **NEVER write `## Stage Report: uat` without a per-item evidence entry in `### automated evidence`.** Every automated item (browser, cli, api) must have an entry showing its item id, type, and at least one evidence artifact. Browser items: screenshot path or markdown image reference. CLI items: stdout snippet (first/last 20 lines) or transcript block reference. API items: HTTP status code and response body snippet. An item entry that says only "pass" or "automation ran successfully" is not evidence -- it is a claim without proof.
- **NEVER write a captain decision row without the captain's verbatim answer.** Every row in `### captain decisions` must include the captain's actual choice (pass/fail/skip) and, for skip decisions, the verbatim reason string. A decision row that says "captain approved" without specifying which option was selected erases the audit trail of what the captain actually decided.
- **NEVER write `### automated evidence` without artifact references for browser items.** Browser item evidence must include at least one of: screenshot path (`.e2e/screenshots/{item-id}.png`), video path (`.e2e/videos/{item-id}.webm`), or trace path (`.e2e/traces/{item-id}.zip`). Inline markdown image syntax (`![{item-id}](path)`) is preferred per entity 082 alignment. A browser item marked pass with no visual artifact cannot be audited.
