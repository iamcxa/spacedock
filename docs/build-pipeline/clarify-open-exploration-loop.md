---
id: 076
title: "Clarify open exploration loop -- captain-driven gray area discovery"
status: draft
context_status: pending
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

## Directive

> Build-clarify currently resolves only the gray areas that build-explore identified (assumptions, options, questions). Once all pre-identified items are resolved, the sufficiency gate passes and clarify ends. This misses the captain's domain knowledge -- the captain often sees gray areas that explore didn't surface.
>
> Example from entity 052: the captain identified two pipeline-level improvements (research dispatch, clarify UX) that were outside explore's codebase-analysis scope. Example from entity 053 (future): "should we use shadcn UI?" is a technology choice the captain knows is relevant but explore won't surface unless the design doc mentions it.
>
> The clarify phase should be open-ended and captain-driven, with SO proactively suggesting potential gray areas beyond what explore found.

## Captain Context Snapshot

- **Repo**: main @ 6f25e05
- **Session**: No recent session context
- **Domain**: Runnable / Invokable, Behavioral / Callable, Readable / Textual
- **Related entities**: 075 -- Research dispatch architecture (clarify/ready), 077 -- Cross-phase skepticism validation gates (draft), 071 -- Build-Clarify Interaction Modes (draft), 072 -- Build-Explore Domain-Aware Gray Area Generation (draft)
- **Created**: 2026-04-13T01:30:00Z

## Brainstorming Spec

**APPROACH**: Add a Step 4.5 "Open Exploration Loop" to `build-clarify/SKILL.md` between the current Step 4 (Open Question Resolution) and Step 5 (Sufficiency Gate). Step 4.5 uses AskUserQuestion to present 2-3 SO-suggested gray areas plus a terminal "Complete -- no more gray areas" option. Suggestion generation draws from three sources: (1) domain templates from `gray-area-templates.md` not already covered by explore's output, (2) cross-entity implications from sibling/downstream entities in CONTRACTS.md, and (3) technology or design choices implied by the directive but not surfaced by explore's codebase-only analysis. When the captain selects a gray area, SO discusses it, produces an annotation (new assumption, option, or question), appends it to the entity body, and loops back to Step 4.5 with fresh suggestions. When the captain selects "Complete", flow proceeds to Step 5 sufficiency gate. A "seen topics" set tracks already-discussed areas to guarantee fresh suggestions each iteration.

**ALTERNATIVE**: Instead of a suggestion-driven loop, add a single freeform "Is there anything else you'd like to explore?" prompt after Step 4. The captain types gray areas manually with no SO-generated suggestions. -- D-01 Rejected: passive prompting puts the cognitive burden on the captain to recall what explore missed; structured suggestions leverage SO's codebase knowledge to jog the captain's memory and surface non-obvious gray areas. The whole point of SO is proactive intelligence, not reactive stenography.

**GUARDRAILS**:
- `## Directive` and `## Captain Context Snapshot` are immutable -- Step 4.5 must not modify them
- AskUserQuestion calls must follow `references/ask-user-question-rules.md` -- one question per message, never batch, always include recommendation when evidence supports it
- Each loop iteration must produce NEW suggestions (tracked via a "seen topics" set) -- no repeats of already-discussed or already-annotated gray areas
- Step 4.5 must always include a terminal "Complete" option to prevent infinite loops
- Suggestion count per iteration is 2-3 (not more) to avoid overwhelming the captain with choices

**RATIONALE**: The suggestion-driven loop is the correct approach because it transforms clarify from a "verify what explore found" phase into a "discover what explore missed" phase. Entity 052's clarify session proved the gap: the captain identified research dispatch (now entity 075) and clarify UX improvements (now entity 076 itself) -- insights that codebase analysis alone could never surface. By presenting curated suggestions from domain templates, cross-entity analysis, and implied technology choices, SO reduces the captain's cognitive load while surfacing the exact category of gray areas that codebase-only analysis structurally cannot reach: organizational constraints, technology preferences, and cross-cutting concerns. The freeform alternative would technically work but produces shallower exploration in practice -- structured prompts consistently elicit richer responses than open-ended "anything else?" prompts.

## Acceptance Criteria

- [ ] Given all pre-identified items (assumptions, options, questions) are resolved in Steps 2-4, when Step 4.5 runs, then SO presents an AskUserQuestion with 2-3 suggested gray areas plus a "Complete" terminal option (how to verify: run clarify on a test entity past Step 4, inspect AskUserQuestion call for >=3 options including "Complete")
- [ ] Given the captain selects a suggested gray area, when SO discusses and resolves it, then the result is annotated in the entity body as a new assumption, option, or question, and Step 4.5 loops with fresh suggestions (how to verify: read entity file after selection, confirm new annotation exists; verify next AskUserQuestion presents different options)
- [ ] Given the captain selects "Complete", when Step 4.5 exits, then it proceeds directly to Step 5 sufficiency gate without further prompting (how to verify: trace execution flow, confirm Step 5 runs immediately after "Complete" selection)
- [ ] Given Step 4.5 loops 3+ times, when SO generates suggestions each round, then no suggestion label repeats any previously discussed topic (how to verify: collect all AskUserQuestion option labels across iterations, assert zero duplicates)
- [ ] Given a captain selects "Other" and types a freeform gray area, when SO processes it, then it is discussed, annotated in the entity body, and Step 4.5 loops (how to verify: type a custom gray area via "Other", confirm annotation appears in entity file)

## References

- `skills/build-clarify/SKILL.md` Steps 4 and 5: insertion point for Step 4.5
- `skills/build-clarify/references/ask-user-question-rules.md`: AskUserQuestion format rules
- `skills/build-explore/references/gray-area-templates.md`: domain templates for suggestion generation
- Entity 052 clarify session (2026-04-13): captain feedback that identified this gap
- Entity 075 (research dispatch): related pipeline improvement, but distinct concern (research = evidence gathering, this = interaction design)
