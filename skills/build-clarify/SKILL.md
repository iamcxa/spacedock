---
name: build-clarify
description: "Interactive clarify stage for build pipeline entities. Heavy AskUserQuestion loop with captain. Resolves Open Questions, confirms Assumptions, selects Options, accumulates Canonical References. Gates on context sufficiency before handoff to First Officer. Use when user says 'clarify entity X', '/science X', 'run clarify', or when an entity is in awaiting-clarify state."
user-invocable: true
argument-hint: "[entity-slug]"
---

# Build-Clarify -- Interactive Context Resolution

You are running the clarify stage of the build pipeline. An entity has completed explore and
now has populated Assumptions, Option Comparisons, and Open Questions (or a Decomposition
Recommendation). Your job is to walk the captain through resolution, one gray area at a
time, until the entity's context is complete and ready for planning.

Captain's answers during clarify are *decisions under uncertainty*, not fiat. Build-clarify's
job is not just to record captain's picks -- it is to ensure the picks are informed. If a
captain answer contradicts evidence collected during explore, if it picks an option without
engaging with its trade-offs, or if it commits to scope that contradicts the shape artifacts,
SO MUST pressure-test by re-presenting the evidence before accepting the decision. Silent
captures of captain answers that ignore surfaced evidence are a skill failure.

**Eight steps, in strict order. Steps 2-4 interact with the captain; Steps 0, 1, 1.5, 5, 6 are
internal. Steps 3, 4, and 4.5 each run an Answer Pressure-Test sub-loop (see "Answer
Pressure-Test Discipline" below) before writing a captain decision to the entity body, and
Step 4.7 runs a cumulative Scope Drift Check before Step 5's sufficiency gate.**

This skill is loaded by:
1. The `science-officer` agent (primary path) when captain says "/science {slug}" or invokes the persona
2. Direct `/build-clarify {slug}` invocation (secondary path)
3. Auto-invoke when Claude detects an entity in `awaiting-clarify` state during conversation

---

## Tools Available

**Must use:**
- `AskUserQuestion` -- DEFERRED tool. Load via `ToolSearch` at the start of Step 0 before any question:
  ```
  ToolSearch(query: "select:AskUserQuestion", max_results: 1)
  ```
- `Read` -- entity file, reference docs (`references/*.md`), files the captain cites during Q&A
- `Grep` -- quick searches when verifying captain's references
- `Write` / `Edit` -- update the entity body in place (append annotations, add Canonical References, update frontmatter)
- `Bash` -- git commit at Step 6

**Reference docs (read each before its corresponding step):**
- `references/ask-user-question-rules.md` -- read before Step 2 and re-consult before every AskUserQuestion call
- `references/decomposition-gate.md` -- read at the start of Step 0 if a Decomposition Recommendation exists
- `references/output-format.md` -- read before Step 2 and re-consult for every annotation

---

## Long-Form Content UX Rule (applies to every AskUserQuestion call)

AskUserQuestion's preview panel is ~40-60 chars wide and truncates long prose. When a
candidate option carries long-form content (description > 150 chars, multi-sentence rationale,
pros/cons paragraphs, or full spec text), SO MUST:

1. Present the full candidate text in the main conversation thread FIRST, as plain markdown
   (numbered list or headed blocks), so the captain can read it in full.
2. THEN call AskUserQuestion with only short labels (≤80 chars) plus 1-sentence descriptions.
   Never stuff multi-sentence prose into the `description` / preview field.

This rule applies uniformly to Step 3 option selection, Step 4 open-question resolution, and
the Step 4.5 open exploration loop. It also applies to pressure-test re-asks (see Answer
Pressure-Test Discipline) -- the contradiction evidence block is presented in the thread, and
the AskUserQuestion re-ask uses short labels only.

---

## Answer Pressure-Test Discipline (applies to Steps 3, 4, 4.5)

Captain's directive is initial hypothesis; captain's in-session answer is a decision under
uncertainty. Before writing ANY captain decision (option pick, open-question answer, gray-area
resolution) to the entity body, SO MUST run the following four-check pressure-test:

1. **Evidence contradiction check** -- Does captain's choice contradict any evidence
   collected by build-explore (file:line citations in `## Lens Evidence`, Assumption Evidence
   lines, cross-entity CONTRACTS entries, or facts surfaced by Step 1f self-verification)?
2. **Trade-off engagement check** -- For option selections with a Pros/Cons table, did
   captain's rationale reference the trade-offs, or did they pick on shortest-label heuristics
   alone? (Silent pick on a row labeled "(recommended)" without commentary counts as
   un-engaged when the chosen row has material cons in the table.)
3. **Scope boundary check** -- Does captain's answer expand the entity's scope beyond the
   `## Scope: In` list written by `/shape`? (Skip if `shape_status` is absent / draft.)
4. **Consistency check** -- Does captain's answer contradict a prior decision in this same
   entity (earlier Confirmed assumption, earlier Selected option, earlier Answer)?

If ALL checks pass, write the decision to the entity body as normal.

If ANY check fails, do NOT write the decision yet. Loop back with a second AskUserQuestion
that **explicitly surfaces the contradiction** before accepting the answer. The pressure-test
re-ask MUST:

- Present the contradicting evidence verbatim in the conversation thread (file:line citations,
  upstream entity IDs, Scope: In bullets, or the prior decision's annotation) BEFORE the
  AskUserQuestion call.
- Re-ask with short labels following the Long-Form Content UX Rule above. Typical options:
  `Confirm anyway`, `Revise choice`, `Expand scope (update shape)`.
- Require captain to supply a rationale if they select `Confirm anyway`.

Example (option selection pressure-test):

```
Q1 (original): "O-3: How to update status? direct Edit vs status --set?"
A1 captain: "direct Edit"
[SO detects: contradicts upstream entity #97 FO Write Scope guardrail; explore A-5
 evidence shows ensign parses status --set diff output.]

Thread presentation:
> Your pick conflicts with:
> - Entity #97 guardrail: FO must write status transitions via `status --set`
>   (docs/build-pipeline/097-fo-write-scope.md:42)
> - Explore A-5 evidence: `skills/ensign/handlers.ts:118` parses `status --set` stderr
>   diff to detect transitions

Q2 pressure-test: "Your direct-Edit pick conflicts with upstream #97 and explore A-5.
                   How do you want to resolve?"
Options:
  - "Revise to status --set"    (align with upstream + explore)
  - "Confirm direct Edit anyway" (requires rationale; may need to update shape)
  - "Defer -- needs more research"
```

Only after the pressure-test resolves do you write the final annotation to the entity body.
Record the pressure-test outcome in the Stage Report (see Step 6).

**No-exceptions**: Silent capture of an answer that fails any of the four checks is a skill
failure. This is the clarify analog of build-shape's Step 5.5 gap-to-goal pressure test: SO's
job is to ensure captain picks are informed, not to transcribe them.

---

## Args Extraction

The `{entity-slug}` argument identifies the entity file. Resolve it to a full path:

```bash
find {workflow_dir} -name "{entity-slug}.md" -not -path "*/\_archive/*" | head -1
```

If no match, try by ID number (e.g., `046` → `046-*.md`). If still no match, report to
captain and stop:

> No entity found matching `{slug}`. Available entities in awaiting-clarify state:
> {list from grep for `context_status: awaiting-clarify`}

---

## Pre-Step: Status Handoff Check

This skill expects the entity to have `status: clarify` when it starts. Normally the ensign wrapper sets this before invocation. If you are running in SO-direct mode (Science Officer's context_status routing, no ensign wrapper), the entity may arrive with `status: draft`. Before Step 0:

1. Read the entity frontmatter field `status`.
2. If `status` is `clarify` -- proceed to Step 0 normally.
3. If `status` is `draft` -- update frontmatter to `status: clarify` as your first action (Write/Edit on the entity frontmatter). The transition from draft to clarify is a skill-owned action in SO-direct mode.
4. If `status` is anything else (e.g., `plan`, `execute`, or absent/empty) -- STOP. Report to captain: "Entity `{slug}` is in `status: {value}`. Expected `draft` or `clarify` to enter the clarify stage. If this entity already completed clarify, nothing to do -- hand off to First Officer. If the frontmatter is missing or malformed, repair the entity file manually before retrying."

The `status` field and the `context_status` field serve different purposes: `status` tracks pipeline stage (draft / clarify / plan / execute / ...), `context_status` tracks clarify-phase progress (pending / awaiting-clarify / ready). Both must be correct for this skill to run safely. Note: this skill does not write `context_status` except at Step 5 (where it sets `context_status: ready` per existing behavior). The `awaiting-clarify` transition is owned by the Science Officer agent in SO-direct mode, NOT by this skill.

---

## Step 0: Decomposition Gate

Read `references/decomposition-gate.md` first. Then:

1. Read the entity body.
2. Check for a `## Decomposition Recommendation` section.
3. If absent → skip to Step 1.
4. If present → follow the gate flow in `references/decomposition-gate.md`:
   - Present the split with AskUserQuestion (3 options: Accept / Modify / Reject)
   - On Accept: create child entities via `/build`, update frontmatter to `status: epic`,
     commit `decompose: {slug} -> [...]`, EXIT skill
   - On Modify: loop until captain accepts or rejects
   - On Reject: remove the section, proceed to Step 1

The reference doc has the full branching logic -- do not improvise.

---

## Step 1: Load Entity State

Read the entity body. Count:
- **Unresolved Open Questions**: `## Open Questions` entries without a `→ Answer:` annotation
- **Unconfirmed Assumptions**: `## Assumptions` entries without a `→ Confirmed:` or `→ Corrected by` annotation
- **Unselected Option Comparisons**: `### {name}` subsections without a `→ Selected:` annotation below the table

Record these counts internally for the Stage Report at Step 6.

**Resume case:** if all three counts are zero → skip to Step 4.5 (the entity's
pre-identified items were previously resolved; the open exploration loop may still surface
new gray areas, or the captain selects "Complete" to proceed to Step 5).

**Empty case:** if the entity has no `## Assumptions`, `## Option Comparisons`, OR `## Open
Questions` sections at all → report to captain:

> Entity `{slug}` has no explore output. Did build-explore run? Check `## Stage Report: explore`.

Then stop. Do not invent sections.

---

## Step 1.5: Explore Re-Validation

**Skip condition:** If Step 1 detected the empty case (no explore output), skip Step 1.5 entirely -- there are no assumptions to re-validate. If Step 1 detected the resume case (all counts zero), also skip Step 1.5 -- all items were already resolved in a prior session. Rationale: the resume case means the captain already reviewed and confirmed all items in a prior clarify session; re-validating evidence that the captain explicitly accepted would undermine session continuity. If evidence truly drifted between sessions, the captain will catch it during Steps 2-4 interactive review.

After Step 1 loads the entity state and counts unresolved items, Step 1.5 runs five automated sub-checks to verify explore's output is still valid. Step 1.5 is internal -- it does NOT use AskUserQuestion. Its findings are written to the entity body so Step 2 presents pre-validated assumptions.

**1a -- Evidence Freshness.** For each assumption in `## Assumptions` that has an `Evidence: {file}:{line}` citation, Read the cited file region using the `Read` tool. Compare the current content against the assumption's claim using LLM judgment (same pattern as build-explore Step 3.7). Three outcomes:
- **Hold**: evidence still supports the claim. No annotation (silence = valid).
- **Stale**: file changed but claim is still plausible (e.g., line numbers shifted, semantics preserved). Append `(⚠ stale-evidence: {detail})` inline after the Evidence line.
- **Contradicted**: file now demonstrates the opposite of the claim. Add a new `Q-{next_n}` entry to `## Open Questions` with Domain, Why it matters, and Suggested options. Append `(⚠ contradicted: {detail} -- see Q-{next_n})` inline after the Evidence line.

Evidence lines without parseable `{file}:{line}` citations (e.g., "captain domain knowledge") are skipped.

**1b -- Internal Consistency.** Read all A-n entries in `## Assumptions`. For each pair of assumptions, evaluate whether they semantically contradict each other using LLM judgment. If A-i and A-j contradict, add a new `Q-{next_n}` entry to `## Open Questions`: "Assumptions A-{i} and A-{j} appear to contradict each other: A-{i} says {claim_i}, A-{j} implies {claim_j}. Which is correct?" New contradiction Q-n entries are prepended to Step 4's processing queue (contradictions have high priority).

**1c -- Option Validity.** Read each `### {name}` subsection in `## Option Comparisons`. For each table, compare option rows for semantic duplication using LLM judgment. If two options are rephrased versions of the same approach, merge them: keep the first occurrence's row, append `(merged from O-{n}: {original label})` to the surviving row's Option cell, and delete the duplicate row. Write a `(⚠ dedup: merged {label_a} and {label_b} -- see dedup note)` annotation below the table.

**1d -- Coverage Check.** Read `skills/build-explore/references/gray-area-templates.md`. For each domain matching the entity's `## Captain Context Snapshot` Domain field, scan the template table rows. Cross-reference each template gray area against the entity's existing `## Assumptions` and `## Open Questions` (same seen-topics semantic overlap check as Step 4.5 source 1). For each uncovered gray area:
- If codebase precedent exists (Read/Grep to check): add as a new `A-{next_n}` entry in `## Assumptions` with Confidence and Evidence.
- If genuinely open: add as a new `Q-{next_n}` entry in `## Open Questions`.

Apply gray-area-templates.md skip rules: already decided, clear precedent (2+ consistent usages), or solved by a related entity.

**1e -- Research Re-Validation.** Scan `## Assumptions` for entries with `(✓ research: {source} -- {finding})` annotations (entity 075 format). For each research-annotated assumption, re-read the cited evidence source using Read. Compare the current content against the research finding using LLM judgment. Outcomes:
- **Holds**: research finding still valid. No annotation.
- **Stale**: source changed but finding is plausible. Append `(⚠ stale-research: {detail})` after the research annotation.
- **Contradicted**: source now refutes the research finding. Add a new `Q-{next_n}` to `## Open Questions` and append `(⚠ research-contradicted: {detail} -- see Q-{next_n})` after the research annotation.

**1f -- Assumption Self-Verification (MANDATORY before Step 2).** This sub-check is the foundation of the "captain answers only what captain must answer" discipline. It is NOT optional and applies even when 1a Evidence Freshness reports "Hold" -- 1a checks whether the file still says what was claimed; 1f checks whether the *interpretation* of secondhand evidence holds up under direct inspection.

For each Track A assumption (and each APPROACH/ALTERNATIVE/GUARDRAIL claim that asserts a codebase fact), perform direct evidence inspection BEFORE batch presentation:

1. **Identify all factual claims**: every assumption that asserts "X file does Y" or "library/API Z behaves W" is a factual claim. Skip pure design preferences (e.g., "we should choose option A").
2. **Read the cited evidence directly**: use `Read` / `Grep` on the cited `file:line` ranges. Do NOT rely solely on brainstorm/explore Lens summaries -- those are secondhand and can fabricate precedents (proven by entity 120 A-4: brainstorm Lens (d) referenced `/api/entities` precedent that does not exist).
3. **Reconcile and reclassify**:
   - **Holds**: evidence directly supports the claim → tag assumption `[self-verified]` in the Step 2 batch presentation
   - **Refines**: evidence supports a slightly modified claim → rewrite the assumption text, upgrade confidence, tag `[self-verified, refined]`
   - **Refutes**: evidence contradicts the claim → fix the assumption inline (do NOT just escalate to captain), tag `[self-verified, corrected]` with a 1-line reason
   - **Cannot verify**: evidence file missing or claim is genuinely captain-judgment-only → tag `[needs-captain-judgment]` with explicit reason (e.g., "design preference", "external constraint not in codebase")

4. **Captain presentation rule**: in Step 2's batch confirmation, ONLY present assumptions tagged `[needs-captain-judgment]` as questions. Assumptions tagged `[self-verified]` / `[self-verified, refined]` / `[self-verified, corrected]` are listed for transparency (so captain can audit) but the captain's affirmative answer is NOT required -- they are auto-confirmed unless captain explicitly objects.

**Why this is mandatory**: presenting unverified assumptions to the captain shifts verification burden onto the captain. The captain's KPI is per-question information gain, not question count (MEMORY.md: SO Self-Investigation First). If the SO can verify a claim by reading a file, the SO must verify it -- escalating verification of grep-able facts to the captain is a discipline violation.

**Empirical baseline** (entity 120 self-test, 2026-04-16): SO presented 5 assumptions to captain. Captain asked "self-verified?" and SO discovered 1 of 5 (A-4) had a fabricated precedent that direct grep would have caught. Pre-1f: 0% self-verification rate. Post-1f target: ≥80% of factual claims marked `[self-verified]`.

**Stage Report addition**: record self-verification ratio:
```
- 1f Self-verification: {N} self-verified ({M} refined, {P} corrected), {Q} needs-captain-judgment
verification_ratio: {N / (N + Q)}
```

**After all sub-checks complete**, write all annotations and new entries to the entity body before proceeding to Step 2. Record a summary for the Stage Report (Step 6): count of assumptions checked, stale annotations added, contradictions found (new Q-n entries), options deduped, coverage gaps filled, research findings re-validated, **and 1f self-verification counts**.

---

## Step 2: Assumption Batch Confirmation

Read `references/ask-user-question-rules.md` (specifically the "When NOT to Use" section --
Step 2 uses plain text, not AskUserQuestion).

Read `references/output-format.md` for the exact annotation format.

### Shape-Aware Filter (Section-Cite Predicate)

When the entity frontmatter contains `shape_status: validated`, apply this filter **before** presenting assumptions to the captain:

- Inspect each assumption's `- Evidence:` line.
- If the Evidence line literally cites any of the following section headers (case-sensitive match):
  - `## Problem Statement`
  - `## User Stories`
  - `## Scope: In`
  - `## Scope: Out`
- Then **skip** that assumption -- it is product-level locked by the shape stage.
- Detection command: `grep -E "^- Evidence:.*## (Problem Statement|User Stories|Scope: (In|Out))"`
- Mark skipped assumptions `status: shape-locked` in the Assumption Batch summary.
- Do NOT include shape-locked assumptions in the AskUserQuestion batch or the plain-text confirmation block.
- Rationale: these sections are immutable-pitch locks from `/shape` align stage. Re-challenging them during clarify violates P-4 immutable-pitch discipline -- the captain who wants to revise a shape-locked section must open a new entity with `supersedes: {old-slug}` (see entity 103 directive).

If `shape_status` is absent, `n/a`, or `draft`, skip this filter entirely and present all assumptions normally.

### Code-Evidence Self-Filter (Pre-Presentation)

After the Shape-Aware Filter and before presenting Open Questions to the captain, run a self-filter pass on each Open Question in `## Open Questions`:

**For each Open Question**:

1. Extract the question's domain and the specific claim or gap it addresses.
2. Search the entity's `## Lens Evidence` section for [primary]-tier citations that directly address the question's domain.
3. Check three evidence sources:
   - (a) `file:line` citation in `## Lens Evidence` with `[primary]` tier that directly answers the question
   - (b) Parent entity `-> Answer:` annotation that resolves the question
   - (c) Existing `-> Selected:` option annotation that renders the question moot
4. **If any source pins the answer**: write `-> Self-resolved: {evidence source} -- {brief explanation}` inline on the question. Remove the question from the captain presentation queue.
5. **If no source pins the answer**: keep the question in the captain queue for AskUserQuestion presentation.

**Conservative threshold (GUARDRAIL)**: Only [primary]-tier evidence auto-resolves. [secondary] and [tertiary] tiers indicate weaker confidence and MUST still reach captain. When in doubt, escalate -- false negatives (captain sees a question that could have been self-resolved) are acceptable; false positives (captain misses a genuinely ambiguous question) are not.

**Detection command for verification**: `grep -c "Self-resolved" entity.md` returns the count of self-resolved questions.

**Stage Report annotation**: After the self-filter pass completes, add to `## Stage Report: clarify`:
```
- Self-filter: {N} self-resolved, {M} captain-escalated
clarify_self_filter_ratio: {N / (N + M)}
```
Where N = questions self-resolved, M = questions presented to captain.

Present assumptions in TWO sections — pre-verified (auto-confirm unless captain objects) and needs-captain-judgment (genuine captain decisions):

    Self-verification complete. {N} of {total} assumptions self-verified by direct evidence inspection (1f).

    **Pre-verified (auto-confirm unless you object):**

    ✅ A-1 [self-verified]: {statement}
       Evidence: {file:line -- description} (direct read confirmed claim)

    ✅ A-2 [self-verified, refined]: {statement (rewritten)}
       Evidence: {file:line -- description}; refined from "{original claim}" because {reason}

    ✅ A-4 [self-verified, corrected]: {statement (corrected)}
       Evidence: {file:line -- description}; brainstorm Lens (d) referenced {wrong precedent} which does not exist; actual canonical pattern is {file:line}

    **Needs your judgment:**

    ⚠️  A-3 [needs-captain-judgment]: {statement}
       Reason: {design preference | external constraint not in codebase | conflicting precedents}
       Evidence available: {what SO found, but cannot decide alone}

    Reply with:
    - "all correct" to confirm everything as-is (pre-verified ones auto-confirm; you only need to address the needs-captain-judgment items)
    - Per-item corrections for any pre-verified item where SO got the verification wrong
    - Decisions on each needs-captain-judgment item

When ALL assumptions are `[self-verified]` (no captain-judgment items remain), present a one-line summary instead of a batch:

    All {N} assumptions self-verified -- proceeding to options. Audit log in entity body.

This collapses the captain interaction to zero rounds when the SO has done its job.

**Parse the captain's response:**
- If "all correct" (or similar confirmation) → mark every assumption `→ Confirmed: captain, {ISO-date} (batch)`
- If corrections given → parse per-assumption:
  - Confirmed ones get `→ Confirmed: captain, {ISO-date} (batch)`
  - Corrected ones get `→ Corrected by captain, {ISO-date} (batch): "{verbatim captain correction}"` (single-line format -- see `references/output-format.md`)

Write all annotations to the entity body in place. Preserve the original A-n numbering,
Confidence, and Evidence lines -- append annotations only.

---

## Step 3: Option Selection (one at a time)

Read `references/ask-user-question-rules.md` before each AskUserQuestion call.

For EACH unselected option comparison in `## Option Comparisons`, in order:

1. Build the AskUserQuestion payload:
   - `header`: ≤12 char label derived from the `### {name}` heading (e.g., "### Filter chip rendering" → "Chip render")
   - `question`: `"O-{n}: {heading question-form}"` (e.g., "O-1: Which highlight rendering approach?")
   - `options`: 2-4 entries from the table rows. If the table marked one row `✅ Recommended`, prefix its label with `(recommended) `. Copy the description from the Pros/Cons columns (keep it ≤1 sentence).

2. Before the call, present the full text of each candidate option (Pros/Cons cells, linked
   spec blurbs, multi-sentence rationale) in the main conversation thread per the Long-Form
   Content UX Rule. AskUserQuestion then uses short labels only.

3. Call `AskUserQuestion(...)` with the payload.

4. **Run the Answer Pressure-Test** (see "Answer Pressure-Test Discipline" above) on the
   captain's pick. If any of the four checks fails, do NOT proceed to step 5 yet -- present
   contradiction evidence in the thread and re-ask with short-label options. Loop until
   pressure-test passes or captain selects `Confirm anyway` with supplied rationale.

5. Record the result:
   - If captain picked a canned option → `→ Selected: {option label} (captain, {ISO-date}, interactive)`
   - If captain picked "Other" → switch to plain text prompt ("What's your preferred approach?"), record `→ Selected: Other -- {verbatim response} (captain, {ISO-date}, interactive)`
   - If pressure-test fired and captain confirmed anyway → append ` [pressure-tested: {1-line contradiction summary}; captain rationale: "{verbatim}"]` to the annotation.

6. Append the annotation to the entity body directly below the option table.

**Do NOT batch AskUserQuestion calls.** One question per message. The captain must answer
each one before the next is presented.

---

## Step 4: Open Question Resolution (one at a time)

For EACH unresolved question in `## Open Questions`, in order (α-marker questions first since
they have lowest Q-numbers):

1. Read the question's `Suggested options:` line.

2. **If the suggested options are concrete and 2-4 in count**:
   - Build AskUserQuestion payload similar to Step 3
   - `header`: ≤12 char label derived from the question's Domain
   - `question`: `"Q-{n}: {question text}"`
   - `options`: the Suggested options, mapped to label + description
   - Call `AskUserQuestion(...)`

3. **If the suggested options are "Open-ended -- captain decides" or fewer than 2**:
   - Use a plain text prompt:
     ```
     Q-{n}: {question}
     Domain: {domain}
     Why it matters: {impact}

     Type your answer, or say "skip" to defer this question.
     ```

4. Before calling AskUserQuestion (or emitting the plain text prompt), if any option /
   suggested-answer carries multi-sentence content, present the full text in the main thread
   per the Long-Form Content UX Rule; AskUserQuestion then uses short labels only.

5. **Run the Answer Pressure-Test** (see "Answer Pressure-Test Discipline" above) on the
   captain's answer. If any of the four checks fails, surface the contradiction evidence in
   the thread and re-ask with short-label options (`Revise answer` / `Confirm anyway` /
   `Defer`). A `Confirm anyway` response requires captain rationale.

6. Record the result:
   - Canned option pick → `→ Answer: {option label} (captain, {ISO-date}, interactive)`
   - Freeform answer → `→ Answer: {verbatim response} (captain, {ISO-date}, interactive)`
   - "skip" → `→ Answer: DEFERRED by captain, {ISO-date}` (this still counts as resolved for the Step 5 gate -- captain explicitly deferred)
   - Pressure-tested confirm → append ` [pressure-tested: {1-line contradiction summary}; captain rationale: "{verbatim}"]` to the annotation.

7. **Canonical References accumulator:** if the captain's answer mentions a file path, spec
   name, ADR reference, or similar (e.g., "check adr-001", "see detail.css", "the pattern
   in server.ts:142"):
   - Immediately resolve the reference to a full relative path
   - Read the file (or the cited lines) using Read
   - Append the path to a `## Canonical References` section in the entity body -- create
     the section if it does not exist, placing it AFTER `## Open Questions` and BEFORE
     `## Stage Report: explore`
   - Format: see `references/output-format.md` (Canonical References section) -- single source of truth for the entry format
   - Use the learned context to inform subsequent questions (e.g., if the captain cites an
     ADR, a later question about the same area can reference it: "ADR-001 says X -- does
     that apply here too?")

The accumulator ALSO runs during Step 3 option selection -- if the captain's option choice
or freeform response cites a file path or ADR, apply the same resolve-read-append flow.

8. Append the Answer annotation to the entity body directly below the Suggested options.

---

## Step 4.5: Open Exploration Loop

After all pre-identified items from Steps 2-4 are resolved, Step 4.5 opens an exploration
loop where SO proactively suggests gray areas the captain's domain knowledge may surface
beyond what explore found.

**Seen-topics computation:** Build the seen-topics set by scanning the entity body for all
`A-{n}:`, `O-{n}:` (subsection headings in Option Comparisons), and `Q-{n}:` entries.
Extract the topic label from each. This set prevents re-suggesting already-discussed topics.
Also track template row identity (not just A-n label) to avoid re-suggesting the same gray
area pattern under a different annotation number.

**Suggestion generation from three sources:**

- **Source 1 (templates):** Read `skills/build-explore/references/gray-area-templates.md`.
  For each domain matching the entity's `## Captain Context Snapshot` Domain field, scan
  the template table rows. Skip rows where the gray area is already covered by an item in
  seen-topics (match by semantic overlap, not exact string). Collect uncovered template rows
  as candidate suggestions.

- **Source 2 (cross-entity):** Read `docs/build-pipeline/_index/CONTRACTS.md`. Find sibling
  entities with the same `files_modified` paths as this entity's brainstorming spec mentions,
  with status `in-flight` or `planned`. For each sibling, check if it implies a cross-entity
  concern not yet in seen-topics (e.g., "entity X is also modifying file Y -- does this
  entity need to coordinate?"). Collect as candidate suggestions.

- **Source 3 (directive-implied):** Re-read the entity's `## Directive` and
  `## Brainstorming Spec`. Identify technology or design choices implied by the directive
  but not surfaced by explore (e.g., "the directive mentions 'WebSocket' but no assumption
  or question addresses WebSocket connection management"). Collect as candidate suggestions.

**Suggestion selection:** From all candidates, pick 2-3 most likely to surface actionable
gray areas. Prioritize: cross-entity concerns (source 2) > uncovered templates (source 1) >
implied technology (source 3), since cross-entity concerns are hardest for captains to spot
independently.

**AskUserQuestion presentation:** Build the AskUserQuestion payload:
- `header`: "Gray areas" (10 chars)
- `question`: "Are there gray areas not yet covered? Here are suggestions from domain analysis:"
- `options`: 2-3 suggestion options, each with a `label` (the gray area name) and
  `description` (1-sentence explanation of why it matters). Plus one terminal option:
  `label: "Complete -- no more gray areas"`, `description: "All gray areas are covered.
  Proceed to sufficiency gate."` -- this is always the last option.
- If a suggestion has strong evidence, prefix its label with `(recommended)`.
- Call `AskUserQuestion(...)`.

**Response handling:**

- If captain selects "Complete -- no more gray areas": exit Step 4.5, proceed to Step 5.
- If captain selects a suggested gray area: discuss the gray area with the captain in plain
  text. Based on the discussion, produce a new annotation in the entity body:
  - If it resolves as an assumption: append `A-{next_n}: {statement}` + `Confidence:` +
    `Evidence:` + `→ Confirmed: captain, {ISO-date} (interactive)` to `## Assumptions`.
    Compute `next_n` as max existing A-n + 1.
  - If it resolves as an open question with answer: append `Q-{next_n}: {question}` +
    `Domain:` + `Why it matters:` + `Suggested options:` + `→ Answer: {response} (captain,
    {ISO-date}, interactive)` to `## Open Questions`.
  - If it requires an option comparison: append a new `### {name}` subsection with table +
    `→ Selected: {choice} (captain, {ISO-date}, interactive)` to `## Option Comparisons`.
  - Run the Canonical References accumulator if the captain cites any file paths.
- If captain selects "Other" (harness-added freeform): treat the freeform text as a
  captain-originated gray area. Discuss, annotate, and loop exactly as for a suggested
  gray area.
- After annotation, add the discussed topic to seen-topics and loop back to suggestion
  generation (above) with the updated seen-topics set for fresh suggestions.

**Rules specific to Step 4.5:**
- Maximum 2-3 suggestions per iteration. Never present more than 3 suggestions plus
  "Complete".
- "Complete -- no more gray areas" is always present in every iteration as the last option.
- No suggestion may repeat a topic from seen-topics. If all three sources produce zero new
  candidates, present only the "Complete" option with a note: "All domain templates are
  covered and no cross-entity concerns detected. Select Complete to proceed."
- Step 4.5 inherits all Rules from the skill-level Rules section (double dash, entity body
  checkpoint, AskUserQuestion rules, Canonical References accumulator, preserve explore
  output).
- **Long-Form Content UX Rule applies.** Multi-sentence suggestion rationale is presented in
  thread; AskUserQuestion carries short labels only.
- **Answer Pressure-Test applies.** Before committing a captain-resolved gray area to the
  entity body (as new A-n / Q-n / O-n), run the four-check pressure-test. If captain's
  resolution contradicts Lens Evidence, existing decisions, or Scope: In, surface the
  contradiction and re-ask before writing the annotation.

---

## Step 4.7: Cumulative Scope Drift Check

After Step 4.5 reaches the "Complete -- no more gray areas" terminal state and before Step 5's
sufficiency gate, SO MUST run one final check on the cumulative set of clarify decisions
(Confirmed assumptions, Selected options, Answered questions, Step 4.5 new items).

**Skip condition**: If the entity frontmatter lacks `shape_status: validated` (no `/shape` was
run), skip Step 4.7 -- there is no Scope: In to drift against.

**Detection procedure**:

1. Read the entity's `## Scope: In` section (shape-locked).
2. For each clarify decision written in this session, judge (LLM) whether it implies
   deliverables or behavioral guarantees NOT present in `## Scope: In`.
3. Collect a list of drift items, each formatted:
   `{A-n | O-n | Q-n}: {decision summary} -> implies {new deliverable}, not in Scope: In`.

If the drift list is empty, proceed to Step 5 with no captain interaction.

If the drift list is non-empty, SO MUST NOT auto-accept the expansion. Present via
AskUserQuestion:

- Thread block (Long-Form Content UX Rule) listing every drift item with its implied
  out-of-scope deliverable and a pointer to the Scope: In bullets it exceeds.
- AskUserQuestion: "This clarify session expanded scope beyond shape's Scope: In. How do you
  want to resolve?"
- Options (short labels, ≤1 sentence descriptions):
  - `Update shape` -- open a superseding shape entity with the expanded scope.
  - `Trim decisions` -- revise the drifting clarify decisions back within Scope: In.
  - `Accept as minor` -- document the delta and proceed; requires captain to acknowledge the
    delta in freeform text.

**Response handling**:

- `Update shape` -- STOP clarify. Emit: `scope drift detected -- open a new entity with
  supersedes: {slug} and re-run /shape before resuming clarify on this entity.` EXIT the skill
  without committing the session (Step 6 does not run). The captain is responsible for the
  supersedes flow.
- `Trim decisions` -- loop back to the relevant Step (3 / 4 / 4.5) and have captain revise the
  drifting decisions. After revision, re-run Step 4.7. Do NOT advance to Step 5 until drift
  list is empty or accepted.
- `Accept as minor` -- write a `## Scope Delta` section to the entity body (after
  `## Canonical References`, before `## Stage Report: explore`) containing:
  - The drift list verbatim
  - Captain's acknowledgement text
  - A note: `Accepted as minor scope delta; shape not updated.`
  Then proceed to Step 5.

**No-exceptions**: Silent acceptance of cumulative scope drift -- where each decision looked
reasonable in isolation but together they expanded scope -- is the clarify analog of entity
123's v1 over-scope failure mode. The cumulative check is a single mechanical gate that
catches drift individual pressure-tests cannot.

---

## Step 5: Context Sufficiency Gate

Re-scan the entity body and verify:

- [ ] Every `## Open Questions` entry has a `→ Answer:` annotation
- [ ] Every `## Assumptions` entry has a `→ Confirmed:` or `→ Corrected by` annotation
- [ ] Every `### {name}` subsection in `## Option Comparisons` has a `→ Selected:` annotation
- [ ] `## Acceptance Criteria` exists with ≥2 criteria and no `α` markers remain
- [ ] `## Canonical References` section exists (may be empty if captain cited no external docs -- that is OK)
- [ ] Step 4.7 Scope Drift Check ran (shape-locked entities only): either drift list was empty, or a `## Scope Delta` block was written with captain acknowledgement, or captain selected `Update shape` and this skill already EXITed (in which case this gate is not reached)

**If any check fails** → identify the gap and loop back to the relevant step (Step 2 for
assumptions, Step 3 for options, Step 4 for questions, Step 4.5 for open exploration). Do
NOT advance to Step 6 with gaps.

**Exception -- Acceptance Criteria defect**: if the `## Acceptance Criteria` check fails
(fewer than 2 criteria, or α markers remain), this is an upstream defect -- build-clarify
does NOT own this section. Notify the captain:

> Entity `{slug}` has an Acceptance Criteria defect: {fewer than 2 criteria | α markers
> remain}. This section is owned by build-brainstorm and build-explore. Re-run explore
> (FO explore {slug}) or manually repair the section before resuming clarify.

Then STOP. Do not commit. Do not loop back within this skill.

**If all checks pass**:

1. Update the entity frontmatter:

   ```yaml
   context_status: ready
   ```

2. Present the summary to the captain (plain text, no AskUserQuestion):

       Context complete for {entity title}.
         - {n} assumptions confirmed ({n corrected})
         - {n} options selected
         - {n} questions answered ({n deferred})
         - {n} canonical refs added
       Ready to hand off to First Officer.

3. **Hybrid handoff check**: read the entity frontmatter `auto_advance` field.
   - If `auto_advance: true` (tight mode) -- proceed to Step 6 AND update `status: plan` in Step 6.
   - If `auto_advance` is absent or `false` (loose mode, default) -- proceed to Step 6 AND commit the Stage Report + session changes, BUT do NOT update `status: plan`. The `status` field stays at `clarify` until the captain explicitly says "execute {slug}" (at which point First Officer owns the status transition in a separate flow).

   After Step 6 commits in loose mode, present:

         Say "execute {slug}" when you're ready, or "hold {slug}" to park.

   Then end the session. "End the session" here means "stop advancing the pipeline" -- Step 6 (write Stage Report + git commit) has already run. Do NOT interpret "stop" as "skip Step 6" -- that would leave the session's work uncommitted and is the Phase C smoke test bug this fix addresses.

---

## Step 6: Commit

**Step 6 ALWAYS runs after Step 5 passes the sufficiency gate, regardless of handoff mode.** The distinction between loose and tight mode affects ONLY whether `status: plan` gets written to frontmatter. Writing the Stage Report and committing the session's entity body changes is not optional -- that's how the work is persisted to git.

Read `references/output-format.md` (Stage Report section) to format the Stage Report
correctly.

1. Write `## Stage Report: clarify` to the entity body as the LAST `## Stage Report:` section
   (after `## Stage Report: explore`):

   ```markdown
   ## Stage Report: clarify

   - [x] Decomposition: {accepted|modified|rejected|not-applicable}
     e.g., "not-applicable -- entity is Small scope, no children proposed"
   - [x] Re-validation: {n} assumptions checked, {n} stale, {n} contradicted, {n} options deduped, {n} coverage gaps, {n} research re-validated
     e.g., "5 assumptions checked, 1 stale (A-2 line shifted), 0 contradicted, 0 deduped, 1 coverage gap (A-6 added), 0 research re-validated"
   - [x] Assumptions confirmed: {n} / {total} ({n corrected})
     e.g., "A-1, A-2, A-4 confirmed via batch; A-3 corrected captain cited src/foo.ts"
   - [x] Options selected: {n} / {total}
     e.g., "O-1 Filter UI placement -- Second chip row per workflow card (recommended)"
   - [x] Questions answered: {n} / {total}
     e.g., "Q-1 persisted via client-side filterState; Q-2 always-visible spec interpretation"
   - [x] Open exploration: {n} gray areas surfaced ({n} from templates, {n} from CONTRACTS, {n} from directive, {n} via freeform)
     e.g., "3 gray areas surfaced (1 from templates, 1 from CONTRACTS, 0 from directive, 1 via freeform)"
   - [x] Canonical refs added: {n}
     e.g., "entity 009 app.js:244-246; ADR-001 single-server architecture"
   - [x] Pressure-tests fired: {n} across Steps 3/4/4.5 ({n} revised, {n} confirm-anyway with rationale)
     e.g., "2 pressure-tests fired; 1 revised (O-2 realigned to upstream #97), 1 confirm-anyway (Q-3 rationale: captain accepts cost)"
   - [x] Scope drift check: {skipped (no shape_status) | clean | delta accepted | trimmed | superseded}
     e.g., "clean -- no cumulative drift against Scope: In"
   - [x] Context status: ready
     e.g., "gate passed: all assumptions confirmed, all options selected, all Qs answered"
   - [x] Handoff mode: {loose|tight}
     e.g., "loose means captain must say 'execute {slug}'; tight means auto_advance: true in frontmatter"
   - [x] Clarify duration: {n} questions asked, session complete
     e.g., "7 AskUserQuestion calls (1 batch + 1 option + 2 Qs + 3 exploration iterations)"
   ```

2. If the hybrid handoff mode is tight (`auto_advance: true`), update frontmatter:

   ```yaml
   status: plan   # was: clarify
   ```

3. Single commit containing ALL entity body changes from this session:

   ```bash
   git add {entity-file}
   git commit -m "clarify: {slug} -- context ready"
   ```

   If the handoff is tight, the commit message is the same -- FO picks up the `status: plan`
   transition from frontmatter.

4. Report to captain that the commit is done:

       Committed clarify results for {slug}. Entity is ready for planning.

---

## Rules

- **NEVER batch AskUserQuestion calls.** One question per message, sequential.
- **Read reference docs before the corresponding step.** They contain rules this SKILL.md
  deliberately does not duplicate (ONE source of truth -- see Phase B lessons).
- **Preserve build-explore's output.** Only append annotations. Never delete, reorder, or
  rewrite the Assumptions, Option Comparisons, or Open Questions that build-explore wrote.
- **Use `--` (double dash) consistently**, never `—` em dash. Matches build-brainstorm and
  build-explore conventions and keeps annotations grep-compatible.
- **Use `⚠️` emoji** in outputs, never `:warning:` shortcode.
- **Entity body IS the checkpoint.** Do not write external state files. If the session is
  interrupted, resume protocol re-reads the entity body and picks up from the first
  unanswered item.
- **Hybrid handoff is captain-controlled.** Loose coupling (default) means captain must
  explicitly say "execute {slug}" after the Step 5 summary. Tight coupling requires
  `auto_advance: true` in frontmatter before clarify starts.
- **Canonical References accumulates.** Never deduplicate or reorder during the session --
  append in the order captain cited them.
- **Decomposition gate EXITS the skill** on accept. Do not continue to Step 1. The epic is
  frozen and child entities take over.
- **Self-verify before asking (Step 1f Iron Law).** Every factual claim in Assumptions / APPROACH / GUARDRAILS that cites `file:line` evidence MUST be directly read by SO before Step 2 batch presentation. Captain's KPI is information gain per question, not question count -- escalating grep-able facts to captain is a discipline violation.
- **Pressure-test every captain decision (Steps 3 / 4 / 4.5 Iron Law).** Run the four-check pressure-test (Evidence contradiction / Trade-off engagement / Scope boundary / Consistency) before writing any captain answer to the entity body. Silent capture of answers that ignore surfaced evidence is a skill failure.
- **Long-Form Content UX Rule.** Multi-sentence option content belongs in the main conversation thread; AskUserQuestion carries only short labels (≤80 chars) + 1-sentence descriptions. Never stuff prose into preview fields.
- **Never auto-accept cumulative scope drift (Step 4.7 Iron Law).** On shape-locked entities, the cumulative clarify decisions MUST be drift-checked against `## Scope: In` before Step 5. Captain chooses Update shape / Trim / Accept-as-minor. Silent acceptance is the entity-123-v1 over-scope failure mode.

## Rationalization Table -- Self-Verification Shortcuts (1f)

| Excuse | Reality |
|--------|---------|
| "Brainstorm Lens already verified this" | Lens summaries are secondhand and can fabricate precedents (entity 120 A-4 case: Lens (d) cited /api/entities precedent that does not exist). Direct read is mandatory. |
| "Same-session evidence is fresh" | Freshness ≠ correctness. The original capture may have misread the file. Re-read. |
| "Captain will catch errors in batch" | That makes captain do SO's job. Captain's confirmation should ratify SO's verified work, not perform first-pass verification. |
| "It's faster to just ask captain" | False economy. Two captain rounds (verify + decide) cost more than one direct file read + one decision round. |
| "Confidence is already 0.95" | Confidence is SO's self-rating. Self-rating without independent check is circular. |
| "The claim seems obvious" | Obvious claims still get misread or fabricated by upstream lenses. Verify anyway. |

## Red Flags -- STOP and run 1f

- About to present "Are these correct?" without 1f self-verification log
- Citing brainstorm/explore Lens summaries as primary evidence in Step 2 batch
- Skipping 1f because "Step 1.5 1a already ran" (1a checks freshness, 1f checks interpretation -- different gates)
- Marking an assumption `[needs-captain-judgment]` without first reading the cited file
- Captain asks "did you verify?" -- this means 1f was skipped; STOP and run it now

## Stage Report: clarify (Format Addition)

When a `## Stage Report: clarify` is written, include the self-filter reporting fields:

```
- Self-filter: {N} self-resolved, {M} captain-escalated
clarify_self_filter_ratio: {0.0-1.0}
```
