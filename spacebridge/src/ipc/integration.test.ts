// spacebridge/src/ipc/integration.test.ts
// ABOUTME: End-to-end integration test wiring server + client + bridge + stub together.
// Covers: register→RPC→disconnect→reconnect full cycle.

import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentEvent } from "../../../tools/dashboard/src/types";
import { createChannelProviderBridge } from "./channel-provider-bridge";
import { createCoordinationClientStub } from "./coordination-client-stub";
import { createSocketClient } from "./socket-client";
import { createSocketServer } from "./socket-server";
import type { RpcRequestPayload, RpcResponsePayload } from "./types";

function tempSock(): string {
  // macOS unix socket path limit ~104 chars; use short prefix + 8-char hash
  const short = randomUUID().replace(/-/g, "").slice(0, 8);
  return join(tmpdir(), `ti-${short}.sock`);
}

const sampleEvent: AgentEvent = {
  type: "channel_response" as any,
  entity: "test-entity",
  stage: "execute",
  agent: "fo",
  timestamp: new Date().toISOString(),
  detail: "integration test event",
};

const fakeSnapshot = {
  id: 1,
  entity: "test-entity",
  version: 5,
  body: "snapshot body",
  frontmatter: null,
  author: "fo",
  reason: "integration test",
  source: "update" as const,
  rollback_from_version: null,
  rollback_section: null,
  created_at: "2026-01-01T00:00:00Z",
};

const fakeEvents = [
  { seq: 1, event: sampleEvent },
  { seq: 2, event: sampleEvent },
];

/** Mock RPC dispatch — simulates daemon-side ChannelProvider operations */
async function mockRpcHandler(
  _sessionId: string,
  req: RpcRequestPayload,
): Promise<RpcResponsePayload> {
  switch (req.method) {
    case "publishEvent":
      return { result: 42 };
    case "createSnapshot":
      return { result: fakeSnapshot };
    case "getChannelMessagesSince":
      return { result: fakeEvents };
    case "broadcastChannelStatus":
      return { result: undefined };
    default:
      return { error: `Unknown method: ${req.method}` };
  }
}

describe("IPC Integration", () => {
  const cleanupSocks: string[] = [];

  afterEach(() => {
    for (const p of cleanupSocks.splice(0)) {
      if (existsSync(p))
        try {
          unlinkSync(p);
        } catch {}
    }
  });

  test("1. start server, connect client, register", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: (sess) => ({ sessionToken: `tok-${sess.sessionId}`, serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "int-sess-1",
        projectRoot: "/test",
        pid: process.pid,
      });

      const ack = await client.connect();
      expect(ack.sessionToken).toBe("tok-int-sess-1");
      expect(ack.serverVersion).toBe("1");

      await new Promise((r) => setTimeout(r, 20));
      expect(server.getConnectedSessions()).toContain("int-sess-1");

      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("2. bridge.publishEvent → server receives RPC and returns sequence number", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "int-sess-2",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const bridge = createChannelProviderBridge({ client });
      const seq = await bridge.publishEvent(sampleEvent);
      expect(seq).toBe(42);

      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("3. bridge.snapshotStore.createSnapshot → server returns snapshot", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "int-sess-3",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const bridge = createChannelProviderBridge({ client });
      const snap = await bridge.snapshotStore.createSnapshot({
        entity: "test-entity",
        body: "snapshot body",
        author: "fo",
        reason: "integration test",
        source: "update",
      });
      expect(snap).toEqual(fakeSnapshot);
      expect(snap.version).toBe(5);

      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("4. bridge.eventBuffer.getChannelMessagesSince → server returns events", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });

    await server.listen();
    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "int-sess-4",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();

      const bridge = createChannelProviderBridge({ client });
      const events = await bridge.eventBuffer.getChannelMessagesSince(0);
      expect(events).toEqual(fakeEvents);
      expect(events.length).toBe(2);

      client.close();
      await new Promise((r) => setTimeout(r, 50));
    } finally {
      await server.close();
    }
  });

  test("5. CoordinationClient stub getAvailableWork returns []", async () => {
    const stub = createCoordinationClientStub();
    const result = await stub.getAvailableWork("FO");
    expect(result).toEqual([]);
  });

  test("6. disconnect client → server onDisconnect fires", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const disconnected: string[] = [];
    const server = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: (sessionId) => disconnected.push(sessionId),
    });

    await server.listen();
    try {
      const client = createSocketClient({
        socketPath: sockPath,
        sessionId: "int-sess-disc",
        projectRoot: "/test",
        pid: process.pid,
      });
      await client.connect();
      await new Promise((r) => setTimeout(r, 20));

      client.close();
      await new Promise((r) => setTimeout(r, 100));

      expect(disconnected).toContain("int-sess-disc");
      expect(server.getConnectedSessions()).not.toContain("int-sess-disc");
    } finally {
      await server.close();
    }
  });

  test("7. restart server → client reconnects and re-registers", async () => {
    const sockPath = tempSock();
    cleanupSocks.push(sockPath);

    const server1 = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });
    await server1.listen();

    const client = createSocketClient({
      socketPath: sockPath,
      sessionId: "int-sess-reconnect",
      projectRoot: "/test",
      pid: process.pid,
      reconnect: { initialDelayMs: 50, maxDelayMs: 500, maxRetries: 5 },
    });
    await client.connect();
    expect(client.connected).toBe(true);

    await server1.close();
    await new Promise((r) => setTimeout(r, 100));

    const server2 = createSocketServer({
      socketPath: sockPath,
      onRegister: () => ({ sessionToken: "tok2", serverVersion: "1" }),
      onRpcRequest: mockRpcHandler,
      onCoordinationRequest: async () => ({ result: null }),
      onDisconnect: () => {},
    });
    await server2.listen();

    await new Promise((r) => setTimeout(r, 800));
    expect(client.connected).toBe(true);
    expect(server2.getConnectedSessions()).toContain("int-sess-reconnect");

    client.close();
    await new Promise((r) => setTimeout(r, 50));
    await server2.close();
  });
});
