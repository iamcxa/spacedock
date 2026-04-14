// spacebridge/ui/app/api/entities/[slug]/auto-resolve/route.ts
// ABOUTME: POST /api/entities/[slug]/auto-resolve — triggers auto-resolve for a previous stage.
// Called when an entity advances past a stage. Body: { previousStage: string }.
// Delegates to triggerAutoResolve() utility in spacebridge/src/domain/comment/auto-resolve.ts.

import { homedir } from "node:os";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

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

  const previousStage = (body as Record<string, unknown>).previousStage;
  if (!previousStage || typeof previousStage !== "string") {
    return Response.json({ error: "previousStage is required" }, { status: 400 });
  }

  try {
    const { createDb } = await import("../../../../../../src/db");
    const { triggerAutoResolve } = await import(
      "../../../../../../src/domain/comment/auto-resolve"
    );

    const db = createDb(defaultDbPath());
    const entityPath = `/docs/build-pipeline/${slug}.md`;

    // Pass stage name directly — triggerAutoResolve uses substring match against sectionHeading
    const result = await triggerAutoResolve(db, entityPath, previousStage);

    return Response.json({ ok: true, resolvedCount: result.resolvedCount });
  } catch (err) {
    console.error("[auto-resolve POST]", err);
    return Response.json({ error: "Internal server error", details: String(err) }, { status: 500 });
  }
}
