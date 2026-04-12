// spacebridge/src/ipc/types.test.ts
// ABOUTME: Type-level and runtime tests for IPC message type definitions.

import { describe, test, expect } from "bun:test";
import type {
  IpcMessage,
  RegisterPayload,
  RegisterAckPayload,
  RpcRequestPayload,
  RpcResponsePayload,
  CoordinationRequestPayload,
  CoordinationResponsePayload,
} from "./types";
import { isIpcMessage } from "./types";

describe("IpcMessage runtime type guard", () => {
  test("valid IpcMessage passes", () => {
    const msg = { id: "abc", type: "register", payload: {} };
    expect(isIpcMessage(msg)).toBe(true);
  });

  test("missing id fails", () => {
    expect(isIpcMessage({ type: "register", payload: {} })).toBe(false);
  });

  test("missing type fails", () => {
    expect(isIpcMessage({ id: "abc", payload: {} })).toBe(false);
  });

  test("null fails", () => {
    expect(isIpcMessage(null)).toBe(false);
  });

  test("non-object fails", () => {
    expect(isIpcMessage("string")).toBe(false);
  });
});

describe("Type-level assignability (compile-time)", () => {
  test("RegisterPayload satisfies shape", () => {
    const p: RegisterPayload = {
      projectRoot: "/some/path",
      sessionId: "sess-1",
      pid: 1234,
      protocolVersion: 1,
    };
    expect(p.protocolVersion).toBe(1);
  });

  test("RegisterAckPayload satisfies shape", () => {
    const p: RegisterAckPayload = {
      sessionToken: "tok-abc",
      serverVersion: "1.0.0",
    };
    expect(typeof p.sessionToken).toBe("string");
  });

  test("RpcRequestPayload satisfies shape", () => {
    const p: RpcRequestPayload = {
      method: "publishEvent",
      args: [{ type: "event" }],
    };
    expect(p.method).toBe("publishEvent");
  });

  test("RpcResponsePayload with result", () => {
    const p: RpcResponsePayload = { result: 42 };
    expect(p.result).toBe(42);
  });

  test("RpcResponsePayload with error", () => {
    const p: RpcResponsePayload = { error: "not found" };
    expect(p.error).toBe("not found");
  });

  test("CoordinationRequestPayload satisfies shape", () => {
    const p: CoordinationRequestPayload = {
      method: "getAvailableWork",
      args: ["FO"],
    };
    expect(p.method).toBe("getAvailableWork");
  });

  test("CoordinationResponsePayload satisfies shape", () => {
    const p: CoordinationResponsePayload = { result: [] };
    expect(Array.isArray(p.result)).toBe(true);
  });

  test("IpcMessage type wraps any type string", () => {
    const msg: IpcMessage = {
      id: "uuid-1",
      type: "rpc-request",
      payload: { method: "publishEvent", args: [] } satisfies RpcRequestPayload,
    };
    expect(msg.type).toBe("rpc-request");
  });
});
