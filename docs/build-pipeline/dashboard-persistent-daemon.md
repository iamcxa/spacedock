---
id: 004
title: Dashboard Persistent Daemon
status: explore
source: brainstorming session
started:
completed:
verdict:
score: 0.9
worktree: .worktrees/ensign-dashboard-persistent-daemon
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None — this is the foundation for features A (003) and C (005)

## Brainstorming Spec

APPROACH:     Shell wrapper (ctl.sh) around the existing Python dashboard server for daemon lifecycle management. CLI subcommands (start/stop/status/logs/restart) + PID file management + log rotation. Plugin skill (/dashboard) for workflow integration. Cross-session persistence via ~/.spacedock/dashboard/{project-hash}/.
ALTERNATIVE:  Pure Python daemon via os.fork() (rejected: complex fd cleanup, no Windows support, over-engineered for dev tool). subprocess.Popen self-daemonize (rejected: unintuitive "self-launching" pattern, harder to debug).
GUARDRAILS:   Python server code stays unchanged (foreground mode only). Shell wrapper handles all daemon concerns. One instance per project root (deduplicated by path hash). FO does not auto-start — prompts captain. Future upgrade path to system service (launchd/systemd) via ExecStart mapping.
RATIONALE:    Dashboard needs to survive terminal closure and Claude Code session boundaries. Shell wrapper is the standard Unix daemon pattern, keeps Python simple, and maps directly to system service for future upgrade.

### Design Spec

Full design at `docs/superpowers/specs/2026-04-04-dashboard-persistent-daemon-design.md`

## Acceptance Criteria

- `ctl.sh start` launches dashboard as background process with PID file at `~/.spacedock/dashboard/{hash}/pid`
- `ctl.sh stop` cleanly terminates the process and cleans up PID file
- `ctl.sh status` shows running state, URL, PID, uptime, log path
- `ctl.sh status --all` lists all running dashboard instances across projects
- Stale PID detection: if process died but PID file remains, next start cleans up automatically
- Port auto-selection: default 8420, auto-increment to 8429 if occupied
- Log rotation: `dashboard.log` rotated to `dashboard.log.1` on each start
- `/dashboard start` plugin skill works from any Claude Code session
- FO startup prompts captain to start dashboard (does not auto-start)
