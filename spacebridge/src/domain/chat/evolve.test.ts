// ABOUTME: Tests for the chat aggregate evolve function — pure function, no I/O.

import { describe, expect, test } from "bun:test";
import { evolve, replay } from "./evolve";
import type { ChatEvent, ChatState } from "./types";

const NOW = 1_700_000_000_000;

describe("evolve — captain_message_sent", () => {
  test("adds message to empty state", () => {
    const state: ChatState = new Map();
    const event: ChatEvent = {
      type: "captain_message_sent",
      messageId: "msg-001",
      targetSessionId: "session-abc",
      projectRoot: "/repo",
      content: "hello",
      sentAt: NOW,
    };
    const next = evolve(state, event);
    expect(next.size).toBe(1);
    const snap = next.get("msg-001");
    expect(snap?.deliveredAt).toBeNull();
    expect(snap?.content).toBe("hello");
  });
});

describe("evolve — captain_message_delivered", () => {
  test("updates deliveredAt on existing message", () => {
    const state: ChatState = new Map([
      [
        "msg-001",
        {
          messageId: "msg-001",
          targetSessionId: "session-abc",
          projectRoot: "/repo",
          content: "hello",
          sentAt: NOW,
          deliveredAt: null,
        },
      ],
    ]);
    const event: ChatEvent = {
      type: "captain_message_delivered",
      messageId: "msg-001",
      deliveredAt: NOW + 100,
    };
    const next = evolve(state, event);
    expect(next.get("msg-001")?.deliveredAt).toBe(NOW + 100);
  });
});

describe("replay", () => {
  test("rebuilds state from event sequence", () => {
    const events: ChatEvent[] = [
      {
        type: "captain_message_sent",
        messageId: "m1",
        targetSessionId: "s1",
        projectRoot: "/r",
        content: "hi",
        sentAt: NOW,
      },
      { type: "captain_message_delivered", messageId: "m1", deliveredAt: NOW + 50 },
    ];
    const state = replay(events);
    expect(state.get("m1")?.deliveredAt).toBe(NOW + 50);
  });
});
