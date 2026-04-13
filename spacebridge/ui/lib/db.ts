// ABOUTME: Read-only Drizzle DB factory for spacebridge UI process.
// Opens ~/.spacedock/spacebridge.db (or SPACEBRIDGE_DB_PATH env) with readonly:true.
// SQLite WAL is one-writer-many-readers — UI process must never write.
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { homedir } from "node:os";
import * as schema from "../../src/schema";

export type SpacebridgeReadDb = ReturnType<typeof drizzle<typeof schema>>;

export function openReadOnlyDb(dbPath?: string): SpacebridgeReadDb {
  const resolvedPath = dbPath ?? defaultDbPath();
  const sqlite = new Database(resolvedPath, { readonly: true });
  return drizzle(sqlite, { schema });
}

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}
