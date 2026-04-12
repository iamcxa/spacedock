---
id: 051
title: "Unix socket IPC + ChannelProvider client/server"
status: draft
context_status: awaiting-clarify
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

**APPROACH**: Implement a length-prefixed JSON-over-unix-socket IPC layer with two sides. **Server side** (in daemon process, entity 052): listens on `~/.spacedock/spacebridge.sock` (✓ confirmed by explore: Bun supports `Bun.listen({unix: path})` natively), accepts connections from shims, maintains a session→socket map for routing inbound actions to the correct shim. **Client side** (in MCP shim, spawned per CC session): connects to the socket, implements the `ChannelProvider` interface by serializing each method call (`publishEvent`, `broadcastChannelStatus`, `eventBuffer.getChannelMessagesSince`, `snapshotStore.createSnapshot`) as a JSON-RPC message and sending it over the socket (⚠ contradicted: channel.ts:399,455,496 call createSnapshot/getChannelMessagesSince synchronously and use return values immediately -- pure async RPC breaks the sync interface contract -- see O-1). The framing protocol uses a 4-byte big-endian length prefix + UTF-8 JSON payload -- simple, debuggable with `socat`, no external dependency. Each message carries a `type` field for routing (event, action, handshake, heartbeat, rpc-request, rpc-response). Connection lifecycle: shim connects → sends `register` with `{projectRoot, sessionId, pid}` → daemon acknowledges with session token → bidirectional messaging begins. On daemon restart: shim detects EPIPE/ECONNRESET → reconnects with exponential backoff (100ms, 200ms, 400ms... max 5s, 5 retries). `CoordinationClient` stub rides the same socket with message type `coordination-*` but returns empty/noop results until entity 056 provides real implementation.

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

## Assumptions

A-1: Daemon is already running when shim connects. Entity 052 handles auto-fork startup; this entity only handles reconnect on transient mid-session failures.
Confidence: Confident (0.85)
Evidence: Design doc §4.2 -- auto-fork sequence ensures daemon is up before shim's connect() call; shim startup is: check socket → (auto-fork if absent) → connect.

A-2: Filesystem permission is sufficient for socket auth. No application-level auth on the unix socket in v1.
Confidence: Confident (0.90)
Evidence: Design doc does not mention socket auth; unix socket access control via filesystem permissions is standard for same-machine daemon IPC (Docker, PostgreSQL, MySQL all use this pattern).

A-3: Unix socket guarantees FIFO per-connection message ordering. Cross-shim ordering handled by daemon's event sequencing (Drizzle autoincrement seq in events table).
Confidence: Confident (0.95)
Evidence: Unix stream sockets are POSIX SOCK_STREAM -- kernel guarantees in-order byte delivery per connection. Design doc §4.3 confirms daemon assigns global sequence numbers.

A-4: Message format versioned via handshake version field in the register message, not a per-message magic byte.
Confidence: Confident (0.85)
Evidence: Brainstorm GUARDRAILS specify "v1 magic byte or handshake version field"; handshake-level versioning is simpler (one check at connection start, not per message).

A-5: Use Bun native unix socket API -- `Bun.listen({unix: path})` for server, `Bun.connect({unix: path})` for client.
Confidence: Likely (0.70)
Evidence: Bun docs confirm unix socket support in listen/connect. No existing usage in spacedock codebase to reference; confidence reduced because Bun unix socket error handling edge cases are undocumented.

## Option Comparisons

### O-1: Sync-to-async bridge strategy for ChannelProvider over socket

The ChannelProvider interface defines sync methods (publishEvent returns number, createSnapshot returns Snapshot, getChannelMessagesSince returns SequencedEvent[]). But socket IPC is inherently async. channel.ts calls these synchronously at lines 399, 455, 473 (createSnapshot) and 496 (getChannelMessagesSince) with immediate use of return values. How should the bridge handle this?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Fire-and-forget writes + local cache reads | publishEvent/broadcastChannelStatus fire-and-forget (return local seq). eventBuffer backed by local cache synced via daemon push. createSnapshot delegated to daemon async but shim returns optimistic local stub | Matches sync interface; low latency for writes; reads always available from cache | createSnapshot return value may be stale/stub; local cache needs daemon→shim push channel | Medium | Recommended |
| Async ChannelProvider variant | Define new AsyncChannelProvider with Promise returns; bridge uses this; modify channel.ts to await | Clean async boundary; no staleness; no cache | Requires channel.ts refactor; breaks type contract; upstream PR surface grows | High | Viable |
| Sync blocking via SharedArrayBuffer + Atomics | True sync RPC using shared memory and Atomics.wait() | Perfect sync compatibility; no interface changes | Extremely complex; blocks CC session thread; Bun SharedArrayBuffer support uncertain for this pattern | High | Not recommended |

### O-2: Daemon-to-shim push mechanism for inbound actions

When external events arrive at the daemon (comments from tunnel, stage transitions from other sessions), the daemon needs to push them to the correct shim. How?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Bidirectional messaging on same socket | Daemon writes to the shim's connected socket directly. Same connection, same framing. Message type field distinguishes request/response/push | Single connection; simple; leverages existing framing | Must handle message interleaving (shim sends request while daemon pushes event simultaneously) | Low | Recommended |
| Separate push socket per shim | Shim opens second connection for daemon→shim push (like Redis pub/sub pattern) | Clean separation of request/response and push channels | Double the connections; double the reconnect logic; more complex session map | Medium | Not recommended |

## Open Questions

Q-1: How should snapshotStore.createSnapshot handle the sync→async gap when it needs a daemon round-trip but has a sync return type?

Domain: Behavioral/Callable

Why it matters: channel.ts:399 calls `dashboard.snapshotStore.createSnapshot({...})` synchronously and uses the returned snapshot object (with `id`, `version`, `body`, etc.) in the same handler. If the bridge impl sends to daemon async, it cannot return a real snapshot synchronously. This affects whether the ChannelProvider interface needs modification or the bridge can use an optimistic local pattern.

Suggested options: (a) Return an optimistic local stub with `id: -1, version: -1` and let daemon assign real values -- caller only needs the snapshot for logging, not for critical logic, (b) Modify ChannelProvider interface to make createSnapshot async (Promise return) -- requires upstream channel.ts changes, (c) Keep snapshot creation local in the shim process (shim has its own Drizzle DB connection to the shared spacebridge.db) -- daemon doesn't need to be involved for snapshots

## References

- Design doc §4.2 (Auto-fork implementation sketch): socket path and connection flow
- Design doc §5.1 (Role-aware CoordinationClient API): interface definition
- Design doc §5.3 (Bridge implementation — unix socket RPC): RPC design over unix socket
- Design doc §7.1 (PR1 — ChannelProvider interface extraction): upstream interface this implements
- tools/dashboard/src/channel-provider.ts: ChannelProvider interface (6 members, direct import)
- tools/dashboard/src/channel-provider.test.ts: mock ChannelProvider pattern + injection test
- tools/dashboard/src/channel.ts:125 -- createChannelServer() accepts optional provider; lines 399,455,473,496 show sync usage
- Entity 050 (plan): plugin skeleton + schema where this code lives
- Entity 052 (draft): daemon process that hosts the socket server

## Stage Report: explore

- [x] Files mapped: 7 across contract, domain, test
  contract: 2 (channel-provider.ts, types.ts), domain: 3 (channel.ts, events.ts, snapshots.ts), test: 2 (channel-provider.test.ts, db.test.ts)
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1, Unclear: 0)
  A-1 through A-4 Confident via design doc + POSIX spec; A-5 Likely (Bun unix socket underdocumented)
- [x] Options surfaced: 2
  O-1 sync-to-async bridge strategy; O-2 daemon-to-shim push mechanism
- [x] Questions generated: 1
  Q-1 createSnapshot sync-async gap (most architecturally significant gray area)
- [x] α markers resolved: 0 / 0
  no α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  7 reference files mapped; new code estimated at 8-12 files (socket server, socket client, ChannelProvider bridge, CoordinationClient stub, framing codec, message types, tests)
