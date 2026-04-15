// ABOUTME: Tests for chat aggregate persistence — round-trip + multi-event.

import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "../../db";
import { appendEvents, countEvents, loadEvents } from "./persistence";
import type { ChatEvent } from "./types";

const NOW = 1_700_000_000_000;

function makeDb() {
  return createDb(join(tmpdir(), `test-chat-persist-${randomUUID()}.db`));
}

describe("chat persistence", () => {
  test("round-trip: append + load single event", async () => {
    const db = makeDb();
    const sessionId = "session-abc";
    const events: ChatEvent[] = [
      {
        type: "captain_message_sent",
        messageId: "msg-001",
        targetSessionId: sessionId,
        projectRoot: "/repo",
        content: "hello",
        sentAt: NOW,
      },
    ];
    await appendEvents(db, sessionId, events, 1);
    const loaded = await loadEvents(db, sessionId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].type).toBe("captain_message_sent");
    if (loaded[0].type === "captain_message_sent") {
      expect(loaded[0].messageId).toBe("msg-001");
    }
  });

  test("multi-event: sequence numbers preserved in order", async () => {
    const db = makeDb();
    const sessionId = "session-multi";
    const events: ChatEvent[] = [
      {
        type: "captain_message_sent",
        messageId: "m1",
        targetSessionId: sessionId,
        projectRoot: "/r",
        content: "first",
        sentAt: NOW,
      },
      {
        type: "captain_message_sent",
        messageId: "m2",
        targetSessionId: sessionId,
        projectRoot: "/r",
        content: "second",
        sentAt: NOW + 1,
      },
    ];
    await appendEvents(db, sessionId, events, 1);
    const loaded = await loadEvents(db, sessionId);
    expect(loaded).toHaveLength(2);
    expect((loaded[0] as { content: string }).content).toBe("first");
    expect((loaded[1] as { content: string }).content).toBe("second");
  });

  test("countEvents returns correct count", async () => {
    const db = makeDb();
    const sessionId = "session-count";
    const events: ChatEvent[] = [
      {
        type: "captain_message_sent",
        messageId: "m1",
        targetSessionId: sessionId,
        projectRoot: "/r",
        content: "hi",
        sentAt: NOW,
      },
    ];
    await appendEvents(db, sessionId, events, 1);
    const count = await countEvents(db, sessionId);
    expect(count).toBe(1);
  });
});
