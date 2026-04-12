# Overhaul Recipe Format

A recipe is a YAML file that declares a workflow transformation. Overhaul consumes recipes as input to its Phase 2 validation and Phase 4 apply steps. Recipes are human-authored and checked into source control alongside the workflow they transform.

## File Location Convention

Recipes live under `docs/overhaul/recipes/` in the same repo as the target workflow. Naming: `{phase-or-purpose}-{workflow-name}.yaml`.

Example: `docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml` — Phase 3 of the Phase E plan, targeting the build-pipeline workflow.

## Top-Level Schema

```yaml
---
target: {path to workflow README, relative to repo root}
description: {one-line summary of the transformation}
author: {captain or agent name}
date: {ISO 8601 date of recipe authoring}
spacedock_version: {spacedock version the recipe was authored against, for engine-freeze validation}

operations:
  - op: {primitive name}
    {op-specific fields}
  - op: {primitive name}
    {op-specific fields}
  ...

validation:
  expected_stage_count: {integer, post-apply}
  expected_profile_count: {integer, post-apply; use 0 if profiles block is removed}
  required_skill_refs:
    - {skill-prefix:skill-name}
    ...

notes: |
  Free-form prose about why this transformation is happening, what
  edge cases to watch for, and any context the captain wants to carry
  forward into future recipe reads.
---
```

## Operation Primitives

Each operation is an object with an `op` field identifying the primitive, plus primitive-specific fields. Operations execute in order; later ops see the state produced by earlier ops.

### Frontmatter Operations

**`remove-stage`** — Delete a stage entry from `states[]` and all cross-references.

```yaml
- op: remove-stage
  name: research
  reason: merged into plan orchestrator per Phase E spec line 98
```

Side-effects: removes stage from all profile arrays, removes `### research` body subsection, removes row from Model Dispatch table, removes enum value from Schema `status` field, removes references from Prerequisites tables.

---

**`add-stage`** — Insert a new stage entry at a named position.

```yaml
- op: add-stage
  name: review
  after: quality
  fields:
    model: sonnet
    feedback-to: execute
    skill: spacedock:build-review
  body_content: |
    ### `review`

    Judgment-based diff-level code review...
    (Full body subsection text)
  model_dispatch_row: "| review | sonnet | Finding bugs in parallel review agent outputs |"
```

Side-effects: inserts stage into `states[]` in position after the named stage, adds `### review` body subsection, adds Model Dispatch row if provided, adds enum value to Schema `status` field.

---

**`rename-stage`** — Change a stage's name and update all cross-references atomically.

```yaml
- op: rename-stage
  old: e2e
  new: uat
  reason: spec §Pipeline Restructure -- e2e is a verification modality, uat is the stage
```

Side-effects: updates `states[]` entry name, updates all profile arrays that reference the old name, updates `### e2e` body heading to `### uat`, updates Model Dispatch row, updates Schema enum value, updates Prerequisites table rows that cite the old name.

---

**`set-stage-field`** — Write a single frontmatter field on a single stage.

```yaml
- op: set-stage-field
  stage: execute
  field: model
  value: sonnet
  reason: spec line 223 -- execute orchestrator is sonnet, opus budget moved to plan
```

Does not trigger cross-reference maintenance. Use for atomic field updates.

---

**`remove-stage-field`** — Delete a frontmatter field from a stage entry.

```yaml
- op: remove-stage-field
  stage: explore
  field: profiles
  reason: Phase 3 profiles elimination
```

---

**`remove-frontmatter-path`** — Delete an arbitrary YAML path from the frontmatter.

```yaml
- op: remove-frontmatter-path
  path: stages.profiles
  reason: Phase 3 profiles elimination -- single-path pipeline, no profile branching
```

This is the general-purpose "delete arbitrary YAML subtree" primitive. Use it when the targeted structure doesn't match `remove-stage` / `remove-stage-field` semantics.

---

**`update-profile`** — Replace a profile's stage list with a new ordered array.

```yaml
- op: update-profile
  name: full
  stages: [draft, brainstorm, explore, clarify, plan, execute, quality, review, uat, shipped]
```

Validation: every stage in the new list must exist in the projected `states[]` after all ops apply.

### Body Operations

**`replace-body-subsection`** — Swap a `### {heading}` subsection wholesale.

```yaml
- op: replace-body-subsection
  heading: plan
  new_content: |
    ### `plan`

    Transform clarified entity context into an execution-proof plan...
    (Full new subsection body)
```

---

**`remove-body-subsection`** — Delete a subsection by heading.

```yaml
- op: remove-body-subsection
  heading: research
  reason: stage merged into plan
```

---

**`add-body-subsection`** — Insert a new subsection at a named position.

```yaml
- op: add-body-subsection
  heading: uat
  after: review
  content: |
    ### `uat`

    User-observable behavior verification with automated e2e + captain sign-off.
    (Full subsection body)
```

---

**`update-prose-block`** — Replace a prose block identified by a unique anchor line.

```yaml
- op: update-prose-block
  anchor: "A development pipeline that takes a brainstormed idea"
  new_content: |
    A development pipeline with 10 stages that takes a brainstormed idea
    through exploration, clarification, planning with integrated research,
    wave-parallel execution, quality verification, judgment-based review,
    automated-plus-interactive UAT, and PR lifecycle via mod.
```

The `anchor` field is a substring that uniquely identifies the start of the block to replace. Overhaul locates it, finds the enclosing paragraph boundary, and swaps the full block. If the anchor is not unique, recipe validation fails.

---

**`replace-table-block`** — Replace an entire markdown table identified by a unique substring in its header row.

```yaml
- op: replace-table-block
  anchor: "| Stage | Model | Rationale |"
  new_content: |
    | Stage | Model | Rationale |
    |-------|-------|-----------|
    | brainstorm | sonnet | FO-inline triage + approach pathing |
    | explore | sonnet | Codebase mapping + contradiction annotation |
    | clarify | sonnet | Captain-interactive Q&A with AskUserQuestion |
    | plan | opus | Research-backed plan, wave graph, task decomposition |
    | execute | sonnet | Wave-parallel task dispatch via task-executor |
    | quality | haiku | Acceptance criteria + structural regression checks |
    | review | sonnet | Judgment-based code review in parallel |
    | uat | sonnet | UAT runner + captain sign-off gate |
  reason: Phase 3 pipeline restructure -- update Model Dispatch table to 10-stage shape
```

Overhaul locates the table by finding the first line that contains `anchor` as a substring. The table extent is: from that header row through the separator row, all data rows, and the trailing blank line. The entire extent is replaced with `new_content`. If the anchor substring is not found or matches more than one table header, recipe validation fails.

---

**`update-yaml-block`** — Apply field-level operations to a YAML code block within a named section.

```yaml
- op: update-yaml-block
  section: "## Schema"
  block_index: 0
  operations:
    - set: { field: "uat_pending_count:", value: "" }
    - remove: { field: "profile:" }
  reason: Phase 3 -- remove profile field, add uat_pending_count to schema example
```

Overhaul locates the section by finding the line exactly matching `{section}` (the field value already includes `## `), then finds the `block_index`-th fenced code block with ` ```yaml ` language tag within that section. Within the code fence boundaries, `set` adds or replaces the named field line, and `remove` deletes the field line. Operates line-by-line; does not parse nested YAML structure. If the section heading is not found, or the block index is out of range, recipe validation fails.

---

**`update-section`** — Replace an entire H2 section (from `## Heading` to the next `## Heading` at the same level, or end of body).

```yaml
- op: update-section
  heading: "## Prerequisites"
  new_content: |
    ## Prerequisites

    ### Required -- core pipeline cannot function without these

    | Skill | Purpose |
    |-------|---------|
    | spacedock:build-plan | Plan orchestrator |
    | spacedock:build-execute | Execute orchestrator |
  reason: Phase 3 pipeline restructure -- rebuild prerequisites for 10-stage pipeline
```

Unlike `replace-body-subsection` which targets H3 (`###`) headings, this targets H2 (`##`) headings. The section extent is: from the `{heading}` line through the line before the next `##` line at the same level (or end of file). The entire extent is replaced with `new_content`. If the heading is not found (field value already includes `## `; matched exactly), recipe validation fails.

---

### Deferred Primitives

The following primitive is documented but not yet implemented. Recipes may reference it as `manual_edit` with a note citing this deferral.

**`update-table-row`** (deferred -- entity 066 O-1) — Find a specific row in a markdown table by matching the first column value, then update individual cells. Deferred because row-level matching in pipe-delimited tables is complex for low reuse value relative to `replace-table-block`. Recipes that need single-row updates should use `replace-table-block` for the whole table, or mark the edit as `manual_edit` with a note referencing this deferral.

---

## Recipe Authoring Conventions

1. **Write operations in logical groups**: frontmatter ops first (stage structure), then body ops (subsection rewrites), then narrative/prose updates. This order matches Phase 4 apply ordering.

2. **Every structural op carries a `reason`** pointing to a spec line, a memory entry, or a captain decision. Recipes are audit trails.

3. **Prefer specific primitives over `remove-frontmatter-path`** when a specific primitive exists. `remove-stage` is better than `remove-frontmatter-path: stages.states[3]` — it triggers cross-reference maintenance automatically.

4. **Do not embed engine feature requests in recipes**. If the transformation needs a feature the engine doesn't support, halt and escalate to a spec update, not a workaround in the recipe.

5. **Recipe file is read-only post-apply**. The recipe is a historical artifact; if a follow-up transformation is needed, author a new recipe.

## Validation Block

The top-level `validation` block declares assertions overhaul checks after Phase 4:

```yaml
validation:
  expected_stage_count: 10
  expected_profile_count: 0
  required_skill_refs:
    - spacedock:build-plan
    - spacedock:build-execute
    - spacedock:build-quality
    - spacedock:build-review
    - spacedock:build-uat
  expected_stage_names:  # optional
    - brainstorm
    - explore
    - clarify
    - plan
    - execute
    - quality
    - review
    - uat
    - shipped
```

Post-apply, overhaul re-reads the target README and verifies the expected state. Mismatch triggers a validation error and (future) rollback workflow.

`expected_stage_names` is an optional list of stage names expected after transformation. If present, SKILL.md Step 4.3e validates that the exact set of stage names in the written `states[]` matches — same names, same count, order may vary. Use this when the recipe makes structural additions or removals and the author wants an explicit guard against silent name drift.

## Forbidden Operations

Overhaul intentionally does not provide:

- **`set-frontmatter-path`** — overhaul does not write arbitrary YAML structures. Use specific primitives that carry intent and trigger cross-ref maintenance.
- **`append-to-body`** — overhaul does not grow the workflow README with free-form content. Use `add-body-subsection` with a heading.
- **`delete-file`** — overhaul never deletes the target README. Refuse the op and escalate.
- **`create-file`** — overhaul never creates new files. That's `commission`'s job.
- **`run-shell`** — overhaul does not execute external commands. Validation via `kc-plugin-forge` is the only optional delegation.

## Phase E+1 Implementation Notes

When implementing overhaul for real (Phase E+1):

1. Start with a YAML parser that preserves comments and field ordering — the target READMEs have load-bearing comments (see `docs/build-pipeline/README.md` Namespace notes). Naive `yaml.safe_load` + `yaml.dump` round-trip will strip them.
2. Body subsection parsing should use markdown heading ordering, not regex on headings alone — subsection boundaries are "from this `### h` to the next `### h` at the same level".
3. Cross-reference sections (Model Dispatch, Schema enum, Prerequisites) are workflow-specific — the first implementation can hardcode detection for build-pipeline's sections, and generalize when the second workflow needs overhaul.
4. Diff preview (Phase 3) can delegate to `git diff --no-index` against a temp file for readability.

## Related Documents

- `skills/overhaul/SKILL.md` — the skill definition that consumes this recipe format
- `docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml` — first reference recipe, Phase 3 transformation
- `skills/commission/SKILL.md` — contrast: greenfield template writer, not an editor
- `skills/refit/SKILL.md` — contrast: version sync, not structural change
