// ABOUTME: Read-only schema subset for spacebridge UI — mirrors spacebridge/src/schema.ts.
// Declared here to avoid cross-node_modules drizzle-orm type conflicts.
// Keep in sync with spacebridge/src/schema.ts field additions.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().unique(),
  projectRoot: text("project_root").notNull(),
  pid: integer("pid").notNull(),
  connectedAt: integer("connected_at").notNull(),
  lastHeartbeat: integer("last_heartbeat").notNull(),
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),
});

export const entityLeases = sqliteTable("entity_leases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  sessionId: text("session_id").notNull(),
  entitySlug: text("entity_slug").notNull(),
  role: text("role").notNull(),
  acquiredAt: integer("acquired_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  entity: text("entity").notNull(),
  stage: text("stage").notNull(),
  agent: text("agent").notNull(),
  timestamp: integer("timestamp").notNull(),
  detail: text("detail"),
  workflowDir: text("workflow_dir").notNull(),
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),
});
