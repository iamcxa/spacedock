import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDb(dbPath?: string): Database {
  const resolvedPath = dbPath ?? defaultDbPath();
  if (resolvedPath !== ":memory:") {
    mkdirSync(dirname(resolvedPath), { recursive: true });
  }
  const db = new Database(resolvedPath);
  if (resolvedPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS share_links (
      token TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      entity_paths TEXT NOT NULL,
      stages TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      entity TEXT NOT NULL,
      stage TEXT NOT NULL,
      agent TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      detail TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS entity_snapshots (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      entity                TEXT NOT NULL,
      version               INTEGER NOT NULL,
      body                  TEXT NOT NULL,
      frontmatter           TEXT,
      author                TEXT NOT NULL,
      reason                TEXT NOT NULL,
      source                TEXT NOT NULL DEFAULT 'update',
      rollback_from_version INTEGER,
      rollback_section      TEXT,
      created_at            TEXT NOT NULL
    )
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_version
      ON entity_snapshots(entity, version)
  `);
  return db;
}

function defaultDbPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  return `${home}/.spacedock/dashboard.db`;
}
