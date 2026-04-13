// spacebridge/bin/daemon.ts
// ABOUTME: Daemon entry point with start/stop/status subcommand routing.
// Manages the spacebridge daemon process lifecycle: boots unix socket server (entity 051),
// writes PID file, handles graceful shutdown via SIGTERM/SIGINT.
// Called by shim auto-fork logic and by entity 059 CLI wrapper.

import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import * as net from "node:net";
import { randomUUID } from "node:crypto";
import { createSocketServer } from "../src/ipc/socket-server";
import { createCoordinationClientBridge } from "../src/ipc/coordination-client-bridge";
import { createDb } from "../src/db";
import { writePidFile, readPidFile, isProcessAlive } from "../src/daemon/pid";
import { releaseLock } from "../src/daemon/lock";
import { LeaseCommandSchema } from "../src/domain/lease/schemas";
import { spawnNextjsChild, shutdownNextjsChild, resolveNextjsServerScript } from "../src/daemon/nextjs-child";
import type { ChildProcess } from "node:child_process";

// ─── State directory resolution ──────────────────────────────────────────────

function resolveStateDir(): string {
  // SPACEBRIDGE_STATE_DIR allows test isolation (never touches production ~/.spacedock)
  return process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
}

// ─── Startup timestamp for uptime tracking ───────────────────────────────────

// Module-level: runs once when daemon.ts is executed (always as daemon process)
const startedAt = Date.now();

// ─── start subcommand ────────────────────────────────────────────────────────

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

  // entityScanner: trivial stub returning [] for 056; entity 057 supplies DB-backed scanner
  const entityScanner = async () => [];

  const bridge = await createCoordinationClientBridge({ db, entityScanner, leaseDurationMs });

  let janitorTimer: ReturnType<typeof setInterval> | null = null;

  const server = createSocketServer({
    socketPath,
    onRegister: (sess) => {
      sessions.set(sess.sessionId, { sessionId: sess.sessionId, registeredAt: Date.now() });
      if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
      return { sessionToken: randomUUID(), serverVersion: "0.1.0" };
    },
    onRpcRequest: async (_sessionId, req) => {
      // __status: internal method for status subcommand out-of-process query
      if (req.method === "__status") {
        return {
          result: {
            pid: process.pid,
            uptimeMs: Date.now() - startedAt,
            sessions: sessions.size,
          },
        };
      }
      // Real ChannelProvider RPC forwarding handled by entity 053
      return { error: `RPC method ${req.method} not implemented in daemon stub` };
    },
    onCoordinationRequest: async (_sessionId, req) => {
      // Build a LeaseCommand from the positional args and validate at the IPC boundary
      // before dispatching to the bridge. getAvailableWork is not a LeaseCommand — skip.
      if (req.method !== "getAvailableWork") {
        const args = req.args as unknown[];
        let rawCmd: unknown;
        if (req.method === "acquireEntity") {
          rawCmd = { type: "acquire", entitySlug: args[0], role: args[1], sessionId: args[2], leaseDurationMs };
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
        if (typeof fn !== "function") return { error: `Unknown coordination method: ${req.method}` };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (fn as any)(...(req.args as unknown[]));
        return { result };
      } catch (err) {
        return { error: (err as Error).message };
      }
    },
    onDisconnect: (sessionId) => {
      sessions.delete(sessionId);
      scheduleAutoStop(server);
    },
  });

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

  process.stderr.write(`[${ts()}] spacebridge daemon started (pid: ${process.pid}, socket: ${socketPath})\n`);

  // Spawn Next.js UI child process (skip via SPACEBRIDGE_SKIP_UI=1 for CI / lean tests)
  let nextjsChild: ChildProcess | null = null;
  if (process.env.SPACEBRIDGE_SKIP_UI === "1") {
    process.stderr.write(`[${ts()}] SPACEBRIDGE_SKIP_UI=1 — skipping Next.js UI spawn\n`);
  } else {
    try {
      const pluginRoot = resolve(import.meta.dir, "..");
      const serverScript = resolveNextjsServerScript(pluginRoot);
      const dbPath = join(stateDir, "spacebridge.db");
      nextjsChild = spawnNextjsChild({ serverScript, port: 8420, dbPath, stateDir });
      process.stderr.write(`[${ts()}] spawned Next.js UI (pid: ${nextjsChild.pid}, port: 8420)\n`);
    } catch (err) {
      process.stderr.write(`[${ts()}] WARNING: failed to spawn Next.js UI: ${(err as Error).message}\n`);
      process.stderr.write(`[${ts()}] Run: cd spacebridge/ui && bun run build\n`);
    }
  }

  // Signal handlers for graceful shutdown
  const doShutdown = async () => {
    if (janitorTimer) clearInterval(janitorTimer);
    await shutdown(server, pidPath, socketPath, nextjsChild);
    process.exit(0);
  };

  process.on("SIGTERM", doShutdown);
  process.on("SIGINT", doShutdown);
  process.on("exit", () => {
    // Best-effort cleanup on unexpected exit
    try { if (existsSync(pidPath)) unlinkSync(pidPath); } catch {}
    try { if (existsSync(socketPath)) unlinkSync(socketPath); } catch {}
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
  try { if (existsSync(pidPath)) unlinkSync(pidPath); } catch {}
  try { if (existsSync(socketPath)) unlinkSync(socketPath); } catch {}
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
    try { if (existsSync(pidPath)) unlinkSync(pidPath); } catch {}
    try { if (existsSync(socketPath)) unlinkSync(socketPath); } catch {}
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
        sessionId: "status-probe-" + uuid(),
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
            const payload = parsed.payload as { result?: { pid: number; uptimeMs: number; sessions: number }; error?: string };
            sock.destroy();
            if (payload.error) {
              process.stderr.write(`status query failed: ${payload.error}\n`);
              process.exit(1);
            }
            const { pid: daemonPid, uptimeMs, sessions } = payload.result!;
            const uptimeSec = Math.floor(uptimeMs / 1000);
            process.stdout.write(`daemon running (pid: ${daemonPid}, uptime: ${uptimeSec}s, sessions: ${sessions})\n`);
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
