---
id: 031
title: Pipeline Definition — Brainstorm Stage + Profile System
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP1)
started:
completed:
verdict:
score: 0.95
worktree:
issue:
pr:
intent: enhancement
scale: Small
project: spacedock
---

## Dependencies

- None (foundational — blocks 034)

## Problem

The pipeline README frontmatter defines a fixed 11-stage pipeline with no profile system. All entities go through the same stages regardless of size or complexity.

## Scope

Update `docs/build-pipeline/README.md` frontmatter:

1. Add `profiles` section defining full/standard/express stage compositions
2. Add `brainstorm` as initial stage (`worktree: false`, `gate: true`)
3. Add `profiles` annotation to each existing stage
4. Document new entity frontmatter fields: `profile`, `skip-stages`, `add-stages`
5. Add ensign spec writing guideline (prefer mermaid for architecture diagrams)

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 1 (Pipeline Stage Definition) + Section 2.5 (Ensign Deliverable mermaid guideline).

## Acceptance Criteria

- README frontmatter contains `profiles` section with full/standard/express
- `brainstorm` stage is defined as `initial: true`, `worktree: false`, `gate: true`
- Each non-universal stage has `profiles: [...]` annotation
- Entity frontmatter schema documented with `profile`, `skip-stages`, `add-stages`
