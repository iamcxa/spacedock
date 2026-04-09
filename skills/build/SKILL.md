---
name: build
description: "Use when starting new feature or bugfix development through the build pipeline. Triggers on '/build', 'new feature', 'start building', or when user has a development idea to turn into code."
user-invocable: true
argument-hint: "[description | SC-123 | --project path]"
---

# Build — Feature Development Launcher

You are launching a new feature or bugfix through the build pipeline. This skill handles the **pre-workflow phase**: distilling the user's directive into a complete spec, then creating a pipeline entity as a draft for exploration.

Features enter the build pipeline with a distilled spec. This skill produces that spec.

**Three phases, in order. Do not skip or combine.**

---

## Args Extraction

If the user's invocation includes text beyond the command:

- **Free text** (e.g., `/build add coverage delta to quality stage`) → treat as feature description, use in Phase II.
- **Linear issue ID** (e.g., `/build SC-123`) → fetch issue details via Linear MCP, use title + description as brainstorming input.
- **Both** (e.g., `/build SC-123 focus on the API layer`) → fetch issue, overlay user's focus.

---

## Phase I: Context Gathering

### Step 1 — Detect Target Project

```bash
basename $(git rev-parse --show-toplevel 2>/dev/null || echo "unknown")
```

Announce (no confirmation needed):

> Building in **{project_name}** (`{project_root}`). Override with `/build --project <path>`.

If user provides `--project`, resolve that path instead.

### Step 2 — Locate Build Pipeline

Find the workflow directory. Try sources in order, use the first match:

1. `{project_root}/` — search for `README.md` files with `commissioned-by: spacedock@*` frontmatter
2. `~/.claude/workflows/` — user-scoped workflows (cross-project pipelines)

If found, read the README frontmatter to confirm `commissioned-by: spacedock@*`. Store as `{workflow_dir}`.

If not found:

> No build pipeline found. Create one with `/spacedock:commission`, or specify the workflow directory.

Stop here — the pipeline must exist before `/build` can create entities.

### Step 3 — Linear Issue (if provided)

If args contain a Linear issue ID:
1. Fetch issue details (title, description, acceptance criteria, labels) via Linear MCP
2. Store as brainstorming input
3. Set `{issue_ref}` for entity frontmatter

If Linear MCP is unavailable: warn "Linear MCP not connected — using issue ID as reference only, provide details manually." Proceed with user's description.

If no issue: proceed with user's description only.

---

## Phase II: Spec Distillation

Invoke `Skill: "spacedock:build-brainstorm"` with:
- The user's directive (free text, Linear issue details, or both from Phase I)
- Project context: `{workflow_dir}`, git state, `{issue_ref}` if available

The build-brainstorm skill:
- Enriches context (related entities, session journal, git state)
- Classifies directive domain (visual/behavioral/runnable/readable/organizational)
- Distills APPROACH / ALTERNATIVE / GUARDRAILS / RATIONALE
- Extracts ≥2 testable acceptance criteria with `(how to verify)` annotations
- Assesses intent and scale
- Checks scope for decomposition signals
- Uses α markers for unclear sections (never asks questions)
- Returns structured sections as text

**After build-brainstorm returns**, extract the output sections:
- `## Directive` -- captain's verbatim words (immutable)
- `## Captain Context Snapshot` -- enriched context including domain classification
- `## Brainstorming Spec` -- APPROACH, ALTERNATIVE, GUARDRAILS, RATIONALE
- `## Acceptance Criteria` -- testable criteria with verification methods

Also extract from the output:
- `intent` (feature or bugfix)
- `scale` (Small, Medium, or Large)

**Quality floor**: Acceptance Criteria must have ≥2 testable items. If all criteria are α-marked, warn the captain:

> ⚠️ Directive too vague for acceptance criteria. Consider re-running `/build` with more detail, or proceed and let `build-explore` derive criteria from codebase analysis.

Proceed regardless -- α markers are valid; they'll be resolved by explore + clarify stages.

---

## Phase III: Entity Creation

### Step 1 -- Assess Intent and Scale

Extract `intent` and `scale` from build-brainstorm output. If either is α-marked:

> **Intent:** {value or "(needs clarification)"} | **Scale:** {value or "(needs clarification)"}
> α-marked values will be resolved during explore stage.

If both are present (no α markers), announce without waiting for confirmation:

> **Intent:** {feature | bugfix} | **Scale:** {Small | Medium | Large}

Check the target project's CLAUDE.md for a "Scale Overrides" table. Apply overrides if found.

Do NOT wait for user confirmation -- proceed directly to entity generation. The `/build` flow is non-interactive after Phase I args extraction.

### Step 2 -- Generate Entity File

**Determine next ID** by scanning existing entities (active + archived):

```bash
# Find highest existing ID
(ls {workflow_dir}/*.md {workflow_dir}/_archive/*.md 2>/dev/null || true) \
  | xargs grep -l "^id:" 2>/dev/null \
  | xargs grep "^id:" \
  | sed 's/.*id: *//' \
  | sort -n \
  | tail -1
```

Next ID = highest + 1, zero-padded to 3 digits.

**Generate slug** from the title: lowercase, spaces → hyphens, strip non-alphanumeric (except hyphens), max 50 chars.

**Create entity file** at `{workflow_dir}/{slug}.md`:

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
parent:
children:
---

{## Directive section -- paste verbatim from brainstorm output}

{## Captain Context Snapshot -- paste from brainstorm output}

{## Brainstorming Spec -- paste from brainstorm output}

{## Acceptance Criteria -- paste from brainstorm output}

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
```

### Step 3 -- Commit

**Note**: `{workflow_dir}` may be in a different git repo than CWD (e.g., plugin-bundled or `~/.claude/workflows/`). The commit targets the workflow directory's repo.

```bash
cd {workflow_dir}
git add {slug}.md
git commit -m "seed: {slug} -- {title}"
```

### Step 4 -- Report and Next Steps

> Entity created: `{workflow_dir}/{slug}.md` (ID: {id}, status: draft, context_status: pending)
>
> **Next steps** -- pick one:
>
> | Option | Command | When |
> |--------|---------|------|
> | **Explore now** | `FO explore {slug}` | Start codebase analysis + question generation |
> | **Park as draft** | Nothing -- entity stays in draft | Seed more features first, explore later |
> | **Explore all drafts** | `FO explore all pending` | Batch-launch exploration for all parked drafts |
>
> After explore completes, use `/science {slug}` to clarify context before execution.

---

## Batch Mode

If the user provides a **complete spec** -- all required fields present -- skip Phase II distillation:

| Required Field | Minimum |
|----------------|---------|
| APPROACH | >1 sentence describing the chosen approach |
| ALTERNATIVE | ≥1 alternative considered with rejection reason |
| GUARDRAILS | Explicit constraints, or "Checked -- no notable constraints" |
| Acceptance Criteria | ≥2 testable items with `(how to verify)` annotations |
| intent + scale | Both specified |

If any field is missing or below minimum → Phase II distillation runs normally.

1. Extract all provided fields into the entity body sections
2. Announce: "Complete spec detected -- skipping distillation."
3. Proceed directly to Phase III (no confirmation needed)

This enables rapid seeding: `/build` with a complete spec → entity creation → done.

---

## Multiple Features

If the user wants to seed multiple features at once:

1. Run Phase II distillation for each (sequentially)
2. Create all entities in Phase III
3. Single commit: `seed: {N} features -- {slug1}, {slug2}, ...`
4. Present all entities in the final report

For bulk seeding without distillation (e.g., migrating from a backlog), use `/spacedock:commission` with seed entities instead.

---

## Rules

- **Three phases in strict order** -- Phase I before II before III, no combining or reordering
- **Phase II distillation is mandatory** for non-batch invocations -- "obvious" or "simple" features still run distillation. Only a complete spec (all required fields at minimum quality) skips Phase II.
- **Entity must have ≥2 testable acceptance criteria** before creation -- vague criteria ("works correctly", "no bugs") do not count
- **Workflow search must verify entity-type** -- finding `commissioned-by: spacedock@*` is necessary but not sufficient. Confirm the workflow's `entity-type` matches what build expects (e.g., `feature`).
- **Commit targets the workflow repo** -- `{workflow_dir}` may be in a different git repo than CWD. Always `cd {workflow_dir}` before git operations.
- **Linear MCP is optional** -- if unavailable, warn and proceed with user-provided description only. Never block on missing MCP.
