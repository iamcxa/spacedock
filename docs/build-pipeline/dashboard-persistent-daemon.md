---
id: 004
title: Dashboard Persistent Daemon
status: quality
source: brainstorming session
started: 2026-04-04T08:53:00Z
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

## Explore Findings

### File List Grouped by Layer

#### Server Layer (tools/dashboard/)
| File | Action | Purpose |
|------|--------|---------|
| `tools/dashboard/serve.py` | MODIFY | Add `--log-file` arg and startup banner. Currently: argparse with --port/--root, ThreadingHTTPServer on 127.0.0.1, foreground-only, prints to stdout |
| `tools/dashboard/handlers.py` | unchanged | HTTP handler with make_handler() closure, routes /api/workflows + static files, log_message suppressed |
| `tools/dashboard/discovery.py` | unchanged | Workflow discovery via os.walk + commissioned-by frontmatter check |
| `tools/dashboard/parsing.py` | unchanged | YAML frontmatter parser (no PyYAML), stages/entities scanning |
| `tools/dashboard/__init__.py` | unchanged | Empty init |
| `tools/dashboard/__main__.py` | unchanged | Calls serve.main() |
| `tools/dashboard/static/` | unchanged | index.html, app.js, style.css |
| `tools/dashboard/ctl.sh` | CREATE | Daemon lifecycle manager (~120 lines bash): start/stop/status/logs/restart |

#### Skill Layer (skills/)
| File | Action | Purpose |
|------|--------|---------|
| `skills/dashboard/SKILL.md` | CREATE | Plugin skill for /dashboard command. Should be user-invocable: true with trigger phrases |

#### Test Layer (tests/)
| File | Action | Purpose |
|------|--------|---------|
| `tests/test_dashboard_ctl.py` | CREATE | Daemon management tests: lifecycle, stale PID, port selection, status output, log rotation |
| `tests/test_dashboard_handlers.py` | unchanged | Existing handler tests — reference pattern: unittest + ThreadingHTTPServer on port 0 + tmpdir fixtures |
| `tests/test_dashboard_discovery.py` | unchanged | Existing discovery tests — reference pattern: unittest + TemporaryDirectory + _make_tree helper |
| `tests/test_dashboard_parsing.py` | unchanged | Existing parsing tests — reference pattern: unittest + NamedTemporaryFile |

#### Config Layer
| File | Action | Purpose |
|------|--------|---------|
| `.gitignore` | MODIFY | Add `.spacedock/` entry for daemon runtime state directory |

#### Reference Layer (FO integration)
| File | Action | Purpose |
|------|--------|---------|
| `references/first-officer-shared-core.md` | MODIFY | Add step 6.5 (dashboard check) between orphan detection (step 6) and status --next (step 7) |

### Existing Patterns Mapped

**Shell script conventions (from `scripts/release.sh` and `scripts/run_codex_first_officer.sh`):**
- `set -euo pipefail` at top
- `REPO_ROOT` detection via `BASH_SOURCE` or `git rev-parse --show-toplevel`
- `trap` for cleanup on exit
- Version/arg validation with clear usage messages
- Informational output with `echo` (no colors or fancy formatting)

**Skill definition pattern (from `skills/ensign/SKILL.md` and `skills/first-officer/SKILL.md`):**
- YAML frontmatter: name, description, optional user-invocable: true
- Body contains execution instructions
- Description includes trigger phrases for matching
- The /dashboard skill is different from existing skills: it runs bash commands rather than loading reference files. The commission skill (SKILL.md ~19K lines) shows a more complex pattern but is not relevant — /dashboard is a thin wrapper.

**Test pattern (from existing `tests/test_dashboard_*.py`):**
- `unittest.TestCase` throughout (no pytest)
- `tempfile.TemporaryDirectory` / `tempfile.NamedTemporaryFile` for fixtures
- `setUp`/`tearDown` for server lifecycle in handler tests
- `ThreadingHTTPServer` on port 0 for dynamic port allocation

**No existing daemon/background process patterns found.** Grep for nohup/daemon/pid/SIGTERM across the codebase returned zero matches in scripts or tools (only docs/specs). This is the first daemon feature — ctl.sh establishes the pattern.

### Scale Confirmation

**Scale: Medium — confirmed.** File count breakdown:
- 2 new files (ctl.sh ~120 LOC, SKILL.md ~20 LOC)
- 1 new test file (test_dashboard_ctl.py ~150 LOC)
- 2 modified files (serve.py: +15 LOC, .gitignore: +1 line)
- 1 modified reference (first-officer-shared-core.md: +5 lines)

Total estimated: ~310 new/modified LOC. Core complexity is in ctl.sh (PID management, port selection, health check, log rotation) — a single focused bash script. The Python change is minimal (add --log-file arg). This is solidly Medium.

## Stage Report: explore

- [x] File list grouped by layer
  16 files identified across 5 layers (server, skill, test, config, reference); 3 CREATE, 3 MODIFY, 10 unchanged reference files
- [x] Context lake insights stored for each relevant file discovered
  12 insights stored: serve.py, handlers.py, discovery.py, parsing.py, release.sh, run_codex_first_officer.sh, ensign/SKILL.md, first-officer/SKILL.md, test_dashboard_handlers.py, test_dashboard_discovery.py, test_dashboard_parsing.py, .gitignore
- [x] Scale confirmation or revision (currently Medium) based on actual file count
  Medium confirmed: ~310 new/modified LOC across 6 files, core complexity in single ctl.sh script
- [x] Map existing patterns for shell scripts, server startup, PID management, and plugin skills
  Shell: set -euo pipefail, BASH_SOURCE root detection, trap cleanup. Skills: frontmatter with name/description/user-invocable, body as instructions. Tests: unittest + tempfile + ThreadingHTTPServer port 0.
- [x] Identify any existing daemon or background process patterns in the codebase
  No existing daemon patterns found — this is the first. ctl.sh establishes the nohup/PID-file/SIGTERM pattern for the project.

### Summary

Deep exploration of the spacedock codebase for feature 004 (Dashboard Persistent Daemon). Mapped all files in tools/dashboard/ (server layer), skills/ (4 existing skills as pattern reference), tests/ (3 existing dashboard test files), and scripts/ (2 shell scripts as bash convention reference). The codebase has no existing daemon/background process management — ctl.sh will be the first, following standard Unix nohup+PID-file conventions. Shell script patterns are well-established (set -euo pipefail, BASH_SOURCE, trap). Test patterns use unittest throughout with tempfile fixtures. The FO startup procedure (references/first-officer-shared-core.md) has a clear insertion point at step 6.5 between orphan detection and status --next.
