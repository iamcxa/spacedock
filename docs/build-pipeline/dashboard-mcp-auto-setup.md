---
id: 037
title: Dashboard MCP Auto-Setup — Detect + Fix Missing .mcp.json Entry
status: execute
source: plugin user bug report — .mcp.json missing causes dashboard MCP disconnect
started: 2026-04-08
completed:
verdict:
score: 0.95
worktree: .worktrees/spacedock-ensign-dashboard-mcp-auto-setup
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
---

## Dependencies

- None (independent — blocks plugin users from using bidirectional FO ↔ dashboard)

## Problem

Plugin users who install spacedock + dashboard plugins don't automatically get a `.mcp.json` file in their project root with the `spacedock-dashboard` MCP server entry. Without this entry:

1. Claude Code doesn't spawn the dashboard MCP server (channel.ts)
2. FO has no `reply` tool, no `get_comments`, no `add_comment`, no `update_entity`
3. Bidirectional FO ↔ dashboard collaboration is broken
4. Dashboard receives events (one-way HTTP) but can't push captain feedback back to FO
5. Permission requests can't be relayed

**User impact:** All plugin users hit this on first install. They start the dashboard via `/dashboard start`, see the UI, but FO can't talk back. Silent failure mode — no error, just no FO replies appearing.

## Reproduction

1. Fresh plugin install (no `.mcp.json` in project root)
2. Run `/dashboard start`
3. Dashboard daemon starts on port 8421, channel on port 8420
4. FO tries to call `mcp__spacedock-dashboard__reply` → tool not registered
5. Captain sees no FO responses in dashboard

## Fix Approach

Add MCP setup detection to the dashboard skill. When `/dashboard start` (or any dashboard command that requires MCP) is invoked:

1. Check if `{project_root}/.mcp.json` exists
2. If exists, parse and check for `mcpServers.spacedock-dashboard` entry
3. If missing or wrong path, prompt user before writing
4. Write/update `.mcp.json` with correct entry pointing to dashboard plugin's channel.ts
5. Inform user to restart Claude Code session to pick up new MCP server

### Path resolution challenge

The dashboard plugin lives at `~/.claude/plugins/cache/dashboard/X.Y.Z/` (or similar). The MCP entry needs the resolved absolute path because `${CLAUDE_PLUGIN_ROOT}` doesn't expand in `.mcp.json`. Options:

- **A) Absolute path at write time**: Resolve plugin install path when writing `.mcp.json`. Breaks if plugin updates change the path.
- **B) Wrapper script**: Plugin provides a stable shim (e.g., `~/.claude/bin/spacedock-dashboard-channel`) that always finds the latest plugin version.
- **C) Project-relative**: Use `tools/dashboard/src/channel.ts` if user has the dev repo, but this doesn't help plugin-only users.

Plan stage to evaluate which option is robust.

## Spec Reference

See SKILL at `skills/dashboard/SKILL.md` — Setup section is where the detection logic should live.

## Acceptance Criteria

- `/dashboard start` (or first invocation) checks `.mcp.json` for `spacedock-dashboard` entry
- If missing, prompt user to add (don't silently modify)
- After user approval, write entry with correct resolved path
- Inform user clearly that Claude Code restart is required
- If `.mcp.json` exists with wrong path, detect and offer to fix
- After fix and restart, FO MCP tools (`reply`, etc.) are available
- Dashboard skill works on both dev repo (current setup) and plugin-only install

## Out of Scope

- Auto-restart of Claude Code (impossible from skill context)
- Automatic plugin path tracking on plugin updates (manual re-run of fix)
