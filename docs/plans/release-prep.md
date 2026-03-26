---
id: 039
title: Release prep — marketplace metadata, license, and history cleanup
status: backlog
source: CL
started:
completed:
verdict:
score: 0.9
worktree:
---

## Problem

Spacedock is being published to the Claude Code marketplace today. The plugin needs marketplace metadata, a license file, and git history cleanup before release.

## Requirements

### 1. Apache-2.0 License
Add `LICENSE` file at repo root with the standard Apache 2.0 license text.

### 2. plugin.json update
Update `.claude-plugin/plugin.json` with marketplace metadata:

```json
{
  "name": "spacedock",
  "version": "0.3.0",
  "description": "Turn directories of markdown files into structured workflows operated by AI agents",
  "author": { "name": "CL Kao" },
  "repository": "https://github.com/clkao/spacedock",
  "license": "Apache-2.0",
  "keywords": ["workflow", "pipeline", "agents", "markdown", "automation"]
}
```

### 3. .gitignore and history cleanup
Add to `.gitignore`:
- `.private-journal/`
- `testflight-*/`
- `.claude/settings.local.json`

Remove these from git tracking AND clean them from git history entirely. Ensure no active branches exist before history rewrite (confirmed: only `main`).

### 4. Version
Stay at 0.3.0 — metadata-only changes don't warrant a bump.

## Acceptance Criteria

1. `LICENSE` file exists at repo root with Apache-2.0 text
2. `plugin.json` has all marketplace fields: name, version, description, author, repository, license, keywords
3. Description matches the plain text workflow framing
4. `.gitignore` excludes `.private-journal/`, `testflight-*/`, `.claude/settings.local.json`
5. Those paths are removed from git tracking and git history
6. No active branches broken by history rewrite
7. `git tag v0.3.0` on the release commit
