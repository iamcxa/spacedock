// spacebridge/src/domain/chat/types.ts
// ABOUTME: Domain types for the chat fmodel CQRS aggregate (daemon-side).
// Commands: send_captain_message.
// Events: captain_message_sent | captain_message_delivered.
// State: Map<messageId, ChatMessageSnapshot>.

// ─── State ─────────────────────────────────────────────────────────────────────

export interface ChatMessageSnapshot {
  messageId: string;
  targetSessionId: string;
  projectRoot: string;
  content: string;
  sentAt: number; // epoch-ms
  deliveredAt: number | null; // epoch-ms, null = not yet delivered
}

export type ChatState = Map<string, ChatMessageSnapshot>;

export const emptyChatState: ChatState = new Map();

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface SendCaptainMessageCommand {
  type: "send_captain_message";
  messageId: string;
  targetSessionId: string;
  projectRoot: string;
  content: string;
  sentAt: number; // epoch-ms
}

export type ChatCommand = SendCaptainMessageCommand;

// ─── Events ────────────────────────────────────────────────────────────────────

export interface CaptainMessageSentEvent {
  type: "captain_message_sent";
  messageId: string;
  targetSessionId: string;
  projectRoot: string;
  content: string;
  sentAt: number; // epoch-ms
}

export interface CaptainMessageDeliveredEvent {
  type: "captain_message_delivered";
  messageId: string;
  deliveredAt: number; // epoch-ms
}

export type ChatEvent = CaptainMessageSentEvent | CaptainMessageDeliveredEvent;
