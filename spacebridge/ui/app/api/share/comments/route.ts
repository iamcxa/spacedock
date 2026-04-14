// ABOUTME: POST handler for share view comments from external collaborators.
// Bearer token validation: reads x-share-token (injected by middleware), verifies DB.
// Author format: guest:{nickname} (A-6). Flat comments only (A-9).
// Reuses existing comment CQRS flow (domain/comment). Defense-in-depth token check.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

export async function POST(req: Request) {
  // Defense-in-depth: validate token again even though middleware already checked
  const token = new Headers(req.headers).get("x-share-token") ??
    new URL(req.url).searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing share token" }, { status: 401 });
  }

  // Validate token and get entity scope
  let entitySlug: string;
  try {
    const { verifyShareToken } = await import("../../../../../src/domain/share/token-verify");
    const slug = verifyShareToken(defaultDbPath(), token);
    if (!slug) {
      return Response.json({ error: "Invalid or expired share token" }, { status: 401 });
    }
    entitySlug = slug;
  } catch {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyObj = body as Record<string, unknown>;
  const nickname = String(bodyObj.nickname ?? "").trim();
  const content = String(bodyObj.content ?? "").trim();
  const sectionHeading = String(bodyObj.sectionHeading ?? "").trim();

  if (!nickname) return Response.json({ error: "nickname is required" }, { status: 400 });
  if (!content) return Response.json({ error: "content is required" }, { status: 400 });

  // Author format: guest:{nickname} (A-6)
  const author = `guest:${nickname}`;

  try {
    const { parseCommand } = await import(
      "../../../../../src/domain/comment/schemas"
    );
    const { createDb } = await import("../../../../../src/db");
    const { appendEvents, loadEvents, upsertSnapshot, countEvents } = await import(
      "../../../../../src/domain/comment/persistence"
    );
    const { decide } = await import("../../../../../src/domain/comment/decider");
    const { replay } = await import("../../../../../src/domain/comment/evolve");

    const db = createDb(defaultDbPath());

    // Resolve entity path (requires active session for projectRoot)
    let entityPath = `/docs/build-pipeline/${entitySlug}.md`;
    try {
      const { sessions } = await import("../../../../../src/schema");
      const sessionRows = db.select({ projectRoot: sessions.projectRoot }).from(sessions).limit(1).all();
      if (sessionRows.length > 0) {
        entityPath = join(sessionRows[0].projectRoot, "docs", "build-pipeline", `${entitySlug}.md`);
      }
    } catch { /* use default path */ }

    const commentId = randomUUID();
    const cmd = parseCommand({
      type: "add_comment",
      commentId,
      entityPath,
      selectedText: "",   // share view has no text selection (A-9)
      sectionHeading: sectionHeading || `Shared comment on ${entitySlug}`,
      content,
      author: "guest",    // parseCommand validates as 'captain'|'fo'|'guest'
    });

    if (cmd.type !== "add_comment") {
      return Response.json({ error: "Invalid command" }, { status: 400 });
    }

    // Override author to guest:{nickname} after schema validation
    const cmdWithNickname = { ...cmd, author: author as "guest" };

    const now = Date.now();
    const existingEvents = await loadEvents(db, entityPath);
    const state = replay(existingEvents);
    const events = decide(cmdWithNickname, state, now);

    const seqStart = await countEvents(db, entityPath);
    await appendEvents(db, entityPath, events, seqStart);

    for (const evt of events) {
      if (evt.type === "comment_added") {
        await upsertSnapshot(db, {
          commentId: evt.commentId,
          entityPath: evt.entityPath,
          selectedText: evt.selectedText,
          sectionHeading: evt.sectionHeading,
          content: evt.content,
          author: "guest",
          parentId: null,
          createdAt: evt.createdAt,
          resolved: false,
          resolvedReason: null,
          workflowDir: "",
        });
      }
    }

    // Write SSE notification event
    const { events: eventsTable } = await import("../../../../../src/schema");
    await db.insert(eventsTable).values({
      type: "comment_added",
      entity: entitySlug,
      stage: "comments",
      agent: author,
      timestamp: now,
      detail: `Guest comment from ${nickname} on ${sectionHeading || entitySlug}`,
      workflowDir: "",
    });

    return Response.json({ commentId, ok: true }, { status: 201 });
  } catch (err) {
    console.error("[share/comments POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
