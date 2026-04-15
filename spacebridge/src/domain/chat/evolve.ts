// spacebridge/src/domain/chat/evolve.ts
// ABOUTME: Pure fmodel evolve function for the chat aggregate. Zero I/O.
// evolve(state, event) → new ChatState. replay(events) reduces over evolve from empty state.

import type { ChatEvent, ChatState } from "./types";
import { emptyChatState } from "./types";

export function evolve(state: ChatState, event: ChatEvent): ChatState {
  switch (event.type) {
    case "captain_message_sent": {
      const newState = new Map(state);
      newState.set(event.messageId, {
        messageId: event.messageId,
        targetSessionId: event.targetSessionId,
        projectRoot: event.projectRoot,
        content: event.content,
        sentAt: event.sentAt,
        deliveredAt: null,
      });
      return newState;
    }

    case "captain_message_delivered": {
      const newState = new Map(state);
      const existing = newState.get(event.messageId);
      if (existing) {
        newState.set(event.messageId, { ...existing, deliveredAt: event.deliveredAt });
      }
      return newState;
    }
  }
}

export function replay(events: ChatEvent[]): ChatState {
  return events.reduce(evolve, new Map(emptyChatState));
}
