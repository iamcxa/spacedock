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

## Technical Claims

CLAIM-1: [type: library-api] "PostHog Python SDK can be installed alongside a stdlib-only project — what are its transitive dependencies?"
CLAIM-2: [type: framework] "Sentry Python SDK (sentry-sdk) works with Python's http.server — does it auto-instrument or require manual integration?"
CLAIM-3: [type: library-api] "Langfuse Python SDK can trace LLM calls — but Spacedock doesn't make LLM calls directly. Can it instrument from plugin/agent level?"
CLAIM-4: [type: library-api] "All three SDKs support opt-in via environment variables with zero impact when not configured"
CLAIM-5: [type: library-api] "PostHog supports custom event tracking (not just page views) — can it track workflow events like dispatch/gate/completion?"
CLAIM-6: [type: project-convention] "The project currently has no requirements.txt or pyproject.toml — what's the best way to add optional dependencies?"
CLAIM-7: [type: library-api] "Privacy: can each SDK be configured to NOT send arbitrary payload data (only metadata)?"
CLAIM-8: [type: framework] "Sentry can capture unhandled exceptions from http.server.BaseHTTPRequestHandler"
CLAIM-9: [type: library-api] "PostHog JS client can be added to static HTML pages for frontend analytics"
CLAIM-10: [type: domain-rule] "Agent-side telemetry must go through dispatch/finalization scripts since workflow events happen in Claude Code conversations"

## Research Report

**Claims analyzed**: 10
**Recommendation**: REVISE

### Verified (6 claims)

- CLAIM-1: VERIFIED HIGH — PostHog Python SDK has manageable transitive dependencies
  Explorer: Project is 100% stdlib Python (confirmed: all imports in serve.py, handlers.py, codex scripts use only stdlib). No pyproject.toml, requirements.txt, or setup.py exists anywhere in the project.
  Web: PostHog Python SDK (pypi: posthog) direct dependencies: `requests>=2.7,<3.0`, `six>=1.5`, `python-dateutil>=2.2`, `backoff>=1.10.0`, `distro>=1.5.0`, `typing-extensions>=4.2.0`. Requires Python >=3.10. These are common, well-maintained packages with no known conflicts with stdlib-only projects.
  Note: Sentry-sdk direct dependencies are even lighter: `certifi` and `urllib3>=1.26.11`. Langfuse v4 is heavier: `httpx`, `pydantic>=2`, `backoff`, `wrapt`, `packaging`, `opentelemetry-api>=1.33.1`, `opentelemetry-sdk>=1.33.1`, `opentelemetry-exporter-otlp-proto-http>=1.33.1`.

- CLAIM-5: VERIFIED HIGH — PostHog supports arbitrary custom event tracking
  Web: `posthog.capture(distinct_id, 'event_name', {'property': 'value'})` supports any named event with custom properties. Documentation explicitly says "Backend jobs: PostHog is for more than just optimizing your frontend. It can often be useful to send events whenever backend jobs or workflows are kicked off." Events like `entity_dispatched`, `stage_completed`, `gate_approved` are fully supported.
  Context7: N/A (PostHog not in Context7)

- CLAIM-6: VERIFIED HIGH — Project has no dependency management; needs to be added
  Explorer: Confirmed via Glob — no pyproject.toml, requirements.txt, setup.py, or setup.cfg exists anywhere in the worktree. All Python code uses only stdlib modules.
  Recommendation: Use `requirements.txt` with optional comments or a minimal `pyproject.toml` with `[project.optional-dependencies]`. Given the plugin distribution model (.claude-plugin/) has no install mechanism, all SDKs should be guarded by `try: import posthog; except ImportError: posthog = None` pattern.

- CLAIM-8: VERIFIED HIGH — Sentry captures unhandled exceptions without framework integration
  Web (Sentry docs): Sentry SDK includes default integrations for `excepthook` (sys.excepthook), `threading`, `stdlib`, and `atexit`. These activate automatically with `sentry_sdk.init()`. Unhandled exceptions in any Python script (including http.server handlers) are captured via the excepthook integration.
  Explorer: handlers.py has no try/except around handler bodies — exceptions propagate to BaseHTTPRequestHandler which writes to stderr. Sentry's excepthook would catch truly unhandled ones. For per-request error capture, a `before_send` wrapper or manual `capture_exception()` calls would be needed in the handler methods.

- CLAIM-9: VERIFIED HIGH — PostHog JS client works with static HTML
  Web: PostHog JS can be included via `<script>` tag in any HTML page. No build system required. Works with static HTML files.
  Explorer: Dashboard uses plain static HTML (index.html, detail.html) with vanilla JS (app.js, detail.js). PostHog JS snippet can be directly added to these files.

- CLAIM-10: VERIFIED HIGH — Agent-side telemetry goes through codex scripts
  Explorer: `codex_prepare_dispatch.py` outputs JSON with dispatch payload (stage_name, entity_path, dispatch_agent_id) and writes a git commit. `codex_finalize_terminal_entity.py` outputs JSON with archive_path, final_commit, verdict. Both are natural telemetry emission points. No event bus or callback system exists in Python code. The mod system (## Hook: sections in markdown) operates at agent instruction level, not in Python.
  Codebase: These scripts are the only Python-level "event" boundaries for workflow lifecycle. Adding `posthog.capture()` calls here is the most natural approach for agent-side analytics.

### Corrected (3 claims)

- CLAIM-2: CORRECTION MEDIUM — Sentry has NO auto-instrumentation for http.server
  Web (Sentry docs): The list of auto-instrumented frameworks includes Django, Flask, FastAPI, Starlette, Bottle, Falcon, Tornado, etc. Python's `http.server.BaseHTTPRequestHandler` is NOT listed. There is no dedicated integration.
  Explorer: handlers.py uses `BaseHTTPRequestHandler` with a closure pattern (`make_handler()`). No try/except wrapping on handler methods.
  **Fix**: Sentry will capture truly unhandled exceptions via `sys.excepthook`, but for structured per-request error capture and tracing, manual instrumentation is needed. Options: (a) wrap each handler method in try/except with `sentry_sdk.capture_exception()`, (b) add a decorator/middleware pattern, or (c) override `do_GET`/`do_POST` with a Sentry span wrapper. This is not auto-magic — plan must account for manual integration work.

- CLAIM-3: CORRECTION HIGH — Langfuse cannot trace Spacedock's LLM calls; scope must change
  Langfuse docs: Langfuse v4 (released April 2026) is built on OpenTelemetry. It instruments LLM calls via `@observe` decorator, context managers, or native integrations (OpenAI, LangChain, etc.). However, it requires the instrumented code to be the one making the LLM API calls.
  Explorer: Spacedock makes ZERO LLM calls. All LLM interaction happens at the Claude Code SDK level (the runtime that executes agents). Spacedock's Python code only does file I/O, git operations, and HTTP serving.
  Web: Langfuse v4 does support tracing non-LLM operations (any span/event), but its primary value (token usage, latency, prompt quality) requires instrumenting the actual LLM client.
  **Fix**: The acceptance criterion "Langfuse integration: trace agent LLM calls with token usage, latency, and prompt metadata" is NOT achievable within Spacedock's codebase. Options: (1) Descope to "Langfuse integration point prepared" — create spans for workflow operations but without LLM-specific data, (2) Track workflow-level metrics only (dispatch duration, stage duration) using Langfuse as a general tracing tool, (3) Defer Langfuse entirely until Claude Code SDK exposes tracing hooks. Recommendation: Option 2 or 3. Langfuse's heavy dependency chain (8 direct deps including 3 OpenTelemetry packages and pydantic) may not justify the limited value without LLM tracing.

- CLAIM-4: PARTIAL CORRECTION MEDIUM — SDKs have different no-op behaviors when unconfigured
  PostHog: Requires explicit initialization with API key. If you guard with `try: import posthog; except ImportError: posthog = None` and check before calling, it's truly no-op. The SDK itself does NOT auto-initialize from env vars — you must call `posthog.project_api_key = '...'` or `posthog.Posthog('key', host='...')`.
  Sentry: `sentry_sdk.init(dsn="")` with empty/None DSN is effectively no-op. Default integrations still load but do nothing without a valid DSN. Can be guarded by checking `os.environ.get('SENTRY_DSN')` before calling init.
  Langfuse: Uses env vars `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASE_URL`. The `get_client()` function will attempt to initialize from env vars automatically. If keys are missing, the SDK logs errors (via OpenTelemetry exporter attempting to connect to localhost:4318). This is NOT truly zero-impact — it generates error log spam even without configuration.
  **Fix**: All three SDKs need explicit guard code: check for env var presence BEFORE importing/initializing. The pattern should be: `if os.environ.get('POSTHOG_API_KEY'): import posthog; posthog.project_api_key = key`. Langfuse especially needs careful handling — do NOT call `get_client()` without valid credentials or it produces OTEL connection errors.

### Unverifiable (1 claim)

- CLAIM-7: PARTIALLY VERIFIED MEDIUM — Privacy controls exist but vary by SDK
  PostHog: Supports `before_send` callback to modify/filter properties before sending. You control exactly what properties are in each `capture()` call since it's explicit. Since Spacedock would construct events manually (not auto-capture), privacy is fully controllable — just don't include entity body content in properties.
  Sentry: `send_default_pii=False` (default) prevents PII. `before_send` callback can strip any field. `include_source_context=False` and `include_local_variables=False` prevent code/variable leakage. `max_breadcrumbs=0` eliminates contextual data. However, stack traces inherently contain file paths and function names — these are metadata, not content, so this should be acceptable.
  Langfuse: The docs describe filtering via "smart default span filter" (v4) for OpenTelemetry spans. Manual instrumentation gives full control over what's sent as `input`/`output` on observations. However, if auto-instrumenting third-party libraries, those may send data you don't control.
  **Overall**: Privacy is achievable for PostHog and Sentry with reasonable configuration. Langfuse privacy depends on instrumentation approach — manual instrumentation gives full control, but the OTEL-based architecture may leak data from auto-instrumented libraries. Since Spacedock would use manual instrumentation only, this is manageable.

### Recommendation Criteria

**Recommendation: REVISE** — 3 corrections identified:

1. **CLAIM-2 (Sentry + http.server)**: Medium severity — plan must include manual instrumentation work for Sentry with BaseHTTPRequestHandler. Not a blocker but changes the implementation approach from "auto-instrument" to "manual wrapping."

2. **CLAIM-3 (Langfuse LLM tracing)**: HIGH severity — the acceptance criterion for Langfuse LLM tracing is fundamentally unachievable within Spacedock. The plan must either descope Langfuse to general workflow tracing, or defer it entirely. The heavy dependency chain (8 deps including OpenTelemetry + pydantic) vs. limited value (no LLM calls to trace) suggests deferral may be the right call.

3. **CLAIM-4 (SDK no-op behavior)**: Medium severity — Langfuse is NOT truly zero-impact when unconfigured. Plan must include explicit guard code pattern for all three SDKs, with special attention to Langfuse's OTEL error spam.

### Dependency Weight Summary

| SDK | Direct Deps | Notable Transitive | Python Req |
|-----|-------------|-------------------|------------|
| posthog | 6 (requests, six, python-dateutil, backoff, distro, typing-extensions) | urllib3, certifi, charset-normalizer, idna (via requests) | >=3.10 |
| sentry-sdk | 2 (certifi, urllib3) | None significant | >=3.6 |
| langfuse | 8 (httpx, pydantic, backoff, wrapt, packaging, opentelemetry-api, opentelemetry-sdk, opentelemetry-exporter-otlp-proto-http) | Many via OTEL + pydantic | >=3.10 |

**Total new dependency footprint**: PostHog + Sentry = ~10 direct deps (reasonable). Adding Langfuse = ~18 direct deps (heavy, especially for limited value without LLM tracing).

## Stage Report: research

- [x] Claims extracted from plan (10 claims)
  10 technical claims extracted covering library APIs, framework integrations, project conventions, and domain rules
- [x] Explorer subagent dispatched and returned
  Codebase verification complete: confirmed stdlib-only project, no dependency management, BaseHTTPRequestHandler pattern, codex scripts as event boundaries, no event bus
- [x] Context7/Langfuse-docs subagent dispatched and returned
  Langfuse docs verification complete: v4 OTEL-based SDK, manual instrumentation supported, env var configuration, privacy controls via span filtering, get_client() auto-init behavior
- [x] Web subagent dispatched and returned
  Web verification complete: PostHog/Sentry/Langfuse dependency lists from PyPI/GitHub, PostHog custom event API confirmed, Sentry integration list (no http.server), Langfuse v4 release confirmed
- [x] Cross-reference synthesis completed
  6 verified, 3 corrected, 1 partially verified. Key corrections: no Sentry auto-instrumentation for http.server, Langfuse LLM tracing not achievable in Spacedock, Langfuse not zero-impact when unconfigured
- [x] Research report written to entity
- [x] Insights cached to context lake

## Stage Report: plan

- [x] Formal plan document created via `Skill: "superpowers:writing-plans"` and saved to `docs/superpowers/plans/`
  Re-planned for Bun/TypeScript architecture. Saved to `docs/superpowers/plans/2026-04-04-observability-integration.md` (overwrote previous Python-based plan)
- [x] Plan has concrete file paths for all new and modified files
  14 files mapped in File Structure table: 3 new TS files (telemetry.ts, telemetry.test.ts, telemetry-codex.test.ts), 2 modified Python scripts, 6 modified TS/HTML/JS files with exact paths
- [x] Plan uses test-first ordering
  All 8 tasks follow TDD: write failing test -> verify failure -> implement -> verify pass -> commit
- [x] Plan uses npm packages (posthog-node, @sentry/bun)
  Task 2 installs via `bun add posthog-node @sentry/bun`. No requirements.txt — dashboard is now a Bun project with package.json
- [x] Plan addresses env-var gating and privacy (metadata only)
  telemetry.ts uses env-var-check-before-require guard (POSTHOG_API_KEY, SENTRY_DSN). All captureEvent calls send only metadata: slug, stage, score, tag_count, verdict. Never entity body content. Quality Gates section enumerates all 5 privacy/safety guarantees.

### Summary

Re-planned the observability integration for the Bun/TypeScript dashboard architecture (previous Python-based plan was invalid after migration). 8-task TDD plan: Task 1 creates `telemetry.ts` with env-var-gated `require()` for posthog-node and @sentry/bun. Task 2 installs npm deps. Task 3 wraps Bun.serve route handlers with try/catch + Sentry (no auto-instrumentation). Task 4 adds `/api/config` endpoint. Task 5 adds PostHog events for API mutations. Task 6 adds frontend PostHog JS + status indicator. Task 7 adds lightweight Python PostHog calls to codex scripts. Task 8 is integration verification. All research corrections incorporated: manual Sentry wrapping, env-var-before-import guard, metadata-only privacy.
