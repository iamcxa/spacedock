// spacebridge/ui/app/api/entities/[slug]/comments/route.ts
// ABOUTME: GET list + POST add for entity comments. Uses fmodel CQRS decider.
// GET returns comments grouped by sectionHeading with replies nested.
// POST: parse Zod schema, load state via replay, decide, append events, upsert snapshot,
//       write notification event to events table for SSE feed, return 201.

import { asc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!SLUG_RE.test(slug)) {
    return Response.json({ error: "Invalid slug" }, { status: 400 });
  }

  try {
    const { openReadOnlyDb } = await import("@/lib/db");
    const { comments } = await import("@/lib/schema");

    const handle = openReadOnlyDb();
    // entityPath convention: slug → /docs/build-pipeline/<slug>.md
    // We filter by entityPath suffix matching slug
    const rows = handle.db
      .select()
      .from(comments)
      .orderBy(asc(comments.createdAt))
      .all()
      .filter((r) => r.entityPath.endsWith(`/${slug}.md`) || r.entityPath.endsWith(`\\${slug}.md`));

    handle.close();

    // Group: top-level + nest replies
    const topLevel = rows.filter((r) => !r.parentId);
    const replyMap = new Map<string, typeof rows>();
    for (const r of rows.filter((r) => r.parentId)) {
      const key = r.parentId!;
      replyMap.set(key, [...(replyMap.get(key) ?? []), r]);
    }

    // Group by sectionHeading
    const bySection = new Map<string, Array<typeof rows[0] & { replies: typeof rows }>>();
    for (const c of topLevel) {
      const withReplies = { ...c, replies: replyMap.get(c.commentId) ?? [] };
      const section = c.sectionHeading;
      bySection.set(section, [...(bySection.get(section) ?? []), withReplies]);
    }

    return Response.json(Object.fromEntries(bySection));
  } catch (err) {
    console.error("[comments GET]", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

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
    const { parseCommand } = await import(
      "../../../../../../src/domain/comment/schemas"
    );

    // Validate input
    let cmd: ReturnType<typeof parseCommand>;
    try {
      cmd = parseCommand({
        type: "add_comment",
        commentId: randomUUID(),
        entityPath: `/docs/build-pipeline/${slug}.md`,
        selectedText: (body as Record<string, unknown>).selectedText ?? "",
        sectionHeading: (body as Record<string, unknown>).sectionHeading,
        content: (body as Record<string, unknown>).content,
        author: (body as Record<string, unknown>).author ?? "captain",
      });
    } catch (err) {
      return Response.json({ error: "Invalid request body", details: String(err) }, { status: 400 });
    }

    if (cmd.type !== "add_comment") {
      return Response.json({ error: "Invalid command type" }, { status: 400 });
    }

    const { createDb } = await import(
      "../../../../../../src/db"
    );
    const { appendEvents, loadEvents, upsertSnapshot, countEvents } = await import(
      "../../../../../../src/domain/comment/persistence"
    );
    const { decide } = await import(
      "../../../../../../src/domain/comment/decider"
    );
    const { replay } = await import(
      "../../../../../../src/domain/comment/evolve"
    );

    const db = createDb(defaultDbPath());
    const entityPath = `/docs/build-pipeline/${slug}.md`;

    // Load current state via replay
    const existingEvents = await loadEvents(db, entityPath);
    const state = replay(existingEvents);

    // Decide
    const now = Date.now();
    const events = decide(cmd, state, now);

    // Append CQRS events
    const seqStart = await countEvents(db, entityPath);
    await appendEvents(db, entityPath, events, seqStart);

    // Upsert snapshot
    for (const evt of events) {
      if (evt.type === "comment_added") {
        await upsertSnapshot(db, {
          commentId: evt.commentId,
          entityPath: evt.entityPath,
          selectedText: evt.selectedText,
          sectionHeading: evt.sectionHeading,
          content: evt.content,
          author: evt.author,
          parentId: null,
          createdAt: evt.createdAt,
          resolved: false,
          resolvedReason: null,
          workflowDir: "",
        });
      }
    }

    // Write notification event to events table for SSE feed
    const { events: eventsTable } = await import(
      "../../../../../../src/schema"
    );
    await db.insert(eventsTable).values({
      type: "comment_added",
      entity: slug,
      stage: "comments",
      agent: cmd.author,
      timestamp: now,
      detail: `New comment on ${cmd.sectionHeading} by ${cmd.author}`,
      workflowDir: "",
    });

    return Response.json(
      { commentId: cmd.commentId, ok: true },
      { status: 201 },
    );
  } catch (err) {
    console.error("[comments POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
