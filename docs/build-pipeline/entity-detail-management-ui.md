---
id: 002
title: Entity Detail & Management UI
status: pr-ship
source: commission seed
started: 2026-04-04T02:55:00Z
completed:
verdict:
score: 0.8
worktree: .worktrees/ensign-entity-detail-management-ui
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Brainstorming Spec

APPROACH:     Extend the workflow dashboard with entity detail views — click an entity to see its full markdown content rendered, stage reports, metadata, and body sections. Add basic management: triage classification, priority adjustment, and stage filtering.
ALTERNATIVE:  Separate detail app with its own server (rejected: fragmented UX, two ports to manage)
GUARDRAILS:   Entity files are the source of truth — UI reads markdown, does not maintain a separate database. Any management actions write back to the markdown files. Must handle different entity schemas across workflows.
RATIONALE:    Builds on dashboard foundation. Read-then-write pattern keeps markdown files as SOT while giving a visual management layer for workflows like email triage and financial analysis.

## Acceptance Criteria

- Click entity row in dashboard → detail view with rendered markdown body
- Stage report sections (`## Stage Report: *`) rendered with checklist formatting
- Metadata panel showing all frontmatter fields
- Classification/tagging support for triage workflows (writes tags to entity frontmatter)
- Priority score adjustment (slider or input, writes to `score:` field)
- Filter entities by stage, score range, or custom tags
- Back navigation to workflow overview

## Explore Findings

### File List by Layer

**Domain — Entity parsing and frontmatter I/O**

| File | Purpose |
|------|---------|
| `skills/commission/bin/status` | Core entity parser and status viewer. `parse_frontmatter()`, `parse_stages_block()`, `scan_entities()`. Stdlib-only YAML parsing. |
| `scripts/codex_prepare_dispatch.py` | Entity read/write for dispatch. `split_frontmatter()`, `parse_frontmatter_map()`, `update_frontmatter_fields()`, `parse_stages()`, `extract_stage_definition()`. |
| `scripts/codex_finalize_terminal_entity.py` | Entity finalization. Duplicates frontmatter read/write helpers. Handles merge, archive to `_archive/`, worktree cleanup. |
| `scripts/test_lib.py` | `read_entity_frontmatter()` — third implementation of frontmatter parsing. Also `file_contains()`, `file_grep()` utilities. |

**Contract — Workflow schema and stage definitions**

| File | Purpose |
|------|---------|
| `docs/plans/README.md` | Canonical real-world workflow README. Full stage pipeline (backlog→ideation→implementation→validation→done) with all stage properties. |
| `tests/fixtures/rejection-flow/README.md` | Test fixture workflow with worktree stages, feedback-to, gates. 4-stage pipeline. |
| `tests/fixtures/gated-pipeline/README.md` | Minimal gated workflow (backlog→work→done). |
| `tests/fixtures/multi-stage-pipeline/README.md` | Minimal no-gate pipeline (backlog→work→review→done). |
| `references/first-officer-shared-core.md` | Workflow discovery (commissioned-by frontmatter), stage ordering, dispatch/completion lifecycle, gate/feedback semantics. |
| `references/ensign-shared-core.md` | Stage Report Protocol — exact markdown format with `[x]`/`[ ] SKIP:`/`[ ] FAIL:` checklist items + `### Summary`. |

**View — Entity examples with stage reports (rendering targets)**

| File | Purpose |
|------|---------|
| `tests/fixtures/gated-pipeline/gate-test-entity.md` | Entity with completed `## Stage Report: work` — checklist items + evidence + summary. |
| `tests/fixtures/rejection-flow/buggy-add-task.md` | Entity with acceptance criteria body + `## Stage Report: implementation`. |
| `tests/fixtures/output-format-default/format-test-entity.md` | Minimal entity in backlog, no stage report yet. |
| `tests/fixtures/output-format-custom/format-test-entity.md` | Entity for output format testing. |

**Seed / Config**

| File | Purpose |
|------|---------|
| `skills/commission/SKILL.md` | Commission skill — shows canonical schema generation, entity template, all frontmatter fields. |
| `.claude-plugin/plugin.json` | Plugin manifest v0.9.0. No web UI deps, no frontend framework — any UI is entirely new infrastructure. |
| `mods/pr-merge.md` | PR merge mod — adds `pr` field to entity frontmatter via hooks. |

**Project boundaries**

| File | Purpose |
|------|---------|
| `AGENTS.md` | Ensign edit boundaries. New web UI code goes in a new directory. |

### Existing Patterns for Markdown/YAML

1. **Frontmatter parsing** — Three independent stdlib-only implementations exist:
   - `skills/commission/bin/status:parse_frontmatter()` — simplest, reads key:value pairs between `---` delimiters
   - `scripts/codex_prepare_dispatch.py:split_frontmatter()` + `parse_frontmatter_map()` — separates frontmatter lines from body lines
   - `scripts/test_lib.py:read_entity_frontmatter()` — similar to status version

2. **Frontmatter write-back** — `update_frontmatter_fields()` in both `codex_prepare_dispatch.py` and `codex_finalize_terminal_entity.py`. Preserves body, updates specific fields, adds missing fields. This is the pattern feature 002 must use for score/tag writes.

3. **Stage parsing** — `parse_stages_block()` in status script and `parse_stages()` in codex_prepare_dispatch.py. Both extract stage names, properties (worktree, gate, terminal, initial, concurrency, feedback-to).

4. **Entity scanning** — `scan_entities()` in status script. Globs `*.md` excluding `README.md`, extracts frontmatter per file.

5. **Stage Report format** — Defined in `references/ensign-shared-core.md`. `## Stage Report: {stage_name}` heading, `- [x]`/`- [ ] SKIP:`/`- [ ] FAIL:` items with indented evidence, `### Summary` subsection.

6. **No markdown rendering exists** — The codebase has no HTML rendering of markdown content. No web server, no frontend framework, no CSS. Everything is CLI/Python. A web UI is entirely new.

### Dependencies on Feature 001 (Dashboard Foundation)

Feature 001 (Workflow Status Dashboard) will establish:
- **Web server infrastructure** — localhost dev server (technology TBD, likely Python or Node)
- **Workflow discovery** — scanning for README.md with `commissioned-by` frontmatter
- **Entity list/table** — sortable table with ID, slug, status, title, score, source
- **Frontmatter parser for the web layer** — may be a new JS/TS implementation or reuse Python via API
- **Auto-refresh** — polling or file watch mechanism

Feature 002 depends on all of the above and extends:
- Entity row click → detail view (requires router/navigation from feature 001)
- Markdown body rendering (new — feature 001 only shows tabular frontmatter data)
- Stage report parsing with checklist formatting (new)
- Metadata panel (extends frontmatter display from feature 001)
- Frontmatter write-back from UI (new — feature 001 is read-only)
- Filtering by stage/score/tags (may partially overlap with feature 001's sortable table)

### Scale Assessment

**Confirmed: Medium** — rationale:
- ~16 files directly relevant (parsing, schema, examples, config)
- No existing web UI or frontend code — everything must be built new
- However, the scope is well-bounded: extend an existing dashboard (feature 001) with detail views and basic management
- Core parsing patterns are established (3 implementations to reference/reuse)
- Main complexity is in the markdown rendering + frontmatter write-back, not in discovery of unknowns
- Dependency on feature 001 means some infrastructure decisions are deferred

## Stage Report: explore

- [x] File list grouped by layer — identify all files relevant to entity markdown parsing, rendering, frontmatter editing, and UI component patterns in the codebase
  16 files identified across 5 layers (domain, contract, view, seed/config, boundaries) documented in Explore Findings section
- [x] Context lake insights stored for each relevant file discovered
  16 insights stored via store_insight MCP tool for all key files
- [x] Scale confirmation or revision (currently Medium) based on actual file count — validate with grep/glob counts
  Medium confirmed: 16 relevant files, no existing web UI, well-bounded scope with established parsing patterns
- [x] Map existing patterns for markdown rendering, YAML frontmatter read/write, and entity file I/O already present in the codebase
  5 patterns documented: 3 frontmatter parsers, 1 write-back pattern, 2 stage parsers, 1 entity scanner, 1 stage report format. No markdown-to-HTML rendering exists.
- [x] Identify dependencies on feature 001 (dashboard foundation) and shared components/patterns that both features would use
  Feature 001 provides server infrastructure, workflow discovery, entity table, parser, and auto-refresh. Feature 002 extends with detail views, markdown rendering, stage report parsing, metadata panel, frontmatter write-back, and filtering.

### Summary

Deep exploration of the Spacedock codebase found 16 files relevant to feature 002 across domain parsing, workflow schema, entity examples, and configuration layers. Three independent stdlib-only YAML frontmatter parsers exist (in status, codex_prepare_dispatch, test_lib) plus a canonical write-back pattern in update_frontmatter_fields(). No web UI, frontend framework, or markdown rendering infrastructure exists — feature 002 depends entirely on feature 001 establishing the web server foundation. The Stage Report Protocol in ensign-shared-core.md defines the exact checklist format the detail view must parse and render.
