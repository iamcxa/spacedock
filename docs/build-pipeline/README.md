---
commissioned-by: spacedock@0.9.0
entity-type: feature
entity-label: feature
entity-label-plural: features
id-style: sequential
stages:
  profiles:
    full:     [draft, brainstorm, explore, clarify, research, plan, execute, quality, seeding, e2e, docs, pr-draft, pr-review, shipped]
    standard: [draft, brainstorm, explore, clarify, plan, execute, quality, pr-draft, pr-review, shipped]
    express:  [draft, brainstorm, execute, quality, shipped]
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
      # Captain advances status: draft → brainstorm when ready to begin work.
      # Use draft for: feature ideas, bug captures, design notes, anything
      # not yet ready for active pipeline work.
    - name: brainstorm
      model: sonnet
      worktree: false
      gate: true
      # FO-inline triage: executability assessment → profile recommendation.
      # Express (5/5 + small): FO posts recommendation, captain confirms.
      # Standard/Full (≤4/5): FO asks captain A/B/C path:
      #   A) Interactive brainstorm (superpowers:brainstorming)
      #   B) Ensign analysis (dispatch to worktree, posts to dashboard)
      #   C) Captain provides approach directly
    - name: explore
      profiles: [full, standard]
      model: sonnet
    - name: clarify
      profiles: [full, standard]
      worktree: false
      manual: true
      gate: true
      skill: spacebridge:build-clarify
      # Science Officer runs interactive AskUserQuestion loop with captain.
      # Resolves: Open Questions, Assumptions, Option Comparisons from explore.
      # Produces: confirmed context, canonical references, profile assignment.
      # manual: true -- Science Officer invocation is captain-initiated,
      # not auto-dispatched by FO.
      # gate: true -- captain must approve context completeness before advancing.
      #
      # FALLBACK (no spacebridge installed):
      # Captain reviews entity body manually, edits Open Questions/Assumptions
      # directly, then advances status to plan via FO command.
    - name: research
      profiles: [full]
      agent: auto-researcher
      model: opus
    - name: plan
      profiles: [full, standard]
      gate: true
      model: opus
      # CONDITIONAL gate: only when plan involves schema change, cross-domain,
      # new public API, or new infra dependency. Otherwise auto-advance.
      # Architecture review by captain before execute begins.
    - name: execute
      model: opus
    - name: quality
      feedback-to: execute
      model: haiku
      # NOT a gate. Auto-advances when all checks pass.
      # Escalates to captain ONLY for: security findings, breaking API,
      # destructive migration, or 3 failed feedback rounds.
    - name: seeding
      profiles: [full]
      model: sonnet
      # CONDITIONAL: only when e2e needs test data not yet present
      # FO checks explore results for seed requirements
    - name: e2e
      profiles: [full]
      gate: true
      model: sonnet
      # Conditional feedback routing (FO decides based on failure reason):
      #   seed data insufficient → feedback-to: seeding
      #   code bug → feedback-to: execute
      #   infra failure → escalate to captain
    - name: docs
      profiles: [full]
      model: sonnet
      # CONDITIONAL: only when feature adds/changes public API, CLI, config,
      # or has breaking changes requiring migration guide
    - name: pr-draft
      profiles: [full, standard]
      model: sonnet
    - name: pr-review
      profiles: [full, standard]
      gate: true
      feedback-to: execute
      model: opus
    - name: shipped
      terminal: true
      worktree: false
---

# Idea to PR — Generalized Development Pipeline

A development pipeline that takes a brainstormed idea through codebase exploration, technical research, planning, implementation, quality gates, E2E testing, and PR creation. Designed for use across projects: Spacedock, Carlove, Recce, and others.

Features enter this workflow with a completed brainstorming spec (produced by `/build` skill's interactive Phase I). The spec contains the approach, alternatives considered, guardrails, and acceptance criteria. From here, the pipeline is fully autonomous — the first officer dispatches ensigns through each stage, only escalating to the captain at quality and pr-review gates when issues arise.

## Context Lake Protocol

See [CONTEXT-LAKE-PROTOCOL.md](./_docs/CONTEXT-LAKE-PROTOCOL.md) for the full specification of how ensigns use the context lake MCP tools (`store_insight`, `search_insights`, `invalidate_stale`) for cross-stage knowledge transfer.

**Quick summary:** Explore stores file-level insights (`source: read`), research/execute overwrite with verified knowledge (`source: manual`). Every ensign searches `file_path` exact match (freshness 30 days) before starting work. Content uses 5 lightweight tags: `[purpose]`, `[pattern]`, `[gotcha]`, `[correction]`, `[decision]`.

## Model Dispatch

Each stage specifies a `model:` property in the frontmatter. The first officer reads this and passes it to `Agent(model=...)` at dispatch time. If a stage has no `model:` property, the agent inherits the parent's model (typically the user's default from settings).

| Stage | Model | Rationale |
|-------|-------|-----------|
| explore | sonnet | Codebase search and classification — no deep reasoning needed |
| research | **opus** | Multi-source cross-reference synthesis requires high reasoning |
| plan | **opus** | Architecture decisions determine downstream quality |
| execute | **opus** | Code quality is the core deliverable |
| quality | haiku | Running CLI commands and parsing output |
| seeding | sonnet | Writing seed data following existing patterns |
| e2e | sonnet | Skill invocations + result reporting |
| docs | sonnet | Documentation writing |
| pr-draft | sonnet | PR content generation (kc-pr-create does the heavy lifting) |
| pr-review | **opus** | Finding bugs in code review requires high reasoning |

**FO dispatch rule:** When dispatching an agent for a stage, if the stage has a `model` property in the README frontmatter, include `model="{stage.model}"` in the Agent() call. Example:

```
Agent(
    subagent_type="spacedock:ensign",
    model="sonnet",                    ← from stage.model
    name="spacedock-ensign-{slug}-explore",
    prompt="..."
)
```

## Prerequisites

### Required — core pipeline cannot function without these

| Plugin | Install | Used by |
|--------|---------|---------|
| **superpowers** | `/plugin marketplace add superpowers` | explore (systematic-debugging), plan (writing-plans), execute (executing-plans) |

### Required for full pipeline — PR and E2E stages

| Plugin | Install | Used by | Without it |
|--------|---------|---------|------------|
| **kc-pr-flow** | `/plugin add local ~/.claude/plugins/local/kc-pr-flow` | pr-draft (kc-pr-create), pr-review (kc-pr-announce) | Ensign follows PR steps manually — push, `gh pr create`, annotate. Functional but less structured. |
| **e2e-pipeline** | `/plugin add local ~/.claude/plugins/local/e2e-pipeline` | e2e (e2e-map, e2e-flow, e2e-test) | E2E stage skipped entirely with warning. |
| **pr-review-toolkit** | Bundled with superpowers | pr-review (code-reviewer, comment-analyzer) | Ensign runs lightweight main-context pre-scan only. |

### Optional — enhance quality but not required

| Plugin | Install | Used by | Without it |
|--------|---------|---------|------------|
| **trailofbits/skills** | `/plugin marketplace add trailofbits/skills` | quality (static-analysis, insecure-defaults, supply-chain-risk-auditor, fp-check, sharp-edges, mutation-testing, variant-analysis), pr-review (differential-review) | Security scans skipped with `SKIP:` in stage report. Core quality checks (type-check, tests, lint, build) still run. |
| **context7** MCP server | `.mcp.json` configuration | research (Context7 subagent for library doc verification) | Research relies on Explorer (codebase) + Web Search only. Two-source instead of three-source verification. |

### Project-specific — only needed for certain target projects

| Plugin/Skill | Used by | When needed |
|--------------|---------|-------------|
| **expo-accessibility** | e2e (accessibility audit) | Expo/React Native projects only |
| **agent-browser** | e2e (browser automation) | Projects with web UI |

### Verification

FO can verify prerequisites at startup by checking skill availability:
```
Skill: "superpowers:writing-plans"  → if not found, STOP: "superpowers plugin required"
Skill: "kc-pr-flow:kc-pr-create"   → if not found, WARN: "kc-pr-flow not installed, PR stages will use manual fallback"
Skill: "static-analysis"           → if not found, NOTE: "trailofbits/skills not installed, security scans disabled"
```

## File Naming

Each feature is a markdown file named `{slug}.md` — lowercase, hyphens, no spaces. Example: `workflow-status-dashboard.md`.

## Schema

Every feature file has YAML frontmatter with these fields:

```yaml
---
id:
title: Human-readable name
status: explore
source:
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
---
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier, format determined by id-style in README frontmatter |
| `title` | string | Human-readable feature name |
| `status` | enum | One of: explore, research, plan, execute, quality, seeding, e2e, docs, pr-draft, pr-review, shipped |
| `source` | string | Where this feature came from (e.g., "commission seed", "brainstorming session") |
| `started` | ISO 8601 | When active work began |
| `completed` | ISO 8601 | When the feature reached terminal status |
| `verdict` | enum | PASSED or REJECTED — set at final stage |
| `score` | number | Priority score, 0.0–1.0 (optional) |
| `worktree` | string | Worktree path while a dispatched agent is active, empty otherwise |
| `issue` | string | GitHub issue reference (e.g., `#42` or `owner/repo#42`). Optional. |
| `pr` | string | GitHub PR reference (e.g., `#57` or `owner/repo#57`). Set when a PR is created. |
| `intent` | enum | `feature` or `bugfix` — determines whether explore includes root cause diagnosis |
| `scale` | enum | `Small` (<5 files, TDD-direct) or `Medium` (5-15 files, formal plan) |
| `project` | string | Target project name (e.g., "spacedock", "carlove", "recce") |

## Stages

### `explore`

The first stage after a feature enters the pipeline. An ensign performs deep codebase exploration to map all affected files and understand existing patterns.

- **Inputs:** Brainstorming spec from entity body (approach, guardrails, acceptance criteria), project CLAUDE.md files
- **Outputs:**
  - File list grouped by layer (domain, contract, router, view, seed, frontend)
  - Context lake insights stored for each relevant file discovered
  - Scale confirmation or revision based on actual file count
  - If `intent: bugfix`: root cause diagnosis via `Skill: "superpowers:systematic-debugging"`
  - Coverage infrastructure discovery (for quality stage):
    - Coverage command: detect `test:coverage` script, vitest/jest/pytest/go coverage config
    - Comparison script: look for `coverage-summary.*`, `coverage-report.*` in `.github/scripts/` or `scripts/`
    - Coverage format: Istanbul JSON (`coverage-final.json`), LCOV (`lcov.info`), or JSON summary
    - Baseline strategy: check if CI caches baseline (e.g., `actions/cache`), if baseline file is committed, or if none exists
    - Record findings in entity body under `## Coverage Infrastructure`
- **Good:** Every file has a one-line purpose note, insights cached to lake, scale validated against grep count, coverage infra documented
- **Bad:** File list without layer grouping, no store_insight calls, "obviously Small" without grep

### `research`

Verify the brainstorming spec's technical assumptions before planning. The auto-researcher agent dispatches 3 parallel subagents for multi-source verification.

- **Inputs:** Entity body (brainstorming spec + explore results), context lake insights
- **Outputs:**
  - Technical claims extracted from spec and explore results
  - Per-claim verification from Explorer (codebase), Context7 (library docs), and Web Search (community/version)
  - Cross-referenced synthesis with confidence levels (HIGH/MEDIUM/NONE)
  - Corrections for any incorrect assumptions, with cited sources
  - Verified patterns and corrections cached to context lake
- **Good:** Every claim has multi-source evidence, corrections cite specific documentation, insights stored for plan stage
- **Bad:** "Looks correct" without verification, skipping claims because "I know this API"

### `plan`

Produce an implementation plan informed by verified technical knowledge from the research stage. This is a **conditional approval gate** — the first officer escalates to the captain only when the plan involves architectural decisions (schema changes, cross-domain impact, new public APIs, new infrastructure dependencies). Small/routine plans auto-advance.

- **Inputs:** Entity body (spec + explore + research report), context lake (verified patterns)
- **Outputs:**
  - For Medium scale: formal plan document via `Skill: "superpowers:writing-plans"` saved to `docs/superpowers/specs/`
  - For Small scale: lightweight TDD checklist in entity body (test files, assertions, implementation files, quality gate commands)
  - Plan incorporates research corrections — no unverified assumptions
- **Good:** Plan has concrete file paths, test-first ordering, references research-verified patterns, quality gate steps included
- **Bad:** Vague plan ("update the router"), ignores research corrections, no test mentions

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

Implement the plan using Superpowers executing-plans skill with parallel worker subagents.

- **Inputs:** Plan document or TDD checklist, context lake (verified patterns + implementation insights)
- **Outputs:**
  - Implementation commits on the feature branch
  - TDD discipline: tests written before implementation code
  - Commit format: `{type}(scope): {description}` per logical change
  - Implementation decisions cached to context lake
- **Good:** TDD test-first, atomic commits, parallel dispatch where independent, research-verified patterns used
- **Bad:** No tests, single giant commit, ignoring research corrections, sequential when parallelizable

### `quality`

Run quality gate checks, security analysis, and engineering standards verification. **Not a gate** — auto-advances when all checks pass. Escalates to captain only for exceptional situations (security findings, breaking API changes, destructive migrations, or 3 failed feedback rounds).

- **Inputs:** Feature branch with implementation commits
- **Outputs:**
  - **Compilation & Tests:**
    - Type-check result (pass/fail with details)
    - Test results (pass/fail with counts)
    - Build result (pass/fail, frontend changes only)
    - Lint result (pass/fail, if configured)
  - **Code Coverage Delta** (uses `## Coverage Infrastructure` from explore stage):
    - If explore found no coverage tool: `[ ] SKIP: No coverage infrastructure detected`
    - **Step 1 — Feature branch coverage:**
      ```bash
      # Use the command explore discovered (examples):
      pnpm test:coverage                    # Node/vitest/jest
      pytest --cov --cov-report=json        # Python
      go test -coverprofile=coverage.out ./...  # Go
      deno test --coverage=cov_dir && deno coverage cov_dir --lcov > lcov.info  # Deno
      ```
      Collect artifacts: `coverage-final.json`, `lcov.info`, or equivalent.
    - **Step 2 — Baseline from main** (try in order, use first that works):
      1. **Comparison script** — if explore found one (e.g., `.github/scripts/coverage-summary.mjs`), it likely accepts `--baseline` and handles acquisition internally. Use it directly in Step 3.
      2. **Git artifact** — `git show main:coverage-baseline.json > /tmp/cov-baseline.json`. Works if CI commits or caches the baseline file on the main branch.
      3. **Temporary worktree** — create a disposable worktree on main, run the same coverage command, collect baseline:
         ```bash
         git worktree add /tmp/cov-main main
         cd /tmp/cov-main && <same coverage command>
         cp coverage-final.json /tmp/cov-baseline.json
         cd - && git worktree remove /tmp/cov-main
         ```
      4. **No baseline** — report absolute coverage only, skip delta comparison. Note in report: `baseline unavailable — showing absolute coverage only`.
    - **Step 3 — Compare:**
      - If project has comparison script: run it with both reports (e.g., `node .github/scripts/coverage-summary.mjs ./artifacts --baseline /tmp/cov-baseline.json --threshold 60`)
      - Otherwise: parse both JSON reports, compute per-group delta:
        ```
        Group            main    feature   delta
        domains/         84.2%   85.0%     +0.8%  ✅
        packages/        71.3%   69.1%     -2.2%  ⚠️
        overall          78.4%   78.1%     -0.3%  ✅ (within tolerance)
        ```
      - Tolerance: -2% (configurable via project threshold). Decrease within tolerance = pass.
    - **Step 4 — Changed-file coverage** (always, even without baseline):
      ```bash
      git diff --name-only $(git merge-base HEAD main)...HEAD -- '*.ts' '*.tsx' '*.py' '*.go'
      ```
      Cross-reference with coverage report. Flag:
      - New source files with 0% coverage
      - Changed files with coverage below project threshold (default 60%)
    - **Report format:**
      ```
      Coverage: 78.4% → 78.1% (-0.3%) ✅ within tolerance
      Changed files: 8 files, 1 flagged

      | File | Coverage | Status |
      |------|----------|--------|
      | src/domain/new-feature.ts | 92% | ✅ |
      | src/router/handler.ts | 0% | ⚠️ new — no tests |
      ```
  - **Security Analysis** (optional — requires `trailofbits/skills` marketplace plugin):
    - If installed:
      - `Skill: "static-analysis"` — CodeQL + Semgrep vulnerability scan on changed files
      - `Skill: "insecure-defaults"` — scan for hardcoded secrets, risky configs, dangerous defaults
      - `Skill: "supply-chain-risk-auditor"` — dependency vulnerability assessment (only when deps changed)
      - `Skill: "sharp-edges"` — flag dangerous API usage patterns, error-prone configs, footgun designs
      - `Skill: "mutation-testing"` — verify test quality by mutating code and checking if tests catch it (coverage alone is insufficient)
      - `Skill: "variant-analysis"` — after finding one vulnerability, search for similar patterns across the codebase
      - `Skill: "fp-check"` — verify security findings are not false positives before failing the gate (run LAST, after all other scans)
    - If not installed: skip with stage report entry:
      `[ ] SKIP: Security scans — trailofbits/skills not installed. Run /plugin marketplace add trailofbits/skills to enable.`
  - **API Contract Compatibility** (conditional: when contract/schema files changed):
    - **Step 1 — Identify contract changes:**
      ```bash
      git diff --name-only $(git merge-base HEAD main)...HEAD \
        | grep -E '\.(contract|schemas)\.(ts|json|yaml)$|openapi|swagger|graphql'
      ```
      If no matches: skip this section entirely.
    - **Step 2 — Classify changes:**
      For each changed contract file, diff against main and classify:
      ```bash
      git diff $(git merge-base HEAD main)...HEAD -- {contract_file}
      ```
      | Change Type | Classification | Examples |
      |-------------|---------------|----------|
      | Removed field/endpoint | **BREAKING** | deleted property, removed route |
      | Changed type | **BREAKING** | `string` → `number`, `optional` → `required` |
      | Narrowed enum | **BREAKING** | removed enum value consumers may use |
      | Added required field | **BREAKING** | new required property on request/response |
      | Added optional field | non-breaking | new optional property |
      | Added endpoint | non-breaking | new route |
      | Added enum value | non-breaking | expanded enum |
      | Docs/description only | non-breaking | comment changes |
    - **Step 3 — Report:**
      ```
      Contract changes: 3 files, 1 breaking

      | File | Change | Classification |
      |------|--------|---------------|
      | booking.contract.ts | removed `legacyId` field | BREAKING |
      | booking.contract.ts | added optional `notes` | non-breaking |
      | service.schemas.ts | added enum value `premium` | non-breaking |
      ```
    - Breaking change detected → escalate to captain (not auto-fail — may be intentional)
  - **Migration Safety** (conditional: when migration files present in diff):
    - **Step 1 — Identify migrations:**
      ```bash
      git diff --name-only $(git merge-base HEAD main)...HEAD \
        | grep -iE 'migration|\.sql$'
      ```
      If no matches: skip this section entirely.
    - **Step 2 — Scan for destructive operations:**
      For each migration file, grep for dangerous patterns:
      ```bash
      grep -inE 'DROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT|FUNCTION)|DELETE\s+FROM|TRUNCATE|ALTER\s+.*TYPE' {migration_file}
      ```
      Classify each match:
      | Pattern | Risk | Action |
      |---------|------|--------|
      | `DROP TABLE` | **destructive** — data loss | Escalate to captain |
      | `DROP COLUMN` | **destructive** — data loss | Escalate to captain |
      | `ALTER ... TYPE` | **risky** — may fail on existing data | Flag in report |
      | `DELETE FROM` | **destructive** — data loss | Escalate to captain |
      | `TRUNCATE` | **destructive** — data loss | Escalate to captain |
      | `DROP INDEX` | reversible | Note in report |
      | `DROP FUNCTION` | reversible (if recreated) | Check if function is recreated in same migration |
      | `ADD COLUMN ... NOT NULL` (no DEFAULT) | **risky** — fails on existing rows | Flag in report |
    - **Step 3 — Check reversibility:**
      - Does the migration have a corresponding `down` migration or rollback?
      - For Drizzle/Knex: check if rollback is generated
      - For raw SQL: check if a paired `_down.sql` exists
    - **Step 4 — Verify no broken references:**
      If columns/tables are dropped, grep codebase for references:
      ```bash
      # For each dropped column/table name
      grep -rl "{dropped_name}" domains/ apps/ packages/ --include="*.ts" | head -20
      ```
      References found → flag as potential runtime breakage.
    - **Step 5 — Report:**
      ```
      Migrations: 2 files, 1 destructive operation

      | File | Operation | Risk | References |
      |------|-----------|------|------------|
      | 0042_drop_legacy.sql | DROP COLUMN legacy_id | destructive | 3 files still reference |
      | 0043_add_notes.sql | ADD COLUMN notes TEXT | safe | — |
      ```
    - Destructive operations → escalate to captain
    - Broken references → feedback-to: execute (fix references before migration)
  - **License Compliance** (conditional: when lockfile/deps changed):
    - New dependencies checked for license compatibility
    - Flag: GPL/AGPL in MIT-licensed project, unknown licenses, no license
  - **Advance decision:**
    - All checks pass + zero confirmed security findings → **auto-advance** (no captain approval needed)
    - Compilation/test failures → feedback-to: execute (max 3 rounds, then escalate)
    - Coverage delta beyond tolerance (default -2%) or new files with 0% coverage → feedback-to: execute (add tests for flagged files)
    - Confirmed security findings → **escalate to captain** with severity assessment
    - Breaking API change → **escalate to captain** (intentional or not?)
    - Data-destructive migration → **escalate to captain**
- **Good:** All checks ran for affected scope, security scans completed, false positives filtered out, coverage maintained, breaking changes flagged
- **Bad:** Only partial checks, skipping security scans, ignoring coverage drop, treating all findings as blockers without fp-check

### `seeding`

Prepare test data required for E2E testing. **CONDITIONAL: only when E2E needs seed data not yet present** (e.g., new entity types, specific workflow states, or test user scenarios). Also dispatched via feedback when e2e fails due to insufficient test data.

- **Inputs:** Entity body (plan + acceptance criteria), explore results (seed requirements), e2e failure report (if feedback from e2e)
- **Outputs:**
  - Seed data scripts or builders for required test scenarios
  - Test users, entities, or workflow states needed by E2E flows
  - Seed validation (data actually exists in test environment after seeding)
  - If project has seed infrastructure: integrate with existing seed pattern (e.g., Snaplet Seed, fixtures)
- **Good:** Seed data matches E2E flow requirements exactly, uses project's existing seed patterns, validates data exists after creation
- **Bad:** Generic/random data that doesn't match test scenarios, bypassing project seed conventions, no validation

**FO conditional dispatch:** Check explore results for seed requirements (new entity types mentioned in acceptance criteria, specific states needed for testing). If no seed requirements detected AND no feedback from e2e → skip to e2e.

### `e2e`

Browser E2E testing for features with UI changes. This is an approval gate with conditional failure routing. Skipped for backend-only changes (first officer checks explore results for UI file paths).

- **Inputs:** Feature branch (quality gate passed), seeded test data (if seeding ran), context lake, E2E mappings
- **Outputs:**
  - Updated UI mappings if new pages added (via `Skill: "e2e-map"` — requires `e2e-pipeline` plugin)
  - Generated E2E flow from plan acceptance criteria (via `Skill: "e2e-flow"`)
  - Test execution results with artifacts (via `Skill: "e2e-test"`)
  - If `e2e-pipeline` not installed: entire e2e stage skipped with `SKIP: e2e-pipeline plugin not installed`
  - **Accessibility audit** (conditional: UI changes with user-facing components):
    - WCAG 2.1 AA compliance check on changed components
    - Screen reader attributes (`aria-label`, `role`, `accessibilityLabel`)
    - Keyboard navigation for interactive elements
    - Color contrast verification
    - `Skill: "expo-accessibility"` for Expo/React Native components
  - **Failure classification** (if test fails):
    - `SEED_INSUFFICIENT` — test data missing or incomplete (e.g., "no orders found", empty list)
    - `CODE_BUG` — selector mismatch, logic error, wrong API response
    - `INFRA_FAILURE` — browser crash, LLM API timeout, network error, environment issue
- **Good:** Flow generated from plan criteria, mapping updated for new pages, failure classified with evidence
- **Bad:** Skipped because "no mapping exists" (create the mapping), hardcoded flow not from plan, unclassified failure

**FO gate — conditional routing based on failure classification:**

| Classification | Action |
|----------------|--------|
| PASS | Auto-advance to pr-ship |
| `SEED_INSUFFICIENT` | Feedback-to: seeding (prepare missing data, then re-run e2e) |
| `CODE_BUG` | Feedback-to: execute (fix code, re-run quality → seeding? → e2e) |
| `INFRA_FAILURE` | Escalate to captain: retry / skip e2e / abort |
| Unclassified after 2 rounds | Escalate to captain |

### `docs`

Update documentation to reflect the implemented changes. **CONDITIONAL: only when the feature adds or changes public API, CLI commands, configuration, or has breaking changes requiring a migration guide.** Skipped for internal refactors, test-only changes, and cosmetic UI updates.

- **Inputs:** Feature branch (post-e2e), plan document, entity context (breaking changes from quality report)
- **Outputs:**
  - **API documentation** (conditional: new/changed endpoints):
    - OpenAPI/Swagger spec updated, or inline API doc comments updated
    - Request/response examples reflect new behavior
  - **CHANGELOG entry** (conditional: feat/fix types):
    - Entry follows Keep a Changelog format or project convention
    - Breaking changes highlighted with `BREAKING CHANGE:` prefix
    - Links to relevant issue/PR
  - **Migration guide** (conditional: breaking changes detected in quality):
    - Step-by-step upgrade instructions for consumers
    - Before/after code examples
    - Deprecation timeline if gradual migration
  - **README/CLAUDE.md updates** (conditional: new patterns, commands, or configuration):
    - New commands or configuration options documented
    - Architecture docs updated if structural changes
  - **Observability notes** (conditional: new endpoints/handlers):
    - Logging: new handlers have `createLogger()` calls
    - Sentry: breadcrumbs for critical paths
    - Metrics: counters/gauges for new business operations
- **Good:** Docs match implemented behavior exactly, changelog entry present for user-facing changes, migration guide for breaking changes, observability in place
- **Bad:** Docs describe planned behavior (not actual), missing changelog for feat/fix, no migration guide for breaking change, new endpoint with no logging

**FO conditional dispatch:** Check quality report for breaking API changes, explore results for new endpoints/commands, entity intent for feat/fix type. If none of these → skip to pr-draft.

### `pr-draft`

Create a draft PR with annotations. Ensign invokes `Skill: "kc-pr-flow:kc-pr-create"` with `--draft-only --no-announce` flags to execute Part A (Steps 1-9) of the PR lifecycle.

- **Inputs:** Feature branch (all checks passed), entity context (issue_id, E2E results, quality report)
- **Outputs:**
  - Draft PR on GitHub with conventional commit title and structured body
  - Self-review annotations posted as PR review comments (if >100 lines changed)
  - Linear issue commented with PR link (if `issue` field set)
  - PR_NUMBER and PR_URL captured in entity body (FO writes to frontmatter)
- **PR Size Check:**
  - Diff <500 lines → normal
  - Diff 500-1000 lines → note in entity: "Consider splitting for easier review"
  - Diff >1000 lines → escalate to captain: "PR is {N} lines. Split or proceed?"
- **Good:** Title follows conventional commits (<70 chars), body uses project PR template if present, annotations explain design decisions ("why" not "what"), E2E results and quality report included in body
- **Bad:** Title >70 chars, ignoring project PR template, annotations on self-explanatory code, missing test evidence in body, >1000 line PR without captain acknowledgment

**Skill invocation:** `Skill: "kc-pr-flow:kc-pr-create" --draft-only --no-announce`
- Step 1.5 (E2E suggestion): auto-skip — already handled by e2e stage
- Steps 4, 7 (interactive confirmations): auto-approve in pipeline context — the gate comes after pr-review, not before push

**Fallback (if kc-pr-flow not installed):** Ensign follows PR steps manually:
1. Generate title: `{type}({scope}): {description}` from entity context
2. Generate body: Summary + Test plan + quality report
3. `git push -u origin $(git branch --show-current)`
4. `gh pr create --draft --title "..." --body "..." --assignee @me`
5. Capture PR_NUMBER/PR_URL from output

### `pr-review`

Self-review loop followed by captain approval gate. Follows kc-pr-create Part B (Steps 10-12) and Part C (Step 13). Captain reviews the PR and self-review results before the PR is marked ready.

- **Inputs:** Draft PR (PR_NUMBER from entity), feature branch
- **Outputs:**
  - **Before gate (ensign does autonomously):**
    - **Security diff review** (optional — requires `trailofbits/skills`): `Skill: "differential-review"` — security-focused analysis on PR diff. If not installed: skip with `SKIP:` note.
    - **Self-review agents** dispatched in parallel (requires `pr-review-toolkit`, bundled with superpowers): `code-reviewer` (code quality, bugs) + `comment-analyzer` (comment accuracy). If unavailable: run lightweight main-context pre-scan only (CLAUDE.md compliance, stale refs, unused imports).
    - All findings classified: CODE/SUGGESTION → fixed, DOC/advisory → noted
    - Fixes committed and pushed (max 3 rounds)
    - Review summary written to entity body
  - **After captain approve (ensign continues):**
    - `gh pr ready {PR_NUMBER}` — PR marked ready for human review
    - CI gate (if configured): poll checks up to 5 min
    - Announce: detect demo artifacts → `Skill: "kc-pr-flow:kc-pr-announce"` (if artifacts found)
  - **On captain reject:**
    - Findings sent to execute stage via feedback-to
- **Good:** All CODE/SUGGESTION findings fixed before gate, review summary is clear and concise, PR marked ready only after captain approval, CI passes
- **Bad:** Infinite loop on NIT findings, marking ready without gate approval, blocking on advisory-only items

**Gate presentation format:**
```
Gate review: {entity title} — pr-review

  PR: #{PR_NUMBER} (draft) — {PR_URL}
  Title: {PR title}

  Self-review: {N} rounds
    Fixed: {N} items ({breakdown by severity})
    Advisory: {N} items (noted, not blocking)
    Result: {APPROVE | remaining issues}

  Assessment: {Recommend approve | Recommend reject: {reason}}
```

### `shipped`

Terminal stage. The feature's PR has been merged or is ready for merge. The entity is archived.

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

```yaml
---
id:
title: Feature name here
status: explore
source:
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
---

## Brainstorming Spec

APPROACH:     ...
ALTERNATIVE:  ...
GUARDRAILS:   ...
RATIONALE:    ...

## Acceptance Criteria

- ...
```

## Commit Discipline

- Commit status changes at dispatch and merge boundaries
- Commit feature body updates when substantive
