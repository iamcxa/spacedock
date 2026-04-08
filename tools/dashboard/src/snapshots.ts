// ABOUTME: Entity snapshot module — version history, section-aware diff, and rollback.
// ABOUTME: Fence-aware markdown section parser + SnapshotStore backed by SQLite entity_snapshots table.

import type { ParsedSection } from "./types";

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
