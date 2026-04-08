import { realpathSync, existsSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep, dirname } from "node:path";
import { parseArgs } from "node:util";
import { discoverWorkflows, aggregateWorkflow } from "./discovery";
import { getEntityDetail, updateScore, updateTags, filterEntities } from "./api";
import {
  getComments,
  addComment,
  addSuggestion,
  resolveComment,
  acceptSuggestion as acceptSuggestionAction,
  rejectSuggestion as rejectSuggestionAction,
  addReply,
} from "./comments";
import { EventBuffer } from "./events";
import { ShareRegistry } from "./auth";
import { openDb } from "./db";
import type { AgentEvent, AgentEventType, Stage } from "./types";
import { telemetryInit, captureException, getPosthogJsConfig } from "./telemetry";
import { updateWorkflowStages } from "./frontmatter-io";

interface ServerOptions {
  port: number;
  hostname: string;
  projectRoot: string;
  staticDir?: string;
  logFile?: string;
  dbPath?: string;  // defaults to ~/.spacedock/dashboard.db
  onChannelMessage?: (content: string, meta?: Record<string, string>) => void;
}

function validatePath(filepath: string, projectRoot: string): boolean {
  try {
    const resolved = realpathSync(filepath);
    const root = realpathSync(projectRoot);
    return resolved === root || resolved.startsWith(root + sep);
  } catch {
    return false;
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function createServer(opts: ServerOptions) {
  const { projectRoot, logFile } = opts;
  const staticDir = opts.staticDir ?? join(dirname(import.meta.dir), "static");
  const db = openDb(opts.dbPath);
  const eventBuffer = new EventBuffer(db, 500);
  const shareRegistry = new ShareRegistry(db);

  telemetryInit();

  function logRequest(req: Request, status: number) {
    if (!logFile) return;
    const now = new Date().toISOString();
    const line = `${now} - ${req.method} ${new URL(req.url).pathname} ${status}\n`;
    appendFileSync(logFile, line);
  }

  const server = Bun.serve({
    port: opts.port,
    hostname: opts.hostname,
    routes: {
      "/api/workflows": {
        GET: (req) => {
          try {
            const workflows = discoverWorkflows(projectRoot);
            const result = workflows
              .map((wf) => aggregateWorkflow(wf.dir))
              .filter((d): d is NonNullable<typeof d> => d !== null);
            logRequest(req, 200);
            return jsonResponse(result);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/detail": {
        GET: (req) => {
          const url = new URL(req.url);
          const filepath = url.searchParams.get("path");
          if (!filepath) {
            logRequest(req, 400);
            return jsonResponse({ error: "path required" }, 400);
          }
          if (!validatePath(filepath, projectRoot)) {
            logRequest(req, 403);
            return jsonResponse({ error: "Forbidden" }, 403);
          }
          try {
            const data = getEntityDetail(filepath);
            logRequest(req, 200);
            return jsonResponse(data);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entities": {
        GET: (req) => {
          const url = new URL(req.url);
          const directory = url.searchParams.get("dir") ?? ".";
          if (!validatePath(directory, projectRoot)) {
            logRequest(req, 403);
            return jsonResponse({ error: "Forbidden" }, 403);
          }
          try {
            const status = url.searchParams.get("status") ?? undefined;
            const tag = url.searchParams.get("tag") ?? undefined;
            const minScoreStr = url.searchParams.get("min_score");
            const maxScoreStr = url.searchParams.get("max_score");
            const results = filterEntities(directory, {
              status: status || null,
              tag: tag || null,
              min_score: minScoreStr ? parseFloat(minScoreStr) : null,
              max_score: maxScoreStr ? parseFloat(maxScoreStr) : null,
            });
            logRequest(req, 200);
            return jsonResponse(results);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/score": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; score: number };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            updateScore(body.path, body.score);
            logRequest(req, 200);
            return jsonResponse({ ok: true });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/tags": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; tags: string[] };
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            updateTags(body.path, body.tags);
            logRequest(req, 200);
            return jsonResponse({ ok: true });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/comments": {
        GET: (req) => {
          const url = new URL(req.url);
          const filepath = url.searchParams.get("path");
          if (!filepath) {
            logRequest(req, 400);
            return jsonResponse({ error: "path required" }, 400);
          }
          if (!validatePath(filepath, projectRoot)) {
            logRequest(req, 403);
            return jsonResponse({ error: "Forbidden" }, 403);
          }
          try {
            const thread = getComments(filepath);
            logRequest(req, 200);
            return jsonResponse(thread);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/comment": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              path: string;
              selected_text: string;
              section_heading: string;
              content: string;
            };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.selected_text) return jsonResponse({ error: "Missing field: selected_text" }, 400);
            if (typeof body.section_heading !== "string") return jsonResponse({ error: "Missing field: section_heading" }, 400);
            if (!body.content) return jsonResponse({ error: "Missing field: content" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const comment = addComment(body.path, {
              selected_text: body.selected_text,
              section_heading: body.section_heading,
              content: body.content,
            });
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: comment.content,
            });
            logRequest(req, 200);
            return jsonResponse(comment);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/comment/reply": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              path: string;
              comment_id: string;
              content: string;
              author?: "captain" | "fo" | "guest";
            };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!body.content) return jsonResponse({ error: "Missing field: content" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const reply = addReply(body.path, body.comment_id, {
              content: body.content,
              author: body.author ?? "captain",
            });
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: body.author ?? "captain",
              timestamp: new Date().toISOString(),
              detail: reply.content,
            });
            logRequest(req, 200);
            return jsonResponse(reply);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/comment/resolve": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; comment_id: string };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const comment = resolveComment(body.path, body.comment_id);
            // Broadcast comment event for realtime updates
            const entitySlug = body.path.replace(/\.md$/, "").split("/").pop()!;
            publishEvent({
              type: "comment",
              entity: entitySlug,
              stage: "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: "resolved",
            });
            logRequest(req, 200);
            return jsonResponse(comment);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/gate/decision": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              entity_path: string;
              entity_slug: string;
              stage: string;
              decision: string;
            };
            if (!body.entity_path || !body.entity_slug || !body.stage || !body.decision) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required fields: entity_path, entity_slug, stage, decision" }, 400);
            }
            if (body.decision !== "approved" && body.decision !== "changes_requested") {
              logRequest(req, 400);
              return jsonResponse({ error: "Invalid decision: must be 'approved' or 'changes_requested'" }, 400);
            }
            if (!validatePath(body.entity_path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            // Record gate_decision event in activity feed
            const event: AgentEvent = {
              type: "gate_decision",
              entity: body.entity_slug,
              stage: body.stage,
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: body.decision,
            };
            const seq = publishEvent(event);
            // Forward gate decision to FO via channel
            if (opts.onChannelMessage) {
              const content = body.decision === "approved"
                ? `Gate approved for ${body.entity_slug} at stage "${body.stage}"`
                : `Changes requested for ${body.entity_slug} at stage "${body.stage}"`;
              opts.onChannelMessage(content, {
                type: "gate_decision",
                decision: body.decision,
                entity_path: body.entity_path,
                entity_slug: body.entity_slug,
                stage: body.stage,
              });
            }
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/suggestion": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              path: string;
              comment_id: string;
              diff_from: string;
              diff_to: string;
            };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!body.diff_from) return jsonResponse({ error: "Missing field: diff_from" }, 400);
            if (!body.diff_to) return jsonResponse({ error: "Missing field: diff_to" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const suggestion = addSuggestion(body.path, {
              comment_id: body.comment_id,
              diff_from: body.diff_from,
              diff_to: body.diff_to,
            });
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/suggestion/accept": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; comment_id: string; suggestion_id: string };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!body.suggestion_id) return jsonResponse({ error: "Missing field: suggestion_id" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const suggestion = acceptSuggestionAction(body.path, body.suggestion_id);
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            if (err instanceof Error && err.message.includes("not found")) {
              if (err.message.includes("Text not found in entity body")) {
                logRequest(req, 409);
                return jsonResponse({ error: "Conflict: " + err.message }, 409);
              }
              logRequest(req, 404);
              return jsonResponse({ error: err.message }, 404);
            }
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/entity/suggestion/reject": {
        POST: async (req) => {
          try {
            const body = await req.json() as { path: string; comment_id: string; suggestion_id: string };
            if (!body.path) return jsonResponse({ error: "Missing field: path" }, 400);
            if (!body.comment_id) return jsonResponse({ error: "Missing field: comment_id" }, 400);
            if (!body.suggestion_id) return jsonResponse({ error: "Missing field: suggestion_id" }, 400);
            if (!validatePath(body.path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const suggestion = rejectSuggestionAction(body.path, body.suggestion_id);
            logRequest(req, 200);
            return jsonResponse(suggestion);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/config": {
        GET: (req) => {
          const posthog = getPosthogJsConfig();
          logRequest(req, 200);
          return jsonResponse({ posthog });
        },
      },
      "/api/events": {
        GET: (req) => {
          const url = new URL(req.url);
          const sinceStr = url.searchParams.get("since");
          const since = sinceStr ? parseInt(sinceStr, 10) : 0;
          const events = since > 0 ? eventBuffer.getSince(since) : eventBuffer.getAll();
          logRequest(req, 200);
          return jsonResponse({ events });
        },
        POST: async (req) => {
          const body = await req.json() as Record<string, unknown>;
          const required = ["type", "entity", "stage", "agent", "timestamp"];
          for (const field of required) {
            if (!body[field]) {
              logRequest(req, 400);
              return jsonResponse({ error: `Missing required field: ${field}` }, 400);
            }
          }
          try {
            const seq = publishEvent(body as unknown as AgentEvent);
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq });
          } catch (e: any) {
            logRequest(req, 400);
            return jsonResponse({ error: e.message }, 400);
          }
        },
        DELETE: (req) => {
          eventBuffer.clear();
          logRequest(req, 200);
          return jsonResponse({ ok: true });
        },
      },
      "/api/channel/send": {
        POST: async (req) => {
          try {
            const body = await req.json() as { content?: string; meta?: Record<string, string> };
            if (!body.content) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required field: content" }, 400);
            }
            const metaType = body.meta?.type;
            const eventType: AgentEventType = metaType === "permission_response"
              ? "permission_response"
              : "channel_message";
            const event: AgentEvent = {
              type: eventType,
              entity: body.meta?.entity ?? "",
              stage: body.meta?.stage ?? "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: body.content,
            };
            const seq = publishEvent(event);
            if (opts.onChannelMessage) {
              opts.onChannelMessage(body.content, body.meta);
            }
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/workflow/readme": {
        GET: (req) => {
          const url = new URL(req.url);
          const dir = url.searchParams.get("dir");
          if (!dir) {
            logRequest(req, 400);
            return jsonResponse({ error: "dir required" }, 400);
          }
          if (!validatePath(dir, projectRoot)) {
            logRequest(req, 403);
            return jsonResponse({ error: "Forbidden" }, 403);
          }
          const readmePath = join(dir, "README.md");
          if (!existsSync(readmePath)) {
            logRequest(req, 404);
            return jsonResponse({ error: "README.md not found" }, 404);
          }
          logRequest(req, 200);
          return jsonResponse({ path: readmePath });
        },
      },
      "/api/workflow/stages": {
        POST: async (req) => {
          try {
            const body = await req.json() as { dir: string; stages: Stage[] };
            if (!body.dir || !Array.isArray(body.stages)) {
              logRequest(req, 400);
              return jsonResponse({ error: "dir and stages[] required" }, 400);
            }
            const invalidName = body.stages.find(
              (s) => !s.name || typeof s.name !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(s.name)
            );
            if (invalidName) {
              logRequest(req, 400);
              return jsonResponse({ error: `Invalid stage name: ${invalidName.name ?? "(empty)"}` }, 400);
            }
            const stageNames = new Set(body.stages.map((s) => s.name));
            const boolFields = ["gate", "terminal", "initial", "conditional", "worktree"] as const;
            for (const s of body.stages) {
              for (const bf of boolFields) {
                if (bf in s && typeof s[bf] !== "boolean") {
                  logRequest(req, 400);
                  return jsonResponse({ error: `Stage '${s.name}': field '${bf}' must be a boolean` }, 400);
                }
              }
              if (s.feedback_to && !stageNames.has(s.feedback_to)) {
                logRequest(req, 400);
                return jsonResponse({ error: `Stage '${s.name}': feedback_to target '${s.feedback_to}' does not exist` }, 400);
              }
              if ("concurrency" in s && (typeof s.concurrency !== "number" || s.concurrency <= 0)) {
                logRequest(req, 400);
                return jsonResponse({ error: `Stage '${s.name}': concurrency must be a number > 0` }, 400);
              }
            }
            if (!validatePath(body.dir, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            const readmePath = join(body.dir, "README.md");
            if (!existsSync(readmePath)) {
              logRequest(req, 404);
              return jsonResponse({ error: "README.md not found" }, 404);
            }
            const text = readFileSync(readmePath, "utf-8");
            const updated = updateWorkflowStages(text, body.stages);
            writeFileSync(readmePath, updated);
            logRequest(req, 200);
            return jsonResponse({ ok: true });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/detail": {
        GET: (req) => {
          const filepath = join(staticDir, "detail.html");
          if (!existsSync(filepath)) {
            logRequest(req, 404);
            return new Response("Not Found", { status: 404 });
          }
          logRequest(req, 200);
          return new Response(Bun.file(filepath));
        },
      },
      "/api/share": {
        POST: async (req) => {
          try {
            const body = await req.json() as {
              password?: string;
              entityPaths?: string[];
              stages?: string[];
              label?: string;
              ttlHours?: number;
            };
            if (!body.password) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required field: password" }, 400);
            }
            if (!body.entityPaths || body.entityPaths.length === 0) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required field: entityPaths (must be non-empty)" }, 400);
            }
            const link = await shareRegistry.create({
              password: body.password,
              entityPaths: body.entityPaths,
              stages: body.stages ?? [],
              label: body.label ?? "Share Link",
              ttlHours: body.ttlHours ?? 24,
            });
            // Publish share_created event
            const event: AgentEvent = {
              type: "share_created",
              entity: link.label,
              stage: "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: `Share link created: ${link.label} (${link.entityPaths.length} entities, expires ${link.expiresAt})`,
            };
            publishEvent(event);
            // Return link WITHOUT passwordHash
            const { passwordHash, ...safeLink } = link;
            logRequest(req, 200);
            return jsonResponse(safeLink);
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        },
      },
      "/api/share/list": {
        GET: (req) => {
          const links = shareRegistry.list().map(({ passwordHash, ...rest }) => rest);
          logRequest(req, 200);
          return jsonResponse({ links });
        },
      },
      "/": {
        GET: (req) => {
          const filepath = join(staticDir, "index.html");
          logRequest(req, 200);
          return new Response(Bun.file(filepath));
        },
      },
    },
    websocket: {
      open(ws) {
        const wsData = ws.data as { shareToken?: string; entityPaths?: string[] } | undefined;
        if (wsData?.shareToken) {
          // Scoped share WebSocket -- subscribe to per-token topic
          ws.subscribe(`share:${wsData.shareToken}`);
          // Replay only scoped events
          const entitySlugs = new Set(
            (wsData.entityPaths ?? []).map((p: string) =>
              p.replace(/\.md$/, "").split("/").pop()!
            )
          );
          const events = eventBuffer.getAll().filter(
            (e) => entitySlugs.has(e.event.entity)
          );
          ws.send(JSON.stringify({ type: "replay", events }));
        } else {
          ws.subscribe("activity");
          const events = eventBuffer.getAll();
          ws.send(JSON.stringify({ type: "replay", events }));
          ws.send(JSON.stringify({ type: "channel_status", connected: channelConnected }));
        }
      },
      message(_ws, message) {
        try {
          const data = JSON.parse(String(message)) as {
            type?: string;
            content?: string;
            meta?: Record<string, string>;
          };
          if (data.type === "channel_send" && data.content) {
            const metaType = data.meta?.type;
            const eventType: AgentEventType = metaType === "permission_response"
              ? "permission_response"
              : "channel_message";
            const event: AgentEvent = {
              type: eventType,
              entity: data.meta?.entity ?? "",
              stage: data.meta?.stage ?? "",
              agent: "captain",
              timestamp: new Date().toISOString(),
              detail: data.content,
            };
            publishEvent(event);
            if (opts.onChannelMessage) {
              opts.onChannelMessage(data.content, data.meta);
            }
          }
        } catch {
          // Ignore malformed messages
        }
      },
      close(ws) {
        const wsData = ws.data as { shareToken?: string } | undefined;
        if (wsData?.shareToken) {
          ws.unsubscribe(`share:${wsData.shareToken}`);
        } else {
          ws.unsubscribe("activity");
        }
      },
    },
    async fetch(req) {
      try {
        // Fallback handler for static files and unmatched routes
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Scoped WebSocket for share links
        const shareWsMatch = pathname.match(/^\/ws\/share\/([a-f0-9]+)\/activity$/);
        if (shareWsMatch) {
          const token = shareWsMatch[1];
          const link = shareRegistry.get(token);
          if (!link) {
            logRequest(req, 403);
            return new Response("Share link not found or expired", { status: 403 });
          }
          const upgraded = server.upgrade(req, {
            data: { shareToken: token, entityPaths: link.entityPaths } as any,
          });
          if (upgraded) return undefined as any;
          logRequest(req, 400);
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // Handle WebSocket upgrade
        if (pathname === "/ws/activity") {
          const upgraded = server.upgrade(req);
          if (upgraded) return undefined as any;
          logRequest(req, 400);
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        // Share link dynamic routes
        const shareVerifyMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)\/verify$/);
        if (shareVerifyMatch && req.method === "POST") {
          const token = shareVerifyMatch[1];
          try {
            const body = await req.json() as { password?: string };
            if (!body.password) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required field: password" }, 400);
            }
            const link = shareRegistry.get(token);
            if (!link) {
              logRequest(req, 404);
              return jsonResponse({ error: "Share link not found or expired" }, 404);
            }
            const valid = await shareRegistry.verify(token, body.password);
            if (!valid) {
              logRequest(req, 401);
              return jsonResponse({ error: "Invalid password" }, 401);
            }
            const { passwordHash, ...scope } = link;
            logRequest(req, 200);
            return jsonResponse({ ok: true, scope });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        }

        const shareDeleteMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)$/);
        if (shareDeleteMatch && req.method === "DELETE") {
          const token = shareDeleteMatch[1];
          const deleted = shareRegistry.delete(token);
          if (!deleted) {
            logRequest(req, 404);
            return jsonResponse({ error: "Share link not found" }, 404);
          }
          logRequest(req, 200);
          return jsonResponse({ ok: true });
        }

        // Scoped share entity routes: /api/share/:token/entity/...
        const shareEntityMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)\/entity\/(.+)$/);
        if (shareEntityMatch) {
          const token = shareEntityMatch[1];
          const subRoute = shareEntityMatch[2];
          const link = shareRegistry.get(token);
          if (!link) {
            logRequest(req, 404);
            return jsonResponse({ error: "Share link not found or expired" }, 404);
          }

          if (subRoute === "detail" && req.method === "GET") {
            const filepath = url.searchParams.get("path");
            if (!filepath) {
              logRequest(req, 400);
              return jsonResponse({ error: "path required" }, 400);
            }
            if (!shareRegistry.isInScope(token, filepath)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Entity not in share scope" }, 403);
            }
            if (!validatePath(filepath, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            try {
              const data = getEntityDetail(filepath);
              logRequest(req, 200);
              return jsonResponse(data);
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              logRequest(req, 500);
              return jsonResponse({ error: "Internal server error" }, 500);
            }
          }

          if (subRoute === "comments" && req.method === "GET") {
            const filepath = url.searchParams.get("path");
            if (!filepath) {
              logRequest(req, 400);
              return jsonResponse({ error: "path required" }, 400);
            }
            if (!shareRegistry.isInScope(token, filepath)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Entity not in share scope" }, 403);
            }
            if (!validatePath(filepath, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            try {
              const thread = getComments(filepath);
              logRequest(req, 200);
              return jsonResponse(thread);
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              logRequest(req, 500);
              return jsonResponse({ error: "Internal server error" }, 500);
            }
          }

          if (subRoute === "comment" && req.method === "POST") {
            try {
              const body = await req.json() as {
                path: string;
                selected_text: string;
                section_heading: string;
                content: string;
              };
              if (!body.path || !body.selected_text || !body.content) {
                logRequest(req, 400);
                return jsonResponse({ error: "Missing required fields" }, 400);
              }
              if (!shareRegistry.isInScope(token, body.path)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Entity not in share scope" }, 403);
              }
              if (!validatePath(body.path, projectRoot)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Forbidden" }, 403);
              }
              const comment = addComment(body.path, {
                selected_text: body.selected_text,
                section_heading: body.section_heading,
                content: body.content,
                author: "guest",
              });
              logRequest(req, 200);
              return jsonResponse(comment);
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              logRequest(req, 500);
              return jsonResponse({ error: "Internal server error" }, 500);
            }
          }

          if (subRoute === "comment/reply" && req.method === "POST") {
            try {
              const body = await req.json() as {
                path: string;
                comment_id: string;
                content: string;
              };
              if (!body.path || !body.comment_id || !body.content) {
                logRequest(req, 400);
                return jsonResponse({ error: "Missing required fields" }, 400);
              }
              if (!shareRegistry.isInScope(token, body.path)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Entity not in share scope" }, 403);
              }
              if (!validatePath(body.path, projectRoot)) {
                logRequest(req, 403);
                return jsonResponse({ error: "Forbidden" }, 403);
              }
              const reply = addReply(body.path, body.comment_id, {
                content: body.content,
                author: "guest",
              });
              logRequest(req, 200);
              return jsonResponse(reply);
            } catch (err) {
              captureException(err instanceof Error ? err : new Error(String(err)));
              logRequest(req, 500);
              return jsonResponse({ error: "Internal server error" }, 500);
            }
          }
        }

        // Scoped share gate decision route: /api/share/:token/gate/decision
        const shareGateMatch = pathname.match(/^\/api\/share\/([a-f0-9]+)\/gate\/decision$/);
        if (shareGateMatch && req.method === "POST") {
          const token = shareGateMatch[1];
          const link = shareRegistry.get(token);
          if (!link) {
            logRequest(req, 404);
            return jsonResponse({ error: "Share link not found or expired" }, 404);
          }
          try {
            const body = await req.json() as {
              entity_path: string;
              decision: string;
              message?: string;
            };
            if (!body.entity_path || !body.decision) {
              logRequest(req, 400);
              return jsonResponse({ error: "Missing required fields: entity_path, decision" }, 400);
            }
            if (body.decision !== "approved" && body.decision !== "changes_requested") {
              logRequest(req, 400);
              return jsonResponse({ error: "Invalid decision: must be 'approved' or 'changes_requested'" }, 400);
            }
            if (!shareRegistry.isInScope(token, body.entity_path)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Entity not in share scope" }, 403);
            }
            if (!validatePath(body.entity_path, projectRoot)) {
              logRequest(req, 403);
              return jsonResponse({ error: "Forbidden" }, 403);
            }
            // Derive entity_slug and stage from entity detail
            const detail = getEntityDetail(body.entity_path);
            const pathParts = body.entity_path.split("/");
            const filename = pathParts[pathParts.length - 1];
            const entitySlug = filename.replace(/\.md$/, "");
            const stage = detail.frontmatter.status || "";

            // Record gate_decision event
            const event: AgentEvent = {
              type: "gate_decision",
              entity: entitySlug,
              stage,
              agent: "guest",
              timestamp: new Date().toISOString(),
              detail: body.decision,
            };
            const seq = publishEvent(event);

            // Forward gate decision to FO via channel
            if (opts.onChannelMessage) {
              const content = body.decision === "approved"
                ? `Gate approved for ${entitySlug} at stage "${stage}"`
                : `Changes requested for ${entitySlug} at stage "${stage}"`;
              opts.onChannelMessage(content, {
                type: "gate_decision",
                decision: body.decision,
                entity_path: body.entity_path,
                entity_slug: entitySlug,
                stage,
              });
            }
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq });
          } catch (err) {
            captureException(err instanceof Error ? err : new Error(String(err)));
            logRequest(req, 500);
            return jsonResponse({ error: "Internal server error" }, 500);
          }
        }

        // Serve share page for /share/:token
        const sharePageMatch = pathname.match(/^\/share\/[a-f0-9]+$/);
        if (sharePageMatch && req.method === "GET") {
          const shareHtml = join(staticDir, "share.html");
          if (existsSync(shareHtml)) {
            logRequest(req, 200);
            return new Response(Bun.file(shareHtml));
          }
          logRequest(req, 404);
          return new Response("Not Found", { status: 404 });
        }

        // Serve static files
        const filename = pathname.slice(1); // remove leading /
        if (filename) {
          const filepath = resolve(staticDir, filename);
          const realStaticDir = realpathSync(staticDir);
          try {
            const realFilepath = realpathSync(filepath);
            if (!realFilepath.startsWith(realStaticDir)) {
              logRequest(req, 403);
              return new Response("Forbidden", { status: 403 });
            }
          } catch {
            logRequest(req, 404);
            return new Response("Not Found", { status: 404 });
          }
          if (existsSync(filepath)) {
            logRequest(req, 200);
            return new Response(Bun.file(filepath));
          }
        }

        logRequest(req, 404);
        if (req.method === "POST") {
          return jsonResponse({ error: "Not found" }, 404);
        }
        return new Response("Not Found", { status: 404 });
      } catch (err) {
        captureException(err instanceof Error ? err : new Error(String(err)));
        logRequest(req, 500);
        return jsonResponse({ error: "Internal server error" }, 500);
      }
    },
  });

  function publishEvent(event: AgentEvent): number {
    const entry = eventBuffer.push(event);
    server.publish("activity", JSON.stringify({ type: "event", data: entry }));
    // Forward to scoped share topics
    for (const [token, link] of shareRegistry.entries()) {
      const entitySlugs = new Set(
        link.entityPaths.map((p) => p.replace(/\.md$/, "").split("/").pop()!)
      );
      if (entitySlugs.has(event.entity)) {
        server.publish(`share:${token}`, JSON.stringify({ type: "event", data: entry }));
      }
    }
    return entry.seq;
  }

  let channelConnected = false;
  function broadcastChannelStatus(connected: boolean) {
    channelConnected = connected;
    server.publish("activity", JSON.stringify({ type: "channel_status", connected }));
  }

  return Object.assign(server, { db, eventBuffer, publishEvent, broadcastChannelStatus, shareRegistry });
}

// CLI entry point -- only runs when executed directly
if (import.meta.main) {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      port: { type: "string", default: "8420" },
      host: { type: "string", default: "127.0.0.1" },
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

  const hostname = values.host!;
  const server = createServer({ port, hostname, projectRoot, staticDir, logFile });

  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Dashboard started on http://${hostname}:${server.port}/ (root: ${projectRoot})`;
  console.log(banner);
  if (logFile) {
    appendFileSync(logFile, banner + "\n");
  }
  console.log("Press Ctrl+C to stop.");
}
