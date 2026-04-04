import { realpathSync, existsSync, appendFileSync } from "node:fs";
import { join, resolve, sep, dirname } from "node:path";
import { parseArgs } from "node:util";
import { discoverWorkflows, aggregateWorkflow } from "./discovery";
import { getEntityDetail, updateScore, updateTags, filterEntities } from "./api";
import { EventBuffer } from "./events";
import type { AgentEvent } from "./types";
import { telemetryInit, captureException, getPosthogJsConfig } from "./telemetry";

interface ServerOptions {
  port: number;
  projectRoot: string;
  staticDir?: string;
  logFile?: string;
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
  const eventBuffer = new EventBuffer(500);

  telemetryInit();

  function logRequest(req: Request, status: number) {
    if (!logFile) return;
    const now = new Date().toISOString();
    const line = `${now} - ${req.method} ${new URL(req.url).pathname} ${status}\n`;
    appendFileSync(logFile, line);
  }

  const server = Bun.serve({
    port: opts.port,
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
            const entry = eventBuffer.push(body as unknown as AgentEvent);
            server.publish("activity", JSON.stringify({ type: "event", data: entry }));
            logRequest(req, 200);
            return jsonResponse({ ok: true, seq: entry.seq });
          } catch (e: any) {
            logRequest(req, 400);
            return jsonResponse({ error: e.message }, 400);
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
        ws.subscribe("activity");
        const events = eventBuffer.getAll();
        ws.send(JSON.stringify({ type: "replay", events }));
      },
      message(_ws, _message) {
        // Reserved for future bidirectional communication (gate approval)
      },
      close(ws) {
        ws.unsubscribe("activity");
      },
    },
    fetch(req) {
      try {
        // Fallback handler for static files and unmatched routes
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Handle WebSocket upgrade
        if (pathname === "/ws/activity") {
          const upgraded = server.upgrade(req);
          if (upgraded) return undefined as any;
          logRequest(req, 400);
          return new Response("WebSocket upgrade failed", { status: 400 });
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

  return server;
}

// CLI entry point -- only runs when executed directly
if (import.meta.main) {
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

  const server = createServer({ port, projectRoot, staticDir, logFile });

  const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] Spacedock Dashboard started on http://127.0.0.1:${server.port}/ (root: ${projectRoot})`;
  console.log(banner);
  if (logFile) {
    appendFileSync(logFile, banner + "\n");
  }
  console.log("Press Ctrl+C to stop.");
}
