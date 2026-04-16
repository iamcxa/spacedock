// spacebridge/ui/app/api/entities/[slug]/comments/[id]/suggest/route.ts
// ABOUTME: POST /api/entities/[slug]/comments/[id]/suggest — adds a suggestion to a comment.
// Uses fmodel CQRS: load both comment state and suggestion state, decideSuggestion,
// appendSuggestionEvents, upsertSuggestionSnapshot, write SSE notification, return 201.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: commentId } = await params;

  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { parseSuggestionCommand } = await import(
      "../../../../../../../../src/domain/comment/suggestion-schemas"
    );

    const suggestionId = randomUUID();
    let cmd: ReturnType<typeof parseSuggestionCommand>;
    try {
      cmd = parseSuggestionCommand({
        type: "add_suggestion",
        suggestionId,
        commentId,
        diff_from: (body as Record<string, unknown>).diff_from,
        diff_to: (body as Record<string, unknown>).diff_to,
        author: (body as Record<string, unknown>).author ?? "captain",
      });
    } catch (err) {
      return Response.json(
        { error: "Invalid request body", details: String(err) },
        { status: 400 },
      );
    }

    if (cmd.type !== "add_suggestion") {
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
      upsertSuggestionSnapshot,
      loadSuggestionEvents,
    } = await import("../../../../../../../../src/domain/comment/suggestion-persistence");
    const { decideSuggestion } = await import(
      "../../../../../../../../src/domain/comment/suggestion-decider"
    );

    const db = createDb(defaultDbPath());
    const entityPath = `/docs/build-pipeline/${slug}.md`;

    // Load comment state via replay
    const existingCommentEvents = await loadEvents(db, entityPath);
    const commentState = replay(existingCommentEvents);

    // Load suggestion state via replay
    const existingSuggestionEvents = await loadSuggestionEvents(db, entityPath);
    const { replaySuggestions } = await import(
      "../../../../../../../../src/domain/comment/suggestion-evolve"
    );
    const suggestionState = replaySuggestions(existingSuggestionEvents);

    const now = Date.now();
    let events: Awaited<ReturnType<typeof decideSuggestion>>;
    try {
      events = decideSuggestion(cmd, suggestionState, commentState, now);
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "CommentNotFoundForSuggestion") {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }
      throw err;
    }

    // seqStart counts ALL comment_events for the aggregate (seq safety)
    const seqStart = await countSuggestionEvents(db, entityPath);
    await appendSuggestionEvents(db, entityPath, events, seqStart);

    // Upsert snapshot for suggestion_added event
    for (const evt of events) {
      if (evt.type === "suggestion_added") {
        await upsertSuggestionSnapshot(db, {
          suggestionId: evt.suggestionId,
          commentId: evt.commentId,
          diffFrom: evt.diff_from,
          diffTo: evt.diff_to,
          status: "pending",
          author: evt.author,
          createdAt: evt.createdAt,
          workflowDir: "",
        });
      }
    }

    // SSE notification
    const { events: eventsTable } = await import("../../../../../../../../src/schema");
    const diffFromPreview = cmd.diff_from.slice(0, 30);
    await db.insert(eventsTable).values({
      type: "suggestion_added",
      entity: slug,
      stage: "comments",
      agent: cmd.author,
      timestamp: now,
      detail: `Suggestion on [section]: ${diffFromPreview}...`,
      workflowDir: "",
    });

    return Response.json({ suggestionId: cmd.suggestionId, ok: true }, { status: 201 });
  } catch (err) {
    console.error("[suggest POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
