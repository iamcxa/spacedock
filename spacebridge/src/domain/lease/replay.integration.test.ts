// spacebridge/src/domain/lease/replay.integration.test.ts
// ABOUTME: Integration test for event replay — validates AC-6 without a full daemon restart.
// Creates a bridge over a populated DB, verifies state reconstruction from event log.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createDb } from "../../db";
import { createCoordinationClientBridge } from "../../ipc/coordination-client-bridge";
import type { EntityRef } from "../../ipc/coordination-client-stub";

const DURATION = 300_000;
const NOW = 1_000_000;

function makeScanner(entities: EntityRef[] = []): () => Promise<EntityRef[]> {
  return async () => entities;
}

describe("event replay reconstructs state across fresh bridge instance (AC-6)", () => {
  test("bridge2 over same DB file sees leases from bridge1", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "sb-replay-"));
    const dbPath = join(tmpDir, "replay-test.db");

    try {
      let nowMs = NOW;

      // Bridge 1 — acquire two leases
      const db1 = createDb(dbPath);
      const bridge1 = await createCoordinationClientBridge({
        db: db1,
        entityScanner: makeScanner(),
        leaseDurationMs: DURATION,
        now: () => nowMs,
      });

      await bridge1.acquireEntity("ent-alpha", "FO", "sess-1");
      await bridge1.acquireEntity("ent-beta", "SO", "sess-2");
      bridge1.close();

      // Bridge 2 — fresh instance over same DB; replays events from disk
      const db2 = createDb(dbPath);
      const bridge2 = await createCoordinationClientBridge({
        db: db2,
        entityScanner: makeScanner([
          { slug: "ent-alpha", workflow_dir: "/wf", current_stage: "execute", status: "active" },
          { slug: "ent-beta", workflow_dir: "/wf", current_stage: "review", status: "active" },
        ]),
        leaseDurationMs: DURATION,
        now: () => nowMs,
      });

      // Both entities should be leased — getAvailableWork returns []
      const available = await bridge2.getAvailableWork("FO");
      expect(available.map(e => e.slug)).not.toContain("ent-alpha");

      const availableSO = await bridge2.getAvailableWork("SO");
      expect(availableSO.map(e => e.slug)).not.toContain("ent-beta");

      // Attempting to re-acquire should fail with LeaseConflict
      await expect(bridge2.acquireEntity("ent-alpha", "FO", "sess-3")).rejects.toThrow();

      bridge2.close();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("after releaseEntity, bridge3 allows re-acquire (event replay includes release)", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "sb-replay2-"));
    const dbPath = join(tmpDir, "replay2-test.db");

    try {
      let nowMs = NOW;

      const db1 = createDb(dbPath);
      const bridge1 = await createCoordinationClientBridge({
        db: db1,
        entityScanner: makeScanner(),
        leaseDurationMs: DURATION,
        now: () => nowMs,
      });

      const token = await bridge1.acquireEntity("ent-gamma", "FO", "sess-1");
      await bridge1.releaseEntity(token, "done");
      bridge1.close();

      // Bridge2 replays: acquired + released → empty state
      const db2 = createDb(dbPath);
      const bridge2 = await createCoordinationClientBridge({
        db: db2,
        entityScanner: makeScanner([
          { slug: "ent-gamma", workflow_dir: "/wf", current_stage: "execute", status: "active" },
        ]),
        leaseDurationMs: DURATION,
        now: () => nowMs,
      });

      // ent-gamma should be available again
      const available = await bridge2.getAvailableWork("FO");
      expect(available.map(e => e.slug)).toContain("ent-gamma");

      // Re-acquire succeeds
      const token2 = await bridge2.acquireEntity("ent-gamma", "FO", "sess-2");
      expect(token2.token).toBeTruthy();

      bridge2.close();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
