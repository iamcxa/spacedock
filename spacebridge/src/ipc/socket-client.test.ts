// spacebridge/src/ipc/socket-client.test.ts
// ABOUTME: Tests for the unix socket client (shim side) with reconnect logic.

import { describe, test, expect, afterEach } from "bun:test";
import { createSocketClient } from "./socket-client";
import { createSocketServer } from "./socket-server";
import { encodeMessage, createFrameDecoder } from "./framing";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { unlinkSync, existsSync } from "node:fs";
import type { IpcMessage, RegisterAckPayload } from "./types";

function tempSock(): string {
  return join(tmpdir(), `test-client-${randomUUID()}.sock`);
}

function makeTestServer(sockPath: string, opts?: {
  onRpcRequest?: (sessionId: string, req: any) => Promise<any>;
}) {
  return createSocketServer({
    socketPath: sockPath,
    onRegister: (sess) => ({ sessionToken: "tok-" + sess.sessionId, serverVersion: "1" }),
    onRpcRequest: opts?.onRpcRequest ?? (async () => ({ result: null })),
    onCoordinationRequest: async () => ({ result: null }),
    onDisconnect: () => {},
  });
}

describe("SocketClient", () => {
  const cleanupSocks: string[] = [];

  afterEach(() => {
    for (const p of cleanupSocks.splice(0)) {
      if (existsSync(p)) try { unlinkSync(p); } catch {}
    }
  });

  test("connect + register → receive ack", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);
    const server = makeTestServer(sockPath);
    await server.listen();

    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "sess-conn",
        projectRoot: "/test",
        pid: process.pid,
      });

      const ack = await client.connect();
      expect(ack.sessionToken).toBe("tok-sess-conn");
      expect(ack.serverVersion).toBe("1");
      expect(client.connected).toBe(true);
      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("request/response correlation", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = makeTestServer(sockPath, {
      onRpcRequest: async (_sid, req) => {
        if (req.method === "publishEvent") return { result: 99 };
        return { error: "unknown" };
      },
    });
    await server.listen();

    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "sess-req",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const resp = await client.request({
        id: randomUUID(),
        type: "rpc-request",
        payload: { method: "publishEvent", args: [] },
      });
      expect((resp.payload as any).result).toBe(99);
      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("multiple concurrent requests resolve independently", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = makeTestServer(sockPath, {
      onRpcRequest: async (_sid, req) => {
        // Return method name as result to distinguish
        return { result: req.method };
      },
    });
    await server.listen();

    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "sess-concurrent",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const [r1, r2, r3] = await Promise.all([
        client.request({ id: randomUUID(), type: "rpc-request", payload: { method: "methodA", args: [] } }),
        client.request({ id: randomUUID(), type: "rpc-request", payload: { method: "methodB", args: [] } }),
        client.request({ id: randomUUID(), type: "rpc-request", payload: { method: "methodC", args: [] } }),
      ]);

      expect((r1.payload as any).result).toBe("methodA");
      expect((r2.payload as any).result).toBe("methodB");
      expect((r3.payload as any).result).toBe("methodC");
      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("push message delivered to onPush callback", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = makeTestServer(sockPath);
    await server.listen();

    try {
      const pushReceived: IpcMessage[] = [];
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "sess-push",
        projectRoot: "/test",
        pid: process.pid,
        onPush: (msg) => pushReceived.push(msg),
      });
      await client.connect();

      // Give server time to register the session
      await new Promise((r) => setTimeout(r, 50));

      server.pushToSession("sess-push", {
        id: randomUUID(),
        type: "event-push",
        payload: { data: "pushed!" },
      });

      await new Promise((r) => setTimeout(r, 100));
      expect(pushReceived.length).toBe(1);
      expect((pushReceived[0].payload as any).data).toBe("pushed!");
      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("reconnect on server restart", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server1 = makeTestServer(sockPath);
    await server1.listen();

    const client = createSocketClient({
      socketPath: sockPath,
      sessionId: "sess-reconnect",
      projectRoot: "/test",
      pid: process.pid,
      reconnect: { initialDelayMs: 50, maxDelayMs: 500, maxRetries: 5 },
    });

    await client.connect();
    expect(client.connected).toBe(true);

    // Close server, client should detect disconnect
    await server1.close();
    await new Promise((r) => setTimeout(r, 100));

    // Start new server on same path (stale socket handled by server)
    const server2 = makeTestServer(sockPath);
    await server2.listen();

    // Wait for reconnect
    await new Promise((r) => setTimeout(r, 800));
    expect(client.connected).toBe(true);
    expect(server2.getConnectedSessions()).toContain("sess-reconnect");

    client.close();
    await new Promise((r) => setTimeout(r, 50));
    await server2.close();
  });

  test("max retries exceeded → client stays disconnected", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = makeTestServer(sockPath);
    await server.listen();

    const client = createSocketClient({
      socketPath: sockPath,
      sessionId: "sess-maxretry",
      projectRoot: "/test",
      pid: process.pid,
      reconnect: { initialDelayMs: 20, maxDelayMs: 100, maxRetries: 2 },
    });

    await client.connect();
    await server.close();

    // Wait for max retries to exhaust (2 retries × ~100ms max + buffer)
    await new Promise((r) => setTimeout(r, 600));
    expect(client.connected).toBe(false);
    client.close();
  });

  test("close() cancels pending requests", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    // Server that never responds to rpc-request (hangs)
    const netServer = net.createServer((socket) => {
      const decoder = createFrameDecoder((msg) => {
        const m = msg as IpcMessage;
        if (m.type === "register") {
          socket.write(encodeMessage({
            id: m.id,
            type: "register-ack",
            payload: { sessionToken: "tok", serverVersion: "1" } satisfies RegisterAckPayload,
          }));
        }
        // rpc-request: intentionally no response
      });
      socket.on("data", decoder);
      socket.on("error", () => {});
    });
    await new Promise<void>((r) => netServer.listen(sockPath, r));

    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "sess-cancel",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const pendingPromise = client.request({
        id: randomUUID(),
        type: "rpc-request",
        payload: { method: "neverResponds", args: [] },
      });

      // Close immediately — pending request should reject
      await new Promise((r) => setTimeout(r, 20));
      client.close();

      await expect(pendingPromise).rejects.toThrow();
    } finally {
      await new Promise<void>((r) => netServer.close(() => r()));
      if (existsSync(sockPath)) try { unlinkSync(sockPath); } catch {}
    }
  });
});
