// spacebridge/src/domain/chat/errors.ts
// ABOUTME: Named error classes for the chat domain.
// All extend Error with .name set for serialization compatibility.

export class DuplicateMessageId extends Error {
  readonly name = "DuplicateMessageId";
  constructor(public readonly messageId: string) {
    super(`DuplicateMessageId: message ${messageId} already exists`);
  }
}
