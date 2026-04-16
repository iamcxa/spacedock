"use client";
// comment-panel: Client Component — right-side comment panel for entity detail two-column layout.
// Shows all comments grouped by section with independent ScrollArea scrolling.
// Each comment card has id="comment-{commentId}" for scroll-to-comment from highlights.

import { useState } from "react";
import { AddCommentForm } from "@/components/add-comment-form";
import { CommentThread } from "@/components/comment-thread";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface SuggestionRow {
  suggestionId: string;
  commentId: string;
  diffFrom: string;
  diffTo: string;
  status: string;
  author: string;
  createdAt: number;
}

interface CommentPanelProps {
  commentsBySection: Record<string, CommentRow[]>;
  repliesByParent: Record<string, CommentRow[]>;
  sectionHeadings: string[];
  entitySlug: string;
  onCommentAdded: (comment: CommentRow) => void;
  onScrollToHighlight?: (commentId: string) => void;
  suggestionsByComment?: Record<string, SuggestionRow[]>;
}

export function CommentPanel({
  commentsBySection: initialCommentsBySection,
  repliesByParent,
  sectionHeadings,
  entitySlug,
  onCommentAdded,
  onScrollToHighlight,
  suggestionsByComment = {},
}: CommentPanelProps) {
  const [commentsBySection, setCommentsBySection] = useState(initialCommentsBySection);

  function handleCommentAdded(newComment: CommentRow) {
    const section = newComment.sectionHeading;
    setCommentsBySection((prev) => ({
      ...prev,
      [section]: [...(prev[section] ?? []), newComment],
    }));
    onCommentAdded(newComment);
  }

  const totalCount = Object.values(commentsBySection).reduce((sum, arr) => sum + arr.length, 0);

  // General (document-level) comments use empty-string key
  const generalComments = commentsBySection[""] ?? [];

  // Section headings for the AddCommentForm: empty string (General) + body sections
  const formHeadings = ["", ...sectionHeadings];

  return (
    <div className="sticky top-8">
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="pr-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Comments</h2>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {totalCount}
              </Badge>
            )}
          </div>

          {/* General (document-level) comments */}
          {generalComments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                General
              </p>
              {generalComments.map((comment) => (
                <div key={comment.commentId} id={`comment-${comment.commentId}`}>
                  {comment.selectedText && onScrollToHighlight && (
                    <button
                      type="button"
                      onClick={() => onScrollToHighlight(comment.commentId)}
                      className="mb-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      title="Scroll to highlight"
                    >
                      <span>&#8593;</span> View in text
                    </button>
                  )}
                  <CommentThread
                    comment={comment}
                    replies={repliesByParent[comment.commentId] ?? []}
                    entitySlug={entitySlug}
                    suggestions={suggestionsByComment[comment.commentId] ?? []}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Per-section comments */}
          {sectionHeadings.map((heading) => {
            const sectionComments = commentsBySection[heading] ?? [];
            if (sectionComments.length === 0) return null;
            return (
              <div key={heading} className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide truncate">
                  {heading}
                </p>
                {sectionComments.map((comment) => (
                  <div key={comment.commentId} id={`comment-${comment.commentId}`}>
                    {comment.selectedText && onScrollToHighlight && (
                      <button
                        type="button"
                        onClick={() => onScrollToHighlight(comment.commentId)}
                        className="mb-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        title="Scroll to highlight"
                      >
                        <span>&#8593;</span> View in text
                      </button>
                    )}
                    <CommentThread
                      comment={comment}
                      replies={repliesByParent[comment.commentId] ?? []}
                      entitySlug={entitySlug}
                      suggestions={suggestionsByComment[comment.commentId] ?? []}
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {/* Add comment form */}
          <AddCommentForm
            entitySlug={entitySlug}
            sectionHeadings={formHeadings}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
