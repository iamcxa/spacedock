// ABOUTME: createDb factory for spacebridge — wraps bun:sqlite with Drizzle ORM.
// Default DB path: ~/.spacedock/spacebridge.db
// Test isolation: always pass explicit dbPath in tests, never rely on default.
// WAL mode enabled for file DBs only (not :memory:).

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
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
  return drizzle(sqlite, { schema });
}

function defaultDbPath(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? ".";
  return `${home}/.spacedock/spacebridge.db`;
}
