import type { FrontmatterFields, ParsedEntity, StageReport, StageReportItem } from "./types";

export function splitFrontmatter(text: string): [FrontmatterFields, string] {
  const lines = text.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    throw new Error("Missing YAML frontmatter");
  }
  let end: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === null) {
    throw new Error("Unterminated YAML frontmatter");
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

export function parseTags(rawTags: string): string[] {
  if (!rawTags || !rawTags.trim()) return [];
  return rawTags.split(",").map((t) => t.trim()).filter(Boolean);
}

export function parseEntity(text: string): ParsedEntity {
  const [fm, body] = splitFrontmatter(text);
  return {
    frontmatter: fm,
    tags: parseTags(fm.tags ?? ""),
    body,
  };
}

export function updateFrontmatterFields(text: string, updates: Record<string, string>): string {
  const lines = text.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    throw new Error("Missing YAML frontmatter");
  }
  let end: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === null) {
    throw new Error("Unterminated YAML frontmatter");
  }
  const fmLines = lines.slice(1, end);
  const bodyLines = lines.slice(end + 1);
  const seen = new Set<string>();
  const out: string[] = [];

  for (const line of fmLines) {
    if (!line.includes(":")) {
      out.push(line);
      continue;
    }
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    if (key in updates) {
      out.push(`${key}: ${updates[key]}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      out.push(`${key}: ${value}`);
    }
  }
  return ["---", ...out, "---", ...bodyLines].join("\n");
}

export function updateEntityScore(text: string, newScore: number): string {
  return updateFrontmatterFields(text, { score: String(newScore) });
}

export function updateEntityTags(text: string, tags: string[]): string {
  const tagsStr = tags.map((t) => t.trim()).filter(Boolean).join(",");
  return updateFrontmatterFields(text, { tags: tagsStr });
}

export function extractStageReports(text: string): StageReport[] {
  const [, body] = splitFrontmatter(text);
  const reports: StageReport[] = [];
  const pattern = /^## Stage Report: (.+)$/m;
  const sections = body.split(pattern);

  // sections[0] is text before first report, then alternating: stage_name, section_body
  for (let i = 1; i < sections.length; i += 2) {
    const stageName = sections[i].trim();
    const sectionBody = i + 1 < sections.length ? sections[i + 1] : "";

    const items: StageReportItem[] = [];
    let summary = "";

    // Extract summary
    const summaryParts = sectionBody.split(/^### Summary\s*$/m);
    const checklistText = summaryParts[0];
    if (summaryParts.length > 1) {
      summary = summaryParts[1].trim();
    }

    // Parse checklist items
    const itemPattern = /^- \[(x| )\] ((?:SKIP: |FAIL: )?)(.+)$/;
    const lines = checklistText.split("\n");
    for (let j = 0; j < lines.length; j++) {
      const m = lines[j].match(itemPattern);
      if (m) {
        const [, checked, prefix, itemText] = m;
        let status: StageReportItem["status"];
        if (checked === "x") {
          status = "done";
        } else if (prefix.startsWith("SKIP")) {
          status = "skip";
        } else if (prefix.startsWith("FAIL")) {
          status = "fail";
        } else {
          status = "pending";
        }
        let detail = "";
        if (j + 1 < lines.length && lines[j + 1].startsWith("  ")) {
          detail = lines[j + 1].trim();
        }
        items.push({ status, text: itemText.trim(), detail });
      }
    }

    reports.push({ stage: stageName, items, summary });
  }
  return reports;
}
