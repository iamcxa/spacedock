// ABOUTME: Scans docs/build-pipeline/*.md for a given projectRoot, returns EntityCard[].
// Skips files that fail to parse (graceful fallback — real repos have malformed files).
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseEntity } from "./entity-parse";

export interface EntityCard {
  slug: string;
  title: string;
  status: string;
  stage: string;
  id: string;
  repoLabel: string;
}

export async function scanEntitiesForRepo(
  projectRoot: string,
  repoLabel: string,
): Promise<EntityCard[]> {
  const pipelineDir = join(projectRoot, "docs", "build-pipeline");
  let files: string[];
  try {
    files = await readdir(pipelineDir);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  const cards: EntityCard[] = [];

  for (const file of mdFiles) {
    try {
      const text = await readFile(join(pipelineDir, file), "utf-8");
      const { frontmatter } = parseEntity(text);
      // Skip if no id field — indicates failed or missing frontmatter
      if (!frontmatter.id) continue;
      const slug = basename(file, ".md");
      cards.push({
        slug,
        title: frontmatter.title ?? slug,
        status: frontmatter.status ?? "unknown",
        stage: frontmatter.stage ?? "",
        id: frontmatter.id,
        repoLabel,
      });
    } catch (err) {
      console.warn(`[entity-scan] skipping ${file}:`, err);
    }
  }

  return cards;
}
