// spacebridge/src/domain/session/evolve.test.ts
// ABOUTME: Pure unit tests for the session evolve function. No DB, no I/O.

import { describe, expect, test } from "bun:test";
import { evolve, replay } from "./evolve";
import type { SessionEvent } from "./types";
import { emptySessionState } from "./types";

const NOW = 1_000_000;

const registeredEvent: SessionEvent = {
  type: "session_registered",
  sessionId: "sess-1",
  projectRoot: "/repo-a",
  pid: 42,
  connectedAt: NOW,
  lastHeartbeat: NOW,
};

describe("evolve", () => {
  test("session_registered adds session to state", () => {
    const state = evolve(emptySessionState, registeredEvent);
    expect(state.sessions.size).toBe(1);
    const record = state.sessions.get("sess-1");
    expect(record?.sessionId).toBe("sess-1");
    expect(record?.projectRoot).toBe("/repo-a");
    expect(record?.pid).toBe(42);
    expect(record?.connectedAt).toBe(NOW);
    expect(record?.lastHeartbeat).toBe(NOW);
  });

  test("session_reconnected updates pid/projectRoot/lastHeartbeat", () => {
    const state1 = evolve(emptySessionState, registeredEvent);
    const state2 = evolve(state1, {
      type: "session_reconnected",
      sessionId: "sess-1",
      projectRoot: "/repo-b",
      pid: 99,
      lastHeartbeat: NOW + 1000,
    });
    expect(state2.sessions.size).toBe(1);
    const record = state2.sessions.get("sess-1");
    expect(record?.projectRoot).toBe("/repo-b");
    expect(record?.pid).toBe(99);
    expect(record?.lastHeartbeat).toBe(NOW + 1000);
    // connectedAt is preserved
    expect(record?.connectedAt).toBe(NOW);
  });

  test("session_reconnected is no-op for unknown sessionId", () => {
    const state = evolve(emptySessionState, {
      type: "session_reconnected",
      sessionId: "ghost",
      projectRoot: "/repo-x",
      pid: 1,
      lastHeartbeat: NOW,
    });
    expect(state.sessions.size).toBe(0);
  });

  test("session_heartbeat updates lastHeartbeat only", () => {
    const state1 = evolve(emptySessionState, registeredEvent);
    const state2 = evolve(state1, {
      type: "session_heartbeat",
      sessionId: "sess-1",
      lastHeartbeat: NOW + 5000,
    });
    const record = state2.sessions.get("sess-1");
    expect(record?.lastHeartbeat).toBe(NOW + 5000);
    expect(record?.projectRoot).toBe("/repo-a"); // unchanged
  });

  test("session_heartbeat is no-op for unknown sessionId", () => {
    const state = evolve(emptySessionState, {
      type: "session_heartbeat",
      sessionId: "ghost",
      lastHeartbeat: NOW,
    });
    expect(state.sessions.size).toBe(0);
  });

  test("session_disconnected removes session from state", () => {
    const state1 = evolve(emptySessionState, registeredEvent);
    const state2 = evolve(state1, {
      type: "session_disconnected",
      sessionId: "sess-1",
      reason: "explicit",
      disconnectedAt: NOW + 1000,
    });
    expect(state2.sessions.size).toBe(0);
  });
});

describe("replay", () => {
  test("replay of empty events returns empty state", () => {
    const state = replay([]);
    expect(state.sessions.size).toBe(0);
  });

  test("replay multi-event sequence matches sequential evolve", () => {
    const events: SessionEvent[] = [
      registeredEvent,
      { type: "session_heartbeat", sessionId: "sess-1", lastHeartbeat: NOW + 1000 },
      {
        type: "session_registered",
        sessionId: "sess-2",
        projectRoot: "/repo-b",
        pid: 55,
        connectedAt: NOW + 500,
        lastHeartbeat: NOW + 500,
      },
      {
        type: "session_disconnected",
        sessionId: "sess-1",
        reason: "timeout",
        disconnectedAt: NOW + 2000,
      },
    ];

    const replayed = replay(events);
    const sequential = events.reduce(evolve, { sessions: new Map(emptySessionState.sessions) });

    expect(replayed.sessions.size).toBe(sequential.sessions.size);
    expect(replayed.sessions.has("sess-1")).toBe(sequential.sessions.has("sess-1"));
    expect(replayed.sessions.has("sess-2")).toBe(sequential.sessions.has("sess-2"));
  });
});
