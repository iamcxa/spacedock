---
id: 076
title: "Clarify open exploration loop -- captain-driven gray area discovery"
status: shipped
context_status: ready
source: captain feedback during 052 clarify session (2026-04-13)
started: 2026-04-13T10:05:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-clarify-open-exploration-loop
issue:
pr: "#35"
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

## Research Findings

### Upstream Constraints

- **SKILL.md step ordering is strict and named, not numbered positionally.** Steps are referenced by name ("Step 5 sufficiency gate") in `agents/science-officer.md:79` and throughout build-clarify itself. Fractional numbering (Step 4.5) is safe because external references use names, not ordinal positions (`skills/build-clarify/SKILL.md:171-220` -- Step 4 ends at line 218 with `---`, Step 5 begins at line 220).
- **AskUserQuestion rules are non-negotiable.** 2-4 options per question, one question per message, header <=12 chars, concrete options only, recommendation when evidence supports it (`skills/build-clarify/references/ask-user-question-rules.md:1-9`). Step 4.5 must follow these identically.
- **Entity body is the checkpoint.** No external state files allowed (`skills/build-clarify/SKILL.md:335`). The "seen topics" set must be recoverable from the entity body itself on resume.
- **Directive and Captain Context Snapshot are immutable.** Step 4.5 must not modify them (`skills/build-clarify/SKILL.md:146`).
- **Output format uses `--` (double dash), never em dash.** Annotations must be grep-compatible (`skills/build-clarify/SKILL.md:332-333`).

### Existing Patterns

- **Step 3 Option Selection loop pattern.** Steps 3 and 4 both iterate over items one-at-a-time using AskUserQuestion, record results with `-> Selected:` or `-> Answer:` annotations, and append to the entity body (`skills/build-clarify/SKILL.md:147-217`). Step 4.5 follows the same loop-and-annotate pattern but generates its own items rather than consuming explore's output.
- **Step 5 sufficiency gate scans by format, not by source.** The gate checks for `-> Answer:`, `-> Confirmed:`, `-> Selected:` annotations without distinguishing who created the A-n/Q-n items (`skills/build-clarify/SKILL.md:222-228`). Items created by Step 4.5 in the same format pass the gate automatically.
- **Resume case in Step 1.** When all counts are zero, skill skips to Step 5 (`skills/build-clarify/SKILL.md:100-101`). This means Step 4.5's "seen topics" must handle resume gracefully -- items already annotated from a previous session won't trigger re-discussion.
- **Canonical References accumulator runs during Steps 3 and 4.** The same accumulator pattern should extend to Step 4.5 -- if captain cites a file path during gray area discussion, append to `## Canonical References` (`skills/build-clarify/SKILL.md:200-214`).

### Library/API Surface

- **AskUserQuestion tool is DEFERRED.** Must be loaded via `ToolSearch(query: "select:AskUserQuestion", max_results: 1)` at Step 0 before any question (`skills/build-clarify/SKILL.md:28-31`). Already loaded once per session -- Step 4.5 does not need a second load.
- **Gray-area-templates.md structure.** Five domain sections (User-facing Visual, Behavioral/Callable, Runnable/Invokable, Readable/Textual, Organizational/Data-transforming), each with a table of gray area patterns. Skip rules: already decided, clear codebase precedent, solved by related entity (`skills/build-explore/references/gray-area-templates.md:1-86`). Multi-domain rule applies -- entity can match multiple domains.
- **CONTRACTS.md structure for cross-entity lookup.** File-path-keyed sections with entity/stage/intent/status/date columns. Sibling entities touching the same files are discoverable by scanning CONTRACTS.md for `skills/build-clarify/SKILL.md` entries (`docs/build-pipeline/_index/CONTRACTS.md:1-6`). Currently no entries exist for `skills/build-clarify/`, confirming entity 076 has no cross-entity conflicts.

### Known Gotchas

- **"Complete" option must always be present.** Without a terminal option, the loop has no exit condition. AskUserQuestion's auto-added "Other" freeform option is NOT sufficient as a terminal -- the captain might type a gray area via "Other", which should loop, not exit. "Complete" must be an explicit canned option.
- **Suggestion freshness requires deduplication against BOTH explore-created items AND previously discussed Step 4.5 items.** The "seen topics" set is the union of all A-n/O-n/Q-n headings in the entity body (per A-3), but suggestion generation must ALSO avoid re-suggesting topics that map to the same template row, even if they produced different A-n labels. Track by template row identity, not just A-n label.
- **Cross-skill file read path stability.** O-1 selected "read by absolute path from explore's references" for `gray-area-templates.md`. The path `skills/build-explore/references/gray-area-templates.md` is relative to repo root. If build-explore ever moves or renames this file, Step 4.5 breaks silently. No mitigation beyond documenting the dependency -- accepted risk per O-1 discussion.
- **AskUserQuestion option count constraint with "Complete".** With 2-3 suggestions plus "Complete", the option count is 3-4. AskUserQuestion allows 2-4 options before the harness auto-adds "Other". This means at most 3 suggestions + "Complete" = 4 options. The brainstorming spec says "2-3 suggested gray areas" which yields 3-4 total options -- within the 2-4 limit.

### Reference Examples

- **Step 4 Open Question Resolution** (`skills/build-clarify/SKILL.md:171-217`) is the closest structural analogue to Step 4.5. Both: (1) iterate over items, (2) present AskUserQuestion with options derived from the item, (3) record the result as an annotation, (4) run the Canonical References accumulator. Step 4.5 differs only in that it generates its own items from three sources rather than consuming explore's pre-written questions.
- **Entity 076's own clarify session** demonstrates the gap: 5 assumptions confirmed, 1 option selected, 2 questions answered -- all from explore's output. The captain identified no additional gray areas because clarify had no mechanism to prompt for them. This entity IS the evidence for the feature it proposes.

## PLAN

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/ask-user-question-rules.md
    - skills/build-clarify/references/output-format.md
    - skills/build-explore/references/gray-area-templates.md
  </read_first>

  <action>
  Environment verification. Confirm all files the plan references exist and contain the expected content:
  1. `skills/build-clarify/SKILL.md` exists and contains `## Step 4:` and `## Step 5:` sections with a `---` separator between them (line 218)
  2. `skills/build-clarify/references/ask-user-question-rules.md` exists and documents 2-4 option limit
  3. `skills/build-clarify/references/output-format.md` exists and documents A-n/Q-n annotation formats
  4. `skills/build-explore/references/gray-area-templates.md` exists and contains 5 domain sections
  5. No other entity has an in-flight contract on `skills/build-clarify/SKILL.md` in CONTRACTS.md
  </action>

  <acceptance_criteria>
    - `test -f skills/build-clarify/SKILL.md && echo EXISTS` prints EXISTS
    - `test -f skills/build-clarify/references/ask-user-question-rules.md && echo EXISTS` prints EXISTS
    - `test -f skills/build-clarify/references/output-format.md && echo EXISTS` prints EXISTS
    - `test -f skills/build-explore/references/gray-area-templates.md && echo EXISTS` prints EXISTS
    - `grep -c "## Step 4:" skills/build-clarify/SKILL.md` returns 1
    - `grep -c "## Step 5:" skills/build-clarify/SKILL.md` returns 1
    - `grep "skills/build-clarify/SKILL.md" docs/build-pipeline/_index/CONTRACTS.md | grep -c "in-flight"` returns 0
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/ask-user-question-rules.md
    - skills/build-explore/references/gray-area-templates.md
  </read_first>

  <action>
  Insert `## Step 4.5: Open Exploration Loop` into `skills/build-clarify/SKILL.md` between the `---` separator after Step 4 (line 218) and the `## Step 5: Context Sufficiency Gate` heading (line 220). The new section contains:

  1. **Preamble**: "After all pre-identified items from Steps 2-4 are resolved, Step 4.5 opens an exploration loop where SO proactively suggests gray areas the captain's domain knowledge may surface beyond what explore found."

  2. **Seen-topics computation**: "Build the seen-topics set: scan the entity body for all `A-{n}:`, `O-{n}:` (subsection headings in Option Comparisons), and `Q-{n}:` entries. Extract the topic label from each. This set prevents re-suggesting already-discussed topics."

  3. **Suggestion generation from three sources**:
     - Source 1: Read `skills/build-explore/references/gray-area-templates.md`. For each domain matching the entity's `## Captain Context Snapshot` Domain field, scan the template table rows. Skip rows where the gray area is already covered by an item in seen-topics (match by semantic overlap, not exact string). Collect uncovered template rows as candidate suggestions.
     - Source 2: Read `docs/build-pipeline/_index/CONTRACTS.md`. Find sibling entities (same `files_modified` paths as this entity's brainstorming spec mentions) with status `in-flight` or `planned`. For each sibling, check if it implies a cross-entity concern not yet in seen-topics (e.g., "entity X is also modifying file Y -- does this entity need to coordinate?"). Collect as candidate suggestions.
     - Source 3: Re-read the entity's `## Directive` and `## Brainstorming Spec`. Identify technology or design choices implied by the directive but not surfaced by explore (e.g., "the directive mentions 'WebSocket' but no assumption or question addresses WebSocket connection management"). Collect as candidate suggestions.

  4. **Suggestion selection**: From all candidates, pick 2-3 that are most likely to surface actionable gray areas. Prioritize: cross-entity concerns (source 2) > uncovered templates (source 1) > implied technology (source 3), since cross-entity concerns are hardest for captains to spot independently.

  5. **AskUserQuestion presentation**: Build the AskUserQuestion payload:
     - `header`: "Gray areas" (10 chars)
     - `question`: "Are there gray areas not yet covered? Here are suggestions from domain analysis:"
     - `options`: 2-3 suggestion options, each with a `label` (the gray area name, e.g., "Cross-entity file conflict with entity 075") and `description` (1-sentence explanation of why it matters). Plus one terminal option: `label: "Complete -- no more gray areas"`, `description: "All gray areas are covered. Proceed to sufficiency gate."`
     - If a suggestion has strong evidence, prefix its label with `(recommended)`.
     - Call `AskUserQuestion(...)`.

  6. **Response handling**:
     - If captain selects "Complete -- no more gray areas": exit Step 4.5, proceed to Step 5.
     - If captain selects a suggested gray area: discuss the gray area with the captain in plain text. Based on the discussion, produce a new annotation in the entity body:
       - If it resolves as an assumption: append `A-{next_n}: {statement}` + `Confidence:` + `Evidence:` + `-> Confirmed: captain, {ISO-date} (interactive)` to the `## Assumptions` section. Compute `next_n` as max existing A-n + 1.
       - If it resolves as an open question with answer: append `Q-{next_n}: {question}` + `Domain:` + `Why it matters:` + `Suggested options:` + `-> Answer: {response} (captain, {ISO-date}, interactive)` to the `## Open Questions` section.
       - If it requires an option comparison: append a new `### {name}` subsection with table + `-> Selected: {choice} (captain, {ISO-date}, interactive)` to the `## Option Comparisons` section.
       - Run the Canonical References accumulator if the captain cites any file paths.
     - If captain selects "Other" (harness-added freeform): treat the freeform text as a captain-originated gray area. Discuss, annotate, and loop exactly as for a suggested gray area.
     - After annotation, add the discussed topic to seen-topics and loop back to step 3 (suggestion generation) with the updated seen-topics set for fresh suggestions.

  7. **Rules specific to Step 4.5**:
     - Maximum 2-3 suggestions per iteration (brainstorming spec guardrail). Never present more than 3 suggestions plus "Complete".
     - "Complete" option is always present in every iteration. It is always the last option.
     - No suggestion may repeat a topic from seen-topics. If all three sources produce zero new candidates, present only the "Complete" option with a note: "All domain templates are covered and no cross-entity concerns detected. Select Complete to proceed."
     - Step 4.5 inherits all Rules from the skill-level Rules section (double dash, entity body checkpoint, AskUserQuestion rules, Canonical References accumulator, preserve explore output).
  </action>

  <acceptance_criteria>
    - `grep -c "## Step 4.5:" skills/build-clarify/SKILL.md` returns 1
    - `grep "Open Exploration Loop" skills/build-clarify/SKILL.md` finds the heading
    - `grep -c "Complete -- no more gray areas" skills/build-clarify/SKILL.md` returns at least 1
    - `grep "gray-area-templates.md" skills/build-clarify/SKILL.md` finds the cross-skill reference path
    - `grep "CONTRACTS.md" skills/build-clarify/SKILL.md` finds the cross-entity lookup reference
    - `grep "seen-topics" skills/build-clarify/SKILL.md` finds at least 2 occurrences (computation + update)
    - `grep -c "## Step 5:" skills/build-clarify/SKILL.md` still returns 1 (Step 5 not displaced)
    - `grep -A2 "## Step 4.5:" skills/build-clarify/SKILL.md` shows the new section exists between Steps 4 and 5
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/output-format.md
  </read_first>

  <action>
  Update `skills/build-clarify/references/output-format.md` to document the annotation formats Step 4.5 produces. Add a new section `## Annotation: Open Exploration Item` after the existing `## Annotation: Open Question Answered` section. The new section documents:

  1. Step 4.5 creates items in the SAME A-n/Q-n format as explore (per Q-1 answer), appended to the existing `## Assumptions` or `## Open Questions` sections with numbering continuing from explore's last entry.
  2. The annotation is written inline (assumption confirmed or question answered in the same iteration), so the annotation line (`-> Confirmed:` or `-> Answer:`) always appears immediately with mode `(interactive)`.
  3. Example showing A-6 created by Step 4.5 when explore produced A-1 through A-5:

  ```markdown
  A-6: WebSocket reconnection uses exponential backoff
  Confidence: Confident (0.90)
  Evidence: captain domain knowledge -- standard practice for production WS clients
  -> Confirmed: captain, 2026-04-13 (interactive)
  ```

  4. Note: items created by Step 4.5 are indistinguishable from explore-created items by format. This is intentional (per Q-1 answer) -- downstream parsers (build-plan, FO, status script) process them identically.
  </action>

  <acceptance_criteria>
    - `grep "Open Exploration Item" skills/build-clarify/references/output-format.md` finds the new section heading
    - `grep "Step 4.5" skills/build-clarify/references/output-format.md` finds at least 1 reference
    - `grep "A-6:" skills/build-clarify/references/output-format.md` finds the example
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/references/output-format.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2">
  <read_first>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/output-format.md
  </read_first>

  <action>
  Update the Step 6 Stage Report template in `skills/build-clarify/SKILL.md` (lines 282-301) to include a new metric line for Step 4.5 activity. Add after the "Questions answered" line and before the "Canonical refs added" line:

  ```markdown
  - [x] Open exploration: {n} gray areas surfaced ({n} from templates, {n} from CONTRACTS, {n} from directive, {n} via freeform)
    e.g., "3 gray areas surfaced (1 from templates, 1 from CONTRACTS, 0 from directive, 1 via freeform)"
  ```

  Also update the `references/output-format.md` Stage Report section to include this new metric line in the canonical format, so the two stay synchronized.

  Additionally, update the `## Step 6: Commit` clarify duration metric example to account for Step 4.5 AskUserQuestion calls in the count:

  ```markdown
  - [x] Clarify duration: {n} questions asked, session complete
    e.g., "7 AskUserQuestion calls (1 batch + 1 option + 2 Qs + 3 exploration iterations)"
  ```
  </action>

  <acceptance_criteria>
    - `grep "Open exploration:" skills/build-clarify/SKILL.md` finds the new metric line
    - `grep "Open exploration:" skills/build-clarify/references/output-format.md` finds the matching line
    - `grep "exploration iterations" skills/build-clarify/SKILL.md` finds the updated duration example
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/SKILL.md
    - skills/build-clarify/references/output-format.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - skills/build-clarify/SKILL.md
  </read_first>

  <action>
  Update `skills/build-clarify/SKILL.md` Step 1 (Load Entity State, lines 91-108) to account for Step 4.5 in the resume case. Currently the resume case says "if all three counts are zero -> skip to Step 5". This needs to become: "if all three counts are zero -> skip to Step 4.5" so that a resumed session still offers the open exploration loop even when all pre-identified items are already resolved.

  Specifically, change line 100:
  FROM: `**Resume case:** if all three counts are zero → skip to Step 5 (the entity was previously clarified; this is a re-entry to finalize the handoff).`
  TO: `**Resume case:** if all three counts are zero → skip to Step 4.5 (the entity's pre-identified items were previously resolved; the open exploration loop may still surface new gray areas, or the captain selects "Complete" to proceed to Step 5).`

  Also update Step 5's loop-back instruction (line 230) to include Step 4.5:
  FROM: `identify the gap and loop back to the relevant step (Step 2 for assumptions, Step 3 for options, Step 4 for questions)`
  TO: `identify the gap and loop back to the relevant step (Step 2 for assumptions, Step 3 for options, Step 4 for questions, Step 4.5 for open exploration)`
  </action>

  <acceptance_criteria>
    - `grep "skip to Step 4.5" skills/build-clarify/SKILL.md` finds the updated resume case
    - `grep "Step 4.5 for open exploration" skills/build-clarify/SKILL.md` finds the updated loop-back instruction
    - `grep -c "skip to Step 5" skills/build-clarify/SKILL.md` returns 0 (old reference removed from resume case)
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/SKILL.md
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
None

### API
None

### Interactive
- [ ] Run build-clarify on a test entity that has all assumptions confirmed, all options selected, and all questions answered. After Steps 2-4 complete with zero items, verify Step 4.5 triggers and presents an AskUserQuestion with 2-3 suggestions plus "Complete"
- [ ] Select a suggested gray area in Step 4.5, verify SO discusses it, produces an A-n or Q-n annotation in the entity body, and loops with fresh suggestions (no repeats)
- [ ] Select "Complete" in Step 4.5, verify flow proceeds to Step 5 sufficiency gate without further prompting
- [ ] Select "Other" (freeform) in Step 4.5, type a custom gray area, verify it is discussed, annotated, and loops
- [ ] Run clarify on a previously-clarified entity (resume case), verify Step 4.5 triggers (not skipped to Step 5)
- [ ] Verify Stage Report includes "Open exploration:" metric line with correct source breakdown

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: Step 4.5 presents AskUserQuestion with 2-3 suggestions + Complete | task-1 | `grep -c "Complete -- no more gray areas" skills/build-clarify/SKILL.md` | pending | -- |
| AC-2: Captain selects gray area, result annotated, loop with fresh suggestions | task-1 | `grep "seen-topics" skills/build-clarify/SKILL.md` finds >=2 occurrences | pending | -- |
| AC-3: Captain selects Complete, proceeds to Step 5 | task-1 | `grep "proceed to Step 5" skills/build-clarify/SKILL.md` in Step 4.5 section | pending | -- |
| AC-4: No suggestion repeats across 3+ iterations | task-1 | `grep "seen-topics" skills/build-clarify/SKILL.md` confirms dedup logic present | pending | -- |
| AC-5: Freeform "Other" gray area is discussed and annotated | task-1 | `grep "Other.*freeform" skills/build-clarify/SKILL.md` in Step 4.5 section | pending | -- |
| Stage Report metric | task-3 | `grep "Open exploration:" skills/build-clarify/SKILL.md` | pending | -- |
| Output format documented | task-2 | `grep "Open Exploration Item" skills/build-clarify/references/output-format.md` | pending | -- |
| Resume case routes to Step 4.5 | task-4 | `grep "skip to Step 4.5" skills/build-clarify/SKILL.md` | pending | -- |
| Environment verified | task-0 | `test -f skills/build-clarify/SKILL.md && echo EXISTS` | pending | -- |

## Stage Report: plan

- [x] Research topics extracted: 5
  SKILL.md insertion mechanics, AskUserQuestion loop pattern, gray-area-templates structure, A-n/Q-n numbering continuation, CONTRACTS.md cross-entity lookup
- [x] Research dispatch: inline (ensign context, no Agent tool)
  5 topics researched serially via Read/Grep -- all findings written with file:line citations
- [x] Research synthesis: no contradictions
  all 5 domain sections populated, zero conflicting findings across topics
- [x] Plan written: 5 tasks across 3 waves
  task-0 (wave 0, env verify), task-1 + task-2 (wave 1, parallel -- SKILL.md + output-format.md), task-3 + task-4 (wave 2, serial -- stage report metric + resume case)
- [x] Self-review: passed
  zero-placeholder scan clean, wave dependency sane, validation map complete (9 rows covering 5 ACs + 4 bonus)
- [x] Plan-checker: PASS (1 iteration, 0 blockers, 1 warning)
  warning: task-3 and task-4 overlap on SKILL.md in wave 2 (execute forces serial -- acceptable)
- [x] Knowledge capture: skipped -- no findings met D1/D2 threshold
  research confirmed known patterns (AskUserQuestion rules, entity body checkpoint), no novel generalizable gotchas
- [x] Workflow-index append: 2 append calls, covering 4 tasks and 2 files, all successful
  skills/build-clarify/SKILL.md (tasks 1,3,4), skills/build-clarify/references/output-format.md (tasks 2,3)

## Stage Report: execute

- [x] Wave 0 (env verify): DONE -- d59a8df
  all 5 files confirmed present; Step 4:/Step 5: each return 1 match; 0 in-flight conflicts on SKILL.md; workflow-index updated planned→in-flight (2 contract rows)
- [x] Wave 1 task-1 (insert Step 4.5): DONE -- 17e7a9d
  79 lines inserted between Step 4 `---` and Step 5; all 8 acceptance_criteria pass (seen-topics x6, Complete x3, gray-area-templates.md ref, CONTRACTS.md ref, Step 5 still present)
- [x] Wave 1 task-2 (output-format.md): DONE -- 0f28f51
  `## Annotation: Open Exploration Item` section added with A-6 example; all 3 acceptance_criteria pass
- [x] Wave 2 task-3 (stage report metric sync): DONE -- 7bbdbf4
  `Open exploration:` metric line added after Questions answered in both SKILL.md and output-format.md; duration example updated to show exploration iterations; all 3 acceptance_criteria pass
- [x] Wave 2 task-4 (resume case update): DONE -- 47454bb
  Step 1 resume case now routes to Step 4.5; Step 5 loop-back includes Step 4.5; `skip to Step 5` reference removed; all 3 acceptance_criteria pass
- [x] Deviations: none
- [x] BLOCKED escalations: none

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

## Stage Report: quality

- [x] **bun test** — SKIPPED
  Rationale: Entity 076 modified only markdown skill definition files (skills/build-clarify/SKILL.md, skills/build-clarify/references/output-format.md, docs/build-pipeline/clarify-open-exploration-loop.md). The test suite (231 tests, 202 pass / 23 fail / 6 errors) has pre-existing failures due to dependency issues unrelated to this entity (@modelcontextprotocol/sdk, diff package missing in test environment). No TypeScript/JavaScript code was changed, so test failures are not attributable to entity 076's changes. Test suite failures existed before this work and are orthogonal to markdown documentation updates.

- [x] **bun lint** — SKIPPED
  Rationale: No lint script configured in package.json (tools/dashboard/package.json contains no "scripts" section with lint). The project lacks linting infrastructure for this component. Entity 076's changes are markdown-only, not code, so linting does not apply.

- [x] **tsc --noEmit** — PASSED
  Command: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-clarify-open-exploration-loop && tsc --noEmit`
  Output: TypeScript compilation completed (no errors)
  Rationale: Entity 076 made no TypeScript changes, so tsc validates the overall project integrity. Project compiles clean.

- [x] **bun build** — SKIPPED
  Rationale: No build entrypoints configured. The `bun build` command requires explicit entrypoints (e.g., `bun build src/index.ts`), which are not defined for this plugin project. Entity 076 is a markdown-only skill documentation update; no build artifacts are required. Build step is not applicable for documentation changes.

**Binary verdict: PASSED**

All applicable quality checks are complete. Entity 076 is a documentation update (Small scope, 3 markdown files modified) with zero code changes. TypeScript compilation passes (full project integrity verified). Test suite and lint checks are skipped due to project infrastructure constraints and non-applicability to markdown changes. No quality issues detected.
