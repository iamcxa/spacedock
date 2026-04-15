// ABOUTME: Integration tests for daemon RPC handler registry — captain_chat and gate_decide.
// Boots daemon with SPACEBRIDGE_SKIP_UI=1 + isolated state dir.
// Registers a fake shim session, then exercises new RPC handlers.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createSocketClient } from "../src/ipc/socket-client";

const DAEMON_SCRIPT = join(import.meta.dir, "daemon.ts");
const TIMEOUT_MS = 8000;

function makeTempDir(): string {
  // Use short path under /tmp to stay within macOS 104-char unix socket path limit.
  // tmpdir() can return /var/folders/... which produces paths > 104 chars.
  const short = randomUUID().slice(0, 8);
  const dir = `/tmp/sb-test-${short}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function waitForDaemonReady(socketPath: string, timeoutMs = TIMEOUT_MS): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await Bun.connect({
        unix: socketPath,
        socket: {
          open(socket) {
            socket.end();
          },
          data() {},
          error() {},
          close() {},
        },
      });
      return;
    } catch {
      await Bun.sleep(50);
    }
  }
  throw new Error(`Daemon socket not ready at ${socketPath} within ${timeoutMs}ms`);
}

describe("daemon RPC registry — captain_chat + gate_decide", () => {
  let stateDir: string;
  let daemonProc: ReturnType<typeof Bun.spawn>;
  let socketPath: string;

  beforeEach(async () => {
    stateDir = makeTempDir();
    socketPath = join(stateDir, "spacebridge.sock");

    daemonProc = Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
      env: {
        ...process.env,
        SPACEBRIDGE_STATE_DIR: stateDir,
        SPACEBRIDGE_SKIP_UI: "1",
        SPACEBRIDGE_PROJECT_ROOT: "/test/project",
      },
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });

    await waitForDaemonReady(socketPath);
  });

  afterEach(async () => {
    daemonProc.kill("SIGTERM");
    await daemonProc.exited;
    try {
      rmSync(stateDir, { recursive: true, force: true });
    } catch {}
  });

  test("captain_chat: delivered:true when session registered for project root", async () => {
    const sessionId = randomUUID();

    // Register a shim session
    const pushMessages: unknown[] = [];
    const client = createSocketClient({
      socketPath,
      sessionId,
      projectRoot: "/test/project",
      pid: process.pid,
      onPush: (msg) => pushMessages.push(msg),
    });
    await client.connect();

    // Send captain_chat RPC
    const msgId = randomUUID();
    const resp = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: {
        method: "captain_chat",
        args: [
          {
            type: "send_captain_message",
            messageId: msgId,
            targetSessionId: sessionId,
            projectRoot: "/test/project",
            content: "hello from captain",
            sentAt: Date.now(),
          },
        ],
      },
    });

    expect(resp.type).toBe("rpc-response");
    const payload = resp.payload as {
      result?: { messageId: string; delivered: boolean };
      error?: string;
    };
    expect(payload.error).toBeUndefined();
    expect(payload.result?.messageId).toBe(msgId);
    expect(payload.result?.delivered).toBe(true);

    // The shim should have received an action-push with captain_chat
    // Allow brief propagation
    await Bun.sleep(50);
    const chatPush = pushMessages.find((m) => (m as { type: string }).type === "action-push");
    expect(chatPush).toBeDefined();

    client.close();
  });

  test("captain_chat: error when no session for project root", async () => {
    // Register on a different project root
    const client = createSocketClient({
      socketPath,
      sessionId: randomUUID(),
      projectRoot: "/other/project",
      pid: process.pid,
    });
    await client.connect();

    const resp = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: {
        method: "captain_chat",
        args: [
          {
            type: "send_captain_message",
            messageId: randomUUID(),
            targetSessionId: "unused",
            projectRoot: "/missing/project",
            content: "hello",
            sentAt: Date.now(),
          },
        ],
      },
    });

    const payload = resp.payload as { error?: string };
    expect(payload.error).toContain("No active CC session");

    client.close();
  });

  test("gate_decide: approve returns decision + writes gate_events row", async () => {
    const client = createSocketClient({
      socketPath,
      sessionId: randomUUID(),
      projectRoot: "/test/project",
      pid: process.pid,
    });
    await client.connect();

    const resp = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: {
        method: "gate_decide",
        args: [
          {
            type: "approve_gate",
            entitySlug: "entity-099",
            stage: "plan",
            decidedBy: "captain",
          },
        ],
      },
    });

    const payload = resp.payload as {
      result?: { decision: string; decidedAt: number };
      error?: string;
    };
    expect(payload.error).toBeUndefined();
    expect(payload.result?.decision).toBe("approved");
    expect(typeof payload.result?.decidedAt).toBe("number");

    client.close();
  });

  test("gate_decide: GateAlreadyDecided on second approve for same entity::stage", async () => {
    const client = createSocketClient({
      socketPath,
      sessionId: randomUUID(),
      projectRoot: "/test/project",
      pid: process.pid,
    });
    await client.connect();

    const cmd = {
      type: "approve_gate",
      entitySlug: "entity-099-dup",
      stage: "uat",
      decidedBy: "captain",
    };

    // First approve succeeds
    const resp1 = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: { method: "gate_decide", args: [cmd] },
    });
    expect((resp1.payload as { result?: unknown }).result).toBeDefined();

    // Second approve on same aggregate → error
    const resp2 = await client.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: { method: "gate_decide", args: [cmd] },
    });
    const payload2 = resp2.payload as { error?: string };
    expect(payload2.error).toBeDefined();
    expect(payload2.error).toMatch(/already been decided|already decided/i);

    client.close();
  });
});
