// spacebridge/bin/cli.ts
// ABOUTME: Unified CLI entry point for spacebridge.
// Thin wrapper that delegates daemon lifecycle (start/stop/status) to bin/daemon.ts,
// adds mcp subcommand via autoForkDaemon + real MCP stdio bridge (entity 099), and stubs share (entity 058).
// Users invoke via: bun run bin/cli.ts <subcommand>

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { autoForkDaemon } from "../src/daemon/auto-fork";
import { createSocketClient } from "../src/ipc/socket-client";
import type { IpcMessage } from "../src/ipc/types";

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
      "  start   Boot the spacebridge daemon (default port 6535, override with SPACEBRIDGE_PORT)\n" +
      "  stop    Send SIGTERM to the running daemon\n" +
      "  status  Print daemon PID, uptime, and session count\n" +
      "  mcp     Start MCP stdio shim (used by .mcp.json transport)\n" +
      "  share   Create tunnel for remote access (entity 058)\n",
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

    // ─── MCP stdio bridge (entity 099) ───────────────────────────────────────
    const sessionId = randomUUID();
    const projectRoot = process.env.SPACEBRIDGE_PROJECT_ROOT ?? process.cwd();

    const mcpServer = new Server(
      { name: "spacebridge", version: "0.1.0" },
      { capabilities: { tools: {} } },
    );

    // Forward action-push messages from daemon to MCP client as notifications
    function handleActionPush(msg: IpcMessage): void {
      const payload = msg.payload as { action?: string; [k: string]: unknown };
      if (payload.action === "captain_chat") {
        mcpServer
          .notification({
            method: "notifications/spacebridge/captain_message",
            params: payload,
          })
          .catch(() => {});
      } else if (payload.action === "gate_decided") {
        mcpServer
          .notification({
            method: "notifications/spacebridge/gate_decided",
            params: payload,
          })
          .catch(() => {});
      }
    }

    const client = createSocketClient({
      socketPath,
      sessionId,
      projectRoot,
      pid: process.pid,
      onPush: handleActionPush,
      reconnect: { maxRetries: 5 },
    });
    await client.connect();

    // Register empty tools list — 099b implements the 6 MCP tools
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [] }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
      throw new Error(
        `Tool "${req.params.name}" not implemented in 099 scope — see 099b (spacebridge-mcp-tool-parity)`,
      );
    });

    // Graceful shutdown
    const doShutdown = () => {
      client.close();
      mcpServer.close().catch(() => {}).finally(() => process.exit(0));
    };
    process.on("SIGTERM", doShutdown);
    process.on("SIGINT", doShutdown);

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    process.stderr.write(`spacebridge mcp: daemon ready at ${socketPath}\n`);
  } else if (subcommand === "share") {
    process.stderr.write("Not yet implemented — see entity 058\n");
    process.exit(0);
  } else {
    printUsage();
    process.exit(1);
  }
}
