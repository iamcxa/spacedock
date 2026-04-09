# Build-Explore Skill — Phase B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `build-explore` skill that enhances the pipeline's explore stage with Hybrid classification (assumptions/options/questions), decomposition analysis, α marker consumption, and GSD domain-based gray area identification.

**Architecture:** New skill `spacedock:build-explore` at `skills/build-explore/` with SKILL.md + 3 reference docs. Ensign loads it via the `skill:` field in README's explore stage definition. The skill reads the entity body (produced by build-brainstorm), maps the codebase, classifies gray areas into three tracks, and writes results back to entity sections (Open Questions, Assumptions, Option Comparisons).

**Tech Stack:** Markdown skill files (SKILL.md + references/), no runtime code changes.

**Spec:** `docs/superpowers/specs/2026-04-09-build-studio-plugin-and-science-officer.md` §7

---

## File Structure

```
skills/build-explore/
├── SKILL.md                                    # Main skill — 7-step explore flow
└── references/
    ├── gray-area-templates.md                  # GSD 5-domain gray area templates
    ├── hybrid-classification-heuristic.md      # Track A/B/C routing rules
    └── output-format.md                        # Entity body section formats (Assumptions, Options, Questions)
```

Additionally:
- Modify: `docs/build-pipeline/README.md` — add `skill: spacedock:build-explore` to explore stage

---

### Task 1: Create reference docs for build-explore

**Files:**
- Create: `skills/build-explore/references/gray-area-templates.md`
- Create: `skills/build-explore/references/hybrid-classification-heuristic.md`
- Create: `skills/build-explore/references/output-format.md`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p skills/build-explore/references
```

- [ ] **Step 2: Write `references/gray-area-templates.md`**

This reference defines the 5-domain gray area templates from spec §7 Step 4. Write to `skills/build-explore/references/gray-area-templates.md`:

```markdown
# Gray Area Templates by Domain

When build-explore identifies the entity's domain(s) from the Captain Context Snapshot,
apply the matching template(s) below to generate gray areas for classification.

## Skip Rules

Before generating gray areas, check if each is already resolved by:
1. **Brainstorming Spec decisions** -- D-01 etc. already locked a choice
2. **Codebase precedent** -- existing pattern clearly applies (found ≥2 usages)
3. **Related entities** -- a shipped entity already solved this exact gray area

If resolved, skip that gray area entirely. Do not generate questions for decided items.

## User-facing Visual

Gray areas for features users see (UI components, pages, layouts, styling):

| Gray Area | What to Assess | Example |
|-----------|---------------|---------|
| Layout style | cards / list / grid / timeline | "Entity list uses cards (entity 009)" |
| Loading behavior | skeleton / spinner / progressive / infinite scroll | "Dashboard uses full-page spinner" |
| State handling | empty state / error state / loading state / partial data | "No empty state pattern exists" |
| Responsive breakpoints | mobile-first / desktop-first / both | "Dashboard is desktop-only (no responsive)" |
| Animation / transitions | subtle / none / rich | "No animations in existing dashboard" |

## Behavioral / Callable

Gray areas for logic that gets called (APIs, hooks, handlers):

| Gray Area | What to Assess | Example |
|-----------|---------------|---------|
| Input validation strategy | client / server / both | "Server-side only in existing API handlers" |
| Error response format | structured JSON / message string / error code | "API returns {error: string}" |
| Idempotency requirements | needed / not needed | "POST endpoints are not idempotent" |
| Rate limiting / throttling | present / absent / needed | "No rate limiting exists" |
| Versioning strategy | URL / header / none | "No API versioning" |

## Runnable / Invokable

Gray areas for scripts, CLI commands, agents, pipelines:

| Gray Area | What to Assess | Example |
|-----------|---------------|---------|
| Invocation modes | CLI flags / config file / interactive prompts | "Status script uses flags only" |
| Output format | JSON / text / table / streaming | "Status outputs plain text" |
| Exit codes / error signaling | structured codes / boolean / exceptions | "Scripts use exit 0/1" |
| Concurrency model | parallel / sequential / configurable | "FO dispatches sequentially" |

## Readable / Textual

Gray areas for documentation, configuration, schemas:

| Gray Area | What to Assess | Example |
|-----------|---------------|---------|
| Structure / hierarchy | flat / nested / multi-level | "README uses flat ### sections" |
| Tone and audience | technical / onboarding / reference | "Docs assume advanced user" |
| Depth vs breadth | comprehensive / quick-reference / progressive | "Inline comments are terse" |
| Cross-referencing strategy | links / includes / standalone | "Skills use references/ for detail" |

## Organizational / Data-transforming

Gray areas for data flow, storage, migrations, architecture:

| Gray Area | What to Assess | Example |
|-----------|---------------|---------|
| Classification criteria | how items are grouped or categorized | "Entities grouped by status only" |
| Exception handling | what happens with edge cases or invalid data | "Invalid frontmatter silently skipped" |
| Grouping strategy | flat / hierarchical / tagged | "Entities are flat files, no nesting" |
| Schema evolution | migration / backward compat / versioned | "Frontmatter fields added without migration" |

## Multi-Domain Entities

When an entity spans multiple domains, apply ALL matching templates. Deduplicate gray areas
that appear in multiple templates (e.g., "error handling" in both Behavioral and Organizational).
Mark each gray area with its source domain for downstream reference.
```

- [ ] **Step 3: Write `references/hybrid-classification-heuristic.md`**

Write to `skills/build-explore/references/hybrid-classification-heuristic.md`:

```markdown
# Hybrid Classification Heuristic

For each gray area identified from the domain templates, classify it into exactly one of
three tracks. The classification determines how build-clarify will resolve it.

## Track A -- Assumption

**When:** Codebase has clear precedent for this gray area.

**Heuristic:**
- Found ≥2 existing usages of the same pattern → **Confident**
- Found 1 usage or a similar-but-different pattern → **Likely**
- Found a pattern but it's unclear if it applies → **Unclear**

**Format in entity body:**

```
A-{n}: {assumption statement}
Confidence: {Confident | Likely | Unclear}
Evidence: {file_path}:{line} -- {what the code shows}
```

**Example:**
```
A-1: Dashboard filter chips use server-side query parameters
Confidence: Confident
Evidence: tools/dashboard/src/server.ts:142 -- existing stage filter uses ?status= param
Evidence: tools/dashboard/static/index.js:89 -- fetch() includes query string from filter state
```

**How build-clarify handles:** Batch confirmation -- captain reviews all assumptions at once,
confirms or corrects.

## Track B -- Option Comparison

**When:** No single precedent exists, but multiple viable approaches can be identified.

**Heuristic:**
- Found competing patterns in codebase (e.g., two different error handling styles)
- No codebase pattern, but 2-3 standard approaches exist in the domain
- α marker from brainstorm AND codebase analysis surfaced multiple options

**Format in entity body:**

```
### {Gray area name}

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| {opt1} | {pros} | {cons} | {Low/Med/High} | {recommended or not} |
| {opt2} | {pros} | {cons} | {Low/Med/High} | {recommended or not} |
| {opt3} | {pros} | {cons} | {Low/Med/High} | {recommended or not} |
```

**Example:**
```
### Filter chip rendering

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| Reuse existing stage chip CSS | Consistent, zero new CSS | Limited to pill shape | Low | ✅ Recommended |
| New dropdown component | More compact for many values | New JS, new CSS | Medium | |
| Toggle buttons | Familiar UI | Takes more horizontal space | Low | |
```

**How build-clarify handles:** One-at-a-time AskUserQuestion with options mapped to the table rows.

## Track C -- Open Question

**When:** Genuinely open -- no codebase signal, no obvious options, needs captain's domain knowledge.

**Heuristic:**
- No codebase signal at all for this gray area
- α marker from brainstorm with no codebase resolution
- The gray area requires business/product judgment, not technical analysis

**Format in entity body:**

```
Q-{n}: {specific question}
Domain: {which gray area this belongs to}
Why it matters: {impact on downstream decisions}
Suggested options: {2-4 concrete choices, or "Open-ended -- captain decides"}
```

**Example:**
```
Q-1: Should context_status filter show counts per status?
Domain: User-facing Visual -- State handling
Why it matters: Affects API response shape (need aggregation query) and UI complexity
Suggested options: (a) Show counts in chip badges (b) No counts, just filter (c) Counts in a separate summary bar
```

**How build-clarify handles:** One-at-a-time AskUserQuestion or freeform text prompt.

## Classification Priority

When a gray area could fit multiple tracks, prefer the LOWER track:
- If there's ANY codebase evidence → Track A (not B or C)
- If there are identifiable options → Track B (not C)
- Track C only when truly open-ended

This minimizes captain interaction -- the goal is to resolve as much as possible from codebase analysis.
```

- [ ] **Step 4: Write `references/output-format.md`**

Write to `skills/build-explore/references/output-format.md`:

```markdown
# Build-Explore Output Format

build-explore writes directly to entity body sections. This reference defines the exact format
for each section to ensure build-clarify can parse and consume them.

## Section: ## Assumptions

```markdown
## Assumptions

A-1: {statement}
Confidence: {Confident | Likely | Unclear}
Evidence: {file_path}:{line} -- {description}

A-2: {statement}
Confidence: {Confident | Likely | Unclear}
Evidence: {file_path}:{line} -- {description}
```

Rules:
- Sequential numbering: A-1, A-2, A-3, ...
- Each assumption has exactly one Confidence level
- Evidence is mandatory -- at least one file:line reference
- Multiple evidence lines allowed (one per line, same indent)

## Section: ## Option Comparisons

```markdown
## Option Comparisons

### {Gray area name}

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| ...    | ...  | ...  | ...        | ...            |

### {Another gray area}

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| ...    | ...  | ...  | ...        | ...            |
```

Rules:
- Each comparison is a ### subsection under ## Option Comparisons
- Table must have exactly 5 columns
- Exactly one row should have ✅ Recommended (or no recommendation if truly equal)
- 2-4 options per comparison (not 1, not 5+)

## Section: ## Open Questions

```markdown
## Open Questions

Q-1: {specific question}
Domain: {gray area domain}
Why it matters: {downstream impact}
Suggested options: {2-4 concrete options, or "Open-ended -- captain decides"}

Q-2: {specific question}
Domain: {gray area domain}
Why it matters: {downstream impact}
Suggested options: {options}
```

Rules:
- Sequential numbering: Q-1, Q-2, Q-3, ...
- Each question has Domain, Why it matters, and Suggested options
- Questions from α markers should be numbered FIRST (they're highest priority)

## Section: ## Decomposition Recommendation

Only written when decomposition is warranted (Step 3).

```markdown
## Decomposition Recommendation

⚠️ Scale exceeds recommended single-entity scope ({n} files, {n} domains).

Suggested split:
1. **{child-slug}** -- {scope description} ({n} files)
2. **{child-slug}** -- {scope description} ({n} files)
3. **{child-slug}** -- {scope description} ({n} files)

Dependencies: {ordering description}
```

## Section: ## Stage Report: explore

Always written as the last section.

```markdown
## Stage Report: explore

- Files mapped: {count} across {layers}
- Assumptions formed: {count} (Confident: {n}, Likely: {n}, Unclear: {n})
- Options surfaced: {count}
- Questions generated: {count}
- α markers resolved: {count} / {total}
- Scale assessment: {confirmed | revised from X to Y}
```

## Brainstorming Spec Annotations

In addition to writing new sections, annotate the existing ## Brainstorming Spec:
- Confirmed: append `(✓ confirmed by explore: {evidence})` after the confirmed text
- Contradicted: append `(⚠ contradicted: {evidence} -- see Q-{n})` and generate a corresponding question
```

- [ ] **Step 5: Commit reference docs**

```bash
git add skills/build-explore/references/
git commit -m "feat(build-explore): add gray area templates, hybrid classification, and output format references"
```

---

### Task 2: Write build-explore SKILL.md

**Files:**
- Create: `skills/build-explore/SKILL.md`

- [ ] **Step 1: Write the skill file**

Write to `skills/build-explore/SKILL.md`:

```markdown
---
name: build-explore
description: "Codebase exploration + question generation for build pipeline entities. Invoked by ensign during explore stage. Maps affected files, identifies gray areas using GSD domain templates, classifies into assumptions/options/questions via Hybrid heuristic, and writes results to entity body. Non-interactive."
---

# Build-Explore -- Codebase Analysis + Question Generation

You are an explore stage skill loaded by an ensign worker. You receive an entity file with a brainstorming spec (from build-brainstorm) and produce codebase-grounded analysis: file mapping, assumptions with evidence, option comparisons, and open questions.

**You do NOT interact with the captain.** Write all findings to the entity body. The Science Officer (build-clarify) will later use your output to run an interactive Q&A session.

**Seven steps, in strict order.**

---

## Tools Available

**Can use:**
- `Read` -- read source files, entity file, CLAUDE.md, reference docs
- `Grep` -- search codebase for patterns, usages, file matches
- `Glob` -- find files by pattern
- `Bash` -- git commands, file counting, grep pipelines
- `context-lake MCP` -- `search_insights` (check existing cached knowledge), `store_insight` (cache new findings)

**NOT available:**
- `AskUserQuestion` -- you are non-interactive
- `Write` -- do NOT write to arbitrary files; only update the entity file via the `/build` caller or ensign wrapper

---

## Step 1: Read Entity & Identify Domain

Read the entity file. Extract:
- `## Directive` -- captain's original words
- `## Brainstorming Spec` -- APPROACH, ALTERNATIVE, GUARDRAILS, RATIONALE
- `## Captain Context Snapshot` -- specifically the **Domain** line and **Scope flag** if present
- `## Acceptance Criteria` -- testable criteria list
- Frontmatter: `intent`, `scale`, `project`

Domain(s) from the snapshot determine which gray area templates to apply in Step 4.

---

## Step 2: Codebase Mapping

Based on the APPROACH section, map all files that would be affected:

1. **Grep for keywords** from the approach (function names, file names, component names, API routes)
2. **Group by layer**: domain / contract / router / view / seed / frontend / test / config
3. **For each file** (up to 20 files):
   - Read the file (or key sections)
   - Form a 1-line purpose note
   - `store_insight` to context lake with tags: `[purpose]`, `[pattern]`, `[gotcha]` as appropriate
4. **Count files** -- compare against frontmatter `scale`:
   - <5 files → Small
   - 5-15 files → Medium
   - >15 files → Large
   - If actual count differs from frontmatter, note the revision

**For bugfix entities** (`intent: bugfix`): prioritize root cause diagnosis. Read error-related code paths, trace the bug from symptom to cause, and record diagnosis in the stage report.

Record all findings for the stage report (Step 7).

---

## Step 3: Decomposition Analysis

Check the Captain Context Snapshot for `⚠️ likely-decomposable` scope flag.
Also independently assess: did Step 2 find >20 files across 3+ layers?

**If either condition is true:**

Analyze whether the entity should be split:
- Are there natural boundaries (e.g., data layer vs UI vs sync layer)?
- Can sub-scopes be built and shipped independently?
- Are there clear dependency ordering between sub-scopes?

If decomposition is warranted, write `## Decomposition Recommendation` to entity body.
Read `references/output-format.md` for the exact format.

If NOT warranted despite the flag, note in Stage Report:
`"Scope flag present but decomposition not recommended: {reason}"`

**If no flag AND <20 files:** skip this step entirely.

---

## Step 3.5: Consume α Markers

Scan `## Brainstorming Spec` and `## Acceptance Criteria` for α markers:
`(needs clarification -- deferred to explore)`

Each marker is a **HIGH PRIORITY** item. For each:
1. Attempt to resolve from codebase analysis (grep for patterns, read related files)
2. If resolved: replace the α marker with concrete content + `(✓ resolved by explore: {evidence})`
3. If NOT resolved: convert to an Open Question (Track C) with the highest priority numbering (Q-1, Q-2, etc.)

Count resolved vs unresolved for the stage report.

---

## Step 4: Gray Area Identification

Read `references/gray-area-templates.md`.

Based on the entity's domain(s), apply matching template(s). For each gray area in the template:

1. **Check skip rules:**
   - Already decided in Brainstorming Spec (D-01 etc.)? → Skip
   - Clear codebase precedent (found ≥2 usages)? → Skip (will become assumption in Step 5)
   - Related entity already solved this? → Skip

2. **If not skipped:** add to the gray area list for classification in Step 5.

For multi-domain entities, apply ALL matching templates. Deduplicate overlapping gray areas.

---

## Step 5: Hybrid Classification

Read `references/hybrid-classification-heuristic.md`.

For each gray area from Step 4, classify into exactly one track:

**Track A -- Assumption:** codebase has precedent
- ≥2 usages → Confident
- 1 usage or similar pattern → Likely
- Pattern exists but unclear fit → Unclear

**Track B -- Option Comparison:** no single precedent, multiple viable approaches
- Competing patterns in codebase
- Standard domain options exist

**Track C -- Open Question:** genuinely open, needs captain input
- No codebase signal
- Business/product judgment required
- Unresolved α marker

**Priority rule:** prefer lower tracks. Any evidence → Track A. Identifiable options → Track B. Track C only when truly open.

---

## Step 6: Write to Entity Body

Read `references/output-format.md` for exact section formats.

Write to the entity file:
- `## Assumptions` -- all Track A items (A-1, A-2, ...)
- `## Option Comparisons` -- all Track B items (### subsections with tables)
- `## Open Questions` -- all Track C items (Q-1, Q-2, ...; α-marker questions first)
- `## Decomposition Recommendation` -- if warranted from Step 3

Annotate `## Brainstorming Spec`:
- Confirmed sections: append `(✓ confirmed by explore: {evidence})`
- Contradicted sections: append `(⚠ contradicted: {evidence} -- see Q-{n})`

---

## Step 7: Stage Report

Write `## Stage Report: explore` as the last section:

```
## Stage Report: explore

- Files mapped: {count} across {layers}
- Assumptions formed: {count} (Confident: {n}, Likely: {n}, Unclear: {n})
- Options surfaced: {count}
- Questions generated: {count}
- α markers resolved: {count} / {total}
- Scale assessment: {confirmed | revised from X to Y}
```

---

## Rules

- **NEVER ask the captain questions.** Write findings to entity body for build-clarify to consume.
- **NEVER skip codebase analysis.** Read actual files -- do not infer from file names alone.
- **Prefer Track A over Track B over Track C.** Minimize what the captain needs to decide.
- **Use `--` (double dash)** consistently, never `—` (em dash).
- **Store insights to context lake** for every file you read in depth. Use tags: `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`.
- **Respect the 20-file limit** in Step 2. If >20 files match, prioritize by relevance to APPROACH.
- **Preserve existing entity body content.** Only modify sections you own (Assumptions, Option Comparisons, Open Questions, Decomposition Recommendation, Stage Report). Never modify Directive or Captain Context Snapshot.
```

- [ ] **Step 2: Commit SKILL.md**

```bash
git add skills/build-explore/SKILL.md
git commit -m "feat(build-explore): add SKILL.md -- codebase analysis + question generation"
```

---

### Task 3: Add `skill:` field to explore stage in README

**Files:**
- Modify: `docs/build-pipeline/README.md` — explore stage definition (~line 37-39)

- [ ] **Step 1: Read current explore stage definition**

```bash
grep -n "name: explore" docs/build-pipeline/README.md
```

Expected: line 37 with `- name: explore`

- [ ] **Step 2: Add skill field to explore stage**

Current:
```yaml
    - name: explore
      profiles: [full, standard]
      model: sonnet
```

Change to:
```yaml
    - name: explore
      profiles: [full, standard]
      model: sonnet
      skill: spacedock:build-explore
      # Ensign loads build-explore skill for codebase mapping + question generation.
      # Hybrid classification: assumptions (Track A), options (Track B), questions (Track C).
      # Writes to entity body: ## Assumptions, ## Option Comparisons, ## Open Questions.
      #
      # FALLBACK (skill not found):
      # Ensign uses inline explore definition below (basic file mapping, no question generation).
```

- [ ] **Step 3: Commit**

```bash
git add docs/build-pipeline/README.md
git commit -m "feat(pipeline): add skill: spacedock:build-explore to explore stage definition"
```

---

### Task 4: Verify skill structure and integration

- [ ] **Step 1: Verify directory structure**

```bash
ls -R skills/build-explore/
```

Expected:
```
skills/build-explore/:
SKILL.md  references/

skills/build-explore/references/:
gray-area-templates.md  hybrid-classification-heuristic.md  output-format.md
```

- [ ] **Step 2: Verify SKILL.md frontmatter**

```bash
head -5 skills/build-explore/SKILL.md
```

Expected:
```
---
name: build-explore
description: "Codebase exploration + question generation..."
---
```

- [ ] **Step 3: Verify README skill reference**

```bash
grep "skill: spacedock:build-explore" docs/build-pipeline/README.md
```

Expected: one match in the explore stage definition.

- [ ] **Step 4: Verify references are cited in SKILL.md**

```bash
grep "references/" skills/build-explore/SKILL.md
```

Expected: 3 matches (gray-area-templates.md, hybrid-classification-heuristic.md, output-format.md).

- [ ] **Step 5: Cross-check output format consistency**

Verify that the section headers in `output-format.md` match what SKILL.md Step 6 writes:
- `## Assumptions` ✓
- `## Option Comparisons` ✓
- `## Open Questions` ✓
- `## Decomposition Recommendation` ✓
- `## Stage Report: explore` ✓

Also verify numbering formats (A-{n}, Q-{n}) are consistent between heuristic and output docs.

---

## Execution Order & Dependencies

```
Task 1 (reference docs)
  └──▶ Task 2 (SKILL.md — references Task 1's docs)
         └──▶ Task 3 (README — references Task 2's skill)
                └──▶ Task 4 (verify integration)
```

All tasks are sequential.

## Rollback

If Phase B causes issues:
1. Remove `skill: spacedock:build-explore` from README explore stage (reverts to inline definition)
2. `skills/build-explore/` can stay — it's inert if not referenced
3. Existing entities in explore stage continue to work with the inline README definition
