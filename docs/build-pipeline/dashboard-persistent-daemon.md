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

## Technical Claims

CLAIM-1: [type: shell-daemon] "nohup python3 ... > /dev/null 2>&1 &" — process survives terminal close on macOS
CLAIM-2: [type: signal-handling] "kill $PID" (SIGTERM) reliably terminates Python's ThreadingHTTPServer — no zombie process
CLAIM-3: [type: hash-stability] "echo -n "$ROOT" | shasum | cut -c1-8" produces stable 8-char hex hash on macOS
CLAIM-4: [type: python-api] Python's --log-file argument can redirect http.server log_message output to a file
CLAIM-5: [type: health-check] "curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/" within 3 seconds is sufficient for startup check
CLAIM-6: [type: port-check] Bash "(echo >/dev/tcp/localhost/$PORT) 2>/dev/null" works reliably on macOS for port availability check
CLAIM-7: [type: signal-handling] ThreadingHTTPServer.serve_forever() handles SIGTERM gracefully
CLAIM-8: [type: shell-daemon] With nohup > /dev/null 2>&1, --log-file must redirect at Python level, not shell level
CLAIM-9: [type: unix-pattern] PID file + "kill -0 $PID" is standard Unix stale PID detection
CLAIM-10: [type: shell-convention] "set -euo pipefail" is safe for daemon management scripts

## Research Report

**Claims analyzed**: 10
**Recommendation**: PROCEED (with 2 minor corrections noted)

### Verified (8 claims)

- CLAIM-1: HIGH — nohup + background process survives terminal close on macOS
  Explorer: No existing daemon patterns in codebase (first daemon feature). Existing scripts use #!/bin/bash.
  Web: nohup ignores SIGHUP signal, process continues after terminal close. Standard Unix pattern, works on macOS.
  Tested: `nohup python3 ... > /dev/null 2>&1 &` launched successfully, process survived, killed cleanly.

- CLAIM-2: HIGH — kill $PID (SIGTERM) reliably terminates Python ThreadingHTTPServer
  Explorer: serve.py uses `server.serve_forever()` with `except KeyboardInterrupt` (SIGINT only).
  Python stdlib: Default SIGTERM handler is SIG_DFL (value 0) = OS-level immediate termination. No zombie risk.
  Tested: Launched ThreadingHTTPServer via nohup, sent SIGTERM, process died cleanly within 1 second. Socket released by OS.
  Note: The `except KeyboardInterrupt: server.shutdown()` block does NOT run on SIGTERM — the process just terminates at OS level. This is fine for daemon use (OS reclaims all resources).

- CLAIM-3: HIGH — shasum hash produces stable 8-char hex string
  Tested: `echo -n "/Users/kent/Project/spacedock" | shasum | cut -c1-8` produced "b389c010" twice — identical, stable.
  macOS ships with shasum (part of Perl, installed by default). Output is 40-char hex SHA-1; cut -c1-8 extracts first 8 chars reliably.

- CLAIM-5: HIGH — curl health check within 3 seconds is sufficient
  Explorer: Existing test pattern uses ThreadingHTTPServer on port 0 — server binds and accepts connections immediately.
  Tested: Python http.server starts accepting connections within milliseconds of `serve_forever()` call. 3-second timeout is more than sufficient.

- CLAIM-8: HIGH — --log-file must redirect at Python level
  Explorer: handlers.py line 73-74 overrides `log_message` to `pass` (all logging suppressed).
  Python stdlib: BaseHTTPRequestHandler.log_message writes to sys.stderr by default.
  With `nohup ... > /dev/null 2>&1`, stderr is discarded. So even if log_message weren't suppressed, output would be lost.
  Conclusion: --log-file must (a) un-suppress log_message in handlers.py and (b) redirect output to a file at the Python level. This is correctly identified in the spec as a serve.py modification.

- CLAIM-9: HIGH — PID file + kill -0 is standard stale detection
  Web: Standard Unix daemon pattern. `kill -0 $PID` sends no signal but checks process existence (returns 0 if alive, non-zero if dead).
  No codebase precedent (first daemon), but this is the established Unix convention.

- CLAIM-10: HIGH — set -euo pipefail is safe for ctl.sh
  Explorer: Both existing scripts (release.sh, run_codex_first_officer.sh) use `set -euo pipefail` and `#!/bin/bash`.
  Note: `set -e` can cause issues with intentional non-zero exits (e.g., `kill -0` returning 1 for dead PID). The script must use `|| true` or `if` constructs for expected failures. This is a standard bash practice, not a correction.

- CLAIM-7: MEDIUM (clarified) — serve_forever() and SIGTERM
  Python stdlib: `serve_forever()` uses `selector.select(poll_interval=0.5)` in a loop checking `__shutdown_request`. The `shutdown()` method sets this flag.
  However: SIGTERM's default handler (SIG_DFL) terminates the process at OS level — it does NOT call `shutdown()` or trigger any Python cleanup. The process simply dies.
  This is actually fine for daemon use: OS reclaims the socket, file descriptors, and memory. No graceful shutdown needed for a dev-tool HTTP server.

### Corrected (2 claims — both minor)

- CLAIM-4: MINOR CORRECTION — --log-file is NOT a built-in Python http.server feature
  The spec says "add --log-file parameter" to serve.py. This is correctly identified as a custom addition, BUT the spec's phrasing "redirect Python's logging output to a file" is slightly misleading.
  Reality: (1) Python's http.server module has NO --log-file argument. (2) handlers.py currently suppresses ALL logging (log_message = pass). (3) The implementation must: add --log-file to serve.py's argparse, pass the file path to make_handler(), and override log_message in DashboardHandler to write to the file instead of passing.
  **Impact**: Minor — the spec already plans to modify serve.py. The implementation just needs to also modify handlers.py's log_message override (not just serve.py). The explore findings correctly identify handlers.py as "unchanged" — this should be "MODIFY" if log_message needs to write to a file.
  **Alternative**: Instead of modifying handlers.py, serve.py could redirect sys.stderr to the log file before creating the server, then change handlers.py log_message to call super().log_message(). But modifying handlers.py directly is cleaner.

- CLAIM-6: MINOR CORRECTION — /dev/tcp does NOT work in zsh (macOS default shell)
  The spec uses `(echo >/dev/tcp/localhost/$PORT) 2>/dev/null` for port checking.
  Reality: /dev/tcp is a **bash-specific** feature — it does NOT exist in zsh. Since macOS Catalina, the default shell is zsh.
  However: ctl.sh uses `#!/bin/bash` shebang (matching existing scripts release.sh and run_codex_first_officer.sh), so /dev/tcp WILL work when the script is executed directly.
  Tested: A #!/bin/bash script invoked from zsh correctly uses /dev/tcp — confirmed working.
  **Impact**: No code change needed IF ctl.sh has `#!/bin/bash` shebang (which it should, per project convention). But the script must NOT be sourced from zsh — only executed. This is already the expected usage pattern.
  **Alternative**: For extra safety, could use `lsof -i :$PORT` or `nc -z localhost $PORT` which work in any shell. But /dev/tcp with #!/bin/bash is simpler and has no external dependencies.

### Unverifiable (0 claims)

None — all claims were verified through direct testing or documentation.

### Recommendation Criteria

**PROCEED** — Both corrections are minor:
1. CLAIM-4 (--log-file): The spec correctly plans a serve.py modification. The correction only notes that handlers.py may also need modification (log_message override), or alternatively sys.stderr redirection in serve.py. Either approach is straightforward.
2. CLAIM-6 (/dev/tcp): Works correctly with #!/bin/bash shebang, which is the project convention. No change needed.

No corrections affect control flow, data model, or architecture. The design is sound.

## Stage Report: research

- [x] Claims extracted from plan (10 claims across shell-daemon, signal-handling, hash-stability, python-api, health-check, port-check, unix-pattern, shell-convention)
- [x] Explorer verification completed — codebase patterns confirmed (#!/bin/bash shebang, set -euo pipefail, log_message suppressed in handlers.py)
- [x] Web verification completed — nohup/SIGTERM/PID-file patterns confirmed, /dev/tcp bash-only limitation identified
- [x] Direct testing completed — shasum stability, nohup+kill lifecycle, ThreadingHTTPServer SIGTERM, /dev/tcp from bash script
- [x] Cross-reference synthesis completed — 8 verified (HIGH), 2 minor corrections, 0 unverifiable
- [x] Research report written to entity
- [x] Corrections documented: handlers.py may need MODIFY (log_message), /dev/tcp requires #!/bin/bash shebang

## Stage Report: plan

- [x] Formal plan document created via `Skill: "superpowers:writing-plans"` and saved to `docs/superpowers/specs/` in the worktree
  Saved to `docs/superpowers/specs/2026-04-04-dashboard-persistent-daemon-plan.md` — 4 tasks, 16 steps, 7 quality gates
- [x] Plan has concrete file paths for all new and modified files
  File structure table lists 7 files: handlers.py (MODIFY), serve.py (MODIFY), ctl.sh (CREATE), SKILL.md (CREATE), test_dashboard_ctl.py (CREATE), .gitignore (MODIFY), first-officer-shared-core.md (MODIFY)
- [x] Plan uses test-first ordering (tests before implementation code)
  Task 1 Step 1 writes handler log tests before Step 2-3 implement; Task 2 Step 1 writes ctl.sh tests before Steps 2-6 implement
- [x] Plan incorporates both research corrections (log_message fix, bash shebang)
  CLAIM-4: handlers.py promoted from "unchanged" to MODIFY — log_message restored to write to file when log_file provided. CLAIM-6: #!/bin/bash shebang explicit in ctl.sh Step 2, quality gate #3 verifies it
- [x] Plan includes quality gate steps (tests, syntax checks)
  7 quality gates: unittest suite, bash -n syntax check, shebang verification, manual smoke test, stale PID smoke test, log file verification, backward compatibility check

### Summary

Created formal implementation plan with 4 tasks in test-first order: (1) log file support in handlers.py+serve.py, (2) ctl.sh daemon management script, (3) /dashboard plugin skill, (4) FO integration and .gitignore. Both research corrections are addressed: handlers.py log_message is now MODIFY (not unchanged) to support file-based logging, and ctl.sh mandates #!/bin/bash shebang with a dedicated quality gate. Plan references all 10 verified research claims for implementation decisions.
