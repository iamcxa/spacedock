"use client";
// spacebridge/ui/components/entity-body.tsx
// ABOUTME: Client Component — renders markdown body with react-markdown,
// injects comment threads per section heading with optimistic update support.
// Supports 3-mode comment UX: document-level, section-level, text-selection popover.
// Manages local comment state; background router.refresh() keeps RSC in sync.

import { useRef } from "react";
import ReactMarkdown from "react-markdown";
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
  allComments: CommentRow[];
  entitySlug: string;
  onCommentAdded: (comment: CommentRow) => void;
}

export function EntityBody({
  body,
  sectionHeadings,
  allComments,
  entitySlug,
  onCommentAdded,
}: EntityBodyProps) {
  const articleRef = useRef<HTMLElement>(null);

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        Entity Content
      </h2>

      {/* Relative container so popover can be absolutely positioned */}
      <div className="relative">
        <article ref={articleRef} className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <ReactMarkdown
            components={{
              h2: ({ node, children, ...props }) => {
                const headingText = typeof children === "string" ? children : String(children);
                return (
                  <h2 {...props} className="text-lg font-semibold mt-6 mb-2 scroll-mt-16" id={headingText}>
                    {children}
                  </h2>
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
          onCommentAdded={onCommentAdded}
        />
      </div>
    </div>
  );
}
