// spacebridge/src/domain/comment/errors.ts
// ABOUTME: Named error classes for the comment domain.
// All extend Error with .name set for serialization compatibility.

export class CommentNotFound extends Error {
  readonly name = "CommentNotFound";
  constructor(public readonly commentId: string) {
    super(`CommentNotFound: no comment with id ${commentId}`);
  }
}

export class CommentAlreadyResolved extends Error {
  readonly name = "CommentAlreadyResolved";
  constructor(public readonly commentId: string) {
    super(`CommentAlreadyResolved: comment ${commentId} is already resolved`);
  }
}

export class ParentCommentNotFound extends Error {
  readonly name = "ParentCommentNotFound";
  constructor(public readonly parentCommentId: string) {
    super(`ParentCommentNotFound: no comment with id ${parentCommentId}`);
  }
}

export class DuplicateCommentId extends Error {
  readonly name = "DuplicateCommentId";
  constructor(public readonly commentId: string) {
    super(`DuplicateCommentId: comment ${commentId} already exists`);
  }
}
