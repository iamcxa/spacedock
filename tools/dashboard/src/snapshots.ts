// ABOUTME: Entity snapshot module — version history, section-aware diff, and rollback.
// ABOUTME: Fence-aware markdown section parser + SnapshotStore backed by SQLite entity_snapshots table.

import type { Database } from "bun:sqlite";
import { createPatch } from "diff";
import type { EntitySnapshot, ParsedSection, SectionDiff, SnapshotSource, SnapshotVersion } from "./types";

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

  /**
   * Compare two snapshot versions section-by-section.
   * Returns a list of SectionDiff entries, ordered by the `to` version
   * sections first (so the UI can render them in destination order),
   * then any `removed` sections appended at the end.
   */
  diffVersions(
    entity: string,
    fromVersion: number,
    toVersion: number,
  ): { from: number; to: number; sections: SectionDiff[] } {
    const fromSnap = this.getSnapshot(entity, fromVersion);
    if (!fromSnap) {
      throw new Error(`Snapshot not found: ${entity} v${fromVersion}`);
    }
    const toSnap = this.getSnapshot(entity, toVersion);
    if (!toSnap) {
      throw new Error(`Snapshot not found: ${entity} v${toVersion}`);
    }
    const fromSections = parseSections(fromSnap.body);
    const toSections = parseSections(toSnap.body);
    const fromMap = new Map(fromSections.map((s) => [s.heading, s]));
    const toMap = new Map(toSections.map((s) => [s.heading, s]));

    const result: SectionDiff[] = [];
    // Iterate in `to` order so diff output matches destination layout.
    for (const t of toSections) {
      const f = fromMap.get(t.heading);
      if (!f) {
        result.push({ heading: t.heading, status: "added" });
        continue;
      }
      if (f.body === t.body) {
        result.push({ heading: t.heading, status: "unchanged" });
        continue;
      }
      const patch = createPatch(
        t.heading,
        f.body,
        t.body,
        `v${fromVersion}`,
        `v${toVersion}`,
      );
      result.push({ heading: t.heading, status: "modified", diff: patch });
    }
    // Append removed sections (present in `from` but not in `to`).
    for (const f of fromSections) {
      if (!toMap.has(f.heading)) {
        result.push({ heading: f.heading, status: "removed" });
      }
    }
    return { from: fromVersion, to: toVersion, sections: result };
  }

  /**
   * Rollback a specific section to the content it had in a target version.
   * Creates a new snapshot recording the rollback and returns the new body
   * to write back to disk. The caller is responsible for the file write.
   *
   * The `warning` field is null here and populated by a conflict-detection
   * heuristic in a subsequent commit.
   */
  rollbackSection(input: {
    entity: string;
    currentBody: string;
    currentFrontmatter: Record<string, string>;
    sectionHeading: string;
    toVersion: number;
    author: string;
  }): {
    newBody: string;
    newSnapshot: EntitySnapshot;
    warning: string | null;
  } {
    const target = this.getSnapshot(input.entity, input.toVersion);
    if (!target) {
      throw new Error(`Snapshot not found: ${input.entity} v${input.toVersion}`);
    }
    const targetSections = parseSections(target.body);
    const currentSections = parseSections(input.currentBody);

    const targetSection = findSectionByHeading(targetSections, input.sectionHeading);
    if (!targetSection) {
      throw new Error(`Section not found in target version: ${input.sectionHeading}`);
    }
    const currentSection = findSectionByHeading(currentSections, input.sectionHeading);
    if (!currentSection) {
      throw new Error(
        `Section not found in current document: ${input.sectionHeading} (restoring deleted sections is out of scope)`,
      );
    }

    // Conflict heuristic (non-blocking): flag other sections whose body has
    // changed between the target version and the current on-disk document.
    // We compare the target snapshot's sections to the current body's sections,
    // ignoring the section that is being rolled back.
    const warning = computeConflictWarning(
      targetSections,
      currentSections,
      targetSection.heading,
      input.toVersion,
    );

    const newBody = replaceSection(input.currentBody, currentSection, targetSection.body);

    const newSnapshot = this.createSnapshot({
      entity: input.entity,
      body: newBody,
      frontmatter: input.currentFrontmatter,
      author: input.author,
      reason: `Rollback ${targetSection.heading} to v${input.toVersion}`,
      source: "rollback",
      rollback_from_version: input.toVersion,
      rollback_section: targetSection.heading,
    });

    return { newBody, newSnapshot, warning };
  }
}

/**
 * Non-blocking conflict heuristic. Returns a human-readable warning string
 * listing any sections (other than the rolled-back one) whose body differs
 * between the target snapshot and the current document. Returns null when
 * only the target section has diverged.
 */
export function computeConflictWarning(
  targetSections: ParsedSection[],
  currentSections: ParsedSection[],
  rolledBackHeading: string,
  targetVersion: number,
): string | null {
  const currentMap = new Map(currentSections.map((s) => [s.heading, s]));
  const modified: string[] = [];
  for (const ts of targetSections) {
    if (ts.heading === rolledBackHeading) continue;
    const cs = currentMap.get(ts.heading);
    if (!cs) {
      // Section present in target but missing in current → drift
      modified.push(ts.heading);
      continue;
    }
    if (cs.body !== ts.body) {
      modified.push(ts.heading);
    }
  }
  // Also catch sections added to current but not in target (other drift).
  const targetHeadings = new Set(targetSections.map((s) => s.heading));
  for (const cs of currentSections) {
    if (cs.heading === rolledBackHeading) continue;
    if (!targetHeadings.has(cs.heading)) {
      modified.push(cs.heading);
    }
  }
  if (modified.length === 0) return null;
  return `Other sections modified since v${targetVersion}: ${modified.join(", ")}`;
}

/**
 * Find a section by heading query. Prefers exact match (after whitespace
 * normalization), falls back to substring match. Throws if the substring
 * match is ambiguous (>1 candidate).
 */
export function findSectionByHeading(
  sections: ParsedSection[],
  query: string,
): ParsedSection | null {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ");
  const q = norm(query);
  // 1. Exact match on normalized heading
  const exact = sections.find((s) => norm(s.heading) === q);
  if (exact) return exact;
  // 2. Substring fallback — case-insensitive
  const qLower = q.toLowerCase();
  const candidates = sections.filter((s) => norm(s.heading).toLowerCase().includes(qLower));
  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    throw new Error(
      `Ambiguous section heading "${query}": matches ${candidates.map((c) => c.heading).join(", ")}`,
    );
  }
  return candidates[0];
}

/**
 * Replace a section's body in a markdown document. The heading line at
 * `section.start` is preserved; lines between the heading and the section
 * end are replaced with `newSectionBody` (split on \n).
 */
export function replaceSection(
  body: string,
  section: ParsedSection,
  newSectionBody: string,
): string {
  const lines = body.split("\n");
  const before = lines.slice(0, section.start + 1); // keep through heading
  const after = lines.slice(section.end);
  const replacement = newSectionBody.split("\n");
  return [...before, ...replacement, ...after].join("\n");
}
