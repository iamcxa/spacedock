// spacebridge/src/domain/session/replay.integration.test.ts
// ABOUTME: Integration test for daemon restart replay scenario.
// Creates registry1, does operations, creates registry2 over same DB, verifies state matches.

import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDb } from "../../db";
import { createSessionRegistry } from "./registry";

describe("replay integration — restart scenario", () => {
  test("registry2 replays all events and reconstructs pre-restart state", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "replay-test-"));
    const dbPath = join(tmpDir, "test.db");

    try {
      let tick = 1_000_000;

      // --- Phase 1: registry1 over fresh DB ---
      const db1 = createDb(dbPath);
      const registry1 = await createSessionRegistry({ db: db1, now: () => tick });

      // Register 3 sessions
      await registry1.register({ sessionId: "sess-1", projectRoot: "/repo-a", pid: 11, protocolVersion: 1 });
      await registry1.register({ sessionId: "sess-2", projectRoot: "/repo-b", pid: 22, protocolVersion: 1 });
      await registry1.register({ sessionId: "sess-3", projectRoot: "/repo-a", pid: 33, protocolVersion: 1 });

      // Heartbeat sess-1 at tick+1000
      tick = 1_001_000;
      await registry1.heartbeat("sess-1");

      // Disconnect sess-2 explicitly
      await registry1.disconnect("sess-2", "explicit");

      // Pre-restart state: sess-1 (heartbeat updated), sess-3 (original), sess-2 gone
      const preRestartState = registry1.getState();
      expect(preRestartState.sessions.size).toBe(2);
      expect(preRestartState.sessions.has("sess-1")).toBe(true);
      expect(preRestartState.sessions.has("sess-3")).toBe(true);
      expect(preRestartState.sessions.has("sess-2")).toBe(false);

      // --- Phase 2: registry2 over same DB — simulates daemon restart ---
      const db2 = createDb(dbPath);
      const registry2 = await createSessionRegistry({ db: db2, now: () => tick });

      const postRestartState = registry2.getState();

      // State must match exactly
      expect(postRestartState.sessions.size).toBe(2);
      expect(postRestartState.sessions.has("sess-1")).toBe(true);
      expect(postRestartState.sessions.has("sess-3")).toBe(true);
      expect(postRestartState.sessions.has("sess-2")).toBe(false);

      // sess-1 has updated heartbeat
      const sess1 = postRestartState.sessions.get("sess-1");
      expect(sess1?.lastHeartbeat).toBe(1_001_000);

      // sess-3 has original heartbeat (connectedAt = 1_000_000)
      const sess3 = postRestartState.sessions.get("sess-3");
      expect(sess3?.lastHeartbeat).toBe(1_000_000);

      // --- Phase 3: getActiveProjectRoots deduplication ---
      const roots = registry2.getActiveProjectRoots();
      expect(roots.sort()).toEqual(["/repo-a", "/repo-b"].sort().filter((r) => roots.includes(r)));
      // sess-1 and sess-3 both on /repo-a, so only 1 unique root: /repo-a
      // sess-2 was disconnected so /repo-b is gone
      expect(roots.length).toBe(1);
      expect(roots[0]).toBe("/repo-a");

    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });

  test("replay handles all 4 event types correctly", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "replay-test2-"));
    const dbPath = join(tmpDir, "test.db");

    try {
      let tick = 1_000_000;
      const db1 = createDb(dbPath);
      const registry1 = await createSessionRegistry({ db: db1, now: () => tick });

      // session_registered
      await registry1.register({ sessionId: "sess-A", projectRoot: "/repo-x", pid: 1, protocolVersion: 1 });
      // session_heartbeat
      tick = 1_001_000;
      await registry1.heartbeat("sess-A");
      // session_reconnected (re-register with new pid)
      tick = 1_002_000;
      await registry1.register({ sessionId: "sess-A", projectRoot: "/repo-x", pid: 99, protocolVersion: 1 });
      // session_disconnected
      await registry1.disconnect("sess-A", "shutdown");

      // Replay over fresh db instance
      const db2 = createDb(dbPath);
      const registry2 = await createSessionRegistry({ db: db2, now: () => tick });

      // sess-A was disconnected — should be absent from state
      expect(registry2.getState().sessions.size).toBe(0);
      expect(registry2.getState().sessions.has("sess-A")).toBe(false);

    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  });
});
