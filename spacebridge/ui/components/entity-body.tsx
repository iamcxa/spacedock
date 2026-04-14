"use client";
// spacebridge/ui/components/entity-body.tsx
// ABOUTME: Client Component — renders markdown body with react-markdown,
// injects comment threads per section heading with optimistic update support.
// Manages local comment state; background router.refresh() keeps RSC in sync.

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { CommentThread } from "@/components/comment-thread";
import { AddCommentForm } from "@/components/add-comment-form";

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

interface EntityBodyProps {
  body: string;
  sectionHeadings: string[];
  commentsBySection: Record<string, CommentRow[]>;
  repliesByParent: Record<string, CommentRow[]>;
  entitySlug: string;
}

export function EntityBody({
  body,
  sectionHeadings,
  commentsBySection: initialCommentsBySection,
  repliesByParent,
  entitySlug,
}: EntityBodyProps) {
  const router = useRouter();
  const [commentsBySection, setCommentsBySection] = useState(initialCommentsBySection);

  function handleCommentAdded(newComment: CommentRow) {
    const section = newComment.sectionHeading;
    setCommentsBySection((prev) => ({
      ...prev,
      [section]: [...(prev[section] ?? []), newComment],
    }));
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        Entity Content
      </h2>

      <article className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <ReactMarkdown
          components={{
            h2: ({ node, children, ...props }) => {
              const headingText = typeof children === "string" ? children : String(children);
              const commentsForSection = commentsBySection[headingText] ?? [];
              return (
                <div>
                  <h2 {...props} className="text-lg font-semibold mt-6 mb-2 scroll-mt-16" id={headingText}>
                    {children}
                  </h2>
                  {commentsForSection.length > 0 && (
                    <div className="not-prose mb-4 space-y-2">
                      {commentsForSection.map((comment) => (
                        <CommentThread
                          key={comment.commentId}
                          comment={comment}
                          replies={repliesByParent[comment.commentId] ?? []}
                          entitySlug={entitySlug}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </article>

      <div className="mt-8">
        <AddCommentForm
          entitySlug={entitySlug}
          sectionHeadings={sectionHeadings}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );
}
