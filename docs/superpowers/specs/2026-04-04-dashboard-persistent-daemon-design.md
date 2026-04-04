# Dashboard Persistent Daemon — Design Spec

**Date:** 2026-04-04
**Feature:** B — Dashboard server as cross-session persistent background process
**Scale:** Medium
**Prerequisites:** Features 001+002 (Workflow Status Dashboard + Entity Detail UI) merged

## Problem

The dashboard server currently runs as a foreground process tied to the terminal. When the terminal closes or the Claude Code session ends, the server dies. This makes the dashboard unreliable for ongoing workflow monitoring and blocks features A (real-time agent activity) and C (external observability integration) which need a stable, always-available server.

## Approach

Shell wrapper (`ctl.sh`) around the existing Python server for daemon lifecycle management. The Python server stays unchanged (foreground mode) — the shell script handles backgrounding, PID tracking, logging, and health checks. A plugin skill (`/dashboard`) provides workflow-integrated access.

**Why shell wrapper:** Python server stays simple. Shell is the standard Unix daemon pattern. Future upgrade to system service (launchd/systemd) maps directly from `ctl.sh` to `ExecStart`.

## Architecture

### Components

```
tools/dashboard/
  ctl.sh              # NEW — daemon management (start/stop/status/logs/restart)
  serve.py            # MODIFY — add --log-file parameter, startup banner
  handlers.py         # unchanged
  parsing.py           # unchanged
  discovery.py         # unchanged
  api.py               # unchanged
  frontmatter_io.py    # unchanged
  static/              # unchanged

skills/dashboard/
  SKILL.md             # NEW — plugin skill definition

tests/
  test_dashboard_ctl.py  # NEW — daemon management tests
```

### Runtime State Directory

```
~/.spacedock/
  dashboard/
    {project-hash}/          # hash = echo -n "$ROOT" | shasum | cut -c1-8
      pid                    # PID of running server process
      port                   # port number (e.g., "8420")
      root                   # absolute path to project root
      dashboard.log          # current server log
      dashboard.log.1        # previous log (rotated on start)
```

**Project hash:** `echo -n "$ROOT" | shasum | cut -c1-8` — hashes the path string (not directory contents), so it's stable regardless of file changes. Only changes if the project is moved to a different path.

## CLI Interface

### `ctl.sh` Subcommands

```bash
tools/dashboard/ctl.sh start [--port PORT] [--root DIR]
tools/dashboard/ctl.sh stop
tools/dashboard/ctl.sh status
tools/dashboard/ctl.sh status --all        # list all project instances
tools/dashboard/ctl.sh logs [--follow]
tools/dashboard/ctl.sh restart [--port PORT] [--root DIR]
```

### Start Flow

1. Compute project hash from `--root` (default: `git rev-parse --show-toplevel` or `$PWD`)
2. Check `~/.spacedock/dashboard/{hash}/pid` — if exists and process alive → print URL, exit 0
3. If PID file exists but process dead → stale detection, clean up PID file
4. Create `~/.spacedock/dashboard/{hash}/` directory
5. Rotate log: if `dashboard.log` exists → rename to `dashboard.log.1`
6. Launch: `nohup python3 -m tools.dashboard.serve --port $PORT --root $ROOT --log-file $LOG > /dev/null 2>&1 &`
7. Write PID, port, root files
8. Health check: poll `http://localhost:$PORT/` up to 3 seconds
9. Print: `Dashboard running: http://localhost:$PORT/ (PID: $PID)`

### Stop Flow

1. Read PID from `~/.spacedock/dashboard/{hash}/pid`
2. `kill $PID` (SIGTERM)
3. Wait up to 5 seconds for process to exit
4. If still alive → `kill -9 $PID` + warning
5. Clean up PID file

### Status Output

```
Spacedock Dashboard
  Status:  running (PID 12345)
  URL:     http://localhost:8420/
  Root:    /Users/kent/Project/spacedock
  Uptime:  2h 15m
  Log:     ~/.spacedock/dashboard/a1b2c3d4/dashboard.log
```

### Global Status (`--all`)

```
Spacedock Dashboards
  [running]  spacedock   http://localhost:8420/  PID 12345
  [running]  carlove     http://localhost:8421/  PID 12346
  [stale]    recce       PID file exists but process dead — cleaned up
```

### Port Selection Logic

- If `--port` specified → use it
- If not specified → default `8420`, if occupied try `8421, 8422, ... 8429`
- All 10 ports occupied → error

## Plugin Skill

### `/dashboard` Skill

```yaml
name: dashboard
description: >
  Use when user says 'dashboard', 'start dashboard', 'stop dashboard',
  'dashboard status', '看 dashboard', '開 dashboard', '關 dashboard'.
  Manages the Spacedock workflow dashboard daemon.
```

| Command | Behavior |
|---------|----------|
| `/dashboard` or `/dashboard start` | Detect project root, call `ctl.sh start --root $ROOT`, print URL |
| `/dashboard stop` | Call `ctl.sh stop` |
| `/dashboard status` | Call `ctl.sh status` |
| `/dashboard logs` | Call `ctl.sh logs --follow` (timeout 10s) |
| `/dashboard restart` | Call `ctl.sh restart` |

### FO Startup Integration

At FO startup, between step 6 (orphan detection) and step 7 (status --next):

```
6.5  Check dashboard — call `ctl.sh status`.
     If not running → prompt captain:
     "Dashboard is not running. Start it? (http://localhost:8420/)"
     Wait for captain response. Yes → `ctl.sh start`. No → skip.
```

Not auto-started — captain decides. Dashboard occupies a port until manually stopped.

## serve.py Changes

Minimal changes to the existing server:

1. **Add `--log-file` argument**: When set, redirect Python's logging output to the specified file instead of stderr. This enables daemon mode where stdout/stderr are redirected by `nohup`.
2. **Add startup banner**: On server start, log: `[{timestamp}] Spacedock Dashboard started on http://localhost:{port}/ (root: {root})`

No changes to request handling, routing, or any other server behavior.

## Log Management

- **Rotation:** Each `ctl.sh start` rotates `dashboard.log` → `dashboard.log.1` (one backup only)
- **Content:** HTTP access log (from Python's `log_message`) + startup/shutdown messages
- **No complex rotation** — local dev tool, single file + one backup is sufficient

## Error Handling

| Scenario | Handling |
|----------|----------|
| `start` but port occupied by another program | Auto-increment port (8420→8429), exceed → error |
| `start` but PID file exists, process dead | Stale detection → clean PID file → normal start |
| `stop` but process unresponsive to SIGTERM | Wait 5s → SIGKILL → clean PID file + warning |
| `status` but `~/.spacedock/` doesn't exist | Print "No dashboard instances found" |
| Server crash (python process dies unexpectedly) | Next `status` or FO startup detects stale PID → report. No auto-restart (future: system service) |
| `--root` points to nonexistent directory | Validate before start → error |

## Not In Scope

- System service (launchd/systemd) — future feature, separate spec
- Auto-restart on crash — future feature, requires system service
- WebSocket event streaming — feature A (separate spec)
- External observability (PostHog/Sentry/Langfuse) — feature C (separate spec)
- Windows support — `nohup`/`kill` are Unix-only. Windows daemon would need a different approach.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `tools/dashboard/ctl.sh` | CREATE | Daemon management script (~120 lines bash) |
| `skills/dashboard/SKILL.md` | CREATE | Plugin skill definition |
| `tests/test_dashboard_ctl.py` | CREATE | Daemon management tests |
| `tools/dashboard/serve.py` | MODIFY | Add `--log-file` param, startup banner |
| `.gitignore` | MODIFY | Add `.spacedock/` |

## Test Plan

1. **Start/stop lifecycle**: start → verify PID file + health check → stop → verify cleanup
2. **Stale PID detection**: create fake PID file → start → verify stale cleaned + normal start
3. **Port auto-selection**: occupy port 8420 → start without `--port` → verify selects 8421
4. **Status output**: start → verify status shows correct PID, URL, root, uptime
5. **Global status**: start two instances (different roots) → `status --all` → verify both listed
6. **Log rotation**: start → stop → start → verify `dashboard.log.1` exists
7. **Idempotent start**: start → start again → verify "already running" message, no duplicate process
