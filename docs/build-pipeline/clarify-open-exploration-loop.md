---
id: 076
title: "Clarify open exploration loop -- captain-driven gray area discovery"
status: draft
source: captain feedback during 052 clarify session (2026-04-13)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: []
---

## Problem

Build-clarify currently resolves only the gray areas that build-explore identified (assumptions, options, questions). Once all pre-identified items are resolved, the sufficiency gate passes and clarify ends. This misses the captain's domain knowledge -- the captain often sees gray areas that explore didn't surface.

Example from entity 052: the captain identified two pipeline-level improvements (research dispatch, clarify UX) that were outside explore's codebase-analysis scope. Example from entity 053 (future): "should we use shadcn UI?" is a technology choice the captain knows is relevant but explore won't surface unless the design doc mentions it.

The clarify phase should be open-ended and captain-driven, with SO proactively suggesting potential gray areas beyond what explore found.

## Scope

- Add Step 4.5 "Open Exploration Loop" to build-clarify SKILL.md between Step 4 (Open Question Resolution) and Step 5 (Sufficiency Gate)
- Step 4.5 uses AskUserQuestion with 3-4 options:
  - 2-3 SO-suggested gray areas (derived from: domain templates not yet covered, cross-entity implications, technology choices implied but not stated, design doc forward-looking sections not yet addressed)
  - Final option always: "Complete -- no more gray areas" (proceeds to Step 5)
  - "Other" (auto-added by harness) serves as freeform captain input
- When captain picks a gray area: discuss it, resolve it (may produce new assumption, option, or question annotation), then loop back to Step 4.5
- When captain picks "Complete": proceed to Step 5 sufficiency gate
- SO must proactively generate suggestions -- not just present an empty "anything else?" prompt
- Suggestion generation heuristic: check domain templates for uncovered areas, check design doc invariants (Step 1b) for unaddressed forward-looking goals, check sibling/downstream entities for interface assumptions

## Acceptance Criteria

- [ ] Given a clarify session where all pre-identified items are resolved, when Step 4.5 runs, then SO presents 2-3 suggested gray areas plus "Complete" option via AskUserQuestion
- [ ] Given the captain selects a suggested gray area, when SO discusses it, then the result is annotated in the entity body (new assumption, option, or question) and Step 4.5 loops
- [ ] Given the captain selects "Other" and types a freeform gray area, when SO processes it, then it is discussed and annotated, and Step 4.5 loops
- [ ] Given the captain selects "Complete", when Step 4.5 exits, then it proceeds to Step 5 sufficiency gate
- [ ] Given Step 4.5 loops 3+ times, when SO generates suggestions, then each round produces NEW suggestions (not repeats of already-discussed topics)

## References

- `skills/build-clarify/SKILL.md` Steps 4 and 5: insertion point for Step 4.5
- `skills/build-clarify/references/ask-user-question-rules.md`: AskUserQuestion format rules
- `skills/build-explore/references/gray-area-templates.md`: domain templates for suggestion generation
- Entity 052 clarify session (2026-04-13): captain feedback that identified this gap
- Entity 075 (research dispatch): related pipeline improvement, but distinct concern (research = evidence gathering, this = interaction design)
