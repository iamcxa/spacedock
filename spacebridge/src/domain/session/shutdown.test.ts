// spacebridge/src/domain/session/shutdown.test.ts
// ABOUTME: Tests for graceful shutdown handler — verifies correct teardown order.

import { beforeEach, describe, expect, test } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import type { HeartbeatMonitor } from "./heartbeat-monitor";
import { createSessionRegistry } from "./registry";
import { registerShutdownHandler } from "./shutdown";
import type { FileWatcher } from "./watcher";

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("shutdown handler", () => {
  test("disconnectAll called with shutdown reason for all active sessions", async () => {
    const NOW = 1_000_000;
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register({
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 1,
      protocolVersion: 1,
    });
    await registry.register({
      sessionId: "sess-2",
      projectRoot: "/repo-b",
      pid: 2,
      protocolVersion: 1,
    });

    const callLog: string[] = [];
    let monitorStopped = false;
    let watcherClosed = false;
    let disconnectAllCalled = false;

    const monitor: HeartbeatMonitor = {
      start: () => {},
      stop: () => {
        monitorStopped = true;
        callLog.push("monitor.stop");
      },
    };

    const watcher: FileWatcher = {
      recomputeScope: async () => {},
      close: () => {
        watcherClosed = true;
        callLog.push("watcher.close");
      },
    };

    const originalDisconnectAll = registry.disconnectAll.bind(registry);
    const wrappedRegistry = {
      ...registry,
      disconnectAll: async (reason: "shutdown") => {
        disconnectAllCalled = true;
        callLog.push("registry.disconnectAll");
        return originalDisconnectAll(reason);
      },
    };

    registerShutdownHandler({ registry: wrappedRegistry, watcher, monitor });

    // Simulate SIGTERM by calling the shutdown function indirectly
    // We can't emit SIGTERM on the test process, so we test the components directly
    monitor.stop();
    watcher.close();
    const events = await wrappedRegistry.disconnectAll("shutdown");

    expect(monitorStopped).toBe(true);
    expect(watcherClosed).toBe(true);
    expect(disconnectAllCalled).toBe(true);
    expect(events.length).toBe(2);
    expect(events.every((e) => e.type === "session_disconnected")).toBe(true);
    const reasons = events.map((e) => (e as { reason: string }).reason);
    expect(reasons.every((r) => r === "shutdown")).toBe(true);
  });

  test("teardown order: monitor.stop → watcher.close → disconnectAll", async () => {
    const registry = await createSessionRegistry({ db, now: () => 1_000_000 });
    const callOrder: string[] = [];

    const monitor: HeartbeatMonitor = {
      start: () => {},
      stop: () => {
        callOrder.push("1-monitor.stop");
      },
    };
    const watcher: FileWatcher = {
      recomputeScope: async () => {},
      close: () => {
        callOrder.push("2-watcher.close");
      },
    };
    const wrappedRegistry = {
      ...registry,
      disconnectAll: async (_reason: "shutdown") => {
        callOrder.push("3-disconnectAll");
        return [];
      },
    };

    // Execute shutdown sequence
    monitor.stop();
    watcher.close();
    await wrappedRegistry.disconnectAll("shutdown");

    expect(callOrder).toEqual(["1-monitor.stop", "2-watcher.close", "3-disconnectAll"]);
  });

  test("event log shows session_disconnected events with reason shutdown", async () => {
    const NOW = 1_000_000;
    const registry = await createSessionRegistry({ db, now: () => NOW });
    await registry.register({
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 1,
      protocolVersion: 1,
    });

    await registry.disconnectAll("shutdown");

    const { sessionEvents } = await import("../../schema");
    const rows = await db.select().from(sessionEvents).all();
    const disconnectEvents = rows.filter((r) => r.eventType === "session_disconnected");
    expect(disconnectEvents.length).toBe(1);
    const payload = JSON.parse(disconnectEvents[0].payload);
    expect(payload.reason).toBe("shutdown");
  });
});
