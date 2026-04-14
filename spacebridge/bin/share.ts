// spacebridge/bin/share.ts
// ABOUTME: share CLI subcommand — IPC client for share_create/share_revoke/share_list RPC.
// Usage: spacebridge share --entity <slug> [--ttl 7d] [--tunnel-backend <name>]
//        spacebridge share --revoke <token>
//        spacebridge share --list
// Communicates with daemon via unix socket IPC (same pattern as cmdStatus).

import { join } from "node:path";
import { homedir } from "node:os";
import * as net from "node:net";
import { randomUUID } from "node:crypto";
import { encodeMessage, createFrameDecoder } from "../src/ipc/framing";
import { readPidFile, isProcessAlive } from "../src/daemon/pid";
import type { IpcMessage } from "../src/ipc/types";

// ─── TTL parsing ─────────────────────────────────────────────────────────────

export function parseTtl(raw: string): number {
  const match = raw.match(/^(\d+)(d|h|m)$/);
  if (!match) {
    throw new Error(`Invalid TTL format: "${raw}". Use Nd (days), Nh (hours), or Nm (minutes). Example: 7d, 24h, 30m`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "d": return value * 24 * 60 * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    default: throw new Error(`Unreachable unit: ${unit}`);
  }
}

// ─── Argument parsing ─────────────────────────────────────────────────────────

interface ShareCreateArgs {
  subcommand: "create";
  entitySlug: string;
  ttlMs: number;
  tunnelBackend?: string;
}

interface ShareRevokeArgs {
  subcommand: "revoke";
  token: string;
}

interface ShareListArgs {
  subcommand: "list";
}

export type ShareArgs = ShareCreateArgs | ShareRevokeArgs | ShareListArgs;

export function parseArgs(argv: string[]): ShareArgs {
  if (argv.includes("--list")) {
    return { subcommand: "list" };
  }

  const revokeIdx = argv.indexOf("--revoke");
  if (revokeIdx !== -1) {
    const token = argv[revokeIdx + 1];
    if (!token || token.startsWith("--")) {
      throw new Error("--revoke requires a token argument");
    }
    return { subcommand: "revoke", token };
  }

  const entityIdx = argv.indexOf("--entity");
  if (entityIdx === -1) {
    throw new Error(
      "Usage:\n" +
      "  spacebridge share --entity <slug> [--ttl 7d] [--tunnel-backend <name>]\n" +
      "  spacebridge share --revoke <token>\n" +
      "  spacebridge share --list"
    );
  }

  const entitySlug = argv[entityIdx + 1];
  if (!entitySlug || entitySlug.startsWith("--")) {
    throw new Error("--entity requires a slug argument");
  }

  let ttlMs = 7 * 24 * 60 * 60 * 1000; // default 7d
  const ttlIdx = argv.indexOf("--ttl");
  if (ttlIdx !== -1) {
    const raw = argv[ttlIdx + 1];
    if (!raw || raw.startsWith("--")) throw new Error("--ttl requires a value (e.g. 7d, 24h)");
    ttlMs = parseTtl(raw);
  }

  let tunnelBackend: string | undefined;
  const backendIdx = argv.indexOf("--tunnel-backend");
  if (backendIdx !== -1) {
    const name = argv[backendIdx + 1];
    if (!name || name.startsWith("--")) throw new Error("--tunnel-backend requires a name (ngrok, tailscale, cloudflared)");
    tunnelBackend = name;
  }

  return { subcommand: "create", entitySlug, ttlMs, tunnelBackend };
}

// ─── IPC helpers ─────────────────────────────────────────────────────────────

function resolveStateDir(): string {
  return process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
}

async function sendRpc(socketPath: string, method: string, args: unknown[]): Promise<unknown> {
  const sock = net.createConnection({ path: socketPath });

  await new Promise<void>((resolve, reject) => {
    sock.on("connect", resolve);
    sock.on("error", reject);
  });

  const { encodeMessage: enc } = await import("../src/ipc/framing");
  const { randomUUID: uuid } = await import("node:crypto");

  const reqId = uuid();
  const regId = uuid();

  const regMsg = enc({
    id: regId,
    type: "register",
    payload: {
      projectRoot: process.cwd(),
      sessionId: "share-cli-" + uuid(),
      pid: process.pid,
      protocolVersion: 1,
    },
  });

  const rpcMsg = enc({
    id: reqId,
    type: "rpc-request",
    payload: { method, args },
  });

  return new Promise<unknown>((resolve, reject) => {
    let buf = Buffer.alloc(0);
    let registered = false;

    sock.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const len = buf.readUInt32BE(0);
        if (buf.length < 4 + len) break;
        const jsonStr = buf.subarray(4, 4 + len).toString("utf8");
        buf = buf.subarray(4 + len);
        try {
          const parsed = JSON.parse(jsonStr) as { id: string; type: string; payload: unknown };
          if (!registered && parsed.type === "register-ack") {
            registered = true;
            sock.write(rpcMsg);
          } else if (parsed.id === reqId && parsed.type === "rpc-response") {
            sock.destroy();
            const payload = parsed.payload as { result?: unknown; error?: string };
            if (payload.error) reject(new Error(payload.error));
            else resolve(payload.result);
          }
        } catch { /* skip malformed frame */ }
      }
    });

    sock.on("error", reject);

    setTimeout(() => {
      sock.destroy();
      reject(new Error("Share RPC timed out after 30s"));
    }, 30_000);

    sock.write(regMsg);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runShareCommand(argv: string[]): Promise<void> {
  let args: ShareArgs;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const stateDir = resolveStateDir();
  const pidPath = join(stateDir, "spacebridge.pid");
  const socketPath = join(stateDir, "spacebridge.sock");

  const pid = readPidFile(pidPath);
  if (pid === null || !isProcessAlive(pid)) {
    process.stderr.write(
      "Error: spacebridge daemon is not running.\n" +
      "Start it with: spacebridge start\n"
    );
    process.exit(1);
  }

  try {
    if (args.subcommand === "create") {
      const result = await sendRpc(socketPath, "share_create", [
        args.entitySlug,
        args.ttlMs,
        args.tunnelBackend,
      ]) as { token: string; url: string; entitySlug: string; expiresAt: number };
      const expiryDate = new Date(result.expiresAt).toISOString();
      process.stdout.write(`Share URL: ${result.url}\n`);
      process.stdout.write(`Token:     ${result.token}\n`);
      process.stdout.write(`Entity:    ${result.entitySlug}\n`);
      process.stdout.write(`Expires:   ${expiryDate}\n`);

    } else if (args.subcommand === "revoke") {
      const result = await sendRpc(socketPath, "share_revoke", [args.token]) as { revoked: boolean };
      if (result.revoked) {
        process.stdout.write(`Token revoked: ${args.token}\n`);
      } else {
        process.stdout.write(`Token not found (already expired or revoked): ${args.token}\n`);
      }

    } else if (args.subcommand === "list") {
      const tokens = await sendRpc(socketPath, "share_list", []) as Array<{
        token: string; entitySlug: string; expiresAt: number;
      }>;
      if (tokens.length === 0) {
        process.stdout.write("No active share tokens.\n");
      } else {
        process.stdout.write(`${"TOKEN".padEnd(50)} ${"ENTITY".padEnd(30)} EXPIRES\n`);
        process.stdout.write(`${"-".repeat(50)} ${"-".repeat(30)} ${"-".repeat(26)}\n`);
        for (const t of tokens) {
          const exp = new Date(t.expiresAt).toISOString();
          process.stdout.write(`${t.token.padEnd(50)} ${t.entitySlug.padEnd(30)} ${exp}\n`);
        }
      }
    }
  } catch (err) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await runShareCommand(Bun.argv.slice(2));
}
