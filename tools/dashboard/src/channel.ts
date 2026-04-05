import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

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

  const dashboard = createServer({
    port: opts.port,
    projectRoot: opts.projectRoot,
    staticDir: opts.staticDir,
    logFile: opts.logFile,
  });

  return { mcp, dashboard };
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

  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Channel started on http://127.0.0.1:${dashboard.port}/ (root: ${projectRoot})`;
  // Write to stderr (stdout is reserved for MCP stdio transport)
  console.error(banner);
}
