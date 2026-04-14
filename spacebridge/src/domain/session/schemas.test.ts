// spacebridge/src/domain/session/schemas.test.ts
// ABOUTME: Smoke tests for session Zod schemas. Validates parseCommand/parseEvent helpers.

import { describe, test, expect } from "bun:test";
import { parseCommand, parseEvent } from "./schemas";

const NOW = 1_000_000;

describe("parseCommand", () => {
  test("accepts valid register command", () => {
    const result = parseCommand({
      type: "register",
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      protocolVersion: 1,
    });
    expect(result.type).toBe("register");
  });

  test("accepts valid heartbeat command", () => {
    const result = parseCommand({
      type: "heartbeat",
      sessionId: "sess-1",
      timestamp: NOW,
    });
    expect(result.type).toBe("heartbeat");
  });

  test("accepts valid disconnect command", () => {
    const result = parseCommand({
      type: "disconnect",
      sessionId: "sess-1",
      reason: "explicit",
    });
    expect(result.type).toBe("disconnect");
  });

  test("rejects empty object", () => {
    expect(() => parseCommand({})).toThrow();
  });

  test("rejects unknown type", () => {
    expect(() => parseCommand({ type: "unknown", sessionId: "s" })).toThrow();
  });

  test("passthrough preserves extra fields", () => {
    const result = parseCommand({
      type: "register",
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      protocolVersion: 1,
      extraField: "preserved",
    });
    expect((result as Record<string, unknown>).extraField).toBe("preserved");
  });
});

describe("parseEvent", () => {
  test("accepts valid session_registered event", () => {
    const result = parseEvent({
      type: "session_registered",
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      connectedAt: NOW,
      lastHeartbeat: NOW,
    });
    expect(result.type).toBe("session_registered");
  });

  test("accepts valid session_reconnected event", () => {
    const result = parseEvent({
      type: "session_reconnected",
      sessionId: "sess-1",
      projectRoot: "/repo-b",
      pid: 99,
      lastHeartbeat: NOW,
    });
    expect(result.type).toBe("session_reconnected");
  });

  test("accepts valid session_heartbeat event", () => {
    const result = parseEvent({
      type: "session_heartbeat",
      sessionId: "sess-1",
      lastHeartbeat: NOW,
    });
    expect(result.type).toBe("session_heartbeat");
  });

  test("accepts valid session_disconnected event", () => {
    const result = parseEvent({
      type: "session_disconnected",
      sessionId: "sess-1",
      reason: "timeout",
      disconnectedAt: NOW,
    });
    expect(result.type).toBe("session_disconnected");
  });

  test("rejects empty object", () => {
    expect(() => parseEvent({})).toThrow();
  });

  test("rejects unknown type", () => {
    expect(() => parseEvent({ type: "session_unknown" })).toThrow();
  });
});
