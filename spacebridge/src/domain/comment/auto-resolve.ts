// spacebridge/src/domain/comment/auto-resolve.ts
// ABOUTME: Auto-resolve utility — bulk-resolves comments anchored to a stage section
// when the entity advances past that stage. Called from the auto-resolve Route Handler.
// Encapsulates: loadEvents → replay → decide(resolve_by_stage_advance) → appendEvents + markResolved.

import type { SpacebridgeDb } from "../../db";
import { decide } from "./decider";
import { replay } from "./evolve";
import { appendEvents, loadEvents, markResolved, countEvents } from "./persistence";

export async function triggerAutoResolve(
  db: SpacebridgeDb,
  entityPath: string,
  previousSectionHeading: string,
): Promise<{ resolvedCount: number }> {
  const existingEvents = await loadEvents(db, entityPath);
  const state = replay(existingEvents);

  const now = Date.now();
  const events = decide(
    {
      type: "resolve_by_stage_advance",
      entityPath,
      sectionHeading: previousSectionHeading,
    },
    state,
    now,
  );

  if (events.length === 0) {
    return { resolvedCount: 0 };
  }

  const seqStart = await countEvents(db, entityPath);
  await appendEvents(db, entityPath, events, seqStart);

  // Update snapshots
  for (const evt of events) {
    if (evt.type === "comment_resolved") {
      await markResolved(db, evt.commentId, "stage_advanced");
    }
  }

  return { resolvedCount: events.length };
}
