// ABOUTME: Entity resolution — maps entity slug to absolute file path via workflow discovery.
// ABOUTME: Used by MCP tools to accept human-readable slugs instead of raw file paths.

import { basename } from "node:path";
import { discoverWorkflows, aggregateWorkflow } from "./discovery";

/**
 * Resolve an entity slug to its absolute file path.
 *
 * Scans all workflows under `projectRoot`, collects every entity, then matches
 * by `entity.slug` or the basename of `entity.path` (without `.md`).
 *
 * @param slug     - Entity slug, e.g. "033-dashboard-mcp-tool-expansion"
 * @param projectRoot - Root directory to scan for workflows
 * @param workflow - Optional workflow dir basename to narrow down ambiguous matches
 * @throws "Entity not found: <slug>" when no match found
 * @throws "Ambiguous entity slug: <slug> matches: <paths>" when multiple matches and no workflow filter resolves it
 */
export function resolveEntity(slug: string, projectRoot: string, workflow?: string): string {
  const workflows = discoverWorkflows(projectRoot);
  const matches: string[] = [];

  for (const wf of workflows) {
    const data = aggregateWorkflow(wf.dir);
    if (!data) continue;

    // Apply workflow filter if provided
    if (workflow && data.name !== workflow) continue;

    for (const entity of data.entities) {
      const entitySlug = entity.slug || basename(entity.path).replace(/\.md$/, "");
      if (entitySlug === slug) {
        matches.push(entity.path);
      }
    }
  }

  if (matches.length === 0) {
    throw new Error(`Entity not found: ${slug}`);
  }
  if (matches.length > 1) {
    const label = workflow ? ` in workflow "${workflow}"` : "";
    throw new Error(`Ambiguous entity slug: ${slug}${label} matches: ${matches.join(", ")}`);
  }
  return matches[0];
}
