// spacebridge/src/domain/session/registry.test.ts
// ABOUTME: Integration tests for session registry. Uses :memory: DB. Covers full lifecycle.

import { beforeEach, describe, expect, test } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import type { RegisterPayload } from "../../ipc/types";
import { createSessionRegistry } from "./registry";

let db: SpacebridgeDb;

const NOW = 1_000_000;

function makePayload(sessionId: string, projectRoot = "/repo-a", pid = 42): RegisterPayload {
  return { sessionId, projectRoot, pid, protocolVersion: 1 };
}

beforeEach(() => {
  db = createDb(":memory:");
});

describe("register", () => {
  test("register on empty state returns session_registered event", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    const events = await registry.register(makePayload("sess-1"));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_registered");
    expect(registry.getState().sessions.size).toBe(1);
  });

  test("register duplicate returns session_reconnected event (A-11 idempotency)", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register(makePayload("sess-1", "/repo-a", 42));
    const events = await registry.register(makePayload("sess-1", "/repo-b", 99));
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_reconnected");
    // State reflects updated projectRoot
    expect(registry.getState().sessions.get("sess-1")?.projectRoot).toBe("/repo-b");
  });
});

describe("heartbeat", () => {
  test("heartbeat updates lastHeartbeat in state", async () => {
    let tick = NOW;
    const registry = await createSessionRegistry({ db, now: () => tick });
    await registry.register(makePayload("sess-1"));
    tick = NOW + 5000;
    const events = await registry.heartbeat("sess-1");
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_heartbeat");
    expect(registry.getState().sessions.get("sess-1")?.lastHeartbeat).toBe(NOW + 5000);
  });

  test("heartbeat throws SessionNotFound for unknown session", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await expect(registry.heartbeat("ghost")).rejects.toThrow("SessionNotFound");
  });
});

describe("disconnect", () => {
  test("disconnect removes session from state", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register(makePayload("sess-1"));
    const events = await registry.disconnect("sess-1", "explicit");
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("session_disconnected");
    expect(registry.getState().sessions.size).toBe(0);
  });

  test("disconnect unknown session returns [] (idempotent no-op)", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    const events = await registry.disconnect("ghost", "explicit");
    expect(events).toEqual([]);
  });
});

describe("disconnectAll (A-12 graceful shutdown)", () => {
  test("disconnectAll emits disconnect for each active session", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register(makePayload("sess-1", "/repo-a"));
    await registry.register(makePayload("sess-2", "/repo-b"));
    await registry.register(makePayload("sess-3", "/repo-c"));

    const events = await registry.disconnectAll("shutdown");
    expect(events.length).toBe(3);
    expect(events.every((e) => e.type === "session_disconnected")).toBe(true);
    const reasons = events.map((e) => (e as { reason: string }).reason);
    expect(reasons.every((r) => r === "shutdown")).toBe(true);
    expect(registry.getState().sessions.size).toBe(0);
  });

  test("disconnectAll on empty registry returns []", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    const events = await registry.disconnectAll("shutdown");
    expect(events).toEqual([]);
  });
});

describe("getActiveProjectRoots", () => {
  test("returns deduplicated list of project roots", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register(makePayload("sess-1", "/repo-a"));
    await registry.register(makePayload("sess-2", "/repo-b"));
    await registry.register(makePayload("sess-3", "/repo-a")); // duplicate root

    const roots = registry.getActiveProjectRoots();
    expect(roots.length).toBe(2);
    expect(roots.sort()).toEqual(["/repo-a", "/repo-b"]);
  });

  test("returns empty array with no active sessions", async () => {
    const registry = await createSessionRegistry({ db, now: () => NOW });
    expect(registry.getActiveProjectRoots()).toEqual([]);
  });
});

describe("event replay on fresh registry", () => {
  test("replay reconstructs state on fresh registry over same DB", async () => {
    // Create registry1, do some operations
    const registry1 = await createSessionRegistry({ db, now: () => NOW });
    await registry1.register(makePayload("sess-1", "/repo-a"));
    await registry1.register(makePayload("sess-2", "/repo-b"));
    await registry1.heartbeat("sess-1");
    await registry1.disconnect("sess-2", "explicit");

    // Create registry2 over same DB — replays all events
    const registry2 = await createSessionRegistry({ db, now: () => NOW });
    const state = registry2.getState();
    expect(state.sessions.size).toBe(1);
    expect(state.sessions.has("sess-1")).toBe(true);
    expect(state.sessions.has("sess-2")).toBe(false);
  });
});
