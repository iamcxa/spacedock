// spacebridge/src/domain/gate/evolve.ts
// ABOUTME: Pure fmodel evolve function for the gate aggregate. Zero I/O.
// evolve(state, event) → new GateState. replay(events) reduces over evolve from empty state.

import type { GateEvent, GateState } from "./types";
import { emptyGateState } from "./types";

export function evolve(state: GateState, event: GateEvent): GateState {
  const key = `${event.entitySlug}::${event.stage}`;
  const newState = new Map(state);

  switch (event.type) {
    case "gate_approved": {
      newState.set(key, {
        decision: "approved",
        entitySlug: event.entitySlug,
        stage: event.stage,
        decidedBy: event.decidedBy,
        decidedAt: event.decidedAt,
        reason: null,
      });
      return newState;
    }

    case "gate_rejected": {
      newState.set(key, {
        decision: "rejected",
        entitySlug: event.entitySlug,
        stage: event.stage,
        decidedBy: event.decidedBy,
        decidedAt: event.decidedAt,
        reason: event.reason,
      });
      return newState;
    }
  }
}

export function replay(events: GateEvent[]): GateState {
  return events.reduce(evolve, new Map(emptyGateState));
}
