// ABOUTME: Read-only Drizzle DB factory for spacebridge UI process.
// Opens ~/.spacedock/spacebridge.db (or SPACEBRIDGE_DB_PATH env) with readonly:true.
// Uses bun:sqlite + drizzle-orm/bun-sqlite — works in bun:test and bun-run Next.js standalone.
// IMPORTANT: This module must only be imported dynamically (await import) from Server Components
// and Route Handlers — never statically — so Next.js build workers (Node.js) don't fail on bun:sqlite.
// SQLite WAL is one-writer-many-readers — UI process must never write.
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { homedir } from "node:os";
import * as schema from "./schema";

export type SpacebridgeReadDb = ReturnType<typeof drizzle<typeof schema>>;

export interface ReadOnlyDbHandle {
  db: SpacebridgeReadDb;
  close(): void;
}

export function openReadOnlyDb(dbPath?: string): ReadOnlyDbHandle {
  const resolvedPath = dbPath ?? defaultDbPath();
  const sqlite = new Database(resolvedPath, { readonly: true });
  return {
    db: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  };
}

// WritableDbHandle — for Route Handlers that write comments.
// Only Route Handlers should use this. Server Components must stay read-only.
export interface WritableDbHandle {
  db: SpacebridgeReadDb;
  close(): void;
}

export function openWritableDb(dbPath?: string): WritableDbHandle {
  const resolvedPath = dbPath ?? defaultDbPath();
  const sqlite = new Database(resolvedPath);
  if (resolvedPath !== ":memory:") {
    sqlite.exec("PRAGMA journal_mode = WAL");
  }
  // Apply schema so tables exist on first write (idempotent CREATE IF NOT EXISTS).
  // Inline DDL to avoid cross-package import of spacebridge/src/db at Next.js build time.
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
  try {
    sqlite.exec(`ALTER TABLE comments ADD COLUMN parent_id TEXT`);
  } catch {
    // Column already exists
  }
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
      parent_id TEXT,
      workflow_dir TEXT NOT NULL,
      event_type TEXT,
      aggregate_id TEXT,
      sequence_number INTEGER,
      payload TEXT
    )
  `);
  return {
    db: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  };
}

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}
