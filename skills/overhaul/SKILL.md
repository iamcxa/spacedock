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

## Input: Transformation Manifest (Recipe)

Overhaul consumes a YAML recipe file declaring the transformation. See `references/recipe-format.md` for the full schema. Summary of primitives:

**Frontmatter ops**:
- `remove-stage: {name}` — delete stage entry from `states[]` + all profile arrays + body subsection + Model Dispatch row + Schema enum value + Prerequisites cross-refs
- `add-stage: {name, after, fields, body_content}` — insert stage entry with fields and body subsection at a named position
- `rename-stage: {old, new}` — update `states[]`, all profile arrays, body `### {heading}`, Model Dispatch row, Schema enum value, Prerequisites cross-refs
- `set-stage-field: {stage, field, value}` — surgical frontmatter field write on a single stage
- `remove-stage-field: {stage, field}` — delete a field from a stage entry
- `remove-frontmatter-path: {path}` — delete an arbitrary YAML path (e.g., `stages.profiles` for the Phase 3 case)
- `update-profile: {name, stages}` — replace a profile's stage list with a new ordered array

**Body ops**:
- `replace-body-subsection: {heading, new_content}` — swap `### {heading}` subsection wholesale
- `remove-body-subsection: {heading}` — delete subsection
- `add-body-subsection: {heading, after, content}` — insert subsection at named position
- `update-prose-block: {anchor, new_content}` — replace a prose block identified by a unique anchor line

**Cross-reference ops** (fire automatically as side-effects of frontmatter ops):
- `remove-stage` → removes matching Model Dispatch row, Schema enum value, Prerequisites cross-refs
- `rename-stage` → updates same cross-refs with new name
- `add-stage` → adds Model Dispatch row if the stage has a `model:` field and the target file has a Model Dispatch table

## Phases

Overhaul runs four phases in order. Do not skip or combine.

### Phase 1: Discovery

1. Captain provides target workflow README path and recipe file path
2. Resolve absolute paths, verify both files exist and are readable
3. Read target README, parse YAML frontmatter, identify current stage structure + profile block presence + cross-ref sections (Model Dispatch, Schema enum, Prerequisites)
4. Read recipe file, validate it parses as valid YAML and matches the recipe-format schema
5. Verify target README is a commissioned workflow (has `commissioned-by: spacedock@X.Y.Z` frontmatter stamp). If not, refuse and point user to `commission`.
6. Present a Discovery Summary to the captain: current stage count, profile count, op count, affected cross-ref sections, estimated line delta

### Phase 2: Validate Recipe Against Current State

Before editing, validate the recipe is internally consistent and applicable:

- Every `remove-stage` targets a stage that exists in current `states[]`
- Every `add-stage.after` references a stage that either exists in current `states[]` or is added earlier in the recipe
- Every `rename-stage.old` targets an existing stage and `new` does not collide with an existing stage name
- No operation conflicts (e.g., `remove-stage X` followed by `set-stage-field X.foo`)
- Every `skill:` field value in `set-stage-field` or `add-stage.fields` has a dispatch prefix that matches `.claude-plugin/plugin.json` `name` field — this prevents the Phase 2 namespace BLOCKER drift class
- Every `feedback-to:` target is an existing-or-added stage
- Every profile array in `update-profile` is a subset of the projected `states[]` after all ops apply

Failure at this phase → halt with structured error list, do not write anything, return to captain.

### Phase 3: Diff Preview + Approval Gate

Compute the full proposed transformation in memory. Present the captain with:

- Frontmatter diff (before/after `stages` block, line-range highlighted)
- Body subsection changes (headings added/removed/rewritten)
- Cross-reference updates (Model Dispatch table, Schema enum, Prerequisites)
- File size delta estimate
- Validation warnings (any `skill:` references that don't resolve, profiles that lost all stages, etc.)

Wait for explicit captain approval. `y` → Phase 4. `n` → abort with no changes. `edit recipe` → captain modifies the recipe, re-enter Phase 2.

### Phase 4: Apply + Validate

1. Apply operations in dependency order:
   - Frontmatter ops first (YAML is the source of truth; body and cross-ref ops consume it)
   - Body subsection ops second
   - Cross-reference ops third (triggered automatically by frontmatter ops)
2. Write the new README atomically (single Write call, never partial)
3. Post-write validation:
   - YAML frontmatter parses cleanly (`python3 -c "import yaml; yaml.safe_load(...)"`)
   - Every stage in `states[]` has a matching `### {stage}` body subsection
   - Every `skill:` reference resolves against `plugin.json` (grep-based)
   - Schema `status` field enum matches `states[]` one-to-one
   - Model Dispatch table rows match `states[]` stages that declare `model:`
4. Optionally invoke `kc-plugin-forge` to deep-validate each referenced skill exists and matches its declared signature (delegation pattern per `workflow-evolution-gap.md`)
5. Report success with validation results, or failure with rollback instructions

## No Exceptions (Load-Bearing)

- **NEVER** edit the workflow README outside of Phase 4. Phases 1-3 are read-only.
- **NEVER** skip Phase 2 validation even if the recipe "looks obviously correct". Recipes can go stale between authoring and execution (see `plan-payloads-are-templates.md`) — re-validate against the live target every invocation.
- **NEVER** introduce new engine schema fields via overhaul. If the captain's recipe asks for a field the engine doesn't recognize, halt and explain which principle is violated.
- **NEVER** dispatch greenfield template generation as a "fallback" when a stage is missing. If the target stage doesn't exist in the current README, `add-stage` is the correct op; silently regenerating scaffolding is `commission`'s job, not overhaul's.
- **NEVER** proceed past Phase 3 without explicit captain approval. "edit recipe" means re-enter Phase 2, not skip the gate.
- **NEVER** overhaul a file that lacks `commissioned-by:` frontmatter — it is not a commissioned workflow and overhaul has no authority to modify it.

## Phase E+1 Implementation Status

This SKILL.md is the **design skeleton**, not a working implementation. Shipped as part of Phase E Plan 3 (2026-04-11) alongside the first reference recipe `docs/overhaul/recipes/phase-e-plan-3-build-pipeline.yaml`. The Phase 3 transformation on `docs/build-pipeline/README.md` was applied manually; the recipe file records what was done as a future replay target.

Phase E+1 work (pending, entity TBD):
1. Implement Phases 1-4 as actual executing operations (not just prose)
2. Ship `tests/pressure/overhaul.yaml` with 3-5 forced-choice scenarios covering engine-freeze discipline, recipe validation failure modes, cross-reference maintenance, and namespace grounding
3. Validate the implementation by replaying `phase-e-plan-3-build-pipeline.yaml` against a pre-edit snapshot of the README and diffing against the actual manual edit — if they match byte-for-byte, the implementation is correct
4. `kc-plugin-forge` delegation for deep skill validation in Phase 4 step 4

Until Phase E+1 ships, treat this skill as a spec + namespace reservation. Captains continue to hand-edit workflow READMEs for structural changes, recording the transformation as a recipe file under `docs/overhaul/recipes/` for future replay.

## Related Memory

- `workflow-evolution-gap.md` — design principle: delegate plugin quality to forge, don't distill
- `phase-e-plan-2-6-execution-plan.md` — Phase 3 direction section locking the overhaul scope
- `plan-payloads-are-templates.md` — why recipes need re-validation at apply time
- `subagent-cannot-nest-agent-dispatch.md` — relevant if overhaul later dispatches validation subagents
- `contract-tests-cover-unconditional-calls.md` — cross-skill contract testing methodology applies to overhaul's forge delegation seam

## Related Skills

- `commission` (greenfield sibling) — `skills/commission/SKILL.md`
- `refit` (version-sync sibling) — `skills/refit/SKILL.md`
- `kc-plugin-forge` (delegation target for Phase 4 step 4) — installed via marketplace, invoked per `workflow-evolution-gap.md` guidance
