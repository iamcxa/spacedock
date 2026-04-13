// spacebridge/src/domain/lease/errors.ts
// ABOUTME: Named error classes for the lease domain (O-2: fail with typed error).
// All extend Error with .name set for socket-server error serialization.

export class LeaseConflict extends Error {
  readonly name = "LeaseConflict";
  constructor(
    public readonly entitySlug: string,
    public readonly role: string,
    public readonly holderToken: string,
  ) {
    super(`LeaseConflict: ${entitySlug}::${role} already held by token ${holderToken}`);
  }
}

export class LeaseNotFound extends Error {
  readonly name = "LeaseNotFound";
  constructor(public readonly token: string) {
    super(`LeaseNotFound: no active lease for token ${token}`);
  }
}

export class LeaseExpired extends Error {
  readonly name = "LeaseExpired";
  constructor(public readonly token: string, public readonly expiredAt: number) {
    super(`LeaseExpired: token ${token} expired at ${expiredAt}`);
  }
}
