import { events } from "@/lib/schema";
import { gt, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  let lastSeenId = sinceParam ? parseInt(sinceParam, 10) : 0;

  // Lazily import openReadOnlyDb so Next.js build workers (Node.js) don't
  // fail on bun:sqlite when this module is statically analyzed at build time.
  const { openReadOnlyDb } = await import("@/lib/db");
  const db = openReadOnlyDb();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": ping\n\n"));

      function poll() {
        try {
          const rows = db
            .select()
            .from(events)
            .where(gt(events.id, lastSeenId))
            .orderBy(asc(events.id))
            .limit(100)
            .all();

          for (const row of rows) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(row)}\n\n`));
            if (row.id > lastSeenId) lastSeenId = row.id;
          }
        } catch {
          // DB read error — skip this poll cycle
        }
      }

      poll();

      const interval = setInterval(poll, 500);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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
