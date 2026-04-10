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

**Seven steps, in strict order. Steps 2-4 interact with the captain; Steps 0, 1, 5, 6 are
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
- **Unconfirmed Assumptions**: `## Assumptions` entries without a `→ Confirmed:` or `→ Corrected:` annotation
- **Unselected Option Comparisons**: `### {name}` subsections without a `→ Selected:` annotation below the table

Record these counts internally for the Stage Report at Step 6.

**Resume case:** if all three counts are zero → skip to Step 5 (the entity was previously
clarified; this is a re-entry to finalize the handoff).

**Empty case:** if the entity has no `## Assumptions`, `## Option Comparisons`, OR `## Open
Questions` sections at all → report to captain:

> Entity `{slug}` has no explore output. Did build-explore run? Check `## Stage Report: explore`.

Then stop. Do not invent sections.

---

## Step 2: Assumption Batch Confirmation

Read `references/ask-user-question-rules.md` (specifically the "When NOT to Use" section --
Step 2 uses plain text, not AskUserQuestion).

Read `references/output-format.md` for the exact annotation format.

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
  - Corrected ones get `→ Corrected: captain said "{verbatim}"` plus `→ Corrected: captain, {ISO-date} (batch)`

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
   - Format: `` `- `{relative-path}` -- {why captain cited it} (Q-{n})` ``
   - Use the learned context to inform subsequent questions (e.g., if the captain cites an
     ADR, a later question about the same area can reference it: "ADR-001 says X -- does
     that apply here too?")

6. Append the Answer annotation to the entity body directly below the Suggested options.

---

## Step 5: Context Sufficiency Gate

Re-scan the entity body and verify:

- [ ] Every `## Open Questions` entry has a `→ Answer:` annotation
- [ ] Every `## Assumptions` entry has a `→ Confirmed:` or `→ Corrected:` annotation
- [ ] Every `### {name}` subsection in `## Option Comparisons` has a `→ Selected:` annotation
- [ ] `## Acceptance Criteria` exists with ≥2 criteria and no `α` markers remain
- [ ] `## Canonical References` section exists (may be empty if captain cited no external docs -- that is OK)

**If any check fails** → identify the gap and loop back to the relevant step (Step 2 for
assumptions, Step 3 for options, Step 4 for questions). Do NOT advance to Step 6 with gaps.

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
   - If `auto_advance: true` → proceed to Step 6 immediately
   - Otherwise → present:

         Say "execute {slug}" when you're ready, or "hold {slug}" to park.

     Then stop. The status transition happens in a separate invocation (FO or another
     `/science {slug}` call) when the captain says "execute".

---

## Step 6: Commit

Read `references/output-format.md` (Stage Report section) to format the Stage Report
correctly.

1. Write `## Stage Report: clarify` to the entity body as the LAST `## Stage Report:` section
   (after `## Stage Report: explore`):

   ```markdown
   ## Stage Report: clarify

   - Decomposition: {accepted|modified|rejected|not-applicable}
   - Assumptions confirmed: {n} / {total} ({n corrected})
   - Options selected: {n} / {total}
   - Questions answered: {n} / {total}
   - Canonical refs added: {n}
   - Context status: ready
   - Handoff mode: {loose|tight}
   - Clarify duration: {n} questions asked, session complete
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
