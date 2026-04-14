// spacebridge/src/ipc/index.ts
// ABOUTME: Barrel export for the IPC module — re-exports all public types and factory functions.

export type { ChannelProviderBridgeOptions } from "./channel-provider-bridge";
export { createChannelProviderBridge } from "./channel-provider-bridge";
export type {
  CoordinationClient,
  EntityRef,
  LeaseToken,
  Role,
} from "./coordination-client-stub";
export { createCoordinationClientStub } from "./coordination-client-stub";
export { createFrameDecoder, encodeMessage } from "./framing";

export type { SocketClient, SocketClientOptions } from "./socket-client";
export { createSocketClient } from "./socket-client";
export type { SocketServer, SocketServerOptions } from "./socket-server";
export { createSocketServer } from "./socket-server";
export type {
  CoordinationRequestPayload,
  CoordinationResponsePayload,
  IpcMessage,
  IpcPushType,
  IpcRequestType,
  IpcResponseType,
  RegisterAckPayload,
  RegisterPayload,
  RpcRequestPayload,
  RpcResponsePayload,
} from "./types";
export { isIpcMessage } from "./types";
