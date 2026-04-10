---
id: 052
title: "L2 auto-fork daemon lifecycle"
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
scale: Small
project: spacedock
depends-on: [051]
---

## Problem

The spacebridge daemon must be long-lived (outlives any single CC session) and auto-started (no manual `spacebridge start` required). The L2 auto-fork model solves this: the first shim to start checks for an existing daemon socket; if absent, it forks a detached daemon process, waits for the socket, then connects. A lock file prevents two simultaneous shims from both forking daemons. Without this, users must manually manage daemon lifecycle, breaking the "zero-token UI" promise.

## Scope

- Implement auto-fork logic in shim startup: check socket → acquire lock → re-check → fork daemon → wait for socket → release lock → connect
- Lock file implementation using `flock` at `~/.spacedock/spacebridge.lock`
- Daemon process spawned as detached (`stdio: 'ignore'`, `.unref()`)
- Support both dev mode (`bun path/to/daemon.ts start`) and compiled mode (`spacebridge start`) via `SPACEBRIDGE_DEV` env var or binary detection
- Daemon shutdown: last shim disconnecting triggers graceful shutdown (configurable: sticky vs auto-stop)
- `spacebridge start` / `spacebridge stop` / `spacebridge status` CLI subcommands
- Disable auto-fork via env var for development/debugging

## Acceptance Criteria

- [ ] First shim auto-forks daemon when no socket exists
- [ ] Second simultaneous shim waits for lock, finds daemon already running, connects without double-fork
- [ ] Daemon process outlives the shim that started it
- [ ] `spacebridge status` reports daemon PID, uptime, and connected sessions
- [ ] `spacebridge stop` gracefully shuts down daemon
- [ ] Auto-fork disabled when `SPACEBRIDGE_NO_AUTOFORK=1` is set
- [ ] Lock file prevents race condition (test: two shims started within 100ms)

## References

- Design doc §4.1 (L2 auto-fork daemon lifecycle): lifecycle options analysis and L2 choice rationale
- Design doc §4.2 (Auto-fork implementation sketch): pseudocode for the startup sequence
