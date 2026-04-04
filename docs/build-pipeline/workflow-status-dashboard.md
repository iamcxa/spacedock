---
id: 001
title: Workflow Status Dashboard
status: explore
source: commission seed
started:
completed:
verdict:
score: 0.9
worktree: .worktrees/ensign-workflow-status-dashboard
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Brainstorming Spec

APPROACH:     Build a web UI that scans workflow directories for entity markdown files, parses YAML frontmatter, and renders a dashboard showing all workflows and their entity status. Serve via a local dev server (similar to nightwatch report pattern).
ALTERNATIVE:  CLI-only TUI dashboard using blessed/ink (rejected: limited layout, no persistent view, can't share URL)
GUARDRAILS:   Must work with any Spacedock workflow (generic parser, not hardcoded to specific stages). Read-only initially — no entity modification from UI.
RATIONALE:    Web UI allows rich layout (tables, filters, color-coded stages), persistent view in a browser tab, and future extensibility to management features.

## Acceptance Criteria

- Web UI served on localhost (configurable port)
- Scans current directory and subdirectories for Spacedock workflow README.md files (identified by `commissioned-by: spacedock@` frontmatter)
- For each workflow found: displays mission, stage pipeline, entity count per stage
- For each entity: displays id, title, status, score, source in a sortable table
- Auto-refreshes (polling or file watch) when entity files change
- Works with any Spacedock workflow — no hardcoded stage names

## Explore Findings

### File List by Layer

#### Domain — YAML Frontmatter Parsing & Workflow Discovery

| File | Purpose |
|------|---------|
| `skills/commission/bin/status` | Core status viewer (Python 3 stdlib). Contains `parse_frontmatter()`, `parse_stages_block()`, `scan_entities()` — the primary reusable parsing module for the dashboard |
| `references/first-officer-shared-core.md` | Defines workflow discovery algorithm: search for README.md with `commissioned-by: spacedock@...` frontmatter, ignore `.git/.worktrees/node_modules/vendor/dist/build/__pycache__` |
| `skills/commission/SKILL.md` | Defines the full README template and entity schema (id, title, status, source, started, completed, verdict, score, worktree, issue, pr) |
| `skills/refit/SKILL.md` | Another consumer of YAML frontmatter parsing — reads `commissioned-by` version stamps from README |

#### Contract — Workflow Schema & Stage Definitions

| File | Purpose |
|------|---------|
| `docs/plans/README.md` | Live workflow README example: `commissioned-by: spacedock@0.9.0`, stages block with defaults/states, entity-type/label/id-style fields |
| `tests/fixtures/rejection-flow/README.md` | Test fixture workflow README — minimal stages block example |
| `tests/fixtures/gated-pipeline/status` | Legacy bash status script in test fixture — older pattern, superseded by Python status script |
| `tests/fixtures/*/README.md` (7 fixtures) | Various workflow README patterns for testing different stage configurations |

#### Router / Web Serving — NEW (nothing exists yet)

| File | Purpose |
|------|---------|
| (none) | No existing web server, HTTP handler, or routing infrastructure. No `package.json`, no JS/TS/HTML files. The project is pure Python 3 stdlib + markdown. |

#### View / Frontend — NEW (nothing exists yet)

| File | Purpose |
|------|---------|
| (none) | No existing UI framework, CSS, or frontend code. Dashboard will need to be built from scratch. |

#### Seed / Test Infrastructure

| File | Purpose |
|------|---------|
| `tests/test_status_script.py` | Comprehensive tests for status script parsing — covers frontmatter parsing, stage ordering, --next eligibility, --where filtering. Uses `tempfile` fixtures with `make_pipeline()` helper |
| `tests/test_output_format.py` | Tests for status output formatting |
| `tests/test_stats_extraction.py` | Tests for statistics extraction |

#### Configuration & Plugin Infrastructure

| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest: name=spacedock, version=0.9.0. No dependencies declared |
| `.claude-plugin/marketplace.json` | Marketplace listing metadata |
| `.gitignore` | Ignores `.worktrees/`, `__pycache__/`, `*.pyc` |
| `agents/first-officer.md` | First officer agent definition — dispatches ensigns, references spacedock:first-officer skill |
| `agents/ensign.md` | Ensign agent definition — executes stage work |
| `mods/pr-merge.md` | PR merge mod with startup/idle/merge hooks — demonstrates mod hook pattern |

### Existing Patterns to Reuse

1. **YAML Frontmatter Parsing**: `parse_frontmatter()` in `skills/commission/bin/status` — stdlib-only, handles empty fields, splits on first colon, skips indented lines (nested YAML). Can be imported or adapted directly.

2. **Stage Metadata Parsing**: `parse_stages_block()` in same file — parses `stages:` block from README frontmatter including `defaults:` and `states:` with all properties (name, worktree, concurrency, gate, terminal, initial, fresh, feedback-to).

3. **Entity Scanning**: `scan_entities()` — globs `*.md` in a directory, excludes `README.md`, extracts slug from filename, populates default fields.

4. **Workflow Discovery**: Defined in `references/first-officer-shared-core.md` — search for README.md files with `commissioned-by: spacedock@` in frontmatter. The dashboard must replicate this recursive directory search.

5. **No Web Patterns Exist**: The project has zero web infrastructure — no HTTP servers, no JS/TS, no HTML, no package.json. The dashboard will be the first web component. Given the Python 3 stdlib constraint of the existing codebase, `http.server` is the natural fit. Alternatively, a lightweight dependency (Flask, FastAPI) could be introduced.

6. **No File Watch Patterns Exist**: No `inotify`, `fswatch`, `chokidar`, or polling patterns in the codebase. Auto-refresh will need to be built fresh — either server-side polling + SSE, or client-side polling via JS `setInterval`.

### Scale Assessment

**Confirmed: Medium** — rationale:

- **New code required**: Web server (~1 file), HTML/CSS/JS frontend (~1-2 files), workflow discovery + aggregation logic (~1 file), auto-refresh mechanism
- **Reusable code**: `parse_frontmatter()`, `parse_stages_block()`, `scan_entities()` from `skills/commission/bin/status` provide ~60% of the backend data logic
- **Files to create**: Estimated 3-5 new files (server script, HTML template, possibly separate CSS/JS)
- **Files to modify**: 0-1 (possibly `plugin.json` to add a dashboard command, or a new skill entry)
- **No existing web infrastructure**: Everything web-related is greenfield, but the data layer is well-established
- **Total codebase**: 183 files, 140 markdown, 24 Python. Dashboard touches a small, well-isolated subset
- **Entity 002** (entity-detail-management-ui) explicitly depends on this dashboard as its foundation

## Stage Report: explore

- [x] File list grouped by layer
  Documented 6 layers: domain (4 files), contract (9 files), router (0 - new), view (0 - new), seed/test (3 files), config/plugin (6 files)
- [x] Context lake insights stored for each relevant file discovered
  Stored 10 insights via store_insight MCP tool for all key files: status script, shared core, plans README, commission SKILL, plugin.json, test_status_script, first-officer agent, entity-detail-management-ui, pr-merge mod, refit SKILL
- [x] Scale confirmation or revision (currently Medium) based on actual file count
  Confirmed Medium: 3-5 new files needed, ~60% backend data logic reusable from existing status script, zero existing web infrastructure means greenfield for server/frontend but well-scoped
- [x] Map existing patterns for web serving, file watching, and YAML frontmatter parsing
  YAML parsing: parse_frontmatter() + parse_stages_block() + scan_entities() in status script. Web serving: none exists. File watching: none exists. Both must be built from scratch.
- [x] Identify any existing UI/web infrastructure or dependencies
  None found. No package.json, no JS/TS/HTML, no web frameworks. Project is pure Python 3 stdlib + markdown. Dashboard will be the first web component.

### Summary

Deep exploration of the Spacedock codebase confirms this is a pure Python 3 stdlib + markdown project with no existing web infrastructure. The critical reusable asset is `skills/commission/bin/status` which contains all YAML frontmatter parsing, stage metadata extraction, and entity scanning logic. The workflow discovery algorithm is documented in `references/first-officer-shared-core.md` (search for README.md with `commissioned-by: spacedock@` frontmatter). Scale confirmed as Medium: the data layer is well-established and reusable, but web server, frontend, and auto-refresh are all greenfield. Entity 002 (entity-detail-management-ui) depends on this dashboard as its foundation.
