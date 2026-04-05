import type { FrontmatterFields, ParsedEntity, StageReport, StageReportItem, Stage } from "./types";

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

export function updateWorkflowStages(text: string, stages: Stage[]): string {
  const lines = text.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    throw new Error("Missing YAML frontmatter");
  }

  // Find frontmatter end
  let fmEnd: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      fmEnd = i;
      break;
    }
  }
  if (fmEnd === null) {
    throw new Error("Unterminated YAML frontmatter");
  }

  // Find the "states:" line and its extent within frontmatter
  let statesStart: number | null = null;
  let statesEnd: number | null = null;
  let statesIndent = 0;

  for (let i = 1; i < fmEnd; i++) {
    const stripped = lines[i].trimStart();
    if (stripped === "states:") {
      statesStart = i;
      statesIndent = lines[i].length - stripped.length;
      break;
    }
  }

  if (statesStart === null) {
    throw new Error("No states: block found in frontmatter");
  }

  // Find where states block ends (next line at same or lower indent, or frontmatter end)
  for (let i = statesStart + 1; i < fmEnd; i++) {
    const stripped = lines[i].trimStart();
    if (!stripped) continue;
    const indent = lines[i].length - stripped.length;
    if (indent <= statesIndent) {
      statesEnd = i;
      break;
    }
  }
  if (statesEnd === null) {
    statesEnd = fmEnd;
  }

  // Generate new states lines
  const pad = " ".repeat(statesIndent + 2);
  const propPad = " ".repeat(statesIndent + 4);
  const newStatesLines: string[] = [lines[statesStart]]; // keep "    states:" line as-is

  for (const stage of stages) {
    newStatesLines.push(`${pad}- name: ${stage.name}`);
    if (stage.initial) newStatesLines.push(`${propPad}initial: true`);
    if (stage.terminal) newStatesLines.push(`${propPad}terminal: true`);
    if (stage.gate) newStatesLines.push(`${propPad}gate: true`);
    if (stage.conditional) newStatesLines.push(`${propPad}conditional: true`);
    if (stage.feedback_to) newStatesLines.push(`${propPad}feedback-to: ${stage.feedback_to}`);
    if (!stage.worktree) newStatesLines.push(`${propPad}worktree: false`);
    if (stage.model) newStatesLines.push(`${propPad}model: ${stage.model}`);
  }

  // Splice: replace statesStart..statesEnd with new lines
  const before = lines.slice(0, statesStart);
  const after = lines.slice(statesEnd);
  return [...before, ...newStatesLines, ...after].join("\n");
}
