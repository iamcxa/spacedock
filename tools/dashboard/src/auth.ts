import { Database } from "bun:sqlite";
import type { ShareLink } from "./types";

export interface CreateShareInput {
  password: string;
  entityPaths: string[];
  stages: string[];
  label: string;
  ttlHours: number;
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ShareRegistry {
  private readonly db: Database;
  private readonly insertStmt;
  private readonly getStmt;
  private readonly deleteStmt;
  private readonly deleteExpiredStmt;
  private readonly listStmt;
  private readonly allStmt;

  constructor(db: Database) {
    this.db = db;
    this.insertStmt = db.query(
      "INSERT INTO share_links (token, password_hash, entity_paths, stages, label, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    this.getStmt = db.query("SELECT * FROM share_links WHERE token = ?");
    this.deleteStmt = db.query("DELETE FROM share_links WHERE token = ?");
    this.deleteExpiredStmt = db.query("DELETE FROM share_links WHERE expires_at < ?");
    this.listStmt = db.query("SELECT * FROM share_links WHERE expires_at >= ?");
    this.allStmt = db.query("SELECT * FROM share_links");
  }

  async create(input: CreateShareInput): Promise<ShareLink> {
    const token = generateToken();
    const passwordHash = await Bun.password.hash(input.password);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlHours * 60 * 60 * 1000);

    this.insertStmt.run(
      token,
      passwordHash,
      JSON.stringify(input.entityPaths),
      JSON.stringify(input.stages),
      input.label,
      now.toISOString(),
      expiresAt.toISOString(),
    );

    return {
      token,
      passwordHash,
      entityPaths: input.entityPaths,
      stages: input.stages,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      label: input.label,
    };
  }

  async verify(token: string, password: string): Promise<boolean> {
    const link = this.get(token);
    if (!link) return false;
    return Bun.password.verify(password, link.passwordHash);
  }

  get(token: string): ShareLink | null {
    const row = this.getStmt.get(token) as ShareLinkRow | null;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.deleteStmt.run(token);
      return null;
    }
    return rowToShareLink(row);
  }

  list(): ShareLink[] {
    // Clean up expired first, then return remaining
    this.deleteExpiredStmt.run(new Date().toISOString());
    const rows = this.listStmt.all(new Date().toISOString()) as ShareLinkRow[];
    return rows.map(rowToShareLink);
  }

  delete(token: string): boolean {
    const result = this.deleteStmt.run(token);
    return result.changes > 0;
  }

  isInScope(token: string, entityPath: string): boolean {
    const link = this.get(token);
    if (!link) return false;
    return link.entityPaths.includes(entityPath);
  }

  entries(): Array<[string, ShareLink]> {
    const rows = this.allStmt.all() as ShareLinkRow[];
    return rows.map((row) => [row.token, rowToShareLink(row)] as [string, ShareLink]);
  }
}

interface ShareLinkRow {
  token: string;
  password_hash: string;
  entity_paths: string;
  stages: string;
  label: string;
  created_at: string;
  expires_at: string;
}

function rowToShareLink(row: ShareLinkRow): ShareLink {
  return {
    token: row.token,
    passwordHash: row.password_hash,
    entityPaths: JSON.parse(row.entity_paths),
    stages: JSON.parse(row.stages),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    label: row.label,
  };
}
