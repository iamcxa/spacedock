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
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
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
      {
        capabilities: {
          // CC-native channel capability — causes notifications/claude/channel to
          // be wrapped as <channel source="spacebridge" ...> tags injected into
          // Claude's conversation context, instead of being silently dropped as
          // unknown custom MCP notification methods. See
          // https://code.claude.com/docs/en/channels-reference
          experimental: { "claude/channel": {} },
          tools: {},
        },
        instructions:
          "Messages arrive as <channel source=\"spacebridge\" kind=\"captain_chat|captain_comment\" entity=\"...\" ...>. " +
          "They are the captain speaking to you through the spacebridge dashboard UI. " +
          "kind=captain_chat: general chat message. Treat as terminal input. " +
          "kind=captain_comment: inline comment on entity text. Includes section= and comment_id= attributes. " +
          "Content has [Selected text: \"...\"] and [Section: ...] context lines before the comment body. " +
          "Respond contextually: answer questions, make requested edits, or acknowledge. " +
          "To reply, use the mcp__spacebridge__reply_to_comment tool with entity and comment_id for threaded replies, " +
          "or mcp__spacebridge__reply for general responses.",
      },
    );

    // Forward action-push messages from daemon to MCP client as notifications.
    // Uses CC-native claude/channel method so messages appear in Claude's
    // context as <channel> tags, not dropped as unknown custom methods.
    function handleActionPush(msg: IpcMessage): void {
      const payload = msg.payload as { action?: string; [k: string]: unknown };
      if (payload.action === "captain_chat") {
        const content = String(payload.content ?? "");
        const meta: Record<string, string> = { kind: "captain_chat" };
        if (typeof payload.entity === "string" && payload.entity) meta.entity = payload.entity;
        if (typeof payload.messageId === "string") meta.message_id = payload.messageId;
        mcpServer
          .notification({
            method: "notifications/claude/channel",
            params: { content, meta },
          })
          .catch(() => {});
      } else if (payload.action === "captain_comment") {
        // Captain posted a comment on an entity — forward with full context
        const selectedText = String(payload.selectedText ?? "");
        const section = String(payload.sectionHeading ?? "");
        const commentContent = String(payload.content ?? "");
        const entity = String(payload.entity ?? "");

        // Build rich content string so Claude sees full context
        const parts: string[] = [];
        if (selectedText) parts.push(`[Selected text: "${selectedText}"]`);
        if (section) parts.push(`[Section: ${section}]`);
        parts.push(commentContent);
        const content = parts.join("\n");

        const meta: Record<string, string> = { kind: "captain_comment" };
        if (entity) meta.entity = entity;
        if (payload.commentId) meta.comment_id = String(payload.commentId);
        if (section) meta.section = section;
        mcpServer
          .notification({
            method: "notifications/claude/channel",
            params: { content, meta },
          })
          .catch(() => {});
      } else if (payload.action === "gate_decided") {
        const content = String(payload.summary ?? payload.verdict ?? "gate decided");
        const meta: Record<string, string> = { kind: "gate_decided" };
        if (typeof payload.entity === "string" && payload.entity) meta.entity = payload.entity;
        if (typeof payload.stage === "string" && payload.stage) meta.stage = payload.stage;
        if (typeof payload.verdict === "string") meta.verdict = payload.verdict;
        mcpServer
          .notification({
            method: "notifications/claude/channel",
            params: { content, meta },
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

    // ─── 099b MCP tools (5 of 6 — update_entity deferred) ───────────────────
    const daemonPort = process.env.SPACEBRIDGE_PORT ?? "6535";
    const apiBase = `http://localhost:${daemonPort}`;

    async function apiFetch(
      path: string,
      init?: { method?: string; body?: unknown },
    ): Promise<{ status: number; data: unknown }> {
      const resp = await fetch(`${apiBase}${path}`, {
        method: init?.method ?? "GET",
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      const text = await resp.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return { status: resp.status, data };
    }

    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "reply",
          description:
            "Send a message to the captain via the Spacebridge dashboard. Use this to respond to captain messages, report gate results, or provide status updates.",
          inputSchema: {
            type: "object" as const,
            properties: {
              content: { type: "string", description: "The message content to display in the dashboard" },
              entity: { type: "string", description: "Optional entity slug to scope the message" },
            },
            required: ["content"],
          },
        },
        {
          name: "get_comments",
          description: "Read the comment threads for an entity, grouped by section with replies nested.",
          inputSchema: {
            type: "object" as const,
            properties: {
              entity: { type: "string", description: "Entity slug" },
            },
            required: ["entity"],
          },
        },
        {
          name: "add_comment",
          description: "Post a comment on an entity. Optionally target a specific section heading.",
          inputSchema: {
            type: "object" as const,
            properties: {
              entity: { type: "string", description: "Entity slug" },
              content: { type: "string", description: "Comment content" },
              section_heading: { type: "string", description: "Optional section heading" },
              selected_text: { type: "string", description: "Optional selected text excerpt" },
            },
            required: ["entity", "content"],
          },
        },
        {
          name: "reply_to_comment",
          description: "Reply to a specific comment thread. Optionally resolve the thread in the same action.",
          inputSchema: {
            type: "object" as const,
            properties: {
              entity: { type: "string", description: "Entity slug" },
              comment_id: { type: "string", description: "Parent comment ID" },
              content: { type: "string", description: "Reply content" },
              resolve: { type: "boolean", description: "Mark the thread resolved after replying" },
            },
            required: ["entity", "comment_id", "content"],
          },
        },
        {
          name: "get_pending_messages",
          description:
            "Retrieve channel_message events since a given sequence number. Use after reconnecting the MCP transport to recover messages sent while disconnected.",
          inputSchema: {
            type: "object" as const,
            properties: {
              since_seq: { type: "number", description: "Return messages with seq > since_seq. Default 0." },
              entity: { type: "string", description: "Optional entity slug filter" },
            },
          },
        },
      ],
    }));

    mcpServer.setRequestHandler(CallToolRequestSchema, async (req) => {
      const name = req.params.name;
      const args = (req.params.arguments ?? {}) as Record<string, unknown>;

      try {
        if (name === "reply") {
          const r = await apiFetch("/api/channel/reply", {
            method: "POST",
            body: { content: args.content as string, entity: args.entity as string | undefined },
          });
          return { content: [{ type: "text", text: JSON.stringify(r.data) }], isError: r.status >= 400 };
        }

        if (name === "get_comments") {
          const slug = args.entity as string;
          const r = await apiFetch(`/api/entities/${encodeURIComponent(slug)}/comments`);
          return { content: [{ type: "text", text: JSON.stringify(r.data) }], isError: r.status >= 400 };
        }

        if (name === "add_comment") {
          const slug = args.entity as string;
          const r = await apiFetch(`/api/entities/${encodeURIComponent(slug)}/comments`, {
            method: "POST",
            body: {
              content: args.content as string,
              sectionHeading: (args.section_heading as string | undefined) ?? "",
              selectedText: (args.selected_text as string | undefined) ?? "",
              author: "fo",
            },
          });
          return { content: [{ type: "text", text: JSON.stringify(r.data) }], isError: r.status >= 400 };
        }

        if (name === "reply_to_comment") {
          const slug = args.entity as string;
          const commentId = args.comment_id as string;
          const r = await apiFetch(
            `/api/entities/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/reply`,
            {
              method: "POST",
              body: { content: args.content as string, author: "fo" },
            },
          );
          let resolvedResult: unknown = null;
          if (args.resolve === true && r.status < 400) {
            const resolveResp = await apiFetch(
              `/api/entities/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/resolve`,
              { method: "POST" },
            );
            resolvedResult = resolveResp.data;
          }
          return {
            content: [{ type: "text", text: JSON.stringify({ reply: r.data, resolve: resolvedResult }) }],
            isError: r.status >= 400,
          };
        }

        if (name === "get_pending_messages") {
          const sinceSeq = (args.since_seq as number | undefined) ?? 0;
          const entityFilter = (args.entity as string | undefined) ?? "";
          const query = new URLSearchParams({ since_seq: String(sinceSeq) });
          if (entityFilter) query.set("entity", entityFilter);
          const r = await apiFetch(`/api/channel/pending?${query.toString()}`);
          return { content: [{ type: "text", text: JSON.stringify(r.data) }], isError: r.status >= 400 };
        }

        if (name === "update_entity") {
          return {
            content: [
              {
                type: "text",
                text:
                  "update_entity deferred in 099b scope. Use the Edit tool directly on the entity file — spacebridge file-watcher will sync state to the dashboard. Full MCP parity tracked in a follow-up entity.",
              },
            ],
            isError: true,
          };
        }

        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Tool invocation error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    });

    // Graceful shutdown
    const doShutdown = () => {
      client.close();
      mcpServer
        .close()
        .catch(() => {})
        .finally(() => process.exit(0));
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
