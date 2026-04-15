// ABOUTME: Tests for the chat aggregate decider — pure function, no I/O.

import { describe, expect, test } from "bun:test";
import { decide } from "./decider";
import { DuplicateMessageId } from "./errors";
import type { ChatState } from "./types";

const NOW = 1_700_000_000_000;

const baseCmd = {
  type: "send_captain_message" as const,
  messageId: "msg-001",
  targetSessionId: "session-abc",
  projectRoot: "/repo",
  content: "hello FO",
  sentAt: NOW,
};

describe("decide — send_captain_message", () => {
  test("happy path returns captain_message_sent event", () => {
    const state: ChatState = new Map();
    const events = decide(baseCmd, state, NOW);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("captain_message_sent");
    if (events[0].type === "captain_message_sent") {
      expect(events[0].messageId).toBe("msg-001");
      expect(events[0].content).toBe("hello FO");
      expect(events[0].targetSessionId).toBe("session-abc");
    }
  });

  test("duplicate messageId throws DuplicateMessageId", () => {
    const state: ChatState = new Map([
      [
        "msg-001",
        {
          messageId: "msg-001",
          targetSessionId: "session-abc",
          projectRoot: "/repo",
          content: "hello FO",
          sentAt: NOW,
          deliveredAt: null,
        },
      ],
    ]);
    expect(() => decide(baseCmd, state, NOW)).toThrow(DuplicateMessageId);
  });
});
