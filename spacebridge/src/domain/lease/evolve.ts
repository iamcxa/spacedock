// spacebridge/src/domain/lease/evolve.ts
// ABOUTME: Pure fmodel evolve function for the lease aggregate. Zero I/O.
// evolve(state, event) → new LeaseState. replay(events) reduces over evolve from empty state.

import type { LeaseEvent, LeaseState, LeaseKey } from "./types";
import { emptyLeaseState } from "./types";

export function evolve(state: LeaseState, event: LeaseEvent): LeaseState {
  switch (event.type) {
    case "acquired": {
      const key: LeaseKey = `${event.entitySlug}::${event.role}`;
      const newLeases = new Map(state.leases);
      newLeases.set(key, {
        token: event.token,
        session_id: event.sessionId,
        entity_slug: event.entitySlug,
        role: event.role,
        acquired_at: event.acquiredAt,
        expires_at: event.expiresAt,
      });
      return { leases: newLeases };
    }

    case "released": {
      const newLeases = new Map(state.leases);
      for (const [key, lease] of newLeases) {
        if (lease.token === event.token) {
          newLeases.delete(key);
          break;
        }
      }
      return { leases: newLeases };
    }

    case "extended": {
      const newLeases = new Map(state.leases);
      for (const [key, lease] of newLeases) {
        if (lease.token === event.token) {
          newLeases.set(key, { ...lease, expires_at: event.newExpiresAt });
          break;
        }
      }
      return { leases: newLeases };
    }

    case "expired": {
      const newLeases = new Map(state.leases);
      for (const [key, lease] of newLeases) {
        if (lease.token === event.token) {
          newLeases.delete(key);
          break;
        }
      }
      return { leases: newLeases };
    }
  }
}

export function replay(events: LeaseEvent[]): LeaseState {
  return events.reduce(evolve, { leases: new Map(emptyLeaseState.leases) });
}
