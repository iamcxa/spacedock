---
id: 076
title: "Clarify open exploration loop -- captain-driven gray area discovery"
status: plan
context_status: ready
source: captain feedback during 052 clarify session (2026-04-13)
started: 2026-04-13T10:05:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-clarify-open-exploration-loop
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

**APPROACH**: Add a Step 4.5 "Open Exploration Loop" to `build-clarify/SKILL.md` between the current Step 4 (Open Question Resolution) and Step 5 (Sufficiency Gate) (✓ confirmed by explore: skills/build-clarify/SKILL.md:171-220 -- clear insertion point between Steps 4 and 5, external refs use step names not numbers, fractional numbering safe). Step 4.5 uses AskUserQuestion to present 2-3 SO-suggested gray areas plus a terminal "Complete -- no more gray areas" option (✓ confirmed by explore: skills/build-clarify/references/ask-user-question-rules.md:1-9 -- existing AskUserQuestion pattern in Steps 3/4, 2-4 options required). Suggestion generation draws from three sources: (1) domain templates from `gray-area-templates.md` not already covered by explore's output (⚠ contradicted: gray-area-templates.md lives at skills/build-explore/references/, not build-clarify; no cross-skill reference precedent exists -- see O-1), (2) cross-entity implications from sibling/downstream entities in CONTRACTS.md (✓ confirmed by explore: docs/build-pipeline/_index/CONTRACTS.md -- file-path-level entity tracking supports cross-entity lookup), and (3) technology or design choices implied by the directive but not surfaced by explore's codebase-only analysis (✓ confirmed by explore: entity 072 proposes similar directive-derived analysis at explore stage; same LLM reasoning approach applies at clarify stage). When the captain selects a gray area, SO discusses it, produces an annotation (new assumption, option, or question), appends it to the entity body, and loops back to Step 4.5 with fresh suggestions. When the captain selects "Complete", flow proceeds to Step 5 sufficiency gate. A "seen topics" set tracks already-discussed areas to guarantee fresh suggestions each iteration.

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

## Assumptions

A-1: Step 4.5 inserts between Steps 4 and 5 using fractional numbering (4.5) without renumbering existing steps. External references to "Step 5" remain valid.
Confidence: Confident (0.95)
Evidence: skills/build-clarify/SKILL.md:171-220 -- Steps 4 and 5 have clear boundaries; agents/science-officer.md references "Step 5 sufficiency gate" by name, not by positional index
→ Confirmed: captain, 2026-04-13 (batch)

A-2: New gray areas discovered in Step 4.5 are immediately discussed with the captain, resolved, and annotated in the entity body within the same iteration -- arriving at Step 5 already resolved and passing the sufficiency gate without Step 5 modification.
Confidence: Confident (0.85)
Evidence: skills/build-clarify/SKILL.md:220-228 -- Step 5 checks "every item has annotation"; items created AND annotated during Step 4.5 satisfy this. SKILL.md:335 -- "Entity body IS the checkpoint" supports immediate write-through
→ Confirmed: captain, 2026-04-13 (batch)

A-3: The "seen topics" set is recoverable from the entity body on session resume -- the union of all A-n/O-n/Q-n headings in the entity, readable via grep on resume.
Confidence: Confident (0.90)
Evidence: skills/build-clarify/SKILL.md:335 -- "Entity body IS the checkpoint." SKILL.md:99-101 -- resume case already re-reads entity body counts. Seen-topics follows same pattern
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Step 4.5's AskUserQuestion calls follow the same format rules as Steps 3 and 4: 2-4 options, one question per message, header ≤12 chars, recommendation when evidence supports it.
Confidence: Confident (0.95)
Evidence: skills/build-clarify/references/ask-user-question-rules.md:1-9 -- rules apply to ALL AskUserQuestion calls in build-clarify; Steps 3 and 4 establish the pattern
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Step 5 sufficiency gate needs no modification -- Step 4.5 creates items in the same A-n/Q-n format as explore, and resolves them inline before "Complete" is selected.
Confidence: Confident (0.85)
Evidence: skills/build-clarify/SKILL.md:222-228 -- five gate checks scan sections by format (A-n annotations, O-n selections, Q-n answers), not by creation source
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Cross-skill reference strategy for gray-area-templates.md

Step 4.5 needs `gray-area-templates.md` (currently at `skills/build-explore/references/`) to identify uncovered domain templates. No cross-skill reference pattern exists in the codebase.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Read by absolute path from explore's references | Zero file changes; single source of truth; clarify reads `skills/build-explore/references/gray-area-templates.md` directly | Creates implicit cross-skill dependency; if explore moves/renames templates, clarify breaks silently | Low | Recommended |
| Copy or symlink to build-clarify references | Explicit ownership; both skills reference local files | File duplication (copy) or symlink maintenance; contradicts "one source of truth" principle | Medium | Viable |
| Embed suggestion heuristic inline in Step 4.5 | No dependency; Step 4.5 has self-contained logic | Duplicates template knowledge; drifts from explore's templates over time; contradicts CLAUDE.md "one source of truth" | Medium | Not recommended |

→ Selected: Read by absolute path from explore's references (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How should Step 4.5 format captain-discovered gray areas in the entity body?

Domain: Readable / Textual

Why it matters: Downstream consumers (build-plan, FO, status script) parse A-n/O-n/Q-n entries. If Step 4.5 uses a different format, those parsers won't find the new items. If it uses the same format, the items are indistinguishable from explore-created ones -- which may be desirable or confusing depending on the captain's preference.

Suggested options: (a) Same A-n/Q-n format in existing sections, numbering continues from explore's last entry (e.g., explore wrote A-1 through A-5, Step 4.5 creates A-6), (b) Separate `## Captain Gray Areas` section with own numbering scheme, (c) Free-form `## Open Exploration Notes` section not parsed by downstream

→ Answer: Same A-n/Q-n format, continue numbering (captain, 2026-04-13, interactive)

Q-2: What is the ordering expectation with entity 072 (build-explore domain-aware gray areas)?

Domain: Runnable / Invokable

Why it matters: Entity 072 enhances explore's Step 4 with directive-derived gray areas. Entity 076 enhances clarify's Step 4.5 with uncovered-template suggestions. If 072 ships first, explore covers MORE gray areas, leaving fewer for Step 4.5's "uncovered templates" source -- the two features are complementary but overlap in the template-coverage dimension. The captain should decide whether 076 depends on 072 or can ship independently.

Suggested options: (a) Independent -- 076 proceeds now, Step 4.5 adapts dynamically to whatever explore produced (more explore coverage = fewer 4.5 suggestions, which is fine), (b) 076 depends on 072 -- add to depends-on, ship 076 after explore is enhanced, (c) Merge scope -- combine directive-derived gray areas (explore enhancement) + open exploration loop (clarify addition) into a single entity

→ Answer: Independent -- 076 proceeds now, Step 4.5 self-adapts to whatever explore produced. Sources 2+3 (CONTRACTS.md, implied technology) are 072-independent. Avoids blocking on 072's empty pipeline state. (captain, 2026-04-13, interactive)

## Canonical References

(No external docs cited during clarify session)

## References

- `skills/build-clarify/SKILL.md` Steps 4 and 5: insertion point for Step 4.5
- `skills/build-clarify/references/ask-user-question-rules.md`: AskUserQuestion format rules
- `skills/build-explore/references/gray-area-templates.md`: domain templates for suggestion generation
- `skills/build-clarify/references/output-format.md`: annotation format for downstream parsing
- `docs/build-pipeline/_index/CONTRACTS.md`: cross-entity file tracking for source 2 suggestions
- Entity 052 clarify session (2026-04-13): captain feedback that identified this gap
- Entity 072 (build-explore domain-aware gray areas): overlapping concern -- explore-stage directive-derived gray areas
- Entity 075 (research dispatch): related pipeline improvement, but distinct concern (research = evidence gathering, this = interaction design)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  entity is Small scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed via batch -- all Confident, no corrections needed
- [x] Options selected: 1 / 1
  O-1 cross-skill reference -- Read by absolute path from explore's references (recommended)
- [x] Questions answered: 2 / 2
  Q-1 same A-n/Q-n format continue numbering; Q-2 independent of entity 072
- [x] Canonical refs added: 0
  captain cited no external docs during clarify session
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say 'execute 076' to advance; no auto_advance in frontmatter
- [x] Clarify duration: 4 questions asked, session complete
  1 batch confirmation + 1 AskUserQuestion option + 2 AskUserQuestion Qs (+ 1 follow-up analysis)

## Stage Report: explore

- [x] Files mapped: 5 across skill definition, reference docs
  skills/build-clarify/SKILL.md, references/ask-user-question-rules.md, references/output-format.md, build-explore/references/gray-area-templates.md, _index/CONTRACTS.md
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 through A-5 all Confident via line-number evidence from build-clarify SKILL.md and reference docs
- [x] Options surfaced: 1
  O-1 cross-skill reference strategy for gray-area-templates.md
- [x] Questions generated: 2
  Q-1 annotation format for captain-discovered gray areas; Q-2 ordering with entity 072
- [x] α markers resolved: 0 / 0
  no α markers in brainstorming spec
- [x] Scale assessment: confirmed
  5 files confirms Small estimate from brainstorming
