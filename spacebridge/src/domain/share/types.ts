// ABOUTME: Domain types for share tokens — plain CRUD, not event-sourced (plain drizzle per O-1).
// Bearer-token model: token is the credential, entity_slug scopes access to one entity.

export interface ShareToken {
  id: number;
  token: string; // 48-char hex, 192-bit entropy
  entitySlug: string; // scoped to one entity
  createdAt: number; // epoch-ms
  expiresAt: number; // epoch-ms
}

export interface ShareTokenCreateInput {
  entitySlug: string;
  ttlMs: number; // time-to-live in milliseconds (default: 7 * 24 * 60 * 60 * 1000)
}
