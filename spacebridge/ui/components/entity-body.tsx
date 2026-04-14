"use client";

// spacebridge/ui/components/entity-body.tsx
// ABOUTME: Client Component — renders markdown body with react-markdown,
// injects comment threads per section heading with optimistic update support.
// Supports 3-mode comment UX: document-level, section-level, text-selection popover.
// Manages local comment state; background router.refresh() keeps RSC in sync.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AddCommentForm } from "@/components/add-comment-form";
import { CommentThread } from "@/components/comment-thread";
import { TextSelectionPopover } from "@/components/text-selection-popover";

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

// GENERAL_KEY is the empty-string key used for document-level comments
const GENERAL_KEY = "";

export function EntityBody({
  body,
  sectionHeadings,
  commentsBySection: initialCommentsBySection,
  repliesByParent,
  entitySlug,
}: EntityBodyProps) {
  const router = useRouter();
  const [commentsBySection, setCommentsBySection] = useState(initialCommentsBySection);
  const articleRef = useRef<HTMLElement>(null);

  function handleCommentAdded(newComment: CommentRow) {
    const section = newComment.sectionHeading;
    setCommentsBySection((prev) => ({
      ...prev,
      [section]: [...(prev[section] ?? []), newComment],
    }));
    router.refresh();
  }

  // Section headings for the form: "General" (document-level) + actual sections
  const formHeadings = [GENERAL_KEY, ...sectionHeadings];

  const documentLevelComments = commentsBySection[GENERAL_KEY] ?? [];

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        Entity Content
      </h2>

      {/* Document-level comments displayed above body */}
      {documentLevelComments.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Document Comments
          </p>
          {documentLevelComments.map((comment) => (
            <CommentThread
              key={comment.commentId}
              comment={comment}
              replies={repliesByParent[comment.commentId] ?? []}
              entitySlug={entitySlug}
            />
          ))}
        </div>
      )}

      {/* Relative container so popover can be absolutely positioned */}
      <div className="relative">
        <article ref={articleRef} className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <ReactMarkdown
            components={{
              h2: ({ node, children, ...props }) => {
                const headingText = typeof children === "string" ? children : String(children);
                const commentsForSection = commentsBySection[headingText] ?? [];
                return (
                  <div>
                    <h2
                      {...props}
                      className="text-lg font-semibold mt-6 mb-2 scroll-mt-16"
                      id={headingText}
                    >
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

        <TextSelectionPopover
          entitySlug={entitySlug}
          containerRef={articleRef}
          onCommentAdded={handleCommentAdded}
        />
      </div>

      <div className="mt-8">
        <AddCommentForm
          entitySlug={entitySlug}
          sectionHeadings={formHeadings}
          onCommentAdded={handleCommentAdded}
        />
      </div>
    </div>
  );
}
