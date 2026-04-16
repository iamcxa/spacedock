// spacebridge/src/domain/comment/suggestion-errors.ts
// ABOUTME: Named error classes for the suggestion domain.
// All extend Error with .name set for serialization compatibility.

export class SuggestionNotFound extends Error {
  readonly name = "SuggestionNotFound";
  constructor(public readonly suggestionId: string) {
    super(`SuggestionNotFound: no suggestion with id ${suggestionId}`);
  }
}

export class SuggestionNotPending extends Error {
  readonly name = "SuggestionNotPending";
  constructor(public readonly suggestionId: string) {
    super(`SuggestionNotPending: suggestion ${suggestionId} is not in pending status`);
  }
}

export class CommentNotFoundForSuggestion extends Error {
  readonly name = "CommentNotFoundForSuggestion";
  constructor(public readonly commentId: string) {
    super(`CommentNotFoundForSuggestion: no comment with id ${commentId}`);
  }
}

export class GuestCannotDecideSuggestion extends Error {
  readonly name = "GuestCannotDecideSuggestion";
  constructor(public readonly suggestionId: string) {
    super(`GuestCannotDecideSuggestion: guest cannot accept or reject suggestion ${suggestionId}`);
  }
}
