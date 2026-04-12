---
name: build-distill
description: "Semi-interactive comparison skill for absorbing external system patterns into the build pipeline. Reads source and target skills, compares across 7 fixed dimensions, scores gaps with qualitative bands, and produces entity drafts for significant gaps. Manually triggered by SO or captain."
user-invocable: true
argument-hint: "[source-path] [target-path]"
---

# Build-Distill -- External Pattern Absorption

You are a semi-interactive skill invoked by the Science Officer or captain directly. You read an external system (source) and a build-* skill (target), comparing across 7 fixed dimensions to identify gaps worth importing into the build pipeline. Steps 1-4 are non-interactive; Step 5 presents each qualifying gap to the captain via AskUserQuestion; Step 6 is non-interactive.

This skill is a **meta-skill for pipeline evolution**, not a pipeline stage. It is manually triggered (A-2: never auto-dispatched by FO). Each run produces one comparison report and zero or more entity draft files.

**Six steps, in strict order. Steps 1-4 non-interactive, Step 5 semi-interactive (AskUserQuestion per gap), Step 6 non-interactive.**

---

## Tools Available

**Can use:**
- `Read` -- read source SKILL.md, delegation workflow files, target SKILL.md, reference docs
- `Grep` -- search for patterns within source or target skill directories
- `Glob` -- find files within skill directories
- `Bash` -- git commands only (branch, sha, log)
- `Write` / `Edit` -- comparison reports (Step 6), entity draft files (Step 5)
- `AskUserQuestion` -- Step 5 ONLY. Load via ToolSearch before Step 5:
  ```
  ToolSearch(query: "select:AskUserQuestion", max_results: 1)
  ```

**NOT available:**
- `Agent` -- this is a leaf skill, not an orchestrator. Build-distill reads source and target directly; it does NOT dispatch code-explorer subagents (no Agent tool available in leaf context).

---

## Input Contract

- **source**: path to external skill directory (e.g., `~/.claude/skills/gsd-discuss-phase/`) OR path to its SKILL.md directly
- **target**: path to build-* skill directory (e.g., `skills/build-clarify/`), OR the literal string `"none"` for complete-gap comparisons (roadmap case where no build-flow equivalent exists)
- Both paths resolved as absolute or relative to the invoking session's working directory

---

## Step 1: Source Read

Read the source SKILL.md. If it contains `@` file references (e.g., `@~/.claude/get-shit-done/workflows/discuss-phase.md`) or explicit delegation blocks pointing to workflow files, follow those references and read those workflow files too.

**Gotcha -- thin-orchestrator pattern**: GSD SKILL.md files are often 40-70 lines; the actual logic lives in the delegated workflow files. Comparing against the thin wrapper only misses 80-90% of GSD's behavior. Always follow delegation references.

Produce a structured source summary:
- **Purpose**: 1-sentence description
- **Interaction Model**: interactive / semi-interactive / non-interactive; flag modes (e.g., --auto, --chain, --power)
- **Step Count**: total steps across SKILL.md + any delegated workflow
- **Tools Used**: list by tool name
- **Output Artifacts**: what files the skill writes (paths and naming conventions)
- **Subagent Dispatch Pattern**: does it spawn subagents? fresh-context or shared-context?
- **Context Loading Strategy**: how prior context is loaded (STATE.md, PROJECT.md, CONTEXT.md, entity body, none)

---

## Step 2: Target Read

Read the target SKILL.md and its `references/*.md` files. Produce the same structured summary as Step 1.

**If target is `"none"`**: write `"No build-flow equivalent exists"` for all summary fields. Score all dimensions 1.0 in Step 4 per A-3.

---

## Step 3: Dimensional Comparison

Read `references/comparison-dimensions.md` (relative to this skill's directory: `skills/build-distill/references/comparison-dimensions.md`).

For each of the 7 fixed dimensions, write a structured comparison entry:

```
### Dimension N: {Dimension Name}

**Source**: {what the source does, 1-3 sentences, with file:line citations}
**Target**: {what the target does, 1-3 sentences, with file:line citations}
**Gap Direction**: source-stronger / target-stronger / equivalent / divergent
**Evidence**: {file:line or "No build-flow equivalent" if target is "none"}
```

Use `--` (double dash), never em dash in citations.

---

## Step 4: Gap Scoring

For each of the 7 dimensions, assign a qualitative band using the scoring guidance in `references/comparison-dimensions.md`:

- **Low** = 0.25 -- minor difference, not worth an entity
- **Medium** = 0.5 -- meaningful gap, threshold for entity drafting
- **High** = 0.75 -- significant capability gap
- **Complete absence** = 1.0 -- target is `"none"` OR target has zero capability in this dimension

**Evidence requirement**: every score MUST cite evidence (file:line, session observation, captain pain point). If no evidence exists for a gap, score **0.0** with notation `"no evidence of gap"`. No subjective "feels like a gap" scoring.

**Cross-comparison gap ranking table** (per Q-2 answer): include at the top of the comparison report a table ranking all dimensions by score for THIS run. When multiple runs exist, each report's header shows all comparisons ranked. Format:

```markdown
| Rank | Dimension | Score | Entity Draft? |
|------|-----------|-------|---------------|
| 1    | ...       | 0.75  | yes           |
...
```

---

## Step 5: Entity Drafting (semi-interactive)

Load `AskUserQuestion` via ToolSearch before this step.

For each dimension scoring **>= 0.5**, in descending score order:

1. Present to captain via `AskUserQuestion`:
   - `header`: `"Gap: {dimension name}"` (12 chars max)
   - `question`: `"Gap scored {score} in {dimension}. Proposed entity: '{title}'. Draft acceptance criteria: {2 criteria}. Create entity, skip, or modify?"`
   - `options`: `["Create", "Skip", "Modify (describe changes)"]`

2. On **Create**: write entity file to `docs/build-pipeline/` with:
   - YAML frontmatter: `id: {placeholder}`, `title: {proposed title}`, `status: draft`, `context_status:`, `source: build-distill`, `created: {ISO 8601 date}`, `intent: feature`, `scale:`, `project: spacedock`
   - `## Directive`: describe the gap and what importing this capability means for the build pipeline
   - `## Captain Context Snapshot`: reference the comparison report path, source skill, gap dimension, gap score
   - `## Acceptance Criteria`: at least 2 testable criteria

3. On **Skip**: record skip reason in the audit report (Step 6). No entity file written.

4. On **Modify**: collect captain's changes (plain text follow-up), apply to proposed entity content, then write entity file.

**NEVER skip the AskUserQuestion in this step.** Captain sees every gap >= 0.5. This prevents the "silently skipped signal" failure mode from entity 067's ad-hoc distillation experience.

---

## Step 6: Audit Report

Write the full comparison report to:

```
docs/build-pipeline/_docs/distillations/{source-name}-vs-{target-name}.md
```

Report structure:
1. **Header**: date (ISO 8601), source path, target path, cross-comparison gap ranking table (from Step 4)
2. **Source Summary**: the structured summary from Step 1
3. **Target Summary**: the structured summary from Step 2
4. **Dimensional Comparison**: the 7 structured entries from Step 3
5. **Gap Scores**: table with dimension / band / score / evidence / entity-draft-status (created/skipped/pending)
6. **Proposed Entity Drafts**: subsection listing qualifying gaps with entity file paths (or skip reasons)
7. **Entity 067 cross-reference** (for GSD first pass only): note that entity 067 (TDD distillation) was the pre-skill exemplar; see `docs/build-pipeline/_docs/distillations/067-tdd-pre-skill-exemplar.md`

---

## Output Contract

- One comparison report per invocation in `docs/build-pipeline/_docs/distillations/`
- Zero or more entity draft files in `docs/build-pipeline/`
- **No modifications to source or target skill files** -- build-distill is read-only on both
- No modifications to `skills/`, `agents/`, or `references/` directories of any other skill

---

## Rules

- **NEVER modify source or target skills** -- build-distill is strictly read-only on both
- **NEVER skip the AskUserQuestion in Step 5** -- captain sees every gap >= 0.5; silently skipping misses high-value signals (proven in entity 067 experience)
- **NEVER assign gap scores without evidence** -- "no evidence" always scores 0.0, not the dimension default
- **NEVER produce entity drafts for gaps scoring < 0.5** -- threshold is firm; the captain uses Step 5 to override upward, not the skill
- **ALWAYS follow delegation references in source skills** -- compare against full behavior, not thin wrappers
- **Use `--` (double dash)** in markers and annotations, never `--` em dash. Matches build-brainstorm and build-explore conventions.
- **Dimensions are fixed** -- always load from `references/comparison-dimensions.md`. Do not add or remove dimensions per-run. Fixed 7 for cross-run comparability (O-1 decision, captain 2026-04-12).
- **Gap scores use qualitative bands** -- Low/Medium/High/Complete-absence only, plus 0.0 for no-evidence. No continuous numeric scoring.
