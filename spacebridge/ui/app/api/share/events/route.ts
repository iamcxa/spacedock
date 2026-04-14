// ABOUTME: SSE endpoint for share view — entity-scoped events feed.
// Bearer token validation: reads x-share-token header (injected by middleware),
// verifies token in DB, extracts entity_slug scope. Returns 401 on invalid/expired.
// Polls events table at 500ms filtered by WHERE entity = entitySlug (A-7).
// Same ReadableStream pattern as /api/events but entity-filtered.

import { gt, eq, and, asc } from "drizzle-orm";
import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

export async function GET(req: Request) {
  // Token extracted from ?token= query param by middleware and injected as header
  const token = new Headers(req.headers).get("x-share-token") ??
    new URL(req.url).searchParams.get("token");

  if (!token) {
    return Response.json({ error: "Missing share token" }, { status: 401 });
  }

  // Validate token and get entity scope
  let entitySlug: string;
  try {
    const { createDb } = await import("../../../../../../src/db");
    const { shareTokens } = await import("../../../../../../src/schema");
    const db = createDb(defaultDbPath());
    const rows = db.select().from(shareTokens).where(eq(shareTokens.token, token)).all();
    if (rows.length === 0 || rows[0].expiresAt <= Date.now()) {
      return Response.json({ error: "Invalid or expired share token" }, { status: 401 });
    }
    entitySlug = rows[0].entitySlug;
  } catch {
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { openReadOnlyDb } = await import("@/lib/db");
  const { events } = await import("@/lib/schema");
  const handle = openReadOnlyDb();
  const encoder = new TextEncoder();

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  const parsed = parseInt(sinceParam ?? "0", 10);
  let lastSeenId = isNaN(parsed) ? 0 : parsed;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": ping\n\n"));

      function poll() {
        try {
          // Entity-scoped filter (A-7): WHERE entity = entitySlug AND id > lastSeenId
          const rows = handle.db
            .select()
            .from(events)
            .where(and(eq(events.entity, entitySlug), gt(events.id, lastSeenId)))
            .orderBy(asc(events.id))
            .limit(100)
            .all();

          for (const row of rows) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(row)}\n\n`));
            if (row.id > lastSeenId) lastSeenId = row.id;
          }
        } catch { /* DB read error — skip poll cycle */ }
      }

      poll();
      const interval = setInterval(poll, 500);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        handle.close();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
