import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createServer } from "./server";
import type { AgentEvent } from "./types";

const PermissionRequestNotificationSchema = z.object({
  method: z.literal("notifications/claude/channel/permission_request"),
  params: z.object({
    request_id: z.string(),
    tool_name: z.string(),
    description: z.string(),
    input_preview: z.string().optional(),
  }),
});

import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";

export function computeStateDir(projectRoot: string): string {
  const hash = createHash("sha1").update(projectRoot).digest("hex").slice(0, 8);
  return join(homedir(), ".spacedock", "dashboard", hash);
}

export function writeChannelState(stateDir: string, port: number): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "channel_port"), String(port) + "\n");
}

export function cleanChannelState(stateDir: string): void {
  const portFile = join(stateDir, "channel_port");
  if (existsSync(portFile)) {
    try { unlinkSync(portFile); } catch {}
  }
}

interface ChannelServerOptions {
  port: number;
  projectRoot: string;
  staticDir?: string;
  logFile?: string;
}

export function createChannelServer(opts: ChannelServerOptions) {
  const mcp = new Server(
    { name: "spacedock-dashboard", version: "0.1.0" },
    {
      capabilities: {
        experimental: {
          "claude/channel": {},
          "claude/channel/permission": {},
        },
        tools: {},
      },
    }
  );

  async function sendPermissionVerdict(requestId: string, behavior: "allow" | "deny") {
    await mcp.notification({
      method: "notifications/claude/channel/permission",
      params: { request_id: requestId, behavior },
    });
  }

  const dashboard = createServer({
    port: opts.port,
    hostname: "127.0.0.1",
    projectRoot: opts.projectRoot,
    staticDir: opts.staticDir,
    logFile: opts.logFile,
    onChannelMessage: async (content, meta) => {
      try {
        if (meta?.type === "permission_response" && meta?.request_id) {
          const behavior = content === "allow" ? "allow" : "deny";
          await sendPermissionVerdict(meta.request_id, behavior as "allow" | "deny");
        } else {
          // Forward message to FO session via MCP channel notification
          await mcp.notification({
            method: "notifications/claude/channel",
            params: { content, meta: meta ?? {} },
          });
        }
      } catch {
        // MCP transport not connected — message recorded in EventBuffer but not forwarded
      }
    },
  });

  // Register MCP tools — FO calls these to interact with the dashboard and entities
  mcp.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "reply",
          description:
            "Send a message to the captain via the Spacedock dashboard. " +
            "Use this to respond to captain messages, report gate results, " +
            "or provide status updates.",
          inputSchema: {
            type: "object" as const,
            properties: {
              content: {
                type: "string",
                description: "The message content to display in the dashboard",
              },
              entity: {
                type: "string",
                description: "Optional entity slug to scope the message to that entity's detail feed",
              },
            },
            required: ["content"],
          },
        },
      ],
    };
  });

  mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "reply") {
      const args = request.params.arguments as { content: string; entity?: string };
      const event: AgentEvent = {
        type: "channel_response",
        entity: args.entity ?? "",
        stage: "",
        agent: "fo",
        timestamp: new Date().toISOString(),
        detail: args.content,
      };
      dashboard.publishEvent(event);
      return { content: [{ type: "text", text: "Message sent to dashboard" }] };
    }
    return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
  });

  // Permission relay: Claude Code -> dashboard -> captain -> Claude Code
  mcp.setNotificationHandler(
    PermissionRequestNotificationSchema,
    async (notification) => {
      const params = notification.params;
      const event: AgentEvent = {
        type: "permission_request",
        entity: "",
        stage: "",
        agent: "claude",
        timestamp: new Date().toISOString(),
        detail: JSON.stringify(params),
      };
      dashboard.publishEvent(event);
    }
  );

  return { mcp, dashboard, sendPermissionVerdict };
}

// CLI entry point — only runs when executed directly (spawned by Claude Code)
if (import.meta.main) {
  const { parseArgs } = await import("node:util");
  const { resolve, join, dirname } = await import("node:path");

  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      port: { type: "string", default: "8420" },
      root: { type: "string" },
      "log-file": { type: "string" },
    },
    strict: true,
  });

  let projectRoot = values.root ?? null;
  if (!projectRoot) {
    try {
      const result = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"]);
      projectRoot = result.stdout.toString().trim();
    } catch {
      projectRoot = process.cwd();
    }
  }
  projectRoot = resolve(projectRoot);

  const port = parseInt(values.port!, 10);
  const staticDir = join(dirname(import.meta.dir), "static");
  const logFile = values["log-file"] ?? undefined;

  const { mcp, dashboard } = createChannelServer({
    port,
    projectRoot,
    staticDir,
    logFile,
  });

  // Connect MCP server to stdio for Claude Code communication
  const transport = new StdioServerTransport();
  await mcp.connect(transport);

  // Notify browser clients that channel is now active
  dashboard.broadcastChannelStatus(true);

  // Write channel state file so ctl.sh can detect this instance
  const stateDir = computeStateDir(projectRoot);
  writeChannelState(stateDir, dashboard.port);

  // Clean up state file on exit (graceful)
  const cleanup = () => {
    cleanChannelState(stateDir);
  };
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("exit", cleanup);

  // Update mcp.onclose to also clean state
  mcp.onclose = () => {
    dashboard.broadcastChannelStatus(false);
    cleanup();
  };

  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Channel started on http://127.0.0.1:${dashboard.port}/ (root: ${projectRoot})`;
  // Write to stderr (stdout is reserved for MCP stdio transport)
  console.error(banner);
}
