---
id: 003
title: Real-time Agent Activity Feed
status: quality
source: commission seed
started: 2026-04-04T10:56:00Z
completed:
verdict:
score: 0.8
worktree: .worktrees/ensign-realtime-agent-activity-feed
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- **Requires feature B (Dashboard Persistent Daemon)** — the dashboard server must be running as a stable background process before real-time event streaming makes sense. Design spec: `docs/superpowers/specs/2026-04-04-dashboard-persistent-daemon-design.md`
- Can be developed in parallel with feature C (Observability Integration)

## Brainstorming Spec

APPROACH:     FO starts a WebSocket server that streams agent lifecycle events (dispatch, completion, gate pending, feedback cycle) to the dashboard UI. The UI renders a real-time activity feed showing what each agent is working on. Eventually, the web UI becomes an interaction endpoint where the captain can approve gates and communicate with agents.
ALTERNATIVE:  File-based polling (FO writes events to a JSON log, UI polls) (rejected: higher latency, no bidirectional communication)
GUARDRAILS:   WebSocket server must not block FO's main event loop. Events are append-only (UI catches up on reconnect). Gate approval via UI must have the same guardrails as CLI (NEVER self-approve). The interaction endpoint is a stretch goal — start with read-only activity feed.
RATIONALE:    This is the "war room" vision — seeing all active workflows, what agents are doing right now, and having a single place to monitor and intervene. WebSocket enables real-time updates and future bidirectional communication (captain approving gates from the browser).

### Brainstorming Context (2026-04-04)

Captain 補充方向：UI 要能看到現在的進度、agent team 正在處理哪個項目。這不只是 event log — 是一個 live status view，顯示每個 agent 的當前狀態（idle、working、waiting for gate）和正在處理的 entity。

## Acceptance Criteria

- FO emits structured events: `{type: "dispatch"|"completion"|"gate"|"feedback", entity, stage, agent, timestamp}`
- WebSocket server starts alongside FO, configurable port
- Dashboard UI connects via WebSocket, renders live activity feed
- Activity feed shows: agent name, entity title, current stage, elapsed time
- Reconnection handling: UI reconnects and replays missed events from event log
- Gate pending events highlighted in UI with approve/reject buttons (stretch goal)
- Multiple concurrent workflows visible in single feed (filtered by workflow directory)

## Explore Findings

### File List by Layer

**Server / Infrastructure (tools/dashboard/)**
- `serve.py` — HTTP server entry point. Uses stdlib `ThreadingHTTPServer`. WebSocket requires a separate server thread or process since `BaseHTTPRequestHandler` does not support HTTP Upgrade.
- `handlers.py` — REST API request handler. Routes for workflows, entity detail, filtered entities, score/tag updates. Closure pattern via `make_handler()`. No WebSocket support — a separate endpoint is needed.
- `ctl.sh` — Daemon lifecycle manager (start/stop/status/logs/restart). Manages one Python process per project via PID file in `~/.spacedock/dashboard/{hash}/`. If WebSocket runs in the same process (separate thread), ctl.sh needs no changes. If separate process, needs second PID tracking.
- `__main__.py` — Simple entry point calling `serve.main()`.
- `discovery.py` — Workflow discovery via `os.walk` + frontmatter check. Read-only, no changes needed.
- `parsing.py` — YAML frontmatter parser (copied from status script). Read-only, no changes needed.
- `frontmatter_io.py` — Frontmatter read/write, stage report parsing. `extract_stage_reports()` useful for generating structured event data.
- `api.py` — Entity detail/filter/update functions. Read-only queries + score/tag writes. No changes needed.

**Frontend (tools/dashboard/static/)**
- `index.html` — Dashboard shell. Header + main container. Activity feed section would be added here or on a new `/activity` page.
- `app.js` — Dashboard JS. Polling-based (5s interval), vanilla JS, `el()` DOM helper. `statusColor()` maps stage names to colors. WebSocket client code would supplement or replace polling for real-time events.
- `detail.html` — Entity detail page. Grid layout with sidebar. Could show real-time entity-specific events.
- `detail.js` — Detail page JS. Renders metadata, markdown body, stage reports, tags, score.
- `style.css` — Dark theme. Colors: bg `#0d1117`, card `#161b22`, border `#21262d`, text `#c9d1d9`, accent `#58a6ff`.
- `detail.css` — Detail page styling. Same dark theme, grid layout, checklist items, tag chips.

**FO Agent / Dispatch (references/, agents/, skills/)**
- `references/first-officer-shared-core.md` — FO event loop and dispatch lifecycle. KEY: defines 6 event injection points (dispatch, completion, gate, feedback, merge, idle). FO currently emits only text output to captain — no structured events.
- `references/claude-first-officer-runtime.md` — Claude Code FO runtime. Dispatch via Agent(), captain interaction via text output. KEY CONSTRAINT: FO is an AI agent, not a Python process — cannot directly call WebSocket APIs. Event emission must go through Bash tool (REST POST to dashboard or file-write).
- `references/claude-ensign-runtime.md` — Ensign completion signal: `SendMessage(to="team-lead", "Done: ...")`. FO receives this as completion trigger and would relay to dashboard.
- `references/ensign-shared-core.md` — Stage Report Protocol format. Ensigns write reports; FO reads them at completion boundaries.
- `references/codex-first-officer-runtime.md` — Codex FO runtime. Bare-mode dispatch via `spawn_agent()`. Same event injection points apply.
- `references/codex-tools.md` — Codex tool mappings. SendMessage maps to collab events.
- `agents/first-officer.md` — Thin FO agent definition. Loads contract via skill.
- `agents/ensign.md` — Thin ensign agent definition.
- `skills/first-officer/SKILL.md` — FO skill launcher. Reads 3 reference files then starts.
- `skills/dashboard/SKILL.md` — Dashboard skill. Delegates to ctl.sh. May need WebSocket port query support.

**Mod Hooks (mods/)**
- `mods/pr-merge.md` — PR lifecycle mod with startup/idle/merge hooks. Shows the mod system pattern. Mod hooks are instruction-based (markdown for AI agents), not code — cannot directly call Python APIs. Events from mods (PR created, PR merged) could also feed the activity stream.

**Design Specs (docs/)**
- `docs/superpowers/specs/2026-04-04-dashboard-persistent-daemon-design.md` — Dependency spec. Confirms: WebSocket event streaming is explicitly deferred as "feature A (separate spec)". Daemon architecture (ctl.sh + serve.py) is the foundation this feature builds on.

### Key Architectural Constraints

1. **FO is an AI agent, not a Python process.** It cannot import Python WebSocket libraries. Event emission must use an intermediary: REST POST to dashboard, file-based event log, or shell command.
2. **Dashboard server is stdlib `http.server.ThreadingHTTPServer`.** No native WebSocket support. Options: (A) `websockets` library (confirmed available via `import websockets`) in a separate asyncio thread, (B) raw WebSocket handshake implementation in the HTTP handler, (C) separate WebSocket process.
3. **`websockets` Python library is available** on this system (`import websockets` succeeds). `asyncio` is stdlib. Option A (asyncio WebSocket server in a background thread within the same process) is the cleanest path.
4. **Mod hooks are markdown instructions for AI agents**, not executable code. They cannot directly emit events. The FO must relay mod-triggered state changes as events.
5. **No existing event/message bus.** FO-to-captain communication is text output. FO-to-ensign is Agent() dispatch. Ensign-to-FO is SendMessage(). All are AI agent messaging primitives, not programmatic APIs.
6. **Event injection points in FO lifecycle** (from shared core): dispatch (step 5-6), completion (step 1-3), gate presentation, feedback rejection, merge/cleanup, idle hooks. Each is a natural point to emit a structured event.

### Recommended Architecture

**Event flow: FO -> REST POST -> Dashboard -> WebSocket -> Browser**

1. Dashboard server adds a WebSocket server thread (using `websockets` + `asyncio`) on a configurable port (convention: HTTP_PORT + 1, e.g., 8421).
2. Dashboard adds a REST endpoint `POST /api/events` that accepts structured events and broadcasts them to all connected WebSocket clients.
3. FO references are updated to include event emission instructions: at each lifecycle point, call `curl -s -X POST http://localhost:{port}/api/events -d '{event_json}'` via Bash tool.
4. Frontend JS opens WebSocket connection and renders events in an activity feed panel.
5. Event log stored in-memory (bounded ring buffer) for reconnection replay.

### Scale Confirmation

**Medium — confirmed.** File count: ~19 files to create or modify across 4 layers (server WebSocket thread, REST event endpoint, FO reference updates, frontend activity feed UI). This is squarely Medium scope — more than a few-file change but contained to well-defined layers.

## Stage Report: explore

- [x] File list grouped by layer — identify all files relevant to WebSocket, event streaming, FO lifecycle, agent communication, and dashboard frontend
  19 files identified across 4 layers: server infrastructure (8), frontend (6), FO agent/dispatch (10), mod hooks (1), design specs (1)
- [x] Context lake insights stored for each relevant file discovered
  19 insights stored to context lake covering all discovered files with WebSocket-specific analysis
- [x] Scale confirmation or revision (currently Medium) based on actual file count
  Medium confirmed: ~19 files across 4 layers (server, frontend, FO references, event endpoint)
- [x] Map existing patterns for event emission, agent lifecycle, and real-time communication in the codebase
  6 FO lifecycle event injection points mapped; no existing event bus — FO uses text output, ensigns use SendMessage; REST POST intermediary pattern identified as the bridge
- [x] Identify constraints: Python stdlib WebSocket limitations, daemon implications, FO event injection points
  5 constraints documented: FO is AI agent (not Python process), stdlib HTTP server lacks WebSocket, `websockets` library available, mod hooks are markdown (not code), no existing event bus

### Summary

Deep exploration of the codebase for the real-time agent activity feed feature. Mapped all relevant files across server, frontend, agent, and mod layers. The key architectural insight is that the FO is an AI agent that cannot directly call Python APIs — event emission must use a REST POST intermediary that the dashboard server broadcasts via WebSocket. The `websockets` Python library is available, enabling an asyncio WebSocket server thread within the existing dashboard process. Scale confirmed as Medium.

## Technical Claims

CLAIM-1: [type: library-api] Python `websockets` library can run an asyncio WebSocket server in a background thread alongside ThreadingHTTPServer — no blocking conflicts
CLAIM-2: [type: framework] FO can emit events via REST POST (`curl -X POST`) from within a Claude Code agent conversation using the Bash tool
CLAIM-3: [type: library-api] Server-Sent Events (SSE) as simpler alternative — http.server has limitations for SSE
CLAIM-4: [type: architecture] REST POST to WebSocket broadcast is a proven pattern for bridging HTTP and WebSocket
CLAIM-5: [type: library-api] JavaScript WebSocket API supports automatic reconnection and event replay from a log
CLAIM-6: [type: library-api] ThreadingHTTPServer can handle concurrent connections (REST POST from FO + browser requests) without blocking
CLAIM-7: [type: architecture] Event log as append-only JSON Lines file replayed on WebSocket reconnection — reliability at expected volume
CLAIM-8: [type: library-api] `websockets` asyncio.new_event_loop() + loop.run_forever() in a daemon thread is the correct embedding pattern
CLAIM-9: [type: library-api] `websockets.broadcast()` is thread-safe for broadcasting from HTTP handler thread to asyncio WebSocket thread
CLAIM-10: [type: architecture] In-memory ring buffer vs file-based JSON Lines for event replay

## Research Report

**Claims analyzed**: 10
**Recommendation**: PROCEED (with corrections noted)

### Verified (7 claims)

- CLAIM-1: CONFIRMED — HIGH
  Explorer: empirical test — `websockets.serve()` in background thread via `asyncio.new_event_loop()` + `threading.Thread(daemon=True)` works alongside `ThreadingHTTPServer`. Tested with websockets 15.0.1.
  Web: websockets docs confirm asyncio server can run in a dedicated event loop thread. Pattern: `asyncio.set_event_loop(loop)` then `loop.run_forever()`.
  **Note**: websockets docs warn "choosing asyncio is mutually exclusive with threading" — this applies to mixing asyncio *within* the websocket handler, not to running the loop in a separate thread.

- CLAIM-2: CONFIRMED — HIGH
  Explorer: FO shared core (`references/first-officer-shared-core.md`) defines 6 lifecycle event injection points (dispatch, completion, gate, feedback, merge, idle). FO runtime (`references/claude-first-officer-runtime.md`) confirms FO is an AI agent that uses Bash tool for shell commands. `curl -X POST` is a standard Bash tool invocation pattern.
  Web: REST POST via `curl` is universally supported. No constraints on Claude Code Bash tool prevent HTTP requests.

- CLAIM-4: CONFIRMED — HIGH
  Explorer: empirical test — full integration test with HTTP POST handler relaying to WebSocket broadcast via `asyncio.run_coroutine_threadsafe()`. 5/5 events delivered correctly.
  Web: REST-to-WebSocket bridge is a well-documented architecture pattern used in production systems.

- CLAIM-6: CONFIRMED — HIGH
  Explorer: empirical test — `ThreadingHTTPServer` handled 10 concurrent requests (5 POST + 5 GET) simultaneously. Each request runs in its own thread (that's the "Threading" in the name).
  Codebase: `serve.py:43` uses `ThreadingHTTPServer` already. No modifications needed for concurrent connection support.

- CLAIM-7: CONFIRMED — HIGH
  Web: JSON Lines append-only log with sequence numbers is a standard event replay pattern. WebSocket.org recommends: client tracks `lastSeqId`, reconnects with `?since=lastSeqId`, server replays buffered events. At expected volume (tens of events per workflow, not thousands per second), file I/O is negligible.
  **Note**: For this project's scale (agent lifecycle events — maybe 10-50 per hour), even a simple list in memory is sufficient. JSON Lines file provides persistence across server restarts.

- CLAIM-8: CONFIRMED — HIGH
  Explorer: empirical test confirmed the pattern works:
  ```python
  loop = asyncio.new_event_loop()
  def run_loop():
      asyncio.set_event_loop(loop)
      loop.run_forever()
  t = threading.Thread(target=run_loop, daemon=True)
  t.start()
  server = asyncio.run_coroutine_threadsafe(start_ws(), loop).result()
  ```
  Web: Python docs confirm `asyncio.run_coroutine_threadsafe()` is the correct API for scheduling coroutines from another thread onto a running loop.

- CLAIM-10: CONFIRMED — HIGH (design recommendation)
  Explorer + Web: Both approaches work. For this project:
  - In-memory ring buffer: simplest, no disk I/O, sufficient for dashboard lifetime. Events lost on server restart.
  - JSON Lines file: survives restarts, enables historical replay. Slightly more complex.
  **Recommendation**: Use in-memory bounded list (spec says "ring buffer") as primary, with optional JSON Lines file for persistence. The spec's recommendation of "in-memory ring buffer" is sound for the expected event volume.

### Corrected (2 claims)

- CLAIM-5: CORRECTED — HIGH
  Web: JavaScript browser WebSocket API does **NOT** support automatic reconnection. The `onclose` event fires, but no reconnection happens automatically. Manual implementation required: `onclose` -> `setTimeout` with exponential backoff -> `new WebSocket(url)`.
  Web: Event replay requires server-side sequence numbers. Client sends `lastSeqId` on reconnect, server replays from buffer.
  **Fix**: The plan must explicitly include reconnection logic in the frontend JS (exponential backoff, max retries) and a sequence-number protocol for replay. This is ~20-30 lines of JS, not complex, but must be designed — it's not a built-in browser feature.

- CLAIM-9: CORRECTED — HIGH
  Explorer: `websockets.broadcast()` source code inspection reveals it is a **synchronous function** that directly accesses `connection.protocol.send_text/send_binary` and `connection.send_data()`. It is NOT thread-safe.
  Web: websockets docs confirm "asyncio objects are not thread-safe" and recommend `asyncio.run_coroutine_threadsafe()` for cross-thread operations.
  **Fix**: Must NOT call `broadcast()` directly from HTTP handler thread. Correct pattern:
  ```python
  async def do_broadcast(data):
      broadcast(connected_clients, json.dumps(data))

  # In HTTP handler (runs in ThreadingHTTPServer thread):
  future = asyncio.run_coroutine_threadsafe(do_broadcast(event), ws_loop)
  future.result(timeout=2)  # wait for completion
  ```
  This was empirically verified — 5/5 events delivered correctly using this pattern with websockets 15.0.1.

### Verified with note (1 claim)

- CLAIM-3: CONFIRMED with NOTE — MEDIUM
  Web: SSE requires `text/event-stream` content type and persistent keep-alive connections. Python stdlib `BaseHTTPRequestHandler` can technically stream responses, but: (1) no built-in SSE support, (2) `ThreadingHTTPServer` holds a thread per connection for the entire SSE stream lifetime, (3) no framework support for push-from-server (handler returns once, doesn't keep the connection for future pushes without blocking a thread).
  **Conclusion**: SSE is technically possible but awkward with stdlib `http.server`. WebSocket via the `websockets` library is cleaner for this use case: separate port, dedicated asyncio loop, proper bidirectional support for future gate approval UI. The spec's choice of WebSocket over SSE is correct.

### Recommendation Criteria

- 2 corrections found, both are **minor implementation details** (not architectural):
  - CLAIM-5: JS reconnection must be manually implemented (well-known pattern, ~20-30 LOC)
  - CLAIM-9: `broadcast()` must be called via `run_coroutine_threadsafe` (already the pattern we verified works)
- Neither correction affects the overall architecture (REST POST -> WebSocket broadcast) or data model
- All architectural claims verified with HIGH confidence
- Empirical tests confirm the full pipeline: HTTP POST -> `run_coroutine_threadsafe(broadcast)` -> WebSocket client receive

**PROCEED** — the spec's recommended architecture is sound. Two corrections are implementation-level and the correct patterns have been verified empirically.

## Stage Report: research

- [x] Claims extracted from spec and explore results (10 claims across library-api, framework, and architecture types)
- [x] Explorer verification completed — codebase patterns confirmed, 3 empirical integration tests run:
  1. WebSocket server in background thread alongside sync code: PASSED
  2. ThreadingHTTPServer concurrent POST+GET: PASSED (10/10 requests)
  3. Full HTTP POST -> run_coroutine_threadsafe(broadcast) -> WebSocket receive: PASSED (5/5 events)
- [x] Library docs verification completed — websockets 15.0.1 API inspected, broadcast() source reviewed, thread-safety characteristics documented
- [x] Web research completed — reconnection patterns, SSE limitations, JSON Lines replay, thread safety all verified via web sources
- [x] Cross-reference synthesis completed — 7 verified, 2 corrected, 1 verified-with-note
- [x] Research report written to entity with per-claim evidence and confidence levels
- [x] Key corrections identified: (1) JS WebSocket has no auto-reconnect — must implement manually, (2) websockets.broadcast() is not thread-safe — must use run_coroutine_threadsafe wrapper

### Summary

10 technical claims verified across 3 sources (codebase empirical tests, library docs/source inspection, web research). The spec's recommended architecture (FO -> REST POST -> Dashboard -> WebSocket -> Browser) is confirmed sound. Two corrections are implementation-level: JavaScript WebSocket reconnection must be manually coded (not a built-in feature), and `websockets.broadcast()` must be invoked via `asyncio.run_coroutine_threadsafe()` from the HTTP handler thread. Both corrections have been empirically verified with working code. Recommendation: PROCEED.

## Stage Report: plan

- [x] Formal plan document created via `Skill: "superpowers:writing-plans"` and saved to `docs/superpowers/plans/`
  Saved to `docs/superpowers/plans/2026-04-04-realtime-agent-activity-feed.md` (re-planned for Bun/TypeScript architecture)
- [x] Plan has concrete file paths for all new and modified files
  9-file file structure table with exact paths; each task lists Create/Modify with full paths (events.ts, server.ts, types.ts, activity.js, index.html, style.css, FO reference, 2 test files)
- [x] Plan uses test-first ordering
  Task 1: write failing EventBuffer tests then implement; Task 2: write failing WebSocket + REST tests then implement server changes; Task 5: integration test suite
- [x] Plan leverages Bun's built-in WebSocket (no external deps)
  Bun.serve() websocket handler with pub/sub (server.publish("activity", data)), same port as HTTP, no threading, no external library
- [x] Plan addresses FO event emission via REST POST
  Task 4: adds ## Event Emission section to first-officer-shared-core.md with curl POST instructions at 6 lifecycle injection points (dispatch, completion, gate, feedback, merge, idle)

### Summary

Re-planned for Bun/TypeScript architecture (previous Python-based plan invalidated by dashboard migration). 6-task TDD plan: (1) event data model + ring buffer with tests, (2) WebSocket handler + POST /api/events route in server.ts with tests, (3) frontend activity feed with manual JS reconnection (exponential backoff), (4) FO lifecycle event emission instructions, (5) integration tests for full pipeline, (6) final verification. Zero external dependencies -- Bun's built-in WebSocket replaces the Python websockets library, and single-threaded event loop eliminates all threading complexity from the previous plan.

## Stage Report: execute

- [x] All plan tasks implemented with commits on the feature branch
  5 atomic commits: event model+buffer, WebSocket+REST endpoint, frontend activity feed, FO event emission docs, integration tests
- [x] TDD discipline followed
  Tasks 1 and 2: failing tests written first (EventBuffer not found, /api/events 404, WebSocket upgrade failed), then implementation made them pass. Task 5: integration tests added after server implementation.
- [x] Atomic commits using `{type}(scope): {description}` format
  feat(dashboard): add event data model and ring buffer with tests; feat(dashboard): add WebSocket handler and POST /api/events endpoint; feat(dashboard): add activity feed UI with WebSocket client and reconnection; docs(fo): add event emission instructions at lifecycle injection points; test(dashboard): add full event pipeline integration tests
- [x] Bun built-in WebSocket used (no external deps)
  Bun.serve() websocket handler with server.publish("activity", data) pub/sub, same port as HTTP, zero external dependencies added
- [x] All tests passing (`bun test`)
  76 tests pass across 7 files (6 EventBuffer unit tests, 21 server tests including 8 new WebSocket/event tests, 2 integration tests, plus existing suite)

### Summary

Implemented real-time agent activity feed using Bun's built-in WebSocket support. The architecture is FO -> REST POST /api/events -> EventBuffer (ring buffer, capacity 500) -> server.publish("activity") -> WebSocket clients. Frontend activity.js connects with manual exponential backoff reconnection and renders events in a dark-themed sidebar panel. FO shared core updated with event emission instructions at all 6 lifecycle injection points (dispatch, completion, gate, feedback, merge, idle). All work done with zero external dependencies -- Bun handles HTTP and WebSocket on the same port natively.

## Stage Report: quality

- [x] Test results -- all tests pass with counts
  76 tests pass, 0 fail, 196 expect() calls across 7 files (events.test.ts, server.test.ts, plus 5 existing test files). Ran in 6.27s.
- [x] Smoke test -- event POST + retrieval works
  POST /api/events with valid payload returns {"ok":true,"seq":1}. GET /api/events returns posted events. GET /api/events?since=1 correctly filters replay. Validation rejects missing fields (400) and invalid event types (400).
- [x] Security -- path traversal guard verified
  curl http://localhost:8470/api/entity/detail?path=/etc/passwd returns HTTP 403 Forbidden.
- [x] No regressions confirmed
  All existing endpoints verified: GET /api/workflows (200, returns workflow data), GET /api/entity/detail (200, returns entity frontmatter+body), POST /api/entity/score (200, updates score), GET / (200, serves index.html). Static file serving intact.
- [x] Recommendation: PASSED

### Summary

All quality checks pass. 76 tests green with no failures. Smoke test confirmed the full event pipeline: POST /api/events -> EventBuffer storage -> GET /api/events retrieval, including sequence-based replay via ?since=N parameter. Path traversal security guard correctly returns 403. All pre-existing dashboard functionality (workflows, entity detail, score/tag updates, static serving) works without regressions. Implementation is clean -- EventBuffer ring buffer, Bun built-in WebSocket pub/sub, frontend with exponential backoff reconnection -- zero external dependencies added.
