import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { EventBuffer } from "./events";
import { openDb } from "./db";
import { createServer } from "./server";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AgentEvent } from "./types";

describe("EventBuffer event type validation", () => {
  test("accepts gate_decision event type", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 10);
    const event = {
      type: "gate_decision" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "approved",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
    expect(entry.event.type).toBe("gate_decision");
    db.close();
  });

  test("accepts comment event type (bug fix)", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 10);
    const event = {
      type: "comment" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test comment",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
    db.close();
  });

  test("accepts suggestion event type (bug fix)", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 10);
    const event = {
      type: "suggestion" as const,
      entity: "016-dashboard-gate-approval",
      stage: "plan",
      agent: "captain",
      timestamp: new Date().toISOString(),
      detail: "test suggestion",
    };
    const entry = buffer.push(event);
    expect(entry.seq).toBe(1);
    db.close();
  });

  test("rejects unknown event type", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 10);
    const event = {
      type: "nonexistent" as any,
      entity: "test",
      stage: "test",
      agent: "test",
      timestamp: new Date().toISOString(),
    };
    expect(() => buffer.push(event)).toThrow("Invalid event type: nonexistent");
    db.close();
  });

  test("enforces capacity by pruning oldest events", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 3);
    const makeEvent = (entity: string): AgentEvent => ({
      type: "dispatch",
      entity,
      stage: "test",
      agent: "test",
      timestamp: new Date().toISOString(),
    });
    buffer.push(makeEvent("e1"));
    buffer.push(makeEvent("e2"));
    buffer.push(makeEvent("e3"));
    buffer.push(makeEvent("e4")); // should evict e1
    const all = buffer.getAll();
    expect(all.length).toBe(3);
    expect(all[0].event.entity).toBe("e2");
    expect(all[2].event.entity).toBe("e4");
    db.close();
  });

  test("getSince returns only events after given seq", () => {
    const db = openDb(":memory:");
    const buffer = new EventBuffer(db, 10);
    const makeEvent = (entity: string): AgentEvent => ({
      type: "dispatch",
      entity,
      stage: "test",
      agent: "test",
      timestamp: new Date().toISOString(),
    });
    const e1 = buffer.push(makeEvent("e1"));
    buffer.push(makeEvent("e2"));
    buffer.push(makeEvent("e3"));
    const since = buffer.getSince(e1.seq);
    expect(since.length).toBe(2);
    expect(since[0].event.entity).toBe("e2");
    db.close();
  });
});

const TMP = join(import.meta.dir, "__test_gate__");
const WORKFLOW_DIR = join(TMP, "docs", "build-pipeline");
const ENTITY_PATH = join(WORKFLOW_DIR, "test-entity.md");

const ENTITY_CONTENT = [
  "---",
  "id: 001",
  "title: Test Entity",
  "status: plan",
  "score: 0.8",
  "---",
  "",
  "## Body",
  "",
  "Test content.",
].join("\n");

describe("POST /api/entity/gate/decision", () => {
  let server: ReturnType<typeof createServer>;
  let channelMessages: Array<{ content: string; meta?: Record<string, string> }>;

  beforeAll(() => {
    mkdirSync(WORKFLOW_DIR, { recursive: true });
    writeFileSync(ENTITY_PATH, ENTITY_CONTENT);
    channelMessages = [];
    server = createServer({
      port: 0,
      hostname: "127.0.0.1",
      projectRoot: TMP,
      dbPath: ":memory:",
      onChannelMessage: (content, meta) => {
        channelMessages.push({ content, meta });
      },
    });
  });

  afterAll(() => {
    server.stop();
    rmSync(TMP, { recursive: true, force: true });
  });

  beforeEach(() => {
    channelMessages = [];
  });

  test("sends gate decision via channel and records event", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.seq).toBeGreaterThan(0);

    // Verify channel message was sent
    expect(channelMessages.length).toBe(1);
    expect(channelMessages[0].meta?.type).toBe("gate_decision");
    expect(channelMessages[0].meta?.decision).toBe("approved");
    expect(channelMessages[0].meta?.entity_path).toBe(ENTITY_PATH);
    expect(channelMessages[0].meta?.stage).toBe("plan");
  });

  test("rejects request missing required fields", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_path: ENTITY_PATH }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects invalid decision value", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "maybe",
      }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects path outside project root", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: "/etc/passwd",
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(403);
  });

  test("gate decision event appears in event buffer", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "approved",
      }),
    });
    expect(res.status).toBe(200);

    // Verify event is in the buffer via GET /api/events
    const eventsRes = await fetch(`http://127.0.0.1:${server.port}/api/events`);
    const eventsData = await eventsRes.json() as { events: Array<{ event: { type: string; detail?: string } }> };
    const gateEvents = eventsData.events.filter(
      (e: { event: { type: string } }) => e.event.type === "gate_decision"
    );
    expect(gateEvents.length).toBeGreaterThan(0);
    expect(gateEvents[gateEvents.length - 1].event.detail).toBe("approved");
  });

  test("changes_requested decision is accepted", async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/api/entity/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_path: ENTITY_PATH,
        entity_slug: "test-entity",
        stage: "plan",
        decision: "changes_requested",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Verify channel message has correct meta
    expect(channelMessages.length).toBe(1);
    expect(channelMessages[0].meta?.decision).toBe("changes_requested");
  });
});
