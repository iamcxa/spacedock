# Dim 3 -- Dependency Correctness Rules

These are the authoritative wave-graph integrity rules applied by `build-plan` Step 6b (inline synthesis-layer Dim 3 check). This file is NOT deprecated and must be kept in sync with the Dim 3 description in `plan-checker-prompt.md` during the O-2-B parallel-run window.

## Wave-Graph Integrity Rules

Build the wave graph from `wave` attributes in the `## PLAN` section, then apply:

- Wave N tasks' `read_first` entries can only reference outputs produced by wave < N tasks (or pre-existing files). A wave 2 task reading a wave 2 task's output is a cycle hint -- **blocker**.
- `files_modified` overlap between tasks in the same wave -- **warning** (parallelism concern, execute will force serial).
- `files_modified` overlap AND cross-wave with dependency ordering reversed -- **blocker**.
- Cycles in the wave graph -- **blocker**.

Emit issues with `dimension: dependency_correctness` for each violation found.
