---
name: build-brainstorm
description: "Non-interactive spec distiller for /build. Takes a captain's directive and produces a product-level Goal Check plus a technical brainstorming spec with APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE and acceptance criteria. Uses α markers for unclear sections instead of asking questions."
---

# Build-Brainstorm -- Non-Interactive Spec Distiller

You are a leaf skill invoked by `/build`. You receive a captain's directive (feature description, bugfix request, or Linear issue reference) and produce a structured brainstorming spec. You do NOT ask questions -- unclear areas get α markers that build-explore resolves later.

**Seven steps, in strict order. No interaction with the user at any point.**

---

## Step 1: Context Enrichment

Gather context silently -- no questions, no confirmation prompts.

### 1a -- Issue Reference (if provided)

If the directive includes a Linear issue ID or GitHub issue reference:
- Fetch via Linear MCP (`get_issue`) or GitHub MCP -- extract title, description, labels, acceptance criteria
- If MCP unavailable: use the reference as-is, note "Issue details not fetched -- MCP unavailable"

### 1b -- Related Entities

Grep the workflow directory for entities related to the directive:

```bash
grep -rl "{keyword}" {workflow_dir}/*.md {workflow_dir}/_archive/*.md 2>/dev/null | head -5
```

Extract title keywords from the directive (nouns, verbs) and match against entity files. Record matches as `{id} -- {title} ({status})`.

### 1c -- Session Context

Search context lake for recent relevant entries:

```
search_journal(query: "{directive keywords}", limit: 3)
```

Extract a 1-sentence summary from the most recent match. If no matches: "No recent session context".

### 1d -- Git State

```bash
git rev-parse --abbrev-ref HEAD   # branch
git rev-parse --short HEAD         # sha
git log --oneline -3               # recent commits
```

### 1e -- Timestamp

Capture current ISO 8601 timestamp for the entity record.

---

## Step 2: Domain Classification

Read `references/domain-classification.md` (relative to this skill's directory).

Classify the directive into one or more domains:

1. **User-facing Visual** -- UI components, pages, layouts, styling
2. **Behavioral / Callable** -- Functions, APIs, hooks, event handlers
3. **Runnable / Invokable** -- Scripts, CLI commands, agents, pipelines
4. **Readable / Textual** -- Documentation, configuration, schemas, specs
5. **Organizational / Data-transforming** -- Data flow, storage, migrations, architecture

**Rules:**
- Match signal words from the reference doc against the directive
- Tag multiple domains when applicable -- over-tagging is cheap
- When ambiguous, tag broader
- Record result for downstream build-explore consumption

---

## Step 2.5: Goal Check Emission

Before distilling the technical brainstorming spec, emit a product-level `## Goal Check` block. Purpose: surface product-level intent in ≤150 words so captain can spot misalignment without wading through technical detail. This is the first place where captain catches "wrong direction" — if Goal Check is off, no amount of clean APPROACH/ALTERNATIVE work will save the entity.

### Structure

Produce two parts:

**One-sentence restatement** (required, **never α-mark**): "You are asking for {literal restatement of directive's core ask, in plain language — avoid technical jargon}."

**Three bullets**:
- **Problem being solved**: what pain this addresses (the "why")
- **Expected outcome**: what concretely changes when this ships (the "what changes")
- **Explicit non-goals**: what this does NOT do — adjacent work, scope boundaries, deferred concerns

### α-marker rules for Goal Check

- **Never α-mark the one-sentence restatement.** If you cannot restate the directive, you cannot brainstorm it — same principle as RATIONALE. Make your best literal restatement; captain will correct if wrong.
- **Aggressively α-mark the non-goals bullet** — directives rarely state what's out of scope explicitly. Format: `Explicit non-goals: {best guess} (needs clarification -- deferred to explore)`.
- Other bullets: α-mark per the alpha-marker-protocol.

### Length discipline

≤150 words total. Plain language. No technical library/file-path references (those belong in APPROACH). Goal Check reads like captain could paste it to a PM unfamiliar with the codebase.

### Shape-present cross-check mode (future — inactive until Step 1f ships)

When `/build --from {shape-slug}` integration lands (tracked in entity 103 `shape-pre-build-alignment-skill`) and Step 1f is added, this Step 2.5 branches:
- **No shape present** (current behavior): emit full Goal Check as specified above.
- **Shape present** (future): entity already has `## Problem Statement` / `## User Stories` from a prior `/shape` session. Goal Check becomes a 2-line sanity cross-check — "Shape validated on {date}. Cross-check: the current directive still aligns with the shape's problem statement." If drift detected, α-mark the cross-check.

Until Step 1f exists, treat this as a forward-compatibility note and always emit the full Goal Check.

---

## Step 3: Spec Distillation

Produce four sections. Follow `references/alpha-marker-protocol.md` for unclear areas.

### APPROACH

1 paragraph. The most likely interpretation of the directive and how to implement it.

- If the directive describes *what* but not *how*: commit to an approach anyway, then α-mark it: `(needs clarification -- deferred to explore)`
- If 2+ viable approaches exist but one is clearly better: pick it, record alternatives in ALTERNATIVE
- If truly ambiguous with no clear winner: α-mark

### ALTERNATIVE

1 paragraph. The most obvious fork -- a different approach that was considered and rejected. Assign **Decision ID D-01** with rejection reason.

- Format: `{alternative description} -- D-01 {rejection reason}`
- If no meaningful alternative exists: `None identified (needs clarification -- deferred to explore)`

### GUARDRAILS

3-5 bullets drawn from:
- The directive itself (explicit constraints)
- CLAUDE.md (project-level rules, conventions)
- Related entities (patterns, prior decisions)

If genuinely no constraints found: `Checked -- no notable constraints identified.` (This is a deliberate assessment, NOT an α marker.)

### RATIONALE

1 paragraph. Why APPROACH was chosen over ALTERNATIVE.

**NEVER α-mark RATIONALE.** If the rationale is weak, improve the approach or alternatives -- do not defer.

---

## Step 4: Acceptance Criteria Extraction

Produce **≥2 testable criteria**, each with a `(how to verify: {method})` annotation.

Examples of testable:
- "Dashboard loads version history within 2 seconds (how to verify: browser devtools network tab)"
- "Entity file contains valid YAML frontmatter (how to verify: parse with yaml library, assert no errors)"

Examples of NOT testable (reject these):
- "Works correctly"
- "Is fast"
- "Handles edge cases"

**Prefer given/when/then or arrange/act/assert phrasing** for behavioral criteria. This makes downstream `test_first` task generation in build-plan more natural -- criteria phrased as "Given X, when Y, then Z" translate directly to test assertions.

Examples of TDD-friendly phrasing:
- "Given a task with `test_first: true` and no test file in `files_modified`, when plan-checker runs dimension 6d, then it reports a blocker (how to verify: `grep 'blocker' plan-checker-output.yaml`)"
- "Given an empty email input, when submitForm is called, then it returns error 'Email required' (how to verify: `bun test tests/form.test.ts`)"

If a criterion is too vague to make testable: α-mark the individual criterion: `{vague criterion} (needs clarification -- deferred to explore)`

---

## Step 5: Intent & Scale Assessment

### Intent

Classify as `feature` or `bugfix`:
- **feature**: new capability, enhancement, refactor, new skill/command
- **bugfix**: fix, broken, regression, crash, error, incorrect behavior

Derive from directive keywords and issue labels (if available).

### Scale

Estimate file count impact:
- **Small**: <5 files changed
- **Medium**: 5-15 files changed
- **Large**: >15 files changed

Check the target project's CLAUDE.md for a "Scale Overrides" table. Apply overrides if a matching pattern exists.

If intent or scale is ambiguous: α-mark: `{assessment} (needs clarification -- deferred to explore)`

---

## Step 5.5: Scope Check (Decomposition Signal)

Scan the directive for large-scope signals. This is O(1) -- pure text analysis, no codebase reads.

**Signal checklist:**
- Signal words: "整個", "全部", "遷移", "migrate", "rewrite", "overhaul", "全面"
- Multiple distinct verbs targeting different subsystems
- Directive exceeds 3 sentences describing different areas
- Domain classification (Step 2) returned 3+ domains

**Decision:**
- If **≥2 signals** detected: add to Captain Context Snapshot: `**Scope flag:** ⚠️ likely-decomposable`
- If **<2 signals**: omit the scope flag line entirely

---

## Step 6: Self-Review

Before returning output, verify quality:

1. **α marker count**: Count all `(needs clarification -- deferred to explore)` markers. If >3, prepend warning: `⚠️ High uncertainty: {n} α markers. Consider providing more detail in the directive.`
2. **Goal Check present and well-formed**: Verify the `## Goal Check` block (a) exists, (b) ≤150 words, (c) one-sentence restatement is NOT α-marked, (d) contains all three bullets (problem / expected outcome / non-goals), (e) reads as product-level plain language (no file paths, no library names).
3. **Goal Check vs APPROACH alignment**: Verify APPROACH serves the "expected outcome" stated in Goal Check. If APPROACH drifts outside Goal Check's problem framing or touches declared non-goals, rewrite APPROACH (not Goal Check — directive is source of truth).
4. **APPROACH vs ALTERNATIVE**: Verify they are genuinely different approaches, not rephrased versions of the same idea
5. **Acceptance Criteria**: Verify each criterion is testable (has a concrete verification method, not vague language)
6. **GUARDRAILS vs APPROACH**: Verify guardrails don't contradict the chosen approach

If any check fails, fix inline before returning. Do not flag to the user -- fix it yourself.

---

## Step 7: Return Output

Return structured sections as **plain text**. The `/build` skill assembles them into the entity file -- you do NOT write any files.

```
## Directive

> {captain's verbatim directive}

## Captain Context Snapshot

- **Repo**: {branch} @ {sha}
- **Session**: {1-sentence journal summary, or "No recent session context"}
- **Domain**: {classified domain(s)}
- **Scope flag**: {⚠️ likely-decomposable, or omit this line if not flagged}
- **Related entities**: {id -- title (status)} or "None found"
- **Created**: {ISO 8601 timestamp}

## Goal Check

You are asking for {one-sentence plain-language restatement of the directive's core ask}.

- **Problem being solved**: {the pain this addresses}
- **Expected outcome**: {what concretely changes when this ships}
- **Explicit non-goals**: {what this does NOT do -- adjacent work, scope boundaries} {(needs clarification -- deferred to explore) if uncertain}

## Brainstorming Spec

**APPROACH**: {paragraph}

**ALTERNATIVE**: {paragraph} -- D-01 {rejection reason}

**GUARDRAILS**:
- {bullet}
- ...

**RATIONALE**: {paragraph}

## Acceptance Criteria

- {criterion} (how to verify: {method})
- ...
```

---

## Rules

- **NEVER ask the captain questions.** Use α markers for anything unclear. You are non-interactive by design.
- **NEVER invoke other skills.** You are a leaf skill, not an orchestrator.
- **NEVER write files.** Return text output only -- `/build` handles file creation.
- **Keep it lightweight.** Read at most 5 files for context enrichment.
- **Preserve the directive verbatim** in the `## Directive` section. Do not rephrase, summarize, or "improve" it.
- **Use `--` (double dash)** in α markers for grep compatibility: `(needs clarification -- deferred to explore)`. Never use `—` (em dash).

---

## Tools Available

**Can use:**
- `Read` -- read entity files, CLAUDE.md, reference docs
- `Grep` -- search workflow directory for related entities
- `Glob` -- find entity files by pattern
- `Bash` -- git commands only (branch, sha, log)
- `context-lake MCP` -- `search_journal`, `search_insights`
- `Linear MCP` -- `get_issue` (if issue reference provided)

**NOT available:**
- `AskUserQuestion` -- this skill is non-interactive. Use α markers instead.
