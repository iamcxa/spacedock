---
name: build-explore
description: "Codebase exploration + question generation for build pipeline entities. Invoked by ensign during explore stage. Maps affected files, identifies gray areas using GSD domain templates, classifies into assumptions/options/questions via Hybrid heuristic, and writes results to entity body. Non-interactive."
---

# Build-Explore -- Codebase Analysis + Question Generation

This skill is loaded by the ensign during the `explore` stage of the build pipeline. It produces a codebase-grounded analysis that the later `clarify` stage (Science Officer) consumes for interactive Q&A. Execute the seven steps below in strict order. This skill is non-interactive -- never ask the captain questions.

---

## Tools Available

**Can use:**
- `Read` -- read entity files, reference docs, and files discovered during mapping
- `Grep` -- search the codebase for keywords, patterns, and file references
- `Glob` -- find files by pattern when grep is too broad
- `Bash` -- git commands, file counting, and shell pipelines for mapping
- `context-lake MCP` -- `search_insights` (lookup prior findings) and `store_insight` (record purpose/pattern/gotcha/correction for every file read in depth)

**NOT available:**
- `AskUserQuestion` -- this skill is non-interactive. Write findings to the entity body; build-clarify handles captain interaction.
- `Write` / `Edit` on the entity file -- the ensign wrapper applies updates. Return text output for the sections this skill owns.

---

## Step 1: Read Entity & Identify Domain

Read the entity file from the workflow directory.

Extract the following sections verbatim:
- `## Directive` -- the captain's original request
- `## Brainstorming Spec` -- APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE
- `## Captain Context Snapshot` -- specifically the **Domain** line and **Scope flag** line (if present)
- `## Acceptance Criteria` -- the testable criteria list

Extract frontmatter fields:
- `intent` -- `feature` or `bugfix`
- `scale` -- `Small`, `Medium`, or `Large`
- `project` -- target project path

The domain(s) recorded in the Captain Context Snapshot determine which gray area templates apply in Step 4. Preserve them exactly.

---

## Step 2: Codebase Mapping

Based on APPROACH, grep for keywords -- function names, file names, component names, API routes, schema names, and anything else the brainstorming spec names specifically.

Group discovered files by layer:
- domain
- contract
- router
- view
- seed
- frontend
- test
- config

For each file (up to 20 files total), read it, form a 1-line purpose note, and call `store_insight` to the context lake with tags `[purpose]`, `[pattern]`, or `[gotcha]` as appropriate. Use `[correction]` when the finding overturns a prior insight.

After mapping completes, count the total number of files and compare against the frontmatter `scale`:
- Small: <5 files
- Medium: 5-15 files
- Large: >15 files

Note the result in the Stage Report later. If the actual count disagrees with the frontmatter scale, record `revised from X to Y` in the Stage Report (Step 7).

For `intent: bugfix` entities, prioritize root cause diagnosis. Trace from the reported symptom back to the underlying cause -- do not stop at the first file that mentions the symptom. Store the trace as insights with `[purpose]` tags.

---

## Step 3: Decomposition Analysis

Check the Captain Context Snapshot for `⚠️ likely-decomposable` on the **Scope flag** line.

Also independently assess whether Step 2's mapping discovered more than 20 files across 3 or more layers.

If either signal is true:
1. Analyze the work for natural boundaries. Are there independent sub-scopes? Is there a sensible dependency ordering between them?
2. If decomposition is warranted, write a `## Decomposition Recommendation` section following the format in `references/output-format.md`.
3. If decomposition is NOT warranted despite the Scope flag being present, note this in the Stage Report: `Scope flag present but decomposition not recommended: {reason}`.

If neither signal is true (no flag AND fewer than 20 files across fewer than 3 layers), skip this step entirely.

---

## Step 3.5: Consume α Markers

Scan the `## Brainstorming Spec` and `## Acceptance Criteria` sections for any `(needs clarification -- deferred to explore)` markers left by build-brainstorm.

For each marker, attempt codebase resolution:
- **Resolved**: replace the α marker with concrete content plus `(✓ resolved by explore: {evidence})`.
- **Unresolved**: convert the question into a Track C Open Question with the highest-priority Q number. α-marker questions always take the lowest Q numbers -- Q-1, Q-2, and so on -- followed by new questions discovered during exploration.

Count resolved vs. unresolved α markers. Both counts feed Step 7's Stage Report.

---

## Step 4: Gray Area Identification

Read `references/gray-area-templates.md`.

Apply the domain-specific template(s) matching the entity's domain(s) from Step 1. For multi-domain entities, apply ALL matching templates and deduplicate overlapping gray areas -- if two templates surface the same gray area, keep one instance and note both domains.

Skip a gray area when:
- It is already decided in the Brainstorming Spec (carries a D-01 or similar decision marker).
- The codebase has clear precedent with 2 or more consistent usages.
- Another entity in the same workflow already addresses it.

The output of this step is a deduplicated list of open gray areas, each ready for classification in Step 5.

---

## Step 5: Hybrid Classification

Read `references/hybrid-classification-heuristic.md`.

For each remaining gray area from Step 4, assign exactly one track:
- **Track A -- Assumption**: codebase has precedent. 2+ usages gives Confident; 1 usage gives Likely or Unclear depending on fit.
- **Track B -- Option Comparison**: no single precedent, but 2+ viable approaches exist (competing codebase patterns or standard domain options).
- **Track C -- Open Question**: genuinely open, no codebase signal, no standard domain answer. Also used for unresolved α markers from Step 3.5.

**Priority rule**: prefer A over B over C. The goal is to minimize captain interaction -- only escalate when the evidence genuinely requires it. When Track A is "Unclear" confidence, reconsider whether it should actually be Track B (competing patterns) or Track C (needs captain judgment).

---

## Step 6: Write to Entity Body

Read `references/output-format.md` for the exact section formats.

Emit the following sections (order matters for downstream parsing):

1. `## Assumptions` -- every Track A item, numbered A-1, A-2, A-3... Include statement, Confidence, and Evidence (`file:line -- description`).
2. `## Option Comparisons` -- every Track B item as a `###` subsection with the 5-column table (Option / Pros / Cons / Complexity / Recommendation). At least one option per comparison must be marked Recommended.
3. `## Open Questions` -- every Track C item, numbered Q-1, Q-2, Q-3... α-marker questions take the lowest numbers. Include Domain, Why it matters, and Suggested options (or `None -- captain input needed`).
4. `## Decomposition Recommendation` -- only if Step 3 determined it was warranted. Use the `⚠️` emoji prefix and list child entity slugs with domain tags.

Annotate the `## Brainstorming Spec` inline:
- **Confirmed**: append `(✓ confirmed by explore: {evidence})` to claims the codebase supports.
- **Contradicted**: append `(⚠ contradicted: {evidence} -- see Q-{n})` to claims the codebase refutes, and ensure the linked Q exists in the Open Questions section.

Preserve all existing content. Only modify sections this skill owns. Never modify the `## Directive` or `## Captain Context Snapshot` sections.

---

## Step 7: Stage Report

Write `## Stage Report: explore` as the LAST section of the entity body with exactly six metrics, in this order:

```markdown
## Stage Report: explore

- Files mapped: {count} across {layer list}
- Assumptions formed: {count} (Confident: {n}, Likely: {n}, Unclear: {n})
- Options surfaced: {count}
- Questions generated: {count}
- α markers resolved: {resolved} / {total}
- Scale assessment: {confirmed | revised from X to Y}
```

The FO and status script parse these fields. Keep the format exact.

---

## Rules

- **NEVER ask the captain questions.** Write findings to the entity body for build-clarify to consume. This skill is non-interactive by design.
- **NEVER skip codebase analysis.** Read actual files -- do not infer purpose from file names alone.
- **Prefer Track A over Track B over Track C.** Minimize what the captain needs to decide.
- **Use `--` (double dash) consistently**, never `—` (em dash). This matches the build-brainstorm convention and keeps α markers grep-compatible.
- **Store insights to context lake for every file read in depth.** Use tags `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`.
- **Respect the 20-file limit in Step 2.** If more than 20 files match, prioritize by relevance to APPROACH and note the truncation in the Stage Report.
- **Preserve existing entity body content.** Only modify sections this skill owns: Assumptions, Option Comparisons, Open Questions, Decomposition Recommendation, Stage Report. Never modify Directive or Captain Context Snapshot.
