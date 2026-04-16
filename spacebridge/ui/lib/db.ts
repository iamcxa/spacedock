// ABOUTME: Read-only Drizzle DB factory for spacebridge UI process.
// Opens ~/.spacedock/spacebridge.db (or SPACEBRIDGE_DB_PATH env) with readonly:true.
// Uses bun:sqlite — for consistency with src/db.ts (write path). UAT/production runs via
// `bun run build && bun run start` which launches standalone server.js on Bun runtime.
// `bun run dev` launches Next dev workers on Node where bun:sqlite is unavailable --
// for UAT use the production build instead of dev mode.
// SQLite WAL is one-writer-many-readers — UI process must never write.
import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { drizzle } from "drizzle-orm/bun-sqlite";
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

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}
