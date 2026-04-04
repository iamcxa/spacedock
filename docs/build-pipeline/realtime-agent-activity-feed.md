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
