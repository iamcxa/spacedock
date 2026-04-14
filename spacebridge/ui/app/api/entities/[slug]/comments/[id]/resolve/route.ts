// spacebridge/ui/app/api/entities/[slug]/comments/[id]/resolve/route.ts
// ABOUTME: POST /api/entities/[slug]/comments/[id]/resolve — manually resolves a comment.
// Uses fmodel CQRS: load state via replay, decide(resolve_comment), append events, mark snapshot.

import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: commentId } = await params;

  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const { createDb } = await import("../../../../../../../../src/db");
    const { appendEvents, loadEvents, markResolved, countEvents } = await import(
      "../../../../../../../../src/domain/comment/persistence"
    );
    const { decide } = await import(
      "../../../../../../../../src/domain/comment/decider"
    );
    const { replay } = await import(
      "../../../../../../../../src/domain/comment/evolve"
    );

    const db = createDb(defaultDbPath());
    const entityPath = `/docs/build-pipeline/${slug}.md`;

    const existingEvents = await loadEvents(db, entityPath);
    const state = replay(existingEvents);

    const now = Date.now();
    let events;
    try {
      events = decide({ type: "resolve_comment", commentId }, state, now);
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "CommentNotFound") {
        return Response.json({ error: "Comment not found" }, { status: 404 });
      }
      if (name === "CommentAlreadyResolved") {
        return Response.json({ error: "Comment already resolved" }, { status: 409 });
      }
      throw err;
    }

    const seqStart = await countEvents(db, entityPath);
    await appendEvents(db, entityPath, events, seqStart);
    await markResolved(db, commentId, "manual");

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[resolve POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
