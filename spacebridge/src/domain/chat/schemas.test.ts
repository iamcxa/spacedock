// ABOUTME: Tests for chat aggregate Zod schemas — boundary validation.

import { describe, expect, test } from "bun:test";
import { parseCommand, parseEvent } from "./schemas";

const NOW = 1_700_000_000_000;

describe("parseCommand", () => {
  test("accepts valid send_captain_message", () => {
    const result = parseCommand({
      type: "send_captain_message",
      messageId: "msg-001",
      targetSessionId: "session-abc",
      projectRoot: "/repo",
      content: "hello",
      sentAt: NOW,
    });
    expect(result.type).toBe("send_captain_message");
  });

  test("rejects missing content", () => {
    expect(() =>
      parseCommand({
        type: "send_captain_message",
        messageId: "msg-001",
        targetSessionId: "session-abc",
        projectRoot: "/repo",
        sentAt: NOW,
      }),
    ).toThrow();
  });

  test("rejects unknown type", () => {
    expect(() => parseCommand({ type: "unknown_type" })).toThrow();
  });
});

describe("parseEvent", () => {
  test("accepts captain_message_sent", () => {
    const result = parseEvent({
      type: "captain_message_sent",
      messageId: "msg-001",
      targetSessionId: "session-abc",
      projectRoot: "/repo",
      content: "hello",
      sentAt: NOW,
    });
    expect(result.type).toBe("captain_message_sent");
  });

  test("accepts captain_message_delivered", () => {
    const result = parseEvent({
      type: "captain_message_delivered",
      messageId: "msg-001",
      deliveredAt: NOW + 100,
    });
    expect(result.type).toBe("captain_message_delivered");
  });

  test("rejects malformed event", () => {
    expect(() => parseEvent({ type: "captain_message_sent" })).toThrow();
  });
});
