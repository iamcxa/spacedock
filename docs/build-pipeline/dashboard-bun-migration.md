---
id: 006
title: Dashboard Bun Migration — Python to self-contained TypeScript
status: explore
source: brainstorming session
started:
completed:
verdict:
score: 0.95
worktree: .worktrees/ensign-dashboard-bun-migration
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None — this is a prerequisite for features 003 (Real-time Agent Activity Feed) and 005 (Observability Integration)
- Features 003 and 005 are paused at plan stage, waiting for this migration to complete before re-planning on Bun architecture

## Brainstorming Spec

APPROACH:     Rewrite the dashboard server from Python (http.server + stdlib) to Bun (Bun.serve + TypeScript). The current Python dashboard (~500 LOC across 6 modules) becomes a single self-contained Bun server. WebSocket is built-in (no external dependency needed for feature 003). PostHog/Sentry are npm packages (simpler dependency management for feature 005). Frontend vanilla JS files are unchanged.
ALTERNATIVE:  Keep Python and add dependencies (rejected: breaks stdlib-only constraint, http.server not designed for WebSocket, nohup daemon hack is fragile, two-language frontend/backend split)
GUARDRAILS:   All existing functionality must be preserved — workflow discovery, entity table, detail view, frontmatter editing (score/tags), path validation, daemon management. Existing E2E flows and acceptance criteria remain the same. Python tests must be ported to Bun/TypeScript tests with equivalent coverage. The daemon (ctl.sh) stays as bash but launches `bun run` instead of `python3 -m`.
RATIONALE:    Captain identified that Python was a historical choice, not optimal. Bun provides built-in WebSocket, static file serving, and self-contained binary — eliminating the need for websockets, the threading hack, and the dependency management problem. Switching now (before 003 and 005 execute) avoids building on a foundation we'd replace later.

## What to migrate

| Python file | Bun equivalent | LOC estimate |
|-------------|---------------|--------------|
| `tools/dashboard/parsing.py` | `tools/dashboard/src/parsing.ts` | ~50 |
| `tools/dashboard/discovery.py` | `tools/dashboard/src/discovery.ts` | ~40 |
| `tools/dashboard/handlers.py` | Replaced by `Bun.serve()` routes in `server.ts` | — |
| `tools/dashboard/api.py` | `tools/dashboard/src/api.ts` | ~100 |
| `tools/dashboard/frontmatter_io.py` | `tools/dashboard/src/frontmatter-io.ts` | ~80 |
| `tools/dashboard/serve.py` | `tools/dashboard/src/server.ts` | ~80 |
| `tools/dashboard/__init__.py` | Delete | — |
| `tools/dashboard/__main__.py` | Delete | — |
| `tools/dashboard/ctl.sh` | Update: `bun run` instead of `python3 -m` | ~5 lines changed |
| `tools/dashboard/static/*` | **Unchanged** — same vanilla JS/HTML/CSS | 0 |

## What stays the same

- `tools/dashboard/static/` — all frontend files untouched
- `tools/dashboard/ctl.sh` — daemon management logic stays, just changes the launch command
- `~/.spacedock/dashboard/` — runtime state directory structure unchanged
- `/dashboard` skill — SKILL.md unchanged
- All acceptance criteria from features 001, 002, 004

## Acceptance Criteria

- All existing dashboard functionality works: workflow discovery, entity table, detail view, score/tag editing, filtering
- Path validation (security fix) preserved in Bun routes
- `ctl.sh start/stop/status` works with Bun server
- All existing Python tests ported to TypeScript with equivalent coverage
- `bun run tools/dashboard/src/server.ts` starts the server on localhost
- No Python dependencies needed for the dashboard
- Frontend files unchanged (same HTML/CSS/JS)

## Explore Findings

### File list grouped by layer

**Domain layer (parsing/discovery logic) — to port to TypeScript:**

| File | LOC | Key functions |
|------|-----|---------------|
| `tools/dashboard/parsing.py` | 149 | `parse_frontmatter(filepath)` — flat key:value extraction, skips indented lines; `parse_stages_block(filepath)` — nested YAML parser for stages defaults/states with indent tracking; `scan_entities(directory)` — glob *.md excluding README.md, returns list with slug/path/fields |
| `tools/dashboard/discovery.py` | 70 | `IGNORED_DIRS` set (8 dirs); `discover_workflows(root)` — os.walk with dirnames pruning, checks commissioned-by prefix; `aggregate_workflow(workflow_dir)` — combines parsing into single dict with entity_count_by_stage |
| `tools/dashboard/frontmatter_io.py` | 172 | `split_frontmatter(text)` — dict + body; `parse_tags(raw)` — comma-separated to list; `parse_entity(text)` — {frontmatter, tags, body}; `update_frontmatter_fields(text, updates)` — in-place preserving order; `update_entity_score/tags`; `extract_stage_reports(text)` — regex parser for Stage Report Protocol |

**Contract/API layer — to port to TypeScript:**

| File | LOC | Key functions |
|------|-----|---------------|
| `tools/dashboard/api.py` | 104 | `get_entity_detail(filepath)`, `update_score(filepath, new_score)`, `update_tags(filepath, tags)`, `filter_entities(directory, status, tag, min_score, max_score)` — AND filter with float parsing; `_scan_entities(directory)` — enriched duplicate of parsing.scan_entities |

**Router/Server layer — replaced by Bun.serve():**

| File | LOC | Key functions |
|------|-----|---------------|
| `tools/dashboard/handlers.py` | 170 | `make_handler(project_root, static_dir, log_file)` factory; Routes: GET /api/workflows, GET /api/entity/detail, GET /api/entities, POST /api/entity/score, POST /api/entity/tags, GET /detail, GET /, GET /<file>; `_validate_path()` — os.path.realpath traversal guard; `_serve_static()` — realpath check + MIME types; `log_message()` — file logging |
| `tools/dashboard/serve.py` | 61 | `main()` — argparse (--port 8420, --root, --log-file), git toplevel resolution, ThreadingHTTPServer, banner, KeyboardInterrupt shutdown |
| `tools/dashboard/__init__.py` | 0 | Empty package marker — delete |
| `tools/dashboard/__main__.py` | 3 | Entry point: `from tools.dashboard.serve import main; main()` — delete |

**Shell layer — update only:**

| File | LOC | Lines to change |
|------|-----|-----------------|
| `tools/dashboard/ctl.sh` | 331 | Line 152: `nohup python3 -m tools.dashboard.serve \` changes to `nohup bun run tools/dashboard/src/server.ts \` — only 1 line references python3 |

**Frontend/View layer — unchanged (no Python dependencies):**

| File | LOC | Notes |
|------|-----|-------|
| `tools/dashboard/static/index.html` | 19 | HTML shell, loads style.css + app.js |
| `tools/dashboard/static/app.js` | 163 | Vanilla JS, fetch /api/workflows, render workflow cards/tables, 5s polling |
| `tools/dashboard/static/style.css` | 108 | Dark theme CSS |
| `tools/dashboard/static/detail.html` | 60 | Entity detail page, loads marked.js + DOMPurify from CDN |
| `tools/dashboard/static/detail.js` | 215 | Vanilla JS, entity detail rendering, score/tag management |
| `tools/dashboard/static/detail.css` | 308 | Detail page dark theme CSS |

**Test layer — to port to bun:test:**

| File | LOC | Test count | What it tests |
|------|-----|------------|---------------|
| `tests/test_dashboard_parsing.py` | 154 | 8 tests | parse_frontmatter, parse_stages_block, scan_entities |
| `tests/test_dashboard_discovery.py` | 154 | 6 tests | discover_workflows, aggregate_workflow |
| `tests/test_dashboard_handlers.py` | 290 | 14 tests | HTTP routing, JSON responses, log file, path traversal guard, argparse |
| `tests/test_dashboard_ctl.py` | 253 | 8 tests | ctl.sh start/stop/status/restart via subprocess |
| `tests/test_frontmatter_io.py` | 142 | 8 tests | parse_entity, update_entity_score, update_entity_tags |
| `tests/test_detail_rendering.py` | 121 | 4 tests | extract_stage_reports |
| `tests/test_api.py` | 148 | 7 tests | get_entity_detail, update_score, update_tags, filter_entities |

### Python function/class to TypeScript mapping

**parsing.ts** (from parsing.py):
- `parseFrontmatter(filepath: string): Record<string, string>` — file-based, reads and parses
- `parseStagesBlock(filepath: string): Stage[] | null` — complex nested parser
- `scanEntities(directory: string): Entity[]` — glob + parse

**discovery.ts** (from discovery.py):
- `IGNORED_DIRS: Set<string>` — constant
- `discoverWorkflows(root: string): Workflow[]` — recursive walk
- `aggregateWorkflow(workflowDir: string): WorkflowData | null` — aggregate

**frontmatter-io.ts** (from frontmatter_io.py):
- `splitFrontmatter(text: string): { frontmatter: Record<string, string>, body: string }` 
- `parseTags(raw: string): string[]`
- `parseEntity(text: string): Entity`
- `updateFrontmatterFields(text: string, updates: Record<string, string>): string`
- `updateEntityScore(text: string, newScore: number): string`
- `updateEntityTags(text: string, tags: string[]): string`
- `extractStageReports(text: string): StageReport[]`

**api.ts** (from api.py):
- `getEntityDetail(filepath: string): EntityDetail`
- `updateScore(filepath: string, newScore: number): void`
- `updateTags(filepath: string, tags: string[]): void`
- `filterEntities(directory: string, filters: FilterOptions): EntityDetail[]`

**server.ts** (replaces handlers.py + serve.py):
- `Bun.serve()` with route matching for all GET/POST endpoints
- Path validation via `Bun.resolveSync()` or `path.resolve()` + startsWith check
- Static file serving via `Bun.file()`
- CLI args via `process.argv` parsing or `parseArgs` from `util`
- Git toplevel resolution via `Bun.spawn(['git', ...])`

### Scale assessment

- **Python source to port**: 726 LOC across 6 modules (parsing 149 + discovery 70 + frontmatter_io 172 + api 104 + handlers 170 + serve 61)
- **Python tests to port**: 1,262 LOC across 7 test files (55 total test methods)
- **Shell to update**: 1 line in ctl.sh
- **Frontend**: 0 changes (873 LOC across 6 files, all pure vanilla JS/HTML/CSS)
- **Files to delete**: __init__.py, __main__.py, and all 6 .py source files after migration
- **Confirmed scale: Medium** — matches original estimate. Straightforward 1:1 port, no architectural surprises.

### Environment

- Bun 1.3.9 installed at `/Users/kent/.bun/bin/bun`
- Frontend files are 100% Python-independent (vanilla JS, fetch API, CDN dependencies only)

## Stage Report: explore

- [x] File list grouped by layer -- every Python file with exact line count and key functions to port
  726 LOC Python source across 6 modules, 1262 LOC tests across 7 files, grouped into domain/contract/router/shell/view/test layers
- [x] Context lake insights stored for each file
  14 insights stored (6 source + 7 test + 1 ctl.sh), all with migration-specific annotations
- [x] Scale confirmation or revision based on actual complexity found
  Confirmed Medium -- 726 LOC source is a clean 1:1 port, no hidden complexity or cross-module entanglement
- [x] Map every Python function/class that needs a TypeScript equivalent
  22 functions mapped across 5 target TypeScript modules (parsing.ts, discovery.ts, frontmatter-io.ts, api.ts, server.ts)
- [x] Verify Bun is available and frontend files are Python-independent
  Bun 1.3.9 at /Users/kent/.bun/bin/bun; all 6 frontend files are pure vanilla JS/HTML/CSS with zero Python dependencies

### Summary

Complete exploration of all 22 files involved in the dashboard Bun migration. The Python codebase is 726 LOC across 6 modules with clean separation: parsing/discovery (domain), frontmatter_io (contract), api (service), handlers+serve (router/server). All 55 test methods across 7 test files were catalogued. The only ctl.sh change is line 152 (python3 to bun run). Scale confirmed as Medium with no surprises.
