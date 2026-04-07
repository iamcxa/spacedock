---
id: 025
title: Dashboard Daemon — Split --state-root and --static-root
status: explore
source: 010 UAT side-effect (worktree daemon showed stale frontmatter)
started:
completed:
verdict:
score: 0.6
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 002 completed (dashboard daemon with `--root` flag for workflow discovery)

## Brainstorming Spec

APPROACH:     Split the dashboard daemon's single `--root` flag into two separate flags: `--state-root` (where to read entity markdown files / workflow state from) and `--static-root` (where to serve `tools/dashboard/static/*` files from). Default behavior preserved by keeping `--root` as a back-compat alias that sets both. `ctl.sh` exposes the two as separate flags or auto-detects worktree-vs-main divergence and prompts.

ALTERNATIVE:  (a) Always read frontmatter from main HEAD via `git show main:` regardless of `--root` — rejected: requires git operations on every entity read, slower and couples daemon to git internals. (b) Have the daemon serve a "live preview" mode that reads from disk for static files but always polls main for state — rejected: special-case mode complicates testing. (c) Document the issue and tell users not to run daemon from worktrees — rejected: blocks the legitimate "test new UI in worktree" workflow that triggered this entity.

GUARDRAILS:   Back-compat: existing `--root` flag must keep working unchanged. State-root and static-root must both default to `--root` value when only one is provided. The dashboard's WebSocket-based event stream must not be affected (events POST to /api/events regardless). Path validation: both roots must exist and be readable; error clearly if not.

RATIONALE:    Discovered during entity 010 (Dashboard Feed Persistence) UAT — the daemon was restarted from a worktree path so the new `static/activity.js` could be served, but the dashboard then read entity frontmatter from the worktree branch where the FO state transitions hadn't propagated (FO design rule: workers don't touch frontmatter, FO owns it on main). The captain saw 010 + 014 stuck at "research" in the dashboard pipeline view even though main had advanced both entities through multiple stages. The worktree-daemon-for-UI-testing pattern is legitimate and should be supported with correct state visibility.

## Acceptance Criteria

- New `--state-root` flag accepted by daemon; reads entity markdown files from this path
- New `--static-root` flag accepted by daemon; serves `tools/dashboard/static/*` from this path
- Existing `--root` flag still works as a back-compat alias (sets both state-root and static-root to the same value when those flags are absent)
- When both `--root` and `--state-root`/`--static-root` are provided, the more specific flag wins
- `ctl.sh` exposes `--state-root` and `--static-root` as start subcommand options
- `ctl.sh status` displays both state-root and static-root when they differ
- Smoke test: from a worktree, run `ctl.sh start --state-root /Users/kent/Project/spacedock --static-root .` (or equivalent) → dashboard reads entity files from main but serves static files from the worktree → pipeline view shows current main state, browser sees worktree's modified UI
- No regression in existing `--root`-only invocations (covered by existing tests + manual smoke from main)

## Notes

- Discovered as a side-effect of entity 010 UAT on 2026-04-07
- Related code: `tools/dashboard/src/server.ts` (server entry), `tools/dashboard/ctl.sh` (daemon launcher), wherever workflow discovery resolves the entity directory path
- The feature is small (single flag split + ctl.sh wiring) but pays back every time a captain wants to dogfood a new UI feature on a worktree before merge
- Score 0.6 — useful quality-of-life improvement, not blocking any current work
