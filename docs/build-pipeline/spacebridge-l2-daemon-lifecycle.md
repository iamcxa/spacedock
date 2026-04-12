---
id: 052
title: "L2 auto-fork daemon lifecycle"
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

A-2: CLI subcommand ownership boundary -- entity 052 implements daemon-internal start/stop/status logic in `spacebridge/bin/daemon.ts`. Entity 059 implements the user-facing `spacebridge` CLI wrapper that dispatches to daemon.ts for start/stop/status and adds mcp/share subcommands. The shim calls daemon.ts directly (via `spawn()`); the user calls `spacebridge` (the wrapper).
Confidence: Confident (0.85)
Evidence: design doc §4.2 lines 301-302 -- shim invokes `['bun', 'path/to/spacebridge/bin/daemon.ts', 'start']` (internal path). Entity 059 scope: "Thin spacebridge CLI wrapper (bun script) that dispatches subcommands: start, stop, status, mcp, share".

A-3: Sticky daemon is the default shutdown policy. Daemon stays up after the last shim disconnects, avoiding repeated cold-start latency for subsequent CC sessions. `SPACEBRIDGE_AUTO_STOP=1` env var enables auto-stop-on-last-disconnect for CI/test environments only.
Confidence: Confident (0.90)
Evidence: design doc §4.1 line 274 -- "Daemon outlives the shim that birthed it". The entity scope says "configurable: sticky vs auto-stop" -- brainstorm chose sticky default with env var override.

A-4: 5-second startup timeout is sufficient because the daemon binds the socket as its first action, before heavy initialization (DB open, Next.js boot). The shim's `wait_for_socket()` only needs the socket to accept connections, not the full daemon stack to be ready.
Confidence: Likely (0.75)
Evidence: design doc §4.2 line 309 -- `wait_for_socket(socket_path, timeout: 5s)`. Depends on implementation ordering: if daemon opens DB or runs migrations before binding socket, first-run latency could exceed 5s. Socket-first ordering is the safer design.

A-5: Entity 052's daemon.ts provides a process lifecycle shell with a hookable startup sequence. It starts the unix socket server (entity 051) and registers signal handlers, but does NOT start the Next.js HTTP server (entity 053) or the coordination stack (entity 056). Other entities wire their services into the daemon's startup via a registration pattern (e.g., `daemon.register(service)` or module-level side effects).
Confidence: Likely (0.75)
Evidence: entity scope says "this entity manages the daemon process lifecycle around [051's server]". Entity 053 (Next.js warroom SSE) depends-on 052, suggesting it adds functionality to the daemon 052 creates. No codebase precedent yet for the registration pattern -- spacebridge/ dir doesn't exist.

## Option Comparisons

### O-1: Lock file mechanism for double-fork prevention

The design doc §4.2 says "acquire lock file with flock", but Node.js has no native `flock()` syscall. Bun's Node.js compatibility layer provides `fs.open()` and `fs.writeFile()` but not POSIX advisory locking. How should the shim implement the lock?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| `mkdir` atomicity (create dir as lock, rmdir to release) | Atomic on all POSIX + Windows filesystems; no dependencies; battle-tested pattern (proper-lockfile, npm cli) | No blocking wait -- must poll. Must handle stale locks (process died without rmdir). Directory instead of file is slightly unusual | Low | Recommended |
| `fs.open()` with O_EXCL flag (create-if-not-exists file) | Simple file-based; atomic create | Same poll-and-retry as mkdir; O_EXCL on NFS is unreliable (not relevant here but worth noting); must handle stale files | Low | Viable |
| Bun FFI to call flock() directly | True POSIX advisory locking; kernel handles blocking wait; auto-releases on process crash | Platform-specific (no Windows); adds FFI complexity; Bun FFI stability uncertain for this use case; harder to test | Medium | Not recommended |
| `proper-lockfile` npm package | Battle-tested; handles stale detection, retries, backoff; used by npm/yarn | External dependency; adds ~15KB; may have Bun compatibility issues | Low | Viable |

### O-2: Daemon invocation resolution (how shim finds daemon to fork)

When the shim needs to fork a daemon, it must construct the spawn command. The command differs between development (bun + source path) and installed (wrapper CLI on PATH) modes. How does the shim resolve which invocation to use?

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| `SPACEBRIDGE_DEV` env var + `__dirname` relative path | Explicit; dev sets env var, installed mode uses `spacebridge` on PATH. Shim logic: `SPACEBRIDGE_DEV ? ['bun', resolve(__dirname, '../bin/daemon.ts'), 'start'] : ['spacebridge', 'start']` | Requires dev to remember to set env var (can default in .env or launch config) | Low | Recommended |
| Auto-detect: check PATH for `spacebridge` first, fallback to relative daemon.ts | No env var needed; "just works" in both modes | `which`/`command -v` adds ~50ms latency per shim startup; silent fallback may mask misconfiguration | Low | Viable |
| Single `SPACEBRIDGE_DAEMON_CMD` env var (full command) | Maximum flexibility; works for any invocation mode | Verbose; user must set the full command string; error-prone | Low | Not recommended |

## Open Questions

Q-1: What daemon startup composition pattern should 052 use so that entities 053 (Next.js), 056 (CoordinationClient), and future services can plug into the daemon process?

Domain: Organizational/Data-transforming

Why it matters: The daemon hosts multiple services (socket server from 051, HTTP/SSE from 053, coordination from 056). Entity 052 creates the daemon process, but the startup sequence must be extensible without modifying daemon.ts for every new service. The pattern chosen here determines whether 053/056 can develop independently or must coordinate daemon.ts changes.

Suggested options: (a) Module-level registration -- daemon.ts imports a service registry; each entity exports a `start(ctx)` function registered at import time. daemon.ts calls `registry.startAll()` after socket is up. (b) Direct import chain -- daemon.ts directly imports and calls each service module. Simple but requires daemon.ts edits per entity. (c) Plugin-style dynamic loading -- daemon.ts scans a `services/` directory for modules with a `start` export. Maximum decoupling but adds discovery complexity.

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
