// ABOUTME: Thin verification helper for share tokens — UI routes import this to avoid
// cross-package drizzle-orm type conflicts (spacebridge vs ui node_modules instances).
// Returns plain strings only; no drizzle types leak to callers.

import { eq } from "drizzle-orm";
import { createDb } from "../../db";
import { shareTokens } from "../../schema";

/**
 * Verify a share token and return its entity slug, or null if invalid/expired.
 * Encapsulates all drizzle usage so UI routes never import drizzle-orm directly.
 */
export function verifyShareToken(dbPath: string, token: string): string | null {
  const db = createDb(dbPath);
  const rows = db.select().from(shareTokens).where(eq(shareTokens.token, token)).all();
  if (rows.length === 0 || rows[0].expiresAt <= Date.now()) {
    return null;
  }
  return rows[0].entitySlug;
}
