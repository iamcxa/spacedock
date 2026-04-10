---
title: Phase E -- Build Flow Lifecycle Restructure
date: 2026-04-11
status: draft
scope: build pipeline stages, skills, mods, plan verification, UAT, knowledge capture, workflow index
supersedes: sections of 2026-04-10-build-flow-roadmap-phases-d-e-f.md §Phase E
relates_to:
  - docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md
  - docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md
  - docs/build-pipeline/README.md
tracking_until: Phase E completes; reassess when 10+ entities have shipped through the new flow
---

# Phase E: Build Flow Lifecycle Restructure

## Purpose

Phase D (shipped 2026-04-10 at commit `458a179`) cleaned Phase C's skill contract gaps and expanded Science Officer ownership of the full Discuss phase (brainstorm → explore → clarify). With Discuss ownership settled, Phase E restructures the remaining pipeline — everything from `plan` onward — into a simpler, stronger shape:

- **Shorter pipeline**: 14 stages → 10 stages by merging or mod-izing `research` / `seeding` / `e2e` / `docs` / `pr-draft` / `pr-review`.
- **Stronger verification**: Plan-checker with 7 dimensions (including full Nyquist validation sampling), three distinct post-execute gates (quality / review / uat), and a UAT stage that combines automated e2e with captain sign-off.
- **Lower cost**: Per-task model dispatch (haiku for mechanical tasks, sonnet for integration, opus only for planning) and wave-based parallel execute.
- **Self-learning**: A shared `knowledge-capture` skill lets any stage ensign write lessons back to CLAUDE.md at multiple levels. The D1/D2 pattern from kc-pr-flow is generalized for all spacebridge ensigns.
- **Cross-entity coherence**: Workflow-level `CONTRACTS.md` and `DECISIONS.md` track which files/decisions are owned by which entities, preventing the "entity B assumes X but entity A just changed X" class of drift.

Phase E is **entirely workflow-layer**. The spacedock engine (stages / gates / feedback-to / worktree / mod hooks) is unchanged. This keeps the eventual engine/spacebridge repo split clean (see §Engine Boundary below).

## Guiding Principles

1. **Engine is frozen.** No changes to clkao/spacedock engine code or schema. All new capability lives in skills, mods, and entity body conventions.
2. **Each stage produces a distinct deliverable.** Stages that don't produce new artifacts (only verdicts on existing artifacts) become subagent dispatches inside other stages. Applied: plan-checker is internal to `plan`, not its own stage.
3. **Cheap checks first.** Pre-commit hook → per-task acceptance criteria → quality (full mechanical) → review (judgment) → uat (user-observable). Each layer catches what upstream missed, at increasing cost.
4. **Feedback flows one direction.** Quality / review / uat failures all feedback-to `execute` via engine native routing. "Replan" is advisory-only (captain decides) to preserve single mechanical feedback path.
5. **Fresh context via subagent dispatch, not stage split.** Where verification needs independence from the writer, dispatch a subagent with its own context instead of adding a stage boundary.
6. **Distill, don't reinvent.** Patterns come from GSD (research structure, plan verification, wave-parallel execute, UAT skip/resume), Superpowers (zero-placeholder rule, self-review, subagent-driven-development), kc-pr-flow (D1/D2 knowledge capture, pre-scan, parallel review agents), Trail of Bits (differential-review, sharp-edges), pr-review-toolkit (specialized review agent set), e2e-pipeline (browser automation skills).

## Current State (what Phase D left)

After Phase D (`458a179`):

- `draft → brainstorm → explore → clarify` is SO-owned, skills have clean contracts, forge fixtures exist for regression.
- `plan → execute → quality → seeding → e2e → docs → pr-draft → pr-review → shipped` is the legacy FO-owned tail. This is what Phase E restructures.
- `docs/build-pipeline/README.md` stages frontmatter still uses the old 14-stage list; Phase E updates this.
- Skills live in `spacedock:build-*` namespace; new skills will be added under `spacebridge:*` but Phase F handles the migration of Discuss skills. Phase E skills are new, so they go straight into `spacebridge:*`.
- Entity 047 is the Phase D dogfood, status `clarify` / context_status `ready`, untouched in Phase E.

## Scope

### In scope

- Pipeline schema redesign in `docs/build-pipeline/README.md` (stage list + per-stage metadata)
- **10 new skills**, grouped by role:
  - **Stage skills** (dispatched by FO for pipeline stages, 5): `spacebridge:build-plan`, `spacebridge:build-execute`, `spacebridge:build-quality`, `spacebridge:build-review`, `spacebridge:build-uat`
  - **Subroutine skills** (dispatched internally by stage skills, 2): `spacebridge:build-research` (called by build-plan), `spacebridge:task-execution` (loaded by task subagents dispatched from build-execute)
  - **Shared utility skills** (invoked via Skill tool from any context, 2): `spacebridge:knowledge-capture` (two-mode: `capture` for ensigns, `apply` for FO), `spacebridge:workflow-index`
  - **User-invoked skills** (captain slash commands, 1): `spacebridge:uat-resume`
- **2 new agents**: `spacebridge:researcher` (loads `build-research` skill), `spacebridge:task-executor` (loads `task-execution` skill). Both serve as fresh-context execution vessels dispatched by stage orchestrators.
- **2 new mods**: `mods/pr-review-loop.md` (replaces pr-merge for shipped flow placeholder) and `mods/workflow-index-maintainer.md`
- **Update to existing `spacedock:first-officer` skill**: add pending-capture detection step in Dispatch Loop. This is an additive change (new step, no behavior modification of existing steps); it is the ONLY `spacedock:*` skill touched by Phase E.
- Plan-checker 7-dimension verification loop (internal to `build-plan` via subagent)
- Entity body conventions: `## Research Findings`, `## PLAN`, `## UAT Spec`, `## Validation Map`, `## UAT Results`, `## Pending Knowledge Captures`, updated `## Stage Report` sections
- Workflow-level artifacts: `docs/build-pipeline/_index/CONTRACTS.md`, `DECISIONS.md`, `INDEX.md`
- All skills validated via kc-plugin-forge (create/audit/improve/verify-agents paths)

### Out of scope (deferred to Phase E+1 or later)

- Retroactive validation auditor (GSD's `gsd-nyquist-auditor` pattern) — trust plan-checker first
- UAT parallel browser execution — correctness before optimization
- UAT automated evidence reuse — correctness before optimization
- Discussion phase distillation optimization — drive by Phase E evidence
- E2E seed mod (`uat-seed.md`) — need observed gap first
- Full shipped phase detailed design — Phase E ships a minimal shipped stage that relies on the existing pr-merge-style mod pattern; richer shipped design is its own iteration
- Doc-sync hook conditions — polish, not core
- Skill namespace migration from `spacedock:build-*` to `spacebridge:build-*` — Phase F work (entity 055)
- Next.js frontend rewrite — Phase F

All Phase E+1 items are recorded in `~/.claude/projects/-Users-kent-Project-spacedock/memory/phase-e-plus-1-candidates.md`.

## Pipeline Restructure

### Before (Phase D tail, 14 stages full profile)

```
draft → brainstorm → explore → clarify → research → plan → execute → quality → seeding → e2e → docs → pr-draft → pr-review → shipped
```

### After (Phase E, 10 stages full profile)

```
draft → brainstorm → explore → clarify → plan → execute → quality → review → uat → shipped
```

### What changed

| Stage | Disposition | Rationale |
|-------|-------------|-----------|
| `draft → clarify` | Unchanged | Phase D SO ownership stays |
| `research` | **Merged into plan** | Plan orchestrator dispatches parallel researchers internally; research is not its own deliverable stage |
| `plan` | **Redesigned** | Now an orchestrator: dispatches research, writes PLAN with UAT Spec and Validation Map, self-reviews, dispatches plan-checker subagent, revises up to 3 iterations |
| `execute` | **Redesigned** | Now an orchestrator: builds wave graph from PLAN, parallel-dispatches task subagents with per-task model hint (haiku/sonnet/opus), collects changes, commits serially |
| `quality` | **New purpose** | Pure mechanical project-wide checks: full test suite, lint, typecheck, build. Haiku ensign. Evidence-backed Stage Report. |
| `seeding` | **Removed** | Mod-triggered when UAT needs it (deferred to Phase E+1) |
| `e2e` | **Merged into uat** | E2E is a verification modality, not a stage. UAT stage orchestrates e2e-pipeline skills alongside CLI/API/interactive items |
| `docs` | **Removed as stage** | Doc-sync is a hook concern, not a stage (deferred to Phase E+1) |
| `review` | **New stage** | Judgment-based code review via parallel dispatch of pr-review-toolkit + trailofbits agents. Triggers knowledge capture. |
| `uat` | **New stage** | Automated e2e + captain sign-off, with skip/resume mechanism. Produces evidence-backed UAT Results. |
| `pr-draft + pr-review` | **Merged into shipped mod** | Git operations belong in mod layer per Phase E architectural principle; no longer pipeline stages |
| `shipped` | **Mod-driven** | Merge hook triggers `pr-review-loop` mod. Detailed shipped design deferred. |

## Stage Definitions

The `draft → brainstorm → explore → clarify` portion is covered by Phase D and unchanged. Stage definitions below describe the 6 redesigned or new stages.

### Plan

**Role**: Transform clarified entity context into an execution-proof plan with research, UAT spec, and validation map.

**Skill**: `spacebridge:build-plan`

**Model**: opus (orchestrator). Dispatches sonnet subagents internally.

**Internal orchestration**:

```
plan ensign (opus orchestrator)
  │
  ├─ 1. Topic extraction
  │     Read entity clarify output → identify research topics (5 domains:
  │     Upstream Constraints, Existing Patterns, Library/API Surface,
  │     Known Gotchas, Reference Examples)
  │
  ├─ 2. Research dispatch (parallel, N subagents)
  │     Dispatch target: spacebridge:researcher agent (new, sonnet, loads build-research skill)
  │     One subagent per topic, each fresh context, each returns structured finding
  │     Note: build-research is a subroutine skill — it is never dispatched
  │     by FO directly, only invoked internally here via the researcher agent.
  │
  ├─ 3. Research synthesis
  │     Write ## Research Findings section into entity body
  │
  ├─ 4. Plan writing
  │     Write:
  │     - ## PLAN (tasks with read_first, action, acceptance_criteria,
  │       files_modified, wave, model hint, optional skills hint)
  │     - ## UAT Spec (testable items: browser/cli/api/interactive)
  │     - ## Validation Map (requirement → task → command → status table)
  │
  ├─ 5. Self-review (Superpowers pattern, inline)
  │     - Zero-placeholder scan (no TBD / "add appropriate" / "similar to Task N")
  │     - Type/signature consistency across tasks
  │     - Fix inline, no loop
  │
  ├─ 6. Plan-checker dispatch (sonnet subagent, fresh context)
  │     Not a registered skill — inline prompt template stored in
  │     build-plan SKILL.md, passed to Agent() dispatch as prompt.
  │     Runs 7-dimension check, returns structured YAML issues.
  │
  ├─ 7. Revision loop (max 3 iterations)
  │     - Blockers → plan ensign revises inline
  │     - Re-dispatch plan-checker
  │     - On pass → proceed to step 8
  │     - On 3rd iteration fail → escalate to captain with issues list
  │
  ├─ 8. Knowledge capture (optional, capture mode)
  │     If research or planning discovered new gotchas:
  │     Invoke spacebridge:knowledge-capture with mode=capture via Skill tool.
  │     This performs D1 auto-append and writes D2 candidates to entity body's
  │     ## Pending Knowledge Captures section. FO applies them later in apply mode.
  │
  └─ 9. Stage Report + advance
        Write ## Stage Report: plan, commit, advance status to execute
```

**Entity body contract after plan**:
- `## Research Findings` — five domain sections with citations
- `## PLAN` — task list with frontmatter-style properties per task (see PLAN task schema below)
- `## UAT Spec` — testable items table
- `## Validation Map` — requirement/task/command/status table
- `## Stage Report: plan` — checklist with plan-checker verdict attached
- `## Pending Knowledge Captures` — optional, present only if plan stage discovered D2 candidates

**PLAN task schema**:

```markdown
<task id="task-1" model="haiku" wave="1" skills="validation-patterns">
  <read_first>
    - src/models/User.ts
    - tests/models/user.test.ts
  </read_first>

  <action>
  Concrete description with actual code/commands/values.
  No placeholders like "add appropriate error handling".
  </action>

  <acceptance_criteria>
    - grep "validateEmail" src/models/User.ts
    - bun test tests/models/user.test.ts passes
  </acceptance_criteria>

  <files_modified>
    - src/models/User.ts
    - tests/models/user.test.ts
  </files_modified>
</task>
```

**Task attributes**:
- `id`: unique task identifier
- `model`: `haiku` | `sonnet` | `opus` — per-task model hint for cost optimization. Default `sonnet` if omitted. Orchestrator honors this during dispatch.
- `wave`: integer (0, 1, 2, ...). Wave 0 is reserved for test infrastructure (Nyquist 6d). Tasks in same wave may run in parallel if `files_modified` don't overlap.
- `skills`: **optional** comma-separated skill IDs that plan ensign confidently recommends for this task. If present, execute orchestrator loads them for the task subagent. If absent, execute orchestrator runs one-time ToolSearch to find candidates (see Execute stage).
- `serial`: optional boolean, forces serial execution even when overlap-free (plan override for parallelism).

**Feedback routing**: No engine-native feedback to plan from downstream. If execute or later stages raise "replan" advisory flags, captain manually resets entity status.

### Execute

**Role**: Implement the plan via wave-based parallel task dispatch.

**Skill**: `spacebridge:build-execute`

**Model**: sonnet (orchestrator). Dispatches haiku/sonnet/opus task subagents per task model hint.

**Internal orchestration**:

```
execute ensign (sonnet orchestrator)
  │
  ├─ 1. Read entity → parse PLAN → build wave graph
  │     wave 0: [test-infra-setup]    (if PLAN declared Wave 0 tasks)
  │     wave 1: [task-1, task-2, task-3]
  │     wave 2: [task-4, task-5]      (depends on wave 1)
  │     wave 3: [task-6]              (depends on wave 2)
  │
  ├─ 2. Pre-task skill selection (one-time, before dispatch loop):
  │     For each task:
  │       a. If task.skills hint present → trust it, record skills for dispatch
  │       b. If absent → run ToolSearch query from task.action keywords +
  │          file extensions from task.files_modified
  │          - e.g. "add email validation typescript test" for a TS validation task
  │          - max_results: 3, filter by description relevance
  │          - Orchestrator judges match; if none match → dispatch with empty skills list
  │       c. Record selected skills in orchestrator's task state
  │     Rationale: orchestrator (sonnet) has reasoning budget for skill selection;
  │     task subagents (often haiku) don't. Orchestrator also benefits from plan-level
  │     visibility — can cache skill matches across tasks in the same plan.
  │
  ├─ 3. For each wave (sequential between waves):
  │   │
  │   ├─ a. Parallelism decision
  │   │    - Read plan's explicit serial/parallel hint if present
  │   │    - Otherwise auto-detect: if tasks' files_modified have overlap → serial
  │   │    - Plan can force-serial with <task serial="true"> even when overlap-free
  │   │
  │   ├─ b. Parallel dispatch task subagents
  │   │    Dispatch target: spacebridge:task-executor agent (new, loads task-execution skill)
  │   │    Dispatch call: Agent(
  │   │      subagent_type="spacebridge:task-executor",
  │   │      model=task.model,
  │   │      prompt={task text + skills list + context}
  │   │    )
  │   │    Each subagent:
  │   │    - Loads skills passed in prompt (via Skill tool at start)
  │   │    - Reads task.read_first files only
  │   │    - Executes task.action
  │   │    - Verifies task.acceptance_criteria
  │   │    - Does NOT commit (returns changed_files list)
  │   │    - Reports status: DONE | NEEDS_CONTEXT | BLOCKED
  │   │
  │   ├─ c. Collect subagent results
  │   │    - DONE → proceed
  │   │    - NEEDS_CONTEXT → provide info, re-dispatch same task
  │   │    - BLOCKED → escalate model (haiku→sonnet→opus), re-dispatch
  │   │                 if opus still BLOCKED → Stage Report failure, feedback-to: execute
  │   │                 (retry via feedback, with replan flag raised if 3rd BLOCKED)
  │   │
  │   └─ d. Serial git commits (one per task, conventional message)
  │        Pre-commit hook fires per commit (lint + tsc --incremental)
  │        Update Validation Map status column per task
  │
  ├─ 3. All waves complete → write ## Stage Report: execute
  │     - Per-task commit SHAs
  │     - Deviations (per GSD-style rules: bug-fix / critical-missing / blocker / architectural)
  │     - BLOCKED escalations if any
  │
  └─ 4. Invoke spacebridge:knowledge-capture if gotchas discovered
```

**Pre-commit hook policy**: Execute ensign does not override pre-commit. The worktree's pre-commit runs on every task commit. Recommended pre-commit contents: `bun lint --fix` on changed files + `tsc --incremental` (fast). NOT in pre-commit: full `bun test`, integration tests, build.

**Feedback routing**: `feedback-to: execute` via engine-native mechanism when quality/review/uat fail.

### Quality

**Role**: Project-wide mechanical verification — "does the whole project still work?"

**Skill**: `spacebridge:build-quality`

**Model**: haiku (parse command output, no reasoning needed).

**Checks**:
- `bun test` full suite (not targeted)
- `bun lint` full project
- `tsc --noEmit` full project
- `bun build`
- Coverage threshold (if workflow config defines one)

**Rules**:
- Evidence-before-claims: Stage Report MUST include actual command output snippets (pass or fail), not just "tests pass"
- No judgment, no commentary on code quality
- Binary pass/fail per check
- Any fail → `feedback-to: execute` with Stage Report containing failing output

**Output**: `## Stage Report: quality` with per-check result + evidence.

### Review

**Role**: Judgment-based diff-level code review.

**Skill**: `spacebridge:build-review`

**Model**: sonnet (orchestrator). Dispatched review agents use their own internal models.

**Scope**: `git diff {execute_base}..HEAD` — only what this execute iteration changed.

**Internal orchestration**:

```
build-review ensign (sonnet orchestrator)
  │
  ├─ 1. Pre-scan (inline in ensign context, no subagent dispatch)
  │     Distilled from kc-pr-review Step 4.5. These checks are mechanical
  │     and don't need fresh context — run them in the review ensign's
  │     own context before paying for subagent dispatch overhead.
  │     - CLAUDE.md rule compliance (walk dirname upward from each changed file)
  │     - Stale references (grep removed symbols across project)
  │     - Dependency chain check (import graph correctness)
  │     - Plan consistency (diff matches PLAN's files_modified)
  │
  ├─ 2. Parallel dispatch review agents:
  │     ├─ pr-review-toolkit:code-reviewer           (CLAUDE.md, style, bugs)
  │     ├─ pr-review-toolkit:silent-failure-hunter   (error handling)
  │     ├─ pr-review-toolkit:comment-analyzer        (stale comments)
  │     ├─ pr-review-toolkit:pr-test-analyzer        (test coverage)
  │     ├─ pr-review-toolkit:type-design-analyzer    (type encapsulation)
  │     ├─ pr-review-toolkit:code-simplifier         (complexity)
  │     ├─ trailofbits:differential-review           (git-history-aware)
  │     └─ trailofbits:sharp-edges                   (footgun API design)
  │
  │     Note: exact trailofbits agent identifiers to be confirmed at
  │     implementation time (plugin names ≠ agent names; verify via
  │     plugin discovery before writing dispatch code).
  │
  ├─ 3. Classify findings (distilled from kc-pr-review Step 5)
  │     Severity: CRITICAL / HIGH / MEDIUM / LOW / NIT
  │     Root:     CODE (fix in execute) / DOC (update CLAUDE.md) / NEW (new rule) / PLAN (replan advisory)
  │
  ├─ 4. Invoke spacebridge:knowledge-capture with mode=capture via Skill tool
  │     Pass findings with source_stage=review.
  │     D1 candidates auto-appended to plugin learned-patterns.md.
  │     D2 candidates written to entity body ## Pending Knowledge Captures.
  │     FO will handle D2 apply later (captain interaction).
  │
  ├─ 5. Verdict
  │     - No CRITICAL/HIGH CODE findings → advance to uat
  │     - Any CRITICAL/HIGH CODE → feedback-to: execute
  │     - Any PLAN finding → raise replan flag in Stage Report (advisory)
  │
  └─ 6. Write ## Stage Report: review with classified findings table
```

**Feedback routing**: `feedback-to: execute`. Replan flag is advisory only — captain decides whether to manually reset status to plan.

### UAT

**Role**: User-observable behavior verification with automated e2e + captain sign-off.

**Skill**: `spacebridge:build-uat`

**Model**: sonnet (orchestrator). Dispatches e2e-pipeline skills + uses AskUserQuestion for captain interaction.

**Internal orchestration**:

```
uat ensign (sonnet orchestrator)
  │
  ├─ 1. Read entity's ## UAT Spec
  │     Classify items by type: browser / cli / api / interactive
  │
  ├─ 2. Run automated items first (no captain needed)
  │   │
  │   ├─ Browser items:
  │   │   - Check /e2e-map coverage, update if stale
  │   │   - Generate flow YAML via /e2e-flow
  │   │   - Execute via /e2e-test
  │   │   - Collect screenshots, video, trace
  │   │
  │   ├─ CLI items:
  │   │   - Run declared command
  │   │   - Capture stdout / stderr / exit code
  │   │
  │   └─ API items:
  │       - Run declared curl / gh command
  │       - Capture response / status code
  │
  ├─ 3. Analyze automated results
  │   │
  │   ├─ All automated pass → step 4 (captain sign-off)
  │   │
  │   ├─ Infra-level fail (browser crash, URL 404, command not found)
  │   │   → Stage Report + feedback-to: execute
  │   │   → Do NOT involve captain (clear execute bug)
  │   │
  │   └─ Assertion fail with evidence (screenshot shows wrong value)
  │       → Continue to step 4, include failures in captain review
  │       → Captain decides: retry / override / feedback
  │
  ├─ 4. Captain interaction (single session)
  │     - Present all automated evidence (screenshots, outputs)
  │     - For each interactive item: AskUserQuestion (one per call, not batched)
  │     - Final sign-off: pass / fail / skip-with-reason per item
  │
  ├─ 5. Write ## UAT Results section to entity body
  │     Table: item / status / evidence refs / notes / re-attempt
  │
  ├─ 6. Verdict
  │     - All items pass → advance to shipped
  │     - Any fail → feedback-to: execute (with findings)
  │     - Any skip with captain ack → advance to shipped
  │       + set entity frontmatter uat_pending_count=N
  │
  └─ 7. Invoke spacebridge:knowledge-capture if UAT discovered gotchas
```

**Skip / Resume mechanism**:
- Skipped UAT items are recorded with status `skipped` and captain-provided reason
- Entity advances to shipped even with pending skips (tracked in frontmatter)
- `/spacebridge:uat-resume {slug}` re-runs skipped items later
- `/spacebridge:uat-audit` lists all entities with pending UAT across workflow

**Feedback routing**: `feedback-to: execute`.

### Shipped (minimal, detailed design deferred)

**Role**: Merge the entity's work into main via PR, trigger agent-review loop, archive.

**Skill**: None. Stage is terminal and mod-driven.

**Mod**: `mods/pr-review-loop.md` (new, replaces `mods/pr-merge.md` behavior)

**Hook points used**:
- `merge` — when entity enters shipped, mod runs `gh pr create`, sets entity `pr: #{number}`, skips default local merge
- `idle` — mod periodically checks PR review state. If CHANGES_REQUESTED or CI fail → mod resets entity status to `execute`, clears `pr:` field, triggers FO to re-dispatch. If APPROVED + mergeable → mod merges, archives entity.

**Deferred**: PR body template derivation, PR agent review dispatch details, human-review gate, merge strategy config, post-merge cleanup details. See Phase E+1 candidates.

## New Skills and Agents

All skills written with `kc-plugin-forge` mode (create / audit / improve / verify-agents) and validated with forge fixtures.

### Stage skills (5) — dispatched by FO via stage `skill:` property

| Skill | Model | Purpose |
|-------|-------|---------|
| `spacebridge:build-plan` | opus | Plan stage orchestrator. Dispatches research + writes PLAN + self-reviews + plan-checker subagent + revision loop. |
| `spacebridge:build-execute` | sonnet (orch) + haiku/sonnet/opus (tasks) | Execute stage orchestrator. Pre-task skill selection, wave-parallel task dispatch with per-task model. |
| `spacebridge:build-quality` | haiku | Quality stage ensign. Full-project mechanical checks. |
| `spacebridge:build-review` | sonnet (orch) | Review stage orchestrator. Pre-scan + parallel dispatch of pr-review-toolkit + trailofbits agents + knowledge-capture call. |
| `spacebridge:build-uat` | sonnet (orch) | UAT stage orchestrator. e2e-pipeline automated + captain sign-off. |

### Subroutine skills (2) — dispatched internally by stage skills

| Skill | Model | Purpose |
|-------|-------|---------|
| `spacebridge:build-research` | sonnet × N | Researcher operating contract. Loaded by `spacebridge:researcher` agent dispatched by build-plan for each topic. Never dispatched by FO directly. |
| `spacebridge:task-execution` | haiku/sonnet/opus per task | Task executor operating contract. Loaded by `spacebridge:task-executor` agent dispatched by build-execute for each wave task. Defines: load skills from prompt → read_first → execute action → verify acceptance_criteria → return changed_files + status. |

### Shared utility skills (2) — invoked via Skill tool from any context

| Skill | Model | Purpose |
|-------|-------|---------|
| `spacebridge:knowledge-capture` | sonnet | Two-mode skill. **`capture` mode**: called by any stage ensign (ensign context). Classifies findings, D1 auto-appends to plugin learned-patterns.md, writes D2 candidates to entity body ## Pending Knowledge Captures. **`apply` mode**: called by FO (agent context with native AskUserQuestion). Reads pending candidates, presents each to captain, edits target CLAUDE.md on approval, commits. |
| `spacebridge:workflow-index` | sonnet | Three modes: read (query CONTRACTS.md / DECISIONS.md by file or entity), write (append new entries after stage advances), check (cross-entity coherence validation for plan-checker Dim 7). Called by plan-checker, stage ensigns, and mods. |

### User-invoked skills (1)

| Skill | Model | Purpose |
|-------|-------|---------|
| `spacebridge:uat-resume` | sonnet | Captain slash command (`/spacebridge:uat-resume {slug}`). Dispatches a build-uat ensign in "skip-only" mode to re-run pending UAT items. Thin wrapper over build-uat — not a separate execution path. |

### New agents (2)

| Agent | Tools | Loaded by dispatch | Purpose |
|-------|-------|-------------------|---------|
| `spacebridge:researcher` | Read, Grep, Glob, WebFetch, WebSearch, Context7 | `build-research` skill (via dispatch prompt) | Fresh-context execution vessel for research topic investigation. Dispatched in parallel by build-plan, one per topic. |
| `spacebridge:task-executor` | Read, Write, Edit, Bash, Grep, Glob, Skill | `task-execution` skill + any skills from dispatch prompt | Fresh-context execution vessel for plan task implementation. Dispatched by build-execute orchestrator with per-task model, receives task text + skills list in prompt, returns changed_files without committing. |

### Skill invocation matrix

| Skill | Invoker | Mechanism | Context model |
|-------|---------|-----------|---------------|
| build-plan | FO | via README `skill:` + FO dispatch | ensign subagent |
| build-execute | FO | via README `skill:` + FO dispatch | ensign subagent |
| build-quality | FO | via README `skill:` + FO dispatch | ensign subagent |
| build-review | FO | via README `skill:` + FO dispatch | ensign subagent |
| build-uat | FO | via README `skill:` + FO dispatch | ensign subagent |
| build-research | build-plan orchestrator | via `Agent(subagent_type=spacebridge:researcher)` with skill in prompt | fresh subagent per topic |
| task-execution | build-execute orchestrator | via `Agent(subagent_type=spacebridge:task-executor)` with skill in prompt | fresh subagent per task |
| knowledge-capture (capture mode) | stage ensigns | via `Skill` tool (inline, same context) | caller's ensign context |
| knowledge-capture (apply mode) | FO | via `Skill` tool (inline, FO has native AskUserQuestion) | FO agent context |
| workflow-index | stage ensigns + mods (indirectly via FO) | via `Skill` tool (inline) | caller's context |
| uat-resume | captain | `/spacebridge:uat-resume` slash command | captain session |

## New Mods

### `mods/pr-review-loop.md`

Replaces the current `mods/pr-merge.md` (or runs alongside during transition).

**Hook: merge** — When entity enters terminal stage (shipped):
1. Draft PR summary from entity body (Stage Reports, UAT evidence summary)
2. Ask captain for approval (not silent)
3. On approval: `git push origin {branch}` + `gh pr create`
4. Set entity `pr: #{number}` — engine skips default local merge

**Hook: idle** — Scan entities with non-empty `pr:`:
1. `gh pr view {number} --json state,reviews,mergeable`
2. If MERGED → advance to terminal, archive
3. If CLOSED → ask captain
4. If CHANGES_REQUESTED or CI fail → reset entity `status: execute`, clear `pr:`, log in entity body
5. If APPROVED + mergeable → merge, archive
6. If OPEN + pending → no action

**Hook: startup** — Same PR-state checks as idle (defense in depth on session start)

### `mods/workflow-index-maintainer.md`

**Hook: idle** — Scan entities for status changes since last index update:
1. For any entity that advanced stage: invoke `spacebridge:workflow-index` in write mode
2. Update INDEX.md (entity list), CONTRACTS.md (files_modified → entity), DECISIONS.md (new D-XX entries)

**Hook: startup** — Verify INDEX.md freshness (compare entity file mtimes to INDEX.md):
1. If stale → rebuild

## Plan-Checker Dimensions (7)

Invoked by `build-plan` as a subagent dispatch. **Not a registered skill** — the plan-checker prompt is an inline template inside `build-plan` SKILL.md and gets passed to `Agent(subagent_type="general-purpose", model="sonnet", prompt={checker_prompt})` at dispatch time. Fresh context is preserved via subagent boundary. If future use cases emerge that need plan-checker standalone, it can be promoted to a registered skill later.

| # | Dimension | Check | Severity |
|---|-----------|-------|----------|
| 1 | Requirement Coverage | Every AC in entity body → ≥1 task with acceptance_criteria addressing it | blocker if missing |
| 2 | Task Completeness | Every task has read_first, action, acceptance_criteria, files_modified, wave | blocker if incomplete |
| 3 | Dependency Correctness | Wave graph has no cycles; wave N tasks' read_first includes outputs from wave <N; files_modified overlap handled | blocker on cycles; warning on overlap |
| 4 | Context Compliance | Plan doesn't violate clarify-locked decisions or CLAUDE.md rules or DECISIONS.md active decisions | blocker on violation |
| 5 | Research Coverage | Every task's read_first has a source (research finding, explore artifact, clarify annotation) | blocker if dangling |
| 6 | Validation Sampling (Full Nyquist) | See detail below | mixed |
| 7 | Cross-Entity Coherence | Plan's files_modified cross-referenced against CONTRACTS.md for in-flight or recent entities | blocker if in-flight; warning if recent |

**Output format**: YAML structured issues per GSD style:
```yaml
issues:
  - dimension: task_completeness
    task: task-3
    severity: blocker
    description: "task-3 missing acceptance_criteria"
    fix_hint: "Add 'bun test tests/foo.test.ts' or equivalent"
```

**Revision loop**: Max 3 iterations. Plan ensign receives issues, revises inline, re-dispatches checker. On 3rd fail → escalate to captain with unresolved issues list. Captain options: force proceed / reset to clarify / manual rewrite.

## Nyquist Sampling (Dimension 6 detail)

Distilled from GSD's Nyquist compliance checks. Applied in full (6a/6b/6c/6d), not simplified.

### 6a — Automated Verify Presence

Every task's `acceptance_criteria` must contain a runnable command. No manual-only checks. Blocking fail if any task has no command.

### 6b — Feedback Latency

Each `acceptance_criteria` command evaluated:
- Full E2E suite (playwright / cypress / selenium) → **warning** (suggest faster unit-level check)
- Watch mode flag (`--watchAll`, `--watch`) → **blocking fail**
- Declared expected latency > 30 seconds → **warning**

### 6c — Sampling Continuity

Within each wave, any 3-consecutive-task sliding window must have ≥ 2 tasks with runnable verify. 3 consecutive tasks without verify → **blocking fail**.

Rationale: like Nyquist sampling in signal processing, you must "sample" (verify) densely enough that when something breaks, you know within 1-2 tasks of the break. Sparse sampling means you find out 5 tasks too late.

### 6d — Wave 0 Completeness

Wave 0 is reserved for test infrastructure creation. If any task references `<automated>MISSING</automated>` (meaning the test file will be created by a Wave 0 task), there must be a matching Wave 0 task with that file in its `files_modified`. Missing match → **blocking fail**.

### Validation Map (structured output)

Plan writes `## Validation Map` section into entity body:

```markdown
## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 User can X | task-3 | `bun test tests/x.test.ts` | ⏳ pending | — |
| AC-2 API returns Y | task-5 | `curl localhost:8420/api/y` | ⏳ pending | — |
```

Execute updates the Status column per task. Quality reads it to confirm all expected verifications were exercised. Dashboard can render validation health per entity.

## Knowledge Capture (D1/D2)

Distilled from kc-pr-flow's knowledge-capture.md. Generalized as shared skill `spacebridge:knowledge-capture` with two modes:

- **`capture` mode** — invoked by any stage ensign (subagent context, no native AskUserQuestion). Classifies findings, D1 auto-appends, D2 candidates staged to entity body.
- **`apply` mode** — invoked by FO (agent context with native AskUserQuestion). Reads staged D2 candidates, presents to captain, edits CLAUDE.md on approval.

This split solves the "ensign subagents can't use native AskUserQuestion" constraint from Phase D's `askuserquestion-agent-vs-subagent.md` memory: ensigns only stage candidates; FO (which runs in `--agent` mode) handles the interactive apply step.

### Dimensions

**D1 (skill-level, auto-append, no gate)**

General review / workflow patterns discovered during this session. Auto-appended to plugin reference files:

| Insight type | Target |
|-------------|--------|
| Review pattern | `spacebridge/reference/learned-patterns.md` |
| Triage heuristic | `spacebridge/reference/triage-patterns.md` |
| Classifier improvement | `spacebridge/reference/classifier-hints.md` |

No confirmation gate. Briefly notify captain: "Appended pattern to learned-patterns.md: [title]"

**D2 (project-level, gated with severity + 3-question test)**

Project-specific insights written to the reviewed project's files.

**Severity gate** (pre-filter):

| Severity | Condition | Candidate? |
|----------|-----------|------------|
| CRITICAL / HIGH | DOC or NEW classification | Yes |
| MEDIUM | Same issue type 2+ times in history | Yes |
| MEDIUM | Once only | No |
| LOW / NIT | — | Never |

**Three-question test** (all must be YES):
1. **Recurs?** — Will future similar work hit this?
2. **Non-obvious?** — Would an unfamiliar dev miss it?
3. **Ruleable?** — Can it be expressed as "do X / never Y because Z"?

### Target Selection (multi-level CLAUDE.md)

| Scope analysis | Target |
|----------------|--------|
| Plugin-level (skill reviewer generalization) | `spacebridge/reference/learned-patterns.md` (D1 default) |
| User-global rule (rare, explicit only) | `~/.claude/CLAUDE.md` |
| Project-wide rule | `{repo}/CLAUDE.md` |
| Module-specific rule | `{repo}/{subdir}/CLAUDE.md` |
| Contextual gotcha (non-enforceable) | `{repo}/.claude/review-lessons.md` |
| Spacebridge workflow decision | `docs/build-pipeline/_index/DECISIONS.md` |

### Two-Mode Interface

Knowledge-capture is a single skill with two modes. Mode determines which caller and which behavior.

#### Mode 1: `capture` (ensign-side, no captain interaction)

Invoked by any stage ensign that has findings to classify. Runs entirely in ensign's subagent context. Does NOT call AskUserQuestion (ensigns don't have native UI access).

```
spacebridge:knowledge-capture (mode=capture)

Caller: any stage ensign (review most common; also execute, plan, uat, research)
Context: ensign subagent (no native AskUserQuestion)

Input:
  mode: "capture"
  findings: List[RawFinding]
  source_stage: research | plan | execute | quality | review | uat
  caller_context: { entity_slug, repo_path }

Workflow:
  1. Classify each finding (root: CODE/DOC/NEW/PLAN, severity: CRITICAL..NIT)
  2. D1 auto-append (no gate):
     - Write skill-level patterns to spacebridge/reference/learned-patterns.md
     - Briefly log "Appended to learned-patterns.md: [title]"
  3. D2 candidate staging (no captain interaction):
     - Severity gate filter
     - Three-question test filter
     - Scope analysis → target selection per candidate
     - Write candidates as pending entries to entity body ## Pending Knowledge Captures
     - Each entry records: raw finding, classification, proposed target, proposed edit

Output:
  d1_written: int
  d2_pending: int (count of entries written to ## Pending Knowledge Captures)
```

**Entity body section format**:

```markdown
## Pending Knowledge Captures

<capture id="kc-1" severity="HIGH" root="NEW" target="tools/dashboard/CLAUDE.md">
  <finding>
  During review of entity 046, reviewer detected that all React components
  directly mutate state without immutable patterns. This causes subtle
  re-render bugs under concurrent updates.
  </finding>
  <proposed_edit>
  Append to tools/dashboard/CLAUDE.md § Frontend Patterns:

  "Never mutate state directly in React components. Use the functional
   setState pattern (`setX(prev => ...)`) or immutable helpers. Rationale:
   concurrent updates can drop mutations, causing flaky re-renders."
  </proposed_edit>
  <source_stage>review</source_stage>
  <source_entity>046</source_entity>
</capture>
```

#### Mode 2: `apply` (FO-side, captain interaction)

Invoked by FO when it detects a non-empty `## Pending Knowledge Captures` section. Runs in FO's `--agent` context where native AskUserQuestion works.

```
spacebridge:knowledge-capture (mode=apply)

Caller: FO (spacedock:first-officer agent in --agent mode)
Context: FO agent context (native AskUserQuestion available)

Input:
  mode: "apply"
  entity_slug: string

Workflow:
  1. Read entity body's ## Pending Knowledge Captures section
  2. Parse <capture> entries
  3. For each entry:
     a. Present via AskUserQuestion (one at a time, not batched):
        - Show finding, proposed target, proposed edit
        - Options: apply / skip / modify-target / reject
     b. On "apply":
        - Edit target file with proposed_edit
        - Commit with message: "docs: capture review lesson from {source_entity}"
     c. On "skip" or "reject":
        - Mark entry as rejected in entity body (or remove)
     d. On "modify-target":
        - Sub-question: which target? (user-global / project / module / lessons)
        - Apply with new target
  4. Clear ## Pending Knowledge Captures section (or mark all processed)
  5. (Optional Phase E+1) Retroactive similarity check against episodic memory

Output:
  applied: int
  rejected: int
  modified: int
```

### FO Integration

`spacedock:first-officer` skill is updated with a new step in the Dispatch Loop (additive, non-breaking):

```
Existing steps:
  1. Read workflow state
  2. Compute effective stages
  3. Identify next dispatchable entity
  4. Dispatch appropriate ensign for its current stage
  5. Wait for ensign completion
  6. Handle gates (captain approval if needed)
  7. Advance entity or handle feedback
  ...

NEW step (inserted between 6 and 7):
  6.5. Check entity for ## Pending Knowledge Captures section
       If present and non-empty:
         Invoke spacebridge:knowledge-capture with mode=apply via Skill tool
         (FO has native AskUserQuestion in --agent mode, so skill's
          captain-interaction steps work correctly)
       After apply completes, continue to step 7
```

This is the only Phase E modification to a `spacedock:*` skill; it is purely additive.

## Workflow Index (CONTRACTS.md + DECISIONS.md)

Workflow-level artifacts under `docs/build-pipeline/_index/`. Engine does not read this directory.

### CONTRACTS.md (file ownership & in-flight tracking)

```markdown
# Contracts Index

Auto-maintained by mods/workflow-index-maintainer.md
Last updated: 2026-04-11 by entity 046

## Active Contracts

### tools/dashboard/static/app.js

| Entity | Stage | Decision / Intent | Status |
|--------|-------|-------------------|--------|
| 046 | shipped | Filter logic moved to client-side | 🟢 final |
| 052 | execute | WebSocket reconnection on idle | 🟡 in-flight |

### tools/dashboard/src/frontmatter-io.ts

| Entity | Stage | Decision / Intent | Status |
|--------|-------|-------------------|--------|
| 041 | shipped | Stage Report checklist parser | 🟢 final |
```

Updated by `mods/workflow-index-maintainer.md` on idle hook when any entity advances.

### DECISIONS.md (append-only decision log)

```markdown
# Decisions Log

Auto-maintained. Append-only. Decisions marked superseded, not deleted.

## D-046-1: Filter UI is client-side

**Source**: entity 046, clarify stage, 2026-04-10
**Scope**: tools/dashboard/static/app.js
**Rationale**: Client-side filter keeps server load low; user count too small for server-side
**Related entities**: [046, 052, 059]
**Status**: 🟢 active
**Supersedes**: none

---
```

Written by:
- `build-clarify` Stage 5 sufficiency gate → captain's locked decisions
- `knowledge-capture` D2 writes targeting CLAUDE.md → sync to DECISIONS.md
- Manual captain entries via `/spacebridge:decision add` (Phase E+1 polish)

### Reverse Lookup

`spacebridge:workflow-index` skill supports two query modes:

```
query --file {path}   → returns D-XXX entries affecting that file
query --entity {slug} → returns D-XXX entries sourced from or constraining that entity
```

Used by plan-checker Dimension 4 (Context Compliance) and Dimension 7 (Cross-Entity Coherence).

### Supersede Mechanism

Decisions are never deleted. New decisions declare `Supersedes: D-XXX`. Superseded decisions get `Status: 🔴 superseded by D-YYY`. Queries return only active by default; history is queryable.

### INDEX.md (entity index, machine-generated)

Simple entity-by-status table, rebuilt by workflow-index-maintainer mod. Complements dashboard UI for markdown-based consumption (e.g., captain reading workflow state without starting dashboard).

## Engine Boundary

Phase E touches **zero engine code**. Proof by enumeration:

| Engine capability | Used by Phase E? | Modified by Phase E? |
|-------------------|-----------------|----------------------|
| Stage definitions in README frontmatter | ✅ used | ❌ schema unchanged, only stage list content changes |
| Scalar property parser (`gate`, `worktree`, `manual`, `initial`, `terminal`, `feedback-to`) | ✅ used | ❌ |
| Profile system | ✅ used | ❌ |
| `skip-stages`, `add-stages` per entity | ✅ unchanged | ❌ |
| Worktree isolation per entity | ✅ used | ❌ |
| Concurrency limits | ✅ used (default 2) | ❌ |
| Mod hooks (startup / idle / merge) | ✅ used | ❌ |
| FO → ensign dispatch primitive | ✅ used | ❌ |
| Entity frontmatter scalar fields | ✅ used | ❌ (new fields like `uat_pending_count` are ignored by engine, read only by skills/mods) |
| Agent tool for subagent dispatch | ✅ used | ❌ Claude Code native |

Phase E adds workflow-layer content:
- New stage skills (loaded via existing `skill:` property)
- New shared skills (invoked by stage ensigns)
- New mods (using existing hook mechanism)
- New entity body sections (engine doesn't parse body)
- New `_index/` directory (engine ignores anything outside README + entity files)
- New Stage Report format conventions (engine only cares about checklist parsing which is Phase D fix)

Benefit for future repo split (Phase F and beyond): Phase E's entire output ships as `spacebridge` plugin; `clkao/spacedock` engine stays untouched and distributable to non-spacebridge use cases.

## Distillation Sources

| Pattern | Source | Where applied |
|---------|--------|---------------|
| Research with domain-based extraction + downstream contract | GSD (`gsd-phase-researcher`) | `build-research` 5-domain output, `build-plan` topic extraction |
| Parallel researchers dispatched by planner | GSD (`/gsd-plan-phase` Step 5) | `build-plan` research dispatch |
| Zero-placeholder rule + type consistency self-review | Superpowers (`writing-plans`) | `build-plan` self-review step |
| 7-dimension plan verification with structured YAML issues | GSD (`gsd-plan-checker`) | Plan-checker subagent |
| Wave-based parallel execute with files_modified overlap check | GSD (`gsd-execute-phase`) | `build-execute` orchestration |
| Subagent status codes (DONE / NEEDS_CONTEXT / BLOCKED) | Superpowers (`subagent-driven-development`) | `build-execute` subagent protocol |
| Per-task model hint (haiku/sonnet/opus) | Novel | `build-plan` PLAN schema, `build-execute` dispatch |
| Nyquist validation sampling (4 checks) | GSD (`gsd-plan-checker` Dimension 8) | Plan-checker Dimension 6 (full) |
| Validation Map as structured section | Distilled from GSD's VALIDATION.md | Entity body convention |
| Evidence-before-claims in quality output | Superpowers (`verification-before-completion`) | `build-quality` Stage Report rule |
| Pre-scan (CLAUDE.md walk, stale refs, dependency chains) | kc-pr-flow (`kc-pr-review` Step 4.5) | `build-review` pre-scan |
| Parallel dispatch of review agents | kc-pr-flow + pr-review-toolkit | `build-review` agent dispatch (6 pr-review-toolkit + 2 trailofbits) |
| D1/D2 knowledge capture with severity + 3-question gate | kc-pr-flow (`knowledge-capture.md`) | `spacebridge:knowledge-capture` |
| Multi-level CLAUDE.md targeting | Extended from kc-pr-flow | `knowledge-capture` target selection |
| differential-review (git-history-aware code review) | Trail of Bits | `build-review` agent |
| sharp-edges (footgun API detection) | Trail of Bits | `build-review` agent |
| UAT with skip/resume and gap tracking | GSD (`gsd-verify-work`) | `build-uat` + `uat-resume` skill |
| /e2e-map, /e2e-flow, /e2e-test orchestration | e2e-pipeline plugin | `build-uat` browser items |
| Mod-based PR lifecycle | Spacedock existing (`mods/pr-merge.md`) | Extended to `pr-review-loop.md` |

## Model Allocation & Cost Model

| Stage | Model | Per-stage burn |
|-------|-------|----------------|
| brainstorm / explore / clarify | sonnet (Phase D) | existing |
| plan orchestrator | opus | high |
| research subagents | sonnet × N | medium × N (parallel) |
| plan-checker subagent | sonnet | medium |
| execute orchestrator | sonnet | medium |
| execute task subagents | haiku / sonnet / opus per task | varies by task |
| quality | haiku | low |
| review orchestrator | sonnet | medium |
| review agents (pr-review-toolkit + trailofbits) | internal (opus / sonnet) | high (but shared across entities) |
| uat orchestrator | sonnet | medium |
| knowledge-capture | sonnet | low |
| workflow-index | sonnet | low |

**Before Phase E** (estimated): plan and execute both opus = 2× opus per entity
**After Phase E**: plan opus + execute sonnet-with-haiku-tasks ≈ 1× opus + 0.4× sonnet per entity
**Rough saving**: 40-60% on plan+execute cost for typical 8-task entities where ~half tasks are mechanical (haiku-ready).

## Migration Strategy

Phase E is plan-driven, not pipeline-driven (same lesson as Phase D — you can't drive pipeline work using a broken pipeline). Phase E work lands via this design spec + a detailed implementation plan written after approval.

### Ordering

1. **Update `docs/build-pipeline/README.md` stage schema** (change stage list, update per-stage metadata including `skill:` references). Must be done BEFORE any new ensign dispatch against these stages to avoid FO confusion.
2. **Write `spacebridge:workflow-index` skill + `mods/workflow-index-maintainer.md` mod** first — no dependencies, used by plan-checker later.
3. **Write `spacebridge:knowledge-capture` skill** second — no dependencies, used by multiple ensigns and FO later.
4. **Update `spacedock:first-officer` skill** with new Dispatch Loop step 6.5 (pending-capture detection → knowledge-capture apply mode). Additive change, does not modify existing steps.
5. **Write `spacebridge:researcher` agent + `spacebridge:build-research` skill** (researcher dispatched by build-plan internally).
6. **Write `spacebridge:build-plan` skill** (includes inline plan-checker prompt template; depends on build-research existing).
7. **Write `spacebridge:task-executor` agent + `spacebridge:task-execution` skill** (task executor dispatched by build-execute internally).
8. **Write `spacebridge:build-execute` skill** (depends on PLAN schema from build-plan + task-execution skill for dispatch).
9. **Write `spacebridge:build-quality` skill** (independent).
10. **Write `spacebridge:build-review` skill** (depends on `pr-review-toolkit` and `trailofbits/skills` plugins being installed; verify exact trailofbits agent identifiers at this step).
11. **Write `spacebridge:build-uat` skill + `spacebridge:uat-resume` skill** (uat-resume is a thin slash-command wrapper; depends on `e2e-pipeline` plugin being installed).
12. **Write `mods/pr-review-loop.md` mod** (replaces or runs alongside existing `mods/pr-merge.md`).
13. **Dogfood one entity end-to-end** through the full new pipeline — likely a small, well-understood change (candidate: a minor dashboard tweak or a docs fix).
14. **Fix issues discovered during dogfood**, loop back to relevant skill fixes.
15. **Mark Phase E complete** when one entity has shipped through the full flow without captain intervention beyond captain's assigned gates (clarify, UAT sign-off, knowledge-capture apply).

### Parallel tracks

- Phase D's plugin split (entity 040) work can continue in parallel. It's behavior-neutral (ChannelProvider / CoordinationClient extraction) and doesn't touch skill contracts.
- Dashboard UI updates to render new entity body sections (Research Findings, UAT Spec, UAT Results, Validation Map) can happen alongside skill implementation.

## Success Criteria

Phase E is complete when:

1. `docs/build-pipeline/README.md` stage schema reflects the 10-stage Phase E pipeline.
2. All **10 new skills** exist, pass kc-plugin-forge validation (create/audit/verify-agents), and have forge fixtures where Class 3 interaction applies.
3. Both **new agents** (`spacebridge:researcher`, `spacebridge:task-executor`) exist with correct frontmatter, tool list, and skill loadouts; pass `kc-plugin-forge verify-agents`.
4. `spacedock:first-officer` skill update (step 6.5) is in place and detects pending captures on stage advance.
5. Both new mods exist and pass mod-hook fixture tests (distilled from tests/fixtures/merge-hook-pipeline).
6. Plan-checker subagent produces structured YAML issues across all 7 dimensions on at least one dogfood entity.
7. One entity completes the full `draft → shipped` flow via the new pipeline without needing workarounds or captain manual state fixes beyond expected gates (clarify, UAT sign-off, knowledge-capture apply).
8. At least one entity triggers D2 knowledge capture successfully: ensign writes pending candidates → FO detects on advance → FO invokes apply mode → captain confirms via AskUserQuestion → CLAUDE.md edited and committed.
9. `CONTRACTS.md` and `DECISIONS.md` contain entries written by the workflow-index-maintainer mod; reverse lookup query returns expected results.
10. UAT stage successfully runs automated e2e-flow, collects evidence, and presents to captain for sign-off on at least one browser-UAT-bearing entity.
11. Execute task subagent dispatch works end-to-end: orchestrator selects skills (via plan hint or ToolSearch fallback), dispatches task-executor agent with per-task model, receives `changed_files` + status, orchestrator commits serially.
12. Phase D's Discussion skills (brainstorm / explore / clarify) are unchanged and still pass their existing forge fixtures.

## Phase E+1 Candidates

All deferred items are recorded in `~/.claude/projects/-Users-kent-Project-spacedock/memory/phase-e-plus-1-candidates.md`:

1. Retroactive validation auditor (distilled from `gsd-nyquist-auditor`)
2. UAT parallel browser execution
3. UAT automated evidence reuse
4. Discussion phase distillation optimization
5. E2E seed mod (`mods/uat-seed.md`)
6. Shipped phase detailed design (PR template, merge strategy, post-merge cleanup)
7. Doc-sync hook conditions (auto-trigger on SKILL.md / agent changes)

Each item has "why deferred" and "trigger to reconsider" documented. Revisit after Phase E has shipped 10+ entities.

## Open Questions

1. ~~**Should build-research be a true stage skill or only a sub-routine of build-plan?**~~ **Resolved**: registered as a subroutine skill (`spacebridge:build-research`) loaded by new `spacebridge:researcher` agent. Dispatched only by build-plan internally via `Agent(subagent_type="spacebridge:researcher")`. Not on the FO-facing stage skill list. Promotable to standalone if a second caller emerges in Phase E+1.

2. ~~**Plan-checker subagent: inline prompt template or standalone skill?**~~ **Resolved**: inline prompt template stored in `build-plan` SKILL.md, passed to `Agent(subagent_type="general-purpose", model="sonnet", prompt=...)` at dispatch time. Not a registered skill. Rationale: single caller, reduces forge validation surface, fresh context preserved via subagent boundary regardless of skill registration.

3. **Workflow-index update frequency: per-advance or periodic?**
   - Current design: mod idle hook scans for changes.
   - Alternative: mod on every entity advance (more real-time, more I/O).
   - Recommendation: start with idle-hook periodic; switch to per-advance if dashboard shows staleness.

4. **DECISIONS.md manual entries: slash command or direct Edit?**
   - Current design: slash command `/spacebridge:decision add` (Phase E+1 polish).
   - Phase E: captain directly Edits DECISIONS.md manually if needed; mods sync auto-sourced entries.

5. **UAT captain interaction: single long AskUserQuestion session or multiple short ones?**
   - Current design: single session with all items presented, one AskUserQuestion per interactive item.
   - Concern: for entities with many UAT items, session can be long.
   - Alternative: batch automated first, report summary, then do interactive items — already what design specifies.

6. **Execute task subagent skill discovery: when does ToolSearch happen?**
   - Current design: execute orchestrator runs ToolSearch once per task (when no plan hint present) before dispatching task subagents. Selected skills passed to subagent via dispatch prompt.
   - Alternative 1: subagent itself runs ToolSearch (rejected — haiku subagents not reliable at skill selection reasoning).
   - Alternative 2: plan ensign does ToolSearch during planning (rejected — overloads plan stage, doesn't handle "plan doesn't know what's available").
   - Recommendation: stick with orchestrator-level discovery. Cache results across same-plan tasks when possible. Graceful fallback to empty skills list when no match.

## References

- Phase D plan: `docs/superpowers/plans/2026-04-10-phase-d-skill-contracts-and-so-expansion.md`
- Phase D milestone commit: `458a179`
- Build flow roadmap (predecessor): `docs/superpowers/specs/2026-04-10-build-flow-roadmap-phases-d-e-f.md`
- Spacebridge engine/bridge split design: `docs/superpowers/specs/2026-04-10-spacebridge-engine-bridge-split-design.md`
- Current pipeline README: `docs/build-pipeline/README.md`
- GSD research phase: `~/.claude/skills/gsd-research-phase/SKILL.md` + `~/.claude/agents/gsd-phase-researcher.md`
- GSD plan checker: `~/.claude/agents/gsd-plan-checker.md`
- GSD execute phase: `~/.claude/skills/gsd-execute-phase/SKILL.md` + `~/.claude/agents/gsd-executor.md`
- GSD verify work: `~/.claude/skills/gsd-verify-work/SKILL.md`
- Superpowers writing-plans: `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/writing-plans/SKILL.md`
- Superpowers subagent-driven: `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/subagent-driven-development/SKILL.md`
- Superpowers verification-before-completion: `~/.claude/plugins/cache/superpowers-marketplace/superpowers/5.0.7/skills/verification-before-completion/SKILL.md`
- kc-pr-flow knowledge capture: `~/.claude/plugins/local/kc-pr-flow/reference/knowledge-capture.md`
- kc-pr-flow review skill: `~/.claude/plugins/local/kc-pr-flow/skills/kc-pr-review/SKILL.md`
- pr-review-toolkit agents: `trailofbits:sharp-edges`, `trailofbits:differential-review`, `pr-review-toolkit:*`
- e2e-pipeline skills: `e2e-pipeline:e2e-map`, `e2e-flow`, `e2e-test`, `e2e-walkthrough`
- kc-plugin-forge: plugin validation workflow used to write all new spacebridge skills
- Phase E+1 candidates memory: `~/.claude/projects/-Users-kent-Project-spacedock/memory/phase-e-plus-1-candidates.md`
