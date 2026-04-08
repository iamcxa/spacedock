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

import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveEntity } from "./entity-resolver";
import { getComments, addComment, addReply, resolveComment } from "./comments";
import { parseSections, findSectionByHeading, replaceSection, removeSection } from "./snapshots";
import { parseEntity, updateFrontmatterFields, replaceBody } from "./frontmatter-io";
import { createPatch } from "diff";

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
  dbPath?: string;
  /** Override permission request timeout (ms). Default 120_000. Used in tests. */
  permissionTimeoutMs?: number;
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

  // Permission async infrastructure — tool-level (application) permission gate.
  // Separate from Claude Code system-level permission (notifications/claude/channel/permission).
  // Must be declared before createServer so onChannelMessage callback can reference it.
  const pendingPermissions = new Map<string, {
    resolve: (allowed: boolean) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  const dashboard = createServer({
    port: opts.port,
    hostname: "127.0.0.1",
    projectRoot: opts.projectRoot,
    staticDir: opts.staticDir,
    logFile: opts.logFile,
    dbPath: opts.dbPath,
    onChannelMessage: async (content, meta) => {
      try {
        if (meta?.type === "permission_response" && meta?.request_id) {
          const reqId = meta.request_id;
          if (reqId.startsWith("tool:")) {
            // Tool-level permission (application gate) — resolve waiting promise if still pending.
            // If timed out already, the entry is gone; silently ignore the late response.
            const pending = pendingPermissions.get(reqId);
            if (pending) {
              clearTimeout(pending.timer);
              pendingPermissions.delete(reqId);
              pending.resolve(content === "allow");
            }
            // else: timed out already — ignore, do NOT fall through to sendPermissionVerdict
          } else {
            // System-level permission (Claude Code tool approval)
            const behavior = content === "allow" ? "allow" : "deny";
            await sendPermissionVerdict(reqId, behavior as "allow" | "deny");
          }
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

  async function requestPermissionAndWait(
    toolName: string,
    description: string,
    diffPreview: string,
    timeoutMs = opts.permissionTimeoutMs ?? 120_000,
  ): Promise<boolean> {
    // Prefix with "tool:" so timed-out IDs can be distinguished from system-level IDs
    const requestId = "tool:" + randomUUID();
    dashboard.publishEvent({
      type: "permission_request",
      entity: "",
      stage: "",
      agent: "fo",
      timestamp: new Date().toISOString(),
      detail: JSON.stringify({
        request_id: requestId,
        tool_name: toolName,
        description,
        input_preview: diffPreview,
      }),
    });
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        pendingPermissions.delete(requestId);
        resolve(false);
      }, timeoutMs);
      pendingPermissions.set(requestId, { resolve, timer });
    });
  }

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
        {
          name: "get_comments",
          description: "Read the comment threads for an entity. Returns all comments including resolved ones.",
          inputSchema: {
            type: "object" as const,
            properties: {
              entity: { type: "string", description: "Entity slug" },
              workflow: { type: "string", description: "Optional workflow dir basename to disambiguate" },
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
              section_heading: { type: "string", description: "Optional section heading to attach the comment to" },
              workflow: { type: "string", description: "Optional workflow dir basename to disambiguate" },
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
              comment_id: { type: "string", description: "ID of the comment to reply to" },
              content: { type: "string", description: "Reply content" },
              resolve: { type: "boolean", description: "Mark the comment as resolved after replying" },
              workflow: { type: "string", description: "Optional workflow dir basename to disambiguate" },
            },
            required: ["entity", "comment_id", "content"],
          },
        },
        {
          name: "update_entity",
          description:
            "Update an entity spec. Three modes (body and sections are mutually exclusive): " +
            "(A) frontmatter — partial key merge, no permission needed; " +
            "(B) body — full body replacement, requires captain approval; " +
            "(C) sections — heading-targeted replace/append/remove, remove requires captain approval. " +
            "Every update creates a snapshot version.",
          inputSchema: {
            type: "object" as const,
            properties: {
              entity: { type: "string", description: "Entity slug" },
              reason: { type: "string", description: "Reason for the update (recorded in snapshot)" },
              workflow: { type: "string", description: "Optional workflow dir basename to disambiguate" },
              frontmatter: {
                type: "object",
                description: "Partial frontmatter fields to merge (Mode A). Values are coerced to strings when written.",
                additionalProperties: true,
              },
              body: { type: "string", description: "Full replacement body (Mode B, requires permission)" },
              sections: {
                type: "array",
                description: "Section operations (Mode C)",
                items: {
                  type: "object",
                  properties: {
                    heading: { type: "string", description: "Target section heading (fuzzy match)" },
                    action: { type: "string", enum: ["replace", "append", "remove"] },
                    content: { type: "string", description: "New content for replace/append" },
                  },
                  required: ["heading", "action"],
                },
              },
            },
            required: ["entity", "reason"],
          },
        },
      ],
    };
  });

  mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments as Record<string, unknown>;

    if (name === "reply") {
      const event: AgentEvent = {
        type: "channel_response",
        entity: (args.entity as string | undefined) ?? "",
        stage: "",
        agent: "fo",
        timestamp: new Date().toISOString(),
        detail: args.content as string,
      };
      dashboard.publishEvent(event);
      return { content: [{ type: "text", text: "Message sent to dashboard" }] };
    }

    if (name === "get_comments") {
      try {
        const filepath = resolveEntity(args.entity as string, opts.projectRoot, args.workflow as string | undefined);
        const thread = getComments(filepath);
        return { content: [{ type: "text", text: JSON.stringify(thread) }] };
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true };
      }
    }

    if (name === "add_comment") {
      try {
        const slug = args.entity as string;
        const filepath = resolveEntity(slug, opts.projectRoot, args.workflow as string | undefined);
        const comment = addComment(filepath, {
          selected_text: "",
          section_heading: (args.section_heading as string | undefined) ?? "",
          content: args.content as string,
          author: "fo",
        });
        dashboard.publishEvent({
          type: "comment",
          entity: slug,
          stage: "",
          agent: "fo",
          timestamp: new Date().toISOString(),
          detail: comment.content,
        });
        return { content: [{ type: "text", text: JSON.stringify(comment) }] };
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true };
      }
    }

    if (name === "reply_to_comment") {
      try {
        const slug = args.entity as string;
        const filepath = resolveEntity(slug, opts.projectRoot, args.workflow as string | undefined);
        const reply = addReply(filepath, args.comment_id as string, {
          content: args.content as string,
          author: "fo",
        });
        const resolved = args.resolve === true;
        if (resolved) {
          resolveComment(filepath, args.comment_id as string);
        }
        dashboard.publishEvent({
          type: "comment",
          entity: slug,
          stage: "",
          agent: "fo",
          timestamp: new Date().toISOString(),
          detail: reply.content,
        });
        return { content: [{ type: "text", text: JSON.stringify({ reply, resolved }) }] };
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true };
      }
    }

    if (name === "update_entity") {
      try {
        const slug = args.entity as string;
        const reason = args.reason as string;
        const filepath = resolveEntity(slug, opts.projectRoot, args.workflow as string | undefined);
        const hasFrontmatter = args.frontmatter != null;
        const hasBody = args.body != null;
        const hasSections = Array.isArray(args.sections) && (args.sections as unknown[]).length > 0;

        if (hasBody && hasSections) {
          return { content: [{ type: "text", text: "body and sections are mutually exclusive" }], isError: true };
        }

        const fileText = readFileSync(filepath, "utf-8");
        const parsed = parseEntity(fileText);
        let workingText = fileText;

        // Mode A: frontmatter merge (no permission needed)
        if (hasFrontmatter) {
          workingText = updateFrontmatterFields(workingText, args.frontmatter as Record<string, string>);
        }

        // Mode B: full body replacement (requires permission)
        if (hasBody) {
          const newBody = args.body as string;
          const diffPreview = createPatch("entity", parsed.body, newBody, "current", "proposed");
          const allowed = await requestPermissionAndWait("update_entity", `Replace body of ${slug}`, diffPreview);
          if (!allowed) {
            return { content: [{ type: "text", text: "Permission denied or timed out" }], isError: true };
          }
          // C1: snapshot PRE-write state for rollback
          const snap = dashboard.snapshotStore.createSnapshot({
            entity: slug,
            body: parsed.body,
            frontmatter: parsed.frontmatter,
            author: "fo",
            reason: `pre-update: ${reason}`,
            source: "update",
          });
          workingText = replaceBody(workingText, newBody);
          writeFileSync(filepath, workingText);
          const autoResolved = autoResolveComments(filepath, slug, new Set<string>(), snap.version);
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, new_version: snap.version, warning: null, auto_resolved_comments: autoResolved }) }] };
        }

        // Mode C: section operations
        if (hasSections) {
          type SectionOp = { heading: string; action: "replace" | "append" | "remove"; content?: string };
          const ops = args.sections as SectionOp[];
          const modifiedHeadings = new Set<string>();

          for (const op of ops) {
            const currentParsed = parseEntity(workingText);
            const sections = parseSections(currentParsed.body);
            const section = findSectionByHeading(sections, op.heading);
            if (!section) {
              return { content: [{ type: "text", text: `Section not found: ${op.heading}` }], isError: true };
            }

            if (op.action === "remove") {
              // W3: meaningful diff preview showing what will be removed
              const sectionLines = currentParsed.body.split("\n").slice(section.start, section.end).join("\n");
              const diffPreview = createPatch(section.heading, sectionLines, "", "current", "removed");
              const allowed = await requestPermissionAndWait("update_entity", `Remove section "${section.heading}" from ${slug}`, diffPreview);
              if (!allowed) {
                return { content: [{ type: "text", text: `Permission denied or timed out for section remove: ${section.heading}` }], isError: true };
              }
              workingText = replaceBody(workingText, removeSection(currentParsed.body, section));
            } else if (op.action === "replace") {
              const newBody = replaceSection(currentParsed.body, section, op.content ?? "");
              workingText = replaceBody(workingText, newBody);
            } else if (op.action === "append") {
              const appended = section.body ? section.body + "\n" + (op.content ?? "") : (op.content ?? "");
              const newBody = replaceSection(currentParsed.body, section, appended);
              workingText = replaceBody(workingText, newBody);
            }
            // W2: normalize heading for auto-resolve matching
            modifiedHeadings.add(normHeading(section.heading));
          }

          // C1: snapshot PRE-write state for rollback
          const snap = dashboard.snapshotStore.createSnapshot({
            entity: slug,
            body: parsed.body,
            frontmatter: parsed.frontmatter,
            author: "fo",
            reason: `pre-update: ${reason}`,
            source: "update",
          });
          writeFileSync(filepath, workingText);
          const autoResolved = autoResolveComments(filepath, slug, modifiedHeadings, snap.version);
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, new_version: snap.version, warning: null, auto_resolved_comments: autoResolved }) }] };
        }

        // Mode A only (frontmatter with no body/sections)
        if (hasFrontmatter) {
          // C1: snapshot PRE-write state for rollback
          const snap = dashboard.snapshotStore.createSnapshot({
            entity: slug,
            body: parsed.body,
            frontmatter: parsed.frontmatter,
            author: "fo",
            reason: `pre-update: ${reason}`,
            source: "update",
          });
          writeFileSync(filepath, workingText);
          return { content: [{ type: "text", text: JSON.stringify({ ok: true, new_version: snap.version, warning: null, auto_resolved_comments: [] }) }] };
        }

        return { content: [{ type: "text", text: "No update fields provided (frontmatter, body, or sections required)" }], isError: true };
      } catch (err) {
        return { content: [{ type: "text", text: (err as Error).message }], isError: true };
      }
    }

    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  });

  // Normalize a heading string for comparison: strip ATX prefix and lowercase.
  // parseSections() returns "## Spec"; comments store "Spec" — both normalize to "spec".
  function normHeading(h: string): string {
    return h.replace(/^#+\s*/, "").trim().toLowerCase();
  }

  // Auto-resolve comments whose section_heading matches any of the modified section headings.
  function autoResolveComments(filepath: string, slug: string, modifiedHeadings: Set<string>, snapVersion?: number): string[] {
    const resolved: string[] = [];
    try {
      const thread = getComments(filepath);
      for (const comment of thread.comments) {
        if (!comment.resolved && modifiedHeadings.has(normHeading(comment.section_heading))) {
          resolveComment(filepath, comment.id, { reason: "section_updated", version: snapVersion });
          resolved.push(comment.id);
          dashboard.publishEvent({
            type: "comment",
            entity: slug,
            stage: "",
            agent: "fo",
            timestamp: new Date().toISOString(),
            detail: `auto-resolved: ${comment.id}`,
          });
        }
      }
    } catch {
      // If no sidecar exists, no comments to resolve
    }
    return resolved;
  }

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
