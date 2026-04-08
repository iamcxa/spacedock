// ABOUTME: Entity snapshot module — version history, section-aware diff, and rollback.
// ABOUTME: Fence-aware markdown section parser + SnapshotStore backed by SQLite entity_snapshots table.

import type { Database } from "bun:sqlite";
import type { EntitySnapshot, ParsedSection, SnapshotSource, SnapshotVersion } from "./types";

/**
 * Parse markdown into sections delimited by ATX headings (`#`..`######`).
 *
 * A section spans from its heading to the start of the next heading whose
 * level is less than or equal to the current heading level, or to EOF.
 * Subheadings of deeper level are nested inside the parent section body.
 *
 * Headings inside fenced code blocks (``` or ~~~, optionally indented) are
 * ignored so that example markdown inside code blocks does not split the doc.
 *
 * Returns an empty array if the document contains no headings.
 */
export function parseSections(markdown: string): ParsedSection[] {
  const lines = markdown.split("\n");
  // Collect headings in document order: {level, text, start}
  type HeadingRef = { level: number; text: string; start: number };
  const headings: HeadingRef[] = [];

  let inFence = false;
  let fenceMarker = "";
  const fenceOpenRe = /^(\s*)(```+|~~~+)(.*)$/;
  const headingRe = /^(#{1,6})\s+(.*?)\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(fenceOpenRe);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker[0]; // track type: ` or ~
      } else if (marker[0] === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      continue;
    }
    if (inFence) continue;
    const hMatch = line.match(headingRe);
    if (hMatch) {
      const level = hMatch[1].length;
      // Strip trailing `#` chars (closing sequence) and whitespace
      const rawText = hMatch[2].replace(/\s*#+\s*$/, "");
      // Reconstruct the canonical heading line (level + text) for display
      const headingLine = `${hMatch[1]} ${rawText}`.trimEnd();
      headings.push({ level, text: headingLine, start: i });
    }
  }

  if (headings.length === 0) return [];

  const sections: ParsedSection[] = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    // Find the next heading at level <= h.level — that marks the end of this section.
    let end = lines.length;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        end = headings[j].start;
        break;
      }
    }
    const bodyLines = lines.slice(h.start + 1, end);
    sections.push({
      heading: h.text,
      level: h.level,
      body: bodyLines.join("\n"),
      start: h.start,
      end,
    });
  }
  return sections;
}

/**
 * SnapshotStore manages versioned entity snapshots in the SQLite
 * `entity_snapshots` table. Each `createSnapshot` call auto-assigns
 * the next version number for the entity inside a transaction.
 */
export class SnapshotStore {
  private insertStmt;
  private getByVersionStmt;
  private listVersionsStmt;
  private maxVersionStmt;

  constructor(private db: Database) {
    this.insertStmt = db.query(`
      INSERT INTO entity_snapshots
        (entity, version, body, frontmatter, author, reason, source,
         rollback_from_version, rollback_section, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.getByVersionStmt = db.query(`
      SELECT id, entity, version, body, frontmatter, author, reason,
             source, rollback_from_version, rollback_section, created_at
      FROM entity_snapshots
      WHERE entity = ? AND version = ?
    `);
    this.listVersionsStmt = db.query(`
      SELECT version, author, reason, source, created_at,
             rollback_from_version, rollback_section
      FROM entity_snapshots
      WHERE entity = ?
      ORDER BY version ASC
    `);
    this.maxVersionStmt = db.query(`
      SELECT COALESCE(MAX(version), 0) AS max_v
      FROM entity_snapshots WHERE entity = ?
    `);
  }

  createSnapshot(input: {
    entity: string;
    body: string;
    frontmatter?: Record<string, string> | null;
    author: string;
    reason: string;
    source?: SnapshotSource;
    rollback_from_version?: number | null;
    rollback_section?: string | null;
  }): EntitySnapshot {
    const txn = this.db.transaction(() => {
      const row = this.maxVersionStmt.get(input.entity) as { max_v: number };
      const version = row.max_v + 1;
      const fmJson = input.frontmatter ? JSON.stringify(input.frontmatter) : null;
      const created_at = new Date().toISOString();
      this.insertStmt.run(
        input.entity,
        version,
        input.body,
        fmJson,
        input.author,
        input.reason,
        input.source ?? "update",
        input.rollback_from_version ?? null,
        input.rollback_section ?? null,
        created_at,
      );
      return version;
    });
    const version = txn();
    const snap = this.getSnapshot(input.entity, version);
    if (!snap) {
      throw new Error(`Snapshot insert failed for ${input.entity} v${version}`);
    }
    return snap;
  }

  getSnapshot(entity: string, version: number): EntitySnapshot | null {
    const row = this.getByVersionStmt.get(entity, version) as EntitySnapshot | null;
    return row ?? null;
  }

  listVersions(entity: string): SnapshotVersion[] {
    return this.listVersionsStmt.all(entity) as SnapshotVersion[];
  }
}
