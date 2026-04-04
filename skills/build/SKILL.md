---
name: build
description: "Use when starting new feature or bugfix development through the build pipeline. Interactive brainstorming → spec → entity creation → FO dispatch. Triggers on '/build', 'new feature', 'start building', or when user has a development idea to turn into code."
user-invocable: true
---

# Build — Feature Development Launcher

You are launching a new feature or bugfix through the build pipeline. This skill handles the **pre-workflow phase**: brainstorming with the user to produce a complete spec, then creating a pipeline entity for the first officer to process.

Features enter the build pipeline with a completed brainstorming spec. This skill produces that spec.

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

Confirm with user:

> Target project: **{project_name}** (`{project_root}`)
> Correct? (If not, specify the target project.)

If user provides a different project, resolve its root path.

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
1. Fetch issue details (title, description, acceptance criteria, labels)
2. Store as brainstorming input
3. Set `{issue_ref}` for entity frontmatter

If no issue: proceed with user's description only.

---

## Phase II: Brainstorming

Invoke `Skill: "superpowers:brainstorming"` with the user's idea (or Linear issue details) as the starting context.

The brainstorming skill explores:
- What the user wants to achieve
- Possible approaches and alternatives
- Constraints, guardrails, and risks
- Acceptance criteria

**After brainstorming completes**, extract the output into the entity spec format. The brainstorming skill produces structured output — map it to:

```
APPROACH:     {chosen approach}
ALTERNATIVE:  {alternatives considered and why rejected}
GUARDRAILS:   {constraints, risks, boundaries}
RATIONALE:    {why this approach was chosen over alternatives}
```

And a separate **Acceptance Criteria** list — concrete, testable conditions.

If the brainstorming output doesn't clearly separate these, ask the user to confirm:

> Here's the spec I'll create from our brainstorming:
>
> **Approach:** {summary}
> **Guardrails:** {summary}
> **Acceptance Criteria:**
> - {criterion 1}
> - {criterion 2}
>
> Anything to add or change?

---

## Phase III: Entity Creation

### Step 1 — Assess Intent and Scale

Present assessment based on brainstorming findings:

> **Intent:** {feature | bugfix} — {reasoning}
> **Scale:** {Small | Medium} — {file count estimate from brainstorming}

Check the target project's CLAUDE.md for a "Scale Overrides" table. Apply overrides and flag if scale was adjusted:

> Scale adjusted: **Medium** (CLAUDE.md override: "add field to domain" involves 7+ files)

Wait for user confirmation.

### Step 2 — Generate Entity File

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
title: {feature title}
status: explore
source: /build brainstorming
started:
completed:
verdict:
score:
worktree:
issue: {issue_ref or empty}
pr:
intent: {feature|bugfix}
scale: {Small|Medium}
project: {project_name}
---

## Brainstorming Spec

APPROACH:     {from Phase II}
ALTERNATIVE:  {from Phase II}
GUARDRAILS:   {from Phase II}
RATIONALE:    {from Phase II}

## Acceptance Criteria

- {criterion 1}
- {criterion 2}
- ...
```

### Step 3 — Commit

```bash
cd {workflow_dir}
git add {slug}.md
git commit -m "seed: {slug} — {title}"
```

### Step 4 — Report and Next Steps

> Entity created: `{workflow_dir}/{slug}.md` (ID: {id}, status: explore)
>
> **Next steps** — pick one:
>
> | Option | Command | When |
> |--------|---------|------|
> | **Process now** (single entity) | `claude --agent spacedock:first-officer "{slug}"` | You want this feature built immediately |
> | **Queue for batch** | Nothing — FO picks it up on next run | You're seeding multiple features first |
> | **Process all pending** | `claude --agent spacedock:first-officer` | Ready to run the full pipeline |
>
> The first officer will take it from `explore` through `research → plan → execute → quality → pr-review → shipped`.

---

## Batch Mode

If the user provides a complete spec in their message (approach, guardrails, acceptance criteria, intent, scale), skip Phase II brainstorming:

1. Extract all provided fields
2. Confirm the spec with the user (brief summary, not full brainstorming)
3. Proceed directly to Phase III

This enables non-interactive use: `/build` with a complete spec → entity creation → done.

---

## Multiple Features

If the user wants to seed multiple features at once:

1. Run Phase II brainstorming for each (sequentially — each needs user input)
2. Create all entities in Phase III
3. Single commit: `seed: {N} features — {slug1}, {slug2}, ...`
4. Present all entities in the final report

For bulk seeding without brainstorming (e.g., migrating from a backlog), use `/spacedock:commission` with seed entities instead.
