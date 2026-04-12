---
id: 051
title: "Unix socket IPC + ChannelProvider client/server"
status: draft
context_status: pending
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
depends-on: [050]
note: "ChannelProvider interface already extracted locally (tools/dashboard/src/channel-provider.ts, 2026-04-10). PR1 to upstream is soft-blocked — can develop against local interface. This entity implements the bridge-side unix socket client that forwards ChannelProvider calls to the daemon."
---

## Directive

> Implement unix socket IPC between the spacebridge shim (per-CC-session process) and the spacebridge daemon (long-lived). The shim implements ChannelProvider by forwarding calls over the socket. The daemon hosts the server endpoint that routes messages to the correct shim. CoordinationClient stub rides the same transport (real implementation in entity 056). The ChannelProvider interface is already extracted at tools/dashboard/src/channel-provider.ts and is directly importable (entity 050 Q-3 decision: same repo, direct import).

## Captain Context Snapshot

- **Repo**: main @ 60d75b4
- **Session**: SO pipeline session. Entity 050 just clarified (context ready, FO executing). Spacebridge lives inside spacedock repo per 050 Q-1. Direct type import per 050 Q-3.
- **Domain**: Behavioral/Callable, Organizational/Data-transforming
- **Related entities**: 050 -- Spacebridge plugin skeleton + Drizzle LCD schema (plan), 052 -- L2 auto-fork daemon lifecycle (draft, depends on this), 056 -- Role-aware lease manager (draft, CoordinationClient real impl)
- **Created**: 2026-04-12T23:50:00+08:00

## Brainstorming Spec

**APPROACH**: Implement a length-prefixed JSON-over-unix-socket IPC layer with two sides. **Server side** (in daemon process, entity 052): listens on `~/.spacedock/spacebridge.sock`, accepts connections from shims, maintains a session→socket map for routing inbound actions to the correct shim. **Client side** (in MCP shim, spawned per CC session): connects to the socket, implements the `ChannelProvider` interface by serializing each method call (`publishEvent`, `broadcastChannelStatus`, `eventBuffer.getChannelMessagesSince`, `snapshotStore.createSnapshot`) as a JSON-RPC message and sending it over the socket. The framing protocol uses a 4-byte big-endian length prefix + UTF-8 JSON payload -- simple, debuggable with `socat`, no external dependency. Each message carries a `type` field for routing (event, action, handshake, heartbeat, rpc-request, rpc-response). Connection lifecycle: shim connects → sends `register` with `{projectRoot, sessionId, pid}` → daemon acknowledges with session token → bidirectional messaging begins. On daemon restart: shim detects EPIPE/ECONNRESET → reconnects with exponential backoff (100ms, 200ms, 400ms... max 5s, 5 retries). `CoordinationClient` stub rides the same socket with message type `coordination-*` but returns empty/noop results until entity 056 provides real implementation.

**ALTERNATIVE**: Use HTTP for IPC -- the daemon already runs an HTTP server (entity 053, Next.js) so the shim could POST to `localhost:8420/api/ipc/*` endpoints. -- D-01 Rejected: HTTP adds per-request overhead (TCP handshake, headers), does not support push from daemon→shim natively (would require SSE or polling for inbound actions), and conflates the internal IPC surface with the external web UI. Unix socket provides lower latency, native bidirectional push, and clean separation between internal (socket) and external (HTTP) transports.

**GUARDRAILS**:
- Socket path: `~/.spacedock/spacebridge.sock` (design doc §4.2)
- Message framing must be documented and versioned (v1 magic byte or handshake version field)
- ChannelProvider interface consumed via direct import from `tools/dashboard/src/channel-provider.ts` (entity 050 Q-3 decision)
- Reconnect handles daemon restart gracefully -- exponential backoff, max 5 retries, then surface error to CC session via MCP error response
- Test isolation: use temp socket paths in tests (`join(tmpdir, "test.sock")`), never the production path (MEMORY.md test isolation pattern)
- No fmodel in this entity -- plain request/response messaging. fmodel CQRS arrives in entities 054/056/057

**RATIONALE**: Unix socket is the natural choice for same-machine IPC between a daemon and its client processes. It provides bidirectional communication (daemon pushes inbound actions to shim; shim pushes events to daemon), low latency (no TCP overhead, no HTTP framing), and filesystem-based access control. The 4-byte length-prefix + JSON framing is implementable in pure Bun (`Bun.listen` for server, `Bun.connect` for client) without external dependencies, and the JSON payload is debuggable with standard tools. Routing the CoordinationClient stub over the same socket avoids introducing a second transport for entity 056 and keeps the protocol extensible via message type field.

## Acceptance Criteria

- [ ] Given a running daemon socket server, when a shim connects and sends a register message with `{projectRoot, sessionId, pid}`, then the daemon acknowledges with a session token and the session appears in the daemon's internal session map (how to verify: `bun test` -- start server, connect client, assert session registered)
- [ ] Given a connected shim, when `publishEvent(event)` is called on the bridge ChannelProvider, then the event arrives at the daemon as a length-prefixed JSON message with `type: "event"` (how to verify: `bun test` -- mock daemon, call publishEvent from client, assert daemon received matching payload)
- [ ] Given a daemon that the shim detects a connection close (EPIPE/ECONNRESET), when the daemon socket reappears, then the shim reconnects and re-registers within 5 seconds using exponential backoff (how to verify: `bun test` -- close server socket, reopen after 1s, assert client reconnected and re-registered)
- [ ] Given the IPC message framing protocol, when a message is sent, then it uses 4-byte big-endian length prefix + UTF-8 JSON with a `type` field (how to verify: `bun test` -- encode/decode round-trip, assert byte layout matches spec)
- [ ] Given the CoordinationClient stub on the same socket, when `getAvailableWork("FO")` is called, then it returns an empty array as a placeholder response (how to verify: `bun test` -- call stub, assert `[]` result)
- [ ] Given a shim that disconnects (CC session ends), when the daemon detects socket close, then it removes the session from its internal map (how to verify: `bun test` -- connect, disconnect, assert session removed)

## References

- Design doc §4.2 (Auto-fork implementation sketch): socket path and connection flow
- Design doc §5.1 (Role-aware CoordinationClient API): interface definition
- Design doc §5.3 (Bridge implementation — unix socket RPC): RPC design over unix socket
- Design doc §7.1 (PR1 — ChannelProvider interface extraction): upstream interface this implements
- tools/dashboard/src/channel-provider.ts: ChannelProvider interface (direct import target, per entity 050 Q-3)
- Entity 050 (plan): plugin skeleton + schema where this code lives
- Entity 052 (draft): daemon process that hosts the socket server
