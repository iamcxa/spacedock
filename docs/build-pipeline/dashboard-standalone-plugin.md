---
id: 008
title: Dashboard as Standalone Plugin — Independent Packaging & Distribution
status: explore
source: session discussion
started: 2026-04-05T18:00:00+08:00
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-standalone-plugin
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires feature 007 completed** — channel plugin implementation (channel.ts, MCP capabilities, conversation UI)
- Spacedock plugin system (plugin.json, .mcp.json, marketplace publishing)

## Brainstorming Spec

APPROACH:     Extract the dashboard (tools/dashboard/) into its own standalone Claude Code plugin, separate from the spacedock core plugin. The dashboard plugin has its own plugin.json, .mcp.json (with channel server registration), and npm dependencies (@modelcontextprotocol/sdk). Users install it independently and enable it with `--channels plugin:spacedock-dashboard`. This decouples the dashboard lifecycle from the spacedock workflow engine.
ALTERNATIVE:  Keep dashboard inside spacedock plugin and add tools/dashboard/ to the plugin distribution (rejected: spacedock core is stdlib-only Python/scripts, dashboard is Bun/TypeScript with npm deps — mixing runtimes in one plugin creates install complexity and bloats the core plugin)
GUARDRAILS:   Dashboard plugin must work with any spacedock workflow, not just build-pipeline. Plugin packaging must handle npm dependencies (bun install step). Channel server registration via .mcp.json must use ${CLAUDE_PLUGIN_ROOT} for portable paths. Must work as both marketplace plugin and local plugin.
RATIONALE:    Clean separation of concerns — spacedock core handles workflow orchestration (agents, stages, entities), dashboard handles visualization and interactive control (web UI, channels). Different runtimes (Python vs Bun), different dependency models (stdlib vs npm), different release cadences. Similar to how fakechat is a separate plugin from Claude Code core.

## Affected Files

### Layer: Dashboard Source (tools/dashboard/) — moves to plugin root

| File | Purpose | Notes |
|------|---------|-------|
| `tools/dashboard/src/server.ts` | HTTP + WebSocket server, Bun.serve() | Self-contained; `staticDir` resolves relative to `import.meta.dir` — portable |
| `tools/dashboard/src/channel.ts` | MCP channel server entry point | Self-contained; no spacedock core paths |
| `tools/dashboard/src/discovery.ts` | Workflow discovery by walking project root | Self-contained; root passed as argument |
| `tools/dashboard/src/api.ts` | Route business logic (entity CRUD) | Self-contained |
| `tools/dashboard/src/events.ts` | EventBuffer for activity feed | Self-contained |
| `tools/dashboard/src/frontmatter-io.ts` | Entity read/write helpers | Self-contained |
| `tools/dashboard/src/parsing.ts` | Frontmatter + stages parsing | Self-contained |
| `tools/dashboard/src/telemetry.ts` | PostHog + Sentry (env-var gated) | Self-contained |
| `tools/dashboard/src/types.ts` | TypeScript type definitions | Self-contained |
| `tools/dashboard/src/discovery.test.ts` | Co-located unit test for discovery | Moves with source |
| `tools/dashboard/static/index.html` | Main dashboard page | Self-contained |
| `tools/dashboard/static/detail.html` | Entity detail page | Self-contained |
| `tools/dashboard/static/app.js` | Main page JS | Self-contained |
| `tools/dashboard/static/activity.js` | Activity feed JS | Self-contained |
| `tools/dashboard/static/detail.js` | Detail page JS | Self-contained |
| `tools/dashboard/static/style.css` | Main styles | Self-contained |
| `tools/dashboard/static/detail.css` | Detail page styles | Self-contained |
| `tools/dashboard/ctl.sh` | Daemon lifecycle manager | **BREAKS**: hardcodes `tools/dashboard/src/server.ts` and `tools/dashboard/src/channel.ts` relative to `REPO_ROOT`; must rewrite to plugin-relative paths |
| `tools/dashboard/package.json` | npm manifest (@mcp/sdk, @sentry/bun, posthog-node) | Moves to plugin root |
| `tools/dashboard/bun.lock` | Lockfile | Moves to plugin root |
| `tools/dashboard/tsconfig.json` | TypeScript config | Moves to plugin root |
| `tools/dashboard/README.md` | Dashboard docs | Moves to plugin root |
| `tools/dashboard/CHANGELOG.md` | Dashboard changelog | Moves to plugin root |

### Layer: Plugin Scaffolding — new files needed in dashboard plugin

| File | Purpose | Notes |
|------|---------|-------|
| `(new) .claude-plugin/plugin.json` | Dashboard plugin manifest | New: `name: spacedock-dashboard`, version, description |
| `(new) .claude-plugin/marketplace.json` | Marketplace registration | New: mirrors spacedock core pattern |
| `(new) .mcp.json` | MCP channel server registration | New: `command: bun`, `args: ["src/channel.ts"]` using `${CLAUDE_PLUGIN_ROOT}` |

### Layer: Skills — what moves vs what stays

| File | Disposition | Notes |
|------|-------------|-------|
| `skills/dashboard/SKILL.md` | **Moves** to dashboard plugin | **BREAKS**: line 15 resolves ctl.sh as `{project_root}/tools/dashboard/ctl.sh` — must change to `${CLAUDE_PLUGIN_ROOT}/ctl.sh` |
| `skills/build/SKILL.md` | **Moves** to dashboard plugin | Per acceptance criteria; cross-references to `spacedock:commission` and `spacedock:first-officer` remain valid (cross-plugin by name) |
| `skills/commission/SKILL.md` | **Stays** in spacedock core | Workflow engine skill |
| `skills/commission/bin/status` | **Stays** in spacedock core | Python status viewer |
| `skills/first-officer/SKILL.md` | **Stays** in spacedock core | Workflow engine skill |
| `skills/ensign/SKILL.md` | **Stays** in spacedock core | Workflow engine skill |
| `skills/refit/SKILL.md` | **Stays** in spacedock core | Workflow engine skill |

### Layer: References — what stays vs what moves

| File | Disposition | Notes |
|------|-------------|-------|
| `references/first-officer-shared-core.md` | **Stays** in spacedock core | **BREAKS**: step 6.5 hardcodes `tools/dashboard/ctl.sh` path — must be updated to a portable plugin lookup |
| `references/ensign-shared-core.md` | **Stays** in spacedock core | No dashboard references |
| `references/code-project-guardrails.md` | **Stays** in spacedock core | No dashboard references |
| `references/claude-first-officer-runtime.md` | **Stays** in spacedock core | No dashboard references |
| `references/claude-ensign-runtime.md` | **Stays** in spacedock core | No dashboard references |
| `references/codex-*.md` | **Stays** in spacedock core | No dashboard references |

### Layer: Agent Definitions — no changes needed

| File | Disposition | Notes |
|------|-------------|-------|
| `agents/first-officer.md` | **Stays** in spacedock core | No dashboard path references |
| `agents/ensign.md` | **Stays** in spacedock core | No dashboard path references |

### Layer: Tests — what moves

| File | Disposition | Notes |
|------|-------------|-------|
| `tests/dashboard/*.test.ts` (9 files) | **Moves** to dashboard plugin | Import from `../../tools/dashboard/src/` — path must be updated after restructure |

### Layer: Build Pipeline Workflow — moves ownership

| File | Disposition | Notes |
|------|-------------|-------|
| `docs/build-pipeline/` (entire directory) | **Moves** ownership to dashboard plugin | Currently lives in spacedock repo; new home is in the dashboard plugin's own docs/ or a user-level `~/.claude/workflows/` install |
| `mods/pr-merge.md` | **Stays** in spacedock core | Generic workflow mod, not dashboard-specific |

## Cross-References That Break on Extraction

1. **`tools/dashboard/ctl.sh` lines 6, 156–159**: `REPO_ROOT` computed as `$(dirname BASH_SOURCE[0])/../../` (assumes ctl.sh is at `tools/dashboard/ctl.sh` within a larger repo). Entry scripts hardcoded as `tools/dashboard/src/server.ts` / `tools/dashboard/src/channel.ts` relative to `REPO_ROOT`. After extraction, ctl.sh is at the plugin root; entry scripts are at `src/server.ts` / `src/channel.ts`. Fix: rewrite `REPO_ROOT` computation to use `${CLAUDE_PLUGIN_ROOT}` and change entry script paths accordingly.

2. **`skills/dashboard/SKILL.md` line 15**: Resolves ctl.sh as `{project_root}/tools/dashboard/ctl.sh`. After extraction, must use `${CLAUDE_PLUGIN_ROOT}/ctl.sh`. Fix: update the path template in the skill.

3. **`references/first-officer-shared-core.md` step 6.5**: Hardcodes `tools/dashboard/ctl.sh status` and `tools/dashboard/ctl.sh start` relative to project root. After extraction, the FO can no longer assume this path. Fix: update to a portable lookup — either via an installed `spacedock-dashboard` plugin path resolution, or by checking `~/.claude/plugins/spacedock-dashboard/ctl.sh`.

4. **`tests/dashboard/*.test.ts`**: Import path `../../tools/dashboard/src/...` assumes current repo structure. After extraction into a standalone plugin, tests would live in `tests/` and source in `src/` — relative path becomes `../../src/...`. One file (`tests/dashboard/ctl.test.ts`) also computes `WORKTREE = dirname(dirname(import.meta.dir))` to locate ctl.sh.

5. **`.mcp.json` in main project**: Currently `{"command":"bun","args":["tools/dashboard/src/channel.ts"]}` with no `${CLAUDE_PLUGIN_ROOT}`. After extraction, this file is replaced by a new `.mcp.json` in the dashboard plugin using `${CLAUDE_PLUGIN_ROOT}`.

## Coverage Infrastructure

- **Test runner**: `bun test` (Bun built-in, no config file needed)
- **Coverage command**: `bun test --coverage` (confirmed in `docs/build-pipeline/_archive/dashboard-entity-visibility.md`)
- **No `test:coverage` script** in `package.json` — no scripts field at all
- **Coverage reporter**: `--coverage-reporter=text` (default) or `--coverage-reporter=lcov`
- **Coverage format**: Bun native (text output); lcov via `--coverage-reporter=lcov` produces `lcov.info`
- **Test files**: 9 files in `tests/dashboard/` + 1 co-located in `tools/dashboard/src/discovery.test.ts`
- **Python tests**: `tests/test_*.py` for spacedock core (pytest); no coverage config found for Python side
- **No CI baseline caching** found (no `.github/` directory in worktree)
- **Baseline strategy**: run `bun test --coverage` before and after changes; compare pass/fail counts

## Acceptance Criteria

- Dashboard has its own `plugin.json` with name, version, description
- Dashboard `.mcp.json` registers channel server using `${CLAUDE_PLUGIN_ROOT}` paths
- `bun install` runs automatically or is documented as post-install step
- `/plugin install` from marketplace or local path installs the dashboard plugin
- `--channels plugin:spacedock-dashboard` activates the channel (after allowlist approval)
- Dashboard discovers workflows from any project (not hardcoded to spacedock repo)
- Existing dashboard features work unchanged after extraction (entity table, detail view, activity feed, channel communication)
- Dashboard plugin can be versioned and released independently from spacedock core
- `/build` skill and its references moved from spacedock core into the dashboard plugin — build-pipeline workflow is owned by the dashboard plugin, not spacedock core
- Spacedock core plugin remains focused on workflow engine (commission, first-officer, ensign, refit, status)
- Build skill references (first-officer-shared-core.md, ensign-shared-core.md, etc.) relocated into dashboard plugin's references/

## Stage Report: explore

- [x] Map all files affected by extracting dashboard into standalone plugin, grouped by layer
  23 dashboard source files + 9 dashboard test files documented in ## Affected Files above, grouped into 7 layers
- [x] Identify existing plugin packaging patterns by examining current plugin.json structure and .mcp.json registration
  Spacedock core uses `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`; main project `.mcp.json` uses `{"command":"bun","args":["tools/dashboard/src/channel.ts"]}` without `${CLAUDE_PLUGIN_ROOT}`
- [x] Identify all cross-references between dashboard code and spacedock core that would break on extraction
  5 breakage points documented in ## Cross-References That Break on Extraction: ctl.sh REPO_ROOT + entry paths, skills/dashboard path template, references/first-officer-shared-core.md step 6.5, tests/dashboard import paths, main .mcp.json
- [x] Discover coverage infrastructure (test commands, coverage tools, baseline strategy)
  bun test (no scripts field in package.json); coverage via `bun test --coverage`; 10 test files total; no CI baseline caching; baseline strategy: before/after pass count comparison
- [x] Confirm or revise scale (Medium: 5-15 files) based on actual file count
  23 dashboard source files + 9 dashboard tests + 3 new plugin scaffolding files + 5 skill/reference edits = ~40 files touched. Scale revised upward: **Large** (exceeds Medium threshold of 5-15). Most dashboard source files move unchanged; the real work is scaffolding (new plugin.json, .mcp.json, marketplace.json) and fixing 5 cross-reference breakage points.
- [x] Store context lake insights for each relevant file discovered
  8 insights stored: plugin.json, marketplace.json, ctl.sh, package.json, skills/dashboard/SKILL.md, skills/build/SKILL.md, references/first-officer-shared-core.md, src/channel.ts, src/server.ts, src/discovery.ts
- [x] Write findings into entity body under appropriate sections
  ## Affected Files, ## Cross-References That Break on Extraction, ## Coverage Infrastructure all written above

### Summary

The dashboard extraction is well-bounded: all 23 source files in `tools/dashboard/` are self-contained TypeScript/shell with no imports from spacedock core — they move cleanly. The critical work is in 5 cross-reference breakage points: `ctl.sh` hardcodes project-relative entry script paths, `skills/dashboard/SKILL.md` hardcodes `{project_root}/tools/dashboard/ctl.sh`, and `references/first-officer-shared-core.md` step 6.5 hardcodes the same ctl.sh path, requiring a portable plugin lookup strategy. Scale is revised to Large (approximately 40 files touched across source, tests, new scaffolding, and reference edits) — the bulk of existing source moves unchanged but the cross-reference fixes and new plugin scaffolding (plugin.json, marketplace.json, .mcp.json) require careful design work.
