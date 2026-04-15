// spacebridge/src/domain/chat/decider.ts
// ABOUTME: Pure fmodel decider for the chat aggregate. Zero I/O — no DB, no network, no fs.
// decide(cmd, state, now) → ChatEvent[] or throws typed errors from errors.ts.

import { DuplicateMessageId } from "./errors";
import type { ChatCommand, ChatEvent, ChatState } from "./types";

export function decide(cmd: ChatCommand, state: ChatState, _now: number): ChatEvent[] {
  switch (cmd.type) {
    case "send_captain_message": {
      if (state.has(cmd.messageId)) {
        throw new DuplicateMessageId(cmd.messageId);
      }
      return [
        {
          type: "captain_message_sent",
          messageId: cmd.messageId,
          targetSessionId: cmd.targetSessionId,
          projectRoot: cmd.projectRoot,
          content: cmd.content,
          sentAt: cmd.sentAt,
        },
      ];
    }
  }
}
