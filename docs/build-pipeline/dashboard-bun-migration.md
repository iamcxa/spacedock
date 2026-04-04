---
id: 006
title: Dashboard Bun Migration — Python to self-contained TypeScript
status: pr-draft
source: brainstorming session
started: 2026-04-04T11:32:00Z
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
