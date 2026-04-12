// spacebridge/src/ipc/channel-provider-bridge.test.ts
// ABOUTME: Tests for ChannelProviderBridge — forwards ChannelProvider calls via socket RPC.

import { describe, test, expect } from "bun:test";
import { createChannelProviderBridge } from "./channel-provider-bridge";
import { randomUUID } from "node:crypto";
import type { IpcMessage } from "./types";
import type { SocketClient } from "./socket-client";
import type { AgentEvent } from "../../../tools/dashboard/src/types";

function makeFakeClient(
  responseMap: Record<string, unknown>,
): SocketClient & { sentMessages: IpcMessage[] } {
  const sentMessages: IpcMessage[] = [];

  const client: SocketClient & { sentMessages: IpcMessage[] } = {
    sentMessages,
    connected: true,
    connect: async () => ({ sessionToken: "tok", serverVersion: "1" }),
    close: () => {},
    request: async (msg: IpcMessage): Promise<IpcMessage> => {
      sentMessages.push(msg);
      const payload = msg.payload as { method: string; args: unknown[] };
      const result = responseMap[payload.method] ?? null;
      return { id: msg.id, type: "rpc-response", payload: { result } };
    },
  };

  return client;
}

describe("ChannelProviderBridge", () => {
  const sampleEvent: AgentEvent = {
    type: "channel_response" as any,
    entity: "test-entity",
    stage: "execute",
    agent: "fo",
    timestamp: new Date().toISOString(),
    detail: "hello",
  };

  test("publishEvent sends correct RPC and returns sequence number", async () => {
    const client = makeFakeClient({ publishEvent: 7 });
    const bridge = createChannelProviderBridge({ client });

    const seq = await bridge.publishEvent(sampleEvent);
    expect(seq).toBe(7);
    expect(client.sentMessages.length).toBe(1);
    const sent = client.sentMessages[0];
    expect(sent.type).toBe("rpc-request");
    const payload = sent.payload as any;
    expect(payload.method).toBe("publishEvent");
    expect(payload.args[0]).toEqual(sampleEvent);
  });

  test("createSnapshot sends correct RPC and returns EntitySnapshot", async () => {
    const fakeSnap = {
      id: 1, entity: "e", version: 2, body: "body",
      frontmatter: null, author: "fo", reason: "test",
      source: "update", rollback_from_version: null,
      rollback_section: null, created_at: "2026-01-01T00:00:00Z",
    };
    const client = makeFakeClient({ createSnapshot: fakeSnap });
    const bridge = createChannelProviderBridge({ client });

    const input = {
      entity: "e", body: "body", author: "fo",
      reason: "test", source: "update" as const,
    };
    const snap = await bridge.snapshotStore.createSnapshot(input);
    expect(snap).toEqual(fakeSnap);
    const sent = client.sentMessages[0];
    expect((sent.payload as any).method).toBe("createSnapshot");
    expect((sent.payload as any).args[0]).toEqual(input);
  });

  test("getChannelMessagesSince sends correct RPC and returns events", async () => {
    const fakeEvents = [
      { seq: 1, event: sampleEvent },
      { seq: 2, event: sampleEvent },
    ];
    const client = makeFakeClient({ getChannelMessagesSince: fakeEvents });
    const bridge = createChannelProviderBridge({ client });

    const events = await bridge.eventBuffer.getChannelMessagesSince(0, "test-entity");
    expect(events).toEqual(fakeEvents);
    const sent = client.sentMessages[0];
    expect((sent.payload as any).method).toBe("getChannelMessagesSince");
    expect((sent.payload as any).args).toEqual([0, "test-entity"]);
  });

  test("broadcastChannelStatus sends fire-and-forget RPC", async () => {
    const client = makeFakeClient({ broadcastChannelStatus: undefined });
    const bridge = createChannelProviderBridge({ client });

    await bridge.broadcastChannelStatus(true);
    expect(client.sentMessages.length).toBe(1);
    expect((client.sentMessages[0].payload as any).method).toBe("broadcastChannelStatus");
    expect((client.sentMessages[0].payload as any).args[0]).toBe(true);
  });

  test("port returns undefined (bridge has no local HTTP port)", () => {
    const client = makeFakeClient({});
    const bridge = createChannelProviderBridge({ client });
    expect(bridge.port).toBeUndefined();
  });

  test("stop() calls client.close()", () => {
    let closed = false;
    const client = makeFakeClient({});
    (client as any).close = () => { closed = true; };
    const bridge = createChannelProviderBridge({ client });

    bridge.stop();
    expect(closed).toBe(true);
  });
});
