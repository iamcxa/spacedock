---
id: 009
title: Dashboard Entity Visibility — Show All Entities with Stage Filtering
status: explore
source: session discussion
started:
completed:
verdict:
score: 0.9
worktree: .worktrees/ensign-dashboard-entity-visibility
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Features 001-006 completed (dashboard server, entity table)
- No dependency on 007 (channel plugin) or 008 (standalone plugin)

## Brainstorming Spec

APPROACH:     Dashboard shows ALL entities (active + archived) by default. Archived/shipped entities render with reduced opacity (gray text, muted badge). The stage chips in the workflow card header become clickable filters — click a chip to show only entities in that stage, click again to deselect. Multiple chips can be selected. "All" is the default (no filter). Entity count in header reflects visible count.
ALTERNATIVE:  Collapsible "Completed" section below active entities (rejected: hides the "war room" overview — captain wants one glance to see everything, not expand/collapse)
GUARDRAILS:   Active entities must remain visually prominent — shipped entities should NOT compete for attention. Filter state is client-side only (URL query param or sessionStorage), no backend state. Must handle workflows with many archived entities (100+) without performance issues.
RATIONALE:    The "war room" dashboard should show the full picture at a glance — how many features shipped, what's in progress, what's queued. Hiding archived entities loses context. Stage chips already display counts, making them interactive filters is a natural UX extension.

## Acceptance Criteria

- Dashboard scans `_archive/` directory and includes shipped entities in the table
- Shipped/archived entities display with reduced opacity (e.g., 0.5) and muted status badge
- Entity count in workflow card header shows total (e.g., "features · 7 total")
- Stage chips are clickable — clicking filters the table to show only that stage
- Active filter chip gets a visual highlight (brighter background/border)
- Click active chip again to deselect (back to showing all)
- Multiple chips can be selected simultaneously (OR filter)
- Default state: all entities visible, no filter active
- Filter persists across auto-refresh cycles (sessionStorage or URL param)
- Works for all workflows, not just build-pipeline

## Stage Report: explore

### 1. File List (by layer)

**Backend — Discovery / Scanning**
- `tools/dashboard/src/discovery.ts` — walkDir recursive walk + discoverWorkflows + aggregateWorkflow; calls scanEntities(workflowDir) but NOT _archive/
- `tools/dashboard/src/parsing.ts` — scanEntities() flat Bun.Glob("*.md") scan (non-recursive); parseFrontmatter(); parseStagesBlock()
- `tools/dashboard/src/types.ts` — Entity, WorkflowData, Stage interfaces; Entity has `[key: string]: string` index signature

**Backend — Server / API**
- `tools/dashboard/src/server.ts` — /api/workflows GET calls aggregateWorkflow per discovered dir; no archive query params; validatePath() allows _archive/ (it's within projectRoot)
- `tools/dashboard/src/api.ts` — entity detail/filter logic; not touched by this feature

**Frontend — Rendering**
- `tools/dashboard/static/app.js` — render() builds workflow cards + stage chips + entity table; sortState{} pattern for surviving re-renders; NO filter state yet
- `tools/dashboard/static/style.css` — .stage-chip, .stage-chip .count, .status-badge styles; NO .stage-chip--active class exists yet

### 2. Context Lake Insights Stored

All 6 files stored with source: read. Key findings cached:
- discovery.ts: scanEntities() is flat — does not reach _archive/
- parsing.ts: Bun.Glob non-recursive; separate call needed for _archive/
- app.js: sortState{} pattern to follow for filterState{}; sessionStorage is right persistence layer
- style.css: no active chip class exists; needs .stage-chip--active
- types.ts: Entity index signature constraint for adding archived field
- server.ts: /api/workflows has no archive logic; _archive/ passes validatePath() automatically

### 3. Scale Confirmation

**Confirmed: Small (3–4 files).** Actual file count: 4 files need changes.

Grep count verification:
- `tools/dashboard/src/discovery.ts` — aggregateWorkflow() needs to merge _archive/ entities
- `tools/dashboard/src/parsing.ts` — scanEntities() used as-is; caller change only
- `tools/dashboard/static/app.js` — filterState{}, chip click handlers, row opacity logic
- `tools/dashboard/static/style.css` — .stage-chip--active class, .entity-row--archived class

`types.ts` may need a minor Entity field addition (archived: string) — borderline, could be zero-change if archived is passed as a plain frontmatter field.

### 4. Coverage Infrastructure

From entity 007 (dashboard-channel-plugin, now in _archive/):
- **Test runner**: `bun test` (Bun built-in, no separate config needed)
- **Coverage command**: `bun test --coverage` (native Bun support)
- **Coverage reporters**: `--coverage-reporter=text` (default), `--coverage-reporter=lcov`
- **No test files currently exist** in `tools/dashboard/` — no `*.test.ts` files found
- **No `test:coverage` script** in `package.json` — run directly as `bun test --coverage`
- Quality stage baseline: run `bun test --coverage --coverage-reporter=text` and record pass/fail counts

### 5. Existing Patterns

**Entity scanning pattern (current):**
```
aggregateWorkflow(workflowDir)
  └── scanEntities(workflowDir)          ← flat Bun.Glob("*.md")
```

**Target pattern (after this feature):**
```
aggregateWorkflow(workflowDir)
  ├── scanEntities(workflowDir)          ← active entities (archived: "false")
  └── scanEntities(_archive/ subdir)     ← archived entities (archived: "true")
       combined → entities[]
```

**Stage chip rendering (current):** plain `<span class="stage-chip">` — no click handler, no active state.

**Target chip pattern:** click toggles entry in `filterState[wfIdx]` Set; chip gets `stage-chip--active` class when selected; entity rows filtered before sort; filter persisted to `sessionStorage`.

**Archive entity status:** files in `_archive/` have `status: shipped` (confirmed from entity 006 sample). These won't match any pipeline stage chip — they display in the table with opacity 0.5 but don't contribute to chip counts (correct per spec).

## Stage Report: execute

### Task 1: Backend — Scan _archive/ entities
- **Status**: done
- `discovery.ts`: added second `scanEntities()` call on `join(workflowDir, "_archive")` inside `aggregateWorkflow()`. Archived entities get `archived: "true"` field before merging into the entities array.
- `discovery.test.ts`: 3 tests — archived entities appear with `archived` field, shipped status counted separately, graceful handling when `_archive/` does not exist.
- **Commit**: `af0dd6c feat(009): scan _archive/ directory for archived entities`

### Task 2: Frontend — Render archived entities with muted style
- **Status**: done
- `app.js`: entity rows with `archived === "true"` or `status === "shipped"` get `entity-row--archived` class.
- `style.css`: `.entity-row--archived { opacity: 0.5; }` with muted status badge override.
- Entity count in workflow card header already shows total (includes archived via backend merge).
- **Commit**: `90b5371 feat(009): render archived entities with muted visual style`

### Task 3: Frontend — Stage chip click filtering
- **Status**: done
- `app.js`: `filterState` object (per workflow, Set of active stage names). Chip click toggles stage in Set. Active chips get `stage-chip--active` class. Entity table filters by selected stages (OR logic). No selection = show all. Filter state persisted to `sessionStorage`.
- `style.css`: `.stage-chip { cursor: pointer; }` and `.stage-chip--active { background: #58a6ff33; border: 1px solid #58a6ff; }`.
- **Commit**: `fea46a0 feat(009): add stage chip click filtering with sessionStorage persistence`

### Task 4: Verification
- `bun test`: 3 pass, 0 fail, 12 expect() calls — zero regressions
- TDD discipline followed: wrote failing test first, then implemented
- 3 atomic commits with clear messages
