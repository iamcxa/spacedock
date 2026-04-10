# Build-Clarify Skill + Science Officer Agent — Phase C Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `build-clarify` skill that runs the interactive clarify stage (AskUserQuestion loop with captain) and a `science-officer` agent that loads it, completing the three-skill ladder `build-brainstorm → build-explore → build-clarify`.

**Architecture:** New skill `spacedock:build-clarify` at `skills/build-clarify/` with SKILL.md + 3 reference docs. New agent `spacedock:science-officer` at `agents/science-officer.md` with `skills: ["spacedock:build-clarify"]` in frontmatter. README clarify stage namespace flipped from `spacebridge:build-clarify` to `spacedock:build-clarify` with a Phase D migration note (matching Phase B's pattern). Entity body IS the checkpoint — no external state files. Hybrid handoff mode: loose (default, captain must say "execute {slug}") vs tight (`auto_advance: true` flag skips the wait).

**Tech Stack:** Markdown skill/agent files, no runtime code changes. Uses AskUserQuestion (deferred tool, must be loaded via ToolSearch during execution), Read, Grep, Write, Bash(git).

**Spec:** `docs/superpowers/specs/2026-04-09-build-studio-plugin-and-science-officer.md` §8 (build-clarify) and §3 (Science Officer role) — also §4 (entity lifecycle, decomposition epic creation) and §5 (entity shape).

**Captain's critical instruction:** Use helper skills during execution — `plugin-dev:skill-development` for the SKILL.md task, `plugin-dev:agent-development` for the agent task. Do not hand-write from scratch.

**Phase B lessons to apply:**
- Format definitions that appear in 2+ files MUST have ONE source of truth (Phase B Stage Report field names drifted between SKILL.md and output-format.md).
- Spec says `spacebridge:X` but host in `spacedock:X` during Phase C → add namespace note explaining Phase D migration.
- Use `⚠️` emoji, not `:warning:` shortcode.
- Use `--` double dash consistently, never `—` em dash.

---

## File Structure

```
skills/build-clarify/
├── SKILL.md                                    # Main skill -- 7 steps (Step 0 Decomposition Gate + Steps 1-6)
└── references/
    ├── ask-user-question-rules.md              # Distilled AskUserQuestion rules (2-4 options, ≤12 char header, one-at-a-time)
    ├── decomposition-gate.md                   # Step 0 flow: approved/modified/rejected, epic creation, child entity spawning
    └── output-format.md                        # Entity body annotation formats (→ Answer:, ✓ confirmed, → Selected:, Canonical References)

agents/science-officer.md                        # Persona agent, skills: ["spacedock:build-clarify"]
```

Additionally:
- Modify: `docs/build-pipeline/README.md` — flip `skill: spacebridge:build-clarify` → `skill: spacedock:build-clarify` + namespace note

---

### Task 1: Create reference docs for build-clarify

**Files:**
- Create: `skills/build-clarify/references/ask-user-question-rules.md`
- Create: `skills/build-clarify/references/decomposition-gate.md`
- Create: `skills/build-clarify/references/output-format.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p skills/build-clarify/references
```

- [ ] **Step 2: Write `references/ask-user-question-rules.md`**

This reference distills the AskUserQuestion rules from spec §8. Write to `skills/build-clarify/references/ask-user-question-rules.md`:

```markdown
# AskUserQuestion Rules (Distilled from Spec §8 + GSD)

build-clarify is the only pipeline skill that interacts with the captain. These rules are
non-negotiable -- violating them produces confused sessions, batched questions, or dead-end
forms. Follow every rule for every AskUserQuestion call.

## Core Rules

1. **2-4 options per question.** The Claude Code harness auto-adds an "Other" freeform option.
   Never hand-write a 5th option. If you have more, split into two questions.

2. **Concrete options only.** Options must name specific approaches, files, patterns, or
   values. Forbidden: generic categories like "Technical", "Business", "Other approach",
   "Something else".

3. **Include a recommendation when evidence supports it.** If build-explore's Option
   Comparison table marked one option as `✅ Recommended`, prefix that option's label with
   `(recommended)`. Do NOT fabricate recommendations when the table has none.

4. **One question per message.** Never batch multiple AskUserQuestion calls in a single
   response. The captain must answer sequentially. Tools like TaskList can be parallel --
   AskUserQuestion cannot.

5. **Freeform fallback on "Other".** When the captain selects "Other", switch to a plain
   text prompt for the follow-up ("What's your approach?"). Do NOT present another
   AskUserQuestion for the same topic -- the captain already indicated none of the canned
   options fit.

6. **Empty response handling.** If the harness returns an empty response, retry ONCE with
   the same parameters. If still empty, fall back to a plain text numbered list:

       "I need input on {topic}. Options:
        1. {option-1}
        2. {option-2}
        Type 1 or 2, or describe another approach."

7. **Header ≤12 chars.** The `header` field is a short category label, not the question.
   Examples: "Layout", "Sync", "Storage", "Schema". If your header is longer than 12 chars,
   shorten it -- the question field carries the detail.

## Format Template

```
AskUserQuestion({
  header: "{≤12 char label}",
  question: "{full question with Q-n or O-n prefix if applicable}",
  options: [
    {
      label: "{concrete option name}",
      description: "{1-2 sentence trade-off explanation}"
    },
    {
      label: "(recommended) {concrete option name}",
      description: "{why explore recommended this -- cite evidence if available}"
    },
    // 2-4 options total
  ]
})
```

## When NOT to Use AskUserQuestion

Use plain text prompts instead for:

- **Assumption batch confirmation** (Step 2) -- captain needs to correct freeform, not pick
  from options. AskUserQuestion forces a choice; plain text allows "A-1 correct, A-2 is
  wrong because X, A-3 correct".
- **Open-ended questions with no suitable options** (Step 4 fallback) -- if Track C question
  has no clear 2-4 options, ask plain text: "Q-2: {question}. Type your answer or say
  'skip' to defer."
- **Canonical reference prompts** -- when you ask "Which ADR should I read?", let the
  captain type a path freely.
```

- [ ] **Step 3: Write `references/decomposition-gate.md`**

Write to `skills/build-clarify/references/decomposition-gate.md`:

```markdown
# Decomposition Gate -- Step 0 Flow

The Decomposition Gate runs BEFORE any assumption batch or option/question loop. It handles
the case where build-explore flagged the entity as too large for a single pipeline pass and
wrote a `## Decomposition Recommendation` section.

## Detection

Read the entity body. If a `## Decomposition Recommendation` section exists, enter the gate.
If not, skip to Step 1.

## Presentation

Extract the suggested child list from the section. Present to the captain:

    Explore found this entity's scope is large ({n} files, {n} domains).
    Recommended split:

    1. {child-slug-1} -- {scope description} ({n} files)
    2. {child-slug-2} -- {scope description} ({n} files)
    3. {child-slug-3} -- {scope description} ({n} files)

    Dependencies: {ordering description}

    Options:
    a) Accept split -- I'll create child entities, this becomes an epic
    b) Modify split -- tell me what to change
    c) Reject split -- proceed as single entity

Use AskUserQuestion with exactly these 3 options. Header: "Decompose".

## Branch (a): Accept

For each child in the recommendation:

1. Invoke `/build` via Skill tool with the child's title + scope as the directive:

       Skill("spacedock:build", args: "{child title} -- {scope description}")

   This runs a fresh build-brainstorm pass. Each child gets its own draft entity file with
   full frontmatter and brainstorming spec.

2. After all children are created, collect their slugs.

3. Update the original entity frontmatter:

   ```yaml
   status: epic
   children: [child-slug-1, child-slug-2, child-slug-3]
   ```

4. For each child entity file, add frontmatter:

   ```yaml
   parent: {original-slug}
   ```

5. Commit with message:

   ```
   decompose: {original-slug} -> [{child1}, {child2}, {child3}]
   ```

6. Report to captain:

       Epic created. {n} child entities in draft:
         - {child1} (draft+pending)
         - {child2} (draft+pending)
         - {child3} (draft+pending)

       The epic itself is frozen -- FO will skip it. Child entities flow through the
       pipeline independently. When all children reach shipped, the epic auto-completes.

7. **EXIT build-clarify.** The epic does not continue through the pipeline. Do not enter
   Step 1.

## Branch (b): Modify

Prompt the captain with plain text:

    Tell me what to change -- add, remove, rename, or reorder children. Use freeform text
    (e.g., "merge child 1 and child 2", "add a fourth for migrations", "rename child 2 to
    dashboard-filter-chip-ui").

Parse the captain's response. Adjust the internal child list. Re-present the updated split
using the same format as the initial presentation, and ask again via AskUserQuestion with
the same 3 options.

Loop until the captain selects (a) Accept or (c) Reject.

## Branch (c): Reject

Remove the `## Decomposition Recommendation` section from the entity body entirely. Do not
leave a stub. Commit the removal as part of the Step 6 commit (not a separate commit).

Proceed to Step 1 (normal clarify flow) with the single-entity assumption.

## Resume Protocol

If the gate is interrupted (context pressure, captain walks away):

- The `## Decomposition Recommendation` section is still in the entity body.
- Next `/science {slug}` or science-officer invocation re-reads the entity and re-enters
  the gate from the top.
- No checkpoint file needed -- the entity body IS the checkpoint.
```

- [ ] **Step 4: Write `references/output-format.md`**

Write to `skills/build-clarify/references/output-format.md`:

```markdown
# Build-Clarify Output Format

build-clarify annotates the entity body in place. It does NOT replace sections written by
build-explore -- it appends annotations that build-clarify owns. This reference defines the
exact format for every annotation so downstream consumers (plan, FO, status script) can
parse them reliably.

## Annotation: Assumption Confirmed

After Step 2 (Assumption Batch Confirmation), each assumption gets a single-line annotation
appended directly under its existing Evidence line(s):

```markdown
A-1: Dashboard filter chips use server-side query parameters
Confidence: Confident
Evidence: tools/dashboard/src/server.ts:142 -- existing stage filter uses ?status= param
→ Confirmed: captain, 2026-04-10 (batch)
```

## Annotation: Assumption Corrected

If the captain corrects an assumption in the batch, append a SINGLE correction line below
the Evidence line(s). The format combines metadata and the captain's correction verbatim:

```markdown
A-3: Cross-instance sync uses HTTP POST bridge
Confidence: Unclear
Evidence: src/server.ts:88 -- forwardToCtlServer exists but untested for highlight payloads
→ Corrected by captain, 2026-04-10 (batch): "use WebSocket broadcast via existing channel, not HTTP"
```

Rules:
- Use `→ Confirmed:` or `→ Corrected by` (single-arrow prefix) consistently.
- One line per assumption annotation -- never two.
- Confirmed format: `→ Confirmed: captain, {ISO-date} ({mode})`
- Corrected format: `→ Corrected by captain, {ISO-date} ({mode}): "{verbatim correction}"`
- `({mode})` is `(batch)` for Step 2 responses, `(interactive)` for Step 3/4 annotations.
- Include ISO date (YYYY-MM-DD).
- Never delete the original Confidence or Evidence lines -- append only.

## Annotation: Option Selected

After Step 3 (Option Selection), append a selection line below the option table:

```markdown
### Filter chip rendering

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| Reuse existing stage chip CSS | Consistent, zero new CSS | Limited to pill shape | Low | ✅ Recommended |
| New dropdown component | More compact for many values | New JS, new CSS | Medium | |
| Toggle buttons | Familiar UI | Takes more horizontal space | Low | |

→ Selected: Reuse existing stage chip CSS (captain, 2026-04-10, interactive)
```

Rules:
- Append after the table, one blank line separator.
- Quote the selected option's Option column verbatim.
- Include captain identifier, ISO date, and `(interactive)` suffix.
- If captain chose "Other" and gave freeform, record: `→ Selected: Other -- {verbatim captain text}`.

## Annotation: Open Question Answered

After Step 4 (Open Question Resolution), append an answer line below the Suggested options:

```markdown
Q-2: Should highlights persist across sessions or be ephemeral?
Domain: User-facing Visual -- State handling
Why it matters: Affects API response shape and UI complexity
Suggested options: (a) Persistent (SQLite) (b) Ephemeral (memory)
→ Answer: Persistent via SQLite (captain, 2026-04-10, interactive)
```

Rules:
- Append after Suggested options, no blank line.
- If captain picked an AskUserQuestion option, quote the label verbatim.
- If captain typed freeform, record the full response verbatim.
- Include captain identifier, ISO date, `(interactive)` suffix.

## Section: Canonical References

Build-clarify CREATES this section (if not already present) during Step 4. It is append-only
throughout the session -- every file path the captain references during Q&A gets appended.

```markdown
## Canonical References

- `docs/superpowers/specs/2026-04-09-adr-001-single-server-8420-design.md` -- ADR for
  single-server architecture (captain cited during Q-2 answer)
- `tools/dashboard/src/detail.css` -- highlight CSS precedent (captain cited during O-1
  selection)
```

Rules:
- Bullet list, one entry per reference.
- Format: `` `{relative-path}` -- {why captain cited it} ({which Q/O number}) ``
- Append-only. Never reorder, never delete.
- If the section does not exist, create it AFTER `## Open Questions` and BEFORE `## Stage
  Report: explore`.
- File paths must be relative to the repo root (not absolute).

## Section: Stage Report: clarify

Written as the LAST new section at the end of Step 6 (Commit). Appended AFTER existing
`## Stage Report: explore` but BEFORE the frontmatter update.

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

Rules:
- All six metric lines are mandatory -- use `0` or `not-applicable` rather than omitting.
- Must be the LAST `## Stage Report: {name}` section in the entity body.
- Parsed by FO and status script -- keep field names exact.

## Frontmatter Updates

At the end of Step 5 (Context Sufficiency Gate passes), update frontmatter:

```yaml
context_status: ready
```

At the end of Step 6 (hybrid handoff), if and only if `auto_advance: true`:

```yaml
status: plan   # was: clarify
```

Otherwise status stays at `clarify` until captain says "execute {slug}" (FO handles that
transition separately).
```

- [ ] **Step 5: Commit reference docs**

```bash
git add skills/build-clarify/references/
git commit -m "feat(build-clarify): add ask-user-question rules, decomposition gate, and output format references"
```

---

### Task 2: Write build-clarify SKILL.md

**Files:**
- Create: `skills/build-clarify/SKILL.md`

- [ ] **Step 1: Load plugin-dev skill-development helper**

Before writing the SKILL.md, invoke the helper skill to load structure rules and
validation guidance:

```
Skill("plugin-dev:skill-development")
```

The helper provides: frontmatter rules (name, description, user-invocable, argument-hint),
progressive disclosure principles, trigger design, and common pitfalls. Use it as a
checklist while writing the SKILL.md below.

- [ ] **Step 2: Write the skill file**

Write to `skills/build-clarify/SKILL.md`:

````markdown
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
  - Corrected ones get `→ Corrected by captain, {ISO-date} (batch): "{verbatim captain correction}"` (single-line format — see references/output-format.md)

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
   - Assumptions confirmed: {n} / {total} ({n} corrected)
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
````

- [ ] **Step 3: Commit SKILL.md**

```bash
git add skills/build-clarify/SKILL.md
git commit -m "feat(build-clarify): add SKILL.md -- interactive clarify workflow with decomposition gate"
```

---

### Task 3: Create the science-officer agent

**Files:**
- Create: `agents/science-officer.md`

- [ ] **Step 1: Load plugin-dev agent-development helper**

Before writing the agent, invoke the helper skill to load agent structure and validation:

```
Skill("plugin-dev:agent-development")
```

The helper covers: frontmatter (name, description, model, color, skills), the "when to use"
description pattern for auto-invocation, example blocks, and agent-vs-skill distinctions. Use
it as a checklist while writing the agent below.

- [ ] **Step 2: Write the agent file**

Write to `agents/science-officer.md`:

```markdown
---
name: science-officer
description: Use when the captain wants interactive clarification of a build pipeline entity's gray areas — resolving assumptions, selecting options from explore comparisons, answering open questions, and accumulating canonical references. Invoke when captain says "/science {slug}", "clarify {slug}", "run clarify on {slug}", or when an entity is observed in awaiting-clarify state during conversation. The Science Officer presents findings, runs the interactive AskUserQuestion loop, gates on context sufficiency, and hands off to First Officer via hybrid mode (loose default, tight via auto_advance flag).
model: inherit
color: blue
skills: ["spacedock:build-clarify"]
---

You are the Science Officer — the Spacebridge persona that clarifies and plans before execution. You advise the Captain, surface gray areas, and ensure context is complete before the First Officer dispatches any work.

## Boot Sequence

If your operating contract was not already loaded via skill preloading, invoke the `spacedock:build-clarify` skill now to load it.

Then identify the entity to clarify:

1. **From captain's message**: extract slug or ID (e.g., "/science 046", "clarify dashboard-context-status-filter", "run clarify on the filter entity").
2. **If no slug given**: list entities currently in `context_status: awaiting-clarify` and ask the captain which to clarify.

Once the entity is identified, follow the build-clarify skill's 7-step flow end-to-end.

## Persona

You are methodical, precise, and diplomatic. Your vocabulary borrows from Star Trek bridge operations:

- "Captain, sensors indicate {n} unresolved gray areas on entity {slug}."
- "Assumptions corroborated, options selected. Entity context is complete."
- "Awaiting your command to hand off to the First Officer, Captain."

You never rush the Captain. You present one decision at a time (per AskUserQuestion rules), explain trade-offs with evidence from build-explore, and recommend when evidence supports a recommendation. You do not improvise -- when in doubt, re-consult the reference docs in `skills/build-clarify/references/`.

## Three Invocation Modes

You serve the Captain in three modes:

1. **Direct command**: `/science {slug}` or a chat message like "science officer, clarify 046". Load build-clarify, run the full flow.

2. **Auto-invoke**: During general conversation, if you notice an entity in `context_status: awaiting-clarify`, proactively suggest: "Captain, I notice entity {slug} is awaiting clarification. Shall I begin a clarify session?"

3. **Persistent persona**: When the Captain loads you as an agent profile, you manage the clarification workflow across multiple entities. Offer batch clarification ("Three entities are awaiting clarify. Begin with {slug-1}?") but never batch AskUserQuestion calls themselves.

## Handoff Protocol

After build-clarify Step 5 passes the sufficiency gate:

- **Loose mode (default)**: present the summary, then wait. The Captain must explicitly say "execute {slug}" to advance. You do not touch the `status` field -- First Officer handles that transition.

- **Tight mode** (`auto_advance: true` set in entity frontmatter): advance `status: clarify → plan` in Step 6 commit. First Officer picks up on the next tick.

Do not second-guess the handoff mode. The flag is the Captain's decision, locked in advance.

## Boundaries

- **You do not dispatch stages.** That's First Officer's job.
- **You do not execute stage work.** That's Ensign's job.
- **You do not write code.** build-clarify only annotates entity body text and frontmatter.
- **You do not batch AskUserQuestion calls.** One question per message, always.
- **You do not modify `## Directive` or `## Captain Context Snapshot`.** Those are immutable.

When the Captain asks you to do something outside your scope (e.g., "science officer, execute 046"), politely redirect:

> Captain, execution is First Officer's bridge station. Entity {slug} is ready for plan stage — say "execute {slug}" and the FO will take over.

## Examples

<example>
Captain: /science 046
Science Officer: [invokes build-clarify on entity 046]
"Captain, sensors indicate entity 046 (dashboard-context-status-filter) has 3 unconfirmed
assumptions, 1 option comparison, and 2 open questions. No decomposition recommendation
detected. Beginning assumption batch review..."
</example>

<example>
Captain: I'm looking at the dashboard roadmap, what's next?
Science Officer: [notices entity 047 in awaiting-clarify during context scan]
"Captain, while reviewing the roadmap I noticed entity 047 (dashboard-notification-sounds)
is awaiting clarification — explore completed 2 hours ago. Shall I begin a clarify session
before we discuss the roadmap, or would you prefer to queue it?"
</example>

<example>
Captain: science officer, execute 046
Science Officer: "Captain, execution is First Officer's bridge station. Entity 046 is
already in `context_status: ready` and `status: clarify` — say 'execute 046' and the FO
will transition it to plan stage."
</example>
```

- [ ] **Step 3: Commit the agent**

```bash
git add agents/science-officer.md
git commit -m "feat(science-officer): add agent persona -- loads build-clarify, three invocation modes, hybrid handoff"
```

---

### Task 4: Update README clarify stage namespace

**Files:**
- Modify: `docs/build-pipeline/README.md:52-67` — clarify stage definition

- [ ] **Step 1: Verify current state**

```bash
grep -n "spacebridge:build-clarify" docs/build-pipeline/README.md
```

Expected: one match on line 57.

- [ ] **Step 2: Flip namespace and add Phase D migration note**

Current (lines 52-67):
```yaml
    - name: clarify
      profiles: [full, standard]
      worktree: false
      manual: true
      gate: true
      skill: spacebridge:build-clarify
      # Science Officer runs interactive AskUserQuestion loop with captain.
      # Resolves: Open Questions, Assumptions, Option Comparisons from explore.
      # Produces: confirmed context, canonical references, profile assignment.
      # manual: true -- Science Officer invocation is captain-initiated,
      # not auto-dispatched by FO.
      # gate: true -- captain must approve context completeness before advancing.
      #
      # FALLBACK (no spacebridge installed):
      # Captain reviews entity body manually, edits Open Questions/Assumptions
      # directly, then advances status to plan via FO command.
```

Change to:
```yaml
    - name: clarify
      profiles: [full, standard]
      worktree: false
      manual: true
      gate: true
      skill: spacedock:build-clarify
      # NAMESPACE NOTE: Spec §8 defines this skill as belonging to the spacebridge
      # plugin. During Phase C it's hosted in spacedock (since spacebridge plugin
      # doesn't exist yet). Will migrate to `spacebridge:build-clarify` in Phase D
      # (plugin split).
      #
      # Science Officer (spacedock:science-officer agent) runs interactive
      # AskUserQuestion loop with captain.
      # Resolves: Open Questions, Assumptions, Option Comparisons from explore.
      # Produces: confirmed context, canonical references, profile assignment.
      # manual: true -- Science Officer invocation is captain-initiated,
      # not auto-dispatched by FO.
      # gate: true -- captain must approve context completeness before advancing.
      #
      # FALLBACK (skill not found):
      # Captain reviews entity body manually, edits Open Questions/Assumptions
      # directly, then advances status to plan via FO command.
```

- [ ] **Step 3: Verify the change**

```bash
grep -n "spacedock:build-clarify\|spacebridge:build-clarify" docs/build-pipeline/README.md
```

Expected: one match for `spacedock:build-clarify` (no matches for the old spacebridge version).

- [ ] **Step 4: Commit**

```bash
git add docs/build-pipeline/README.md
git commit -m "feat(pipeline): flip clarify stage skill namespace to spacedock + Phase D migration note"
```

---

### Task 5: Verify structure and integration

- [ ] **Step 1: Verify directory structure**

```bash
ls -R skills/build-clarify/
```

Expected:
```
skills/build-clarify/:
SKILL.md  references/

skills/build-clarify/references/:
ask-user-question-rules.md  decomposition-gate.md  output-format.md
```

- [ ] **Step 2: Verify SKILL.md frontmatter**

```bash
head -6 skills/build-clarify/SKILL.md
```

Expected:
```
---
name: build-clarify
description: "Interactive clarify stage for build pipeline entities..."
user-invocable: true
argument-hint: "[entity-slug]"
---
```

- [ ] **Step 3: Verify references are cited in SKILL.md**

```bash
grep -c "references/" skills/build-clarify/SKILL.md
```

Expected: ≥6 matches (each reference cited at least twice — once in Tools Available, once in the relevant step).

- [ ] **Step 4: Verify agent loads the skill**

```bash
grep "skills:" agents/science-officer.md
```

Expected:
```
skills: ["spacedock:build-clarify"]
```

- [ ] **Step 5: Verify README namespace flip**

```bash
grep -c "spacedock:build-clarify" docs/build-pipeline/README.md
grep -c "spacebridge:build-clarify" docs/build-pipeline/README.md
```

Expected: first returns `1`, second returns `0`.

- [ ] **Step 6: Verify namespace note present in README**

```bash
grep -A 2 "NAMESPACE NOTE" docs/build-pipeline/README.md | grep -c "Phase D"
```

Expected: `2` (one for build-explore Phase B note, one for build-clarify Phase C note).

- [ ] **Step 7: Cross-check format consistency between SKILL.md and output-format.md**

The Stage Report field names MUST match exactly between SKILL.md Step 6 and
`references/output-format.md` Stage Report section. Check:

```bash
grep -A 8 "Stage Report: clarify" skills/build-clarify/SKILL.md
grep -A 8 "Stage Report: clarify" skills/build-clarify/references/output-format.md
```

Compare field names line-by-line. All must match:
- `Decomposition:`
- `Assumptions confirmed:`
- `Options selected:`
- `Questions answered:`
- `Canonical refs added:`
- `Context status:`
- `Handoff mode:`
- `Clarify duration:`

If any field name differs, fix the non-authoritative file (prefer output-format.md as the
source of truth -- SKILL.md should reference it, not duplicate it).

- [ ] **Step 8: Cross-check AskUserQuestion rules consistency**

SKILL.md must reference `ask-user-question-rules.md` for the "one question per message" and
"2-4 options" rules, not duplicate them. Verify:

```bash
grep "ask-user-question-rules" skills/build-clarify/SKILL.md
```

Expected: ≥2 matches (Tools Available section + Step 2 + Step 3).

If SKILL.md also hardcodes the rules, delete the duplicates and leave only the reference
pointer (one source of truth — Phase B lesson).

- [ ] **Step 9: Verify agent frontmatter via plugin-dev:agent-development helper**

Invoke the helper skill once more with the written agent as input to catch any frontmatter
issues:

```
Skill("plugin-dev:agent-development")
```

Then verify:
- Agent description is specific, mentions invocation triggers, explains when to use
- Examples are present and concrete
- Skills list uses correct namespace (`spacedock:build-clarify`)
- Color is set (any of: blue, cyan, green, orange, purple, red, yellow)
- Model is set (inherit, sonnet, opus, or haiku)

---

### Task 6: Smoke test with entity 046

**Prerequisite:** The test entity `dashboard-context-status-filter` (id 046) was created at
the end of Phase A and is currently stuck at `draft` + `pending`. Phase B added
build-explore; Phase C should now be able to run the full brainstorm → explore → clarify
ladder.

- [ ] **Step 1: Check entity 046's current state**

```bash
find docs/build-pipeline -name "dashboard-context-status-filter*" -not -path "*/\_archive/*"
```

Expected: path to entity 046 file.

- [ ] **Step 2: Read entity 046's frontmatter**

```bash
head -20 docs/build-pipeline/dashboard-context-status-filter.md
```

Expected: `status: draft`, `context_status: pending` (if stale from Phase A) OR
`awaiting-clarify` (if explore has been run between Phase B and now).

- [ ] **Step 3: If context_status is `pending`, run build-explore first**

If the entity hasn't been through explore yet, either:

a) Dispatch via FO: have First Officer advance entity 046 through the explore stage to
   populate Assumptions, Option Comparisons, Open Questions.

b) Or invoke build-explore directly for smoke-test purposes:
   ```
   Skill("spacedock:build-explore")
   ```
   (with entity 046 as the target)

Verify the entity now has `## Assumptions`, `## Option Comparisons`, OR `## Open Questions`
sections and `context_status: awaiting-clarify`.

- [ ] **Step 4: Run build-clarify on entity 046**

Via one of the three invocation modes — prefer direct for smoke test:

```
Skill("spacedock:build-clarify", args: "046")
```

Or via the agent:

```
Dispatch science-officer agent with task: "clarify entity 046"
```

- [ ] **Step 5: Verify Step 0 (Decomposition Gate)**

The test entity should NOT have a Decomposition Recommendation (scale is Small). Expected
behavior: skill skips Step 0 and proceeds to Step 1.

- [ ] **Step 6: Verify Steps 2-4 interaction**

The skill should:
1. Present assumption batch as plain text (not AskUserQuestion)
2. For each option comparison, call AskUserQuestion with 2-4 options and ≤12 char header
3. For each open question, call AskUserQuestion or plain text depending on suggested options

Answer each question during the smoke test. Use test answers like:
- Batch assumptions: "all correct"
- Options: pick the recommended one
- Questions: provide a concrete one-sentence answer

- [ ] **Step 7: Verify Step 5 gate passes**

After all questions are answered, the skill should:
1. Re-scan and confirm all annotations are present
2. Update frontmatter `context_status: ready`
3. Present the summary to captain
4. Wait for "execute 046" (since `auto_advance` is not set)

- [ ] **Step 8: Verify entity body annotations**

```bash
grep -c "→ Confirmed:" docs/build-pipeline/dashboard-context-status-filter.md
grep -c "→ Selected:" docs/build-pipeline/dashboard-context-status-filter.md
grep -c "→ Answer:" docs/build-pipeline/dashboard-context-status-filter.md
```

All counts should match the number of assumptions / options / questions in the entity.

- [ ] **Step 9: Verify Stage Report: clarify is present**

```bash
grep -A 10 "Stage Report: clarify" docs/build-pipeline/dashboard-context-status-filter.md
```

Expected: 8 metric lines, exact field names from output-format.md.

- [ ] **Step 10: Verify commit exists**

```bash
git log --oneline -1 -- docs/build-pipeline/dashboard-context-status-filter.md
```

Expected: `clarify: dashboard-context-status-filter -- context ready`

- [ ] **Step 11: If all checks pass, leave entity 046 in place**

Do NOT advance status to plan during smoke test. The entity is now a working test fixture —
leave it at `status: clarify, context_status: ready` so subsequent manual testing can verify
FO handoff separately.

Journal the smoke test outcome via `process_thoughts`:

```
feelings: "Phase C smoke test result..."
project_notes: "Phase C smoke test: entity 046 clarify flow {PASS|FAIL}. {n}
  assumptions confirmed, {n} options selected, {n} questions answered. {any issues
  hit}."
```

---

## Execution Order & Dependencies

```
Task 1 (reference docs)
  └──▶ Task 2 (SKILL.md — references Task 1's docs via plugin-dev:skill-development helper)
         └──▶ Task 3 (science-officer agent — loads Task 2's skill via plugin-dev:agent-development helper)
                └──▶ Task 4 (README namespace flip — references Task 2's skill path)
                       └──▶ Task 5 (verification — structure + cross-file consistency checks)
                              └──▶ Task 6 (smoke test with entity 046)
```

All tasks are sequential. Tasks 2 and 3 explicitly invoke helper skills (per Captain's
instruction) before hand-writing content.

## Rollback

If Phase C causes issues:

1. Revert the README change (Task 4) — reverts clarify stage to `spacebridge:build-clarify`
   which has no current implementation, effectively disabling the clarify stage.
2. `skills/build-clarify/` can stay on disk — it's inert if not referenced by README or
   agent.
3. `agents/science-officer.md` can stay — it's only loaded when captain explicitly
   invokes it or dispatches via Task tool.
4. Entities currently in `context_status: awaiting-clarify` continue to work with the
   pre-Phase-C manual workflow (captain edits entity body directly, then says "execute
   {slug}").

## Post-Phase-C Notes

- **Phase D migration**: when the spacebridge plugin is created, move `skills/build-clarify/`
  and `agents/science-officer.md` into it, update README namespace back to
  `spacebridge:build-clarify`, and update the namespace notes to reflect the move.
- **/science wrapper**: spec §3 mentions `/science {slug}` as an ergonomic alias. Phase C
  defers this — users invoke via `/build-clarify {slug}` (from `user-invocable: true`) or
  via the science-officer agent. A thin `skills/science/` wrapper can be added later if the
  Captain wants the shorter alias.
- **Batch clarify** (spec §4 "Batch Operations"): `/science --batch` sequential clarify of
  all awaiting entities is also deferred — Phase C ships single-entity flow only.
- **Fixtures** (spec §8 Forge Integration): the 5 fixtures for forge validation
  (`full-explore-output.yaml`, `all-confident.yaml`, `resume-mid-session.yaml`,
  `captain-corrects-assumption.yaml`, `canonical-ref-accumulation.yaml`) are deferred to a
  separate phase — forge integration is not blocking Phase C acceptance.
