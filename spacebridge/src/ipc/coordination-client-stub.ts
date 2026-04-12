// spacebridge/src/ipc/coordination-client-stub.ts
// ABOUTME: CoordinationClient stub — noop placeholder for entity 056 (real implementation).
// All methods return empty/noop results. Uses same socket message types as the real client.

import { randomUUID } from "node:crypto";

export type Role = "SO" | "FO" | "QO";

export interface EntityRef {
  slug: string;
  workflow_dir: string;
  current_stage: string;
  status: string;
}

export interface LeaseToken {
  session_id: string;
  entity_slug: string;
  role: Role;
  acquired_at: number;
  expires_at: number;
  token: string;
}

export interface CoordinationClient {
  getAvailableWork(role: Role): Promise<EntityRef[]>;
  acquireEntity(slug: string, role: Role, sessionId: string): Promise<LeaseToken>;
  releaseEntity(token: LeaseToken, outcome: "done" | "abort"): Promise<void>;
  extendLease(token: LeaseToken): Promise<void>;
}

export function createCoordinationClientStub(): CoordinationClient {
  return {
    async getAvailableWork(_role: Role): Promise<EntityRef[]> {
      return [];
    },

    async acquireEntity(slug: string, role: Role, sessionId: string): Promise<LeaseToken> {
      const now = Date.now();
      return {
        session_id: sessionId,
        entity_slug: slug,
        role,
        acquired_at: now,
        expires_at: now + 300_000, // 5 minutes stub duration
        token: "stub-" + randomUUID(),
      };
    },

    async releaseEntity(_token: LeaseToken, _outcome: "done" | "abort"): Promise<void> {
      // noop — entity 056 will implement real release
    },

    async extendLease(_token: LeaseToken): Promise<void> {
      // noop — entity 056 will implement real extension
    },
  };
}
