// ABOUTME: Inline-duplicate of tools/dashboard/src/parsing.ts parseStagesBlock.
// Extended with `manual` field for pipeline graph rendering (dashed border nodes).
// Do NOT import from tools/dashboard/ — this module is standalone for UI process isolation.

import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

export interface PipelineStage {
  name: string;
  gate: boolean;
  terminal: boolean;
  initial: boolean;
  manual: boolean;
  conditional: boolean;
  feedback_to: string;
  model: string;
  worktree: boolean;
  concurrency: number;
}

export function parsePipelineStages(readmePath: string): PipelineStage[] {
  let text: string;
  try {
    text = readFileSync(readmePath, "utf-8");
  } catch {
    return [];
  }

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
  if (stagesStart === null) return [];

  const defaults: Record<string, string> = {};
  const states: Record<string, string>[] = [];
  let i = stagesStart + 1;
  let stagesIndent: number | null = null;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trimStart();
    if (!stripped || stripped.startsWith("#")) {
      i++;
      continue;
    }
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
          if (!dstripped || dstripped.startsWith("#")) {
            i++;
            continue;
          }
          const dindent = dline.length - dstripped.length;
          if (dindent <= stagesIndent!) break;
          if (dstripped.includes(":") && !dstripped.startsWith("#")) {
            const idx = dstripped.indexOf(":");
            defaults[dstripped.slice(0, idx).trim()] = dstripped
              .slice(idx + 1)
              .trim();
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
          if (!sstripped || sstripped.startsWith("#")) {
            i++;
            continue;
          }
          const sindent = sline.length - sstripped.length;
          if (sindent <= stagesIndent!) break;
          if (sstripped.startsWith("- name:")) {
            const name = sstripped.slice("- name:".length).trim();
            currentState = { name };
            states.push(currentState);
          } else if (
            currentState !== null &&
            sstripped.includes(":") &&
            !sstripped.startsWith("- ") &&
            !sstripped.startsWith("#")
          ) {
            const idx = sstripped.indexOf(":");
            currentState[sstripped.slice(0, idx).trim()] = sstripped
              .slice(idx + 1)
              .trim();
          }
          i++;
        }
        continue;
      }
    }
    i++;
  }

  if (states.length === 0) return [];

  const defaultWorktree = (defaults.worktree ?? "false").toLowerCase() === "true";
  const defaultConcurrency = parseInt(defaults.concurrency ?? "2", 10);

  return states.map((state) => ({
    name: state.name,
    worktree: (state.worktree ?? String(defaultWorktree)).toLowerCase() === "true",
    concurrency: parseInt(state.concurrency ?? String(defaultConcurrency), 10),
    gate: (state.gate ?? "false").toLowerCase() === "true",
    terminal: (state.terminal ?? "false").toLowerCase() === "true",
    initial: (state.initial ?? "false").toLowerCase() === "true",
    manual: (state.manual ?? "false").toLowerCase() === "true",
    feedback_to: state["feedback-to"] ?? "",
    conditional: (state.conditional ?? "false").toLowerCase() === "true",
    model: state.model ?? "",
  }));
}

export function parseModHooks(modsDir: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let files: string[];
  try {
    files = readdirSync(modsDir).filter((f) => f.endsWith(".md"));
  } catch {
    return result;
  }

  for (const file of files) {
    const modName = basename(file, ".md");
    let content: string;
    try {
      content = readFileSync(join(modsDir, file), "utf-8");
    } catch {
      continue;
    }
    const hooks: string[] = [];
    for (const line of content.split("\n")) {
      const match = line.match(/^##\s+Hook:\s+(\w+)/);
      if (match) {
        hooks.push(match[1]);
      }
    }
    if (hooks.length > 0) {
      result.set(modName, hooks);
    }
  }

  return result;
}
