// spacebridge/bin/daemon.ts
// ABOUTME: Daemon entry point with start/stop/status subcommand routing.
// Manages the spacebridge daemon process lifecycle: boots unix socket server (entity 051),
// writes PID file, handles graceful shutdown via SIGTERM/SIGINT.
// Called by shim auto-fork logic and by entity 059 CLI wrapper.

import { join } from "node:path";
import { homedir } from "node:os";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import * as net from "node:net";
import { randomUUID } from "node:crypto";
import { createSocketServer } from "../src/ipc/socket-server";
import { createCoordinationClientStub } from "../src/ipc/coordination-client-stub";
import { writePidFile, readPidFile, isProcessAlive } from "../src/daemon/pid";
import { releaseLock } from "../src/daemon/lock";

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

  const stub = createCoordinationClientStub();

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
      try {
        const method = req.method as keyof typeof stub;
        const fn = stub[method];
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

  process.stderr.write(`[${ts()}] spacebridge daemon started (pid: ${process.pid}, socket: ${socketPath})\n`);

  // Signal handlers for graceful shutdown
  const doShutdown = async () => {
    await shutdown(server, pidPath, socketPath);
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
): Promise<void> {
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
        const jsonStr = buf.slice(4, 4 + len).toString("utf8");
        buf = buf.slice(4 + len);
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
