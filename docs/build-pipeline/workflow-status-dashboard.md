---
id: 001
title: Workflow Status Dashboard
status: e2e
source: commission seed
started: 2026-04-04T02:54:00Z
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
