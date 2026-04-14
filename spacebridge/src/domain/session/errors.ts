// spacebridge/src/domain/session/errors.ts
// ABOUTME: Named error classes for the session domain.
// All extend Error with .name set for socket-server error serialization.

export class SessionNotFound extends Error {
  readonly name = "SessionNotFound";
  constructor(public readonly sessionId: string) {
    super(`SessionNotFound: no active session for sessionId ${sessionId}`);
  }
}

export class InvalidProjectRoot extends Error {
  readonly name = "InvalidProjectRoot";
  constructor(
    public readonly projectRoot: string,
    reason: string,
  ) {
    super(`InvalidProjectRoot: ${reason} — got ${JSON.stringify(projectRoot)}`);
  }
}
