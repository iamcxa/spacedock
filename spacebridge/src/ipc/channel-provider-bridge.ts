// spacebridge/src/ipc/channel-provider-bridge.ts
// ABOUTME: ChannelProvider implementation that forwards all calls to the daemon via socket RPC.
// Each method serializes the call as an rpc-request IpcMessage and awaits the rpc-response.
// Return types are Promise<T> — enabled by the ChannelProvider interface update (task-6).

import { randomUUID } from "node:crypto";
import type { ChannelProvider } from "../../../tools/dashboard/src/channel-provider";
import type { AgentEvent, SequencedEvent } from "../../../tools/dashboard/src/types";
import type { EntitySnapshot } from "../../../tools/dashboard/src/types";
import type { CreateSnapshotInput } from "../../../tools/dashboard/src/channel-provider";
import type { SocketClient } from "./socket-client";
import type { RpcResponsePayload } from "./types";

export interface ChannelProviderBridgeOptions {
  client: SocketClient;
}

export function createChannelProviderBridge(opts: ChannelProviderBridgeOptions): ChannelProvider {
  const { client } = opts;

  async function rpc(method: string, args: unknown[]): Promise<unknown> {
    const id = randomUUID();
    const resp = await client.request({
      id,
      type: "rpc-request",
      payload: { method, args },
    });
    const payload = resp.payload as RpcResponsePayload;
    if (payload.error) throw new Error(`RPC ${method} failed: ${payload.error}`);
    return payload.result;
  }

  return {
    async publishEvent(event: AgentEvent): Promise<number> {
      return (await rpc("publishEvent", [event])) as number;
    },

    async broadcastChannelStatus(connected: boolean): Promise<void> {
      await rpc("broadcastChannelStatus", [connected]);
    },

    eventBuffer: {
      async getChannelMessagesSince(afterSeq: number, entity?: string): Promise<SequencedEvent[]> {
        return (await rpc("getChannelMessagesSince", [afterSeq, entity])) as SequencedEvent[];
      },
    },

    snapshotStore: {
      async createSnapshot(input: CreateSnapshotInput): Promise<EntitySnapshot> {
        return (await rpc("createSnapshot", [input])) as EntitySnapshot;
      },
    },

    port: undefined,

    stop(): void {
      client.close();
    },
  };
}
