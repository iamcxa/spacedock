# Dashboard Persistent Daemon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard server persist across terminal closures and Claude Code session boundaries via a shell wrapper (`ctl.sh`) that manages daemon lifecycle (start/stop/status/logs/restart), with PID tracking, log rotation, and port auto-selection.

**Architecture:** A bash script (`ctl.sh`) wraps the existing Python foreground server using `nohup` for backgrounding. Runtime state lives in `~/.spacedock/dashboard/{project-hash}/` (PID file, port, logs). The Python server gains a `--log-file` argument so daemon output reaches a file instead of being discarded by nohup's `/dev/null` redirect. A plugin skill (`/dashboard`) provides workflow-integrated access.

**Tech Stack:** Bash (ctl.sh), Python 3 stdlib (serve.py modification), no new dependencies.

**Research corrections incorporated:**
1. `handlers.py` `log_message` is currently a no-op (`pass` on line 73-74). Must be restored to write to a log file for `--log-file` to produce any output. The plan modifies `handlers.py` (not just `serve.py`).
2. `ctl.sh` MUST use `#!/bin/bash` shebang explicitly — `/dev/tcp` port checking is bash-only, does not work in zsh (macOS default shell).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `tools/dashboard/handlers.py` | Restore `log_message` — write to log file when provided, otherwise suppress |
| Modify | `tools/dashboard/serve.py` | Add `--log-file` argument, pass log file path to `make_handler()`, startup banner |
| Create | `tools/dashboard/ctl.sh` | Daemon lifecycle manager: start/stop/status/logs/restart (~120 lines bash) |
| Create | `skills/dashboard/SKILL.md` | Plugin skill for `/dashboard` command |
| Create | `tests/test_dashboard_ctl.py` | Daemon management tests |
| Modify | `.gitignore` | Add `.spacedock/` entry |
| Modify | `references/first-officer-shared-core.md` | Add step 6.5 (dashboard check) between orphan detection and status --next |

**Why `handlers.py` is now MODIFY (not unchanged):** Research correction CLAIM-4 found that `log_message` is overridden to `pass`. With `nohup > /dev/null 2>&1`, even if we redirected stderr, output would be lost. The cleanest approach is to pass a log file path into `make_handler()` and have `log_message` write to that file directly. When no log file is set, the no-op behavior is preserved (backward compatible).

---

## Task 1: Log File Support -- handlers.py and serve.py Modifications

**Files:**
- Modify: `tools/dashboard/handlers.py`
- Modify: `tools/dashboard/serve.py`
- Modify: `tests/test_dashboard_handlers.py` (add log file tests)
- Reference: existing `handlers.py` line 73-74 (`log_message` override)

This task adds `--log-file` support so the daemon can produce logs when stdout/stderr are discarded by nohup. Test-first: write the tests, then implement.

**Research basis:** CLAIM-4 correction — `log_message` is a no-op, must be restored when a log file is provided. CLAIM-8 — with nohup redirecting to /dev/null, Python-level file logging is the only path.

- [ ] **Step 1: Write tests for log file support**

  Add tests to `tests/test_dashboard_handlers.py`:

  1. `test_log_message_suppressed_by_default` — create handler with no log file, make a request, verify no log output (current behavior preserved).
  2. `test_log_message_writes_to_file` — create handler with `log_file` path pointing to a temp file, make a request, verify the temp file contains the access log line.

  Also add a test for `serve.py` argument parsing:

  3. `test_serve_accepts_log_file_arg` — verify `--log-file` is accepted by argparse without error.

  Pattern: follow existing `TestDashboardHandler` — `setUp` creates tmpdir, starts `ThreadingHTTPServer` on port 0, `tearDown` shuts down and cleans up.

- [ ] **Step 2: Modify `make_handler()` in `handlers.py` to accept `log_file` parameter**

  ```python
  def make_handler(project_root, static_dir, log_file=None):
  ```

  Inside `DashboardHandler`, change `log_message`:

  ```python
  def log_message(self, format, *args):
      if log_file:
          with open(log_file, 'a') as f:
              f.write("%s - - [%s] %s\n" % (
                  self.address_string(),
                  self.log_date_time_string(),
                  format % args,
              ))
  ```

  When `log_file` is `None`, the method does nothing (preserves current no-op behavior). This is backward compatible — all existing callers pass no `log_file`.

- [ ] **Step 3: Modify `serve.py` to add `--log-file` argument and startup banner**

  Add to argparse:
  ```python
  parser.add_argument('--log-file', default=None, help='Write access logs to this file')
  ```

  Pass to `make_handler()`:
  ```python
  handler_class = make_handler(project_root=project_root, static_dir=static_dir, log_file=args.log_file)
  ```

  Add startup banner that writes to the log file (if set) and stdout:
  ```python
  banner = '[%s] Spacedock Dashboard started on http://127.0.0.1:%d/ (root: %s)' % (
      datetime.now().strftime('%Y-%m-%d %H:%M:%S'), args.port, project_root)
  print(banner)
  if args.log_file:
      with open(args.log_file, 'a') as f:
          f.write(banner + '\n')
  ```

  Add `from datetime import datetime` import.

- [ ] **Step 4: Run tests and verify**

  ```bash
  python3 -m pytest tests/test_dashboard_handlers.py -v
  # or: python3 -m unittest tests.test_dashboard_handlers -v
  ```

  Verify: all existing tests still pass, new log file tests pass.

---

## Task 2: Daemon Management Script -- ctl.sh

**Files:**
- Create: `tools/dashboard/ctl.sh`
- Create: `tests/test_dashboard_ctl.py` (test-first)

This is the core of the feature. The bash script manages the daemon lifecycle using nohup, PID files, and health checks. Test-first: write the test file, then implement ctl.sh.

**Research basis:** CLAIM-1 (nohup survives terminal close), CLAIM-2 (SIGTERM kills ThreadingHTTPServer cleanly), CLAIM-3 (shasum hash is stable), CLAIM-5 (curl health check within 3s), CLAIM-6 (bash /dev/tcp port check — requires #!/bin/bash), CLAIM-9 (kill -0 stale PID detection), CLAIM-10 (set -euo pipefail safe with proper || true guards).

- [ ] **Step 1: Write tests for ctl.sh**

  Create `tests/test_dashboard_ctl.py` using `unittest.TestCase`. Tests use `subprocess.run()` to invoke `ctl.sh` and verify behavior. Each test gets its own temp directory as `--root` to isolate instances.

  Test cases:
  1. `test_start_creates_pid_file` — start → verify PID file exists at expected path
  2. `test_start_health_check` — start → curl the port → verify HTTP 200
  3. `test_stop_cleans_pid` — start → stop → verify PID file removed and process dead
  4. `test_status_shows_running` — start → status → verify output contains "running", PID, URL
  5. `test_stale_pid_detection` — write fake PID file with dead PID → start → verify starts normally (stale cleaned)
  6. `test_idempotent_start` — start → start again → verify "already running" message, same PID
  7. `test_log_rotation` — start → stop → create dummy dashboard.log → start → verify dashboard.log.1 exists
  8. `test_port_auto_selection` — occupy port 8420 with a dummy server → start without --port → verify uses different port (8421-8429)

  Pattern: `setUp` creates tmpdir, `tearDown` calls `ctl.sh stop --root tmpdir` (ignore errors) and cleans up tmpdir. Use `subprocess.run()` with `capture_output=True` for all ctl.sh calls. Each test uses a unique `--root` to get a unique project hash.

  Helper method:
  ```python
  def _ctl(self, *args):
      cmd = [CTL_PATH] + list(args) + ['--root', self.tmpdir]
      return subprocess.run(cmd, capture_output=True, text=True, timeout=15)
  ```

- [ ] **Step 2: Create `ctl.sh` with shebang and core infrastructure**

  ```bash
  #!/bin/bash
  # ABOUTME: Daemon lifecycle manager for the Spacedock workflow dashboard.
  # ABOUTME: Subcommands: start, stop, status, logs, restart.
  set -euo pipefail
  ```

  Core infrastructure:
  - `REPO_ROOT` detection via `git rev-parse --show-toplevel` (fallback: script directory)
  - `STATE_DIR` computation: `~/.spacedock/dashboard/$(echo -n "$ROOT" | shasum | cut -c1-8)`
  - `PID_FILE`, `PORT_FILE`, `ROOT_FILE`, `LOG_FILE` paths derived from `STATE_DIR`
  - Argument parsing: subcommand + `--port PORT` + `--root DIR` options
  - `is_running()` function: checks PID file exists AND `kill -0 $PID 2>/dev/null`
  - `clean_stale()` function: removes PID/port/root files if process is dead

- [ ] **Step 3: Implement `start` subcommand**

  Flow (matches design spec):
  1. Parse `--port` (default 8420) and `--root` (default: git toplevel or pwd)
  2. Compute project hash, set `STATE_DIR`
  3. If running → print URL, exit 0
  4. If stale PID → clean up
  5. Create `STATE_DIR` directory (`mkdir -p`)
  6. Log rotation: `[[ -f "$LOG_FILE" ]] && mv "$LOG_FILE" "${LOG_FILE}.1"`
  7. Port selection: if default port, check 8420-8429 with `/dev/tcp`; if `--port` specified, use it directly
  8. Launch: `nohup python3 -m tools.dashboard.serve --port "$PORT" --root "$ROOT" --log-file "$LOG_FILE" > /dev/null 2>&1 &`
  9. Write PID (`$!`), port, root to state files
  10. Health check: poll `curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/` up to 3 seconds (0.5s intervals)
  11. Print: `Dashboard running: http://localhost:$PORT/ (PID: $PID)`

  Port check function (bash-only, requires #!/bin/bash):
  ```bash
  port_in_use() {
      (echo >/dev/tcp/localhost/"$1") 2>/dev/null
  }
  ```

- [ ] **Step 4: Implement `stop` subcommand**

  Flow:
  1. Read PID from `PID_FILE` (if not found → "Not running", exit 0)
  2. Check if process alive (`kill -0`) — if dead → clean stale, exit 0
  3. `kill "$PID"` (SIGTERM)
  4. Wait up to 5 seconds: `for i in $(seq 1 10); do kill -0 "$PID" 2>/dev/null || break; sleep 0.5; done`
  5. If still alive → `kill -9 "$PID"` + warning message
  6. Remove PID, port, root files
  7. Print: `Dashboard stopped.`

- [ ] **Step 5: Implement `status` subcommand**

  Single-project status:
  ```
  Spacedock Dashboard
    Status:  running (PID 12345)
    URL:     http://localhost:8420/
    Root:    /Users/kent/Project/spacedock
    Uptime:  2h 15m
    Log:     ~/.spacedock/dashboard/a1b2c3d4/dashboard.log
  ```

  Uptime: compute from PID file modification time (`stat -f %m` on macOS).

  `--all` flag: iterate `~/.spacedock/dashboard/*/`, read each root file, check if running or stale:
  ```
  Spacedock Dashboards
    [running]  spacedock   http://localhost:8420/  PID 12345
    [stale]    other-proj  PID file exists but process dead — cleaned up
  ```

- [ ] **Step 6: Implement `logs` and `restart` subcommands**

  `logs`: `cat "$LOG_FILE"` (or `tail -f "$LOG_FILE"` if `--follow`)
  `restart`: `stop` then `start` (pass through `--port` and `--root`)

- [ ] **Step 7: Make ctl.sh executable and run tests**

  ```bash
  chmod +x tools/dashboard/ctl.sh
  python3 -m unittest tests.test_dashboard_ctl -v
  ```

  Verify all 8 test cases pass. Fix any issues.

---

## Task 3: Plugin Skill -- /dashboard Command

**Files:**
- Create: `skills/dashboard/SKILL.md`

This is a thin wrapper that translates `/dashboard` invocations into `ctl.sh` calls.

- [ ] **Step 1: Create `skills/dashboard/SKILL.md`**

  ```yaml
  ---
  name: dashboard
  description: >
    Use when user says 'dashboard', 'start dashboard', 'stop dashboard',
    'dashboard status', '看 dashboard', '開 dashboard', '關 dashboard'.
    Manages the Spacedock workflow dashboard daemon.
  user-invocable: true
  ---
  ```

  Body instructions:
  - Detect project root via `git rev-parse --show-toplevel`
  - Resolve `CTL` path: `{project_root}/tools/dashboard/ctl.sh`
  - `/dashboard` or `/dashboard start` → `bash $CTL start --root $ROOT`
  - `/dashboard stop` → `bash $CTL stop --root $ROOT`
  - `/dashboard status` → `bash $CTL status --root $ROOT`
  - `/dashboard logs` → `bash $CTL logs --root $ROOT` (with optional `--follow`, timeout 10s)
  - `/dashboard restart` → `bash $CTL restart --root $ROOT`
  - Print the output to the user

- [ ] **Step 2: Verify skill is discoverable**

  Check that the skill shows up in the available skills list. No automated test needed — this is a manual verification step.

---

## Task 4: FO Integration and Config

**Files:**
- Modify: `references/first-officer-shared-core.md`
- Modify: `.gitignore`

- [ ] **Step 1: Add dashboard check to FO startup procedure**

  In `references/first-officer-shared-core.md`, insert between step 6 and step 7:

  ```markdown
  6.5. Check dashboard — run `tools/dashboard/ctl.sh status --root {project_root}`.
       If not running → prompt captain:
       "Dashboard is not running. Start it? (http://localhost:8420/)"
       Wait for captain response. Yes → run `tools/dashboard/ctl.sh start --root {project_root}`. No → skip.
  ```

  Renumber step 7 stays as 7 (FO core uses numbered steps, inserting 6.5 avoids renumbering).

- [ ] **Step 2: Add `.spacedock/` to `.gitignore`**

  Append to `.gitignore`:
  ```
  .spacedock/
  ```

  Note: `.spacedock/` is for the daemon runtime state directory (`~/.spacedock/dashboard/`). Even though the runtime state lives in `$HOME`, adding this prevents accidental commit if someone creates a `.spacedock/` in the project root.

- [ ] **Step 3: Run full test suite to verify no regressions**

  ```bash
  python3 -m unittest discover tests -v
  ```

  Verify: all existing tests pass, all new tests pass, no regressions.

---

## Quality Gates

These gates must pass before the feature is considered complete:

1. **Unit tests pass:** `python3 -m unittest discover tests -v` — all tests green
2. **Shell syntax check:** `bash -n tools/dashboard/ctl.sh` — no syntax errors
3. **Shebang verification:** First line of `ctl.sh` is exactly `#!/bin/bash` (not `#!/bin/sh`, not `#!/usr/bin/env bash`)
4. **Manual smoke test:** `tools/dashboard/ctl.sh start` → browser opens dashboard → `ctl.sh status` shows running → `ctl.sh stop` cleans up
5. **Stale PID smoke test:** Kill the server process directly (`kill <pid>`), then `ctl.sh start` → verify it detects stale PID and starts fresh
6. **Log file verification:** After start, `cat ~/.spacedock/dashboard/*/dashboard.log` shows startup banner and access logs
7. **Backward compatibility:** `python3 -m tools.dashboard.serve` still works in foreground mode (no `--log-file` = no-op log_message, same as before)
