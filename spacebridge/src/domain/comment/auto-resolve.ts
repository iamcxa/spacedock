// spacebridge/src/domain/comment/auto-resolve.ts
// ABOUTME: Auto-resolve utility — bulk-resolves comments anchored to a stage section
// when the entity advances past that stage. Called from the auto-resolve Route Handler.
// Encapsulates: loadEvents → replay → decide(resolve_by_stage_advance) → appendEvents + markResolved.

import type { SpacebridgeDb } from "../../db";
import { decide } from "./decider";
import { replay } from "./evolve";
import { appendEvents, loadEvents, markResolved, countEvents } from "./persistence";

// triggerAutoResolve resolves all open comments whose sectionHeading contains
// the given stageName (case-insensitive). This handles real entity headings like
// "## Stage Report: explore" being resolved when stage "explore" advances.
export async function triggerAutoResolve(
  db: SpacebridgeDb,
  entityPath: string,
  stageName: string,
): Promise<{ resolvedCount: number }> {
  const existingEvents = await loadEvents(db, entityPath);
  const state = replay(existingEvents);

  const stageNameLower = stageName.toLowerCase();

  // Collect unique sectionHeadings that contain the stage name
  const matchingHeadings = new Set<string>();
  for (const [, comment] of state) {
    if (
      comment.entityPath === entityPath &&
      !comment.resolved &&
      comment.sectionHeading.toLowerCase().includes(stageNameLower)
    ) {
      matchingHeadings.add(comment.sectionHeading);
    }
  }

  if (matchingHeadings.size === 0) {
    return { resolvedCount: 0 };
  }

  const now = Date.now();
  let allEvents: ReturnType<typeof decide> = [];

  for (const sectionHeading of matchingHeadings) {
    const resolved = decide(
      { type: "resolve_by_stage_advance", entityPath, sectionHeading },
      state,
      now,
    );
    allEvents = allEvents.concat(resolved);
  }

  if (allEvents.length === 0) {
    return { resolvedCount: 0 };
  }

  const seqStart = await countEvents(db, entityPath);
  await appendEvents(db, entityPath, allEvents, seqStart);

  for (const evt of allEvents) {
    if (evt.type === "comment_resolved") {
      await markResolved(db, evt.commentId, "stage_advanced");
    }
  }

  return { resolvedCount: allEvents.length };
}
