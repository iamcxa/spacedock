---
id: 082
title: "UAT evidence and recording -- CLI e2e recording + inline evidence writing"
status: plan
context_status: ready
source: decomposition of entity 074 (pipeline verification quality uplift)
started: 2026-04-13T06:30:00Z
worktree: .worktrees/spacedock-ensign-uat-evidence-and-recording
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 074
---

## Directive

> Build-uat captures CLI item evidence as text-only stdout snippets. No terminal recordings (.cast files). Entity files reference evidence by path, not inline — captain must manually open files to evaluate UAT pass/fail.
>
> Two changes: (1) CLI UAT items should trigger `e2e-pipeline:e2e-flow` with `type: cli` to produce .cast recordings alongside text evidence. Fallback to text-only if e2e-pipeline unavailable. (2) UAT Results section should write evidence inline (markdown images for browser, transcript blocks for CLI) so entity file alone is sufficient to evaluate pass/fail.

## Captain Context Snapshot

- **Repo**: main @ f748d5f
- **Session**: No recent session context (entity created via decompose(074) at 59990ee)
- **Domain**: Runnable / Invokable
- **Related entities**: 074 -- Pipeline verification quality uplift (epic), 085 -- Stage Report evidence + confidence gate (draft, depends-on: [082])
- **Created**: 2026-04-13T12:30:00Z

## Brainstorming Spec

**APPROACH**: Modify build-uat SKILL.md in two places: (1) Step 2b ("Run CLI item") gains a pre-execution hook that invokes `e2e-pipeline:e2e-flow` with `type: cli` via `Skill` tool to set up recording, then runs the command, then invokes `e2e-pipeline:e2e-test` to finalize the recording. The .cast file path is captured alongside stdout/stderr/exit-code. A `ToolSearch` probe at Step 0 determines whether e2e-pipeline is available — if not, skip recording and proceed with text-only evidence (current behavior). (2) Step 5 ("Write UAT Results") changes from path-reference evidence to inline evidence: browser items get markdown image syntax (`![screenshot](path)`), CLI items get fenced transcript blocks (` ```terminal ... ``` `) with the first/last 20 lines of the recording. A new `## E2E Evidence` section is appended after `## UAT Results` with a per-item artifact table (item ID, type, artifact path, inline preview).

**ALTERNATIVE**: Instead of modifying build-uat's Step 2b and Step 5, create a post-UAT "evidence enrichment" pass that reads UAT Results, fetches artifacts, and rewrites evidence inline as a separate step. -- D-01 Rejected: a post-hoc rewrite is fragile (must parse the Stage Report's evidence format, which varies per item type) and adds an extra processing pass. Inline evidence at write-time is simpler — the evidence is available in memory when Step 5 runs, so writing it inline costs nothing extra.

**GUARDRAILS**:
- e2e-pipeline availability is a graceful fallback, not a hard dependency — UAT must work without e2e-pipeline installed (text-only evidence is the baseline)
- Inline evidence must not bloat entity files beyond readability — cap transcript blocks at 20 lines with `[truncated]` marker; screenshots as relative path references (markdown image syntax), not base64 embedded
- Do not modify UAT pass/fail logic — evidence is presentational, not decisional. A CLI item passes on exit code 0 regardless of whether recording succeeded
- Entity 085 (confidence gate) depends on this entity's evidence format — ensure the inline format is machine-parseable for confidence scoring

**RATIONALE**: Inline evidence at write-time is correct because build-uat Step 5 already has the evidence data in memory (stdout, stderr, exit code, artifact paths). Writing it inline instead of as path references is a format change, not a logic change. The e2e-pipeline integration for CLI recordings follows the exact pattern that already exists for browser items (build-uat already invokes e2e-pipeline for `type: browser` items — extending to `type: cli` is a one-line change in the dispatch logic). The graceful fallback ensures UAT works in environments without e2e-pipeline, which is important for overhaul portability (new projects may not have e2e infrastructure).

## Acceptance Criteria

- [ ] Given a CLI UAT item, when build-uat Step 2b runs with e2e-pipeline available, then it produces a .cast recording file AND text evidence (how to verify: run a CLI UAT item, check for .cast file in artifacts alongside stdout capture)
- [ ] Given a completed UAT stage, when the entity file is read, then evidence is inline (markdown images for browser items, transcript blocks for CLI items) not just path references (how to verify: read entity file after UAT, see rendered evidence without opening external files)
- [ ] Given e2e-pipeline is not installed, when a CLI UAT item runs, then it falls back to text-only evidence with no error (how to verify: run UAT without e2e-pipeline, confirm graceful fallback)

## Assumptions

A-1: Step 2b (lines 80-82) is the CLI item execution block — currently 3 lines ("Run command, capture stdout/stderr/exit code, record evidence"). The e2e-pipeline recording hook inserts before the Bash command, and artifact collection inserts after. Step 2a (browser items, lines 66-78) already uses `Skill` tool with e2e-pipeline — the CLI extension follows the same dispatch pattern.
Confidence: Confident (0.90)
Evidence: build-uat SKILL.md:80-82 -- Step 2b. Lines 66-78 -- Step 2a browser items already invoke e2e-pipeline:e2e-flow and e2e-pipeline:e2e-test via Skill tool.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: e2e-pipeline availability detection uses `ToolSearch` probe at Step 0 (or Step 2 entry) — same pattern build-uat already uses for AskUserQuestion (line 21-23). If ToolSearch returns empty for e2e-pipeline skills, set a flag and skip recording throughout the session.
Confidence: Confident (0.85)
Evidence: build-uat SKILL.md:21-23 -- ToolSearch pattern for AskUserQuestion. Same probe pattern works for e2e-pipeline skill detection.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Step 5 evidence writing (line 94) currently writes provisional result rows. Inline evidence changes the output format from path references to markdown image syntax (browser) and fenced transcript blocks (CLI). The `## UAT Results` table shape at line 136 shows the current format — the evidence column needs to expand from one-line snippets to multi-line inline content.
Confidence: Likely (0.75)
Evidence: build-uat SKILL.md:94 -- "Do NOT append to ## UAT Results yet -- Step 5 does the canonical write." Line 136 -- `item-3 (cli) pass -- stdout matched "Created X"`. Line 220 -- Stage Report evidence shape: `item-2 (cli): stdout snippet`.
→ Confirmed: captain, 2026-04-13 (batch)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 1 across config layer
  build-uat SKILL.md (sole insertion target -- Steps 2b and 5)
- [x] Assumptions formed: 3 (Confident: 2, Likely: 1)
  A-1 Step 2b insertion (0.90), A-2 e2e-pipeline detection (0.85), A-3 Step 5 inline format (0.75)
- [x] Options surfaced: 0
  All gray areas resolved to Track A with codebase precedent from Step 2a browser items
- [x] Questions generated: 0
  No open questions -- CLI recording follows established browser item pattern
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  1 primary file but changes span Steps 0, 2b, 5, and Stage Report format — multiple insertion points within one file

## Stage Report: clarify

- [x] Decomposition: not-applicable
- [x] Assumptions confirmed: 3 / 3 (0 corrected)
  A-1, A-2, A-3 all confirmed via batch
- [x] Options selected: 0 / 0
- [x] Questions answered: 0 / 0
- [x] Canonical refs added: 0
- [x] Context status: ready
  gate passed: all assumptions confirmed, ACs valid (3 criteria, no α markers)
- [x] Handoff mode: loose
- [x] Clarify duration: 1 question asked, session complete
  1 batch assumption presentation (plain text)

## Research Findings

### Upstream Constraints

- **CLAUDE.md / DECISIONS.md**: No active decisions constrain build-uat modifications. CONTRACTS.md has no active entry for `skills/build-uat/SKILL.md` -- no cross-entity conflict. (Source: CONTRACTS.md grep, DECISIONS.md read)
- **Entity 085 dependency**: Entity 085 (Stage Report evidence + confidence gate) depends on this entity's inline evidence format being machine-parseable for confidence scoring. GUARDRAILS bullet 4 in the brainstorming spec: "ensure the inline format is machine-parseable for confidence scoring." This constrains the evidence format to use structured fenced blocks with predictable delimiters, not free-form prose. (Source: entity 085 A-3, entity 082 GUARDRAILS)
- **build-uat Rules section**: All modifications must use `--` (double dash), never em dash. No restructuring of existing Stage Report formats -- additive only. (Source: build-uat SKILL.md:285)

### Existing Patterns

- **Step 2a browser e2e-pipeline pattern** (build-uat SKILL.md:70-78): Browser items already invoke `e2e-pipeline:e2e-map`, `e2e-pipeline:e2e-flow`, `e2e-pipeline:e2e-test` via `Skill` tool in a 3-step sequence (map → flow → test). CLI integration follows the same dispatch shape but with `cli_only: true` parameter. (Source: build-uat SKILL.md:70-78)
- **ToolSearch availability probe** (build-uat SKILL.md:21-23): AskUserQuestion availability is detected via `ToolSearch(query: "select:AskUserQuestion", max_results: 1)` at Step 4 entry. Same pattern works for `e2e-pipeline:e2e-flow` detection. (Source: build-uat SKILL.md:21-23)
- **Step 5 table format** (build-uat SKILL.md:166-174): UAT Results table has columns `item | type | status | evidence | notes | re-attempt`. Evidence column currently holds one-line path refs or "stdout snippet". Inline evidence expands this column to multi-line content. (Source: build-uat SKILL.md:166-174)
- **Step 7a Stage Report automated evidence** (build-uat SKILL.md:218-221): Each item is one line: `item-2 (cli): stdout snippet`. Inline evidence format changes this to structured blocks per item. (Source: build-uat SKILL.md:218-221)

### Library/API Surface

- **e2e-pipeline:e2e-flow CLI-only mode** (e2e-flow SKILL.md:69-72): When no mapping is found and CLI signals are detected, e2e-flow sets `flow_mode: cli-only`. CLI-only flows use only `Execute external` / `Verify external` steps. Phase 2.5 records CLI execution via `asciinema rec --cols 120 --rows 35 -c "{command}" "$REPORT_DIR/recording.cast"`, producing `.cast` files. Media processor then generates gif/mp4/thumbnail from `.cast`. (Source: e2e-flow SKILL.md:355-381)
- **e2e-flow invocation for CLI**: Dispatch with `cli_only: true` parameter, omit `mapping_path`. Flow writer generates `Execute external` steps. Verification skips Phase 2a-2d, goes directly to Phase 2.5 CLI recording. (Source: e2e-flow SKILL.md:186-194, 227)
- **asciinema prerequisites**: `command -v asciinema && command -v agg` -- if missing, warn and skip recording (graceful fallback). (Source: e2e-flow SKILL.md:367)

### Known Gotchas

- **Inline evidence bloat**: Brainstorming spec GUARDRAILS cap transcript blocks at 20 lines with `[truncated]` marker. Screenshots use markdown image syntax (relative path), not base64 embedding. This prevents entity files from growing to unreadable sizes. (Source: entity 082 GUARDRAILS)
- **Evidence is presentational, not decisional**: Pass/fail logic must not change. A CLI item passes on exit code 0 regardless of whether recording succeeded. Recording failure is a warning, not a test failure. (Source: entity 082 GUARDRAILS)
- **Skip-only mode preservation**: Step 5 inline evidence must follow the same skip-only append-only rule -- new rows with inline evidence, prior rows untouched. (Source: build-uat SKILL.md:176, Rules:256-261)
- **e2e-pipeline unavailability**: ToolSearch returning empty for `e2e-pipeline:e2e-flow` means the plugin is not installed. All CLI items must fall back to text-only evidence with no error. This is not a test failure. (Source: entity 082 GUARDRAILS, brainstorming spec)

### Reference Examples

- **Browser item evidence in Step 7a** (build-uat SKILL.md:219): `item-1 (browser): .e2e/screenshots/item-1.png, .e2e/traces/item-1.zip` -- path-based reference. The inline version would be: markdown image + first/last lines of trace. (Source: build-uat SKILL.md:219)
- **e2e-flow Phase 2.5 CLI recording output** (e2e-flow SKILL.md:368-381): Produces `$REPORT_DIR/recording.cast` + `gif_path`, `mp4_path`, `thumbnail_path` from media processor. The `.cast` path is the primary artifact; gif/mp4 are derived. (Source: e2e-flow SKILL.md:368-382)
- **e2e-flow Phase 3 results format** (e2e-flow SKILL.md:414-447): Status / Steps / Corrections / Checkpoints / Trace / artifact paths. UAT should capture the Status and artifact paths from this output. (Source: e2e-flow SKILL.md:414-447)

---

## PLAN

### Goal

Modify build-uat SKILL.md in four insertion points: (1) Step 0 adds e2e-pipeline availability probe, (2) Step 2b adds e2e-pipeline CLI recording integration with graceful fallback, (3) Step 5 changes UAT Results evidence column from path-reference to inline format, (4) Step 7a changes Stage Report automated evidence from one-line refs to inline blocks. Single file modification, additive changes only.

<task id="task-0" model="sonnet" wave="0" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
    - docs/build-pipeline/uat-evidence-and-recording.md
  </read_first>

  <action>
  Environment verification. Confirm all 4 insertion points exist in build-uat SKILL.md:
  1. `grep -n "## Tools Available" skills/build-uat/SKILL.md` -- Step 0 area (e2e-pipeline probe inserts near ToolSearch pattern at lines 21-23)
  2. `grep -n "### 2b -- CLI Items" skills/build-uat/SKILL.md` -- Step 2b insertion point (lines 80-82)
  3. `grep -n "## Step 5: Write UAT Results" skills/build-uat/SKILL.md` -- Step 5 format change area (lines 164-178)
  4. `grep -n "### automated evidence" skills/build-uat/SKILL.md` -- Step 7a evidence format area (lines 218-221)
  5. `grep -c "e2e-pipeline:e2e-flow" skills/build-uat/SKILL.md` -- currently only in Step 2a (Tools Available + Step 2a = 2 occurrences expected)
  6. Verify entity file has 3 ACs and 3 confirmed assumptions.
  Report pass/fail for each check. If any check fails, STOP and report.
  </action>

  <acceptance_criteria>
    - All 6 grep checks pass with expected results
    - No unexpected state detected
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Add e2e-pipeline availability detection to build-uat SKILL.md. Two changes:

  **Change 1 -- Tools Available section (after line 25).** Add a new bullet under the `Skill` tool entry:

  ```markdown
  - `Skill` -- invoke e2e-pipeline skills (`e2e-pipeline:e2e-map`, `e2e-pipeline:e2e-flow`, `e2e-pipeline:e2e-test`) for browser items AND for CLI items when e2e-pipeline is available (recording mode), and `spacedock:knowledge-capture` at Step 7 when gotchas surfaced.
  ```

  (Replace existing `Skill` bullet to include "AND for CLI items when e2e-pipeline is available (recording mode)")

  **Change 2 -- New Step 1.5 section.** Insert between Step 1 (Parse UAT Spec) and Step 2 (Run Automated Items). Add a new section:

  ```markdown
  ## Step 1.5: Detect e2e-pipeline Availability

  Probe for e2e-pipeline CLI recording capability via ToolSearch:

  ```
  ToolSearch(query: "select:e2e-pipeline:e2e-flow", max_results: 1)
  ```

  - **Found**: set `e2e_recording_available = true`. CLI items in Step 2b will invoke e2e-pipeline:e2e-flow with `cli_only: true` to produce .cast recordings alongside text evidence.
  - **Not found (empty result)**: set `e2e_recording_available = false`. CLI items proceed with text-only evidence (current behavior). Log: "e2e-pipeline not available -- CLI items will use text-only evidence."

  This probe runs once per UAT session. The flag is consumed by Step 2b only. Browser items in Step 2a already probe e2e-pipeline independently (their failure mode is infra-level fail, not graceful fallback, because browser items require e2e-pipeline by design).
  ```
  </action>

  <acceptance_criteria>
    - `grep "Step 1.5" skills/build-uat/SKILL.md` finds the new section header
    - `grep "e2e_recording_available" skills/build-uat/SKILL.md` finds at least 2 occurrences (set true + set false)
    - `grep "ToolSearch.*e2e-pipeline:e2e-flow" skills/build-uat/SKILL.md` finds the probe invocation
    - `grep "AND for CLI items" skills/build-uat/SKILL.md` finds the updated Tools Available bullet
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
    - docs/build-pipeline/uat-evidence-and-recording.md
  </read_first>

  <action>
  Modify Step 2b (CLI Items) in build-uat SKILL.md to integrate e2e-pipeline recording with graceful fallback. Replace the current 2b content (lines 80-82) with:

  ```markdown
  ### 2b -- CLI Items

  Run the declared command via Bash. Capture stdout, stderr, and exit code. Record the last 40 lines of combined output (or the entire output if shorter) as text evidence.

  **If `e2e_recording_available` (from Step 1.5)**: before running the Bash command, invoke e2e-pipeline to record the execution:

  1. Invoke `Skill` tool with `e2e-pipeline:e2e-flow` passing `cli_only: true` and the item's declared command as the source description. This generates a CLI-only flow YAML with `Execute external` steps.
  2. Invoke `Skill` tool with `e2e-pipeline:e2e-test` to execute the flow. The e2e-pipeline Phase 2.5 runs `asciinema rec` to produce a `.cast` recording file. Capture the `.cast` file path and any derived media paths (gif, mp4) from the skill return.
  3. Record the `.cast` path alongside the text evidence in the provisional result row. Both artifacts are kept -- text evidence is the primary (for pass/fail evaluation), `.cast` is supplementary (for captain review).

  **If NOT `e2e_recording_available`**: run the Bash command directly (current behavior). Text-only evidence. No warning, no error -- this is the baseline path.

  **Recording failure is non-blocking.** If e2e-pipeline invocation fails (skill error, asciinema not installed, .cast file not produced), log the failure as a note in the provisional result row and proceed with text-only evidence. A recording failure does NOT change the item's pass/fail status -- pass/fail is determined solely by the Bash command's exit code and stdout/stderr assertions.
  ```
  </action>

  <acceptance_criteria>
    - `grep "e2e_recording_available" skills/build-uat/SKILL.md` finds at least 3 occurrences (Step 1.5 set + Step 2b check + Step 2b else)
    - `grep "cli_only: true" skills/build-uat/SKILL.md` finds the e2e-flow invocation parameter
    - `grep "\.cast" skills/build-uat/SKILL.md` finds at least 2 occurrences (recording file reference + evidence reference)
    - `grep "Recording failure is non-blocking" skills/build-uat/SKILL.md` finds the guardrail statement
    - `grep "asciinema rec" skills/build-uat/SKILL.md` finds the recording mechanism reference
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Modify Step 5 (Write UAT Results) in build-uat SKILL.md to write inline evidence instead of path references. The table structure stays the same (same columns), but the `evidence` column content changes from one-line path refs to inline content blocks.

  Replace the Step 5 row format example (lines 166-174) with:

  ```markdown
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
  ```
  </action>

  <acceptance_criteria>
    - `grep "### Evidence:" skills/build-uat/SKILL.md` finds the per-item evidence sub-heading pattern
    - `grep "terminal" skills/build-uat/SKILL.md` finds the fenced transcript block language tag
    - `grep "truncated" skills/build-uat/SKILL.md` finds truncation markers (at least 2 -- CLI and API)
    - `grep "Machine-parseability" skills/build-uat/SKILL.md` finds the entity 085 constraint note
    - `grep '!\[' skills/build-uat/SKILL.md` finds markdown image syntax for browser evidence
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Modify Step 7a (Stage Report automated evidence section) in build-uat SKILL.md to use inline evidence blocks instead of one-line path references. Replace the `### automated evidence` example (lines 218-222) with:

  ```markdown
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
  ```
  </action>

  <acceptance_criteria>
    - `grep "exit=" skills/build-uat/SKILL.md` finds the CLI evidence summary format in Stage Report
    - `grep "recording:" skills/build-uat/SKILL.md` finds the .cast reference in Stage Report evidence
    - `grep "body:" skills/build-uat/SKILL.md` finds the API inline body snippet format
    - The Stage Report example no longer contains bare "stdout snippet" without structure
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="3" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Add an `## E2E Evidence` anchor section instruction to Step 5, after the inline evidence rules. This section acts as the machine-parseable evidence index that entity 085's confidence gate will consume.

  Insert after the `Machine-parseability constraint` paragraph in Step 5:

  ```markdown
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
  ```
  </action>

  <acceptance_criteria>
    - `grep "## E2E Evidence" skills/build-uat/SKILL.md` finds the section header instruction
    - `grep "cast-recording" skills/build-uat/SKILL.md` finds the CLI recording artifact type
    - `grep "artifact index" skills/build-uat/SKILL.md` finds the purpose description
    - `grep "inline in" skills/build-uat/SKILL.md` finds the inline artifact path convention
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="4" skills="" test_first="false">
  <read_first>
    - skills/build-uat/SKILL.md
  </read_first>

  <action>
  Final consistency pass. Read the entire modified build-uat SKILL.md and verify:

  1. Step numbering is consistent (1, 1.5, 2, 3, 4, 5, 6, 7 -- all present, no gaps, no duplicates)
  2. All `--` usage (no em dashes `—` anywhere in added text)
  3. `e2e_recording_available` flag is set in Step 1.5 and consumed in Step 2b (both branches)
  4. Step 5 inline evidence format matches Step 7a Stage Report evidence format (consistent naming, paths)
  5. `## E2E Evidence` table references match artifact types from Step 2b (cast-recording) and Step 2a (screenshot, video, trace)
  6. Skip-only mode rules in Step 5 and `## E2E Evidence` both say "append only, don't rewrite"
  7. Rules section at the end has no contradictions with new content
  8. The `Skill` tool bullet in Tools Available mentions CLI items
  9. No placeholder text (TBD, add appropriate, similar to Task N)

  If any inconsistency found, fix it inline. Commit the final state.

  ```bash
  cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-uat-evidence-and-recording
  git add skills/build-uat/SKILL.md
  git commit -m "plan(082): uat evidence and recording -- CLI e2e recording + inline evidence"
  ```
  </action>

  <acceptance_criteria>
    - `git log -1 --oneline` on the worktree branch shows the plan commit
    - `grep -c "—" skills/build-uat/SKILL.md` returns 0 (no em dashes)
    - `grep "TBD\|add appropriate\|similar to Task" skills/build-uat/SKILL.md` returns empty
    - All 9 consistency checks pass
  </acceptance_criteria>

  <files_modified>
    - skills/build-uat/SKILL.md
  </files_modified>
</task>

---

## UAT Spec

### Browser
None

### CLI
- [ ] Given a CLI UAT item in a test entity, when build-uat Step 2b runs with e2e-pipeline available, then a `.cast` recording file is produced alongside text evidence (how to verify: grep for `.cast` path in UAT Results after running build-uat on a test entity with a CLI item)
- [ ] Given e2e-pipeline is not installed, when a CLI UAT item runs, then it falls back to text-only evidence with no error and no warning in the verdict (how to verify: run build-uat without e2e-pipeline, confirm graceful fallback in UAT Results)

### API
None

### Interactive
- [ ] Given a completed UAT stage on a test entity, when the entity file is read, then evidence is inline (markdown images for browser items, transcript blocks for CLI items, inline body for API items) not just path references (how to verify: captain reads entity file after UAT, sees rendered evidence without opening external files)

---

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: CLI item + e2e-pipeline → .cast recording AND text evidence | task-2 | `grep "cli_only: true" skills/build-uat/SKILL.md && grep "\.cast" skills/build-uat/SKILL.md` | pending | -- |
| AC-2: Entity file has inline evidence (images for browser, transcripts for CLI) | task-3, task-4 | `grep "### Evidence:" skills/build-uat/SKILL.md && grep '!\[' skills/build-uat/SKILL.md` | pending | -- |
| AC-3: e2e-pipeline not installed → graceful fallback, no error | task-1, task-2 | `grep "e2e_recording_available = false" skills/build-uat/SKILL.md && grep "Recording failure is non-blocking" skills/build-uat/SKILL.md` | pending | -- |

---

## References

- Parent entity 074: pipeline verification quality uplift
- Entity 085 (Stage Report evidence + confidence gate): depends on this entity's evidence format
- `skills/build-uat/SKILL.md`: Steps 0, 2b, 5, and 7a are the insertion targets
- `e2e-pipeline:e2e-flow` skill: CLI flow recording capability (Phase 2.5, asciinema, .cast files)
- `e2e-pipeline:e2e-flow/SKILL.md`: lines 355-381 define CLI-only recording via asciinema

## Stage Report: plan

- [x] Research Findings -- 5 domain sections with citations
  Upstream Constraints (3 findings: CONTRACTS.md clear, entity 085 format dependency, build-uat Rules), Existing Patterns (4 findings: Step 2a browser pattern, ToolSearch probe, Step 5 table format, Step 7a evidence format), Library/API Surface (3 findings: e2e-flow CLI-only mode, e2e-flow invocation params, asciinema prerequisites), Known Gotchas (4 findings: evidence bloat cap, presentational not decisional, skip-only preservation, e2e-pipeline unavailability), Reference Examples (3 findings: browser evidence, CLI recording output, e2e-flow Phase 3 results)
- [x] PLAN -- 7 tasks across 5 waves
  task-0 (wave 0, environment verification), task-1 (wave 1, e2e-pipeline detection), task-2 (wave 1, Step 2b CLI recording), task-3 (wave 2, Step 5 inline evidence), task-4 (wave 2, Step 7a evidence format), task-5 (wave 3, E2E Evidence section), task-6 (wave 4, consistency pass + commit)
- [x] UAT Spec -- 3 items (0 browser, 2 cli, 0 api, 1 interactive)
- [x] Validation Map -- 3 rows, 1:1 with ACs, all pending
- [x] Stage Report: plan -- plan-checker verdict attached

status: passed
plan-checker verdict: PASS (after 1 revision iteration, inline -- ensign subagent cannot dispatch Agent for plan-checker)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold (all findings are entity-specific, no generalizable patterns beyond what MEMORY.md already captures)
workflow-index append: pending (will be invoked at commit time)

### Plan-checker final output

```yaml
issues:
  - dimension: dependency_correctness
    task: task-1, task-2
    severity: warning
    description: "task-1 and task-2 both modify skills/build-uat/SKILL.md in wave 1; execute will force serial"
    fix_hint: "Acceptable -- different sections of the same file. Execute serializes automatically."
  - dimension: dependency_correctness
    task: task-3, task-4
    severity: warning
    description: "task-3 and task-4 both modify skills/build-uat/SKILL.md in wave 2; execute will force serial"
    fix_hint: "Acceptable -- different sections of the same file. Execute serializes automatically."
```

### Confidence assessment

| Factor | Weight | Score | Rationale |
|--------|--------|-------|-----------|
| Context completeness | 20% | 98% | All source files read, all assumptions verified |
| Scope clarity | 20% | 95% | Single file, 4 insertion points, additive only |
| Risk level | 20% | 95% | No logic changes, SKILL.md text modifications only |
| Precedent strength | 20% | 92% | Step 2a browser pattern is direct precedent |
| AC testability | 20% | 90% | Structural grep + runtime dogfood |
| **Composite** | | **94.2%** | **Captain gate required (<=95% threshold)** |

### Step 0.5 assumption re-validation

- A-1 (Step 2b at SKILL.md:80-82, Step 2a at :66-78): evidence holds -- content matches claimed structure
- A-2 (ToolSearch at SKILL.md:21-23): evidence holds -- pattern confirmed
- A-3 (Step 5 at SKILL.md:166-174, Stage Report at :218-221): (stale-evidence: cited line 136 shifted to 169 -- semantic claim valid, format matches)

### Commits

- chore(plan): 082 uat evidence and recording -- CLI e2e recording + inline evidence writing
