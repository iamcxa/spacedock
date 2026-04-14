// spacebridge/bin/cli.ts
// ABOUTME: Unified CLI entry point for spacebridge.
// Thin wrapper that delegates daemon lifecycle (start/stop/status) to bin/daemon.ts,
// adds mcp subcommand via autoForkDaemon, and stubs share (entity 058).
// Users invoke via: bun run bin/cli.ts <subcommand>

import { resolve, join } from "node:path";
import { autoForkDaemon } from "../src/daemon/auto-fork";
import { homedir } from "node:os";

// ─── State directory resolution ──────────────────────────────────────────────

function resolveStateDir(): string {
  return process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
}

// ─── Spawn daemon.ts subcommand and forward exit code ────────────────────────

async function spawnDaemon(subcommand: string): Promise<never> {
  const daemonPath = resolve(import.meta.dir, "daemon.ts");
  const proc = Bun.spawn(["bun", "run", daemonPath, subcommand], {
    stdio: ["inherit", "inherit", "inherit"],
  });
  const exitCode = await proc.exited;
  process.exit(exitCode);
}

// ─── Usage message ────────────────────────────────────────────────────────────

function printUsage(): void {
  process.stderr.write(
    "Usage: bun run bin/cli.ts <subcommand>\n" +
    "\n" +
    "Subcommands:\n" +
    "  start   Boot the spacebridge daemon (port 8420)\n" +
    "  stop    Send SIGTERM to the running daemon\n" +
    "  status  Print daemon PID, uptime, and session count\n" +
    "  mcp     Start MCP stdio shim (used by .mcp.json transport)\n" +
    "  share   Create tunnel for remote access (entity 058)\n"
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (import.meta.main) {
  const subcommand = Bun.argv[2];

  if (subcommand === "start") {
    await spawnDaemon("start");
  } else if (subcommand === "stop") {
    await spawnDaemon("stop");
  } else if (subcommand === "status") {
    await spawnDaemon("status");
  } else if (subcommand === "mcp") {
    const stateDir = resolveStateDir();
    const socketPath = join(stateDir, "spacebridge.sock");
    const lockPath = join(stateDir, "spacebridge.lock");
    const pidPath = join(stateDir, "spacebridge.pid");
    const daemonPath = resolve(import.meta.dir, "daemon.ts");

    await autoForkDaemon({
      socketPath,
      lockPath,
      pidPath,
      stateDir,
      daemonCmd: ["bun", "run", daemonPath, "start"],
    });

    // Daemon is running. The MCP stdio bridge wiring (SocketClient + ChannelProviderBridge)
    // is entity 053's scope — once entity 053 RPC routing is live, this subcommand will
    // pipe stdin/stdout as the MCP stdio transport. For now: confirm daemon is up.
    process.stderr.write("spacebridge mcp: daemon ready at " + socketPath + "\n");
    // Keep the process alive so CC stdio transport can connect
    await new Promise<void>(() => {});
  } else if (subcommand === "share") {
    process.stderr.write("Not yet implemented — see entity 058\n");
    process.exit(0);
  } else {
    printUsage();
    process.exit(1);
  }
}
