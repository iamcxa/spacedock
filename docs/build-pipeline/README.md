---
commissioned-by: spacedock@0.9.0
entity-type: feature
entity-label: feature
entity-label-plural: features
id-style: sequential
stages:
  defaults:
    worktree: true
    concurrency: 2
    # model: inherits from parent (user settings). Override per-stage below.
    # FO reads `model:` property and passes to Agent(model=...) at dispatch.
  states:
    - name: draft
      initial: true
      worktree: false
      manual: true
      # Captain captures entity here. Edit body, refine spec, capture intent.
      # FO does NOT auto-dispatch draft entities (manual: true).
      # Captain advances status: draft -> brainstorm when ready to begin work.
      # Use draft for: feature ideas, bug captures, design notes, anything
      # not yet ready for active pipeline work.
    - name: brainstorm
      model: sonnet
      worktree: false
      gate: true
      # FO-inline triage: executability assessment + approach pathing.
      # (Profile concept retired in Phase E -- all work follows single 10-stage path.)
      # FO asks captain A/B/C path:
      #   A) Interactive brainstorm (superpowers:brainstorming)
      #   B) Ensign analysis (dispatch to worktree, posts to dashboard)
      #   C) Captain provides approach directly
    - name: explore
      model: sonnet
      skill: spacedock:build-explore
      # Ensign loads build-explore skill for codebase mapping + question generation.
      # Hybrid classification: assumptions (Track A), options (Track B), questions (Track C).
      # Writes to entity body: ## Assumptions, ## Option Comparisons, ## Open Questions.
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-explore` is Phase F work (entity 055).
      #
      # FALLBACK (skill not found):
      # Ensign uses inline explore definition below (basic file mapping, no question generation).
    - name: clarify
      worktree: false
      manual: true
      gate: true
      skill: spacedock:build-clarify
      # NAMESPACE NOTE: Migration to `spacebridge:build-clarify` is Phase F work (entity 055).
      #
      # Science Officer (spacedock:science-officer agent) runs interactive
      # AskUserQuestion loop with captain.
      # Resolves: Open Questions, Assumptions, Option Comparisons from explore.
      # Produces: confirmed context, canonical references.
      # manual: true -- Science Officer invocation is captain-initiated,
      # not auto-dispatched by FO.
      # gate: true -- captain must approve context completeness before advancing.
      #
      # FALLBACK (skill not found):
      # Captain reviews entity body manually, edits Open Questions/Assumptions
      # directly, then advances status to plan via FO command.
    - name: plan
      gate: true
      model: opus
      skill: spacedock:build-plan
      # Plan orchestrator (opus) dispatches parallel research subagents internally
      # (each loads spacedock:build-research via spacedock:researcher agent).
      # Writes ## Research Findings / ## PLAN / ## UAT Spec / ## Validation Map.
      # Runs self-review + plan-checker subagent through up to 3 revision iterations.
      # Calls workflow-index append unconditionally at plan approval.
      #
      # CONDITIONAL gate: only when plan involves schema change, cross-domain,
      # new public API, or new infra dependency. Otherwise auto-advance.
      # Architecture review by captain before execute begins.
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-plan` is Phase F work (entity 055).
    - name: execute
      model: sonnet
      skill: spacedock:build-execute
      # Execute orchestrator (sonnet) builds wave graph from PLAN and dispatches
      # task subagents via spacedock:task-executor agent with per-task model hint
      # (haiku for mechanical, sonnet for integration, opus only on BLOCKED escalation).
      # Wave-parallel within each wave (when files_modified don't overlap),
      # serial across waves. Pre-commit hook fires per task commit.
      # Calls workflow-index update-status (planned -> in-flight) at stage entry.
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-execute` is Phase F work (entity 055).
    - name: quality
      feedback-to: execute
      model: haiku
      skill: spacedock:build-quality
      # NOT a gate. Auto-advances when all mechanical checks pass.
      # Pure project-wide verification: bun test, bun lint, tsc --noEmit, bun build.
      # No judgment, no commentary. Evidence-backed Stage Report.
      # Any fail -> feedback-to: execute (max 3 rounds, then escalate to captain).
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-quality` is Phase F work (entity 055).
    - name: review
      model: sonnet
      feedback-to: execute
      skill: spacedock:build-review
      # Judgment-based diff-level code review.
      # Pre-scan (CLAUDE.md / stale refs / import graph / plan consistency) runs
      # inline before parallel dispatch of pr-review-toolkit + trailofbits agents.
      # Invokes knowledge-capture in capture mode for D1/D2 staging.
      # CRITICAL/HIGH CODE findings -> feedback-to: execute.
      # PLAN advisory findings raise replan flag (captain decides).
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-review` is Phase F work (entity 055).
    - name: uat
      model: sonnet
      gate: true
      feedback-to: execute
      skill: spacedock:build-uat
      # Automated e2e + captain sign-off.
      # Orchestrates e2e-pipeline skills (e2e-map / e2e-flow / e2e-test) for
      # browser items; CLI/API items run directly; interactive items via
      # AskUserQuestion one-at-a-time.
      # Supports skip/resume via /spacedock:uat-resume slash command.
      # Infra fails auto-route to execute; assertion fails routed through captain review.
      #
      # NAMESPACE NOTE: Migration to `spacebridge:build-uat` is Phase F work (entity 055).
    - name: shipped
      terminal: true
      worktree: false
      # Terminal stage. Mod-driven: mods/pr-review-loop.md (Phase E+1) handles
      # gh pr create on merge hook and PR state polling on idle hook.
      # If mod not installed, captain manually creates PR from the completed
      # feature branch.
---

# Idea to PR -- Generalized Development Pipeline

A 10-stage development pipeline that takes a brainstormed idea through codebase exploration, clarification, planning with integrated multi-source research, wave-parallel implementation, mechanical quality gates, judgment-based code review, automated-plus-interactive UAT, and mod-driven PR lifecycle. Designed for use across projects: Spacedock, Carlove, Recce, and others.

Features enter this workflow with a completed brainstorming spec (produced by `/build` skill's interactive Phase I). The spec contains the approach, alternatives considered, guardrails, and acceptance criteria. From here, the pipeline is fully autonomous — the first officer dispatches ensigns through each stage, only escalating to the captain at conditional gates (plan architecture review, review CRITICAL/HIGH findings, UAT sign-off) when issues arise.

## Context Lake Protocol

See [CONTEXT-LAKE-PROTOCOL.md](./_docs/CONTEXT-LAKE-PROTOCOL.md) for the full specification of how ensigns use the context lake MCP tools (`store_insight`, `search_insights`, `invalidate_stale`) for cross-stage knowledge transfer.

**Quick summary:** Explore stores file-level insights (`source: read`), plan/execute overwrite with verified knowledge (`source: manual`). Every ensign searches `file_path` exact match (freshness 30 days) before starting work. Content uses 5 lightweight tags: `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`, `[decision]`.

## Model Dispatch

Each stage specifies a `model:` property in the frontmatter. The first officer reads this and passes it to `Agent(model=...)` at dispatch time. If a stage has no `model:` property, the agent inherits the parent's model (typically the user's default from settings).

| Stage | Model | Rationale |
|-------|-------|-----------|
| brainstorm | sonnet | FO-inline triage + approach pathing |
| explore | sonnet | Codebase search and classification — no deep reasoning needed |
| plan | **opus** | Orchestrates parallel research, writes PLAN/UAT Spec/Validation Map, runs plan-checker loop; architecture decisions determine downstream quality |
| execute | sonnet | Orchestrator only — dispatches per-task subagents with `model:` hint (haiku/sonnet/opus per task) for cost-optimized implementation |
| quality | haiku | Parsing CLI output (bun test / lint / tsc / build); no reasoning |
| review | sonnet | Classifies and synthesizes parallel review agent outputs into a verdict |
| uat | sonnet | Orchestrates e2e-pipeline + captain AskUserQuestion flow |

**FO dispatch rule:** When dispatching an agent for a stage, if the stage has a `model` property in the README frontmatter, include `model="{stage.model}"` in the Agent() call. Example:

```
Agent(
    subagent_type="spacedock:ensign",
    model="sonnet",                    ← from stage.model
    name="spacedock-ensign-{slug}-explore",
    prompt="..."
)
```

For stage skills loaded via `skill:` property, the ensign invokes the skill through the Skill tool after dispatch; the ensign subagent itself runs at the stage's declared model.

## Prerequisites

### Required — core pipeline cannot function without these

| Plugin | Install | Used by |
|--------|---------|---------|
| **superpowers** | `/plugin marketplace add superpowers` | explore (systematic-debugging), plan (writing-plans), execute (executing-plans) |

### Required for full pipeline — review and UAT stages

| Plugin | Install | Used by | Without it |
|--------|---------|---------|------------|
| **pr-review-toolkit** | `/plugin install pr-review-toolkit@claude-plugins-official` | review (code-reviewer, silent-failure-hunter, comment-analyzer, pr-test-analyzer, type-design-analyzer, code-simplifier) | Review stage falls back to inline pre-scan only (CLAUDE.md compliance, stale refs, import graph, plan consistency) |
| **e2e-pipeline** | `/plugin add local ~/.claude/plugins/local/e2e-pipeline` | uat (e2e-map, e2e-flow, e2e-test) | UAT browser items skipped with warning; CLI/API/interactive items still run |

### Optional — enhance quality but not required

| Plugin | Install | Used by | Without it |
|--------|---------|---------|------------|
| **trailofbits/skills** | `/plugin marketplace add trailofbits/skills` | review (differential-review, sharp-edges, variant-analysis) | Security-aware review dispatches skipped with `SKIP:` in Stage Report |
| **context7** MCP server | `.mcp.json` configuration | plan (via researcher agent for library doc verification) | Research falls back to Explorer (codebase) + Web Search only (two-source instead of three-source) |

### Project-specific — only needed for certain target projects

| Plugin/Skill | Used by | When needed |
|--------------|---------|-------------|
| **expo-accessibility** | uat (accessibility audit) | Expo/React Native projects only |
| **agent-browser** | uat (browser automation) | Projects with web UI |

### Verification

FO can verify prerequisites at startup by checking skill availability:
```
Skill: "superpowers:writing-plans"         → if not found, STOP: "superpowers plugin required"
Skill: "pr-review-toolkit:code-reviewer"   → if not found, WARN: "review stage will run pre-scan only"
Skill: "e2e-pipeline:e2e-test"             → if not found, WARN: "uat browser items will be skipped"
Skill: "static-analysis"                   → if not found, NOTE: "trailofbits/skills not installed, security-aware review disabled"
```

## File Naming

Each feature is a markdown file named `{slug}.md` — lowercase, hyphens, no spaces. Example: `workflow-status-dashboard.md`.

## Schema

Every feature file has YAML frontmatter with these fields:

```yaml
---
id:
title: Human-readable name
status: draft
context_status: pending
source: /build
created:
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project:
auto_advance:
uat_pending_count:
parent:
children:
---
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier, format determined by id-style in README frontmatter |
| `title` | string | Human-readable feature name |
| `status` | enum | One of: draft, brainstorm, explore, clarify, plan, execute, quality, review, uat, shipped, epic |
| `context_status` | enum | `pending`, `exploring`, `awaiting-clarify`, `ready`. Orthogonal to `status`. Tracks context maturity during draft/explore/clarify phases. |
| `source` | string | Where this feature came from (e.g., `/build`, `commission seed`) |
| `created` | ISO 8601 | Entity creation timestamp (set by `/build`) |
| `started` | ISO 8601 | When active work began (first move beyond draft) |
| `completed` | ISO 8601 | When the feature reached terminal status |
| `verdict` | enum | PASSED or REJECTED -- set at final stage |
| `score` | number | Priority score, 0.0-1.0 (optional) |
| `worktree` | string | Worktree path while a dispatched agent is active, empty otherwise |
| `issue` | string | GitHub issue reference (e.g., `#42` or `owner/repo#42`). Optional. |
| `pr` | string | GitHub PR reference (e.g., `#57` or `owner/repo#57`). Set when a PR is created. |
| `intent` | enum | `feature` or `bugfix` -- determines whether explore includes root cause diagnosis |
| `scale` | enum | `Small` (<5 files, TDD-direct), `Medium` (5-15 files, formal plan), or `Large` (>15 files, decomposition candidate) |
| `project` | string | Target project name (e.g., "spacedock", "carlove", "recce") |
| `auto_advance` | bool | If true, Science Officer advances status from clarify to plan without waiting for captain approval. |
| `uat_pending_count` | integer | Count of UAT items skipped with captain ack during uat stage. If non-zero, entity shipped with pending verification; `/spacedock:uat-resume {slug}` re-runs pending items. |
| `parent` | string | Slug of parent epic (if this entity was decomposed from a larger one). |
| `children` | list | `[slug1, slug2, ...]` (if this entity is an epic/tracker with child entities). |

## Stages

### `explore`

The first stage after a feature enters the pipeline. An ensign performs deep codebase exploration to map all affected files and understand existing patterns.

- **Inputs:** Brainstorming spec from entity body (approach, guardrails, acceptance criteria), project CLAUDE.md files
- **Outputs:**
  - File list grouped by layer (domain, contract, router, view, seed, frontend)
  - Context lake insights stored for each relevant file discovered
  - Scale confirmation or revision based on actual file count
  - If `intent: bugfix`: root cause diagnosis via `Skill: "superpowers:systematic-debugging"`
- **Good:** Every file has a one-line purpose note, insights cached to lake, scale validated against grep count
- **Bad:** File list without layer grouping, no store_insight calls, "obviously Small" without grep

### `plan`

Transform clarified entity context into an execution-proof plan. The plan orchestrator (opus) dispatches parallel research subagents internally (each loading `spacedock:build-research` via the researcher agent), synthesizes findings, writes the PLAN with UAT Spec and Validation Map, self-reviews, and runs a plan-checker subagent through up to 3 revision iterations before advancing.

This is a **conditional approval gate** — the first officer escalates to the captain only when the plan involves architectural decisions (schema changes, cross-domain impact, new public APIs, new infrastructure dependencies). Small/routine plans auto-advance.

- **Inputs:** Entity body (brainstorming spec, explore results, clarify outputs), context lake (verified patterns)
- **Outputs:**
  - `## Research Findings` — five domain sections with citations (Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples)
  - `## PLAN` — task list with per-task attributes (model, wave, skills hint, read_first, action, acceptance_criteria, files_modified)
  - `## UAT Spec` — testable items classified by type (browser/cli/api/interactive)
  - `## Validation Map` — requirement → task → command → status table
  - `## Stage Report: plan` — plan-checker verdict attached
  - `workflow-index append` called unconditionally at plan approval (closes the workflow-index-lifecycle-gap class)
- **Good:** Every AC in entity body maps to ≥1 task; every task has read_first/action/acceptance_criteria/files_modified/wave; plan-checker pass within ≤3 iterations
- **Bad:** Placeholder text ("TBD", "add appropriate", "similar to Task N"); tasks without acceptance_criteria; plan-checker escalation on 3rd iteration without captain hand-off

**FO conditional gate — architecture review triggers:**

| Signal | Example | Action |
|--------|---------|--------|
| Schema change | New table, column type change, migration file | Escalate to captain |
| Cross-domain impact | Saga crosses bounded context, shared type change | Escalate to captain |
| New public API | New endpoint, breaking contract change | Escalate to captain |
| New infra dependency | New queue, cache, external service | Escalate to captain |
| None of the above | Routine feature, bug fix, UI-only | Auto-advance to execute |

FO detects signals by scanning the plan for keywords: `migration`, `schema`, `saga`, `cross-domain`, `breaking change`, `new endpoint`, `new dependency`. Also checks explore results for multi-domain file changes.

### `execute`

Implement the plan via wave-based parallel task dispatch. The execute orchestrator (sonnet) builds a wave graph from `## PLAN`, dispatches task subagents through `spacedock:task-executor` agent with per-task model hints, collects changes, and commits serially per task.

- **Inputs:** `## PLAN` from plan stage, context lake (verified patterns + implementation insights)
- **Outputs:**
  - Implementation commits on the feature branch, one per task
  - Wave graph honored: Wave 0 (test infra if declared) → Wave 1 (independent tasks) → Wave 2 (depends on Wave 1) → ...
  - Per-task model dispatch: haiku for mechanical tasks, sonnet for integration, opus escalation on BLOCKED
  - Pre-commit hook fires per task commit (`bun lint --fix` + `tsc --incremental`)
  - `## Stage Report: execute` — per-task commit SHAs, deviations, BLOCKED escalations
  - `workflow-index update-status` transitions entries from planned → in-flight at stage entry
- **Good:** Parallel dispatch where independent, serial commits with conventional messages, plan honored (no scope creep), task subagents return `changed_files` without committing themselves
- **Bad:** Single giant commit, ignoring plan's serial/parallel hints, task subagent committing, scope creep beyond `files_modified`

### `quality`

Project-wide mechanical verification — "does the whole project still work?" **Not a gate** — auto-advances when all checks pass. Escalates to captain only on 3 consecutive execute feedback rounds.

- **Inputs:** Feature branch with implementation commits
- **Outputs:**
  - `bun test` full suite result (not targeted)
  - `bun lint` full project result
  - `tsc --noEmit` full project result
  - `bun build` result
  - Coverage threshold (if workflow config defines one)
  - `## Stage Report: quality` — per-check result with actual command output snippets
- **Rules:** Evidence-backed (actual command output quoted in Stage Report), binary pass/fail per check, zero commentary on code quality, any fail → `feedback-to: execute` with failing output
- **Good:** Evidence quoted verbatim; binary verdicts; full-project scope (not targeted)
- **Bad:** Aggregate "tests pass" without output, judgment on code quality, partial run, targeting only changed files

### `review`

Judgment-based diff-level code review. Scope is `git diff {execute_base}..HEAD` — only what this execute iteration changed. Combines a mechanical pre-scan (inline, no dispatch) with parallel dispatches of pr-review-toolkit and trailofbits review agents.

- **Inputs:** Feature branch, execute base commit SHA, context lake
- **Outputs:**
  - **Pre-scan** (inline): CLAUDE.md compliance walk, stale references grep, dependency chain check, plan consistency (diff matches PLAN's `files_modified`)
  - **Parallel dispatches**: `pr-review-toolkit:code-reviewer`, `silent-failure-hunter`, `comment-analyzer`, `pr-test-analyzer`, `type-design-analyzer`, `code-simplifier`, plus trailofbits `differential-review` / `sharp-edges` / `variant-analysis` (if installed)
  - Findings classified: severity (CRITICAL/HIGH/MEDIUM/LOW/NIT) × root (CODE/DOC/NEW/PLAN)
  - `spacedock:knowledge-capture` invoked in `capture` mode: D1 patterns auto-appended to plugin learned-patterns.md, D2 candidates staged to entity body `## Pending Knowledge Captures`
  - `## Stage Report: review` — classified findings table
- **Verdict routing:**
  - No CRITICAL/HIGH CODE findings → advance to uat
  - Any CRITICAL/HIGH CODE finding → `feedback-to: execute`
  - Any PLAN finding → raise replan flag in Stage Report (advisory — captain decides whether to reset status to plan)
- **Good:** Pre-scan catches mechanical issues before paying for subagent dispatch; consistent classification; D2 candidates staged (not applied) so FO handles captain interaction
- **Bad:** Skipping pre-scan, treating NIT findings as blockers, silently applying D2 candidates without FO handoff, dispatching review agents on the entire branch instead of `execute_base..HEAD` diff

### `uat`

User-observable behavior verification with automated e2e + captain sign-off. This is an approval gate. Supports skip/resume via the `/spacedock:uat-resume {slug}` captain slash command.

- **Inputs:** `## UAT Spec` from plan stage (items classified browser/cli/api/interactive), feature branch (quality + review passed)
- **Outputs:**
  - **Browser items**: `Skill: "e2e-pipeline:e2e-map"` coverage check + `e2e-flow` generation + `e2e-test` execution; artifacts (screenshots, video, trace)
  - **CLI items**: declared command execution with stdout/stderr/exit code capture
  - **API items**: declared curl/gh command execution with response/status code capture
  - **Interactive items**: captain AskUserQuestion one-at-a-time (not batched) — loaded via ToolSearch at runtime
  - `## UAT Results` — per-item table: item / status (pass/fail/skipped) / evidence refs / notes / re-attempt
  - If any items skipped with captain ack: entity frontmatter `uat_pending_count=N` set for future `/spacedock:uat-resume`
- **Failure classification:**
  - **Infra fail** (browser crash, URL 404, command not found, environment error) → `feedback-to: execute` without captain interaction (clear execute bug)
  - **Assertion fail with evidence** (screenshot shows wrong value, curl returns wrong body) → include in captain review; captain decides retry / override / feedback
- **Good:** Automated items run first (no captain cost for obvious failures); evidence attached to every item; skip reasons captured verbatim; failure classification drives routing
- **Bad:** Asking captain to retry infra failures, batching AskUserQuestion calls, unclassified failures, skipping items without captain ack

### `shipped`

Terminal stage. Mod-driven: `mods/pr-review-loop.md` (Phase E+1) handles PR lifecycle via merge and idle hooks.

- **Merge hook:** Draft PR summary from entity body (Stage Reports, UAT Results), ask captain approval, `git push origin {branch}` + `gh pr create`, set entity `pr: #{number}`. Engine skips default local merge.
- **Idle hook:** Poll `gh pr view {number} --json state,reviews,mergeable`:
  - MERGED → advance and archive
  - CHANGES_REQUESTED or CI fail → reset entity `status: execute`, clear `pr:`, log context in entity body
  - APPROVED + mergeable → merge and archive
  - OPEN + pending → no action
- **Startup hook:** Same PR-state checks as idle (defense in depth on session start)
- **Fallback** (mod not installed): Captain manually creates PR from the completed feature branch

The detailed shipped design (PR body template, PR agent review dispatch, human-review gate, merge strategy, post-merge cleanup) is deferred to Phase E+1. This README documents the mod contract; the mod itself ships separately.

## Workflow State

View the workflow overview:

```bash
docs/build-pipeline/status
```

Output columns: ID, SLUG, STATUS, TITLE, SCORE, SOURCE.

Include archived features with `--archived`:

```bash
docs/build-pipeline/status --archived
```

Find dispatchable features ready for their next stage:

```bash
docs/build-pipeline/status --next
```

Find features in a specific stage:

```bash
grep -l "status: explore" docs/build-pipeline/*.md
```

## Feature Template

Produced by `/build` invoking `spacedock:build-brainstorm`:

```yaml
---
id:
title: Feature name here
status: draft
context_status: pending
source: /build
created:
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project:
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> {captain's verbatim directive}

## Captain Context Snapshot

- **Repo**: {branch} @ {sha}
- **Session**: {recent journal summary}
- **Domain**: {classified domain(s)}
- **Related entities**: {matches or "None found"}
- **Created**: {ISO 8601 timestamp}

## Brainstorming Spec

**APPROACH**: ...

**ALTERNATIVE**: ... -- D-01 {rejection reason}

**GUARDRAILS**:
- ...

**RATIONALE**: ...

## Acceptance Criteria

- {criterion} (how to verify: {method})
- ...

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

## Commit Discipline

- Commit status changes at dispatch and merge boundaries
- Commit feature body updates when substantive
