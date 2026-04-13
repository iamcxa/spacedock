# Spacebridge War Room UI

The spacebridge war room is a Next.js App Router application at `spacebridge/ui/` that provides a real-time entity pipeline view for all connected repos.

## Spawn Lifecycle

The daemon spawns the Next.js standalone server as a child process on daemon start:

```
daemon start
  → server.listen() (unix socket)
  → spawnNextjsChild({ serverScript, port: 8420, dbPath, stateDir })
  → Next.js standalone server running on port 8420
```

On daemon shutdown, `shutdownNextjsChild(child)` sends SIGTERM and awaits graceful exit (5s timeout → SIGKILL fallback) before closing the unix socket server.

Implementation: `spacebridge/src/daemon/nextjs-child.ts`

## Port 8420

The Next.js UI is locked to port 8420 per ADR-001. The standalone server respects the `PORT` environment variable set by the daemon on spawn.

## SPACEBRIDGE_SKIP_UI

Set `SPACEBRIDGE_SKIP_UI=1` to skip Next.js UI spawn:

```bash
SPACEBRIDGE_SKIP_UI=1 bun run bin/daemon.ts start
```

Use cases: CI environments, lean integration tests, running daemon without a pre-built UI.

## Required Pre-Build Step

The war room UI must be built before the daemon starts. The standalone artifact is not included in the repository.

```bash
cd spacebridge/ui
bun run build
```

This produces `.next/standalone/ui/server.js`. If the build artifact is missing, the daemon logs a warning and continues without the UI (non-fatal).

## Data Architecture

- **War room page** (`/`): Server Component. Reads connected sessions from SQLite `sessions` table, scans entity markdown files via `scanEntitiesForRepo`, reads active leases from `entity_leases` table.
- **SSE endpoint** (`/api/events`): Route Handler. Polls `events` table every 500ms using an `id`-based cursor. Each connected client maintains its own cursor independently.
- **DB access**: Read-only (`readonly: true` via bun:sqlite). The daemon holds the write lock; concurrent readers are safe via SQLite WAL mode.

## SSE Transport

SSE (Server-Sent Events) is used instead of WebSocket because it passes through tunnels (cloudflared, ngrok, tailscale) without special configuration. The `EventSource` client auto-reconnects on disconnect.

Stream format:
```
: ping

data: {"id":1,"type":"stage_transition","entity":"foo","stage":"execute",...}

data: {"id":2,...}
```
