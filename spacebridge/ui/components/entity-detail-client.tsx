"use client";
// spacebridge/ui/components/entity-detail-client.tsx
// ABOUTME: Client Component boundary for entity detail page. Manages commentsBySection
// state, renders two-column grid layout with EntityBody (left) and CommentPanel (right).

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EntityBody } from "@/components/entity-body";
import { CommentPanel } from "@/components/comment-panel";

interface CommentRow {
  commentId: string;
  selectedText: string;
  sectionHeading: string;
  content: string;
  author: string;
  parentId: string | null;
  createdAt: number;
  resolved: number;
  resolvedReason: string | null;
}

interface EntityDetailClientProps {
  body: string;
  sectionHeadings: string[];
  commentRows: CommentRow[];
  repliesByParent: Record<string, CommentRow[]>;
  entitySlug: string;
}

function buildCommentsBySection(
  rows: CommentRow[]
): Record<string, CommentRow[]> {
  const map: Record<string, CommentRow[]> = {};
  for (const row of rows) {
    if (row.parentId !== null) continue;
    const key = row.sectionHeading;
    map[key] = [...(map[key] ?? []), row];
  }
  return map;
}

export function EntityDetailClient({
  body,
  sectionHeadings,
  commentRows,
  repliesByParent,
  entitySlug,
}: EntityDetailClientProps) {
  const router = useRouter();
  const [commentsBySection, setCommentsBySection] = useState(() =>
    buildCommentsBySection(commentRows)
  );

  const handleCommentAdded = useCallback((newComment: CommentRow) => {
    const key = newComment.sectionHeading;
    setCommentsBySection((prev) => ({
      ...prev,
      [key]: [...(prev[key] ?? []), newComment],
    }));
    router.refresh();
  }, [router]);

  const allHighlightComments = commentRows.filter((c) => c.selectedText !== "");

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-6">
      <div>
        <EntityBody
          body={body}
          sectionHeadings={sectionHeadings}
          allComments={allHighlightComments}
          entitySlug={entitySlug}
          onCommentAdded={handleCommentAdded}
        />
      </div>
      <div>
        <CommentPanel
          commentsBySection={commentsBySection}
          repliesByParent={repliesByParent}
          entitySlug={entitySlug}
          sectionHeadings={sectionHeadings}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );
}
