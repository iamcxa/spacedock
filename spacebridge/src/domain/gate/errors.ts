// spacebridge/src/domain/gate/errors.ts
// ABOUTME: Named error classes for the gate domain.
// All extend Error with .name set for serialization compatibility.

export class GateAlreadyDecided extends Error {
  readonly name = "GateAlreadyDecided";
  constructor(
    public readonly entitySlug: string,
    public readonly stage: string,
  ) {
    super(`GateAlreadyDecided: gate ${entitySlug}::${stage} has already been decided`);
  }
}
