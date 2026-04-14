// spacebridge/src/domain/lease/decider.ts
// ABOUTME: Pure fmodel decider for the lease aggregate. Zero I/O — no DB, no network, no fs.
// decide(cmd, state, now) → LeaseEvent[] or throws LeaseConflict/LeaseNotFound/LeaseExpired.

import { randomUUID } from "node:crypto";
import { LeaseConflict, LeaseExpired, LeaseNotFound } from "./errors";
import type { LeaseCommand, LeaseEvent, LeaseState } from "./types";

export function decide(cmd: LeaseCommand, state: LeaseState, now: number): LeaseEvent[] {
  switch (cmd.type) {
    case "acquire": {
      const key = `${cmd.entitySlug}::${cmd.role}` as const;
      const existing = state.leases.get(key);
      if (existing && existing.expires_at > now) {
        throw new LeaseConflict(cmd.entitySlug, cmd.role, existing.token);
      }
      return [
        {
          type: "acquired",
          token: randomUUID(),
          entitySlug: cmd.entitySlug,
          role: cmd.role,
          sessionId: cmd.sessionId,
          acquiredAt: now,
          expiresAt: now + cmd.leaseDurationMs,
        },
      ];
    }

    case "release": {
      const lease = findByToken(state, cmd.token);
      if (!lease) throw new LeaseNotFound(cmd.token);
      return [
        {
          type: "released",
          token: cmd.token,
          outcome: cmd.outcome,
          releasedAt: now,
        },
      ];
    }

    case "extend": {
      const lease = findByToken(state, cmd.token);
      if (!lease) throw new LeaseNotFound(cmd.token);
      if (lease.expires_at <= now) throw new LeaseExpired(cmd.token, lease.expires_at);
      return [
        {
          type: "extended",
          token: cmd.token,
          newExpiresAt: now + cmd.leaseDurationMs,
        },
      ];
    }

    case "expire": {
      const lease = findByToken(state, cmd.token);
      if (!lease) return [];
      if (lease.expires_at > cmd.now) return [];
      return [
        {
          type: "expired",
          token: cmd.token,
          expiredAt: cmd.now,
        },
      ];
    }
  }
}

function findByToken(state: LeaseState, token: string) {
  for (const lease of state.leases.values()) {
    if (lease.token === token) return lease;
  }
  return null;
}
