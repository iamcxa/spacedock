// ABOUTME: Wave 0 infrastructure test — verifies chatEvents + gateEvents schema exports and DB round-trip.

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createDb } from "../../spacebridge/src/db";
import { chatEvents, gateEvents } from "../../spacebridge/src/schema";

describe("chatEvents schema", () => {
  test("export exists with expected column names", () => {
    expect(chatEvents).toBeDefined();
    const cols = Object.keys(chatEvents);
    expect(cols).toContain("id");
    expect(cols).toContain("aggregateId");
    expect(cols).toContain("sequenceNumber");
    expect(cols).toContain("eventType");
    expect(cols).toContain("payload");
    expect(cols).toContain("timestamp");
  });

  test("DB insert dry-run succeeds", async () => {
    const dbPath = join(tmpdir(), `test-chat-${randomUUID()}.db`);
    const db = createDb(dbPath);
    await db.insert(chatEvents).values({
      aggregateId: "session-abc",
      sequenceNumber: 1,
      eventType: "captain_message_sent",
      payload: JSON.stringify({ content: "hello" }),
      timestamp: Date.now(),
    });
    const rows = await db.select().from(chatEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0].aggregateId).toBe("session-abc");
    expect(rows[0].eventType).toBe("captain_message_sent");
  });
});

describe("gateEvents schema", () => {
  test("export exists with expected column names", () => {
    expect(gateEvents).toBeDefined();
    const cols = Object.keys(gateEvents);
    expect(cols).toContain("id");
    expect(cols).toContain("aggregateId");
    expect(cols).toContain("sequenceNumber");
    expect(cols).toContain("eventType");
    expect(cols).toContain("payload");
    expect(cols).toContain("timestamp");
  });

  test("DB insert dry-run succeeds", async () => {
    const dbPath = join(tmpdir(), `test-gate-${randomUUID()}.db`);
    const db = createDb(dbPath);
    await db.insert(gateEvents).values({
      aggregateId: "entity-001::plan",
      sequenceNumber: 1,
      eventType: "gate_approved",
      payload: JSON.stringify({ decidedBy: "captain" }),
      timestamp: Date.now(),
    });
    const rows = await db.select().from(gateEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0].aggregateId).toBe("entity-001::plan");
    expect(rows[0].eventType).toBe("gate_approved");
  });
});
