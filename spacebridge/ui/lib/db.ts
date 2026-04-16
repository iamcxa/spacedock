// ABOUTME: Read-only Drizzle DB factory for spacebridge UI process.
// Opens ~/.spacedock/spacebridge.db (or SPACEBRIDGE_DB_PATH env) with readonly:true.
// Uses better-sqlite3 — works in both Bun and Node (Next.js dev server spawns Node workers).
// Previously used bun:sqlite which silently broke Next.js dev (Node runtime cannot import bun: modules).
// SQLite WAL is one-writer-many-readers — UI process must never write.
import { homedir } from "node:os";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type SpacebridgeReadDb = ReturnType<typeof drizzle<typeof schema>>;

export interface ReadOnlyDbHandle {
  db: SpacebridgeReadDb;
  close(): void;
}

export function openReadOnlyDb(dbPath?: string): ReadOnlyDbHandle {
  const resolvedPath = dbPath ?? defaultDbPath();
  const sqlite = new Database(resolvedPath, { readonly: true, fileMustExist: true });
  return {
    db: drizzle(sqlite, { schema }),
    close: () => sqlite.close(),
  };
}

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}
