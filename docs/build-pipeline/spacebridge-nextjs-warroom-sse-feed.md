---
id: 053
title: "Next.js app — war room view + SSE live feed"
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
depends-on: [052]
---

## Problem

The spacebridge daemon needs a web UI that replaces the current `tools/dashboard/static/*` HTML/JS. The war room view is the primary surface: it shows all active entities across all connected repos, their pipeline stage, owner session badge, and a live activity feed. SSE (not WebSocket) is the realtime transport because it passes reliably through tunnels (cloudflared, ngrok, tailscale) and is natively supported by Next.js Route Handlers.

## Scope

- Next.js App Router application served by the spacebridge daemon on port 8420
- War room page: entity cards showing slug, title, status, current stage, owner session badge
- Multi-repo awareness: entities from all connected session project roots displayed together
- SSE endpoint via Next.js Route Handler (streaming `Response` with `ReadableStream`)
- Client-side SSE consumer: `EventSource` connecting to the daemon's SSE endpoint
- Live feed panel: new events (stage transitions, comments, file changes) appear in real-time
- Debounced file watcher events rendered without flooding the UI
- React 19 + Server Components where appropriate (entity list initial render)

## Acceptance Criteria

- [ ] War room page renders at `http://127.0.0.1:8420/` with entity cards from all connected repos
- [ ] Entity cards show: slug, title, status, stage, owner session (if leased)
- [ ] SSE endpoint at `/api/events` streams events to connected clients
- [ ] New events appear in the live feed within 1 second of occurrence
- [ ] Page is bookmarkable and loads correctly on refresh (no stale state)
- [ ] Multiple browser tabs can connect to SSE simultaneously
- [ ] UI degrades gracefully when daemon has no connected sessions (empty state)

## References

- Design doc §3.4 (Events over SSE): rationale for SSE over WebSocket
- Design doc §4.4 (File watcher): debouncing strategy for file change events
