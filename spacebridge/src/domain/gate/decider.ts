// spacebridge/src/domain/gate/decider.ts
// ABOUTME: Pure fmodel decider for the gate aggregate. Zero I/O — no DB, no network, no fs.
// decide(cmd, state, now) → GateEvent[] or throws typed errors from errors.ts.

import { GateAlreadyDecided } from "./errors";
import type { GateCommand, GateEvent, GateState } from "./types";

export function decide(cmd: GateCommand, state: GateState, now: number): GateEvent[] {
  const key = `${cmd.entitySlug}::${cmd.stage}`;

  if (state.has(key)) {
    throw new GateAlreadyDecided(cmd.entitySlug, cmd.stage);
  }

  switch (cmd.type) {
    case "approve_gate": {
      return [
        {
          type: "gate_approved",
          entitySlug: cmd.entitySlug,
          stage: cmd.stage,
          decidedBy: cmd.decidedBy,
          decidedAt: now,
        },
      ];
    }

    case "reject_gate": {
      return [
        {
          type: "gate_rejected",
          entitySlug: cmd.entitySlug,
          stage: cmd.stage,
          decidedBy: cmd.decidedBy,
          reason: cmd.reason ?? "",
          decidedAt: now,
        },
      ];
    }
  }
}
