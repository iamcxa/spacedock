---
id: 008
title: Dashboard as Standalone Plugin — Independent Packaging & Distribution
status: plan
source: session discussion
started: 2026-04-05T18:00:00+08:00
completed:
verdict:
score: 0.85
worktree:
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

## Technical Claims

CLAIM-1: [type: plugin-structure] "A standalone plugin requires `.claude-plugin/plugin.json` with at minimum a `name` field. `marketplace.json` is needed for marketplace distribution."
CLAIM-2: [type: library-api] "${CLAUDE_PLUGIN_ROOT} is available in `.mcp.json` for resolving MCP server command paths."
CLAIM-3: [type: library-api] "${CLAUDE_PLUGIN_ROOT} is available in SKILL.md files for path resolution."
CLAIM-4: [type: framework] "--channels plugin:spacedock-dashboard activates the channel plugin. During research preview, custom channels require --dangerously-load-development-channels."
CLAIM-5: [type: framework] "Cross-plugin skill references work via `Skill: \"pluginB:skillName\"` — the /build skill can reference spacedock:commission and spacedock:first-officer after moving to the dashboard plugin."
CLAIM-6: [type: framework] "Claude Code plugin system supports a post-install hook (e.g., `bun install`) that runs automatically after plugin installation."
CLAIM-7: [type: project-convention] "After extraction to a plugin, the dashboard discovers the project root via git rev-parse --show-toplevel or an env var like $PROJECT_ROOT."
CLAIM-8: [type: project-convention] "Shell scripts in plugins can access ${CLAUDE_PLUGIN_ROOT} as an environment variable for portable path resolution."
CLAIM-9: [type: library-api] "${CLAUDE_PLUGIN_ROOT} expands in agent markdown files for path references."

## Research Report

**Claims analyzed**: 9
**Recommendation**: PROCEED (with 3 corrections noted)

### Verified (5 claims)

- CLAIM-1: HIGH -- plugin.json requires only `name` field; marketplace.json is for distribution only
  Explorer: Spacedock core uses `.claude-plugin/plugin.json` with fields: name, version, description, author, repository, license, keywords. Separate `.claude-plugin/marketplace.json` exists for marketplace registration.
  Context7 (plugin-dev docs): manifest-reference.md confirms `name` is the only required field. Format: kebab-case, regex `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`. Version, description, author, etc. are recommended but optional. Marketplace.json is NOT required for local-only plugins.
  **Conclusion**: For local plugin development, `marketplace.json` is unnecessary. Only needed when publishing to a marketplace.

- CLAIM-2: HIGH -- ${CLAUDE_PLUGIN_ROOT} works in .mcp.json for MCP server paths
  Explorer: Multiple real plugins use this pattern:
    - episodic-memory: `"args": ["${CLAUDE_PLUGIN_ROOT}/cli/mcp-server-wrapper.js"]` (in plugin.json mcpServers)
    - recce: `"args": ["${CLAUDE_PLUGIN_ROOT}/scripts/run-mcp-stdio.sh"]` (in .mcp.json)
    - recce-quickstart: `"args": ["${CLAUDE_PLUGIN_ROOT}/servers/recce-docs-mcp/dist/cli.js"]` (in .mcp.json)
    - invest: `"args": ["${CLAUDE_PLUGIN_ROOT}/servers/invest-mcp-server.ts"]` (in .mcp.json)
  Context7 (plugin-dev mcp-integration skill): Explicitly documents `${CLAUDE_PLUGIN_ROOT}` for MCP server paths: `"command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server"`. States: "Plugin directory (always use for portability)."
  **Conclusion**: Fully verified. Both `.mcp.json` standalone files and inline `mcpServers` in plugin.json support `${CLAUDE_PLUGIN_ROOT}` expansion.

- CLAIM-4: HIGH -- Channel activation syntax confirmed
  Explorer: Prior research (dashboard-channel-plugin.md archive) verified: `--channels plugin:name@marketplace` for production, `--dangerously-load-development-channels server:name` for development.
  Web (prior research): Claude Code settings schema confirms `channelsEnabled` boolean and `allowedChannelPlugins` array with `{marketplace, plugin}` objects. Channels Reference at code.claude.com/docs/en/channels-reference confirms exact syntax.
  **Conclusion**: `--channels plugin:spacedock-dashboard` is the correct production syntax. During research preview, `--dangerously-load-development-channels` is needed for custom channel plugins.

- CLAIM-7: HIGH -- Project root discovery via git is the correct pattern
  Explorer: `ctl.sh` line 65: `ROOT="$(git -C "$REPO_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$REPO_ROOT")"`. The dashboard's `discovery.ts` receives root as a CLI argument (`--root`). `server.ts` and `channel.ts` accept `--root` flag.
  Context7 (plugin-dev docs): No `$PROJECT_ROOT` env var documented. Plugins discover project context through their own mechanisms.
  **Conclusion**: `git rev-parse --show-toplevel` is the correct approach. No platform-provided `$PROJECT_ROOT` exists. The `--root` CLI argument pattern already used by the dashboard is portable -- the caller (ctl.sh or skill) provides the root.

- CLAIM-8: HIGH -- Shell scripts executed as hook/MCP commands receive ${CLAUDE_PLUGIN_ROOT} as env var
  Context7 (plugin-dev plugin-structure skill): Line 299-300 explicitly shows: `# ${CLAUDE_PLUGIN_ROOT} available as environment variable` / `source "${CLAUDE_PLUGIN_ROOT}/lib/common.sh"`. Also: `echo $CLAUDE_PLUGIN_ROOT` is listed as a testing command.
  Context7 (plugin-dev hook-development skill): Confirms `$CLAUDE_PLUGIN_ROOT - Plugin directory (use for portable paths)` and shows usage in bash hook scripts.
  **Conclusion**: When ctl.sh is executed via a hook command or MCP server command, `${CLAUDE_PLUGIN_ROOT}` IS available as an environment variable. However, when ctl.sh is invoked directly by a skill's markdown instructions (where Claude runs bash), the variable may NOT be in the environment -- the skill must pass the path explicitly or use `${CLAUDE_SKILL_DIR}` to derive it.

### Corrected (3 claims)

- CLAIM-3: MEDIUM CORRECTION -- ${CLAUDE_PLUGIN_ROOT} is NOT the right variable for SKILL.md path resolution
  Explorer: The agent-boot-skill-preload entity (docs/plans/agent-boot-skill-preload.md) documents that `${CLAUDE_PLUGIN_ROOT}` does NOT expand in agent markdown files (known Claude Code issue #9354) and `env | grep PLUGIN` returns nothing at agent runtime. However, skills have `${CLAUDE_SKILL_DIR}` which reliably resolves. Verified: haiku/low correctly resolves `${CLAUDE_SKILL_DIR}/../../references/...` paths from a skill.
  Context7 (plugin-dev plugin-structure skill): Shows `${CLAUDE_PLUGIN_ROOT}` in component files (commands, agents, skills) as a text reference, but this is the documented ideal -- not the runtime reality for all contexts. The plugin-dev docs describe it as available in "component files" but the spacedock project has confirmed through testing that agent files do NOT expand it.
  **Fix**: In `skills/dashboard/SKILL.md`, use `${CLAUDE_SKILL_DIR}` to derive ctl.sh path: `${CLAUDE_SKILL_DIR}/../../ctl.sh` (since skills/dashboard/SKILL.md is 2 levels below plugin root). Do NOT rely on `${CLAUDE_PLUGIN_ROOT}` in SKILL.md text that Claude will interpret and execute via bash. The spec's assumption that `${CLAUDE_PLUGIN_ROOT}/ctl.sh` works in a SKILL.md is incorrect -- use `${CLAUDE_SKILL_DIR}` relative paths instead.

- CLAIM-6: HIGH CORRECTION -- No automatic post-install hook exists in Claude Code plugin system
  Explorer: No `postInstall`, `setupScript`, or equivalent field found in any plugin.json or plugin-dev documentation. The episodic-memory plugin ships with `node_modules/` pre-bundled (verified: `ls` shows node_modules directory in installed cache at `~/.claude-sneakpeek/claudesp/config/plugins/cache/superpowers-marketplace/episodic-memory/1.0.15/`). Its package.json has a `"postinstall"` npm script, but this runs during npm package installation, not Claude Code plugin installation.
  Context7 (plugin-dev manifest-reference): No `postInstall`, `setupScript`, or lifecycle hook fields documented in the plugin.json specification. Only component fields (commands, agents, hooks, mcpServers) exist.
  **Fix**: The dashboard plugin must either: (a) ship with `node_modules/` pre-bundled (like episodic-memory), or (b) document `bun install` as a manual post-install step, or (c) use a hook script that checks for and runs `bun install` on first execution. Option (a) is the marketplace standard. For local development, option (b) with clear README instructions is acceptable.

- CLAIM-9: HIGH CORRECTION -- ${CLAUDE_PLUGIN_ROOT} does NOT expand in agent markdown files
  Explorer: Confirmed by agent-boot-skill-preload entity: `${CLAUDE_PLUGIN_ROOT}` doesn't expand in agent markdown files -- known Claude Code issue (#9354). `env | grep PLUGIN` returns nothing at agent runtime.
  Context7 (plugin-dev agent-development skill): Agent best practice is self-contained body text (max 10K chars). Agent frontmatter can specify `skills: ["skill-name"]` to preload skills that DO have reliable path resolution via `${CLAUDE_SKILL_DIR}`.
  **Conclusion**: This claim was listed for completeness. No agent files in the dashboard plugin need `${CLAUDE_PLUGIN_ROOT}`, but the finding reinforces that `${CLAUDE_SKILL_DIR}` is the reliable path variable for skill files, not `${CLAUDE_PLUGIN_ROOT}`.

### Corrected (cross-plugin references -- CLAIM-5 nuance)

- CLAIM-5: MEDIUM -- Cross-plugin skill invocation works, but the /build skill's references are text instructions, not Skill tool calls
  Explorer: The `/build` skill (`skills/build/SKILL.md`) contains:
    - Line 53: text `Create one with /spacedock:commission` -- this is a user-facing instruction, not a Skill tool call
    - Line 70: `Invoke Skill: "superpowers:brainstorming"` -- this IS a cross-plugin Skill tool call (superpowers is a different plugin)
    - Lines 186-188: `claude --agent spacedock:first-officer` -- this is a CLI command, not a skill invocation
  The `superpowers:brainstorming` reference proves cross-plugin skill invocation works. The `spacedock:commission` and `spacedock:first-officer` references are text instructions directing the user to run CLI commands with the `spacedock:` namespace prefix -- these will continue to work as long as the spacedock core plugin is installed, regardless of which plugin the /build skill lives in.
  **Conclusion**: Cross-plugin references work in two distinct ways: (1) Skill tool calls like `Skill: "superpowers:brainstorming"` invoke skills across plugins, verified working. (2) CLI agent references like `claude --agent spacedock:first-officer` are user instructions that work as long as both plugins are installed. No correction needed to the spec's assumption -- just a clarification that these are independent mechanisms.

### Unverifiable (0 claims)

None -- all claims verified with multi-source evidence.

### Key Architecture Findings

1. **marketplace.json is optional for local plugins**: The spec assumes both plugin.json and marketplace.json are needed. For initial development and local installation, only plugin.json is required. marketplace.json should be added when ready for marketplace distribution.

2. **node_modules bundling is the marketplace standard**: The episodic-memory plugin (a real-world npm-dependent plugin) ships with node_modules pre-bundled. No automatic dependency installation mechanism exists in the Claude Code plugin system.

3. **SKILL.md path resolution must use ${CLAUDE_SKILL_DIR}**: This is the most important correction. The spec assumes `${CLAUDE_PLUGIN_ROOT}/ctl.sh` in SKILL.md -- this will not work reliably. Use `${CLAUDE_SKILL_DIR}/../../ctl.sh` instead.

4. **ctl.sh dual-mode path resolution**: When executed as an MCP server command (via .mcp.json), ctl.sh receives `${CLAUDE_PLUGIN_ROOT}` as an env var. When executed by a skill (Claude runs bash), the skill must pass the resolved path. Consider having ctl.sh check `${CLAUDE_PLUGIN_ROOT}` first, fall back to `BASH_SOURCE[0]` derivation.

### Recommendation Criteria

- 0 corrections affecting architecture or domain rules
- 3 corrections total: 1 path resolution mechanism (SKILL.md), 1 dependency management strategy (no post-install), 1 variable availability clarification (agent files)
- All corrections are addressable in the plan stage without architectural redesign
- All corrections have clear fixes documented above

**Recommendation: PROCEED** -- corrections are at the implementation detail level (which variable to use for path resolution, how to bundle dependencies). No architectural changes needed to the extraction approach.

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

## Stage Report: research

- [x] Extract and list all technical claims from spec and explore (9 claims)
  Claims extracted covering: plugin structure (1), ${CLAUDE_PLUGIN_ROOT} usage (3), channel activation (1), cross-plugin references (1), post-install hooks (1), project root discovery (1), shell script env vars (1)
- [x] Verify each claim with multi-source evidence (Explorer codebase, Context7 docs, Web Search)
  Explorer: examined spacedock core plugin.json, marketplace.json, ctl.sh, SKILL.md files, episodic-memory plugin, recce plugin, invest plugin, agent-boot-skill-preload findings, dashboard-channel-plugin archive research.
  Context7: examined plugin-dev skills (plugin-structure, mcp-integration, hook-development, skill-development, command-development), manifest-reference.md, plugin-features-reference.md.
  Web: leveraged prior verified research from dashboard-channel-plugin entity (Channels Reference at code.claude.com, Claude Code settings schema).
- [x] Cross-reference findings with confidence levels (HIGH/MEDIUM/NONE)
  5 claims verified HIGH, 3 corrections identified (1 MEDIUM, 2 HIGH), 1 claim (CLAIM-5) verified with nuanced clarification. 0 unverifiable claims.
- [x] Document corrections for incorrect assumptions with cited sources
  3 corrections documented: (1) SKILL.md must use ${CLAUDE_SKILL_DIR} not ${CLAUDE_PLUGIN_ROOT}, (2) no post-install hook exists -- must bundle node_modules or document manual step, (3) ${CLAUDE_PLUGIN_ROOT} does not expand in agent markdown files (issue #9354).
- [x] Cache verified patterns and corrections to context lake (store_insight)
  Insights stored below.
- [x] Write research synthesis into entity body
  ## Technical Claims and ## Research Report sections written above with full evidence chains.

### Summary

9 claims analyzed, 5 verified, 3 corrections found, 0 unverifiable. Recommendation: PROCEED. The most significant correction is that SKILL.md path resolution must use `${CLAUDE_SKILL_DIR}` (not `${CLAUDE_PLUGIN_ROOT}`) -- this affects how the dashboard skill references ctl.sh after extraction. The second correction is that no automatic post-install mechanism exists for npm dependencies -- the plugin must either bundle node_modules (marketplace standard) or document a manual `bun install` step. Both corrections are implementation-level, not architectural, and can be incorporated into the plan stage.

## Stage Report: plan

- [x] Read entity body to understand explore results, research corrections, and acceptance criteria
  Read full entity file including 5 cross-reference breakage points, 9 technical claims, 3 research corrections, and all acceptance criteria
- [x] Invoke Skill: "superpowers:writing-plans" to produce a formal implementation plan
  Plan saved to `docs/superpowers/plans/2026-04-05-dashboard-standalone-plugin.md` (12 tasks, ~60 steps)
- [x] Plan must include concrete file paths, task ordering, and test-first approach
  Every task lists exact file paths (Create/Modify/Remove). Tests run before source removal (Task 10 depends on Task 6 passing). Quality gates at Tasks 3, 6, 10, 12.
- [x] Plan must incorporate all 3 research corrections (${CLAUDE_SKILL_DIR} paths, node_modules bundling, agent markdown limitation)
  Correction 1: Task 5 uses `${CLAUDE_SKILL_DIR}/../../ctl.sh` in SKILL.md. Correction 2: Task 3 notes manual bun install, Task 11 documents for users. Correction 3: noted as N/A (no agent files need it).
- [x] Plan must address all 5 cross-reference breakage points from explore
  Breakage 1 (ctl.sh REPO_ROOT): Task 4. Breakage 2 (SKILL.md path): Task 5. Breakage 3 (FO step 6.5): Task 8. Breakage 4 (test imports): Task 6. Breakage 5 (.mcp.json): Task 9.
- [x] Plan must include quality gate steps (type-check, tests, build verification)
  Quality gate summary table in plan: tsc --noEmit, bun test, bash -n, plugin structure verification, stale reference scan, core integrity check
- [x] Save plan to docs/superpowers/specs/ or docs/superpowers/plans/ directory
  Saved to `docs/superpowers/plans/2026-04-05-dashboard-standalone-plugin.md`
- [x] Write stage report into entity file
  This report

### Summary

Produced a 12-task formal implementation plan covering plugin scaffolding, source/test migration, 5 cross-reference fixes, skill relocation, core reference updates, cleanup, documentation, and end-to-end verification. All 3 research corrections are incorporated: SKILL.md uses `${CLAUDE_SKILL_DIR}` (not `${CLAUDE_PLUGIN_ROOT}`), node_modules bundling is documented for marketplace, and the agent markdown limitation is noted as not applicable. The plan resolves an acceptance criteria contradiction: FO/ensign reference files stay in spacedock core (where FO/ensign need them) while the `/build` skill and build-pipeline workflow ownership move to the dashboard plugin. Scale confirmed Large (~40 files). This plan involves architectural decisions (new plugin boundary, cross-plugin skill invocation for dashboard lookup) and should be reviewed at the gate.
