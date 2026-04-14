// spacebridge/ui/app/api/entities/[slug]/comments/[id]/reply/route.ts
// ABOUTME: POST /api/entities/[slug]/comments/[id]/reply — adds a reply to an existing comment.
// Uses fmodel CQRS: load state via replay, decide(reply_to_comment), append events, upsert snapshot.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id: parentCommentId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { parseCommand } = await import(
      "../../../../../../../../src/domain/comment/schemas"
    );

    let cmd: ReturnType<typeof parseCommand>;
    try {
      cmd = parseCommand({
        type: "reply_to_comment",
        commentId: randomUUID(),
        parentCommentId,
        entityPath: `/docs/build-pipeline/${slug}.md`,
        selectedText: (body as Record<string, unknown>).selectedText ?? "",
        sectionHeading: (body as Record<string, unknown>).sectionHeading ?? "",
        content: (body as Record<string, unknown>).content,
        author: (body as Record<string, unknown>).author ?? "captain",
      });
    } catch (err) {
      return Response.json({ error: "Invalid request body", details: String(err) }, { status: 400 });
    }

    if (cmd.type !== "reply_to_comment") {
      return Response.json({ error: "Invalid command type" }, { status: 400 });
    }

    const { createDb } = await import("../../../../../../../../src/db");
    const { appendEvents, loadEvents, upsertSnapshot, countEvents } = await import(
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
      events = decide(cmd, state, now);
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "ParentCommentNotFound") {
        return Response.json({ error: "Parent comment not found" }, { status: 404 });
      }
      if (name === "CommentAlreadyResolved") {
        return Response.json({ error: "Cannot reply to a resolved comment" }, { status: 409 });
      }
      throw err;
    }

    const seqStart = await countEvents(db, entityPath);
    await appendEvents(db, entityPath, events, seqStart);

    for (const evt of events) {
      if (evt.type === "reply_added") {
        await upsertSnapshot(db, {
          commentId: evt.commentId,
          entityPath: evt.entityPath,
          selectedText: evt.selectedText,
          sectionHeading: evt.sectionHeading,
          content: evt.content,
          author: evt.author,
          parentId: evt.parentCommentId,
          createdAt: evt.createdAt,
          resolved: false,
          resolvedReason: null,
          workflowDir: "",
        });
      }
    }

    // Write notification to events table for SSE
    const { events: eventsTable } = await import("../../../../../../../../src/schema");
    await db.insert(eventsTable).values({
      type: "reply_added",
      entity: slug,
      stage: "comments",
      agent: cmd.author,
      timestamp: now,
      detail: `Reply to comment by ${cmd.author}`,
      workflowDir: "",
    });

    return Response.json({ commentId: cmd.commentId, ok: true }, { status: 201 });
  } catch (err) {
    console.error("[reply POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
