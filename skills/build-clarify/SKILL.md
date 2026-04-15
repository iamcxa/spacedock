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

**Eight steps, in strict order. Steps 2-4 interact with the captain; Steps 0, 1, 1.5, 5, 6 are
internal.**

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

**After all sub-checks complete**, write all annotations and new entries to the entity body before proceeding to Step 2. Record a summary for the Stage Report (Step 6): count of assumptions checked, stale annotations added, contradictions found (new Q-n entries), options deduped, coverage gaps filled, research findings re-validated.

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

Present ALL unconfirmed assumptions in a single formatted block:

    Based on build-explore's codebase analysis, here are the assumptions:

    ✅ A-1: [Confident] {statement}
       Evidence: {file:line -- description}

    ✅ A-2: [Likely] {statement}
       Evidence: {file:line -- description}

    ⚠️  A-3: [Unclear] {statement}
       Evidence: {file:line -- description}

    Are these correct? Reply with:
    - "all correct" to confirm everything as-is
    - Freeform corrections for any that are wrong (e.g., "A-3 is wrong because...")

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

2. Call `AskUserQuestion(...)` with the payload.

3. Record the result:
   - If captain picked a canned option → `→ Selected: {option label} (captain, {ISO-date}, interactive)`
   - If captain picked "Other" → switch to plain text prompt ("What's your preferred approach?"), record `→ Selected: Other -- {verbatim response} (captain, {ISO-date}, interactive)`

4. Append the annotation to the entity body directly below the option table.

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

4. Record the result:
   - Canned option pick → `→ Answer: {option label} (captain, {ISO-date}, interactive)`
   - Freeform answer → `→ Answer: {verbatim response} (captain, {ISO-date}, interactive)`
   - "skip" → `→ Answer: DEFERRED by captain, {ISO-date}` (this still counts as resolved for the Step 5 gate -- captain explicitly deferred)

5. **Canonical References accumulator:** if the captain's answer mentions a file path, spec
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

6. Append the Answer annotation to the entity body directly below the Suggested options.

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

---

## Step 5: Context Sufficiency Gate

Re-scan the entity body and verify:

- [ ] Every `## Open Questions` entry has a `→ Answer:` annotation
- [ ] Every `## Assumptions` entry has a `→ Confirmed:` or `→ Corrected by` annotation
- [ ] Every `### {name}` subsection in `## Option Comparisons` has a `→ Selected:` annotation
- [ ] `## Acceptance Criteria` exists with ≥2 criteria and no `α` markers remain
- [ ] `## Canonical References` section exists (may be empty if captain cited no external docs -- that is OK)

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
