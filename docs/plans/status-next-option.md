---
id: 045
title: Add --next option to status script for dispatchable entity detection
status: ideation
source: adoption feedback
started: 2026-03-26T00:00:00Z
completed:
verdict:
score: 0.85
worktree:
---

The first officer currently scans entity frontmatter manually to determine what's dispatchable. This is mechanical work (check stage ordering, concurrency limits, worktree status) that an LLM does unreliably — it's branching logic over structured data.

Add a `--next` option to the status script that outputs which entities are ready for their next stage. The status script already parses frontmatter; this extends it with stage ordering and concurrency awareness.

Motivated by adoption feedback: "Move the mechanical parts into code. The status script already exists — extend that pattern."

## Problem Statement

The first officer's dispatch loop requires determining which entities are ready for their next stage. This involves: reading stage ordering, checking concurrency limits, detecting gate-blocked entities, and identifying active worktrees. The first officer does this by reading raw frontmatter and applying branching logic — exactly the kind of mechanical work LLMs do poorly. Mistakes here mean dispatching into full concurrency slots, re-dispatching gated entities, or missing ready entities.

## Proposed Approach

### Embed stage metadata at generation time, not parsed at runtime

The key design decision: stage properties (ordering, gate, terminal, worktree, concurrency) are **baked into the status script at commission time**, not parsed from README frontmatter at runtime.

This follows the existing pattern. The current status script already has a `stage_order()` case statement generated with hardcoded stage names. The `--next` option extends this with additional case statements for stage properties:

- `next_stage()` — maps each stage to its successor (empty for terminal)
- `stage_gate()` — returns "yes"/"no" for whether a stage has a gate
- `stage_worktree()` — returns "yes"/"no" for whether a stage uses a worktree
- `stage_concurrency()` — returns the concurrency limit for a stage

This avoids the significant complexity of parsing nested YAML (`stages.states[].gate`, etc.) in bash 3.2+ without associative arrays.

### Dispatch eligibility rules

An entity is dispatchable if ALL of the following are true:

1. **Not terminal** — its current stage has a defined next stage
2. **Not gate-blocked** — its current stage does NOT have `gate: true` (gate means "awaiting approval to leave this stage")
3. **Not actively worked** — entity does NOT have a non-empty `worktree` field in its frontmatter (worktree = ensign currently active)
4. **Concurrency available** — the count of entities already in the next stage is below that stage's concurrency limit

### Output format

When invoked with `--next`, the script outputs a table:

```
SLUG                 CURRENT        NEXT           WORKTREE
----                 -------        ----           --------
my-feature           backlog        ideation       no
other-task           implementation validation     yes
```

Columns:
- **SLUG** — entity filename without .md
- **CURRENT** — current stage
- **NEXT** — stage the entity would advance to
- **WORKTREE** — whether the next stage uses a worktree ("yes"/"no")

Sorted by score descending (highest priority first), matching the first officer's dispatch priority.

When no entities are dispatchable, output the header row and no data rows (consistent with the main status view behavior).

### Template changes

The `templates/status` file needs:

1. Additional description comments documenting the `--next` option behavior
2. Placeholder stage metadata variables: `{stage_next_map}`, `{stage_gate_map}`, `{stage_worktree_map}`, `{stage_concurrency_map}` — or, more likely, the description header just documents the behavior and the commission materializes the implementation using the same pattern as today (case statements with stage names filled in)

The commission skill (`skills/commission/SKILL.md`) section 2b needs to include the `--next` logic in the materialization instructions.

### What changes where

1. **`templates/status`** — Add `--next` option to the description header. Add documentation of the dispatch rules and output format.
2. **`skills/commission/SKILL.md`** — Update section 2b to include stage metadata (gate, terminal, worktree, concurrency, next-stage mapping) in the materialization instructions.
3. **`docs/plans/status`** (the live instance) — Recompile from updated template for this pipeline. This validates the implementation works end-to-end.

### Edge cases

- **Non-linear transitions** — The README frontmatter supports a `transitions` block for non-linear flows. For v0, all pipelines are linear (the transitions block is "omit for linear workflows"). The `--next` option only needs to handle linear stage ordering. If `transitions` exists, that's a future concern.
- **Entities in `_archive/`** — Never dispatchable. The `--next` option only scans the main directory, matching the first officer's behavior ("only scan the main directory — the `_archive/` subdirectory holds terminal entities and is ignored for dispatch").
- **Empty worktree field** — YAML `worktree:` with nothing after the colon means empty (no active worktree). The existing `${line#*:}` pattern handles this correctly.
- **Stage not found** — If an entity's status doesn't match any known stage, skip it (not dispatchable).

## Acceptance Criteria

1. `bash {dir}/status --next` outputs a table of dispatchable entities with columns: SLUG, CURRENT, NEXT, WORKTREE
2. Entities in terminal stages are excluded
3. Entities in gated stages are excluded
4. Entities with non-empty worktree fields are excluded
5. Entities whose next stage is at concurrency capacity are excluded
6. Output is sorted by score descending (highest priority first)
7. The template (`templates/status`) is updated with the `--next` description
8. The commission skill generates the `--next` implementation correctly for any pipeline
9. Works on bash 3.2+ (no associative arrays)
