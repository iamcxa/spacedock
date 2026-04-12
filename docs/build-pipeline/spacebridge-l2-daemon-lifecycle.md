---
id: 052
title: "L2 auto-fork daemon lifecycle"
status: clarify
context_status: ready
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

## Directive

> Implement the L2 auto-fork daemon lifecycle for spacebridge. The first shim to start checks for an existing daemon socket; if absent, it forks a detached daemon process, waits for the socket, then connects. A lock file prevents two simultaneous shims from both forking daemons. Includes daemon shutdown policy (last shim disconnect vs sticky) and `spacebridge start/stop/status` CLI subcommands. Entity 051 provides the unix socket IPC layer; this entity manages the daemon process lifecycle around it.

## Captain Context Snapshot

- **Repo**: main @ 49562b7
- **Session**: SO pipeline session. Entity 050 (plugin skeleton) in review, entity 051 (unix socket IPC) clarified and ready for FO. Continuing Tier 1 chain: 050→051→052→053.
- **Domain**: Runnable/Invokable, Behavioral/Callable, Organizational/Data-transforming
- **Related entities**: 051 -- Unix socket IPC + ChannelProvider client/server (clarify/ready), 050 -- Spacebridge plugin skeleton + Drizzle LCD schema (plan/review), 053 -- Next.js warroom SSE feed (draft, depends on 052)
- **Created**: 2026-04-13T08:30:00+08:00

## Brainstorming Spec

**APPROACH**: Implement the L2 auto-fork daemon lifecycle in two parts: **shim-side auto-fork** and **daemon-side entry/CLI**. The shim startup sequence (in `spacebridge/src/shim.ts` or similar) follows the design doc §4.2 pseudocode exactly (✓ confirmed by explore: design doc lines 288-318 match): attempt `connect(~/.spacedock/spacebridge.sock)` → on ECONNREFUSED/ENOENT, acquire lock at `~/.spacedock/spacebridge.lock` (⚠ design doc says "flock" but Node.js has no native flock -- see O-1) → re-check socket under lock → if still absent, `spawn()` the daemon as detached (`stdio: 'ignore'`, `.unref()`) (✓ confirmed by explore: design doc lines 305-308) → `wait_for_socket(path, timeout: 5s)` with polling → release lock → connect. The daemon invocation is resolved at runtime: if `SPACEBRIDGE_DEV=1`, use `['bun', 'spacebridge/bin/daemon.ts', 'start']`; otherwise `['spacebridge', 'start']` where `spacebridge` is a wrapper CLI script (✓ confirmed by explore: entity 059 + design doc §3.2 ruled out bun --compile; distribution is standalone dir + wrapper). The daemon entry point (`spacebridge/bin/daemon.ts`) parses `start|stop|status` subcommands (✓ confirmed by explore: design doc §4.2 lines 301-302 -- daemon.ts is the internal entry; entity 059 wraps it with user-facing CLI -- see A-2). `start` boots the unix socket server (from entity 051), writes a PID file at `~/.spacedock/spacebridge.pid`, and enters the event loop. `stop` reads the PID file and sends SIGTERM. `status` reads PID file + queries socket for connected session count and uptime. Shutdown policy: daemon runs sticky by default (survives last shim disconnect) (✓ confirmed by explore: design doc §4.1 line 274), stoppable via `spacebridge stop` or SIGTERM. An optional `SPACEBRIDGE_AUTO_STOP=1` env var enables auto-stop-on-last-disconnect for CI/testing. `SPACEBRIDGE_NO_AUTOFORK=1` disables shim auto-fork entirely (for development where daemon is started manually) (✓ confirmed by explore: design doc §4.1 "Debuggable: shim's auto-fork can be disabled via env var").

**ALTERNATIVE**: Use launchd/systemd user agent (L3 model) -- daemon auto-starts on user login via a plist/service file, always-available without any CC session. -- D-01 Rejected: adds platform-specific install complexity (plist for macOS, systemd for Linux, nothing for Windows), introduces an onboarding step ("install the service"), and violates the "zero-token UI, zero onboarding" principle. L2 auto-fork achieves the same UX with no install step. Design doc §4.1 explicitly chose L2 over L3 for these reasons. Migration path to L3 is purely an install-script change if needed later.

**GUARDRAILS**:
- Socket path: `~/.spacedock/spacebridge.sock` (design doc §4.2, inherited from entity 051)
- Lock file: `~/.spacedock/spacebridge.lock` using `flock` (design doc §4.2)
- Daemon invocation resolution: `SPACEBRIDGE_DEV` env var or sibling binary detection (design doc §4.2)
- Test isolation: use temp directories for socket/lock/pid files in tests, never production paths (MEMORY.md test isolation pattern)
- Entity 051 owns the socket server/client implementation; this entity only manages the process lifecycle (fork, wait, stop, status) around 051's server
- Node.js `net` module for socket operations (entity 051 A-5 decision: Bun native API underdocumented, net module is stable)

**RATIONALE**: L2 auto-fork is the only lifecycle model that satisfies both the fixed-port requirement (daemon owns port 8420 and socket path) and zero-onboarding (no manual `start` needed, no launchd install). The double-check-under-lock pattern from design doc §4.2 is a well-known concurrency primitive (compare: singleton daemon patterns in Docker, PostgreSQL pg_ctl, Redis sentinel). The shim-side implementation is ~50 lines of startup logic; the daemon CLI is ~30 lines of subcommand routing. The sticky-by-default shutdown policy matches user expectation: once the daemon is up, it stays up across CC sessions, avoiding repeated cold-start latency. The auto-stop option for CI prevents zombie daemons in test environments.

## Acceptance Criteria

- Given no daemon running (no socket file exists), when the first shim starts, then it acquires the lock file, forks a detached daemon process, waits for the socket to appear (≤5s), releases the lock, and connects to the daemon (how to verify: `bun test` -- start shim with no daemon, assert PID file created, socket file exists, shim connected)
- Given a shim auto-forking a daemon, when a second shim starts within 100ms, then it blocks on the lock file, finds the daemon already running after lock acquisition, and connects without spawning a second daemon (how to verify: `bun test` -- race two shim startups with shared temp dir, assert exactly one daemon PID, both shims connected)
- Given a running daemon, when the shim that started it exits (CC session ends), then the daemon continues running (sticky default) and subsequent shims connect without re-forking (how to verify: `bun test` -- start shim, disconnect, start second shim, assert same daemon PID, no new fork)
- Given `spacebridge status` invoked, when a daemon is running, then it reports daemon PID, uptime, and count of connected sessions (how to verify: `bun test` -- start daemon, connect 2 shims, run status subcommand, assert output includes PID, uptime > 0, sessions = 2)
- Given `spacebridge stop` invoked, when a daemon is running, then it sends SIGTERM, daemon shuts down gracefully, socket and PID files are cleaned up (how to verify: `bun test` -- start daemon, run stop, assert PID file removed, socket file removed, process exited)
- Given `SPACEBRIDGE_NO_AUTOFORK=1` set, when a shim starts with no daemon running, then it skips auto-fork and reports an error (how to verify: `bun test` -- set env var, start shim, assert no fork attempt, error logged)
- Given `SPACEBRIDGE_AUTO_STOP=1` set, when the last connected shim disconnects, then the daemon shuts down automatically (how to verify: `bun test` -- set env var, start daemon via shim, disconnect all shims, assert daemon process exits within 5s)

## Assumptions

A-1: Stale file recovery uses socket probe as source of truth. When the shim finds an existing socket file but gets ECONNREFUSED on connect, it treats the socket as stale (daemon crashed without cleanup). Recovery: delete stale socket file, proceed with normal auto-fork. PID file staleness checked via `kill(pid, 0)` (signal 0 = existence check). If PID file exists but process is dead, delete PID + socket + lock files before forking.
Confidence: Confident (0.90)
Evidence: channel.ts:617-623 -- existing SIGTERM/SIGINT/exit cleanup pattern shows the project handles graceful shutdown; stale recovery handles the ungraceful case. Standard daemon pattern: Docker, PostgreSQL pg_ctl, Redis sentinel all use socket/PID probe.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: CLI subcommand ownership boundary -- entity 052 implements daemon-internal start/stop/status logic in `spacebridge/bin/daemon.ts`. Entity 059 implements the user-facing `spacebridge` CLI wrapper that dispatches to daemon.ts for start/stop/status and adds mcp/share subcommands. The shim calls daemon.ts directly (via `spawn()`); the user calls `spacebridge` (the wrapper).
Confidence: Confident (0.85)
Evidence: design doc §4.2 lines 301-302 -- shim invokes `['bun', 'path/to/spacebridge/bin/daemon.ts', 'start']` (internal path). Entity 059 scope: "Thin spacebridge CLI wrapper (bun script) that dispatches subcommands: start, stop, status, mcp, share".
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Sticky daemon is the default shutdown policy. Daemon stays up after the last shim disconnects, avoiding repeated cold-start latency for subsequent CC sessions. `SPACEBRIDGE_AUTO_STOP=1` env var enables auto-stop-on-last-disconnect for CI/test environments only.
Confidence: Confident (0.90)
Evidence: design doc §4.1 line 274 -- "Daemon outlives the shim that birthed it". The entity scope says "configurable: sticky vs auto-stop" -- brainstorm chose sticky default with env var override.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: 5-second startup timeout is sufficient because the daemon binds the socket as its first action, before heavy initialization (DB open, Next.js boot). The shim's `wait_for_socket()` only needs the socket to accept connections, not the full daemon stack to be ready.
Confidence: Confident (0.90, upgraded from Likely 0.75 via research)
Evidence: design doc §4.2 line 309 -- `wait_for_socket(socket_path, timeout: 5s)`. Research confirmed: Node.js net.createServer().listen() socket bind is sub-millisecond (synchronous kernel bind+listen syscalls via libuv). Bun node:net is "Fully implemented" (green status). The 5s timeout guards fork()+exec()+Bun runtime startup, not socket bind. Condition: daemon MUST bind socket as first action before DB/Next.js init.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Entity 052's daemon.ts provides a mixed startup -- direct import for importable services (unix socket server from entity 051, coordination from entity 056) + child process spawn for Next.js standalone (entity 053). It registers signal handlers and manages teardown for both imported services and child processes.
Confidence: Confident (0.85, upgraded from Likely 0.75 via research + corrected)
Evidence: entity scope says "this entity manages the daemon process lifecycle around [051's server]". Research confirmed: Next.js standalone server.js is a self-executing script, NOT importable (Next.js docs, GitHub Discussion #22127). Custom server API exists but is mutually exclusive with standalone mode. Socket IPC (051) and coordination (056) are plain TS modules -- directly importable. Design doc §5.4 mod registration pattern provides codebase precedent for registry approach.
→ Corrected by captain, 2026-04-13 (batch): "Not all services use uniform registration. Next.js standalone is NOT importable -- use child process spawn for 053, direct import for 051/056. Mixed startup pattern."

## Option Comparisons

### O-1: Lock file mechanism for double-fork prevention

The design doc §4.2 says "acquire lock file with flock", but Node.js has no native `flock()` syscall. Bun's Node.js compatibility layer provides `fs.open()` and `fs.writeFile()` but not POSIX advisory locking. How should the shim implement the lock?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| `mkdir` atomicity (create dir as lock, rmdir to release) | Atomic on all POSIX + Windows filesystems; no dependencies; battle-tested pattern (proper-lockfile, npm cli) | No blocking wait -- must poll. Must handle stale locks (process died without rmdir). Directory instead of file is slightly unusual | Low | Recommended |
| `fs.open()` with O_EXCL flag (create-if-not-exists file) | Simple file-based; atomic create | Same poll-and-retry as mkdir; O_EXCL on NFS is unreliable (not relevant here but worth noting); must handle stale files | Low | Viable |
| Bun FFI to call flock() directly | True POSIX advisory locking; kernel handles blocking wait; auto-releases on process crash | Platform-specific (no Windows); adds FFI complexity; Bun FFI stability uncertain for this use case; harder to test | Medium | Not recommended |
| `proper-lockfile` npm package | Battle-tested; handles stale detection, retries, backoff; used by npm/yarn | External dependency; adds ~15KB; may have Bun compatibility issues | Low | Viable |

→ Selected: mkdir atomicity (captain, 2026-04-13, interactive)

### O-2: Daemon invocation resolution (how shim finds daemon to fork)

When the shim needs to fork a daemon, it must construct the spawn command. The command differs between development (bun + source path) and installed (wrapper CLI on PATH) modes. How does the shim resolve which invocation to use?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| `SPACEBRIDGE_DEV` env var + `__dirname` relative path | Explicit; dev sets env var, installed mode uses `spacebridge` on PATH. Shim logic: `SPACEBRIDGE_DEV ? ['bun', resolve(__dirname, '../bin/daemon.ts'), 'start'] : ['spacebridge', 'start']` | Requires dev to remember to set env var (can default in .env or launch config) | Low | Recommended |
| Auto-detect: check PATH for `spacebridge` first, fallback to relative daemon.ts | No env var needed; "just works" in both modes | `which`/`command -v` adds ~50ms latency per shim startup; silent fallback may mask misconfiguration | Low | Viable |
| Single `SPACEBRIDGE_DAEMON_CMD` env var (full command) | Maximum flexibility; works for any invocation mode | Verbose; user must set the full command string; error-prone | Low | Not recommended |

→ Selected: SPACEBRIDGE_DEV env var + __dirname relative path (captain, 2026-04-13, interactive)

## Open Questions

Q-1: What daemon startup composition pattern should 052 use so that entities 053 (Next.js), 056 (CoordinationClient), and future services can plug into the daemon process?

Domain: Organizational/Data-transforming

Why it matters: The daemon hosts multiple services (socket server from 051, HTTP/SSE from 053, coordination from 056). Entity 052 creates the daemon process, but the startup sequence must be extensible without modifying daemon.ts for every new service. The pattern chosen here determines whether 053/056 can develop independently or must coordinate daemon.ts changes.

Suggested options: (a) Module-level registration -- daemon.ts imports a service registry; each entity exports a `start(ctx)` function registered at import time. daemon.ts calls `registry.startAll()` after socket is up. (b) Direct import chain -- daemon.ts directly imports and calls each service module. Simple but requires daemon.ts edits per entity. (c) Plugin-style dynamic loading -- daemon.ts scans a `services/` directory for modules with a `start` export. Maximum decoupling but adds discovery complexity.

→ Answer: Direct import + child process hybrid. daemon.ts directly imports socket server (051) and coordination (056) as in-process modules, calling their start()/stop() functions. Next.js standalone server.js (053) is spawned as a managed child process (Bun.spawn) since standalone is NOT importable (research confirmed: Next.js docs + GitHub Discussion #22127). Teardown: .close() for imported services, SIGTERM for child process. Simple, explicit, matches A-5 corrected assumption. (captain, 2026-04-13, interactive)

## Canonical References

- Next.js standalone output docs (nextjs.org/docs/pages/api-reference/config/next-config-js/output) -- standalone server.js is self-executing, not importable (research, 2026-04-13, Q-1)
- Next.js custom server API (nextjs.org/docs/pages/guides/custom-server) -- programmatic alternative, mutually exclusive with standalone (research, 2026-04-13, Q-1)
- GitHub Discussion #22127 (github.com/vercel/next.js/discussions/22127) -- "no official public API to start Next.js server programmatically" (research, 2026-04-13, Q-1)
- Design doc §5.4 mod registration pattern -- `bridge.mods.register({...})` as codebase precedent for registry approach (research, 2026-04-13, A-5)

## References

- Design doc §4.1 (L2 auto-fork daemon lifecycle): lifecycle options analysis and L2 choice rationale
- Design doc §4.2 (Auto-fork implementation sketch): pseudocode for the startup sequence
- Design doc §3.2 (Distribution): bun --compile ruled out; standalone dir + wrapper CLI
- Entity 051 (clarify/ready): unix socket IPC + ChannelProvider -- provides the socket server this entity manages
- Entity 051 O-1 decision: thin shim + daemon DB owner -- daemon is sole DB connection holder
- Entity 051 A-5 decision: Node.js net module for socket operations (captain-corrected from Bun native API)
- Entity 050 (plan/review): plugin skeleton -- directory structure where daemon code lives (`spacebridge/` inside spacedock)
- Entity 059 (draft): standalone distribution + wrapper CLI -- owns user-facing `spacebridge` command, consumes 052's daemon entry
- channel.ts:569-631 -- existing CLI entry point with spawn/cleanup pattern (replaced by daemon lifecycle)
- channel.ts:32-47 -- `computeStateDir()` using `~/.spacedock/` convention

## Stage Report: explore

- [x] Files mapped: 7 across domain, contract, config
  domain: 1 (channel.ts CLI entry + cleanup), contract: 4 (entity 051, entity 059, design doc §4.1-4.2, design doc §3.2), config: 2 (channel.ts computeStateDir, server.ts dbPath)
- [x] Assumptions formed: 5 (Confident: 3, Likely: 2, Unclear: 0)
  A-1 through A-3 Confident via design doc + codebase pattern; A-4 Likely (depends on startup ordering); A-5 Likely (no codebase precedent for registration pattern)
- [x] Options surfaced: 2
  O-1 lock file mechanism (mkdir atomicity vs O_EXCL vs FFI flock vs proper-lockfile); O-2 daemon invocation resolution (env var vs auto-detect vs full command)
- [x] Questions generated: 1
  Q-1 daemon startup composition pattern (registry vs direct import vs dynamic loading)
- [x] α markers resolved: 0 / 0
  no α markers in brainstorm
- [x] Scale assessment: confirmed Small
  spacebridge/ dir does not exist yet (entity 050 creates it); estimated 3-4 new files (auto-fork, daemon entry, PID utils, tests)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Small scope, no children proposed
- [x] Assumptions confirmed: 5 / 5 (1 corrected)
  A-1 through A-4 confirmed batch; A-5 corrected: uniform hookable startup → mixed startup (direct import + child process) after research found Next.js standalone not importable
- [x] Options selected: 2 / 2
  O-1 mkdir atomicity for lock file (recommended); O-2 SPACEBRIDGE_DEV env var + __dirname (recommended)
- [x] Questions answered: 1 / 1 (0 deferred)
  Q-1 direct import + child process hybrid for daemon composition (research-informed: Next.js standalone limitation)
- [x] Canonical refs added: 4
  Next.js standalone docs, custom server API, GitHub Discussion #22127, design doc §5.4 mod pattern
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say "execute 052" or launch FO in separate session
- [x] Clarify duration: 5 questions asked, session complete
  1 batch assumption (with ad-hoc researcher dispatch for A-4/A-5) + 2 option AskUserQuestion + 1 Q-1 AskUserQuestion + 1 pipeline improvement (entity 075)

## Research Findings

### Upstream Constraints

- **Design doc §4.2 pseudocode is authoritative** for the auto-fork sequence: `connect → ECONNREFUSED/ENOENT → acquire lock → re-check under lock → spawn detached → wait_for_socket(5s) → release lock → connect` (design doc lines 288-318)
- **Socket path fixed at `~/.spacedock/spacebridge.sock`** -- design doc §4.2, inherited by entity 051's `SocketServerOptions.socketPath`
- **`SPACEBRIDGE_NO_AUTOFORK=1` disables auto-fork** -- design doc §4.1 "Debuggable: shim's auto-fork can be disabled via env var"
- **Sticky daemon default** -- design doc §4.1 line 274 "Daemon outlives the shim that birthed it"; `SPACEBRIDGE_AUTO_STOP=1` for CI override
- **No fmodel in this entity** -- entity scope says "no fmodel", pure process lifecycle management
- **MEMORY.md test isolation**: tests must use explicit temp paths, never production `~/.spacedock/` paths

### Existing Patterns

- **channel.ts:617-623 cleanup pattern**: `process.on("SIGTERM", () => { cleanup(); process.exit(0); })` + `SIGINT` + `exit` -- three-signal handler pattern is the project convention for graceful shutdown (channel.ts:617-623)
- **channel.ts:32-35 `computeStateDir()`**: `join(homedir(), ".spacedock", "dashboard", hash)` -- state directory convention uses `~/.spacedock/` root (channel.ts:32-35)
- **Entity 051 `createSocketServer`**: `listen()` returns `Promise<void>`, `close()` returns `Promise<void>`, stale socket cleanup via `existsSync → unlinkSync` at listen time (socket-server.ts:127-132). This is the server the daemon boots.
- **Entity 051 `createSocketClient`**: `connect()` returns `Promise<RegisterAckPayload>`, built-in exponential backoff reconnect (100ms→5000ms, 5 retries). This is what the shim uses to connect (socket-client.ts)
- **Entity 051 `SocketServer.getConnectedSessions()`**: returns `string[]` of session IDs -- daemon can use this for status reporting (socket-server.ts:152)

### Library/API Surface

- **`child_process.spawn` with `detached: true` + `.unref()`**: Node.js API for creating detached child processes. Under Bun, `Bun.spawn` supports `{ detached: true }` (Bun docs). However, for consistency with entity 051's use of `node:net`, the shim should use `node:child_process` `spawn` which Bun also supports as a compatibility layer.
- **`mkdirSync` atomicity for lock file**: `mkdirSync(path)` throws `EEXIST` if directory already exists -- atomic on all POSIX + Windows filesystems. Pattern: create dir = acquire lock, `rmdirSync` = release lock. Used by npm CLI (proper-lockfile). Stale detection: check `mtime` of lock dir, if older than threshold (e.g., 60s), treat as stale and remove.
- **`process.kill(pid, 0)`**: Signal 0 is an existence check -- returns `true` if process exists, throws `ESRCH` if not. Standard POSIX pattern for PID file validation. Used for stale PID file detection.
- **`writeFileSync` / `readFileSync` for PID file**: Write daemon PID to `~/.spacedock/spacebridge.pid` at startup, read for `stop`/`status` commands. Integer content, simple parse.
- **`net.createConnection({path})` for socket probe**: Can be used to check if daemon is alive -- attempt connect, handle ECONNREFUSED/ENOENT. Already implemented in entity 051's `createSocketClient.connect()`.

### Known Gotchas

- **Stale socket file after crash**: If daemon crashes without cleanup, `~/.spacedock/spacebridge.sock` remains but no process listens. Entity 051's `createSocketServer.listen()` already handles this by `unlinkSync`-ing existing socket files before bind (socket-server.ts:128-130). The shim's auto-fork must also detect staleness: connect attempt returns ECONNREFUSED → stale.
- **Stale PID file after crash**: PID file contains old PID. Process may no longer exist, or PID may have been recycled by OS. Must verify with `process.kill(pid, 0)` before trusting. If process dead → delete PID + socket + lock files.
- **Stale lock directory**: If shim crashes while holding the mkdir lock, the lock dir remains. Stale detection: check lock dir `mtime`, if older than startup timeout (5s + safety margin, e.g., 10s), treat as stale and `rmdirSync`.
- **Race between two shims both detecting stale daemon**: Two shims detect stale socket simultaneously, both try to clean up and fork. The mkdir lock prevents this -- cleanup and fork happen under lock.
- **`spawn` detached child inherits stdio**: Must explicitly set `stdio: 'ignore'` to prevent daemon stdout/stderr from interfering with shim's MCP stdio transport. Design doc §4.2 line 307 explicitly specifies `stdio: 'ignore'`.
- **Socket file path length limit**: Unix socket paths have a ~104 byte limit on macOS. `~/.spacedock/spacebridge.sock` is well under this (~40 bytes expanded).

### Reference Examples

- **Entity 051 `createSocketServer` + `createSocketClient`** -- the exact IPC layer the daemon will use. daemon.ts will call `createSocketServer({ socketPath, onRegister, onRpcRequest, onCoordinationRequest, onDisconnect })` and then `server.listen()`. The shim auto-fork code will use `createSocketClient` to probe the socket (socket-client.ts:connect).
- **Entity 051 `createCoordinationClientStub`** -- daemon.ts will import this for its `onCoordinationRequest` handler, forwarding to the stub until entity 056 provides a real implementation (coordination-client-stub.ts).
- **Entity 051 `createChannelProviderBridge`** -- daemon-side RPC handler uses this to map incoming ChannelProvider calls to the dashboard (channel-provider-bridge.ts).
- **channel.ts:569-631 CLI entry point** -- the `if (import.meta.main)` block shows: parseArgs, resolve projectRoot, create server, connect transport, write state, register signal handlers. daemon.ts follows a similar pattern but with subcommand routing (start/stop/status) instead of direct server boot.

## PLAN

**Goal**: Implement L2 auto-fork daemon lifecycle -- shim-side auto-fork logic, daemon entry point with start/stop/status subcommands, PID file and lock file management, and tests.

**Depends on**: Entity 051 (unix socket IPC). Files in `spacebridge/src/ipc/` are read_first references from entity 051's branch. Entity 052's code lives in `spacebridge/src/daemon/` (new directory) and `spacebridge/bin/daemon.ts` (new file).

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/ipc/index.ts
    - spacebridge/package.json
    - tools/dashboard/src/channel.ts
  </read_first>

  <action>
  Environment verification task. Verify:
  1. `spacebridge/` directory exists on the current branch (entity 050+051 created it)
  2. `spacebridge/src/ipc/socket-server.ts` exports `createSocketServer` and `SocketServerOptions`
  3. `spacebridge/src/ipc/socket-client.ts` exports `createSocketClient` and `SocketClientOptions`
  4. `spacebridge/src/ipc/types.ts` exports `RegisterPayload`, `RegisterAckPayload`
  5. `spacebridge/src/ipc/coordination-client-stub.ts` exports `createCoordinationClientStub`
  6. `spacebridge/src/ipc/channel-provider-bridge.ts` exports `createChannelProviderBridge`
  7. `tools/dashboard/src/channel.ts` contains `computeStateDir` and signal handler pattern at lines 617-623
  8. `spacebridge/src/daemon/` does NOT exist yet (fresh directory for this entity)
  9. `spacebridge/bin/` does NOT exist yet (fresh directory for this entity)

  Run: `ls spacebridge/src/ipc/`, `grep -l "createSocketServer" spacebridge/src/ipc/socket-server.ts`, `grep -l "createSocketClient" spacebridge/src/ipc/socket-client.ts`, `grep -l "createCoordinationClientStub" spacebridge/src/ipc/coordination-client-stub.ts`, `grep -l "createChannelProviderBridge" spacebridge/src/ipc/channel-provider-bridge.ts`, `test -d spacebridge/src/daemon && echo EXISTS || echo ABSENT`, `test -d spacebridge/bin && echo EXISTS || echo ABSENT`

  If any check fails, STOP and revise the plan.
  </action>

  <acceptance_criteria>
    - `ls spacebridge/src/ipc/` shows socket-server.ts, socket-client.ts, types.ts, index.ts, coordination-client-stub.ts, channel-provider-bridge.ts
    - `grep "createSocketServer" spacebridge/src/ipc/socket-server.ts` finds the export
    - `grep "createSocketClient" spacebridge/src/ipc/socket-client.ts` finds the export
    - `test -d spacebridge/src/daemon` reports ABSENT
    - `test -d spacebridge/bin` reports ABSENT
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - tools/dashboard/src/channel.ts
    - spacebridge/src/ipc/types.ts
  </read_first>

  <action>
  Create `spacebridge/src/daemon/pid.ts` -- PID file management utilities:
  - `writePidFile(pidPath: string, pid: number): void` -- write PID to file (mkdir -p parent dir, writeFileSync)
  - `readPidFile(pidPath: string): number | null` -- read PID from file, return null if file missing or unparseable
  - `isProcessAlive(pid: number): boolean` -- `process.kill(pid, 0)` wrapped in try/catch, returns true if alive, false if ESRCH
  - `cleanStalePidFile(pidPath: string): boolean` -- read PID, check if alive, if dead: delete PID file and return true (cleaned), if alive: return false (not stale)

  Create `spacebridge/src/daemon/lock.ts` -- mkdir-based lock file:
  - `acquireLock(lockPath: string, opts?: { staleThresholdMs?: number }): boolean` -- attempt `mkdirSync(lockPath)`, on EEXIST check mtime for staleness (default threshold 10000ms), if stale: rmdir + retry mkdir. Returns true if acquired, false if lock held by another live process.
  - `releaseLock(lockPath: string): void` -- `rmdirSync(lockPath)`

  Create corresponding test files:
  - `spacebridge/src/daemon/pid.test.ts` -- tests for all 4 functions using temp directories
  - `spacebridge/src/daemon/lock.test.ts` -- tests for acquire (fresh, contended, stale), release, edge cases

  All tests use `mkdtempSync(join(tmpdir(), "sb-test-"))` for isolation, never production paths.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/daemon/pid.test.ts` passes
    - `bun test spacebridge/src/daemon/lock.test.ts` passes
    - `grep "writePidFile" spacebridge/src/daemon/pid.ts` finds the export
    - `grep "acquireLock" spacebridge/src/daemon/lock.ts` finds the export
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/daemon/pid.ts
    - spacebridge/src/daemon/pid.test.ts
    - spacebridge/src/daemon/lock.ts
    - spacebridge/src/daemon/lock.test.ts
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="2" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/src/ipc/socket-client.ts
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/types.ts
    - spacebridge/src/daemon/pid.ts
    - spacebridge/src/daemon/lock.ts
  </read_first>

  <action>
  Create `spacebridge/src/daemon/auto-fork.ts` -- shim-side auto-fork logic:
  - `autoForkDaemon(opts: AutoForkOptions): Promise<void>` where `AutoForkOptions` = `{ socketPath: string, lockPath: string, pidPath: string, stateDir: string, daemonCmd: string[], startupTimeoutMs?: number (default 5000), lockStaleMs?: number (default 10000) }`
  - Implementation follows design doc §4.2 pseudocode exactly:
    1. Check `SPACEBRIDGE_NO_AUTOFORK=1` env var -- if set, throw `Error("auto-fork disabled via SPACEBRIDGE_NO_AUTOFORK=1")`
    2. Probe socket: attempt `net.createConnection({path: socketPath})`, if connects → return (daemon already running)
    3. On ECONNREFUSED/ENOENT: run stale recovery -- `cleanStalePidFile(pidPath)`, if stale also unlink socket file and lock dir
    4. Acquire lock via `acquireLock(lockPath)`
    5. Re-check socket under lock (double-check pattern)
    6. If still no daemon: `spawn(daemonCmd, { detached: true, stdio: 'ignore' }).unref()`
    7. `waitForSocket(socketPath, startupTimeoutMs)` -- poll with 100ms interval, resolve when socket accepts connection, reject on timeout
    8. Release lock via `releaseLock(lockPath)`
  - Export `resolveDaemonCommand(): string[]` -- returns `SPACEBRIDGE_DEV ? ['bun', resolve(__dirname, '../../bin/daemon.ts'), 'start'] : ['spacebridge', 'start']`

  Create `spacebridge/src/daemon/auto-fork.test.ts` -- tests:
  - Test 1: No daemon running → auto-fork spawns daemon, waits for socket, succeeds
  - Test 2: Daemon already running → auto-fork connects immediately, no spawn
  - Test 3: Two concurrent auto-forks → lock ensures only one spawn (race condition test)
  - Test 4: SPACEBRIDGE_NO_AUTOFORK=1 → throws error, no spawn attempt
  - Test 5: Stale socket file (ECONNREFUSED) → cleanup + fork
  - Test 6: Startup timeout → throws after 5s (use short timeout in test, e.g., 500ms)

  Tests use a real socket server (from entity 051's `createSocketServer`) and temp directories for full integration, NOT mocks.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/daemon/auto-fork.test.ts` passes
    - `grep "autoForkDaemon" spacebridge/src/daemon/auto-fork.ts` finds the export
    - `grep "resolveDaemonCommand" spacebridge/src/daemon/auto-fork.ts` finds the export
    - `grep "SPACEBRIDGE_NO_AUTOFORK" spacebridge/src/daemon/auto-fork.ts` finds the env var check
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/daemon/auto-fork.ts
    - spacebridge/src/daemon/auto-fork.test.ts
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="3">
  <read_first>
    - spacebridge/src/ipc/socket-server.ts
    - spacebridge/src/ipc/channel-provider-bridge.ts
    - spacebridge/src/ipc/coordination-client-stub.ts
    - spacebridge/src/daemon/pid.ts
  </read_first>

  <action>
  Create `spacebridge/bin/daemon.ts` -- daemon entry point with subcommand routing:

  The file uses `import.meta.main` guard and `parseArgs` for subcommand routing (matching channel.ts:569-582 pattern).

  **`start` subcommand**:
  1. Resolve state dir: `join(homedir(), ".spacedock")`
  2. Ensure state dir exists: `mkdirSync(stateDir, { recursive: true })`
  3. Write PID file: `writePidFile(join(stateDir, "spacebridge.pid"), process.pid)`
  4. Create socket server via `createSocketServer({ socketPath: join(stateDir, "spacebridge.sock"), onRegister: ..., onRpcRequest: ..., onCoordinationRequest: ..., onDisconnect: ... })`
    - `onRegister`: store session in internal map, return `{ sessionToken: randomUUID(), serverVersion: "0.1.0" }`
    - `onRpcRequest`: forward to ChannelProviderBridge (stubbed for now -- entity 053 provides real dashboard)
    - `onCoordinationRequest`: forward to CoordinationClientStub (entity 056 replaces later)
    - `onDisconnect`: remove session from map; if `SPACEBRIDGE_AUTO_STOP=1` and no sessions remain, schedule shutdown
  5. Call `server.listen()` -- socket binds as first action (per A-4, before any heavy init)
  6. Register signal handlers: SIGTERM/SIGINT → `server.close()`, clean PID file, clean socket file, `process.exit(0)`
  7. Log startup to stderr: `[timestamp] spacebridge daemon started (pid: {pid}, socket: {socketPath})`

  **`stop` subcommand**:
  1. Read PID file from `~/.spacedock/spacebridge.pid`
  2. If PID file missing → print "daemon not running" and exit 1
  3. If PID alive → `process.kill(pid, "SIGTERM")`, print "stopping daemon (pid: {pid})"
  4. If PID dead → clean up stale files (pid + socket + lock), print "cleaned stale daemon files"

  **`status` subcommand**:
  1. Read PID file
  2. If PID file missing or process dead → print "daemon not running" and exit 1
  3. If PID alive → probe socket via `net.createConnection`, send a status query
  4. Print: `daemon running (pid: {pid}, uptime: {uptime}, sessions: {count})`
  5. Session count comes from `server.getConnectedSessions().length` -- for status command running out-of-process, this requires a socket RPC query. Add an `ipc-status` message type to types or use a simple approach: connect as temporary client, send `{ type: "rpc-request", payload: { method: "__status" } }`, daemon returns `{ sessions: N, uptime: X }`.

  No separate test file for daemon.ts -- it's an entry point. Integration tested in task-4.
  </action>

  <acceptance_criteria>
    - `grep "start\|stop\|status" spacebridge/bin/daemon.ts` finds all three subcommands
    - `grep "writePidFile" spacebridge/bin/daemon.ts` confirms PID file write on start
    - `grep "SPACEBRIDGE_AUTO_STOP" spacebridge/bin/daemon.ts` confirms auto-stop env var check
    - `grep "SIGTERM\|SIGINT" spacebridge/bin/daemon.ts` confirms signal handlers registered
    - `bun run spacebridge/bin/daemon.ts start &` successfully starts daemon (socket file appears at temp path), `bun run spacebridge/bin/daemon.ts stop` stops it
  </acceptance_criteria>

  <files_modified>
    - spacebridge/bin/daemon.ts
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="4" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/bin/daemon.ts
    - spacebridge/src/daemon/auto-fork.ts
    - spacebridge/src/daemon/pid.ts
    - spacebridge/src/daemon/lock.ts
    - spacebridge/src/ipc/integration.test.ts
  </read_first>

  <action>
  Create `spacebridge/src/daemon/integration.test.ts` -- full lifecycle integration tests:

  All tests use temp directories (`mkdtempSync`) for socket, PID, and lock file paths. Each test gets isolated state.

  - **Test: start + connect + stop lifecycle** -- spawn daemon via `Bun.spawn(['bun', 'spacebridge/bin/daemon.ts', 'start'], { env: { ...process.env, SPACEBRIDGE_STATE_DIR: tmpDir } })`, wait for socket, connect via `createSocketClient`, verify registration succeeds, then send SIGTERM, verify socket file and PID file cleaned up
  - **Test: auto-fork creates daemon** -- call `autoForkDaemon({ socketPath, lockPath, pidPath, stateDir, daemonCmd: ['bun', resolve('spacebridge/bin/daemon.ts'), 'start'] })` with no pre-existing daemon, assert PID file created, socket file exists, shim can connect
  - **Test: second shim connects without re-forking** -- auto-fork first shim (creates daemon), auto-fork second shim (daemon already exists), assert only one PID file (same PID), both shims connected
  - **Test: sticky daemon survives shim disconnect** -- auto-fork, connect shim, disconnect shim, assert daemon still running (PID alive), new shim can connect
  - **Test: SPACEBRIDGE_AUTO_STOP=1 daemon stops on last disconnect** -- spawn daemon with env var, connect two shims, disconnect first (daemon still running), disconnect second (daemon stops within 5s, check PID file removed)
  - **Test: stop subcommand sends SIGTERM** -- spawn daemon, verify running, run stop subcommand via Bun.spawn, assert daemon process exited, PID + socket files cleaned
  - **Test: status subcommand reports running daemon** -- spawn daemon, connect 2 shims, run status subcommand, parse output for PID, uptime > 0, sessions = 2

  Note: daemon.ts must accept a `SPACEBRIDGE_STATE_DIR` env var override for test isolation (default: `join(homedir(), ".spacedock")`). Add this env var check to daemon.ts at the top of the start subcommand.
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/src/daemon/integration.test.ts` passes
    - `grep "auto-fork\|auto_fork\|autoFork" spacebridge/src/daemon/integration.test.ts` confirms auto-fork lifecycle tested
    - `grep "SPACEBRIDGE_AUTO_STOP" spacebridge/src/daemon/integration.test.ts` confirms auto-stop tested
    - `grep "SPACEBRIDGE_STATE_DIR" spacebridge/bin/daemon.ts` confirms test isolation env var added
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/daemon/integration.test.ts
    - spacebridge/bin/daemon.ts
  </files_modified>
</task>

<task id="task-5" model="haiku" wave="4">
  <read_first>
    - spacebridge/src/daemon/pid.ts
    - spacebridge/src/daemon/lock.ts
    - spacebridge/src/daemon/auto-fork.ts
    - spacebridge/src/ipc/index.ts
  </read_first>

  <action>
  Create `spacebridge/src/daemon/index.ts` -- barrel export for the daemon module:
  - Re-export `writePidFile`, `readPidFile`, `isProcessAlive`, `cleanStalePidFile` from `./pid`
  - Re-export `acquireLock`, `releaseLock` from `./lock`
  - Re-export `autoForkDaemon`, `resolveDaemonCommand` and `AutoForkOptions` type from `./auto-fork`

  Update `spacebridge/src/ipc/types.ts` (if needed) to add the `__status` RPC method response type used by daemon status subcommand. Only if task-3 introduced a new message pattern that needs a type.
  </action>

  <acceptance_criteria>
    - `grep "autoForkDaemon" spacebridge/src/daemon/index.ts` finds the re-export
    - `grep "acquireLock" spacebridge/src/daemon/index.ts` finds the re-export
    - `grep "writePidFile" spacebridge/src/daemon/index.ts` finds the re-export
    - `bun test spacebridge/src/daemon/` passes (all daemon tests still pass)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/daemon/index.ts
    - spacebridge/src/ipc/types.ts
  </files_modified>
</task>

## UAT Spec

### Browser

None

### CLI

- [ ] `bun run spacebridge/bin/daemon.ts start` in a temp dir spawns a daemon that creates PID file and socket file
- [ ] `bun run spacebridge/bin/daemon.ts stop` sends SIGTERM and cleans up PID + socket files
- [ ] `bun run spacebridge/bin/daemon.ts status` reports PID, uptime, and session count when daemon is running
- [ ] `SPACEBRIDGE_NO_AUTOFORK=1` prevents auto-fork and surfaces an error

### API

None

### Interactive

- [ ] Captain verifies `bun test spacebridge/src/daemon/` runs all daemon tests (pid, lock, auto-fork, integration) with 0 failures

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: First shim auto-forks daemon, waits for socket, connects | task-2, task-4 | `bun test spacebridge/src/daemon/auto-fork.test.ts` + `bun test spacebridge/src/daemon/integration.test.ts` | pending | -- |
| AC-2: Second shim blocks on lock, connects without spawning second daemon | task-2, task-4 | `bun test spacebridge/src/daemon/auto-fork.test.ts` (race test) + `bun test spacebridge/src/daemon/integration.test.ts` (second shim test) | pending | -- |
| AC-3: Sticky daemon survives shim disconnect | task-4 | `bun test spacebridge/src/daemon/integration.test.ts` (sticky test) | pending | -- |
| AC-4: `spacebridge status` reports PID, uptime, sessions | task-3, task-4 | `bun test spacebridge/src/daemon/integration.test.ts` (status test) | pending | -- |
| AC-5: `spacebridge stop` sends SIGTERM, cleans up files | task-3, task-4 | `bun test spacebridge/src/daemon/integration.test.ts` (stop test) | pending | -- |
| AC-6: SPACEBRIDGE_NO_AUTOFORK=1 skips auto-fork, reports error | task-2 | `bun test spacebridge/src/daemon/auto-fork.test.ts` (no-autofork test) | pending | -- |
| AC-7: SPACEBRIDGE_AUTO_STOP=1 daemon stops on last disconnect | task-3, task-4 | `bun test spacebridge/src/daemon/integration.test.ts` (auto-stop test) | pending | -- |

## Stage Report: plan

- [x] Load and execute the spacedock:build-plan skill
  Loaded SKILL.md, followed 9-step process
- [x] Research: (a) Node.js child_process.spawn detach patterns in Bun, (b) mkdir-based lock file implementations, (c) PID file management patterns
  Inline serial research (no pre-populated Research Findings section). 5 research domains covered: Upstream Constraints (6 findings), Existing Patterns (5 findings), Library/API Surface (5 findings), Known Gotchas (6 findings), Reference Examples (4 findings). All findings cite file:line or design doc section.
- [x] Synthesize research into ## Research Findings
  Written with 5 canonical subsections. No contradictions found across research domains.
- [x] Write ## PLAN with per-task attributes
  6 tasks (task-0 through task-5), waves 0-4, 3 TDD tasks (task-1, task-2, task-4), 10 files across spacebridge/src/daemon/ and spacebridge/bin/
- [x] Write ## UAT Spec with items classified by type
  4 CLI items, 1 interactive item, Browser and API sections present (None)
- [x] Write ## Validation Map
  7 rows covering all 7 acceptance criteria, all status=pending
- [x] Run self-review + plan-checker through up to 3 revision iterations
  Self-review caught 1 issue: wave dependency violation (task-2 was wave 1 but depends on task-1 wave 1 output). Fixed: task-2→wave 2, task-3→wave 3, task-4/5→wave 4. Plan-checker (inline, Agent tool unavailable): 7 dimensions evaluated, 0 blockers, 2 warnings (task-0 empty files_modified, types.ts cross-entity with 051). PASS after 1 iteration.
- [x] Call workflow-index append unconditionally
  10 append entries (10 files, 6 tasks deduplicated), all successful. Commit: a286292 chore(index): add contracts for entity-spacebridge-l2-daemon-lifecycle entering plan (10 files)
- [x] Write ## Stage Report: plan with plan-checker verdict
  This section.

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold (all patterns are well-known POSIX daemon conventions, not novel to this project)
workflow-index append: 10 append calls covering 6 tasks and 10 files, all successful

### Plan-checker final output
```yaml
issues:
  - dimension: task_completeness
    task: task-0
    severity: warning
    description: "task-0 has empty files_modified (environment verification task produces no files)"
    fix_hint: "Acceptable for Wave 0 verification tasks -- no fix needed"
  - dimension: cross_entity_coherence
    task: task-5
    severity: warning
    description: "spacebridge/src/ipc/types.ts is owned by entity 051 (currently in execute stage); task-5 modification is conditional and additive"
    fix_hint: "Task-5 action already says 'if needed' -- execute stage should verify 051 has completed before modifying types.ts"
```

### Dispatch Gaps
- Agent tool unavailable in ensign context -- plan-checker ran inline (all 7 dimensions evaluated manually)
- Research ran inline serial (no pre-populated ## Research Findings from FO-dispatched researchers)

### Commits
- a286292 chore(index): add contracts for entity-spacebridge-l2-daemon-lifecycle entering plan (10 files)
- (pending) chore(plan): spacebridge-l2-daemon-lifecycle L2 auto-fork daemon lifecycle plan
