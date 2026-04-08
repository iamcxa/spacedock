---
id: 034
title: FO Dispatch Logic — Profile-Aware Stage Routing
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP4)
started:
completed:
verdict:
score: 0.85
worktree:
issue:
pr:
intent: enhancement
scale: Medium
project: spacedock
---

## Dependencies

- 031 (Pipeline Definition) — needs profile definitions in README frontmatter

## Problem

FO dispatch logic assumes all entities go through the same fixed stage sequence. With profiles, FO needs to compute effective stages per entity and route accordingly. FO also needs brainstorm triage logic (executability assessment, A/B/C path routing).

## Scope

### 1. Effective Stage Computation
- `effectiveStages(entity, pipelineConfig)` — compute from profile + skip/add overrides
- `add-stages` inserted at canonical position (full pipeline order)
- Recomputed on every stage advancement (supports mid-pipeline changes)

### 2. Next Stage Routing
- `nextStage(entity, pipelineConfig)` — profile-aware advancement
- Handles edge case: current stage removed by override (find next in canonical order)
- Profile-less state during brainstorm (profile not yet assigned)

### 3. Brainstorm Triage (FO Inline)
- Executability checklist: intent clear, approach decidable, scope bounded, verification possible, size estimable
- Express path: 5/5 + small → post recommendation, wait for gate
- Captain choice path: ≤4/5 → present A/B/C options
  - A: invoke superpowers:brainstorming
  - B: dispatch ensign to worktree for analysis
  - C: captain provides approach directly

### 4. status --next Enhancement
- Show profile column in dispatchable entities list
- Show `(FO inline)` for brainstorm stage
- Show `(needs profile)` for entities without assigned profile

### 5. Mid-Pipeline Profile Changes
- Profile/override changes only affect stages after current_stage
- Never re-run passed stages

### 6. FO Awareness Rules (Workflow-Agnostic)
- Ambiguous entity detection when captain messages on global channel
- Auto-match by recent activity or keyword
- Ask for clarification when multiple entities active
- Rules in spacedock core (first-officer shared contract), not workflow-specific

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 2 (Brainstorm Stage Behavior), Section 7 (FO Dispatch Logic).

## Acceptance Criteria

- `effectiveStages()` correctly computes stage list for all 3 profiles + overrides
- `nextStage()` advances through profile-filtered stages
- Brainstorm triage produces executability score and path recommendation
- A/B/C routing works: A invokes brainstorming skill, B dispatches ensign, C accepts direct input
- `status --next` shows profile and dispatch type
- Mid-pipeline profile change doesn't re-run passed stages
- FO asks for entity clarification when global channel message is ambiguous
