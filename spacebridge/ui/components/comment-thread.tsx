"use client";

// spacebridge/ui/components/comment-thread.tsx
// ABOUTME: Client Component — renders a top-level comment Card with nested replies.
// Uses Collapsible for reply expansion. Single-level threading (O-1).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Comment } from "@/components/comment";
import { ReplyForm } from "@/components/reply-form";
import { SuggestionDiff } from "@/components/suggestion-diff";
import { SuggestForm } from "@/components/suggest-form";
import { Button } from "@/components/ui/button";

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

interface CommentThreadProps {
  comment: CommentRow;
  replies: CommentRow[];
  entitySlug: string;
  suggestions?: SuggestionRow[];
}

export function CommentThread({ comment, replies, entitySlug, suggestions = [] }: CommentThreadProps) {
  const router = useRouter();
  const [showReply, setShowReply] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [localResolved, setLocalResolved] = useState(comment.resolved === 1);

  function handleResolved() {
    setLocalResolved(true);
  }

  function handleReplySubmitted() {
    setShowReply(false);
    router.refresh();
  }

  function handleSuggestionSubmitted() {
    setShowSuggest(false);
    router.refresh();
  }

  const threadSuggestions = suggestions.filter((s) => s.commentId === comment.commentId);

  return (
    <div className="space-y-1">
      <Comment
        commentId={comment.commentId}
        selectedText={comment.selectedText || undefined}
        content={comment.content}
        author={comment.author}
        createdAt={comment.createdAt}
        resolved={localResolved}
        resolvedReason={comment.resolvedReason}
        entitySlug={entitySlug}
        onResolved={handleResolved}
      />

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 space-y-1">
          {replies.map((reply) => (
            <Comment
              key={reply.commentId}
              commentId={reply.commentId}
              content={reply.content}
              author={reply.author}
              createdAt={reply.createdAt}
              resolved={reply.resolved === 1}
              resolvedReason={reply.resolvedReason}
              entitySlug={entitySlug}
            />
          ))}
        </div>
      )}

      {/* Suggestions */}
      {threadSuggestions.length > 0 && (
        <div className="ml-8 space-y-2">
          {threadSuggestions.map((s) => (
            <SuggestionDiff
              key={s.suggestionId}
              suggestionId={s.suggestionId}
              diffFrom={s.diffFrom}
              diffTo={s.diffTo}
              status={s.status as "pending" | "accepted" | "rejected"}
              author={s.author}
              entitySlug={entitySlug}
              onAccepted={() => router.refresh()}
              onRejected={() => router.refresh()}
            />
          ))}
        </div>
      )}

      {/* Reply / Suggest edit actions */}
      {!localResolved && (
        <div className="ml-8 space-y-1">
          {showReply ? (
            <ReplyForm
              entitySlug={entitySlug}
              parentCommentId={comment.commentId}
              onSubmitted={handleReplySubmitted}
            />
          ) : showSuggest ? (
            <SuggestForm
              entitySlug={entitySlug}
              commentId={comment.commentId}
              onSubmitted={handleSuggestionSubmitted}
            />
          ) : (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={() => setShowReply(true)}
              >
                Reply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6 px-2"
                onClick={() => setShowSuggest(true)}
              >
                Suggest edit
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
