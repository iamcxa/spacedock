// spacebridge/ui/lib/daemon-rpc.ts
// ABOUTME: Shared helper for UI API routes to call daemon RPC over unix socket.
// Creates ephemeral IPC client, sends one RPC, returns result, closes.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

function resolveSocketPath(): string {
  const stateDir = process.env.SPACEBRIDGE_STATE_DIR ?? join(homedir(), ".spacedock");
  return join(stateDir, "spacebridge.sock");
}

export async function daemonRpc(
  method: string,
  args: unknown[] = [],
): Promise<{ result?: unknown; error?: string }> {
  const { createSocketClient } = await import("../../src/ipc/socket-client");
  const socketPath = resolveSocketPath();

  const client = createSocketClient({
    socketPath,
    sessionId: `ui-rpc-${randomUUID()}`,
    projectRoot: `ui-ephemeral-${randomUUID()}`,
    pid: process.pid,
  });

  await client.connect();
  const resp = await client.request({
    id: randomUUID(),
    type: "rpc-request",
    payload: { method, args },
  });
  client.close();

  return resp.payload as { result?: unknown; error?: string };
}
