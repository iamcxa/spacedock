// spacebridge/ui/app/entity/[slug]/page.tsx
// ABOUTME: Server Component for entity detail page. Reads entity markdown from filesystem,
// queries events + comments from DB, renders header/timeline/body/comments.
// Dynamic route: /entity/[slug] — slug maps to docs/build-pipeline/<slug>.md

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EntityDetailClient } from "@/components/entity-detail-client";
import { EntityHeader } from "@/components/entity-header";
import { StageTimeline } from "@/components/stage-timeline";
import { parseEntity } from "@/lib/entity-parse";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/;

export default async function EntityDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (!SLUG_RE.test(slug)) {
    notFound();
  }

  // Resolve entity file path from connected session's projectRoot
  let entityText: string | null = null;
  let projectRoot: string | null = null;
  let stageTransitions: Array<{
    id: number;
    stage: string;
    agent: string;
    timestamp: number;
    detail: string | null;
  }> = [];
  let commentRows: Array<{
    commentId: string;
    selectedText: string;
    sectionHeading: string;
    content: string;
    author: string;
    parentId: string | null;
    createdAt: number;
    resolved: number;
    resolvedReason: string | null;
  }> = [];

  try {
    const { openReadOnlyDb } = await import("@/lib/db");
    const handle = openReadOnlyDb();
    const { sessions, events, comments } = await import("@/lib/schema");

    // Get first connected session's projectRoot
    const sessionRows = handle.db
      .select({ projectRoot: sessions.projectRoot })
      .from(sessions)
      .limit(1)
      .all();

    if (sessionRows.length > 0) {
      projectRoot = sessionRows[0].projectRoot;
    }

    // Query stage transition events for this entity
    if (projectRoot) {
      const entityPath = join(projectRoot, "docs", "build-pipeline", `${slug}.md`);
      stageTransitions = handle.db
        .select({
          id: events.id,
          stage: events.stage,
          agent: events.agent,
          timestamp: events.timestamp,
          detail: events.detail,
        })
        .from(events)
        .where(and(eq(events.entity, slug), eq(events.type, "stage_transition")))
        .orderBy(asc(events.timestamp))
        .all();

      // Query comments for this entity
      commentRows = handle.db
        .select({
          commentId: comments.commentId,
          selectedText: comments.selectedText,
          sectionHeading: comments.sectionHeading,
          content: comments.content,
          author: comments.author,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          resolved: comments.resolved,
          resolvedReason: comments.resolvedReason,
        })
        .from(comments)
        .where(eq(comments.entityPath, entityPath))
        .orderBy(asc(comments.createdAt))
        .all();
    }

    handle.close();
  } catch {
    // DB unavailable — show entity if we can find the file
  }

  // Read entity markdown file
  if (projectRoot) {
    const filePath = join(projectRoot, "docs", "build-pipeline", `${slug}.md`);
    try {
      entityText = await readFile(filePath, "utf-8");
    } catch {
      // File not found
    }
  }

  if (!entityText) {
    notFound();
  }

  const { frontmatter, body } = parseEntity(entityText);

  const replies = commentRows.filter((c) => c.parentId);

  // Build sections from body headings (## headings only), normalized (no "## " prefix)
  const sectionHeadings = body
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.trim().replace(/^##\s*/, ""));

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← War Room
        </Link>
      </div>

      <EntityHeader
        title={frontmatter.title ?? slug}
        status={frontmatter.status ?? "unknown"}
        stage={frontmatter.stage ?? ""}
        id={frontmatter.id ?? ""}
        intent={frontmatter.intent ?? ""}
        scale={frontmatter.scale ?? ""}
      />

      {stageTransitions.length > 0 && (
        <div className="mt-6">
          <StageTimeline transitions={stageTransitions} />
        </div>
      )}

      <EntityDetailClient
        body={body}
        sectionHeadings={sectionHeadings}
        commentRows={commentRows}
        repliesByParent={Object.fromEntries(
          replies.reduce((acc, r) => {
            const key = r.parentId!;
            acc.set(key, [...(acc.get(key) ?? []), r]);
            return acc;
          }, new Map<string, typeof replies>()),
        )}
        entitySlug={slug}
      />
    </main>
  );
}
