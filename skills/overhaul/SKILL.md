---
name: overhaul
description: "This skill should be used when the user asks to 'overhaul a workflow', 'restructure a workflow', 'add or remove stages from an existing workflow', 'redesign a pipeline', or wants to make structural changes to a commissioned workflow's stage graph, profile set, or body conventions without regenerating from a template."
user-invocable: true
---

# Overhaul a Workflow

You are overhauling (restructuring) an existing commissioned workflow. Overhaul performs major structural changes on the stage graph, profile definitions, per-stage fields, and body subsections while preserving the workflow's entity data and any content that should carry forward.

This skill is the third vertex of the Spacedock workflow-lifecycle triad:

| Skill | Purpose | Precondition |
|-------|---------|--------------|
| `commission` | Greenfield creation | No workflow exists yet -> new directory with README + seed entities |
| `refit` | Version sync | Workflow's scaffolding lags Spacedock version -> bring files up to date |
| `overhaul` (this) | Structural rework | Workflow exists but its stage set, profiles, or body need redesign -> surgical transformation |

Do not use overhaul for: version syncing scaffolding (use `refit`), creating new workflows (use `commission`), or trivial one-line field edits on a single stage (use `Edit` directly).

## Namespace Note

This skill lives at `skills/overhaul/`; namespace migration to `spacebridge:overhaul` is Phase F work, same as the other Phase E skills. The operation surface does not change at migration — only the dispatch prefix.

## Engine-Freeze Principle (Load-Bearing)

Overhaul is strictly a skill-layer operation. It:

- **MUST NOT** introduce new frontmatter schema fields the Spacedock engine doesn't recognize
- **MUST NOT** invent new stage types, gate semantics, mod hooks, or `feedback-to:` targets
- **MUST NOT** rely on engine features not shipped in the target workflow's `commissioned-by: spacedock@X.Y.Z` version
- **MUST** operate entirely through Read/Write/Edit on YAML frontmatter and markdown body
- **MUST** validate the result against the engine's actual parser behavior, not an idealized schema

The operation surface is: "given an existing workflow README and a transformation manifest, produce a new workflow README that the same engine version can still load and run." **Overhaul always lags engine, never leads.** If a captain's recipe asks for capability the engine doesn't support, overhaul halts and escalates rather than synthesizing the capability.

---

## Tools Available

**Can use:**
- `Read` -- read target README, recipe file, plugin.json, reference docs
- `Grep` / `Glob` -- locate sections, verify anchors are unique, check cross-references
- `Write` -- atomic write of transformed README in Phase 4 (single Write call only)
- `Bash` -- `mktemp` for temp file, `git diff --no-index` for diff preview, `python3` for post-write YAML validation, `grep` for skill ref resolution
- `ToolSearch` -- load `AskUserQuestion` for Phase 3 approval gate

**NOT available:**
- `Agent` -- overhaul is a leaf skill. No fan-out to subagents.

---

## Input Contract

Captain provides two arguments:
1. **Target workflow README path** -- path to an existing commissioned workflow README (e.g. `docs/build-pipeline/README.md`)
2. **Recipe file path** -- path to a YAML recipe file conforming to `references/recipe-format.md` (e.g. `docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml`)

Both paths are resolved to absolute paths at Step 1. If either is missing, ask the captain for the missing argument before proceeding.

---

## Output Contract

After successful completion:
- Target workflow README is rewritten atomically with all recipe operations applied
- Phase 3 diff was shown to captain and explicitly approved
- Post-write validation passed (YAML parse, stage-body correspondence, skill refs)
- Summary reported to captain: N ops applied, M manual_edit ops skipped, validation results

---

## Step 1: Discovery

**1.1 Resolve paths.** Verify both files exist and are readable:
```bash
test -f {target_readme_path} && echo EXISTS || echo MISSING
test -f {recipe_path} && echo EXISTS || echo MISSING
```
If either is missing, stop and report: "File not found: {path}. Cannot proceed."

**1.2 Read target README** via Read tool. Hold the full content as a string in memory (call it `readme_content`). Parse YAML frontmatter by splitting on `---` delimiters (line-oriented, not yaml.safe_load -- preserves comments and field ordering per O-2 decision). Extract:
- `commissioned-by:` field value (MUST be present -- see 1.5 below)
- Current `states[]` list: each stage's `name:` field in declaration order
- Whether a `stages.profiles` block is present
- Location of cross-reference sections in the body (scan for these markers):
  - Model Dispatch table: line containing `| Stage | Model | Rationale |`
  - Schema section: `## Schema` H2 heading
  - Prerequisites section: `## Prerequisites` H2 heading
  - Field Reference table: line containing `| Field | Type |` or similar
  - Feature Template section: `## Feature Template` H2 heading

**1.3 Read recipe file** via Read tool. Verify it parses as valid YAML (try `python3 -c "import yaml; yaml.safe_load(open('{recipe_path}'))"` via Bash). Confirm top-level keys present: `target`, `description`, `operations`, `validation`.

**1.4 Count op categories.** Scan `operations[]` and tally:
- Frontmatter ops: `remove-stage`, `add-stage`, `rename-stage`, `set-stage-field`, `remove-stage-field`, `remove-frontmatter-path`, `update-profile`
- Body ops: `replace-body-subsection`, `remove-body-subsection`, `add-body-subsection`, `update-prose-block`, `replace-table-block`, `update-yaml-block`, `update-section`
- `manual_edit` ops (count only -- not executed)

**1.5 commissioned-by: gate.** If `commissioned-by:` is absent from the README frontmatter, STOP immediately:
> "Target file is not a commissioned workflow (no `commissioned-by:` frontmatter). Overhaul has no authority to modify it. Use `commission` to create a new workflow, or use `Edit` directly for non-workflow files."

Do NOT proceed to Step 2 under any circumstances if this field is absent.

**1.6 Present Discovery Summary** to captain (plain text, no AskUserQuestion needed here):
```
## Discovery Summary

Target: {path}
Commissioned by: {commissioned-by value}
Current stages ({N}): {stage1}, {stage2}, ...
Profiles present: {yes|no}

Recipe: {path}
Description: {recipe description}
Operations: {N frontmatter ops}, {M body ops}, {K manual_edit ops}
Affected cross-ref sections: {list}
Estimated line delta: {rough estimate based on op count}

Proceeding to Phase 2: Recipe Validation.
```

---

## Step 2: Validate Recipe Against Current State

Maintain a **projected state** as you validate: a running copy of `states[]` that reflects the effect of ops validated so far. This lets `add-stage.after` reference stages added by earlier ops.

For each operation in `operations[]`, validate in index order:

| Op type | Validation check |
|---------|-----------------|
| `remove-stage` | `name` exists in projected `states[]` |
| `add-stage` | `after` exists in projected states; `name` does not collide with existing; all `fields` use only engine-recognized field names (no new fields per engine-freeze); `skill:` value prefix matches `plugin.json` `name` field |
| `rename-stage` | `old` exists in projected states; `new` does not collide |
| `set-stage-field` | `stage` exists in projected states; `field` is an engine-recognized field; `value` does not introduce a new field the engine doesn't recognize; if `field` is `skill:`, value prefix matches `plugin.json` name |
| `remove-stage-field` | `stage` exists in projected states; `field` is present on that stage entry |
| `remove-frontmatter-path` | `path` resolves to a present YAML subtree (line-scan for path segments) |
| `update-profile` | `name` exists in profiles block; every stage in `stages[]` will exist in projected states after all ops apply |
| `replace-body-subsection` | `heading` exists as `### {heading}` in body (exact H3 match; heading may be backtick-quoted as `` ### `{heading}` ``) |
| `remove-body-subsection` | `heading` exists as `### {heading}` in body (heading may be backtick-quoted as `` ### `{heading}` ``) |
| `add-body-subsection` | `after` heading exists as `### {after}` in body (heading may be backtick-quoted as `` ### `{after}` ``) |
| `update-prose-block` | `anchor` substring appears exactly once in body |
| `replace-table-block` | `anchor` substring appears exactly once as a table header row (line starting with `\|` and containing anchor) |
| `update-yaml-block` | `section` heading exists in body (field value already includes `##`); `block_index` is within range of ` ```yaml ` code blocks in that section |
| `update-section` | `{heading}` exists in body (exact H2 match; field value already includes `##`) |
| `manual_edit` | No validation -- log as informational only |

**Cross-cutting checks (apply after per-op validation):**
- No conflicting ops: `remove-stage X` followed by any op targeting stage X (e.g., `set-stage-field X`) is a conflict
- Every `feedback-to:` value in `set-stage-field` or `add-stage.fields` is an existing-or-projected stage name

**On any validation failure:**
STOP. Do NOT proceed to Phase 3. Present structured error list:
```
## Recipe Validation Failed

{N} error(s) found:

1. Op #{index} ({op_type}): {error message naming the invalid op and field}
   Recipe line: {relevant yaml}

2. ...

Fix the recipe and re-run overhaul.
```

**On validation success:**
Report: "Recipe validation passed. {N} ops validated, {K} manual_edit ops noted (will be skipped at apply). Proceeding to Phase 3: Diff Preview."

---

## Step 3: Diff Preview + Approval Gate

**3.1 Load AskUserQuestion** via `ToolSearch("select:AskUserQuestion")`. This is required -- Phase 3 cannot proceed without it.

**3.2 Compute transformation in memory.** Apply all non-`manual_edit` ops to a copy of `readme_content` using the same line-oriented logic described in Step 4. Do NOT write any files in this step. The result is `preview_content`.

**3.3 Write preview to temp file** via Bash:
```bash
TMPFILE=$(mktemp /tmp/overhaul-preview-XXXXX.md)
```
Write `preview_content` to `TMPFILE` via Write tool.

**3.4 Generate diff** via Bash:
```bash
git diff --no-index {target_readme_path} {TMPFILE} || true
```
(Exit code 1 is normal for non-empty diffs -- `|| true` prevents it from halting.)

**3.5 Prepare summary** for captain:
- Frontmatter ops: N (list op types)
- Body ops: M (list op types)
- manual_edit ops skipped: K (list their notes fields)
- Cross-ref side-effects: which sections will be updated
- Validation warnings (if any): unresolvable skill refs, profiles that lost all stages, etc.
- Diff (truncate to first 200 lines if longer, note "... truncated, {N} lines total")

**3.6 Present to captain** via AskUserQuestion:
```
Overhaul Diff Preview

{summary from 3.5}

--- Diff ---
{diff output}
--- End Diff ---

Apply this transformation?
- Type "y" to apply Phase 4
- Type "n" to abort with no changes
- Type "edit recipe" to modify the recipe and re-run validation
```

**3.7 Handle response:**
- `y` → proceed to Step 4
- `n` → abort: "Overhaul aborted. No files were modified." Clean up `TMPFILE` via Bash. Stop.
- `edit recipe` → "Please modify the recipe file and re-run overhaul. No files were modified." Clean up `TMPFILE`. Stop.
- Any other response → treat as `n` and stop.

---

## Step 4: Apply + Validate

**4.1 Apply operations in dependency order** using line-oriented string manipulation on `readme_content` held in memory. Work in three passes:

**Pass A: Frontmatter ops** (operating on the YAML block between the first `---` and second `---`):

- `remove-stage`: Delete the stage entry block (from `  - name: {name}` through all indented field lines until the next `  - name:` or end of states block). Also remove the stage name from every profile array line (find lines matching `    - {name}` within any profile's stage list block). Delete the `### {name}` body subsection (from the H3 heading to the next H3 at the same level, or end of the parent H2 section). The heading may be backtick-quoted as `` ### `{name}` ``.
- `add-stage`: Insert stage entry block after the last line of the `after` stage's entry block. Stage entry format follows existing entries. Add all `fields` as indented YAML lines. If `body_content` is present, insert it into the body after the `after` stage's existing body subsection (find `` ### `{after}` `` subsection end, insert `body_content` there — same position logic as `add-body-subsection`).
- `rename-stage`: Find-replace stage name in `states[]` (`  - name: {old}` → `  - name: {new}`), in profile arrays (` - {old}` → ` - {new}`), in body headings (`` ### `{old}` `` → `` ### `{new}` ``).
- `set-stage-field`: Locate the target stage block. If field line exists, replace it. If not, insert it after the `  - name:` line.
- `remove-stage-field`: Locate the target stage block. Delete the field line.
- `remove-frontmatter-path`: Locate the YAML subtree at `path` by scanning for the key at the right indent level. Delete from the key line through all indented continuation lines.
- `update-profile`: Find the profile's `stages:` list within the profiles block. Replace the entire list with the new `stages[]` array (one `    - {stage}` line per entry).

**Pass B: Body ops** (operating on the markdown body after the closing `---`):

- `replace-body-subsection`: Find `` ### `{heading}` `` (exact H3 match, may be backtick-quoted). Extent: from that heading line to the line before the next `### ` at the same level, or end of body. Replace entire extent with `new_content`.
- `remove-body-subsection`: Find and delete the subsection extent (same boundary detection as replace).
- `add-body-subsection`: Find the `after` subsection's end boundary. Insert `content` immediately after.
- `update-prose-block`: Find the line containing `anchor` as a substring. Identify paragraph boundaries (blank lines above and below). Replace the full paragraph block with `new_content`.
- `replace-table-block`: Find the first line containing `anchor` as a substring where the line starts with `|`. Extent: from that header row through the separator row (line starting with `|---`), all data rows (lines starting with `|`), and the trailing blank line. Replace with `new_content`.
- `update-yaml-block`: Find `{section}` heading (field value already includes `## `). Within that section, find the `block_index`-th ` ```yaml ` code fence (0-indexed). Within the fence boundaries: for each `set` op, find the field line (by field name prefix) and replace it, or append it before the closing ` ``` ` if not found. For each `remove` op, delete the field line.
- `update-section`: Find `{heading}` (exact H2 match; field value already includes `## `). Extent: from that heading line to the line before the next `## ` at the same level, or end of file. Replace entire extent with `new_content`.

**Pass C: Cross-reference side-effects** (triggered automatically by frontmatter ops applied in Pass A):

For each `remove-stage` op processed in Pass A:
- Remove the Model Dispatch table row matching the stage name (find `| {name} |` in the table)
- Remove the stage name from the Schema `status` enum value list
- Remove any Prerequisites table rows referencing the stage name

For each `rename-stage` op processed in Pass A:
- Update the Model Dispatch row: find `| {old} |` and replace with `| {new} |`
- Update the Schema enum: find `{old}` in the status enum and replace with `{new}`
- Update Prerequisites table rows referencing the old name

For each `add-stage` op processed in Pass A:
- Add `{name}` to the Schema `status` enum list (after the `after` stage's position in the list)

For each `add-stage` op with a `model_dispatch_row` field:
- Insert the `model_dispatch_row` string into the Model Dispatch table (after the row for the `after` stage, or at the end of the table if `after` is the last stage in the table)

**4.2 Atomic write.** Write the fully-transformed content to the target README in a **single Write call**. Never use Edit for incremental patching. Never write partial content.

**4.3 Post-write validation** via Bash:

a. YAML parse check:
```bash
python3 -c "import yaml; yaml.safe_load(open('{target_readme_path}'))" && echo YAML_OK || echo YAML_FAIL
```

b. Stage-body correspondence (for each projected stage name):
```bash
grep -c "### \`{stage_name}\`" {target_readme_path}
```
Expect count >= 1 for each stage.

c. Skill ref resolution (for each `skill:` reference in the written frontmatter):
```bash
grep -c "{skill_name}" .claude-plugin/plugin.json
```
Expect count >= 1 for each skill prefix.

d. Stage count check:
```bash
grep -c "  - name:" {target_readme_path}
```
Compare against `validation.expected_stage_count` from recipe.

e. Profile count check (count profile entries in written frontmatter, compare against `validation.expected_profile_count`).

4.3e: If `expected_stage_names` is present in the recipe validation block, verify the stage names in the written `states[]` match exactly (same names, same count, order may vary).

**4.4 On validation failure:** Present errors to captain (no automatic rollback per Q-1 answer):
```
## Post-Write Validation Failed

The README was written but failed {N} validation check(s):

{list of failures with specific checks that failed}

Rollback if needed: git checkout -- {target_readme_path}
(Warning: this discards the overhaul output. If you had uncommitted changes to this file before running overhaul, they would also be discarded.)
```

**4.5 On validation success:**
```
## Overhaul Complete

{N} ops applied ({frontmatter_count} frontmatter, {body_count} body, {crossref_count} cross-ref side-effects)
{K} manual_edit ops skipped (informational markers for deferred primitives)
Post-write validation: PASSED (YAML parse, {M} stages verified, {P} skill refs verified)

Target: {path}
```

**4.6 Cleanup.** Delete the temp file from Step 3:
```bash
rm -f {TMPFILE}
```

**4.7 Optionally invoke `kc-plugin-forge`** to deep-validate each referenced skill exists and matches its declared signature. This is optional (A-3) -- skip if `kc-plugin-forge` is not installed or if the captain indicates time pressure.

---

## No Exceptions (Load-Bearing)

- **NEVER** edit the workflow README outside of Step 4.2. Steps 1-3 and 4.3 are read-only or validation-only.
- **NEVER** skip Step 2 validation even if the recipe "looks obviously correct". Recipes can go stale between authoring and execution (see `plan-payloads-are-templates.md`) -- re-validate against the live target every invocation.
- **NEVER** proceed past Step 3 without explicit captain approval. "y" means apply. Any other response means abort.
- **NEVER** introduce new engine schema fields via overhaul. If a `set-stage-field` op targets a field not present in any existing stage in the README, halt at Step 2 with engine-freeze violation.
- **NEVER** dispatch greenfield template generation as a "fallback". `add-stage` inserts an entry; it does not synthesize a new workflow section from scratch.
- **NEVER** overhaul a file that lacks `commissioned-by:` frontmatter. Check at Step 1.5 and stop if absent.
- **NEVER** use `yaml.safe_load` / `yaml.dump` for frontmatter manipulation in the write path -- it strips comments and may reorder fields. Line-oriented string operations only (O-2 decision).
- **NEVER** process `manual_edit` ops as executable operations. They are informational markers for deferred primitives. Log their count at Step 1.4, note them in the Phase 3 summary, skip them silently at Step 4.1. Do NOT attempt to interpret the notes field and infer an equivalent op.

---

## Rules

1. **Phases are strictly ordered**: Discovery → Validate → Diff Preview → Apply. Never skip, never reorder, never combine phases.
2. **Line-oriented frontmatter parsing only**: Split on `---` delimiters. Operate on individual lines. Never round-trip through `yaml.safe_load` / `yaml.dump` in the write path.
3. **Single atomic Write**: The entire transformed README is written in one `Write` call at Step 4.2. If the Write fails, nothing is written -- there is no partial state.
4. **Approval gate is absolute**: No matter how simple the recipe, how recent it was authored, or how strongly the captain expresses trust, the diff MUST be presented and approved before Phase 4.
5. **Projected state for validation**: Step 2 maintains a running projected `states[]` that reflects the effect of validated ops so far. `add-stage.after` may reference stages not in the original README if they were added by earlier ops.
6. **No rollback automation**: If post-write validation fails, present errors and the manual rollback command (`git checkout -- {path}`). Never automatically overwrite the file again.
7. **Engine-freeze is a correctness property, not a style preference**: Violating it means the resulting README fails to load in the engine. Halt and explain the violation rather than silently proceeding.
8. **manual_edit ops are informational only**: They record what a human did during a manual transformation phase. They have no executable semantics.

---

## Red Flags -- STOP and Escalate

- **Missing `commissioned-by:` frontmatter** → Stop at Step 1.5 with refusal message
- **Recipe YAML parse failure** → Stop at Step 1.3 with parse error
- **Any validation failure at Step 2** → Stop with structured error list, return to captain for recipe fix
- **Captain answers "n" or "edit recipe" at Step 3** → Abort with no changes
- **Post-write validation failure at Step 4.3** → Present errors and rollback instructions, stop
- **`manual_edit` op with notes that "obviously" translate to an executable primitive** → This is a trap. Log and skip. Do NOT attempt to execute (see No Exceptions rule 8)
- **Recipe op targeting a field that looks new/useful but doesn't exist in engine schema** → This is an engine-freeze violation. Halt at Step 2, name the field, cite the principle

---

## Related Memory

- `workflow-evolution-gap.md` — design principle: delegate plugin quality to forge, don't distill
- `phase-e-plan-2-6-execution-plan.md` — Phase 3 direction section locking the overhaul scope
- `plan-payloads-are-templates.md` — why recipes need re-validation at apply time
- `subagent-cannot-nest-agent-dispatch.md` — relevant if overhaul later dispatches validation subagents
- `contract-tests-cover-unconditional-calls.md` — cross-skill contract testing methodology applies to overhaul's forge delegation seam

## Related Skills

- `commission` (greenfield sibling) — `skills/commission/SKILL.md`
- `refit` (version-sync sibling) — `skills/refit/SKILL.md`
- `kc-plugin-forge` (delegation target for Step 4.7) — installed via marketplace, invoked per `workflow-evolution-gap.md` guidance
