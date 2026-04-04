---
id: 003
title: Real-time Agent Activity Feed
status: explore
source: commission seed
started:
completed:
verdict:
score: 0.7
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
