import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseEntity,
  extractStageReports,
  updateEntityScore,
  updateEntityTags,
} from "./frontmatter-io";
import type { EntityDetail, FilterOptions } from "./types";

export function getEntityDetail(filepath: string): EntityDetail {
  const text = readFileSync(filepath, "utf-8");
  const entity = parseEntity(text);
  return {
    ...entity,
    stage_reports: extractStageReports(text),
    filepath,
  };
}

export function updateScore(filepath: string, newScore: number): void {
  const text = readFileSync(filepath, "utf-8");
  const updated = updateEntityScore(text, newScore);
  writeFileSync(filepath, updated);
}

export function updateTags(filepath: string, tags: string[]): void {
  const text = readFileSync(filepath, "utf-8");
  const updated = updateEntityTags(text, tags);
  writeFileSync(filepath, updated);
}

function scanEntitiesDetailed(directory: string): EntityDetail[] {
  const glob = new Bun.Glob("*.md");
  const files = Array.from(glob.scanSync({ cwd: directory })).sort();
  const entities: EntityDetail[] = [];

  for (const filename of files) {
    if (filename === "README.md") continue;
    const filepath = join(directory, filename);
    const text = readFileSync(filepath, "utf-8");
    const entity = parseEntity(text);
    entities.push({
      ...entity,
      stage_reports: extractStageReports(text),
      filepath,
      slug: filename.replace(/\.md$/, ""),
    });
  }
  return entities;
}

export function filterEntities(directory: string, filters: FilterOptions): EntityDetail[] {
  const entities = scanEntitiesDetailed(directory);
  return entities.filter((entity) => {
    const fm = entity.frontmatter;
    if (filters.status && fm.status !== filters.status) return false;
    if (filters.tag && !entity.tags.includes(filters.tag)) return false;
    if (filters.min_score != null) {
      const scoreStr = fm.score ?? "";
      if (!scoreStr) return false;
      const score = parseFloat(scoreStr);
      if (isNaN(score) || score < filters.min_score) return false;
    }
    if (filters.max_score != null) {
      const scoreStr = fm.score ?? "";
      if (!scoreStr) return false;
      const score = parseFloat(scoreStr);
      if (isNaN(score) || score > filters.max_score) return false;
    }
    return true;
  });
}
