// spacebridge/src/domain/lease/types.ts
// ABOUTME: Domain types for the role-aware lease manager fmodel CQRS aggregate.
// Re-exports Role/EntityRef/LeaseToken from the canonical stub to avoid duplication.

import type { Role, EntityRef, LeaseToken } from "../../ipc/coordination-client-stub";

export type { Role, EntityRef, LeaseToken };

// Composite key for a lease: entity_slug + role pair
export type LeaseKey = `${string}::${string}`;

// In-memory state for the lease aggregate — rebuilt via event replay on startup
export interface LeaseState {
  leases: Map<LeaseKey, LeaseToken>;
}

export const emptyLeaseState: LeaseState = { leases: new Map() };

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface AcquireCommand {
  type: "acquire";
  entitySlug: string;
  role: Role;
  sessionId: string;
  leaseDurationMs: number;
}

export interface ReleaseCommand {
  type: "release";
  token: string;
  outcome: "done" | "abort";
}

export interface ExtendCommand {
  type: "extend";
  token: string;
  leaseDurationMs: number;
}

export interface ExpireCommand {
  type: "expire";
  token: string;
  now: number;
}

export type LeaseCommand =
  | AcquireCommand
  | ReleaseCommand
  | ExtendCommand
  | ExpireCommand;

// ─── Events ────────────────────────────────────────────────────────────────────

export interface AcquiredEvent {
  type: "acquired";
  token: string;
  entitySlug: string;
  role: Role;
  sessionId: string;
  acquiredAt: number;
  expiresAt: number;
}

export interface ReleasedEvent {
  type: "released";
  token: string;
  outcome: "done" | "abort";
  releasedAt: number;
}

export interface ExtendedEvent {
  type: "extended";
  token: string;
  newExpiresAt: number;
}

export interface ExpiredEvent {
  type: "expired";
  token: string;
  expiredAt: number;
}

export type LeaseEvent =
  | AcquiredEvent
  | ReleasedEvent
  | ExtendedEvent
  | ExpiredEvent;
