// ABOUTME: Tests for gate aggregate persistence — round-trip + multi-event.

import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "../../db";
import { appendEvents, countEvents, loadEvents } from "./persistence";
import type { GateEvent } from "./types";

const NOW = 1_700_000_000_000;

function makeDb() {
  return createDb(join(tmpdir(), `test-gate-persist-${randomUUID()}.db`));
}

describe("gate persistence", () => {
  test("round-trip: append + load single event", async () => {
    const db = makeDb();
    const aggregateId = "entity-099::plan";
    const events: GateEvent[] = [
      {
        type: "gate_approved",
        entitySlug: "entity-099",
        stage: "plan",
        decidedBy: "captain",
        decidedAt: NOW,
      },
    ];
    await appendEvents(db, aggregateId, events, 1);
    const loaded = await loadEvents(db, aggregateId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].type).toBe("gate_approved");
    if (loaded[0].type === "gate_approved") {
      expect(loaded[0].entitySlug).toBe("entity-099");
    }
  });

  test("multi-event: sequence numbers preserved in order", async () => {
    const db = makeDb();
    const aggregateId = "entity-100::uat";
    const events: GateEvent[] = [
      {
        type: "gate_approved",
        entitySlug: "entity-100",
        stage: "uat",
        decidedBy: "captain",
        decidedAt: NOW,
      },
    ];
    await appendEvents(db, aggregateId, events, 1);
    const loaded = await loadEvents(db, aggregateId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].type).toBe("gate_approved");
  });

  test("countEvents returns correct count", async () => {
    const db = makeDb();
    const aggregateId = "entity-101::plan";
    const events: GateEvent[] = [
      {
        type: "gate_rejected",
        entitySlug: "entity-101",
        stage: "plan",
        decidedBy: "captain",
        reason: "needs revision",
        decidedAt: NOW,
      },
    ];
    await appendEvents(db, aggregateId, events, 1);
    const count = await countEvents(db, aggregateId);
    expect(count).toBe(1);
  });

  test("isolation: different aggregateIds do not cross-contaminate", async () => {
    const db = makeDb();
    const agg1 = "entity-201::plan";
    const agg2 = "entity-202::uat";
    await appendEvents(
      db,
      agg1,
      [
        {
          type: "gate_approved",
          entitySlug: "entity-201",
          stage: "plan",
          decidedBy: "captain",
          decidedAt: NOW,
        },
      ],
      1,
    );
    await appendEvents(
      db,
      agg2,
      [
        {
          type: "gate_rejected",
          entitySlug: "entity-202",
          stage: "uat",
          decidedBy: "captain",
          reason: "bad",
          decidedAt: NOW,
        },
      ],
      1,
    );
    expect(await loadEvents(db, agg1)).toHaveLength(1);
    expect(await loadEvents(db, agg2)).toHaveLength(1);
    expect((await loadEvents(db, agg1))[0].type).toBe("gate_approved");
    expect((await loadEvents(db, agg2))[0].type).toBe("gate_rejected");
  });
});
