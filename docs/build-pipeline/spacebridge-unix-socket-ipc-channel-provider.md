---
id: 051
title: "Unix socket IPC + ChannelProvider client/server"
status: plan
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-12T16:25:00Z
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-spacebridge-unix-socket-ipc-channel-provider
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
→ Confirmed: captain, 2026-04-12 (batch)

A-2: Filesystem permission is sufficient for socket auth. No application-level auth on the unix socket in v1.
Confidence: Confident (0.90)
Evidence: Design doc does not mention socket auth; unix socket access control via filesystem permissions is standard for same-machine daemon IPC (Docker, PostgreSQL, MySQL all use this pattern).
→ Confirmed: captain, 2026-04-12 (batch)

A-3: Unix socket guarantees FIFO per-connection message ordering. Cross-shim ordering handled by daemon's event sequencing (Drizzle autoincrement seq in events table).
Confidence: Confident (0.95)
Evidence: Unix stream sockets are POSIX SOCK_STREAM -- kernel guarantees in-order byte delivery per connection. Design doc §4.3 confirms daemon assigns global sequence numbers.
→ Confirmed: captain, 2026-04-12 (batch)

A-4: Message format versioned via handshake version field in the register message, not a per-message magic byte.
Confidence: Confident (0.85)
Evidence: Brainstorm GUARDRAILS specify "v1 magic byte or handshake version field"; handshake-level versioning is simpler (one check at connection start, not per message).
→ Confirmed: captain, 2026-04-12 (batch)

A-5: Use Node.js `net` module (Bun compatibility layer) for unix socket -- `net.createServer()` with `{path: '...'}` for server, `net.createConnection()` for client. Execution 第一步跑 mini-spike 驗證 Bun 環境下的 net unix socket 行為（connect, message exchange, reconnect, error events, file permissions）。
Confidence: Confident (0.85)
Evidence: Node.js net module is 10+ year stable API with complete documentation. Bun explicitly supports Node.js net compatibility. Mini-spike mitigates remaining risk before full implementation.
→ Corrected by captain, 2026-04-12 (batch): "原本 Bun native API 文件不全且影響 A-1~A-4 的穩定性。改用 Node.js net module（成熟穩定）+ execution 第一步 mini-spike 驗證。"

## Option Comparisons

### O-1: Sync-to-async bridge strategy for ChannelProvider over socket

The ChannelProvider interface defines sync methods (publishEvent returns number, createSnapshot returns Snapshot, getChannelMessagesSince returns SequencedEvent[]). But socket IPC is inherently async. channel.ts calls these synchronously at lines 399, 455, 473 (createSnapshot) and 496 (getChannelMessagesSince) with immediate use of return values. How should the bridge handle this?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Fire-and-forget writes + local cache reads | publishEvent/broadcastChannelStatus fire-and-forget (return local seq). eventBuffer backed by local cache synced via daemon push. createSnapshot delegated to daemon async but shim returns optimistic local stub | Matches sync interface; low latency for writes; reads always available from cache | createSnapshot return value may be stale/stub; local cache needs daemon→shim push channel | Medium | Recommended |
| Async ChannelProvider variant | Define new AsyncChannelProvider with Promise returns; bridge uses this; modify channel.ts to await | Clean async boundary; no staleness; no cache | Requires channel.ts refactor; breaks type contract; upstream PR surface grows | High | Viable |
| Sync blocking via SharedArrayBuffer + Atomics | True sync RPC using shared memory and Atomics.wait() | Perfect sync compatibility; no interface changes | Extremely complex; blocks CC session thread; Bun SharedArrayBuffer support uncertain for this pattern | High | Not recommended |

→ Selected: Thin shim + Daemon DB owner (captain, 2026-04-13, interactive). Shim = socket client + MCP stdio only, NO DB connection. All DB operations (createSnapshot, getChannelMessagesSince) forwarded via socket RPC to daemon. ChannelProvider interface updated to `| Promise<T>` return types; channel.ts call sites add `await` (MCP handlers already async, zero-cost change). This also enables future cloud deployment: shim→daemon transport switches from unix socket to TCP/WS without architecture change. Captain arrived at this via 3 rounds of analysis: (1) fire-and-forget rejected because snap.version needs real DB autoincrement, (2) shim-direct-DB rejected because it couples MCP to DB and prevents multi-machine deployment, (3) thin shim confirmed because MCP handlers are already async and interface change is minimal.

### O-2: Daemon-to-shim push mechanism for inbound actions

When external events arrive at the daemon (comments from tunnel, stage transitions from other sessions), the daemon needs to push them to the correct shim. How?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Bidirectional messaging on same socket | Daemon writes to the shim's connected socket directly. Same connection, same framing. Message type field distinguishes request/response/push | Single connection; simple; leverages existing framing | Must handle message interleaving (shim sends request while daemon pushes event simultaneously) | Low | Recommended |
| Separate push socket per shim | Shim opens second connection for daemon→shim push (like Redis pub/sub pattern) | Clean separation of request/response and push channels | Double the connections; double the reconnect logic; more complex session map | Medium | Not recommended |

→ Selected: Bidirectional messaging on same socket (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How should snapshotStore.createSnapshot handle the sync→async gap when it needs a daemon round-trip but has a sync return type?

Domain: Behavioral/Callable

Why it matters: channel.ts:399 calls `dashboard.snapshotStore.createSnapshot({...})` synchronously and uses the returned snapshot object (with `id`, `version`, `body`, etc.) in the same handler. If the bridge impl sends to daemon async, it cannot return a real snapshot synchronously. This affects whether the ChannelProvider interface needs modification or the bridge can use an optimistic local pattern.

Suggested options: (a) Return an optimistic local stub with `id: -1, version: -1` and let daemon assign real values -- caller only needs the snapshot for logging, not for critical logic, (b) Modify ChannelProvider interface to make createSnapshot async (Promise return) -- requires upstream channel.ts changes, (c) Keep snapshot creation local in the shim process (shim has its own Drizzle DB connection to the shared spacebridge.db) -- daemon doesn't need to be involved for snapshots

→ Answer: (b) Modify ChannelProvider interface to support async returns (`T | Promise<T>`). Resolved by O-1 decision: thin shim + daemon DB owner means ALL DB operations go through socket RPC. MCP handlers are already async, so adding `await` at call sites is zero-cost. Option (a) rejected because snap.version is used for autoResolveComments (line 413) -- needs real value. Option (c) rejected by captain: couples shim to DB, prevents multi-machine/cloud deployment. (captain, 2026-04-13, interactive)

## Canonical References

- tools/dashboard/src/channel.ts:399,455,473 -- createSnapshot sync call sites (snap.version used by autoResolveComments line 413)
- tools/dashboard/src/channel.ts:496 -- getChannelMessagesSince sync call site (return value mapped immediately)
- tools/dashboard/src/channel-provider.ts:32-50 -- ChannelProvider interface (6 members, will be extended with `| Promise<T>` returns)
- tools/dashboard/src/channel-provider.test.ts:50-71 -- mock ChannelProvider pattern (reference for bridge impl mock)

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

## Research Findings

### Upstream Constraints

- **CONTRACTS.md**: Entity 050 (`spacebridge-plugin-skeleton-drizzle-schema`) owns all `spacebridge/src/*` files at `planned` status. No other entity has active contracts on any file this entity will create or modify. `tools/dashboard/src/channel-provider.ts` has no active contract from any entity -- safe to modify.
- **CLAUDE.md**: Test isolation requires explicit temp paths for SQLite (`join(TMP, "test.db")`), never production `~/.spacedock/spacebridge.db`. Same principle extends to socket paths -- use `join(tmpdir, "test.sock")` in tests.
- **Design doc §4.2**: Socket path is `~/.spacedock/spacebridge.sock`. Auto-fork (entity 052) handles daemon startup; this entity only implements the socket server/client and reconnect on transient failures.
- **Design doc §3.3**: LCD schema discipline (integer epoch-ms timestamps, text strings, no RETURNING) applies to any new Drizzle schema additions.
- **Entity 050 Q-3 decision**: spacebridge/ can directly import types from `tools/dashboard/src/channel-provider.ts` (same repo).

### Existing Patterns

- **Length-prefixed framing**: No existing implementation in the codebase. This is a new pattern. The standard approach for Node.js stream-based framing: accumulate incoming `data` chunks in a Buffer, loop extracting messages when buffer >= 4 (header) + N (payload) bytes, parse JSON payload.
- **ChannelProvider injection**: `tools/dashboard/src/channel.ts:125` -- `const dashboard: ChannelProvider = opts.provider ?? createServer({...})`. The `provider` option on `ChannelServerOptions` (line 60) is the injection seam. Bridge shim will pass its socket-backed ChannelProvider via this option.
- **Mock ChannelProvider pattern**: `tools/dashboard/src/channel-provider.test.ts:50-71` -- defines a mock with all 6 members (publishEvent, broadcastChannelStatus, eventBuffer.getChannelMessagesSince, snapshotStore.createSnapshot, port, stop). Reference for bridge ChannelProvider implementation.
- **Spacebridge DB pattern**: `spacebridge/src/db.ts` -- `createDb(dbPath?)` factory with `bun:sqlite`, WAL mode for file DBs, `applySchema()` for inline table creation. Tests use `:memory:` or explicit temp paths.
- **Spacebridge sessions table**: `spacebridge/src/schema.ts:11-23` -- `sessions` table with sessionId, projectRoot, pid, connectedAt, lastHeartbeat, plus fmodel-compatible columns. Already matches the session registry design.

### Library/API Surface

- **Node.js `net` module in Bun**: Verified working via inline spike. `net.createServer({path})` and `net.createConnection({path})` both function correctly in Bun runtime. Error codes: non-existent socket → `ENOENT`; server destroys connection → client receives `end` + `close` events (no `ECONNRESET` for graceful destroy). The `data` event delivers raw `Buffer` chunks. Socket file cleanup requires manual `unlinkSync` before `server.listen()` (stale socket from crashed daemon).
- **Buffer API**: `Buffer.alloc(4)`, `buf.writeUInt32BE(length, 0)`, `buf.readUInt32BE(0)` -- all standard Node.js Buffer methods, available in Bun.
- **net.Socket events**: `connect`, `data`, `end`, `close`, `error`. The `error` event fires before `close` when connection fails. On graceful server shutdown, only `end` + `close` fire (no error).

### Known Gotchas

- **Stale socket file**: If daemon crashes without cleanup, `~/.spacedock/spacebridge.sock` persists. `net.createServer().listen(path)` will fail with `EADDRINUSE`. Solution: check for stale socket by attempting `connect()` first; if `ECONNREFUSED`, unlink and retry listen. Entity 052 (daemon lifecycle) handles this; this entity's server code should attempt unlink-and-retry on `EADDRINUSE`.
- **Partial reads on `data` event**: TCP/unix stream sockets provide a byte stream, not message boundaries. A single `data` event may contain a partial message, a complete message, or multiple messages concatenated. The framing codec must handle all three cases via a read buffer.
- **ChannelProvider sync call sites use return values**: `channel.ts:399` uses `snap.version` for `autoResolveComments` (line 413). `channel.ts:496` uses the returned array immediately for mapping. The `| Promise<T>` change requires adding `await` at these 4 call sites. All 4 are inside `async` handlers (MCP `setRequestHandler`), so `await` is zero-cost.
- **Test socket cleanup**: Unix socket files in `/tmp/` persist after test process exit unless explicitly cleaned up. Tests must use `afterAll`/`afterEach` hooks to unlink socket files to avoid `EADDRINUSE` on subsequent runs.

### Reference Examples

- **CoordinationClient interface** (design doc §5.1): 4 methods -- `getAvailableWork(role): Promise<EntityRef[]>`, `acquireEntity(slug, role, sessionId): Promise<LeaseToken>`, `releaseEntity(token, outcome): Promise<void>`, `extendLease(token): Promise<void>`. The stub implementation (§5.2) returns empty arrays and noops.
- **Design doc §5.3 bridge implementation**: Shows unix socket RPC pattern where shim serializes interface calls as JSON messages over socket, daemon executes against authoritative DB, returns result. Same pattern applies to ChannelProvider bridge.
- **Message type taxonomy from brainstorm**: `event`, `action`, `handshake`, `heartbeat`, `rpc-request`, `rpc-response`, `coordination-*`. Register message carries `{projectRoot, sessionId, pid}`.

## PLAN

### Goal

Implement unix socket IPC layer between spacebridge shim and daemon with length-prefixed JSON framing, ChannelProvider bridge, CoordinationClient stub, reconnect logic, and comprehensive tests. Wave 0 validates Node.js net module in Bun.

<task id="task-0" model="sonnet" wave="0" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/db.ts
    - spacebridge/src/schema.ts
    - tools/dashboard/src/channel-provider.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/framing.ts` and `spacebridge/src/ipc/framing.test.ts`.

  The framing codec implements 4-byte big-endian length prefix + UTF-8 JSON encoding/decoding:

  `encodeMessage(msg: object): Buffer` -- allocates 4-byte header + JSON payload buffer, writes payload length as UInt32BE at offset 0, writes UTF-8 JSON payload at offset 4, returns the concatenated buffer.

  `createFrameDecoder(onMessage: (msg: unknown) => void): (chunk: Buffer) => void` -- returns a closure that accumulates incoming chunks in an internal buffer, loops extracting complete messages (read 4-byte length, check buffer has >= 4 + length bytes, slice payload, parse JSON, call onMessage), keeps remainder for next chunk. Handles partial headers, partial payloads, and multiple messages per chunk.

  Test file covers: single message encode/decode round-trip, multiple messages in one chunk, partial message across two chunks, partial header split, empty payload `{}`, large payload (100KB), and invalid JSON (should throw or call error handler).
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/framing.test.ts` passes
    - `grep "encodeMessage" spacebridge/src/ipc/framing.ts` finds the export
    - `grep "createFrameDecoder" spacebridge/src/ipc/framing.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/framing.ts
    - spacebridge/src/ipc/framing.test.ts
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="0" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - tools/dashboard/src/channel-provider.ts
    - tools/dashboard/src/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/types.ts` -- shared IPC message type definitions.

  Define the message envelope type:

  ```typescript
  export interface IpcMessage {
    id: string;        // UUID for request/response correlation
    type: string;      // message type discriminator
    payload: unknown;  // type-specific payload
  }
  ```

  Define specific message types as discriminated union:

  ```typescript
  export type IpcRequestType =
    | 'register'           // shim → daemon: session registration
    | 'heartbeat'          // shim → daemon: keepalive
    | 'rpc-request'        // shim → daemon: ChannelProvider method call
    | 'coordination-request'; // shim → daemon: CoordinationClient method call

  export type IpcResponseType =
    | 'register-ack'       // daemon → shim: registration acknowledged
    | 'heartbeat-ack'      // daemon → shim: keepalive ack
    | 'rpc-response'       // daemon → shim: method return value
    | 'coordination-response'; // daemon → shim: coordination return value

  export type IpcPushType =
    | 'event-push'         // daemon → shim: inbound event (bidirectional)
    | 'action-push';       // daemon → shim: inbound action

  export interface RegisterPayload {
    projectRoot: string;
    sessionId: string;
    pid: number;
    protocolVersion: 1;
  }

  export interface RegisterAckPayload {
    sessionToken: string;
    serverVersion: string;
  }

  export interface RpcRequestPayload {
    method: string;   // ChannelProvider method name
    args: unknown[];  // method arguments
  }

  export interface RpcResponsePayload {
    result?: unknown;
    error?: string;
  }

  export interface CoordinationRequestPayload {
    method: string;   // CoordinationClient method name
    args: unknown[];
  }

  export interface CoordinationResponsePayload {
    result?: unknown;
    error?: string;
  }
  ```

  Create `spacebridge/src/ipc/types.test.ts` with type-level tests using TypeScript `satisfies` to verify type assignability and basic runtime assertions on type guard helpers.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/types.test.ts` passes
    - `grep "IpcMessage" spacebridge/src/ipc/types.ts` finds the export
    - `grep "RegisterPayload" spacebridge/src/ipc/types.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/ipc/types.test.ts
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/ipc/framing.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/schema.ts
    - spacebridge/src/db.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/socket-server.ts` and `spacebridge/src/ipc/socket-server.test.ts`.

  The socket server wraps `net.createServer()` for the daemon side:

  ```typescript
  export interface SocketServerOptions {
    socketPath: string;
    onRegister: (session: RegisterPayload, send: (msg: IpcMessage) => void) => RegisterAckPayload;
    onRpcRequest: (sessionId: string, req: RpcRequestPayload) => Promise<RpcResponsePayload>;
    onCoordinationRequest: (sessionId: string, req: CoordinationRequestPayload) => Promise<CoordinationResponsePayload>;
    onDisconnect: (sessionId: string) => void;
  }

  export interface SocketServer {
    listen(): Promise<void>;
    close(): Promise<void>;
    pushToSession(sessionId: string, msg: IpcMessage): boolean;
    pushToAll(msg: IpcMessage): void;
    getConnectedSessions(): string[];
  }

  export function createSocketServer(opts: SocketServerOptions): SocketServer;
  ```

  Implementation:
  - Uses `net.createServer()` with `{path: opts.socketPath}`
  - Maintains `Map<string, net.Socket>` for session→socket mapping (keyed by sessionId from register message)
  - On new connection: wraps socket with `createFrameDecoder`, routes messages by type
  - On `register`: calls `onRegister`, stores socket in map, sends ack
  - On `rpc-request`: calls `onRpcRequest`, sends `rpc-response` with matching `id`
  - On `coordination-request`: calls `onCoordinationRequest`, sends `coordination-response`
  - On socket `close`/`error`: calls `onDisconnect`, removes from map
  - Before `listen()`: attempts `unlinkSync(socketPath)` for stale socket cleanup, wrapped in try/catch
  - `pushToSession`: writes encoded message to specific session's socket, returns false if not connected
  - `pushToAll`: iterates all connected sockets, writes encoded message to each

  Tests use temp socket paths (`join(tmpdir(), "test-server-" + randomUUID() + ".sock")`). Test cases:
  - Server listens and accepts connection
  - Register message → ack response
  - RPC request → response round-trip
  - Client disconnect → onDisconnect callback
  - pushToSession delivers message to correct client
  - pushToAll delivers to all connected clients
  - Stale socket file cleaned up on listen
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/socket-server.test.ts` passes
    - `grep "createSocketServer" spacebridge/src/ipc/socket-server.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-server.test.ts
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="1" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/ipc/framing.ts
    - spacebridge/src/ipc/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/socket-client.ts` and `spacebridge/src/ipc/socket-client.test.ts`.

  The socket client wraps `net.createConnection()` for the shim side:

  ```typescript
  export interface SocketClientOptions {
    socketPath: string;
    sessionId: string;
    projectRoot: string;
    pid: number;
    onPush?: (msg: IpcMessage) => void;       // daemon→shim push messages
    reconnect?: {
      initialDelayMs?: number;   // default 100
      maxDelayMs?: number;       // default 5000
      maxRetries?: number;       // default 5
    };
  }

  export interface SocketClient {
    connect(): Promise<RegisterAckPayload>;
    request(msg: IpcMessage): Promise<IpcMessage>;  // send + await correlated response
    close(): void;
    readonly connected: boolean;
  }

  export function createSocketClient(opts: SocketClientOptions): SocketClient;
  ```

  Implementation:
  - `connect()`: creates `net.createConnection({path})`, sets up frame decoder, sends `register` message, waits for `register-ack`, resolves with ack payload
  - `request(msg)`: sends encoded message, stores `{id, resolve, reject, timer}` in pending map, returns Promise. On response with matching `id`, resolves and clears timer. Timer rejects after 30s with timeout error.
  - Push messages (no matching pending request): forwarded to `onPush` callback
  - Socket `error`/`close` events: if `reconnect` options provided, trigger exponential backoff reconnect. Backoff: `min(initialDelay * 2^attempt, maxDelay)` with jitter (random 0-50ms). On reconnect, re-sends `register`. After `maxRetries` failures, emit error (reject any pending requests).
  - `close()`: destroys socket, clears all pending requests, disables reconnect

  Tests use temp socket paths, spin up a minimal `net.createServer` as test fixture:
  - Connect + register → receive ack
  - Request/response correlation (send request, get matching response)
  - Multiple concurrent requests resolve independently
  - Push message delivered to onPush callback
  - Reconnect on server restart (close server, wait, reopen, assert client reconnected)
  - Max retries exceeded → error
  - close() cancels pending requests
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/socket-client.test.ts` passes
    - `grep "createSocketClient" spacebridge/src/ipc/socket-client.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/socket-client.test.ts
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - tools/dashboard/src/channel-provider.ts
    - tools/dashboard/src/channel-provider.test.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/channel-provider-bridge.ts` and `spacebridge/src/ipc/channel-provider-bridge.test.ts`.

  This implements `ChannelProvider` by forwarding all calls to the daemon via socket RPC:

  ```typescript
  import type { ChannelProvider } from "../../../tools/dashboard/src/channel-provider";

  export interface ChannelProviderBridgeOptions {
    client: SocketClient;
  }

  export function createChannelProviderBridge(opts: ChannelProviderBridgeOptions): ChannelProvider;
  ```

  Implementation -- each ChannelProvider method sends an `rpc-request` with the method name and args, awaits the `rpc-response`:

  - `publishEvent(event)`: sends `{type: "rpc-request", payload: {method: "publishEvent", args: [event]}}`, returns `await client.request(...)` → extract result as number (sequence number)
  - `broadcastChannelStatus(connected)`: sends RPC, fire-and-forget (returns void/Promise<void>)
  - `eventBuffer.getChannelMessagesSince(afterSeq, entity?)`: sends RPC, returns result as SequencedEvent[]
  - `snapshotStore.createSnapshot(input)`: sends RPC, returns result as EntitySnapshot
  - `port`: returns `undefined` (bridge has no local HTTP port)
  - `stop()`: calls `client.close()`

  Note: The return types become `Promise<T>` instead of `T`. This is enabled by the ChannelProvider interface change (task-6) that adds `| Promise<T>` to return types.

  Tests mock the SocketClient (inject a fake that captures sent messages and returns canned responses):
  - publishEvent sends correct RPC and returns sequence number
  - createSnapshot sends correct RPC and returns EntitySnapshot
  - getChannelMessagesSince sends correct RPC and returns events
  - broadcastChannelStatus sends fire-and-forget RPC
  - stop() calls client.close()
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/channel-provider-bridge.test.ts` passes
    - `grep "createChannelProviderBridge" spacebridge/src/ipc/channel-provider-bridge.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/channel-provider-bridge.ts
    - spacebridge/src/ipc/channel-provider-bridge.test.ts
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="2" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/coordination-client-stub.ts` and `spacebridge/src/ipc/coordination-client-stub.test.ts`.

  The CoordinationClient stub rides the same socket as ChannelProvider but uses `coordination-request`/`coordination-response` message types. For this entity, all methods return noop/empty results. Real implementation arrives in entity 056.

  ```typescript
  export type Role = 'SO' | 'FO' | 'QO';

  export interface EntityRef {
    slug: string;
    workflow_dir: string;
    current_stage: string;
    status: string;
  }

  export interface LeaseToken {
    session_id: string;
    entity_slug: string;
    role: Role;
    acquired_at: number;
    expires_at: number;
    token: string;
  }

  export interface CoordinationClient {
    getAvailableWork(role: Role): Promise<EntityRef[]>;
    acquireEntity(slug: string, role: Role, sessionId: string): Promise<LeaseToken>;
    releaseEntity(token: LeaseToken, outcome: 'done' | 'abort'): Promise<void>;
    extendLease(token: LeaseToken): Promise<void>;
  }

  export function createCoordinationClientStub(): CoordinationClient;
  ```

  Stub implementation:
  - `getAvailableWork()`: returns `[]`
  - `acquireEntity()`: returns a dummy LeaseToken with the provided args and `token: "stub-" + randomUUID()`
  - `releaseEntity()`: noop (returns void)
  - `extendLease()`: noop (returns void)

  Tests verify all 4 methods return expected stub values and do not throw.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/coordination-client-stub.test.ts` passes
    - `grep "createCoordinationClientStub" spacebridge/src/ipc/coordination-client-stub.ts` finds the export
    - `grep "CoordinationClient" spacebridge/src/ipc/coordination-client-stub.ts` finds the interface
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/coordination-client-stub.ts
    - spacebridge/src/ipc/coordination-client-stub.test.ts
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="2">
  <read_first>
    - tools/dashboard/src/channel-provider.ts
    - tools/dashboard/src/channel-provider.test.ts
    - tools/dashboard/src/channel.ts
  </read_first>

  <action>
  Modify `tools/dashboard/src/channel-provider.ts` to support async returns.

  Update the ChannelProvider interface so each method that previously returned `T` now returns `T | Promise<T>`:

  ```typescript
  export interface ChannelProvider {
    publishEvent(event: AgentEvent): number | Promise<number>;
    broadcastChannelStatus(connected: boolean): void | Promise<void>;
    readonly eventBuffer: Pick<EventBuffer, "getChannelMessagesSince"> | {
      getChannelMessagesSince(afterSeq: number, entity?: string): SequencedEvent[] | Promise<SequencedEvent[]>;
    };
    readonly snapshotStore: Pick<SnapshotStore, "createSnapshot"> | {
      createSnapshot(input: CreateSnapshotInput): EntitySnapshot | Promise<EntitySnapshot>;
    };
    readonly port: number | undefined;
    stop(): void | Promise<void>;
  }
  ```

  Then update the 4 sync call sites in `tools/dashboard/src/channel.ts` to add `await`:
  - Line 399: `const snap = await dashboard.snapshotStore.createSnapshot({...})`
  - Line 455: `const snap = await dashboard.snapshotStore.createSnapshot({...})`
  - Line 473: `const snap = await dashboard.snapshotStore.createSnapshot({...})`
  - Line 496: `const messages = await dashboard.eventBuffer.getChannelMessagesSince(sinceSeq, entity)`

  Also add `await` to `dashboard.publishEvent(...)` calls at lines 415, 466, 484 (these are inside async handlers, adding await is zero-cost and future-proofs for async providers).

  Update `tools/dashboard/src/channel-provider.test.ts` mock to verify it still satisfies the updated interface (existing sync returns remain valid because `T` is assignable to `T | Promise<T>`).
  </action>

  <acceptance_criteria>
    - `bun test tools/dashboard/src/channel-provider.test.ts` passes
    - `bun test tools/dashboard/src/` passes (all existing dashboard tests still pass)
    - `grep "Promise" tools/dashboard/src/channel-provider.ts` finds the async return types
  </acceptance_criteria>

  <files_modified>
    - tools/dashboard/src/channel-provider.ts
    - tools/dashboard/src/channel.ts
    - tools/dashboard/src/channel-provider.test.ts
  </files_modified>
</task>

<task id="task-7" model="sonnet" wave="3" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/channel-provider-bridge.ts
    - spacebridge/src/ipc/coordination-client-stub.ts
    - spacebridge/src/ipc/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/integration.test.ts` -- end-to-end integration test that wires server + client + bridge together.

  Test scenario:
  1. Start a socket server with in-memory handlers (onRpcRequest dispatches to a mock ChannelProvider, onCoordinationRequest returns stub responses)
  2. Create a socket client, connect to the server
  3. Create a ChannelProviderBridge wrapping the client
  4. Call `bridge.publishEvent(event)` → assert server received the RPC and returned a sequence number
  5. Call `bridge.snapshotStore.createSnapshot(input)` → assert server received the RPC and returned a snapshot
  6. Call `bridge.eventBuffer.getChannelMessagesSince(0)` → assert server returned events
  7. Create a CoordinationClient stub, call `getAvailableWork("FO")` → assert returns `[]`
  8. Disconnect client → assert server's onDisconnect fired
  9. Restart server on same socket path → assert client reconnects and re-registers

  All tests use a unique temp socket path per test case.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/ipc/integration.test.ts` passes
    - Integration test covers full register → RPC → disconnect → reconnect cycle
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/integration.test.ts
  </files_modified>
</task>

<task id="task-8" model="sonnet" wave="3">
  <read_first>
    - spacebridge/src/ipc/framing.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/channel-provider-bridge.ts
    - spacebridge/src/ipc/coordination-client-stub.ts
  </read_first>

  <action>
  Create `spacebridge/src/ipc/index.ts` -- barrel export for the IPC module.

  Re-exports all public types and factory functions:
  - From `framing.ts`: `encodeMessage`, `createFrameDecoder`
  - From `types.ts`: all type/interface exports
  - From `socket-server.ts`: `createSocketServer`, `SocketServer`, `SocketServerOptions`
  - From `socket-client.ts`: `createSocketClient`, `SocketClient`, `SocketClientOptions`
  - From `channel-provider-bridge.ts`: `createChannelProviderBridge`
  - From `coordination-client-stub.ts`: `createCoordinationClientStub`, `CoordinationClient`, `Role`, `EntityRef`, `LeaseToken`
  </action>

  <acceptance_criteria>
    - `bun build spacebridge/src/ipc/index.ts --no-bundle --outdir /tmp/ipc-check` succeeds with exit code 0
    - `grep "export" spacebridge/src/ipc/index.ts | wc -l` shows at least 6 re-export lines
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/ipc/index.ts
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `bun test spacebridge/src/ipc/` -- all IPC tests pass (framing, types, socket-server, socket-client, channel-provider-bridge, coordination-client-stub, integration)
- [ ] `bun test tools/dashboard/src/` -- all existing dashboard tests still pass after ChannelProvider async change
- [ ] `bun test` from repo root -- full test suite passes (no regressions)
- [ ] `bun build spacebridge/src/ipc/index.ts --no-bundle --outdir /tmp/ipc-check` -- barrel export compiles cleanly

### API
None

### Interactive
None

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 Session registration (register → ack → session map) | task-2, task-7 | `bun test spacebridge/src/ipc/socket-server.test.ts` | pending | -- |
| AC-2 publishEvent bridge (event arrives at daemon via length-prefixed JSON) | task-4, task-7 | `bun test spacebridge/src/ipc/channel-provider-bridge.test.ts` | pending | -- |
| AC-3 Reconnect with exponential backoff on daemon restart | task-3, task-7 | `bun test spacebridge/src/ipc/socket-client.test.ts` | pending | -- |
| AC-4 Message framing (4-byte BE length + UTF-8 JSON + type field) | task-0 | `bun test spacebridge/src/ipc/framing.test.ts` | pending | -- |
| AC-5 CoordinationClient stub (getAvailableWork returns empty array) | task-5 | `bun test spacebridge/src/ipc/coordination-client-stub.test.ts` | pending | -- |
| AC-6 Session cleanup on disconnect | task-2, task-7 | `bun test spacebridge/src/ipc/socket-server.test.ts` | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 17 append entries, covering 9 tasks and 17 files, all successful

### Dispatch Gaps
Research was performed inline (no pre-populated ## Research Findings from dispatched researchers). All 5 topics covered via inline Read/Grep/Bash within plan ensign context. Node.js net module mini-spike executed inline (A-5 validation).

### Plan-checker final output
```yaml
issues: []
```

### Plan summary
9 tasks across 4 waves:
- Wave 0 (task-0, task-1): Framing codec + IPC type definitions
- Wave 1 (task-2, task-3): Socket server (daemon) + socket client (shim) with reconnect
- Wave 2 (task-4, task-5, task-6): ChannelProvider bridge, CoordinationClient stub, ChannelProvider async interface change
- Wave 3 (task-7, task-8): Integration test + barrel export

### Commits
- 37db46a chore(index): add contracts for entity-spacebridge-unix-socket-ipc-channel-provider entering plan (17 files)
- 91c09af chore(plan): spacebridge-unix-socket-ipc-channel-provider unix socket IPC layer

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (1 corrected)
  A-1 through A-4 confirmed batch; A-5 corrected: Bun native API → Node.js net module + mini-spike (captain flagged underdocumented API risk propagating to A-1~A-4)
- [x] Options selected: 2 / 2
  O-1 Thin shim + Daemon DB owner (3 rounds: fire-and-forget rejected → shim-DB rejected → thin shim confirmed via code flow analysis + cloud deployment foresight); O-2 Bidirectional messaging on same socket
- [x] Questions answered: 1 / 1 (0 deferred)
  Q-1 resolved by O-1 decision: ChannelProvider interface gets `| Promise<T>` returns, channel.ts adds await (MCP handlers already async)
- [x] Canonical refs added: 4
  channel.ts:399,455,473,496 (sync call sites); channel-provider.ts:32-50 (interface); channel-provider.test.ts:50-71 (mock pattern)
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say "execute 051" or launch FO in separate session
- [x] Clarify duration: 6 questions asked, session complete
  1 batch assumption + 3 rounds O-1 (deepest clarify in this session) + 1 O-2 + 1 Q-1 auto-resolved
