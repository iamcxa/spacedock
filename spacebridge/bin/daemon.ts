// spacebridge/bin/daemon.ts
// ABOUTME: Daemon entry point with start/stop/status subcommand routing.
// Manages the spacebridge daemon process lifecycle: boots unix socket server (entity 051),
// writes PID file, handles graceful shutdown via SIGTERM/SIGINT.
// Called by shim auto-fork logic and by entity 059 CLI wrapper.

import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import * as net from "node:net";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { releaseLock } from "../src/daemon/lock";
import {
  resolveNextjsServerScript,
  shutdownNextjsChild,
  spawnNextjsChild,
} from "../src/daemon/nextjs-child";
import { isProcessAlive, readPidFile, writePidFile } from "../src/daemon/pid";
import { createDb } from "../src/db";
import { decide as chatDecide } from "../src/domain/chat/decider";
import { replay as chatReplay } from "../src/domain/chat/evolve";
import {
  appendEvents as chatAppendEvents,
  loadEvents as chatLoadEvents,
} from "../src/domain/chat/persistence";
import { parseCommand as parseChatCommand } from "../src/domain/chat/schemas";
import { decide as gateDecide } from "../src/domain/gate/decider";
import { GateAlreadyDecided } from "../src/domain/gate/errors";
import { replay as gateReplay } from "../src/domain/gate/evolve";
import {
  appendEvents as gateAppendEvents,
  loadEvents as gateLoadEvents,
} from "../src/domain/gate/persistence";
import { parseCommand as parseGateCommand } from "../src/domain/gate/schemas";
import { LeaseCommandSchema } from "../src/domain/lease/schemas";
import { createSessionRegistry } from "../src/domain/session/registry";
import { TokenManager } from "../src/domain/share/token-manager";
import { createCoordinationClientBridge } from "../src/ipc/coordination-client-bridge";
import { createSocketServer } from "../src/ipc/socket-server";
import type { RpcResponsePayload } from "../src/ipc/types";
import { detectProvider, installGuide } from "../src/tunnel/detect";
import type { TunnelProvider } from "../src/tunnel/provider";

// ─── State directory resolution ──────────────────────────────────────────────

function resolveStateDir(): string {
  // SPACEBRIDGE_STATE_DIR allows test isolation (never touches production ~/.spacedock)
  return process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
}

function resolvePort(): number {
  const envPort = process.env.SPACEBRIDGE_PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65536) return parsed;
    process.stderr.write(`[WARNING] Invalid SPACEBRIDGE_PORT="${envPort}", using default 6535\n`);
  }
  return 6535;
}

// ─── Startup timestamp for uptime tracking ───────────────────────────────────

// Module-level: runs once when daemon.ts is executed (always as daemon process)
const startedAt = Date.now();

// ─── start subcommand ────────────────────────────────────────────────────────

// ─── RPC handler registry types ──────────────────────────────────────────────

interface RpcCtx {
  db: ReturnType<typeof createDb>;
  server: ReturnType<typeof createSocketServer>;
  sessionRegistry: Awaited<ReturnType<typeof createSessionRegistry>>;
  tokenManager: TokenManager;
  getTunnelProvider: () => TunnelProvider | null;
  setTunnelProvider: (p: TunnelProvider | null) => void;
  getTunnelUrl: () => string | null;
  setTunnelUrl: (u: string | null) => void;
  startedAt: number;
  sessions: Map<string, { sessionId: string; registeredAt: number }>;
}

type RpcHandler = (args: unknown[], ctx: RpcCtx) => Promise<RpcResponsePayload>;

async function cmdStart(): Promise<void> {
  const stateDir = resolveStateDir();
  mkdirSync(stateDir, { recursive: true });

  const socketPath = join(stateDir, "spacebridge.sock");
  const pidPath = join(stateDir, "spacebridge.pid");

  // Session map for tracking connected shims
  const sessions = new Map<string, { sessionId: string; registeredAt: number }>();

  let autoStopTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleAutoStop(server: Awaited<ReturnType<typeof createSocketServer>>) {
    if (process.env.SPACEBRIDGE_AUTO_STOP !== "1") return;
    if (sessions.size > 0) return;
    // Give 200ms grace period to catch immediate reconnects
    autoStopTimer = setTimeout(async () => {
      if (sessions.size === 0) {
        process.stderr.write(`[${ts()}] spacebridge daemon auto-stopping (no sessions)\n`);
        await shutdown(server, pidPath, socketPath);
        process.exit(0);
      }
    }, 200);
  }

  const leaseDurationMs = Number(process.env.SPACEBRIDGE_LEASE_DURATION_MS) || 300_000;
  const janitorIntervalMs = Number(process.env.SPACEBRIDGE_JANITOR_INTERVAL_MS) || 30_000;

  const db = createDb(join(stateDir, "spacebridge.db"));

  // Share token manager (plain drizzle CRUD, entity 058)
  const tokenManager = new TokenManager(db);

  // Tunnel state (managed on-demand: start on first share_create, stop when no active tokens)
  let tunnelProvider: TunnelProvider | null = null;
  let tunnelUrl: string | null = null;

  // entityScanner: trivial stub returning [] for 056; entity 057 supplies DB-backed scanner
  const entityScanner = async () => [];

  const bridge = await createCoordinationClientBridge({ db, entityScanner, leaseDurationMs });
  const sessionRegistry = await createSessionRegistry({ db });

  let janitorTimer: ReturnType<typeof setInterval> | null = null;

  // ─── RPC handler registry ───────────────────────────────────────────────────

  const rpcHandlers = new Map<string, RpcHandler>();

  rpcHandlers.set("__status", async (_args, ctx) => ({
    result: {
      pid: process.pid,
      uptimeMs: Date.now() - startedAt,
      sessions: ctx.sessions.size,
    },
  }));

  rpcHandlers.set("share_create", async (args, ctx) => {
    const [entitySlug, ttlMs, tunnelBackend] = args as [string, number, string?];
    if (!entitySlug) return { error: "share_create requires entitySlug" };

    if (!ctx.getTunnelProvider() || !ctx.getTunnelUrl()) {
      try {
        const provider = detectProvider(tunnelBackend);
        if (!provider) return { error: `No tunnel provider available. ${installGuide()}` };
        ctx.setTunnelProvider(provider);
        const url = await provider.start(resolvePort());
        ctx.setTunnelUrl(url);
        process.stderr.write(`[${ts()}] tunnel started (${provider.name}): ${url}\n`);
      } catch (err) {
        ctx.setTunnelProvider(null);
        ctx.setTunnelUrl(null);
        return { error: `Failed to start tunnel: ${(err as Error).message}` };
      }
    }

    const shareToken = ctx.tokenManager.create({
      entitySlug,
      ttlMs: ttlMs ?? 7 * 24 * 60 * 60 * 1000,
    });
    const url = `${ctx.getTunnelUrl()}/share/${shareToken.token}`;
    return {
      result: { token: shareToken.token, url, entitySlug, expiresAt: shareToken.expiresAt },
    };
  });

  rpcHandlers.set("share_revoke", async (args, ctx) => {
    const [token] = args as [string];
    if (!token) return { error: "share_revoke requires token" };

    const revoked = ctx.tokenManager.revoke(token);
    const remaining = ctx.tokenManager.list();
    const provider = ctx.getTunnelProvider();
    if (remaining.length === 0 && provider) {
      process.stderr.write(`[${ts()}] no active share tokens — stopping tunnel\n`);
      await provider.stop();
      ctx.setTunnelProvider(null);
      ctx.setTunnelUrl(null);
    }
    return { result: { revoked } };
  });

  rpcHandlers.set("share_list", async (_args, ctx) => ({
    result: ctx.tokenManager.list(),
  }));

  rpcHandlers.set("captain_chat", async (args, ctx) => {
    let cmd: ReturnType<typeof parseChatCommand>;
    try {
      cmd = parseChatCommand(args[0]);
    } catch (err) {
      return { error: `Invalid captain_chat args: ${(err as Error).message}` };
    }
    if (cmd.type !== "send_captain_message") return { error: "Unexpected command type" };

    const targetSessionId = ctx.sessionRegistry.getActiveSessionByProjectRoot(cmd.projectRoot);
    if (!targetSessionId) {
      return { error: `No active CC session for project root: ${cmd.projectRoot}` };
    }

    const existingEvents = await chatLoadEvents(ctx.db, cmd.targetSessionId || targetSessionId);
    const state = chatReplay(existingEvents);
    const now = Date.now();
    const events = chatDecide({ ...cmd, targetSessionId }, state, now);
    await chatAppendEvents(ctx.db, targetSessionId, events, existingEvents.length + 1);

    const delivered = ctx.server.pushToSession(targetSessionId, {
      id: randomUUID(),
      type: "action-push",
      payload: {
        action: "captain_chat",
        messageId: cmd.messageId,
        content: cmd.content,
        sentAt: cmd.sentAt,
      },
    });

    return { result: { messageId: cmd.messageId, delivered } };
  });

  rpcHandlers.set("captain_comment", async (args, ctx) => {
    const arg = args[0] as {
      projectRoot?: string;
      entity?: string;
      commentId?: string;
      content?: string;
      selectedText?: string;
      sectionHeading?: string;
    };
    const projectRoot = arg.projectRoot ?? "";
    const targetSessionId = ctx.sessionRegistry.getActiveSessionByProjectRoot(projectRoot);
    if (!targetSessionId) {
      return { error: `No active CC session for project root: ${projectRoot}` };
    }

    const delivered = ctx.server.pushToSession(targetSessionId, {
      id: randomUUID(),
      type: "action-push",
      payload: {
        action: "captain_comment",
        entity: arg.entity ?? "",
        commentId: arg.commentId ?? "",
        content: arg.content ?? "",
        selectedText: arg.selectedText ?? "",
        sectionHeading: arg.sectionHeading ?? "",
      },
    });

    return { result: { delivered } };
  });

  rpcHandlers.set("gate_decide", async (args, ctx) => {
    let cmd: ReturnType<typeof parseGateCommand>;
    try {
      cmd = parseGateCommand(args[0]);
    } catch (err) {
      return { error: `Invalid gate_decide args: ${(err as Error).message}` };
    }

    const aggregateId = `${cmd.entitySlug}::${cmd.stage}`;
    const existingEvents = await gateLoadEvents(ctx.db, aggregateId);
    const state = gateReplay(existingEvents);
    const now = Date.now();

    let events: ReturnType<typeof gateDecide>;
    try {
      events = gateDecide(cmd, state, now);
    } catch (err) {
      if (err instanceof GateAlreadyDecided) {
        return { error: err.message };
      }
      throw err;
    }

    await gateAppendEvents(ctx.db, aggregateId, events, existingEvents.length + 1);

    const decidedAt = now;
    const decision = cmd.type === "approve_gate" ? "approved" : "rejected";

    // Notify via SSE events table so UI feed picks up the gate decision
    await ctx.db.insert((await import("../src/schema")).events).values({
      type: "gate_decided",
      entity: cmd.entitySlug,
      stage: cmd.stage,
      agent: "captain",
      workflowDir: process.env.SPACEBRIDGE_PROJECT_ROOT ?? process.cwd(),
      timestamp: decidedAt,
      payload: JSON.stringify({ decision, decidedAt }),
    });

    // Push to active session if available
    const targetSessionId = ctx.sessionRegistry.getActiveSessionByProjectRoot(
      process.env.SPACEBRIDGE_PROJECT_ROOT ?? process.cwd(),
    );
    if (targetSessionId) {
      ctx.server.pushToSession(targetSessionId, {
        id: randomUUID(),
        type: "action-push",
        payload: {
          action: "gate_decided",
          entitySlug: cmd.entitySlug,
          stage: cmd.stage,
          decision,
          decidedAt,
        },
      });
    }

    return { result: { decision, decidedAt } };
  });

  // ─── Build RpcCtx ────────────────────────────────────────────────────────────

  // server reference captured after createSocketServer below; use a late-binding getter
  let serverRef: ReturnType<typeof createSocketServer>;

  const rpcCtx: Omit<RpcCtx, "server"> & { server: ReturnType<typeof createSocketServer> } = {
    db,
    get server() {
      return serverRef;
    },
    sessionRegistry,
    tokenManager,
    getTunnelProvider: () => tunnelProvider,
    setTunnelProvider: (p) => {
      tunnelProvider = p;
    },
    getTunnelUrl: () => tunnelUrl,
    setTunnelUrl: (u) => {
      tunnelUrl = u;
    },
    startedAt,
    sessions,
  };

  const server = createSocketServer({
    socketPath,
    onRegister: (sess) => {
      sessions.set(sess.sessionId, { sessionId: sess.sessionId, registeredAt: Date.now() });
      sessionRegistry.register(sess).catch(() => {});
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
        autoStopTimer = null;
      }
      return { sessionToken: randomUUID(), serverVersion: "0.1.0" };
    },
    onRpcRequest: async (_sessionId, req) => {
      const handler = rpcHandlers.get(req.method);
      if (!handler) return { error: `RPC method ${req.method} not implemented in daemon stub` };
      return handler(req.args as unknown[], rpcCtx);
    },
    onCoordinationRequest: async (_sessionId, req) => {
      // Build a LeaseCommand from the positional args and validate at the IPC boundary
      // before dispatching to the bridge. getAvailableWork is not a LeaseCommand — skip.
      if (req.method !== "getAvailableWork") {
        const args = req.args as unknown[];
        let rawCmd: unknown;
        if (req.method === "acquireEntity") {
          rawCmd = {
            type: "acquire",
            entitySlug: args[0],
            role: args[1],
            sessionId: args[2],
            leaseDurationMs,
          };
        } else if (req.method === "releaseEntity") {
          const tok = args[0] as { token?: string };
          rawCmd = { type: "release", token: tok?.token, outcome: args[1] };
        } else if (req.method === "extendLease") {
          const tok = args[0] as { token?: string };
          rawCmd = { type: "extend", token: tok?.token, leaseDurationMs };
        }
        if (rawCmd !== undefined) {
          const parsed = LeaseCommandSchema.safeParse(rawCmd);
          if (!parsed.success) {
            return { error: `Invalid coordination args: ${parsed.error.message}` };
          }
        }
      }
      try {
        const method = req.method as keyof typeof bridge;
        const fn = bridge[method];
        if (typeof fn !== "function")
          return { error: `Unknown coordination method: ${req.method}` };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (fn as any)(...(req.args as unknown[]));
        return { result };
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
    onDisconnect: (sessionId) => {
      sessions.delete(sessionId);
      sessionRegistry.disconnect(sessionId, "explicit").catch(() => {});
      scheduleAutoStop(server);
    },
  });

  // Wire late-binding server reference for rpcCtx
  serverRef = server;

  // Bind socket as first action (A-4: before any heavy init)
  await server.listen();

  // Write PID file after socket is live
  writePidFile(pidPath, process.pid);

  // Start janitor after socket is live
  janitorTimer = setInterval(() => {
    bridge.expireDue(Date.now()).catch((err: unknown) => {
      process.stderr.write(`[${ts()}] janitor error: ${(err as Error).message}\n`);
    });
  }, janitorIntervalMs);

  process.stderr.write(
    `[${ts()}] spacebridge daemon started (pid: ${process.pid}, socket: ${socketPath})\n`,
  );

  // Spawn Next.js UI child process (skip via SPACEBRIDGE_SKIP_UI=1 for CI / lean tests)
  let nextjsChild: ChildProcess | null = null;
  if (process.env.SPACEBRIDGE_SKIP_UI === "1") {
    process.stderr.write(`[${ts()}] SPACEBRIDGE_SKIP_UI=1 — skipping Next.js UI spawn\n`);
  } else {
    try {
      const pluginRoot = resolve(import.meta.dir, "..");
      const serverScript = resolveNextjsServerScript(pluginRoot);
      const dbPath = join(stateDir, "spacebridge.db");
      const uiPort = resolvePort();
      nextjsChild = spawnNextjsChild({
        serverScript,
        port: uiPort,
        dbPath,
        stateDir,
        projectRoot: process.cwd(),
      });
      process.stderr.write(
        `[${ts()}] spawned Next.js UI (pid: ${nextjsChild.pid}, port: ${uiPort})\n`,
      );
    } catch (err) {
      process.stderr.write(
        `[${ts()}] WARNING: failed to spawn Next.js UI: ${(err as Error).message}\n`,
      );
      process.stderr.write(`[${ts()}] Run: cd spacebridge/ui && bun run build\n`);
    }
  }

  // Signal handlers for graceful shutdown
  const doShutdown = async () => {
    if (janitorTimer) clearInterval(janitorTimer);
    if (tunnelProvider) {
      try {
        await tunnelProvider.stop();
      } catch {}
      tunnelProvider = null;
      tunnelUrl = null;
    }
    await shutdown(server, pidPath, socketPath, nextjsChild);
    process.exit(0);
  };

  process.on("SIGTERM", doShutdown);
  process.on("SIGINT", doShutdown);
  process.on("exit", () => {
    // Best-effort cleanup on unexpected exit
    try {
      if (existsSync(pidPath)) unlinkSync(pidPath);
    } catch {}
    try {
      if (existsSync(socketPath)) unlinkSync(socketPath);
    } catch {}
  });
}

async function shutdown(
  server: ReturnType<typeof createSocketServer>,
  pidPath: string,
  socketPath: string,
  nextjsChild: ChildProcess | null = null,
): Promise<void> {
  if (nextjsChild) await shutdownNextjsChild(nextjsChild);
  await server.close();
  try {
    if (existsSync(pidPath)) unlinkSync(pidPath);
  } catch {}
  try {
    if (existsSync(socketPath)) unlinkSync(socketPath);
  } catch {}
}

// ─── stop subcommand ─────────────────────────────────────────────────────────

function cmdStop(): void {
  const stateDir = resolveStateDir();
  const pidPath = join(stateDir, "spacebridge.pid");
  const socketPath = join(stateDir, "spacebridge.sock");
  const lockPath = join(stateDir, "spacebridge.lock");

  const pid = readPidFile(pidPath);

  if (pid === null) {
    process.stderr.write("daemon not running (no PID file)\n");
    process.exit(1);
  }

  if (!isProcessAlive(pid)) {
    // Stale files from a crashed daemon
    try {
      if (existsSync(pidPath)) unlinkSync(pidPath);
    } catch {}
    try {
      if (existsSync(socketPath)) unlinkSync(socketPath);
    } catch {}
    releaseLock(lockPath);
    process.stderr.write(`cleaned stale daemon files (pid ${pid} was dead)\n`);
    return;
  }

  process.kill(pid, "SIGTERM");
  process.stderr.write(`stopping daemon (pid: ${pid})\n`);
}

// ─── status subcommand ───────────────────────────────────────────────────────

async function cmdStatus(): Promise<void> {
  const stateDir = resolveStateDir();
  const pidPath = join(stateDir, "spacebridge.pid");
  const socketPath = join(stateDir, "spacebridge.sock");

  const pid = readPidFile(pidPath);

  if (pid === null || !isProcessAlive(pid)) {
    process.stderr.write("daemon not running\n");
    process.exit(1);
  }

  // Query daemon via __status RPC over socket
  try {
    const sock = net.createConnection({ path: socketPath });

    await new Promise<void>((resolve_, reject) => {
      sock.on("connect", resolve_);
      sock.on("error", reject);
    });

    // Send a raw JSON status query — bypass full IPC framing for simplicity
    // We build a minimal framed message manually
    const { encodeMessage } = await import("../src/ipc/framing");
    const { randomUUID: uuid } = await import("node:crypto");
    const reqId = uuid();
    const msg = encodeMessage({
      id: reqId,
      type: "rpc-request",
      payload: { method: "__status", args: [] },
    });

    // We need to register first before sending RPC
    const regId = uuid();
    const regMsg = encodeMessage({
      id: regId,
      type: "register",
      payload: {
        projectRoot: process.cwd(),
        sessionId: `status-probe-${uuid()}`,
        pid: process.pid,
        protocolVersion: 1,
      },
    });

    let buf = Buffer.alloc(0);
    sock.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      // Try to parse framed messages
      while (buf.length >= 4) {
        const len = buf.readUInt32BE(0);
        if (buf.length < 4 + len) break;
        const jsonStr = buf.subarray(4, 4 + len).toString("utf8");
        buf = buf.subarray(4 + len);
        try {
          const parsed = JSON.parse(jsonStr) as { id: string; type: string; payload: unknown };
          if (parsed.type === "register-ack") {
            // Registered — now send status RPC
            sock.write(msg);
          } else if (parsed.id === reqId && parsed.type === "rpc-response") {
            const payload = parsed.payload as {
              result?: { pid: number; uptimeMs: number; sessions: number };
              error?: string;
            };
            sock.destroy();
            if (payload.error) {
              process.stderr.write(`status query failed: ${payload.error}\n`);
              process.exit(1);
            }
            const { pid: daemonPid, uptimeMs, sessions } = payload.result!;
            const uptimeSec = Math.floor(uptimeMs / 1000);
            process.stdout.write(
              `daemon running (pid: ${daemonPid}, uptime: ${uptimeSec}s, sessions: ${sessions})\n`,
            );
            process.exit(0);
          }
        } catch {}
      }
    });

    sock.write(regMsg);

    // Timeout guard
    setTimeout(() => {
      sock.destroy();
      process.stderr.write("status query timed out\n");
      process.exit(1);
    }, 5000);
  } catch (err) {
    process.stderr.write(`daemon not responding: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ts(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// ─── Entry point ─────────────────────────────────────────────────────────────

if (import.meta.main) {
  const subcommand = Bun.argv[2];

  if (subcommand === "start") {
    await cmdStart();
  } else if (subcommand === "stop") {
    cmdStop();
  } else if (subcommand === "status") {
    await cmdStatus();
  } else {
    process.stderr.write(`Usage: daemon.ts <start|stop|status>\n`);
    process.exit(1);
  }
}
