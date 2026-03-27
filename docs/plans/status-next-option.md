---
id: 045
title: Add --next option to status script for dispatchable entity detection
status: implementation
source: adoption feedback
started: 2026-03-26T00:00:00Z
completed:
verdict:
score: 0.85
worktree: .worktrees/ensign-status-next-option
---

The first officer currently scans entity frontmatter manually to determine what's dispatchable. This is mechanical work (check stage ordering, concurrency limits, worktree status) that an LLM does unreliably — it's branching logic over structured data.

Add a `--next` option to the status script that outputs which entities are ready for their next stage. The status script already parses frontmatter; this extends it with stage ordering and concurrency awareness.

Motivated by adoption feedback: "Move the mechanical parts into code. The status script already exists — extend that pattern."

## Problem Statement

The first officer's dispatch loop requires determining which entities are ready for their next stage. This involves: reading stage ordering, checking concurrency limits, detecting gate-blocked entities, and identifying active worktrees. The first officer does this by reading raw frontmatter and applying branching logic — exactly the kind of mechanical work LLMs do poorly. Mistakes here mean dispatching into full concurrency slots, re-dispatching gated entities, or missing ready entities.

## Proposed Approach

### Full Python rewrite

Rewrite the status script entirely in Python. The script uses `#!/usr/bin/env python3` and handles all modes: default status table, `--archived`, and `--next`. Python handles both flat entity YAML and the nested README `stages` block naturally, making the script easier to maintain and extend.

### Parse stage metadata from README at runtime

The README frontmatter is the single source of truth for stage definitions. The `--next` option reads the `stages` block from `README.md` at runtime so that changes to stage properties (gates, concurrency, worktree flags) take effect immediately without re-commissioning or refitting.

### Invocation change

The first-officer template currently calls `bash __DIR__/status`. This changes to `__DIR__/status` (relying on the shebang) or `python3 __DIR__/status`. Files to update:

- **`templates/first-officer.md`** — change `bash __DIR__/status` to `python3 __DIR__/status`
- **`templates/status`** — rewrite as Python with `#!/usr/bin/env python3` shebang, keeping the description-header comment pattern
- **`skills/commission/SKILL.md`** — update section 2b to materialize a Python implementation instead of bash; update the bash 3.2+ constraint language to reference Python 3 stdlib
- **`docs/plans/README.md`** — update the "Workflow State" section's invocation examples from `bash docs/plans/status` to `python3 docs/plans/status`

Existing commissioned pipelines need a refit to pick up the invocation change in their first-officer agent file.

### Architecture

The Python script:

1. Parses its own directory to find `README.md` and `*.md` entity files
2. Extracts YAML frontmatter from each file (string-based parsing, no PyYAML dependency)
3. Default mode: outputs the status table (ID, SLUG, STATUS, TITLE, SCORE, SOURCE) — same columns and sort order as the current bash implementation
4. `--archived` mode: also scans `_archive/` subdirectory
5. `--next` mode: reads `stages` block from README frontmatter, applies dispatch rules, outputs dispatchable entities

### Dispatch eligibility rules

An entity is dispatchable if ALL of the following are true:

1. **Not terminal** — its current stage has a defined next stage
2. **Not gate-blocked** — its current stage does NOT have `gate: true` (gate means "awaiting approval to leave this stage")
3. **Not actively worked** — entity does NOT have a non-empty `worktree` field in its frontmatter (worktree = ensign currently active)
4. **Concurrency available** — the count of entities already in the next stage is below that stage's concurrency limit

### Output format

When invoked with `--next`, the script outputs a table:

```
ID     SLUG                 CURRENT        NEXT           WORKTREE
--     ----                 -------        ----           --------
001    my-feature           backlog        ideation       no
012    other-task           implementation validation     yes
```

Columns:
- **ID** — entity identifier
- **SLUG** — entity filename without .md
- **CURRENT** — current stage
- **NEXT** — stage the entity would advance to
- **WORKTREE** — whether the next stage uses a worktree ("yes"/"no")

Sorted by score descending (highest priority first), matching the first officer's dispatch priority.

When no entities are dispatchable, output the header row and no data rows (consistent with the main status view behavior).

### README frontmatter parsing

The python3 code needs to parse this structure from README.md:

```yaml
stages:
  defaults:
    worktree: false
    concurrency: 2
  states:
    - name: backlog
      initial: true
    - name: ideation
      gate: true
    - name: implementation
      worktree: true
    - name: done
      terminal: true
```

Parsing strategy (no `import yaml` needed):
1. Extract frontmatter (between first and second `---`)
2. Find the `stages:` block by indentation
3. Extract `defaults:` values
4. Split `states:` on `- name:` boundaries
5. For each state, read properties as key-value pairs, applying defaults for missing values
6. Build ordered stage list with properties

### What changes where

1. **`templates/status`** — Rewrite as Python with description-header comments. Shebang changes to `#!/usr/bin/env python3`. Description documents all three modes (default, `--archived`, `--next`) with dispatch rules and output formats.
2. **`templates/first-officer.md`** — Change `bash __DIR__/status` to `python3 __DIR__/status`.
3. **`skills/commission/SKILL.md`** — Update section 2b: materialization target is Python 3 (not bash 3.2+). Update variable substitution list if needed. Update any references to `bash {dir}/status` in generated README content.
4. **`docs/plans/status`** (the live instance) — Rewrite as Python for this pipeline, validating the implementation end-to-end.
5. **`docs/plans/README.md`** — Update invocation examples from `bash docs/plans/status` to `python3 docs/plans/status`.

### Edge cases

- **Non-linear transitions** — The README frontmatter supports a `transitions` block for non-linear flows. For v0, all pipelines are linear (the transitions block is "omit for linear workflows"). The `--next` option only needs to handle linear stage ordering. If `transitions` exists, that's a future concern.
- **Entities in `_archive/`** — Never dispatchable. The `--next` option only scans the main directory, matching the first officer's behavior ("only scan the main directory — the `_archive/` subdirectory holds terminal entities and is ignored for dispatch").
- **Empty worktree field** — YAML `worktree:` with nothing after the colon means empty (no active worktree). The python3 code treats empty/missing worktree as "no active ensign."
- **Stage not found** — If an entity's status doesn't match any known stage, skip it (not dispatchable).
- **No `stages` block in README** — `--next` prints an error and exits non-zero. The default status view does not require a `stages` block.

## Implementation Summary

Rewrote the status script from bash to Python 3 (stdlib only). The script supports three modes: default status table, `--archived`, and `--next` (dispatchable entity detection).

### Files changed

- **`docs/plans/status`** — Full Python rewrite with `parse_frontmatter()`, `parse_stages_block()`, `scan_entities()`, and dispatch eligibility logic. Uses `PIPELINE_DIR` env var override for testability.
- **`templates/status`** — Python template with description-header comments and stub body.
- **`templates/first-officer.md`** — Changed `bash __DIR__/status` to `python3 __DIR__/status` (2 occurrences).
- **`skills/commission/SKILL.md`** — Updated materialization target to Python 3 stdlib, updated invocation examples, added `--next` documentation.
- **`docs/plans/README.md`** — Updated invocation examples to `python3`, added `--next` documentation.
- **`tests/test_status_script.py`** — 21 tests covering default output, sorting, archive handling, and all four `--next` eligibility rules.

## Acceptance Criteria

1. The status script is implemented in Python 3 (stdlib only, no PyYAML)
2. Default mode (`python3 {dir}/status`) outputs the same table as the current bash implementation: ID, SLUG, STATUS, TITLE, SCORE, SOURCE — sorted by stage order ascending, then score descending
3. `--archived` flag includes entities from `_archive/` subdirectory
4. `--next` outputs a table of dispatchable entities with columns: ID, SLUG, CURRENT, NEXT, WORKTREE
5. Stage metadata (ordering, gate, terminal, worktree, concurrency) is parsed from README frontmatter at runtime
6. Entities in terminal stages are excluded from `--next`
7. Entities in gated stages are excluded from `--next`
8. Entities with non-empty worktree fields are excluded from `--next`
9. Entities whose next stage is at concurrency capacity are excluded from `--next`
10. `--next` output is sorted by score descending (highest priority first)
11. The template (`templates/status`) is rewritten as Python with description-header comments
12. The first-officer template (`templates/first-officer.md`) invocation is updated to `python3`
13. The commission skill (`skills/commission/SKILL.md`) materializes a Python implementation
14. `--next` prints an error and exits non-zero if README lacks a `stages` block
