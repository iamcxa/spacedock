// spacebridge/src/ipc/types.ts
// ABOUTME: Shared IPC message type definitions for unix socket protocol v1.
// Message framing: 4-byte big-endian length prefix + UTF-8 JSON payload.
// Protocol version: handshake-level (protocolVersion field in RegisterPayload).

// ─── Envelope ────────────────────────────────────────────────────────────────

export interface IpcMessage {
  id: string;       // UUID for request/response correlation
  type: string;     // message type discriminator
  payload: unknown; // type-specific payload
}

export function isIpcMessage(value: unknown): value is IpcMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.type === "string" && "payload" in v;
}

// ─── Request types (shim → daemon) ──────────────────────────────────────────

export type IpcRequestType =
  | "register"             // shim → daemon: session registration
  | "heartbeat"            // shim → daemon: keepalive
  | "rpc-request"          // shim → daemon: ChannelProvider method call
  | "coordination-request"; // shim → daemon: CoordinationClient method call

// ─── Response types (daemon → shim) ─────────────────────────────────────────

export type IpcResponseType =
  | "register-ack"          // daemon → shim: registration acknowledged
  | "heartbeat-ack"         // daemon → shim: keepalive ack
  | "rpc-response"          // daemon → shim: method return value
  | "coordination-response"; // daemon → shim: coordination return value

// ─── Push types (daemon → shim, unsolicited) ─────────────────────────────────

export type IpcPushType =
  | "event-push"   // daemon → shim: inbound event
  | "action-push"; // daemon → shim: inbound action

// ─── Payload shapes ──────────────────────────────────────────────────────────

export interface RegisterPayload {
  projectRoot: string;
  sessionId: string;
  pid: number;
  protocolVersion: 1;
}

export interface RegisterAckPayload {
  sessionToken: string;
  serverVersion: string;
}

export interface RpcRequestPayload {
  method: string;   // ChannelProvider method name
  args: unknown[];  // method arguments (serializable)
}

export interface RpcResponsePayload {
  result?: unknown;
  error?: string;
}

export interface CoordinationRequestPayload {
  method: string;   // CoordinationClient method name
  args: unknown[];
}

export interface CoordinationResponsePayload {
  result?: unknown;
  error?: string;
}
