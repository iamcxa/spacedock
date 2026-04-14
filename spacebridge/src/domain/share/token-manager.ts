// ABOUTME: TokenManager for share tokens — CRUD operations over share_tokens table.
// Bearer-token model: 192-bit entropy tokens scoped to one entity.
// Lazy expiry cleanup: expired tokens are deleted on verify() access.
// No event sourcing — plain drizzle CRUD per domain decision (O-1).

import { eq, lte } from "drizzle-orm";
import type { SpacebridgeDb } from "../../db";
import { shareTokens } from "../../schema";
import type { ShareToken, ShareTokenCreateInput } from "./types";

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class TokenManager {
  constructor(private readonly db: SpacebridgeDb) {}

  create(input: ShareTokenCreateInput): ShareToken {
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + input.ttlMs;

    const rows = this.db
      .insert(shareTokens)
      .values({
        token,
        entitySlug: input.entitySlug,
        createdAt: now,
        expiresAt,
      })
      .returning()
      .all();

    return rows[0] as ShareToken;
  }

  verify(token: string): ShareToken | null {
    const rows = this.db
      .select()
      .from(shareTokens)
      .where(eq(shareTokens.token, token))
      .all();

    if (rows.length === 0) return null;

    const row = rows[0];
    if (row.expiresAt <= Date.now()) {
      // Lazy cleanup: delete expired token on access
      this.db.delete(shareTokens).where(eq(shareTokens.token, token)).run();
      return null;
    }

    return row as ShareToken;
  }

  revoke(token: string): boolean {
    const deleted = this.db
      .delete(shareTokens)
      .where(eq(shareTokens.token, token))
      .returning()
      .all();
    return deleted.length > 0;
  }

  list(): ShareToken[] {
    const now = Date.now();
    // Delete expired first
    this.db.delete(shareTokens).where(lte(shareTokens.expiresAt, now)).run();
    return this.db.select().from(shareTokens).all() as ShareToken[];
  }

  cleanup(): number {
    const deleted = this.db
      .delete(shareTokens)
      .where(lte(shareTokens.expiresAt, Date.now()))
      .returning()
      .all();
    return deleted.length;
  }
}
