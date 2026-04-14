// ABOUTME: Inline-duplicate of tools/dashboard/src/frontmatter-io.ts splitFrontmatter/parseEntity.
// Graceful fallback: missing or malformed frontmatter returns empty fm, no throw.
// Do NOT import from tools/dashboard/ — this module is standalone for UI process isolation.

export type FrontmatterFields = Record<string, string>;

export interface ParsedEntity {
  frontmatter: FrontmatterFields;
  tags: string[];
  body: string;
}

export function splitFrontmatter(text: string): [FrontmatterFields, string] {
  const lines = text.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    return [{}, text];
  }
  let end: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === null) {
    return [{}, text];
  }
  const fm: FrontmatterFields = {};
  for (const line of lines.slice(1, end)) {
    if (!line.includes(":")) continue;
    const idx = line.indexOf(":");
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  const body = lines.slice(end + 1).join("\n");
  return [fm, body];
}

function parseTags(rawTags: string): string[] {
  if (!rawTags?.trim()) return [];
  return rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseEntity(text: string): ParsedEntity {
  const [frontmatter, body] = splitFrontmatter(text);
  return {
    frontmatter,
    tags: parseTags(frontmatter.tags ?? ""),
    body,
  };
}
