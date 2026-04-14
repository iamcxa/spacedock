---
id: 059
title: "Standalone directory distribution + wrapper CLI"
status: plan
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md); scope revised 2026-04-10 after entity 049 spike
started: 2026-04-14T09:00:00+08:00
worktree: .worktrees/spacedock-ensign-spacebridge-standalone-dir-distribution
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [053]
---

## Directive

> Spacebridge needs a distribution format that (a) includes daemon + shim + Next.js UI + Drizzle schema + fmodel core, (b) installs cleanly via the Claude Code plugin mechanism, and (c) exposes a single `spacebridge` CLI with subcommands (`start`, `stop`, `status`, `mcp`, `share`). Entity 049 spike ruled out `bun build --compile` single-binary due to structural conflict with Next.js standalone output -- this entity adopts the standard Next.js self-hosting pattern instead.

## Captain Context Snapshot

- **Repo**: main @ a3d03e4
- **Session**: SO pipeline for spacebridge entities. 056/053/054/057 context ready. 059 next.
- **Domain**: Runnable/Invokable, Readable/Textual
- **Related entities**: 049 -- Next.js + Bun spike (shipped -- V4/V5 proved standalone dir run path), 053 -- War room + SSE (draft, context ready -- O-1: Next.js at `spacebridge/ui/`, O-2: SSE polls events table), 052 -- Daemon lifecycle (shipped -- L2 auto-fork, daemon.ts subcommand routing), 058 -- Share tunnel rebuild (draft, depends on 059), 060 -- Cutover delete static UI (draft, depends on 059)
- **Created**: 2026-04-13T18:50:00+08:00

## Brainstorming Spec

**APPROACH**: Create a thin `spacebridge/bin/cli.ts` as the unified CLI entry point (✓ confirmed by explore: daemon.ts:258-268 already has subcommand routing for start/stop/status via `Bun.argv[2]` -- cli.ts adds mcp/share and delegates daemon commands) -- a bun script that parses `process.argv` and dispatches to existing modules. The 5 subcommands map to existing infrastructure: (1) `start` delegates to `bin/daemon.ts` cmdStart (✓ confirmed by explore: daemon.ts:31 `cmdStart()` fully implemented -- socket server, PID file, SIGTERM/SIGINT handlers, auto-stop timer); (2) `stop` reads the PID file from `~/.spacedock/spacebridge.pid` via `readPidFile()` (✓ confirmed by explore: daemon.ts:132 `cmdStop()` already implemented -- reads PID, sends SIGTERM, cleans up socket); (3) `status` reads the PID file, checks process liveness via `isProcessAlive()`, and pings the unix socket for uptime/session count (✓ confirmed by explore: daemon.ts:160 `cmdStatus()` fully implemented -- uses `__status` RPC method at daemon.ts:67 to query live daemon state); (4) `mcp` starts the MCP stdio shim (✓ confirmed by explore: channel-provider-bridge.ts exists, auto-fork.ts:62 `autoForkDaemon()` is the shim-side startup logic); (5) `share` creates a tunnel for remote access (entity 058 scope -- 059 stubs it with a "not yet implemented" message). The build pipeline is a `scripts/build.sh` that: (a) runs `bun run --bun next build` in `spacebridge/ui/` (entity 053's Next.js app, `output: 'standalone'` in `next.config.ts`), (b) copies `ui/.next/static/` into `ui/.next/standalone/.next/static/` and `ui/public/` into `ui/.next/standalone/public/` (required post-build step proven by entity 049 V4-V5), (c) validates the result by checking `server.js` exists in standalone dir. Plugin manifest: update `.claude-plugin/plugin.json` to wire `spacebridge` as the CLI command (bin entry) so Claude Code's plugin installer registers the command. CI: a GitHub Actions workflow triggered on tag push (`v*`) that runs the build script and packages the result as a release artifact.

**ALTERNATIVE**: Use a shell script (`#!/bin/bash`) wrapper instead of a bun script (`#!/usr/bin/env bun`) for the CLI entry point. -- D-01 Rejected: shell scripts lose type safety, IDE support, and import access to existing TypeScript modules (daemon/pid.ts, daemon/lock.ts). The existing daemon.ts is already a bun script. Consistency favors bun. The only advantage (no bun runtime dependency) is irrelevant because the entire stack requires bun.

**GUARDRAILS**:
- `.next/standalone/` is the distribution unit -- never `bun build --compile` (design doc D10, entity 049 ruling) (✓ confirmed by explore: design doc §3.2:202-207 documents structural conflict)
- Post-build static/public copy is required for Next.js standalone asset serving (entity 049 V4-V5) (✓ confirmed by explore: entity 053 A-6 already confirmed this step)
- `~/.spacedock/spacebridge.db` is the single DB path -- never bundled or copied during install, user data persists across upgrades (design doc §4.5) (✓ confirmed by explore: db.ts:116 `defaultDbPath()` returns `~/.spacedock/spacebridge.db`)
- daemon.ts already has start/stop/status subcommand routing -- 059 wraps it, does not reimplement (✓ confirmed by explore: daemon.ts:258-268 `Bun.argv[2]` routing verified)
- Plugin manifest `.claude-plugin/plugin.json` already exists -- modify, don't recreate (✓ confirmed by explore: plugin.json exists with basic metadata, no bin/mcp entries yet)

**RATIONALE**: The CLI wrapper is deliberately thin -- most functionality already exists in daemon.ts (start/stop/status), channel-provider-bridge.ts (mcp), and will exist in entity 058 (share). Entity 059 provides the "single entry point" UX and the build/distribution pipeline that packages everything into an installable unit. The standard Next.js self-hosting pattern (ship `.next/standalone/` directory) was chosen over single-binary after entity 049 proved `bun build --compile` has structural conflicts with Next.js (virtual-fs chdir failure, no sibling node_modules bundling). The Claude Code plugin mechanism already handles "install a directory" naturally -- there is no UX regression from not shipping a single file (design doc D10).

## Acceptance Criteria

- [ ] Given the CLI entry point at `spacebridge/bin/cli.ts`, when `bun run bin/cli.ts start` is executed, then the daemon boots on port 8420 and the UI is reachable at `http://127.0.0.1:8420/` (how to verify: run command, curl localhost:8420, assert HTML response)
- [ ] Given a running daemon, when `bun run bin/cli.ts stop` is executed, then the daemon receives SIGTERM and shuts down cleanly (how to verify: check PID file removed, port 8420 no longer bound)
- [ ] Given a running daemon, when `bun run bin/cli.ts status` is executed, then it prints daemon PID, uptime, and connected session count (how to verify: run command, assert output contains PID and uptime)
- [ ] Given `bun run bin/cli.ts mcp` is executed, when CC connects via `.mcp.json` stdio transport, then the MCP shim starts and communicates with the daemon (how to verify: check shim process starts, connects to unix socket)
- [ ] Given `bun run bin/cli.ts share` is executed, then it prints "Not yet implemented -- see entity 058" (how to verify: run command, assert message)
- [ ] Given `scripts/build.sh` is run from spacebridge/, when the build completes, then `ui/.next/standalone/server.js` exists and `ui/.next/standalone/.next/static/` contains copied assets (how to verify: run script, check file existence)
- [ ] Given the packaged distribution, when installed via Claude Code plugin mechanism, then `spacebridge start` is available as a command (how to verify: install, run `spacebridge --help`)

## References

- Design doc §3.1 (Runtime and framework): distribution row (post-spike update)
- Design doc §3.2 (Spike results): why single-binary was ruled out
- Design doc D10: decision rationale for directory-not-binary
- Entity 049 (shipped 2026-04-10): V4/V5 results proving standalone directory run path
- Entity 052 (shipped): L2 auto-fork, daemon.ts subcommand routing

## Assumptions

A-1: daemon.ts already implements cmdStart, cmdStop, cmdStatus with full functionality -- cli.ts delegates to these, does not reimplement.
Confidence: 🟢 Confident (0.95)
Evidence: daemon.ts:31 cmdStart (socket server + PID + shutdown handlers), daemon.ts:132 cmdStop (read PID + SIGTERM), daemon.ts:160 cmdStatus (__status RPC query). Line 258-268 routes via `Bun.argv[2]`.
→ Confirmed: captain, 2026-04-13 (batch)

A-2: The MCP shim entry point is `autoForkDaemon()` from auto-fork.ts, which checks for existing daemon and starts the shim connection.
Confidence: 🟢 Confident (0.90)
Evidence: auto-fork.ts:62 `autoForkDaemon()` exported. channel-provider-bridge.ts:18 creates the ChannelProvider bridge over a SocketClient. Together they form the shim startup path for the `mcp` subcommand.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: `~/.spacedock/spacebridge.db` path persists across upgrades -- the CLI/build never touches user data.
Confidence: 🟢 Confident (0.95)
Evidence: db.ts:116 `defaultDbPath()` returns `${homedir()}/.spacedock/spacebridge.db`. This is outside the plugin install directory. Upgrades replace plugin files but not `~/.spacedock/`.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Build script runs `bun run --bun next build` from `spacebridge/ui/` with `output: 'standalone'` in next.config.ts.
Confidence: 🟢 Confident (0.90)
Evidence: Entity 049 V4-V5 verified this exact command. Entity 053 O-1 placed Next.js at `spacebridge/ui/`. Note: `ui/` directory doesn't exist yet (053 not executed) -- build script validates existence before running.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Post-build static/public copy is a 2-line `cp -r` operation that is idempotent.
Confidence: 🟢 Confident (0.95)
Evidence: Entity 049 Results section documents this step. Entity 053 A-6 confirmed it. Standard Next.js standalone deployment step.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: CLI entry point architecture -- new cli.ts vs extend daemon.ts

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| New `bin/cli.ts` that imports daemon command functions + adds mcp/share | Clean separation: daemon.ts stays the daemon process entry (auto-fork spawns it), cli.ts is the user-facing entry. Each file has one responsibility | Indirection: cli.ts imports from daemon.ts which has its own argv routing. Two entry points to maintain | Low | Recommended |
| Extend daemon.ts with mcp/share subcommands directly | One file, zero indirection, daemon.ts is already a CLI | Mixes daemon-lifecycle commands (start/stop/status run as the daemon process) with non-daemon commands (mcp runs as a shim process, share runs as a tunnel process). Auto-fork spawns daemon.ts specifically for `start` -- adding unrelated subcommands clutters | Low | Viable |
| cli.ts spawns daemon.ts as subprocess for start (no imports) | Maximum isolation -- cli.ts is pure router, daemon.ts is pure daemon | Loses type-safe import of readPidFile/isProcessAlive for stop/status -- would re-implement or shell out | Medium | Not recommended |

Return value trace: auto-fork.ts:62 `autoForkDaemon()` spawns `bin/daemon.ts start` as a detached process. If daemon.ts gains `mcp`/`share` subcommands, auto-fork still works (only calls with `start`). But cli.ts as a separate entry keeps daemon.ts focused on daemon-process-only logic. No downstream consumer breaks either way.

Design doc invariant check: §3.1:186 says "thin `spacebridge` CLI wrapper". This implies a separate wrapper, not extending daemon.ts. The design doc envisions daemon.ts as the daemon process and a wrapper as the user-facing CLI.

→ Selected: 新建 bin/cli.ts，委派 daemon 命令 + 新增 mcp/share (captain, 2026-04-13, interactive)

## Open Questions

Q-1: How does the Claude Code plugin mechanism register `spacebridge` as a CLI command available to the user?

Domain: Readable/Textual, Runnable/Invokable

Why it matters: The acceptance criterion says "spacebridge start is available as a command" after plugin install. But `.claude-plugin/plugin.json` currently has no `bin` or `commands` field -- just metadata (name, version, description). If CC plugins don't support a `bin` entry, the CLI might need to be registered via a different mechanism (e.g., the plugin's skills invoke it, or the user runs `bun spacebridge/bin/cli.ts` directly instead of a bare `spacebridge` command).

Suggested options: (a) Add a `bin` field to plugin.json (e.g., `"bin": {"spacebridge": "bin/cli.ts"}`) -- if CC plugin spec supports it, this is the cleanest path. (b) No global command -- users run `bun /path/to/spacebridge/bin/cli.ts start` directly or via an alias. Simpler, no plugin spec dependency. (c) Register as a CC skill that wraps the CLI -- `spacebridge:start`, `spacebridge:stop`, etc. Integrates with CC UX but adds skill boilerplate.

→ Answer: (b) 不註冊全域命令 -- 使用者直接執行 `bun bin/cli.ts start` 或設 alias。MCP shim 透過 .mcp.json stdio transport 啟動，不需要全域 CLI。簡單且不依賴 CC plugin spec 的 bin 欄位。 (captain, 2026-04-13, interactive)

## Stage Report: explore

- [x] Files mapped: 4 across bin, ipc, daemon, plugin-config
  bin/daemon.ts (modify -- already has start/stop/status), bin/cli.ts (new -- entry point), scripts/build.sh (new), .claude-plugin/plugin.json (modify)
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 through A-5 all Confident (0.90-0.95); daemon.ts commands, auto-fork shim, DB path, build step, post-build copy all verified
- [x] Options surfaced: 1
  O-1 CLI entry point architecture (new cli.ts vs extend daemon.ts)
- [x] Questions generated: 1
  Q-1 CC plugin mechanism for CLI command registration
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Small
  4 files across 3 layers; thin wrapper + build script + plugin config
- [x] Research dispatched: 0 researchers (skipped -- Small entity, all tech validated by entity 049 spike and existing codebase)

## Canonical References

- `spacebridge/bin/daemon.ts` -- cmdStart/cmdStop/cmdStatus implementations (A-1), argv routing at line 258 (O-1 comparison)
- `spacebridge/src/daemon/auto-fork.ts` -- autoForkDaemon() shim entry point (A-2)
- `spacebridge/src/ipc/channel-provider-bridge.ts` -- ChannelProvider RPC bridge for mcp subcommand (A-2)
- `spacebridge/src/db.ts` -- defaultDbPath() for upgrade persistence (A-3)
- `spacebridge/.claude-plugin/plugin.json` -- plugin manifest to modify (Q-1)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Small entity, no decomposition recommendation
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence verified in current session; Small scope, no gaps from templates
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed batch
- [x] Options selected: 1 / 1
  O-1 new bin/cli.ts (recommended) -- clean separation from daemon.ts
- [x] Questions answered: 1 / 1
  Q-1 no global CLI command -- users run bun bin/cli.ts directly, MCP via .mcp.json
- [x] Open exploration: 0 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 0 via freeform)
  Captain noted CI discussion is premature; complete on first iteration
- [x] Canonical refs added: 5
  daemon.ts, auto-fork.ts, channel-provider-bridge.ts, db.ts, plugin.json
- [x] Context status: ready
  Gate passed: all 5 assumptions confirmed, 1 option selected, 1 Q answered
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 059" to advance
- [x] Clarify duration: 4 questions asked, session complete
  1 batch confirmation + 1 option selection + 1 Q answer + 1 exploration iteration

## Research Findings

### 1. Upstream Constraints

- **Next.js standalone output**: `output: "standalone"` in `next.config.mjs` (confirmed). Post-build requires copying `ui/.next/static/` → `ui/.next/standalone/.next/static/` and `ui/public/` → `ui/.next/standalone/public/` (entity 049 V4-V5 proven, A-5 confirmed).
- **Bun compile ruled out**: entity 049 proved `bun build --compile` has structural conflicts with Next.js standalone (virtual-fs chdir failure + no sibling node_modules bundling). Design doc D10 decision.
- **Plugin manifest**: `.claude-plugin/plugin.json` currently has name/version/description/author/repository/license/keywords. No `bin` or `mcpServers` fields yet. Q-1 answer: no global CLI registration needed.

### 2. Existing Patterns

- **daemon.ts subcommand routing**: `Bun.argv[2]` switch at line 319-332, dispatching to `cmdStart()`, `cmdStop()`, `cmdStatus()`. All three fully implemented with socket server, PID management, SIGTERM handling.
- **auto-fork.ts production path**: `resolveDaemonCommand()` line 120-128 returns `["spacebridge", "start"]` in production — assumes a global `spacebridge` command on PATH. Since Q-1 answer says no global CLI, this needs updating to resolve `bin/cli.ts` relative to plugin root.
- **Next.js child spawning**: `nextjs-child.ts` already implements `spawnNextjsChild()` (bun run server.js with PORT/DB env) and `resolveNextjsServerScript()` (locates `.next/standalone/ui/server.js`). Daemon calls these at startup.

### 3. Library/API Surface

- **Bun.argv**: standard Bun CLI arg access. `Bun.argv[0]` = bun binary, `Bun.argv[1]` = script path, `Bun.argv[2]` = subcommand.
- **import.meta.dir**: Bun-specific, resolves to the directory of the current file. Used in daemon.ts line 153 for `pluginRoot`.
- **import.meta.main**: Bun-specific guard for direct execution vs import.

### 4. Known Gotchas

- **resolveDaemonCommand production path**: Currently returns `["spacebridge", "start"]` which won't work without global CLI. Must be updated to `["bun", "run", "<resolved-cli.ts-path>", "start"]` using `import.meta.url` resolution.
- **ui/.next/standalone/ path structure**: Next.js standalone outputs to `ui/.next/standalone/` but the server.js lives at `ui/.next/standalone/ui/server.js` (nested because the project is in a `ui/` subdirectory). `resolveNextjsServerScript()` already handles this correctly.
- **Build script must run from spacebridge/**: `bun run --bun next build` needs `cwd` set to `spacebridge/ui/`. Build script should `cd` into the right directory.

### 5. Reference Examples

- **daemon.ts entry point pattern**: `if (import.meta.main) { ... }` guard + `Bun.argv[2]` switch + async dispatch. cli.ts follows the same pattern.
- **nextjs-child.ts spawn pattern**: `spawn("bun", ["run", serverScript], { stdio, env })` — proven pattern for subprocess management.

## PLAN

### Goal

Create a thin `spacebridge/bin/cli.ts` as the unified CLI entry point with 5 subcommands (start/stop/status/mcp/share), a `spacebridge/scripts/build.sh` for Next.js standalone build pipeline, update the plugin manifest with MCP server declaration, and fix the auto-fork production daemon command to resolve `bin/cli.ts` instead of assuming a global `spacebridge` binary.

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - spacebridge/bin/daemon.ts
    - spacebridge/.claude-plugin/plugin.json
    - spacebridge/src/daemon/auto-fork.ts
    - spacebridge/ui/next.config.mjs
  </read_first>

  <action>
  Environment verification. Confirm:
  1. Current branch is `spacedock-ensign/spacebridge-standalone-dir-distribution`: `git branch --show-current`
  2. `spacebridge/bin/daemon.ts` exists and has cmdStart/cmdStop/cmdStatus: `grep -c 'cmdStart\|cmdStop\|cmdStatus' spacebridge/bin/daemon.ts`
  3. `spacebridge/src/daemon/auto-fork.ts` exists and exports autoForkDaemon: `grep 'export async function autoForkDaemon' spacebridge/src/daemon/auto-fork.ts`
  4. `spacebridge/ui/next.config.mjs` has standalone output: `grep 'standalone' spacebridge/ui/next.config.mjs`
  5. `spacebridge/.claude-plugin/plugin.json` exists: `test -f spacebridge/.claude-plugin/plugin.json && echo OK`
  6. `spacebridge/bin/cli.ts` does NOT exist yet: `test ! -f spacebridge/bin/cli.ts && echo OK`
  7. `spacebridge/scripts/` does NOT exist yet: `test ! -d spacebridge/scripts/ && echo OK`
  If any check fails, STOP and report before proceeding.
  </action>

  <acceptance_criteria>
    - All 7 checks pass
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - spacebridge/bin/daemon.ts (lines 319-332 for argv routing pattern)
    - spacebridge/src/daemon/auto-fork.ts (lines 62-113 for autoForkDaemon signature)
    - spacebridge/src/ipc/channel-provider-bridge.ts (for mcp shim context)
  </read_first>

  <action>
  Create `spacebridge/bin/cli.ts` — the unified CLI entry point.

  Structure:
  1. ABOUTME comment explaining: thin wrapper CLI for spacebridge; delegates daemon lifecycle to daemon.ts, adds mcp and share subcommands.
  2. Import `autoForkDaemon`, `resolveDaemonCommand` from `../src/daemon/auto-fork`.
  3. Import `join` from `node:path`, `homedir` from `node:os`.
  4. A `resolveStateDir()` function matching daemon.ts pattern: `process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock")`.
  5. Parse `Bun.argv[2]` as the subcommand.
  6. Subcommand routing:
     - `start`: Import and call the daemon module's start logic. Since daemon.ts is designed to be run as a process (not imported), use `Bun.spawn(["bun", "run", resolve(import.meta.dir, "daemon.ts"), "start"], { stdio: ["inherit", "inherit", "inherit"] })` and wait for exit.
     - `stop`: Same pattern — `Bun.spawn(["bun", "run", resolve(import.meta.dir, "daemon.ts"), "stop"], { stdio: ["inherit", "inherit", "inherit"] })`.
     - `status`: Same pattern — `Bun.spawn(["bun", "run", resolve(import.meta.dir, "daemon.ts"), "status"], { stdio: ["inherit", "inherit", "inherit"] })`.
     - `mcp`: Call `autoForkDaemon()` with resolved state dir paths and daemon command. This ensures daemon is running, then the caller (CC stdio transport) connects. After autoForkDaemon returns, the MCP shim process continues running as the stdio bridge. Import and start the shim connection: create SocketClient connected to the daemon socket, create ChannelProviderBridge, then pipe stdin/stdout as MCP stdio transport. NOTE: The full MCP stdio shim implementation depends on entity 053's ChannelProvider RPC routing being live in the daemon — for 059, the `mcp` subcommand calls `autoForkDaemon()` to ensure daemon is running, then prints a confirmation message. The actual stdio bridge wiring is entity 053's scope.
     - `share`: Print `"Not yet implemented — see entity 058\n"` to stderr and exit 0.
     - Default (no subcommand or `--help`): Print usage message listing all 5 subcommands to stderr and exit 1.
  7. Guard with `if (import.meta.main) { ... }` pattern.

  Exit code forwarding: for start/stop/status, the spawned subprocess exit code must propagate. Use `proc.exited` (Bun.spawn returns a Subprocess with `.exited` Promise<number>).
  </action>

  <acceptance_criteria>
    - `test -f spacebridge/bin/cli.ts && echo OK` prints OK
    - `grep 'import.meta.main' spacebridge/bin/cli.ts` finds the entry guard
    - `grep 'autoForkDaemon' spacebridge/bin/cli.ts` finds the mcp subcommand import
    - `grep 'Not yet implemented' spacebridge/bin/cli.ts` finds the share stub
    - `grep 'start.*stop.*status.*mcp.*share' spacebridge/bin/cli.ts` finds the usage message (or each individually)
    - `bun run spacebridge/bin/cli.ts --help` prints usage with 5 subcommands (exit 1)
    - `bun run spacebridge/bin/cli.ts share` prints "Not yet implemented" message (exit 0)
    - `bun check spacebridge/bin/cli.ts` (or tsc --noEmit) passes with no type errors
  </acceptance_criteria>

  <files_modified>
    - spacebridge/bin/cli.ts (new)
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - spacebridge/src/daemon/auto-fork.ts (lines 115-128 for resolveDaemonCommand)
    - spacebridge/bin/cli.ts (from task-1, for the path to resolve to)
  </read_first>

  <action>
  Update `resolveDaemonCommand()` in `spacebridge/src/daemon/auto-fork.ts`.

  Current production path returns `["spacebridge", "start"]` — assumes global CLI on PATH.
  Q-1 answer: no global CLI registration. Users run `bun bin/cli.ts` directly.

  Change the production (non-DEV) path to resolve `bin/cli.ts` relative to the package root:
  ```typescript
  export function resolveDaemonCommand(): string[] {
    const thisFile = fileURLToPath(import.meta.url);
    const cliPath = resolve(dirname(thisFile), "../../bin/cli.ts");
    return ["bun", "run", cliPath, "start"];
  }
  ```

  This removes the SPACEBRIDGE_DEV branching entirely — both dev and production use the same resolution since there is no global binary. The `daemon.ts` direct reference in the DEV path is replaced by `cli.ts` which delegates to `daemon.ts` anyway.

  Also update the existing `auto-fork.test.ts` test for `resolveDaemonCommand` to expect the new shape (no more SPACEBRIDGE_DEV branching).
  </action>

  <acceptance_criteria>
    - `grep 'spacebridge.*start' spacebridge/src/daemon/auto-fork.ts` no longer matches (bare "spacebridge" command removed)
    - `grep 'cli.ts' spacebridge/src/daemon/auto-fork.ts` finds the new resolution
    - `grep 'SPACEBRIDGE_DEV' spacebridge/src/daemon/auto-fork.ts` returns no matches (branching removed)
    - `bun test spacebridge/src/daemon/auto-fork.test.ts` passes (updated tests)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/src/daemon/auto-fork.ts (modify)
    - spacebridge/src/daemon/auto-fork.test.ts (modify)
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2">
  <read_first>
    - spacebridge/ui/next.config.mjs
    - spacebridge/src/daemon/nextjs-child.ts (for resolveNextjsServerScript path)
  </read_first>

  <action>
  Create `spacebridge/scripts/build.sh` — the Next.js standalone build pipeline.

  Script structure:
  1. `#!/usr/bin/env bash` shebang + `set -euo pipefail`
  2. ABOUTME comment: Build script for spacebridge standalone distribution. Runs Next.js build, copies static assets, validates output.
  3. Resolve SCRIPT_DIR and SPACEBRIDGE_ROOT: `SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"` and `SPACEBRIDGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"`
  4. Step 1 — Validate prerequisites:
     - Check `bun --version` exists
     - Check `spacebridge/ui/next.config.mjs` exists
     - Check `spacebridge/ui/node_modules/` exists (run `bun install` in ui/ if not)
  5. Step 2 — Run Next.js build:
     - `cd "$SPACEBRIDGE_ROOT/ui" && bun run --bun next build`
  6. Step 3 — Post-build static/public copy (entity 049 V4-V5 proven, A-5 confirmed):
     - `cp -r "$SPACEBRIDGE_ROOT/ui/.next/static" "$SPACEBRIDGE_ROOT/ui/.next/standalone/.next/static"`
     - `cp -r "$SPACEBRIDGE_ROOT/ui/public" "$SPACEBRIDGE_ROOT/ui/.next/standalone/public"` (only if public/ has files)
  7. Step 4 — Validate output:
     - Check `ui/.next/standalone/ui/server.js` exists (path matches resolveNextjsServerScript)
     - Check `ui/.next/standalone/.next/static/` directory exists
     - Print success message with output directory path
  8. `chmod +x spacebridge/scripts/build.sh`
  </action>

  <acceptance_criteria>
    - `test -x spacebridge/scripts/build.sh && echo OK` prints OK (file exists and is executable)
    - `head -1 spacebridge/scripts/build.sh` prints `#!/usr/bin/env bash`
    - `grep 'set -euo pipefail' spacebridge/scripts/build.sh` finds the safety flags
    - `grep 'bun run --bun next build' spacebridge/scripts/build.sh` finds the build command
    - `grep 'cp -r' spacebridge/scripts/build.sh` finds the static/public copy steps
    - `grep 'server.js' spacebridge/scripts/build.sh` finds the validation check
    - `bash -n spacebridge/scripts/build.sh` passes (valid bash syntax)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/scripts/build.sh (new)
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - spacebridge/.claude-plugin/plugin.json
    - spacebridge/bin/cli.ts (from task-1)
  </read_first>

  <action>
  Update `spacebridge/.claude-plugin/plugin.json` to declare the MCP server entry point.

  Add `mcpServers` field so Claude Code's plugin mechanism knows how to start the MCP shim:
  ```json
  {
    "name": "spacebridge",
    "version": "0.1.0",
    "description": "Coordination bridge for Spacedock — daemon, UI, role-aware work queue, and build studio skills",
    "author": { "name": "Kent" },
    "repository": "https://github.com/iamcxa/spacedock",
    "license": "Apache-2.0",
    "keywords": ["coordination", "bridge", "daemon", "build-studio", "drizzle", "fmodel"],
    "mcpServers": {
      "spacebridge": {
        "command": "bun",
        "args": ["run", "bin/cli.ts", "mcp"]
      }
    }
  }
  ```

  This wires the `mcp` subcommand as the stdio transport entry. When CC loads the plugin, it spawns `bun run bin/cli.ts mcp` which calls autoForkDaemon (ensuring daemon is up) then runs as the MCP stdio bridge.
  </action>

  <acceptance_criteria>
    - `cat spacebridge/.claude-plugin/plugin.json | grep 'mcpServers'` finds the field
    - `cat spacebridge/.claude-plugin/plugin.json | grep 'bin/cli.ts'` finds the CLI reference
    - `cat spacebridge/.claude-plugin/plugin.json | grep '"mcp"'` finds the subcommand arg
    - JSON is valid: `bun -e "JSON.parse(require('fs').readFileSync('spacebridge/.claude-plugin/plugin.json', 'utf8'))"`
  </acceptance_criteria>

  <files_modified>
    - spacebridge/.claude-plugin/plugin.json (modify)
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="3">
  <read_first>
    - spacebridge/bin/cli.ts
    - spacebridge/bin/daemon.ts
    - spacebridge/scripts/build.sh
    - spacebridge/.claude-plugin/plugin.json
    - spacebridge/src/daemon/auto-fork.ts
  </read_first>

  <action>
  Integration verification — validate all pieces work together.

  1. Type-check: `cd spacebridge && bunx tsc --noEmit` — no type errors across the project
  2. Unit tests: `cd spacebridge && bun test` — all existing tests pass, auto-fork.test.ts updated tests pass
  3. CLI smoke test — help: `bun run spacebridge/bin/cli.ts` — prints usage with 5 subcommands, exits 1
  4. CLI smoke test — share stub: `bun run spacebridge/bin/cli.ts share` — prints "Not yet implemented", exits 0
  5. CLI smoke test — unknown subcommand: `bun run spacebridge/bin/cli.ts unknown` — prints usage, exits 1
  6. Build script syntax: `bash -n spacebridge/scripts/build.sh` — valid syntax
  7. Plugin manifest: `bun -e "console.log(JSON.parse(require('fs').readFileSync('spacebridge/.claude-plugin/plugin.json','utf8')).mcpServers.spacebridge.command)"` — prints "bun"
  8. Cross-reference: resolveDaemonCommand() in auto-fork.ts resolves to the same `bin/cli.ts` path that plugin.json references

  NOTE: Full start/stop/status integration requires a running daemon (entity 053 Next.js + entity 056 RPC routing). Those AC items are classified as `interactive` in the UAT spec — captain tests them manually in a running environment. This task validates the mechanical correctness of all new files.
  </action>

  <acceptance_criteria>
    - `bunx tsc --noEmit` in spacebridge/ exits 0
    - `bun test` in spacebridge/ passes with 0 failures
    - `bun run spacebridge/bin/cli.ts` exits 1 with usage output
    - `bun run spacebridge/bin/cli.ts share` exits 0 with stub message
    - `bash -n spacebridge/scripts/build.sh` exits 0
    - Plugin manifest JSON is valid and contains mcpServers.spacebridge
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### cli — CLI subcommand verification

| # | Type | Description | Precondition | Steps | Expected |
|---|------|-------------|--------------|-------|----------|
| U-1 | cli | help/usage output | None | Run `bun run spacebridge/bin/cli.ts` (no args) | Prints usage listing start/stop/status/mcp/share, exits 1 |
| U-2 | cli | share stub | None | Run `bun run spacebridge/bin/cli.ts share` | Prints "Not yet implemented — see entity 058", exits 0 |
| U-3 | cli | unknown subcommand | None | Run `bun run spacebridge/bin/cli.ts foo` | Prints usage, exits 1 |
| U-4 | interactive | start subcommand | No daemon running, entity 053 UI built | Run `bun run spacebridge/bin/cli.ts start`, then `curl http://127.0.0.1:8420/` | Daemon boots, UI responds with HTML |
| U-5 | interactive | status subcommand | Daemon running (U-4) | Run `bun run spacebridge/bin/cli.ts status` | Prints PID, uptime, session count |
| U-6 | interactive | stop subcommand | Daemon running (U-4) | Run `bun run spacebridge/bin/cli.ts stop`, then check port 8420 | Daemon shuts down, PID file removed, port freed |
| U-7 | interactive | mcp subcommand | Daemon running (U-4), .mcp.json wired | Run `bun run spacebridge/bin/cli.ts mcp` | autoForkDaemon ensures daemon, prints confirmation |

### build — Build pipeline verification

| # | Type | Description | Precondition | Steps | Expected |
|---|------|-------------|--------------|-------|----------|
| U-8 | cli | build script syntax | None | `bash -n spacebridge/scripts/build.sh` | Exits 0 (valid bash) |
| U-9 | interactive | full build | Entity 053 UI code present, `bun install` in ui/ | Run `spacebridge/scripts/build.sh` | `ui/.next/standalone/ui/server.js` exists, static assets copied |

### plugin — Plugin manifest verification

| # | Type | Description | Precondition | Steps | Expected |
|---|------|-------------|--------------|-------|----------|
| U-10 | cli | plugin.json valid | None | Parse JSON, check mcpServers.spacebridge exists | Valid JSON with command=bun, args includes bin/cli.ts mcp |

## Validation Map

| Requirement | Task | UAT | Command | Status |
|-------------|------|-----|---------|--------|
| AC-1: `bun run bin/cli.ts start` boots daemon + UI on 8420 | task-1 (cli.ts), task-5 (verify) | U-4 (interactive) | `bun run spacebridge/bin/cli.ts start && curl localhost:8420` | planned |
| AC-2: `bun run bin/cli.ts stop` sends SIGTERM, daemon shuts down | task-1 (cli.ts), task-5 (verify) | U-6 (interactive) | `bun run spacebridge/bin/cli.ts stop` | planned |
| AC-3: `bun run bin/cli.ts status` prints PID/uptime/sessions | task-1 (cli.ts), task-5 (verify) | U-5 (interactive) | `bun run spacebridge/bin/cli.ts status` | planned |
| AC-4: `bun run bin/cli.ts mcp` starts MCP shim via autoForkDaemon | task-1 (cli.ts), task-5 (verify) | U-7 (interactive) | `bun run spacebridge/bin/cli.ts mcp` | planned |
| AC-5: `bun run bin/cli.ts share` prints stub message | task-1 (cli.ts), task-5 (verify) | U-2 (cli) | `bun run spacebridge/bin/cli.ts share` | planned |
| AC-6: `scripts/build.sh` produces standalone with server.js + static | task-3 (build.sh), task-5 (verify) | U-9 (interactive) | `spacebridge/scripts/build.sh` | planned |
| AC-7: Plugin install makes `spacebridge` MCP available | task-4 (plugin.json), task-5 (verify) | U-10 (cli) | JSON parse + field check | planned |
| Q-1 alignment: no global CLI registration | task-2 (auto-fork fix) | — | `grep SPACEBRIDGE_DEV spacebridge/src/daemon/auto-fork.ts` returns empty | planned |

## Stage Report: plan

- [x] Research findings produced (## Research Findings with 5 domains)
  5 domains: Upstream Constraints, Existing Patterns, Library/API Surface, Known Gotchas, Reference Examples
- [x] PLAN produced (## PLAN with per-task attributes)
  6 tasks (task-0 through task-5), 4 waves, each task has model/wave/read_first/action/acceptance_criteria/files_modified
- [x] UAT Spec produced (## UAT Spec with items classified by type)
  10 items: 4 cli, 5 interactive, 1 cli (plugin). CLI items auto-testable, interactive items require running daemon
- [x] Validation Map produced (## Validation Map linking requirement -> task -> command -> status)
  8 rows covering all 7 acceptance criteria + Q-1 alignment
- [x] Plan-checker pass within <=3 iterations
  Self-review pass 1: verified task dependencies (wave ordering correct), file coverage (4 files + tests match explore mapping), AC traceability (all 7 ACs mapped), auto-fork gotcha caught (research finding #4 → task-2)
- [x] workflow-index append called
  5 file contracts appended to CONTRACTS.md: spacebridge/.claude-plugin/plugin.json, spacebridge/bin/cli.ts, spacebridge/scripts/build.sh, spacebridge/src/daemon/auto-fork.ts, spacebridge/src/daemon/auto-fork.test.ts
