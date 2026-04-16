// spacebridge/ui/app/api/entities/[slug]/suggestions/[id]/accept/route.ts
// ABOUTME: POST /api/entities/[slug]/suggestions/[id]/accept — accept a suggestion and apply body edit.
// Uses fmodel CQRS: load both states, decideSuggestion, appendEvents, update snapshot status,
// then calls applySuggestion to write the filesystem change. Returns 200 on success.

import { homedir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: suggestionId } = await params;

  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const { parseSuggestionCommand } = await import(
      "../../../../../../../../src/domain/comment/suggestion-schemas"
    );

    let cmd: ReturnType<typeof parseSuggestionCommand>;
    try {
      cmd = parseSuggestionCommand({
        type: "accept_suggestion",
        suggestionId,
        author: (body as Record<string, unknown>).author ?? "captain",
      });
    } catch (err) {
      return Response.json(
        { error: "Invalid request body", details: String(err) },
        { status: 400 },
      );
    }

    if (cmd.type !== "accept_suggestion") {
      return Response.json({ error: "Invalid command type" }, { status: 400 });
    }

    const { createDb } = await import("../../../../../../../../src/db");
    const { loadEvents } = await import(
      "../../../../../../../../src/domain/comment/persistence"
    );
    const { replay } = await import("../../../../../../../../src/domain/comment/evolve");
    const {
      appendSuggestionEvents,
      countSuggestionEvents,
      updateSuggestionStatus,
      loadSuggestionEvents,
      getSuggestionsByEntity,
    } = await import("../../../../../../../../src/domain/comment/suggestion-persistence");
    const { decideSuggestion } = await import(
      "../../../../../../../../src/domain/comment/suggestion-decider"
    );
    const { replaySuggestions } = await import(
      "../../../../../../../../src/domain/comment/suggestion-evolve"
    );
    const { applySuggestion } = await import(
      "../../../../../../../../src/application/suggestion-applier"
    );

    const db = createDb(defaultDbPath());
    const entityPath = `/docs/build-pipeline/${slug}.md`;

    // Load comment state via replay
    const existingCommentEvents = await loadEvents(db, entityPath);
    const commentState = replay(existingCommentEvents);

    // Load suggestion state via replay
    const existingSuggestionEvents = await loadSuggestionEvents(db, entityPath);
    const suggestionState = replaySuggestions(existingSuggestionEvents);

    const now = Date.now();
    let events: Awaited<ReturnType<typeof decideSuggestion>>;
    try {
      events = decideSuggestion(cmd, suggestionState, commentState, now);
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "SuggestionNotFound") {
        return Response.json({ error: "Suggestion not found" }, { status: 404 });
      }
      if (name === "SuggestionNotPending") {
        return Response.json({ error: "Suggestion is not pending" }, { status: 409 });
      }
      if (name === "GuestCannotDecideSuggestion") {
        return Response.json({ error: "Guests cannot accept suggestions" }, { status: 403 });
      }
      throw err;
    }

    // Look up suggestion snapshot for diff_from / diff_to before appending events
    const allSuggestions = await getSuggestionsByEntity(db, entityPath);
    const suggestionSnapshot = allSuggestions.find((s) => s.suggestionId === suggestionId);
    if (!suggestionSnapshot) {
      return Response.json({ error: "Suggestion snapshot not found" }, { status: 404 });
    }

    // Apply body edit to entity file
    const repoRoot = process.env.SPACEDOCK_REPO_ROOT ?? process.cwd();
    const entityFilePath = join(repoRoot, "docs", "build-pipeline", `${slug}.md`);
    try {
      applySuggestion(entityFilePath, suggestionSnapshot.diffFrom, suggestionSnapshot.diffTo);
    } catch (err: unknown) {
      return Response.json(
        { error: "Conflict: diff_from text no longer exists in entity body" },
        { status: 409 },
      );
    }

    // Append CQRS events
    const seqStart = await countSuggestionEvents(db, entityPath);
    await appendSuggestionEvents(db, entityPath, events, seqStart);

    // Update snapshot status
    await updateSuggestionStatus(db, suggestionId, "accepted");

    // SSE notification
    const { events: eventsTable } = await import("../../../../../../../../src/schema");
    const diffToPreview = suggestionSnapshot.diffTo.slice(0, 30);
    await db.insert(eventsTable).values({
      type: "suggestion_accepted",
      entity: slug,
      stage: "comments",
      agent: cmd.author,
      timestamp: now,
      detail: `Suggestion accepted: ${diffToPreview}...`,
      workflowDir: "",
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[suggestion accept POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
