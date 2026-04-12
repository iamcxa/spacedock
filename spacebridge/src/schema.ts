// ABOUTME: Drizzle ORM LCD schema for spacebridge — 5 tables with fmodel-compatible columns.
// LCD discipline (design doc §3.3): text strings, integer PKs with autoincrement,
// integer epoch-ms timestamps, no JSON for queryable data, no RETURNING clauses.
// fmodel columns (event_type, aggregate_id, sequence_number, payload) present on all
// tables from day 1 per O-1 decision — structural placeholders for entities 054/056/057.

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── sessions — [full CQRS] fmodel full CQRS (design doc §4.3) ───────────────

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  projectRoot: text("project_root").notNull(),
  pid: integer("pid").notNull(),
  connectedAt: integer("connected_at").notNull(),   // epoch-ms
  lastHeartbeat: integer("last_heartbeat").notNull(), // epoch-ms
  // fmodel-compatible columns (placeholder, no fmodel-ts dep in this entity)
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),                          // opaque JSON blob
});

// ─── entity_leases — [full CQRS] fmodel full CQRS (design doc §5.3) ──────────

export const entityLeases = sqliteTable("entity_leases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),           // opaque lease token
  sessionId: text("session_id").notNull(),           // logically references sessions.session_id — no FK constraint, validated at application layer
  entitySlug: text("entity_slug").notNull(),
  role: text("role").notNull(),                      // 'SO' | 'FO' | 'QO' — validated at application layer, not DB-constrained
  acquiredAt: integer("acquired_at").notNull(),      // epoch-ms
  expiresAt: integer("expires_at").notNull(),        // epoch-ms
  // fmodel-compatible columns
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),                          // opaque JSON blob
});

// ─── events — [event-log only] ───────────────────────────────────────────────

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),                      // event type string
  entity: text("entity").notNull(),
  stage: text("stage").notNull(),
  agent: text("agent").notNull(),
  timestamp: integer("timestamp").notNull(),         // epoch-ms
  detail: text("detail"),                            // optional detail string
  workflowDir: text("workflow_dir").notNull(),       // scoping key
  // fmodel-compatible columns
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),                          // opaque JSON blob
});

// ─── comments — [full CQRS] fmodel full CQRS ─────────────────────────────────

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commentId: text("comment_id").notNull().unique(),  // UUID
  entityPath: text("entity_path").notNull(),
  selectedText: text("selected_text").notNull(),
  sectionHeading: text("section_heading").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),                  // 'captain' | 'fo' | 'guest'
  createdAt: integer("created_at").notNull(),        // epoch-ms
  resolved: integer("resolved").notNull().default(0), // boolean as integer
  resolvedReason: text("resolved_reason"),
  resolvedVersion: integer("resolved_version"),
  workflowDir: text("workflow_dir").notNull(),       // scoping key
  // fmodel-compatible columns
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),                          // opaque JSON blob
});

// ─── share_tokens — [plain drizzle] ──────────────────────────────────────────

export const shareTokens = sqliteTable("share_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  hashAlgorithm: text("hash_algorithm").default("argon2id"), // prepares for future algorithm migration
  entityPaths: text("entity_paths").notNull(),       // JSON array as text blob
  stages: text("stages").notNull(),                  // JSON array as text blob
  label: text("label").notNull(),
  createdAt: integer("created_at").notNull(),        // epoch-ms
  expiresAt: integer("expires_at").notNull(),        // epoch-ms
  // fmodel-compatible columns
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),                          // opaque JSON blob
});
