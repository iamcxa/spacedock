// spacebridge/src/domain/session/decider.test.ts
// ABOUTME: Pure unit tests for the session decider. No DB, no I/O — only pure function assertions.

import { describe, test, expect } from "bun:test";
import { decide } from "./decider";
import { emptySessionState } from "./types";
import type { SessionState } from "./types";
import { SessionNotFound } from "./errors";

const NOW = 1_000_000;

function stateWithSession(sessionId: string, projectRoot = "/repo-a", pid = 42): SessionState {
  return {
    sessions: new Map([
      [sessionId, {
        sessionId,
        projectRoot,
        pid,
        connectedAt: NOW - 5000,
        lastHeartbeat: NOW - 1000,
      }],
    ]),
  };
}

describe("register", () => {
  test("returns session_registered event on empty state", () => {
    const events = decide(
      { type: "register", sessionId: "sess-1", projectRoot: "/repo-a", pid: 42, protocolVersion: 1 },
      emptySessionState,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_registered");
    const ev = events[0] as { sessionId: string; projectRoot: string; pid: number; connectedAt: number; lastHeartbeat: number };
    expect(ev.sessionId).toBe("sess-1");
    expect(ev.projectRoot).toBe("/repo-a");
    expect(ev.pid).toBe(42);
    expect(ev.connectedAt).toBe(NOW);
    expect(ev.lastHeartbeat).toBe(NOW);
  });

  test("returns session_reconnected event when session already exists (A-11 idempotency)", () => {
    const state = stateWithSession("sess-1");
    const events = decide(
      { type: "register", sessionId: "sess-1", projectRoot: "/repo-b", pid: 99, protocolVersion: 1 },
      state,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_reconnected");
    const ev = events[0] as { sessionId: string; projectRoot: string; pid: number };
    expect(ev.sessionId).toBe("sess-1");
    expect(ev.projectRoot).toBe("/repo-b");
    expect(ev.pid).toBe(99);
  });
});

describe("heartbeat", () => {
  test("returns session_heartbeat event for active session", () => {
    const state = stateWithSession("sess-1");
    const events = decide(
      { type: "heartbeat", sessionId: "sess-1", timestamp: NOW },
      state,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_heartbeat");
    const ev = events[0] as { sessionId: string; lastHeartbeat: number };
    expect(ev.sessionId).toBe("sess-1");
    expect(ev.lastHeartbeat).toBe(NOW);
  });

  test("throws SessionNotFound for unknown sessionId", () => {
    expect(() =>
      decide(
        { type: "heartbeat", sessionId: "ghost", timestamp: NOW },
        emptySessionState,
        NOW,
      )
    ).toThrow(SessionNotFound);
  });
});

describe("disconnect", () => {
  test("returns session_disconnected event for active session", () => {
    const state = stateWithSession("sess-1");
    const events = decide(
      { type: "disconnect", sessionId: "sess-1", reason: "explicit" },
      state,
      NOW,
    );
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_disconnected");
    const ev = events[0] as { sessionId: string; reason: string; disconnectedAt: number };
    expect(ev.sessionId).toBe("sess-1");
    expect(ev.reason).toBe("explicit");
    expect(ev.disconnectedAt).toBe(NOW);
  });

  test("returns [] (no-op) for missing sessionId (idempotent double-disconnect)", () => {
    const events = decide(
      { type: "disconnect", sessionId: "ghost", reason: "explicit" },
      emptySessionState,
      NOW,
    );
    expect(events).toEqual([]);
  });

  test("disconnect with reason timeout", () => {
    const state = stateWithSession("sess-1");
    const events = decide(
      { type: "disconnect", sessionId: "sess-1", reason: "timeout" },
      state,
      NOW,
    );
    expect(events[0].type).toBe("session_disconnected");
    const ev = events[0] as { reason: string };
    expect(ev.reason).toBe("timeout");
  });
});
