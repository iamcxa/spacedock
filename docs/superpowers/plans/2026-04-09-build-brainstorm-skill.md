# Build-Brainstorm Skill — Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `superpowers:brainstorming` dependency in `/build` with a purpose-built `build-brainstorm` skill that produces draft entities with the new Spacebridge entity schema.

**Architecture:** New skill `spacedock:build-brainstorm` is a non-interactive spec distiller. `/build` Phase II invokes it instead of `superpowers:brainstorming`. Entity frontmatter gains `context_status`, `created`, `profile`, `auto_advance` fields. Entity body gains new section structure (Directive, Captain Context Snapshot, etc.). The skill uses α markers for unclear sections instead of asking questions.

**Tech Stack:** Markdown skill files (SKILL.md + references/), no runtime code changes.

**Spec:** `docs/superpowers/specs/2026-04-09-build-studio-plugin-and-science-officer.md` §5, §6

---

### Task 1: Create build-brainstorm skill directory and references

**Files:**
- Create: `skills/build-brainstorm/SKILL.md`
- Create: `skills/build-brainstorm/references/domain-classification.md`
- Create: `skills/build-brainstorm/references/alpha-marker-protocol.md`

- [ ] **Step 1: Create the skill directory**

```bash
mkdir -p skills/build-brainstorm/references
```

- [ ] **Step 2: Write `references/domain-classification.md`**

This reference defines the 5-domain classification heuristic borrowed from GSD. The skill loads it as context.

```markdown
# Domain Classification Heuristic

Classify the captain's directive into one or more domains. This determines which gray area templates `build-explore` will use downstream.

## Domains

### User-facing Visual
**Signal words:** UI, dashboard, page, component, layout, display, render, show, view, screen, modal, dialog, form, button, input, table, list, card, chart, graph, icon, badge, tooltip, animation, responsive, mobile, desktop
**Gray areas downstream:** Layout style, loading behavior, state handling, responsive breakpoints, animation/transitions

### Behavioral / Callable
**Signal words:** API, endpoint, route, handler, middleware, request, response, validate, authenticate, authorize, webhook, callback, contract, schema, protocol, interface
**Gray areas downstream:** Input validation, error format, idempotency, rate limiting, versioning

### Runnable / Invokable
**Signal words:** CLI, command, script, tool, run, execute, invoke, flag, option, argument, output, format, batch, parallel, schedule, cron, daemon, process
**Gray areas downstream:** Invocation modes, output format, exit codes, concurrency model

### Readable / Textual
**Signal words:** doc, documentation, README, guide, tutorial, spec, report, log, message, template, format, content, text, write, describe, explain
**Gray areas downstream:** Structure/hierarchy, tone/audience, depth vs breadth, cross-referencing

### Organizational / Data-transforming
**Signal words:** schema, migration, table, column, field, index, relation, transform, pipeline, ETL, import, export, sync, merge, deduplicate, classify, group, sort, filter, aggregate
**Gray areas downstream:** Classification criteria, exception handling, grouping strategy, schema evolution

## Rules

1. A directive can match **multiple domains**. Record all that apply.
2. If no signal words match, infer from the APPROACH section after distillation.
3. Record the domain(s) in the `## Captain Context Snapshot` section under `**Domain:**`.
4. Do NOT use domain classification to generate questions — that is `build-explore`'s job.
```

Write this to `skills/build-brainstorm/references/domain-classification.md`.

- [ ] **Step 3: Write `references/alpha-marker-protocol.md`**

```markdown
# α Marker Protocol

When `build-brainstorm` cannot fill a section from the directive alone, it marks the section with an α marker instead of asking the captain or guessing.

## Marker Format

```
(needs clarification — deferred to explore)
```

Or with specific context:

```
(needs clarification: directive did not specify whether this targets channel server or ctl.sh server — deferred to explore)
```

## When to Mark

- **APPROACH** cannot be determined → mark the entire section
- **ALTERNATIVE** has no obvious fork → mark with: `(needs clarification — no obvious alternative from directive alone)`
- **GUARDRAILS** has no constraints → use standard empty note: `Checked — no notable constraints identified.` (this is NOT an α marker)
- **Acceptance Criteria** cannot produce ≥2 testable items → mark with: `(needs clarification — explore will derive from codebase analysis)`
- **intent** or **scale** is ambiguous → mark in frontmatter comment AND in Captain Context Snapshot

## When NOT to Mark

- Do NOT mark a section just because you're uncertain about the *best* approach — pick the most likely interpretation and state it. Explore will verify.
- Do NOT mark GUARDRAILS as α when there are genuinely no constraints. Use the standard empty note.
- Do NOT mark RATIONALE — if you have an APPROACH, you can always explain why you chose it.

## Downstream Consumption

`build-explore` (§7 Step 3) scans for α markers as its FIRST action. Each marker becomes a HIGH PRIORITY item that explore must either resolve from codebase analysis or convert into an explicit Open Question.

α markers that survive through explore become Open Questions for `build-clarify`.
```

Write this to `skills/build-brainstorm/references/alpha-marker-protocol.md`.

- [ ] **Step 4: Commit reference docs**

```bash
git add skills/build-brainstorm/references/
git commit -m "feat(build-brainstorm): add domain classification and alpha marker reference docs"
```

---

### Task 2: Write the build-brainstorm SKILL.md

**Files:**
- Create: `skills/build-brainstorm/SKILL.md`

- [ ] **Step 1: Write the skill file**

```markdown
---
name: build-brainstorm
description: "Non-interactive spec distiller for /build. Takes a captain's directive and produces a structured brainstorming spec with APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE and acceptance criteria. Uses α markers for unclear sections instead of asking questions."
---

# Build-Brainstorm — Directive-to-Spec Distiller

You are distilling a captain's directive into a structured brainstorming spec for a build pipeline entity. You do NOT interact with the captain — produce the best spec you can from the directive alone, and mark unclear areas with α markers.

**Input:** You receive the captain's directive, project context (workflow dir, git state), and optionally a Linear issue body.

**Output:** Structured sections to be assembled into an entity file by the `/build` skill.

---

## Tools Available

- `Read`, `Grep`, `Glob` — explore the project codebase
- `Bash` — git state queries only
- Context-lake MCP: `search_journal`, `search_insights` — prior session context
- Linear MCP (if issue ref provided) — fetch issue details

**Tools NOT available:** `AskUserQuestion` — you must NEVER ask the captain questions. Use α markers instead.

---

## Flow

### Step 1: Context Enrichment

Gather context WITHOUT interacting with the captain:

1. **Issue reference** (if provided): Fetch via Linear MCP → extract title, description, labels, acceptance criteria.
2. **Related entities**: Grep `{workflow_dir}/*.md` and `{workflow_dir}/_archive/*.md` for entities with titles containing keywords from the directive. List top 3 matches with ID, title, status.
3. **Session context**: Search context lake (`search_journal`) for the 3 most recent entries matching directive keywords. Extract 1-sentence summaries.
4. **Git state**: Capture current branch, HEAD sha, and 3 most recent commit messages.

### Step 2: Domain Classification

Read `references/domain-classification.md`. Classify the directive into one or more of:
- User-facing Visual
- Behavioral / Callable
- Runnable / Invokable
- Readable / Textual
- Organizational / Data-transforming

Use signal words from the reference doc. Record result — this is passed downstream to `build-explore`.

### Step 3: Spec Distillation

Produce four sections. Follow `references/alpha-marker-protocol.md` for unclear areas.

**APPROACH** — 1 paragraph. The most likely interpretation of the directive. If the directive provides a specific technical approach, use it. If not, infer from codebase patterns (read 2-3 relevant files if needed). If truly ambiguous, α-mark.

**ALTERNATIVE** — 1 paragraph. The most obvious alternative approach + why it's rejected. Assign Decision ID `D-01` to the rejection. If no obvious alternative exists, α-mark.

**GUARDRAILS** — 3-5 bullet points. Constraints from:
- The directive itself ("don't add new dependencies")
- The project's CLAUDE.md (read it for project conventions)
- Related entities (what they already established)
- If genuinely no constraints: `Checked — no notable constraints identified.`

**RATIONALE** — 1 paragraph. Why APPROACH over ALTERNATIVE. This section is NEVER α-marked — if you have an APPROACH, explain why you chose it.

### Step 4: Acceptance Criteria

Produce ≥2 testable criteria. Each criterion must have a `(how to verify)` annotation.

Format:
```
- {observable behavior} (how to verify: {specific test method})
```

If the directive is too vague for testable criteria, α-mark individual criteria:
```
- (needs clarification — explore will derive from codebase analysis)
```

### Step 5: Intent & Scale Assessment

- **intent**: `feature` or `bugfix`. Infer from directive keywords ("fix", "bug", "broken" → bugfix; everything else → feature). If Linear issue has bug label → bugfix.
- **scale**: `Small` (<5 files), `Medium` (5-15 files), `Large` (>15 files). Estimate from APPROACH scope. Check CLAUDE.md for "Scale Overrides" table. If ambiguous, α-mark.

### Step 6: Self-Review

Before returning output, scan your work:
1. Count α markers. If >3, the directive may be too vague — add a note: `⚠️ High uncertainty: {n} α markers. Captain may want to provide more detail before exploring.`
2. Verify APPROACH and ALTERNATIVE are genuinely different (not the same idea restated).
3. Verify Acceptance Criteria are testable (not vague like "works correctly").
4. Verify GUARDRAILS don't contradict APPROACH.

### Step 7: Return Output

Return the following sections as plain text. The `/build` skill will assemble them into the entity file.

```
## Directive

> {captain's verbatim directive, preserved exactly as received}

## Captain Context Snapshot

- **Repo**: {branch} @ {sha}
- **Session**: {1-sentence summary from journal, or "No recent session context"}
- **Domain**: {classified domain(s)}
- **Related entities**: {id — title (status)} or "None found"
- **Created**: {ISO 8601 timestamp}

## Brainstorming Spec

**APPROACH**: {paragraph}

**ALTERNATIVE**: {paragraph} — D-01 {rejection reason}

**GUARDRAILS**:
- {bullet}
- {bullet}
- ...

**RATIONALE**: {paragraph}

## Acceptance Criteria

- {criterion 1} (how to verify: {method})
- {criterion 2} (how to verify: {method})
- ...
```

---

## Rules

- **NEVER ask the captain questions.** Use α markers for anything unclear.
- **NEVER invoke other skills.** You are a leaf skill, not an orchestrator.
- **NEVER write files.** Return text output only — `/build` handles file creation.
- **Keep it lightweight.** Read at most 5 files for context. This is a quick distillation, not a deep exploration — that's `build-explore`'s job.
- **Preserve the directive verbatim.** The `## Directive` section must contain the captain's exact words, not your paraphrase.
```

Write this to `skills/build-brainstorm/SKILL.md`.

- [ ] **Step 2: Commit the skill file**

```bash
git add skills/build-brainstorm/SKILL.md
git commit -m "feat(build-brainstorm): add SKILL.md — non-interactive spec distiller"
```

---

### Task 3: Modify `/build` skill to use build-brainstorm

**Files:**
- Modify: `skills/build/SKILL.md:69-103` (Phase II section)
- Modify: `skills/build/SKILL.md:109-171` (Phase III entity template)

- [ ] **Step 1: Replace Phase II brainstorming invocation**

In `skills/build/SKILL.md`, replace the entire `## Phase II: Brainstorming` section (lines 69-103) with:

```markdown
## Phase II: Spec Distillation

Invoke `Skill: "spacedock:build-brainstorm"` with:
- The user's directive (free text, Linear issue details, or both from Phase I)
- Project context: `{workflow_dir}`, git state, `{issue_ref}` if available

The build-brainstorm skill:
- Enriches context (related entities, session journal, git state)
- Classifies directive domain (visual/behavioral/runnable/readable/organizational)
- Distills APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE
- Extracts ≥2 testable acceptance criteria
- Uses α markers for unclear sections (never asks questions)
- Returns structured sections as text

**After build-brainstorm returns**, extract the output sections:
- `## Directive` — captain's verbatim words (immutable)
- `## Captain Context Snapshot` — enriched context
- `## Brainstorming Spec` — APPROACH, ALTERNATIVE, GUARDRAILS, RATIONALE
- `## Acceptance Criteria` — testable criteria with verification methods

Also extract from the brainstorm output:
- `intent` (feature or bugfix)
- `scale` (Small, Medium, or Large)

**Quality floor**: Acceptance Criteria must have ≥2 testable items. If all criteria are α-marked, warn the captain:

> ⚠️ Directive too vague for acceptance criteria. Consider re-running `/build` with more detail, or proceed and let `build-explore` derive criteria from codebase analysis.

Proceed regardless — α markers are valid; they'll be resolved by explore + clarify stages.
```

- [ ] **Step 2: Update Phase III entity template**

In `skills/build/SKILL.md`, replace the entity template in Phase III Step 2 (the YAML frontmatter + body template, lines ~140-171) with:

```yaml
---
id: {next_id}
title: {feature title from brainstorm output}
status: draft
context_status: pending
source: /build
created: {ISO 8601 timestamp}
started:
completed:
verdict:
score:
worktree:
issue: {issue_ref or empty}
pr:
intent: {from brainstorm output}
scale: {from brainstorm output}
project: {project_name}
profile:
auto_advance:
---

{## Directive section — paste verbatim from brainstorm output}

{## Captain Context Snapshot — paste from brainstorm output}

{## Brainstorming Spec — paste from brainstorm output}

{## Acceptance Criteria — paste from brainstorm output}

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Canonical References

(clarify stage will populate)
```

Key changes from current template:
- `status: draft` (was `explore`) — entities now park in draft
- `context_status: pending` — new field
- `created:` — new field with ISO 8601 timestamp
- `profile:` — new field, empty until post-clarify
- `auto_advance:` — new field for hybrid handoff
- Body sections: added Directive, Captain Context Snapshot, Open Questions, Assumptions, Option Comparisons, Canonical References

- [ ] **Step 3: Update Phase III Step 1 — remove interactive confirmation**

Replace the current Phase III Step 1 (lines 109-119, which presents intent/scale and waits for user confirmation) with:

```markdown
### Step 1 — Assess Intent and Scale

Extract `intent` and `scale` from build-brainstorm output. If either is α-marked:

> **Intent:** {value or "(needs clarification)"} | **Scale:** {value or "(needs clarification)"}
> α-marked values will be resolved during explore stage.

If both are present (no α markers), announce without waiting for confirmation:

> **Intent:** {feature | bugfix} | **Scale:** {Small | Medium | Large}

Check the target project's CLAUDE.md for a "Scale Overrides" table. Apply overrides if found.

Do NOT wait for user confirmation — proceed directly to entity generation. The `/build` flow is non-interactive after Phase I args extraction.
```

- [ ] **Step 4: Update Phase III Step 4 — adjust next steps table**

Replace the next steps table (lines ~186-197) to reflect the new lifecycle:

```markdown
### Step 4 — Report and Next Steps

> Entity created: `{workflow_dir}/{slug}.md` (ID: {id}, status: draft, context_status: pending)
>
> **Next steps** — pick one:
>
> | Option | Command | When |
> |--------|---------|------|
> | **Explore now** | `FO explore {slug}` | Start codebase analysis + question generation |
> | **Park as draft** | Nothing — entity stays in draft | Seed more features first, explore later |
> | **Explore all drafts** | `FO explore all pending` | Batch-launch exploration for all parked drafts |
>
> After explore completes, use `/science {slug}` to clarify context before execution.
```

- [ ] **Step 5: Update the Batch Mode section**

Replace the Batch Mode section (lines 201-219) to align with the new non-interactive flow:

```markdown
## Batch Mode

If the user provides a **complete spec** — all required fields present — skip Phase II distillation:

| Required Field | Minimum |
|----------------|---------|
| APPROACH | >1 sentence describing the chosen approach |
| ALTERNATIVE | ≥1 alternative considered with rejection reason |
| GUARDRAILS | Explicit constraints, or "Checked — no notable constraints" |
| Acceptance Criteria | ≥2 testable items with `(how to verify)` annotations |
| intent + scale | Both specified |

If any field is missing or below minimum → Phase II distillation runs normally.

1. Extract all provided fields into the entity body sections
2. Announce: "Complete spec detected — skipping distillation."
3. Proceed directly to Phase III (no confirmation needed)

This enables rapid seeding: `/build` with a complete spec → entity creation → done.
```

- [ ] **Step 6: Commit all build skill modifications**

```bash
git add skills/build/SKILL.md
git commit -m "refactor(build): replace superpowers:brainstorming with build-brainstorm skill

- Phase II now invokes spacedock:build-brainstorm (non-interactive distiller)
- Entity template updated: status=draft, added context_status/created/profile/auto_advance
- Entity body gains Directive, Captain Context Snapshot, Open Questions, Assumptions,
  Option Comparisons, Canonical References sections
- Phase III no longer waits for user confirmation (non-interactive after args)
- Next steps updated for park-then-trigger lifecycle"
```

---

### Task 4: Verify skill loading and integration

**Files:**
- Read: `skills/build-brainstorm/SKILL.md` (verify exists and is valid)
- Read: `skills/build/SKILL.md` (verify references are correct)

- [ ] **Step 1: Verify build-brainstorm skill structure**

```bash
# Check skill file exists with correct frontmatter
head -5 skills/build-brainstorm/SKILL.md
# Expected:
# ---
# name: build-brainstorm
# description: "Non-interactive spec distiller..."
# ---

# Check references exist
ls skills/build-brainstorm/references/
# Expected:
# alpha-marker-protocol.md
# domain-classification.md
```

- [ ] **Step 2: Verify build skill references build-brainstorm correctly**

```bash
grep -n "build-brainstorm" skills/build/SKILL.md
# Expected: line in Phase II referencing Skill: "spacedock:build-brainstorm"
```

- [ ] **Step 3: Verify entity template has new fields**

```bash
grep -n "context_status\|auto_advance\|Open Questions\|Assumptions\|Option Comparisons\|Canonical References" skills/build/SKILL.md
# Expected: all six patterns found in the entity template section
```

- [ ] **Step 4: Verify no remaining references to superpowers:brainstorming**

```bash
grep -rn "superpowers:brainstorming" skills/build/
# Expected: NO matches (all references replaced)
```

- [ ] **Step 5: Run a dry-run test**

Invoke `/build test: verify build-brainstorm produces a valid draft entity` in a test context. Verify:
- Entity file created with `status: draft` (not `explore`)
- `context_status: pending` present in frontmatter
- `## Directive` section contains verbatim input
- `## Open Questions` section present (empty placeholder)
- No `superpowers:brainstorming` was invoked

If dry-run passes, proceed to final commit. If issues found, fix and re-verify.

- [ ] **Step 6: Final integration commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(build): address integration issues from dry-run verification"
```

Only if Step 5 revealed issues. Skip if clean.

---

### Task 5: Update build pipeline README (add clarify stage placeholder)

**Files:**
- Modify: `docs/build-pipeline/README.md` (profiles + stage list)

- [ ] **Step 1: Read current README to find exact profile definitions**

```bash
grep -n "profiles:\|full:\|standard:\|express:" docs/build-pipeline/README.md
```

Identify the exact lines containing the profile arrays.

- [ ] **Step 2: Add `clarify` stage to profiles**

Insert `clarify` between `explore` and `plan` (or between `explore` and `research` for full profile):

```yaml
profiles:
  full:     [draft, brainstorm, explore, clarify, research, plan, execute, quality, seeding, e2e, docs, pr-draft, pr-review, shipped]
  standard: [draft, brainstorm, explore, clarify, plan, execute, quality, pr-draft, pr-review, shipped]
  express:  [draft, brainstorm, execute, quality, shipped]
```

Express profile does NOT include clarify — it's for small, well-defined entities that skip context gathering.

- [ ] **Step 3: Add clarify stage definition**

After the explore stage definition in README, add:

```yaml
- name: clarify
  worktree: false
  manual: true
  gate: true
  skill: spacebridge:build-clarify
  # Science Officer runs interactive AskUserQuestion loop with captain.
  # Resolves: Open Questions, Assumptions, Option Comparisons from explore.
  # Produces: confirmed context, canonical references, profile assignment.
  # manual: true — Science Officer invocation is captain-initiated,
  # not auto-dispatched by FO.
  # gate: true — captain must approve context completeness before advancing.
  #
  # FALLBACK (no spacebridge installed):
  # Captain reviews entity body manually, edits Open Questions/Assumptions
  # directly, then advances status to plan via FO command.
```

- [ ] **Step 4: Commit README changes**

```bash
git add docs/build-pipeline/README.md
git commit -m "feat(pipeline): add clarify stage between explore and plan

- clarify stage added to full and standard profiles (not express)
- manual: true — captain-initiated via Science Officer
- gate: true — requires context completeness approval
- skill: spacebridge:build-clarify (with inline fallback)"
```

---

## Execution Order & Dependencies

```
Task 1 (reference docs)
  └──▶ Task 2 (SKILL.md — references Task 1's docs)
         └──▶ Task 3 (modify /build — references Task 2's skill)
                └──▶ Task 4 (verify integration)
                       └──▶ Task 5 (README — independent but ordered last for clean history)
```

All tasks are sequential. No parallelization — each builds on the previous.

## Rollback

If Phase A causes issues:
1. Revert `/build` to invoke `superpowers:brainstorming` (restore old Phase II)
2. Revert entity template to `status: explore` (remove new fields)
3. `skills/build-brainstorm/` can stay — it's inert if not invoked

The clarify stage in README has `manual: true` + `skill: spacebridge:build-clarify` — since spacebridge doesn't exist yet, entities will never enter this stage. It's a no-op placeholder until Phase C.
