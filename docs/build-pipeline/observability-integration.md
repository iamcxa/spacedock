---
id: 005
title: Observability Integration (PostHog/Sentry/Langfuse)
status: explore
source: brainstorming session
started:
completed:
verdict:
score: 0.7
worktree: .worktrees/ensign-observability-integration
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires feature B (004 Dashboard Persistent Daemon)** — stable server process needed before adding external tracking
- Can be developed in parallel with feature A (003 Real-time Agent Activity Feed)

## Brainstorming Spec

APPROACH:     Integrate external observability tools into the Spacedock dashboard and FO lifecycle to track agent behavior, performance, and errors. PostHog for product analytics (which workflows are used, stage completion rates), Sentry for error tracking (agent crashes, server errors), Langfuse for LLM tracing (agent token usage, latency, prompt quality).
ALTERNATIVE:  Build custom observability from scratch (rejected: reinventing mature tooling, maintenance burden). Log-only approach (rejected: no structured querying, no dashboards, no alerting).
GUARDRAILS:   Observability is opt-in — dashboard works without any external service configured. API keys stored in environment variables, never in committed files. Telemetry must not block or slow down the main workflow. Privacy: no entity content sent to external services — only metadata (stage names, durations, counts, error types).
RATIONALE:    As Spacedock scales to multiple projects and longer-running workflows, visibility into agent performance and reliability becomes critical. External tools provide dashboards, alerting, and historical analysis that would be expensive to build from scratch.

## Acceptance Criteria

- Configuration via environment variables (opt-in, no API keys in code)
- PostHog integration: track workflow events (entity dispatched, stage completed, gate approved/rejected)
- Sentry integration: capture server errors, agent crash reports, unhandled exceptions
- Langfuse integration: trace agent LLM calls with token usage, latency, and prompt metadata
- Dashboard UI shows observability status (connected/disconnected per service)
- All integrations are no-op when not configured (zero impact on existing functionality)
- Privacy: only metadata sent externally, never entity body content or file contents

## Exploration Findings

### File List by Layer

#### Configuration Layer
| File | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest v0.9.0 — where to add observability config fields or reference env vars |
| `.claude-plugin/marketplace.json` | Marketplace listing — no changes needed |
| `.gitignore` | Already ignores `.spacedock/` and `__pycache__/` — no changes needed |

#### Domain Layer (Workflow Engine)
| File | Purpose |
|------|---------|
| `references/first-officer-shared-core.md` | FO operating contract — defines all workflow events (dispatch, gate, completion, merge, feedback cycles) that should emit PostHog analytics |
| `references/claude-first-officer-runtime.md` | Claude Code runtime adapter — Agent() dispatch, TeamCreate, event loop, gate presentation |
| `references/ensign-shared-core.md` | Ensign operating contract — Stage Report Protocol, completion signals |
| `references/code-project-guardrails.md` | Cross-platform guardrails — no observability hooks needed |
| `agents/first-officer.md` | FO agent definition — thin launcher, loads skill |
| `agents/ensign.md` | Ensign agent definition — thin launcher, loads skill |
| `mods/pr-merge.md` | PR merge mod with startup/idle/merge hooks — PR lifecycle events are trackable |

#### Router Layer (Dashboard Server)
| File | Purpose |
|------|---------|
| `tools/dashboard/serve.py` | HTTP server entry point — server lifecycle events (start/shutdown) for Sentry/PostHog |
| `tools/dashboard/handlers.py` | Request handler with 6 routes — wrap for Sentry error capture, request tracing |
| `tools/dashboard/__main__.py` | Entry point shim — no changes needed |
| `tools/dashboard/ctl.sh` | Daemon lifecycle manager — start/stop/restart events, health check failures |

#### Data Layer (API + Parsing)
| File | Purpose |
|------|---------|
| `tools/dashboard/api.py` | Entity CRUD operations — mutation events (score update, tag update) for PostHog |
| `tools/dashboard/discovery.py` | Workflow discovery via os.walk — workflow count metric |
| `tools/dashboard/parsing.py` | Frontmatter parser (copied from status script) — no changes needed |
| `tools/dashboard/frontmatter_io.py` | Frontmatter I/O with stage report extraction — no changes needed |

#### View Layer (Frontend)
| File | Purpose |
|------|---------|
| `tools/dashboard/static/index.html` | Dashboard main page — could add observability status indicator |
| `tools/dashboard/static/detail.html` | Entity detail page — could add observability status indicator |
| `tools/dashboard/static/app.js` | Dashboard UI — could add PostHog JS client for page views, entity clicks |
| `tools/dashboard/static/detail.js` | Detail page UI — score/tag management actions for PostHog tracking |
| `tools/dashboard/static/style.css` | Main styles — observability status badge styling |
| `tools/dashboard/static/detail.css` | Detail styles — no changes needed unless adding status indicator |

#### Script Layer (Codex Runtime)
| File | Purpose |
|------|---------|
| `scripts/codex_prepare_dispatch.py` | Dispatch preparation — entity dispatched event, writes JSON output |
| `scripts/codex_finalize_terminal_entity.py` | Entity finalization — entity completed event with verdict |

#### Skill Layer
| File | Purpose |
|------|---------|
| `skills/first-officer/SKILL.md` | FO skill launcher — loads reference files |
| `skills/commission/SKILL.md` | Commission skill — interactive workflow creation, pilot run |
| `skills/commission/bin/status` | Status viewer script — no changes needed |

#### Test Layer
| File | Purpose |
|------|---------|
| `tests/test_dashboard_handlers.py` | Handler tests — need new tests for error capture middleware |
| `tests/test_api.py` | API tests — need new tests for telemetry event emission |
| `tests/test_dashboard_discovery.py` | Discovery tests — no changes needed |
| `tests/test_dashboard_parsing.py` | Parsing tests — no changes needed |

### Existing Patterns

**Error Handling:**
- Dashboard handlers: No try/except around API handler bodies. Exceptions propagate to `BaseHTTPRequestHandler` which writes to stderr (suppressed unless `--log-file` is set). JSON error responses via `_send_json({'error': ...}, status)` for known errors (400, 403, 404).
- Scripts: `raise ValueError` for invalid input (missing frontmatter, unknown stage). `subprocess.CalledProcessError` from git commands propagates unhandled.
- Frontmatter I/O: `raise ValueError` for malformed YAML frontmatter.
- No structured error logging anywhere. No exception aggregation.

**Logging:**
- Dashboard: `log_message()` override writes to file when `--log-file` provided, otherwise suppressed entirely. Uses `print()` for banner/startup messages.
- Scripts: `print()` to stdout for results (JSON), `print(..., file=sys.stderr)` for errors.
- No Python `logging` module usage anywhere in the codebase.

**Configuration:**
- Environment variables: Only `PIPELINE_DIR` (status script) and `KEEP_LOG`/`KEEP_TEST_DIR` (tests). No observability-related env vars.
- No `.env` file support. No config file beyond `plugin.json`.
- CLI args: `--port`, `--root`, `--log-file` for dashboard server.

**Event Emission:**
- No event bus, no hooks in Python code, no callback system.
- The mod system (`_mods/*.md` with `## Hook:` sections) is the only event-like pattern, but it operates at the agent instruction level, not in Python.
- `codex_prepare_dispatch.py` and `codex_finalize_terminal_entity.py` output JSON to stdout — these are implicit "events" that could be tapped.

### Key Constraints

1. **Stdlib-only Python project**: No `pyproject.toml`, `requirements.txt`, or `setup.py`. All Python code uses only stdlib modules (`http.server`, `json`, `os`, `subprocess`, `argparse`, `glob`, `re`, `datetime`). Adding PostHog/Sentry/Langfuse SDKs would introduce the **first external Python dependencies**. This requires:
   - Deciding on a dependency management approach (pip install, requirements.txt, pyproject.toml, or vendoring)
   - Making all SDKs optional (import guarded by try/except) so the tool still works without them installed
   - The plugin distribution model (`.claude-plugin/`) doesn't have a dependency install mechanism

2. **Privacy boundaries**: Entity body content and file contents must never be sent externally. Only metadata is allowed: stage names, durations, counts, error types, entity slugs (which are filename-derived, not user content).

3. **Opt-in via environment variables**: API keys stored as env vars (`POSTHOG_API_KEY`, `SENTRY_DSN`, `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`). Zero functionality change when not configured — all integrations must be no-op by default.

4. **Two distinct telemetry planes**:
   - **Server-side (Python)**: Dashboard server errors (Sentry), API request metrics, workflow discovery counts. This is straightforward — add optional SDK imports to `tools/dashboard/`.
   - **Agent-side (conversation)**: Workflow events (dispatch, gate, completion) happen inside Claude Code agent conversations, not in Python. Tracking these requires either: (a) instrumenting the scripts that agents call (`codex_prepare_dispatch.py`, `codex_finalize_terminal_entity.py`), or (b) adding a lightweight telemetry script that agents call at key lifecycle points, or (c) adding telemetry to the mod/hook system.

5. **Langfuse LLM tracing**: Agent LLM calls happen at the Claude Code SDK level, not within this codebase. Langfuse integration would need to hook into the Claude API layer, which is outside Spacedock's control. This may need to be scoped down to "Langfuse integration point prepared, actual tracing depends on Claude Code SDK support."

### Scale Assessment

**Confirmed: Medium** (was Medium, remains Medium)

File count by area of change:
- New files to create: ~3-5 (telemetry module, config helpers, possibly a telemetry CLI script)
- Files to modify: ~8-12 (serve.py, handlers.py, api.py, ctl.sh, 2 JS files, 2 HTML files, codex scripts)
- Test files to create/modify: ~3-5

The stdlib-only constraint and the two-plane telemetry architecture (server vs agent) add design complexity beyond raw file count. The Langfuse acceptance criterion may need scoping discussion given that LLM tracing is outside Spacedock's direct control.

## Stage Report: explore

- [x] File list grouped by layer — identify all files relevant to telemetry, error handling, event emission, and configuration
  34 files identified across 8 layers (config, domain, router, data, view, script, skill, test)
- [x] Context lake insights stored for each relevant file discovered
  14 insights stored for key files: serve.py, handlers.py, api.py, ctl.sh, discovery.py, frontmatter_io.py, first-officer-shared-core.md, claude-first-officer-runtime.md, codex_prepare_dispatch.py, codex_finalize_terminal_entity.py, plugin.json, app.js, detail.js, pr-merge.md
- [x] Scale confirmation or revision (currently Medium) based on actual file count
  Medium confirmed — ~3-5 new files, ~8-12 modified files, ~3-5 test files, plus design complexity from stdlib-only constraint and dual telemetry planes
- [x] Map existing patterns for error handling, logging, configuration, and event emission
  Documented: no structured error handling, no Python logging module, minimal env var usage, no event bus — all patterns catalogued with specific file/line references
- [x] Identify constraints: stdlib-only project vs external SDK dependencies, privacy boundaries, opt-in configuration patterns
  5 key constraints identified: (1) first external Python dependencies, (2) privacy — metadata only, (3) env var opt-in, (4) two telemetry planes (server vs agent), (5) Langfuse LLM tracing outside Spacedock's control

### Summary

Deep exploration of the Spacedock codebase for observability integration. The project is entirely stdlib Python with no external dependencies — adding PostHog/Sentry/Langfuse SDKs would be the first. The architecture has two distinct telemetry planes: server-side (dashboard Python code, straightforward) and agent-side (workflow events in Claude Code conversations, requires instrumenting dispatch/finalization scripts or adding a telemetry CLI). The Langfuse LLM tracing acceptance criterion may need scoping since actual LLM call tracing is at the Claude Code SDK level, not within Spacedock.
