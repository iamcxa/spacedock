// ABOUTME: Integration tests for the MCP stdio bridge in bin/cli.ts mcp subcommand.
// Spawns cli.ts mcp as child process with piped stdio, sends MCP JSON-RPC frames,
// and asserts valid responses + push notifications.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { Subprocess } from "bun";
import { createSocketClient } from "../src/ipc/socket-client";

const CLI_SCRIPT = join(import.meta.dir, "cli.ts");
const DAEMON_SCRIPT = join(import.meta.dir, "daemon.ts");

function makeTempDir(): string {
  // Short path to stay under macOS 104-char unix socket limit
  const short = randomUUID().slice(0, 8);
  const dir = `/tmp/sb-cli-test-${short}`;
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function waitForSocket(socketPath: string, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await Bun.connect({
        unix: socketPath,
        socket: {
          open(s) {
            s.end();
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
  throw new Error(`Socket not ready: ${socketPath}`);
}

// MCP JSON-RPC helpers
function mcpRequest(id: number | string, method: string, params: unknown = {}): string {
  return `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;
}

async function readMcpMessage(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs = 3000,
): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  const decoder = new TextDecoder();
  let buf = "";
  while (Date.now() < deadline) {
    const { value, done } = await Promise.race([
      reader.read(),
      new Promise<{ value: undefined; done: true }>((_, r) =>
        setTimeout(() => r(new Error("read timeout")), 200),
      ).catch(() => ({ value: undefined as unknown as Uint8Array, done: false as const })),
    ]);
    if (done) throw new Error("stdout closed before message received");
    if (value) buf += decoder.decode(value);
    // Try to find a complete JSON line
    const nl = buf.indexOf("\n");
    if (nl !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) return JSON.parse(line);
    }
  }
  throw new Error(`No MCP message received within ${timeoutMs}ms. Buffer: ${buf}`);
}

describe("cli.ts mcp — MCP stdio bridge", () => {
  let stateDir: string;
  let daemonProc: ReturnType<typeof Bun.spawn>;
  let shimProc: Subprocess<"pipe", "pipe", "ignore">;
  let socketPath: string;

  beforeEach(async () => {
    stateDir = makeTempDir();
    socketPath = join(stateDir, "spacebridge.sock");

    // Boot daemon first
    daemonProc = Bun.spawn(["bun", "run", DAEMON_SCRIPT, "start"], {
      env: {
        ...process.env,
        SPACEBRIDGE_STATE_DIR: stateDir,
        SPACEBRIDGE_SKIP_UI: "1",
      },
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });

    await waitForSocket(socketPath);

    // Spawn MCP shim
    shimProc = Bun.spawn(["bun", "run", CLI_SCRIPT, "mcp"], {
      env: {
        ...process.env,
        SPACEBRIDGE_STATE_DIR: stateDir,
        SPACEBRIDGE_SKIP_UI: "1",
        SPACEBRIDGE_PROJECT_ROOT: stateDir,
      },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "ignore",
    }) as Subprocess<"pipe", "pipe", "ignore">;

    // Wait for shim to connect to daemon (brief delay)
    // Give shim time to register its session with daemon sessionRegistry
    await Bun.sleep(500);
  });

  afterEach(async () => {
    shimProc.kill("SIGTERM");
    daemonProc.kill("SIGTERM");
    await Promise.allSettled([shimProc.exited, daemonProc.exited]);
    try {
      rmSync(stateDir, { recursive: true, force: true });
    } catch {}
  });

  test("MCP initialize request returns valid response", async () => {
    const reader = shimProc.stdout.getReader();

    // Send MCP initialize
    const initMsg = mcpRequest(1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0" },
    });
    shimProc.stdin.write(new TextEncoder().encode(initMsg));
    shimProc.stdin.flush();

    const response = (await readMcpMessage(reader, 3000)) as {
      jsonrpc: string;
      id: number;
      result?: { protocolVersion: string; serverInfo: { name: string } };
    };

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result?.serverInfo?.name).toBe("spacebridge");

    reader.releaseLock();
  });

  test("action-push from daemon appears as MCP notification on shim stdout", async () => {
    const reader = shimProc.stdout.getReader();

    // Send initialize first to establish the MCP session
    const initMsg = mcpRequest(1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    shimProc.stdin.write(new TextEncoder().encode(initMsg));
    shimProc.stdin.flush();
    await readMcpMessage(reader, 3000); // consume initialize response

    // Connect a separate helper client with a DIFFERENT project root so it doesn't
    // shadow the shim's session in the registry (most-recent-heartbeat wins per O-2a)
    const helperClient = createSocketClient({
      socketPath,
      sessionId: randomUUID(),
      projectRoot: "/helper-probe-root",
      pid: process.pid,
    });
    await helperClient.connect();

    const msgId = randomUUID();
    // Target the shim's projectRoot (stateDir) so daemon routes to the shim
    await helperClient.request({
      id: randomUUID(),
      type: "rpc-request",
      payload: {
        method: "captain_chat",
        args: [
          {
            type: "send_captain_message",
            messageId: msgId,
            targetSessionId: "unused",
            projectRoot: stateDir,
            content: "test push",
            sentAt: Date.now(),
          },
        ],
      },
    });
    helperClient.close();

    // Read next message from shim stdout — should be the notification
    const notification = (await readMcpMessage(reader, 3000)) as {
      method?: string;
      params?: { messageId?: string };
    };

    expect(notification.method).toBe("notifications/spacebridge/captain_message");
    expect(notification.params?.messageId).toBe(msgId);

    reader.releaseLock();
  });

  test("SIGTERM causes clean exit (exit code 0)", async () => {
    shimProc.kill("SIGTERM");
    const code = await shimProc.exited;
    expect(code).toBe(0);
  });
});
