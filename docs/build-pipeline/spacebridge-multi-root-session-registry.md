---
id: 057
title: "Multi-root session registry + file watcher"
status: draft
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [053]
---

## Problem

The spacebridge daemon serves all repos on a machine, not just one. It needs a session registry (🟢 fmodel CQRS domain) to track which CC sessions are connected, which project roots they own, and their liveness via heartbeat. The registry's active project roots drive workflow discovery (consuming entity 018's `discoverWorkflows` primitive) and file watcher scope. Without the registry, the daemon cannot aggregate cross-repo state or detect crashed sessions.

## Scope

- Session registry as fmodel CQRS aggregate:
  - Commands: `register`, `heartbeat`, `disconnect`
  - Events: `session_registered`, `session_heartbeat`, `session_disconnected`
  - Pure decider + evolve functions
- On `session_registered`: call `discoverWorkflows([...all_distinct_project_roots])` to update active discovery scope
- On `session_disconnected` (explicit or heartbeat timeout): remove session, recompute discovery scope
- File watcher on union of workflow directories from session registry:
  - Bun native `fs.watch` (or chokidar for cross-platform consistency)
  - Debounce at ~100ms per (file, change-type) pair
  - File change events as 🟡 event-log entries (observations, no decider)
  - Push to all connected SSE clients
- Heartbeat timeout detection: configurable interval (default 30s), marks session as disconnected after N missed heartbeats
- Drizzle persistence for session events

## Acceptance Criteria

- [ ] Sessions register with daemon and appear in registry
- [ ] `discoverWorkflows` is called with union of all active project roots
- [ ] File watcher covers all workflow directories from registered sessions
- [ ] Adding a new session dynamically expands file watcher scope
- [ ] Removing a session (disconnect or timeout) contracts file watcher scope
- [ ] File change events are debounced and pushed to SSE clients
- [ ] Heartbeat timeout correctly marks stale sessions as disconnected
- [ ] Pure decider has unit tests for register/heartbeat/disconnect flows
- [ ] Session registry survives daemon restart via event replay

## References

- Design doc §4.3 (Session registry and multi-root discovery): registry design with fmodel types
- Design doc §4.4 (File watcher): watcher scope, debouncing, event classification
- Entity 018 (multi-root-workflow-discovery): `discoverWorkflows` primitive consumed here
