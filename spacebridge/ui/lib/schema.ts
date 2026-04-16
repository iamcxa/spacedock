// ABOUTME: Read-only schema subset for spacebridge UI — mirrors spacebridge/src/schema.ts.
// Declared here to avoid cross-node_modules drizzle-orm type conflicts.
// Keep in sync with spacebridge/src/schema.ts field additions.
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commentId: text("comment_id").notNull().unique(),
  entityPath: text("entity_path").notNull(),
  selectedText: text("selected_text").notNull(),
  sectionHeading: text("section_heading").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  createdAt: integer("created_at").notNull(),
  resolved: integer("resolved").notNull().default(0),
  resolvedReason: text("resolved_reason"),
  resolvedVersion: integer("resolved_version"),
  parentId: text("parent_id"),
  workflowDir: text("workflow_dir").notNull(),
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),
});

export const commentEvents = sqliteTable("comment_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  aggregateId: text("aggregate_id").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  timestamp: integer("timestamp").notNull(),
});

export const suggestions = sqliteTable("suggestions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  suggestionId: text("suggestion_id").notNull().unique(),
  commentId: text("comment_id").notNull(),
  diffFrom: text("diff_from").notNull(),
  diffTo: text("diff_to").notNull(),
  status: text("status").notNull(), // "pending" | "accepted" | "rejected"
  author: text("author").notNull(),
  createdAt: integer("created_at").notNull(),
  workflowDir: text("workflow_dir").notNull(),
});

// ─── share_tokens — [plain drizzle] bearer-token model (mirrors spacebridge/src/schema.ts) ──

export const shareTokens = sqliteTable("share_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  entitySlug: text("entity_slug").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  eventType: text("event_type"),
  aggregateId: text("aggregate_id"),
  sequenceNumber: integer("sequence_number"),
  payload: text("payload"),
});
