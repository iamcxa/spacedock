// spacebridge/src/ipc/index.ts
// ABOUTME: Barrel export for the IPC module — re-exports all public types and factory functions.

export { encodeMessage, createFrameDecoder } from "./framing";

export type {
  IpcMessage,
  IpcRequestType,
  IpcResponseType,
  IpcPushType,
  RegisterPayload,
  RegisterAckPayload,
  RpcRequestPayload,
  RpcResponsePayload,
  CoordinationRequestPayload,
  CoordinationResponsePayload,
} from "./types";
export { isIpcMessage } from "./types";

export type { SocketServer, SocketServerOptions } from "./socket-server";
export { createSocketServer } from "./socket-server";

export type { SocketClient, SocketClientOptions } from "./socket-client";
export { createSocketClient } from "./socket-client";

export { createChannelProviderBridge } from "./channel-provider-bridge";
export type { ChannelProviderBridgeOptions } from "./channel-provider-bridge";

export type {
  CoordinationClient,
  Role,
  EntityRef,
  LeaseToken,
} from "./coordination-client-stub";
export { createCoordinationClientStub } from "./coordination-client-stub";
