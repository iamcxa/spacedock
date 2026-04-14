// ABOUTME: createDb factory for spacebridge — wraps bun:sqlite with Drizzle ORM.
// Default DB path: ~/.spacedock/spacebridge.db
// Test isolation: always pass explicit dbPath in tests, never rely on default.
// WAL mode enabled for file DBs only (not :memory:).
// Applies CREATE TABLE IF NOT EXISTS inline so callers get a ready-to-use DB
// without running drizzle-kit migrate (which requires a migrations folder on disk).

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { homedir } from "node:os";
import * as schema from "./schema";

export type SpacebridgeDb = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(dbPath?: string): SpacebridgeDb {
  const resolvedPath = dbPath ?? defaultDbPath();
  if (resolvedPath !== ":memory:") {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }
  const sqlite = new Database(resolvedPath);
  if (resolvedPath !== ":memory:") {
    sqlite.exec("PRAGMA journal_mode = WAL");
  }
  applySchema(sqlite);
  return drizzle(sqlite, { schema });
}

function applySchema(sqlite: Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL UNIQUE,
      project_root TEXT NOT NULL,
      pid INTEGER NOT NULL,
      connected_at INTEGER NOT NULL,
      last_heartbeat INTEGER NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entity_leases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      entity_slug TEXT NOT NULL,
      role TEXT NOT NULL,
      acquired_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      entity TEXT NOT NULL,
      stage TEXT NOT NULL,
      agent TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      detail TEXT,
      workflow_dir TEXT NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id TEXT NOT NULL UNIQUE,
      entity_path TEXT NOT NULL,
      selected_text TEXT NOT NULL,
      section_heading TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolved_reason TEXT,
      resolved_version INTEGER,
      workflow_dir TEXT NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS comment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aggregate_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  // Add parent_id column to comments if it doesn't exist (SQLite lacks IF NOT EXISTS for ALTER)
  try {
    sqlite.exec(`ALTER TABLE comments ADD COLUMN parent_id TEXT`);
  } catch {
    // Column already exists — safe to ignore
  }
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS lease_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aggregate_id TEXT NOT NULL,
      sequence_number INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS share_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      hash_algorithm TEXT DEFAULT 'argon2id',
      entity_paths TEXT NOT NULL,
      stages TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
}

function defaultDbPath(): string {
  return `${homedir()}/.spacedock/spacebridge.db`;
}
