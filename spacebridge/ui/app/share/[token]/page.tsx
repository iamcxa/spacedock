// ABOUTME: Share view — read-only entity detail for external collaborators.
// Bearer token validated by middleware (x-share-token header injected).
// Token DB validation (expiry + entity scope) happens here before rendering.
// Renders EntityHeader + EntityBody in read-only mode, ShareLiveFeed, ShareCommentForm.
// No navigation bar — external users have no dashboard context (A-13).

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { EntityBody } from "@/components/entity-body";
import { EntityHeader } from "@/components/entity-header";
import { ShareCommentForm } from "@/components/share-comment-form";
import { ShareLiveFeed } from "@/components/share-live-feed";
import { parseEntity } from "@/lib/entity-parse";

export const dynamic = "force-dynamic";

function defaultDbPath(): string {
  return process.env.SPACEBRIDGE_DB_PATH ?? `${homedir()}/.spacedock/spacebridge.db`;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;
  const headersList = await headers();
  const shareToken = headersList.get("x-share-token");

  // If middleware didn't inject the token, something is misconfigured
  if (!shareToken || shareToken !== token) {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-semibold mb-2">Invalid share link</h1>
        <p className="text-muted-foreground">This share link is invalid or has expired.</p>
      </div>
    );
  }

  // Validate token in DB (expiry + entity scope)
  let entitySlug: string;
  try {
    const { verifyShareToken } = await import("../../../../src/domain/share/token-verify");
    const slug = verifyShareToken(defaultDbPath(), token);
    if (!slug) {
      return (
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold mb-2">Share link expired</h1>
          <p className="text-muted-foreground">This share link is no longer valid.</p>
        </div>
      );
    }
    entitySlug = slug;
  } catch {
    return (
      <div className="text-center py-16">
        <h1 className="text-2xl font-semibold mb-2">Service unavailable</h1>
        <p className="text-muted-foreground">Unable to validate share token. Try again shortly.</p>
      </div>
    );
  }

  // Load entity markdown from filesystem
  let entityText: string | null = null;
  let projectRoot: string | null = null;
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
    const { sessions, comments } = await import("@/lib/schema");
    const handle = openReadOnlyDb();

    // Try env var first (reliable when no active CC session), then sessions table
    projectRoot = process.env.SPACEBRIDGE_PROJECT_ROOT ?? null;
    if (!projectRoot) {
      const sessionRows = handle.db
        .select({ projectRoot: sessions.projectRoot })
        .from(sessions)
        .limit(1)
        .all();
      if (sessionRows.length > 0) {
        projectRoot = sessionRows[0].projectRoot;
      }
    }

    if (projectRoot) {
      const entityPath = join(projectRoot, "docs", "build-pipeline", `${entitySlug}.md`);
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
    /* DB unavailable — show entity if we can find the file */
  }

  if (projectRoot) {
    const filePath = join(projectRoot, "docs", "build-pipeline", `${entitySlug}.md`);
    try {
      entityText = await readFile(filePath, "utf-8");
    } catch {
      /* File not found */
    }
  }

  if (!entityText) {
    notFound();
  }

  const { frontmatter, body } = parseEntity(entityText);

  function normalizeHeading(h: string): string {
    return h.replace(/^##\s*/, "").trim();
  }

  const topLevel = commentRows.filter((c) => !c.parentId);
  const replies = commentRows.filter((c) => c.parentId);
  const commentsBySection = new Map<string, typeof topLevel>();
  for (const comment of topLevel) {
    const key = normalizeHeading(comment.sectionHeading);
    commentsBySection.set(key, [...(commentsBySection.get(key) ?? []), comment]);
  }

  const sectionHeadings = body
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.trim().replace(/^##\s*/, ""));

  return (
    <div>
      <div className="mb-2 text-xs text-muted-foreground">Shared view — read only</div>

      <EntityHeader
        title={frontmatter.title ?? entitySlug ?? ""}
        status={frontmatter.status ?? "unknown"}
        stage={frontmatter.stage ?? ""}
        id={frontmatter.id ?? ""}
        intent={frontmatter.intent ?? ""}
        scale={frontmatter.scale ?? ""}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EntityBody
            body={body}
            sectionHeadings={sectionHeadings}
            commentsBySection={Object.fromEntries(commentsBySection)}
            repliesByParent={Object.fromEntries(
              replies.reduce((acc, r) => {
                const key = r.parentId!;
                acc.set(key, [...(acc.get(key) ?? []), r]);
                return acc;
              }, new Map<string, typeof replies>()),
            )}
            entitySlug={entitySlug}
          />
        </div>

        <div className="space-y-4">
          <ShareLiveFeed token={token} entitySlug={entitySlug ?? ""} />
          <ShareCommentForm token={token} entitySlug={entitySlug ?? ""} />
        </div>
      </div>
    </div>
  );
}
