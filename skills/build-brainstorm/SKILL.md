---
name: build-brainstorm
description: "Non-interactive spec distiller for /build. Takes a captain's directive and produces a product-level Goal Check plus a technical brainstorming spec with APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE and acceptance criteria. Uses α markers for unclear sections instead of asking questions."
---

# Build-Brainstorm -- Non-Interactive Spec Distiller

You are a Mode-A/B dual-mode skill invoked by `/build`. In Mode A (Agent tool available) you dispatch 4 parallel lens subagents per invocation; in Mode B (ensign-wrapped, no Agent) you inline-fallback to single-pass. You are non-interactive to the captain in both modes. You receive a captain's directive (feature description, bugfix request, or Linear issue reference) and produce a structured brainstorming spec. You do NOT ask questions -- unclear areas get α markers that build-explore resolves later.

**Seven steps, in strict order. No interaction with the user at any point.**

---

## Step 1: Lens Collection (Mode A/B)

Collect 4 orthogonal lenses before writing APPROACH. Each lens produces a subsection in a new `## Lens Evidence` entity body section with ≥1 `file:line` or `entity:ID` citation, each citation tagged `[primary|secondary|tertiary]`.

### Two execution modes

**Mode A -- full 4-lens dispatch (Agent tool available):**
Dispatch 4 parallel subagents:
- Lens (a) Captain-stated-intent: `Agent(subagent_type="spacedock:researcher", model="sonnet", prompt=<directive + AC + 1-paragraph task prompt for surfacing explicit captain statements from directive>)`
- Lens (b) Captain-unstated-intent: `Agent(subagent_type="spacedock:researcher", model="sonnet", prompt=<keyword-driven journal search "search_journal(query: {directive keywords}, limit: 5)" + Core-Tension-clustered sibling entities per Q-2; structural output only -- no semantic ground-truth check>)`
- Lens (c) Codebase-current-state: `Agent(subagent_type="spacedock:code-explorer", model="sonnet", prompt=<domain-hint + APPROACH keyword file set>)`
- Lens (d) Sibling-entity: `Agent(subagent_type="spacedock:code-explorer", model="sonnet", prompt=<INDEX.md sibling lookup + CONTRACTS.md overlap scan>)`

All 4 dispatches run in parallel. Each subagent returns structured text; the main session consumes and writes to `## Lens Evidence`.

**Mode B -- inline single-pass fallback (no Agent tool):**
Read up to 9 files inline (CLAUDE.md, entity file, INDEX.md, CONTRACTS.md, 5 APPROACH keyword files). Write a single-subsection `## Lens Evidence -> ### Inline fallback` block with citations tagged at best-effort tier. Self-test gate (i) cross-lens recurrence is SKIPPED in Mode B (α-marker instead); gates (ii) and (iii) still run.

### Mode selection heuristic

- **Mode A** when Agent tool is present in the runtime `## Tools Available` check.
- **Mode B** when Agent tool is absent (ensign-wrapped runtime). Do NOT attempt Mode A dispatch and fall back on failure -- detect up-front to avoid cost.

Detection heuristic: inspect whether `Agent` tool is listed in the current runtime's available tools at skill boot. If uncertain, default to Mode B (fail-safe degrades gracefully).

### Lens Subagent Prompts

Exact prompt templates for each Mode A lens dispatch. Copy-paste contract for implementors; grep-auditable for non-interactivity. Non-interactivity assertion: **every prompt below contains zero `AskUserQuestion` / `Teammate(` references.**

#### Lens (a) -- captain-stated-intent

- **Dispatched agent**: `spacedock:researcher`
- **Model**: `sonnet`
- **Input materials**: directive text (verbatim), acceptance criteria from entity file (if present), shape sections from entity body (if present -- ## Problem Statement / ## User Stories / ## Scope: In / ## Scope: Out / ## References), CLAUDE.md path reference
- **Prompt template**:
  ```
  You are Lens (a): captain-stated-intent.

  Directive: {verbatim directive text}

  Acceptance Criteria (if present): {entity AC block, or "none"}

  Shape sections (if present, all [primary] tier): {shape block or "none"}

  Task: Surface all explicit statements, constraints, and goals the captain stated in the directive.
  Do NOT infer or extrapolate -- report only what is literally present.
  Return 3-6 lines. Each line: one claim, followed by a citation tag [primary|secondary|tertiary].
  Format per line: "- {claim} -- directive:verbatim [primary]"
  Non-interactive: do not ask questions. If something is unclear, note "(unclear)" inline.
  ```
- **Return format**: 3-6 bullet lines, each ending with a `[primary|secondary|tertiary]` tag
- **Non-interactivity assertion**: this prompt contains zero `AskUserQuestion` / `Teammate(` references

<!-- Shape-aware dispatch: when the entity frontmatter carries shape_status: validated, the dispatch site injects the entity's ## Problem Statement / ## User Stories / ## Scope: * / ## References sections verbatim into the {shape block} placeholder. Per A-7 and Q-5 (P-4 enforcement), /build --from {slug} accepts only the slug -- no supplemental directive text is passed alongside. -->

#### Lens (b) -- captain-unstated-intent

- **Dispatched agent**: `spacedock:researcher`
- **Model**: `sonnet`
- **Input materials**: directive keywords (nouns + verbs, stop-word filtered), INDEX.md sibling list, journal search results
- **Q-2 scope**: `search_journal(query: "{directive keywords}", limit: 5)` where directive-keyword extraction = directive nouns + verbs with stop-word filter (exclude: a, an, the, is, are, was, be, to, of, in, for, and, or, with, this, that, it, by); plus all siblings clustered by shared Core Tension / Honest Boundary
- **Prompt template**:
  ```
  You are Lens (b): captain-unstated-intent.

  Directive keywords: {nouns + verbs extracted from directive, stop-word filtered}

  Journal search results (search_journal(query: "{directive keywords}", limit: 5)):
  {journal search output, or "No results"}

  Sibling entities sharing Core Tension / Honest Boundary:
  {sibling list from INDEX.md, clustered by Core Tension / Honest Boundary, or "None"}

  Task: Infer implicit goals, constraints, and context the captain likely assumed but did not state.
  Structural output only -- no semantic ground-truth verification (see skill-level Honest Boundary note).
  Return 3-6 lines. Each line: one inferred claim + evidence citation + [primary|secondary|tertiary] tag.
  Format per line: "- {inferred claim} -- {entity:ID or journal-entry-id} [secondary]"
  Non-interactive: do not ask questions. Mark uncertain inferences with "(inferred)".
  ```
- **Return format**: 3-6 bullet lines, each ending with a `[primary|secondary|tertiary]` tag
- **Non-interactivity assertion**: this prompt contains zero `AskUserQuestion` / `Teammate(` references
- **Note**: structural output only; semantic ground-truth not verifiable (Honest Boundary 7)

#### Lens (c) -- codebase-current-state

- **Dispatched agent**: `spacedock:code-explorer`
- **Model**: `sonnet`
- **Input materials**: domain hint (from Step 2 domain classification), APPROACH keyword file set (top 3-5 files most likely touched by the directive)
- **Prompt template**:
  ```
  You are Lens (c): codebase-current-state.

  Domain hint: {classified domain(s) from Step 2}

  APPROACH keyword files to explore: {top 3-5 file paths most likely touched}

  Task: Report the current implementation state relevant to this directive.
  Find concrete file:line evidence for how the system currently works in the target area.
  Return 3-6 lines. Each line: one factual observation + file:line citation + [primary|secondary|tertiary] tag.
  Format per line: "- {observation} -- {file:line} [primary]"
  Non-interactive: do not ask questions. If a file is missing, note "(file not found)".
  ```
- **Return format**: 3-6 bullet lines, each ending with a `[primary|secondary|tertiary]` tag and a `file:line` citation
- **Non-interactivity assertion**: this prompt contains zero `AskUserQuestion` / `Teammate(` references

#### Lens (d) -- sibling-entity

- **Dispatched agent**: `spacedock:code-explorer`
- **Model**: `sonnet`
- **Input materials**: `_index/INDEX.md` sibling lookup (entities with overlapping `files_modified`), `_index/CONTRACTS.md` overlap scan
- **Prompt template**:
  ```
  You are Lens (d): sibling-entity.

  INDEX.md excerpt (siblings with overlapping files_modified):
  {relevant INDEX.md rows}

  CONTRACTS.md excerpt (overlapping contract lines):
  {relevant CONTRACTS.md lines}

  Task: Identify sibling entities whose scope overlaps this directive.
  Report any duplicate work, conflicting contracts, or useful precedents.
  Return 3-6 lines. Each line: one overlap finding + entity:ID citation + [primary|secondary|tertiary] tag.
  Format per line: "- {overlap or precedent finding} -- entity:{ID} [secondary]"
  Non-interactive: do not ask questions. If no siblings found, return "- No overlapping siblings found -- INDEX.md [tertiary]".
  ```
- **Return format**: 3-6 bullet lines, each ending with a `[primary|secondary|tertiary]` tag and an `entity:ID` citation
- **Non-interactivity assertion**: this prompt contains zero `AskUserQuestion` / `Teammate(` references

### Context Enrichment (sub-steps, run alongside lens dispatch)

Gather context silently -- no questions, no confirmation prompts.

#### 1a -- Issue Reference (if provided)

If the directive includes a Linear issue ID or GitHub issue reference:
- Fetch via Linear MCP (`get_issue`) or GitHub MCP -- extract title, description, labels, acceptance criteria
- If MCP unavailable: use the reference as-is, note "Issue details not fetched -- MCP unavailable"

#### 1b -- Related Entities

Grep the workflow directory for entities related to the directive:

```bash
grep -rl "{keyword}" {workflow_dir}/*.md {workflow_dir}/_archive/*.md 2>/dev/null | head -5
```

Extract title keywords from the directive (nouns, verbs) and match against entity files. Record matches as `{id} -- {title} ({status})`.

#### 1c -- Session Context

Search context lake for recent relevant entries:

```
search_journal(query: "{directive keywords}", limit: 3)
```

Extract a 1-sentence summary from the most recent match. If no matches: "No recent session context".

#### 1d -- Git State

```bash
git rev-parse --abbrev-ref HEAD   # branch
git rev-parse --short HEAD         # sha
git log --oneline -3               # recent commits
```

#### 1e -- Timestamp

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

## Step 5.5: Triple-Verification Merge Gate + 5-Item Self-Test

### Merge gate (3 gates per candidate APPROACH claim)

Every candidate APPROACH claim passes through 3 independent gates:
- **Gate (i) cross-lens recurrence**: ≥2 of 4 lens subsections cite supporting evidence for this claim. Skipped in Mode B with α marker.
- **Gate (ii) generative power (Q-3 predictive marker heuristic)**: claim contains a concrete action verb from the closed set {add, remove, replace, rewrite, rename, dispatch, gate, verify, annotate, vendor, relax, block, emit, append} AND a file/layer name NOT present in the directive text. Binary, grep-verifiable.
- **Gate (iii) exclusivity**: claim distinguishes this entity from every sibling in `_index/INDEX.md` with overlapping `files_modified` per `_index/CONTRACTS.md`. Failure → seed `Q-n` in `## Open Questions` citing sibling and asking captain to `{merge|link|refine}` (AC line 91).

Claims passing 3/3 → `## Brainstorming Spec -> APPROACH`. Claims passing 1-2/3 → demote to `GUARDRAILS`. Claims passing 0/3 → discard with Stage Report line `gate-{i|ii|iii} discard: {claim summary}`.

### 5-item quality self-test gate

Run after merge gate, before return:
1. **Claim cardinality**: APPROACH contains 3-7 factual claims (soft target). Out-of-range MUST be α-marked with literal form `(α: claim count {n} outside default 3-7; scale-justified by {directive-signal})` where `{directive-signal}` is one of {`trivial-scope-rename`, `single-line-config-edit`, `medium-feature`, `architectural-overhaul`, `cross-layer-refactor`}.
2. **Lens support floor**: every APPROACH claim has ≥2 lens citations. Failure: promote to 2+ lenses (re-dispatch a lens subagent) or demote to GUARDRAILS.
3. **`## Core Tensions` populated OR escape-hatch**: section contains ≥1 typed entry matching `\*\*(time-based|domain-based|essential)\*\*:` OR literal `Checked -- no notable constraints identified.`
4. **`## Honest Boundaries` populated OR escape-hatch**: section contains ≥1 `- ` bullet OR literal `Checked -- no notable constraints identified.`
5. **Tier tags on every lens citation**: every `file:line` or `entity:ID` in `## Lens Evidence` carries `[primary|secondary|tertiary]`. `grep -cE '\[primary\]|\[secondary\]|\[tertiary\]'` ≥ citation count.

### Failure routing (Q-1 resolved: Hard-fail to FO/captain)

- **Mode A**: any gate-(i/ii/iii) or self-test item failure returns NO spec output; emit Stage Report blocker payload `{failure_gate: "{gate-id}", failing_claim: "{verbatim claim text}", failing_lens: "{lens-id}"}`. FO/captain routes recovery.
- **Mode B**: gate (i) failure is auto-α-marked (no ship-block). Gates (ii)/(iii) and self-test items (2)-(5) still run as advisory; failures inline α-markers + Stage Report warning `ensign-mode inline fallback -- gate {n} advisory-only`.

---

## Step 7: Return Output

Return structured sections as **plain text**. The `/build` skill assembles them into the entity file -- you do NOT write any files.

### Output Contract -- new body sections (Nüwa lens model)

In addition to the prior sections, this skill produces THREE new entity body sections:

- `## Lens Evidence` -- 4 subsections: `### Lens (a) captain-stated-intent`, `### Lens (b) captain-unstated-intent`, `### Lens (c) codebase-current-state`, `### Lens (d) sibling-entity`. Each subsection has ≥1 citation tagged `[primary|secondary|tertiary]`. (Mode B emits a single `### Inline fallback` subsection instead.)
- `## Core Tensions` -- typed entries `**(time-based|domain-based|essential)**: {text}` OR literal escape-hatch `Checked -- no notable constraints identified.`.
- `## Honest Boundaries` -- `- ` bullets OR literal escape-hatch `Checked -- no notable constraints identified.`.

**Downstream contract:** `explore`/`clarify` annotate these sections but MUST NOT delete. Only captain (via clarify annotation) may delete.

### Full output template

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

## Lens Evidence

### Lens (a) captain-stated-intent

- {claim} -- {file:line or entity:ID} [primary|secondary|tertiary]

### Lens (b) captain-unstated-intent

- {claim} -- {file:line or entity:ID} [primary|secondary|tertiary]

### Lens (c) codebase-current-state

- {claim} -- {file:line or entity:ID} [primary|secondary|tertiary]

### Lens (d) sibling-entity

- {claim} -- {file:line or entity:ID} [primary|secondary|tertiary]

## Core Tensions

- **(time-based|domain-based|essential)**: {1-sentence tension description}

(Or literal escape-hatch: `Checked -- no notable constraints identified.`)

## Honest Boundaries

- {1-sentence boundary statement}

(Or literal escape-hatch: `Checked -- no notable constraints identified.`)

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
- **Mode-dependent dispatch.** Mode A (Agent tool available) dispatches 4 parallel lens subagents per Step 1.
  Mode B (no Agent tool) inline-falls-back to a single-pass read. Do NOT invoke non-lens skills.
- **NEVER write files.** Return text output only -- `/build` handles file creation.
- **File-read cap: 9.** Raised from 5 to accommodate 4 lenses × up to 2 files each + 1 INDEX/CONTRACTS lookup per invocation. Every other read-budget assumption identical to v1.
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
- `Agent` -- dispatches 4 parallel lens subagents in Mode A only (Mode B does inline fallback; see Step 1)

**NOT available:**
- `AskUserQuestion` -- this skill is non-interactive. Use α markers instead.
