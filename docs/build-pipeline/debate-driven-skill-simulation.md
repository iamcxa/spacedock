---
id: 088
title: "Debate-driven skill simulation -- role-play ensign dispatch for skill testing"
status: draft
source: decomposition of entity 085 (stage report evidence and confidence)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: []
parent: 085
context_status: pending
---

## Directive

> Skill entities ship without interaction testing. Structural validation (forge audit, entity 084) and runtime smoke tests catch loading errors but not interaction failures. For skill entities, UAT dispatches 2+ ensigns to role-play skill interaction -- one ensign as SO/invoker, another as captain with fixture answers from the entity's clarify Q&A history. Interaction log becomes evidence. The build-review debate-driven reviewer pattern (themed reviewers + SendMessage) is the architectural precedent.

## Captain Context Snapshot

- **Repo**: main @ 1aab8ed
- **Session**: Entities 086 + 087 just completed clarify; 088 is the final child of epic 085
- **Domain**: Runnable / Invokable, Behavioral / Callable
- **Related entities**: 085 -- Stage Report evidence + confidence gate (epic, parent), 084 -- Review forge validation (clarify/ready, structural "front half"), 082 -- UAT evidence (clarify/ready), 067 -- Build flow TDD discipline (shipped, TDD mechanism)
- **Created**: 2026-04-13T16:45:00+08:00

## Brainstorming Spec

**APPROACH**: Add a `type: skill-simulation` item type to build-uat (alongside existing browser/cli/api/interactive + entity 084's skill-invocation). When UAT encounters a skill-simulation item, it dispatches 2 ensigns via Agent tool as teammates: (1) "invoker" ensign loads the target skill and plays the role specified in the simulation item (e.g., SO running build-distill), (2) "responder" ensign plays the captain role with pre-loaded fixture answers extracted from the entity's `## Open Questions` → Answer and `## Option Comparisons` → Selected annotations. The two ensigns interact via SendMessage. The interaction log (messages exchanged, skill output, errors) is captured as evidence in UAT Results. This follows the build-review debate-driven pattern: FO creates a team, dispatches themed teammates, they interact, results are written to entity body.

**ALTERNATIVE**: Instead of dispatching 2 ensigns in a team, have a single ensign load the skill and simulate both roles internally (invoke the skill, then self-answer AskUserQuestion prompts using fixtures). -- D-01 Rejected because single-ensign simulation loses the SendMessage interaction trace, which is the highest-value evidence artifact. The debate-driven pattern's whole value is that cross-ensign messages are observable -- a self-answering ensign produces no observable interaction log.

**GUARDRAILS**:
- Fixture answers come from the entity's OWN clarify decisions (→ Answer, → Selected annotations), not invented data. This grounds the simulation in real captain decisions.
- build-review's debate-driven pattern (SKILL.md FO Guidance Phase 1) is the architectural reference. Entity 088 adapts it, not reinvents it.
- Class 3 skills (captain-interactive) are the primary target. Class 1/2 skills (non-interactive) are already covered by entity 084's skill-invocation smoke test (needs clarification -- deferred to explore).
- Simulation is UAT-scope, not review-scope. It tests "does the skill work in an interaction flow?" not "is the skill structurally correct?"
- May be deferred if design complexity warrants -- parent 085 decomposition explicitly allows this.

**RATIONALE**: The debate-driven pattern is the correct architecture because it produces an observable interaction log via SendMessage traces. A single-ensign self-simulation is cheaper but the whole point of this entity is to catch interaction failures that structural tests miss -- you need two independent contexts to surface timing, state, and communication bugs. The fixture-answer approach is correct because real captain decisions from the entity's own clarify phase provide semantically valid inputs, avoiding the combinatorial explosion of generated test cases.

## Acceptance Criteria

- [ ] Given a skill entity in UAT with a `type: skill-simulation` item, when UAT Step 2 processes it, then 2 ensigns are dispatched as teammates (invoker + responder) and the interaction log is captured as evidence (how to verify: run UAT on skill entity, observe simulation dispatch and interaction log in UAT Results)
- [ ] Given a Class 3 skill, when the responder ensign encounters an AskUserQuestion prompt, then it answers using fixture data extracted from the entity's clarify → Answer annotations (how to verify: observe fixture answers in simulation log match the entity's clarify decisions)
- [ ] Given a Class 1/2 (non-interactive) skill, when simulation is considered, then it is skipped in favor of entity 084's skill-invocation smoke test (how to verify: run UAT on non-interactive skill entity, confirm skill-simulation item is skipped or absent)

## Problem

Skill entities ship without interaction testing. Entity 068 created build-distill SKILL.md without any verification that the skill works in a real interaction flow. Structural validation (forge audit from entity 084) and runtime smoke tests catch loading errors but not interaction failures.

## Scope

For skill entities, UAT (or a new sub-step) dispatches 2+ ensigns that each load the new skill and interact. Example: one ensign plays "SO invoking build-distill", another plays "captain responding" with fixture answers. Interaction log becomes evidence. May be deferred if design complexity warrants -- this entity is the design + implementation scope.

## Acceptance Criteria

- [ ] Given a skill entity in UAT, when debate-driven simulation fires, then 2+ ensigns are dispatched to role-play skill interaction and the interaction log is captured as evidence (how to verify: run UAT on skill entity, observe simulation dispatch and interaction log in UAT Results)
- [ ] Given a Class 3 (captain-interactive) skill, when simulation runs, then the "captain" ensign uses fixture answers from the entity's own clarify Q&A history (how to verify: observe fixture answers in simulation log match the entity's clarify decisions)

## References

- Parent entity 085: stage report evidence and confidence (epic)
- Entity 084 (review forge validation): structural validation is the "front half"; this entity is deeper interaction testing
- `skills/build-uat/SKILL.md`: simulation dispatched from UAT stage
- `skills/build-review/SKILL.md`: debate-driven reviewer pattern as architectural precedent
