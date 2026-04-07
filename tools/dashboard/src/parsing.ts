import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FrontmatterFields, Stage, Entity } from "./types";

export function parseFrontmatter(filepath: string): FrontmatterFields {
  const text = readFileSync(filepath, "utf-8");
  const lines = text.split("\n");
  const fields: FrontmatterFields = {};
  let inFm = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (line === "---") {
      if (inFm) break;
      inFm = true;
      continue;
    }
    if (inFm && line.includes(":")) {
      if (line.length > 0 && line[0] !== " " && line[0] !== "\t") {
        const idx = line.indexOf(":");
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        fields[key] = val;
      }
    }
  }
  return fields;
}

export function parseStagesBlock(filepath: string): Stage[] | null {
  const text = readFileSync(filepath, "utf-8");
  const allLines = text.split("\n").map((l) => l.replace(/\r$/, ""));

  // Extract frontmatter lines
  const lines: string[] = [];
  let inFm = false;
  for (const line of allLines) {
    if (line === "---") {
      if (inFm) break;
      inFm = true;
      continue;
    }
    if (inFm) lines.push(line);
  }

  // Find stages: line
  let stagesStart: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimEnd() === "stages:") {
      stagesStart = i;
      break;
    }
  }
  if (stagesStart === null) return null;

  const defaults: Record<string, string> = {};
  const states: Record<string, string>[] = [];
  let i = stagesStart + 1;
  let stagesIndent: number | null = null;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trimStart();
    if (!stripped) { i++; continue; }
    const indent = line.length - stripped.length;
    if (stagesIndent === null) {
      stagesIndent = indent;
    } else if (indent < stagesIndent) {
      break;
    }

    if (indent === stagesIndent) {
      if (stripped === "defaults:") {
        i++;
        while (i < lines.length) {
          const dline = lines[i];
          const dstripped = dline.trimStart();
          if (!dstripped) { i++; continue; }
          const dindent = dline.length - dstripped.length;
          if (dindent <= stagesIndent!) break;
          if (dstripped.includes(":")) {
            const idx = dstripped.indexOf(":");
            defaults[dstripped.slice(0, idx).trim()] = dstripped.slice(idx + 1).trim();
          }
          i++;
        }
        continue;
      } else if (stripped === "states:") {
        i++;
        let currentState: Record<string, string> | null = null;
        while (i < lines.length) {
          const sline = lines[i];
          const sstripped = sline.trimStart();
          if (!sstripped) { i++; continue; }
          const sindent = sline.length - sstripped.length;
          if (sindent <= stagesIndent!) break;
          if (sstripped.startsWith("- name:")) {
            const name = sstripped.slice("- name:".length).trim();
            currentState = { name };
            states.push(currentState);
          } else if (currentState !== null && sstripped.includes(":") && !sstripped.startsWith("- ")) {
            const idx = sstripped.indexOf(":");
            currentState[sstripped.slice(0, idx).trim()] = sstripped.slice(idx + 1).trim();
          }
          i++;
        }
        continue;
      }
    }
    i++;
  }

  if (states.length === 0) return null;

  const defaultWorktree = (defaults.worktree ?? "false").toLowerCase() === "true";
  const defaultConcurrency = parseInt(defaults.concurrency ?? "2", 10);

  return states.map((state) => ({
    name: state.name,
    worktree: (state.worktree ?? String(defaultWorktree)).toLowerCase() === "true",
    concurrency: parseInt(state.concurrency ?? String(defaultConcurrency), 10),
    gate: (state.gate ?? "false").toLowerCase() === "true",
    terminal: (state.terminal ?? "false").toLowerCase() === "true",
    initial: (state.initial ?? "false").toLowerCase() === "true",
    feedback_to: state["feedback-to"] ?? "",
    conditional: (state.conditional ?? "false").toLowerCase() === "true",
    model: state.model ?? "",
  }));
}

/**
 * Parse a depends-on frontmatter value like "[007, 016]" into number[].
 * Returns empty array if the value is empty/undefined.
 */
export function parseDependsOn(raw: string | undefined): number[] {
  if (!raw) return [];
  const matches = raw.match(/\d+/g);
  if (!matches) return [];
  return matches.map(Number);
}

export function scanEntities(directory: string): Entity[] {
  const glob = new Bun.Glob("*.md");
  const files = Array.from(glob.scanSync({ cwd: directory })).sort();
  const entities: Entity[] = [];

  for (const filename of files) {
    if (filename === "README.md") continue;
    const filepath = join(directory, filename);
    const slug = filename.replace(/\.md$/, "");
    const fields = parseFrontmatter(filepath);
    const entity: Entity = {
      ...fields,
      slug,
      path: filepath,
      id: fields.id ?? "",
      status: fields.status ?? "",
      title: fields.title ?? "",
      score: fields.score ?? "",
      source: fields.source ?? "",
      worktree: fields.worktree ?? "",
    };
    entities.push(entity);
  }
  return entities;
}
