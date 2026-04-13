---
id: 088
title: "Debate-driven skill simulation -- role-play ensign dispatch for skill testing"
status: clarify
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
context_status: ready
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

## Assumptions

A-1: skill-simulation follows the build-review debate-driven pattern: FO creates a team, dispatches invoker + responder as teammates, they interact via SendMessage, results written to entity body. UAT ensign reads results and classifies them.
Confidence: Confident (0.88)
Evidence: build-review SKILL.md:63 -- "Review uses the debate-driven dispatch mode." :77 -- "FO creates exactly 3 themed reviewer teammates." :97 -- "Dispatch all reviewers in parallel via Agent() with team_name." Same architecture, different role assignment.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Fixture answers extracted from entity body's → Answer and → Selected annotations via Read. Responder ensign loads entity, parses clarify annotations, uses them to answer AskUserQuestion prompts from the invoker's skill execution.
Confidence: Likely (0.75)
Evidence: Clarify output format (output-format.md) is well-defined. → Answer and → Selected annotations follow consistent grep-compatible format. Parsing is a simple text operation.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: skill-simulation applies ONLY to Class 3 (captain-interactive) skills. Class 1/2 skills use entity 084's skill-invocation smoke test. Classification uses the same "grep SKILL.md for AskUserQuestion" mechanism from entity 084 Q-2.
Confidence: Confident (0.85)
Evidence: Entity 084 Q-2 answer: "pre-classify via grep for AskUserQuestion." Same classification drives which UAT item type is generated at plan time. (✓ resolved α marker: Class 1/2 skip logic confirmed via 084 Q-2 decision)
→ Confirmed: captain, 2026-04-13 (batch)

A-4: skill-simulation items are generated by build-plan, not manually authored. When build-plan detects the entity creates/modifies a Class 3 skill (grep for AskUserQuestion in the skill's SKILL.md), it adds a `type: skill-simulation` item to the UAT Spec.
Confidence: Likely (0.70)
Evidence: build-plan generates UAT Spec items for other types (browser, cli). Skill-simulation item generation follows the same plan-time detection pattern. Entity 084's skill-invocation item generation provides a direct precedent.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Simulation team ownership

Who creates the 2-ensign team for skill-simulation -- FO or the UAT ensign?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| FO creates team before UAT ensign | Consistent with review debate pattern; FO owns all team dispatch; UAT ensign is a reader/classifier | FO needs conditional dispatch logic for skill-simulation items; adds a UAT-specific code path to FO | Medium | Recommended |
| UAT ensign creates team itself | Self-contained; ensign has All tools per 084 O-1 correction; no FO changes needed | Breaks FO dispatch pattern; UAT ensign becomes both team creator and results consumer; mixes orchestration layers | Medium | Viable |

→ Selected: FO creates team before UAT ensign (captain, 2026-04-13, interactive)

## Open Questions

Q-1: Should the simulation produce a pass/fail verdict, or only capture the interaction log as evidence for captain review?

Domain: Behavioral/Callable

Why it matters: If simulation produces a verdict (pass = skill responded correctly to all fixtures), it can auto-route failures to execute like other UAT item types. If it only captures logs, captain must manually review every simulation.

Suggested options: (a) Auto-verdict based on fixture match -- if responder's fixture answers were consumed and invoker completed without error, verdict = pass, (b) Evidence-only -- capture interaction log, always route to captain interactive sign-off in Step 4, (c) Hybrid -- auto-pass on clean run, route to captain only on error/timeout

→ Answer: Hybrid -- auto-pass on clean run (fixture answers consumed, invoker completed without error), route to captain interactive sign-off only on error or timeout. Interaction log captured as evidence in both cases. (captain, 2026-04-13, interactive)

## Canonical References

(none cited)

## Stage Report: explore

- [x] Files mapped: 3 across skill layer
  build-review SKILL.md:63-120 (debate-driven pattern), build-uat SKILL.md:56-68 (type enum + Step 2), entity 084 (skill-invocation + Class 3 classification)
- [x] Assumptions formed: 4 (Confident: 2, Likely: 2)
  A-1 debate pattern reuse (0.88), A-2 fixture extraction (0.75), A-3 Class 3 only (0.85), A-4 plan-time generation (0.70)
- [x] Options surfaced: 1
  O-1 simulation team ownership (FO vs UAT ensign)
- [x] Questions generated: 1
  Q-1 simulation verdict type (auto vs evidence-only vs hybrid)
- [x] α markers resolved: 1 / 1
  α-1 (Class 1/2 skip logic) resolved via entity 084 Q-2 decision -- grep for AskUserQuestion
- [x] Scale assessment: confirmed Medium
  3 files mapped; new UAT item type + team dispatch logic + fixture extraction
- [x] Research dispatched: 0 researchers (skipped -- all assumptions on internal architecture)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Medium scope, no children proposed
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  all evidence holds against current codebase
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
  A-1 debate pattern, A-2 fixture extraction, A-3 Class 3 only, A-4 plan-time generation -- all confirmed batch
- [x] Options selected: 1 / 1
  O-1 FO creates team before UAT ensign (recommended, consistent with review pattern)
- [x] Questions answered: 1 / 1
  Q-1 hybrid verdict -- auto-pass on clean run, captain on error/timeout
- [x] Open exploration: 0 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 0 via freeform)
  debate pattern, fixture mechanism, and verdict type all resolved
- [x] Canonical refs added: 0
  no external file references cited
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 088" when ready
- [x] Clarify duration: 3 questions asked, session complete
  1 batch + 1 option + 1 Q

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
