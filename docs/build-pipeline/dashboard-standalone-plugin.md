---
id: 008
title: Dashboard as Standalone Plugin — Independent Packaging & Distribution
status: research
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
