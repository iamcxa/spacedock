// spacebridge/src/ipc/socket-server.test.ts
// ABOUTME: Tests for the unix socket server (daemon side).

import { describe, test, expect, afterEach } from "bun:test";
import { createSocketServer } from "./socket-server";
import { createFrameDecoder, encodeMessage } from "./framing";
import * as net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { unlinkSync, existsSync } from "node:fs";
import type {
  RegisterPayload,
  RegisterAckPayload,
  RpcRequestPayload,
  RpcResponsePayload,
  CoordinationRequestPayload,
  CoordinationResponsePayload,
  IpcMessage,
} from "./types";

function tempSock(): string {
  return join(tmpdir(), `test-server-${randomUUID()}.sock`);
}

function connectAndRegister(
  socketPath: string,
  sessionId: string,
): Promise<{ socket: net.Socket; ack: RegisterAckPayload }> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    const received: IpcMessage[] = [];
    const decoder = createFrameDecoder((msg) => received.push(msg as IpcMessage));

    socket.on("data", (chunk) => {
      decoder(chunk);
      const ack = received.find((m) => m.type === "register-ack");
      if (ack) resolve({ socket, ack: ack.payload as RegisterAckPayload });
    });

    socket.on("error", reject);

    socket.on("connect", () => {
      const regMsg: IpcMessage = {
        id: randomUUID(),
        type: "register",
        payload: {
          projectRoot: "/test",
          sessionId,
          pid: process.pid,
          protocolVersion: 1,
        } satisfies RegisterPayload,
      };
      socket.write(encodeMessage(regMsg));
    });
  });
}

describe("SocketServer", () => {
  const cleanupSocks: string[] = [];

  afterEach(() => {
    for (const p of cleanupSocks.splice(0)) {
      if (existsSync(p)) try { unlinkSync(p); } catch {}
    }
  });

  test("server listens and accepts connection", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);
    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: (_sess) => ({ sessionToken: "tok-1", serverVersion: "1" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const { socket, ack } = await connectAndRegister(sockPath, "sess-1");
      expect(ack.sessionToken).toBe("tok-1");
      socket.destroy();
      // Allow cleanup
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("register message → ack response with session registered", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);
    const registered: string[] = [];

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: (sess) => {
        registered.push(sess.sessionId);
        return { sessionToken: "tok-" + sess.sessionId, serverVersion: "1" };
      },
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const { socket } = await connectAndRegister(sockPath, "sess-A");
      await new Promise((r) => setTimeout(r, 20));
      expect(registered).toContain("sess-A");
      expect(server.getConnectedSessions()).toContain("sess-A");
      socket.destroy();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("RPC request → response round-trip", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: async (_sessionId, req: RpcRequestPayload) => {
        if (req.method === "publishEvent") return { result: 42 };
        return { error: "unknown method" };
      },
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const { socket } = await connectAndRegister(sockPath, "sess-rpc");
      await new Promise((r) => setTimeout(r, 20));

      const rpcId = randomUUID();
      const rpcMsg: IpcMessage = {
        id: rpcId,
        type: "rpc-request",
        payload: { method: "publishEvent", args: [{ type: "test" }] } satisfies RpcRequestPayload,
      };

      const responsePromise = new Promise<IpcMessage>((resolve) => {
        const dec = createFrameDecoder((msg) => {
          const m = msg as IpcMessage;
          if (m.type === "rpc-response" && m.id === rpcId) resolve(m);
        });
        socket.on("data", dec);
      });

      socket.write(encodeMessage(rpcMsg));
      const resp = await responsePromise;
      expect((resp.payload as RpcResponsePayload).result).toBe(42);
      socket.destroy();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("client disconnect → onDisconnect callback fired", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);
    const disconnected: string[] = [];

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: (sessionId) => disconnected.push(sessionId),
    });

    await server.listen();
    try {
      const { socket } = await connectAndRegister(sockPath, "sess-disc");
      await new Promise((r) => setTimeout(r, 20));
      socket.destroy();
      await new Promise((r) => setTimeout(r, 100));
      expect(disconnected).toContain("sess-disc");
      expect(server.getConnectedSessions()).not.toContain("sess-disc");
    } finally {
      await server.close();
    }
  });

  test("pushToSession delivers message to correct client", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: (sess) => ({ sessionToken: "tok-" + sess.sessionId, serverVersion: "1" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const { socket: sockA } = await connectAndRegister(sockPath, "sess-push-A");
      const { socket: sockB } = await connectAndRegister(sockPath, "sess-push-B");
      await new Promise((r) => setTimeout(r, 20));

      const pushReceived: IpcMessage[] = [];
      const dec = createFrameDecoder((msg) => pushReceived.push(msg as IpcMessage));
      sockA.on("data", dec);

      const pushed = server.pushToSession("sess-push-A", {
        id: randomUUID(),
        type: "event-push",
        payload: { event: "hello" },
      });
      expect(pushed).toBe(true);

      await new Promise((r) => setTimeout(r, 50));
      const eventPushes = pushReceived.filter((m) => m.type === "event-push");
      expect(eventPushes.length).toBe(1);
      expect((eventPushes[0].payload as any).event).toBe("hello");

      sockA.destroy();
      sockB.destroy();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("pushToAll delivers to all connected clients", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: (sess) => ({ sessionToken: "tok-" + sess.sessionId, serverVersion: "1" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const { socket: sockA } = await connectAndRegister(sockPath, "sess-all-A");
      const { socket: sockB } = await connectAndRegister(sockPath, "sess-all-B");
      await new Promise((r) => setTimeout(r, 20));

      const receivedA: IpcMessage[] = [];
      const receivedB: IpcMessage[] = [];
      sockA.on("data", createFrameDecoder((m) => receivedA.push(m as IpcMessage)));
      sockB.on("data", createFrameDecoder((m) => receivedB.push(m as IpcMessage)));

      server.pushToAll({ id: randomUUID(), type: "event-push", payload: { broadcast: true } });

      await new Promise((r) => setTimeout(r, 50));
      expect(receivedA.filter((m) => m.type === "event-push").length).toBe(1);
      expect(receivedB.filter((m) => m.type === "event-push").length).toBe(1);

      sockA.destroy();
      sockB.destroy();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("stale socket file cleaned up on listen", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    // Create a stale socket file
    const staleServer = net.createServer();
    await new Promise<void>((r) => staleServer.listen(sockPath, r));
    await new Promise<void>((r) => staleServer.close(r));
    // File now exists (stale)
    expect(existsSync(sockPath)).toBe(true);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: async () => ({ result: null }),
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    // Should not throw despite stale socket
    await server.listen();
    const { socket } = await connectAndRegister(sockPath, "sess-stale");
    expect(socket.readyState).toBe("open");
    socket.destroy();
    await new Promise((r) => setTimeout(r, 50));
    await server.close();
  });
});
