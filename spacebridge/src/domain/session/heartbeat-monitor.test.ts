// spacebridge/src/domain/session/heartbeat-monitor.test.ts
// ABOUTME: Tests for heartbeat monitor — stale session detection, fresh session preservation, stop().

import { beforeEach, describe, expect, test } from "bun:test";
import type { SpacebridgeDb } from "../../db";
import { createDb } from "../../db";
import { createHeartbeatMonitor } from "./heartbeat-monitor";
import { createSessionRegistry } from "./registry";

let db: SpacebridgeDb;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("heartbeat monitor", () => {
  test("detects stale session after timeout and disconnects it", async () => {
    let tick = 1_000_000;
    const registry = await createSessionRegistry({ db, now: () => tick });
    await registry.register({
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      protocolVersion: 1,
    });

    // Session registered at tick=1_000_000, lastHeartbeat=1_000_000
    // Advance time by 2000ms — beyond 1000ms timeout
    tick = 1_002_000;

    const monitor = createHeartbeatMonitor({
      registry,
      timeoutMs: 1000,
      intervalMs: 100,
      now: () => tick,
    });

    monitor.start();

    // Wait for scan to run
    await new Promise((resolve) => setTimeout(resolve, 200));
    monitor.stop();

    expect(registry.getState().sessions.size).toBe(0);
  });

  test("does not disconnect fresh session", async () => {
    let tick = 1_000_000;
    const registry = await createSessionRegistry({ db, now: () => tick });
    await registry.register({
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      protocolVersion: 1,
    });

    // Time advances only 500ms — within 1000ms timeout
    tick = 1_000_500;

    const monitor = createHeartbeatMonitor({
      registry,
      timeoutMs: 1000,
      intervalMs: 50,
      now: () => tick,
    });

    monitor.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    monitor.stop();

    expect(registry.getState().sessions.size).toBe(1);
  });

  test("stop() prevents further scans", async () => {
    let tick = 1_000_000;
    let disconnectCalled = 0;
    const registry = await createSessionRegistry({ db, now: () => tick });
    await registry.register({
      sessionId: "sess-1",
      projectRoot: "/repo-a",
      pid: 42,
      protocolVersion: 1,
    });

    const originalDisconnect = registry.disconnect.bind(registry);
    (registry as { disconnect: typeof registry.disconnect }).disconnect = async (
      sessionId,
      reason,
    ) => {
      disconnectCalled++;
      return originalDisconnect(sessionId, reason);
    };

    tick = 1_002_000; // stale

    const monitor = createHeartbeatMonitor({
      registry,
      timeoutMs: 1000,
      intervalMs: 50,
      now: () => tick,
    });

    monitor.start();
    await new Promise((resolve) => setTimeout(resolve, 80));
    monitor.stop();
    const countAfterStop = disconnectCalled;

    // Wait another interval — no new scans should run
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(disconnectCalled).toBe(countAfterStop);
  });
});
