"use client";

// spacebridge/ui/components/comment-thread.tsx
// ABOUTME: Client Component — renders a top-level comment Card with nested replies.
// Uses Collapsible for reply expansion. Single-level threading (O-1).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Comment } from "@/components/comment";
import { ReplyForm } from "@/components/reply-form";
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

interface CommentThreadProps {
  comment: CommentRow;
  replies: CommentRow[];
  entitySlug: string;
}

export function CommentThread({ comment, replies, entitySlug }: CommentThreadProps) {
  const router = useRouter();
  const [showReply, setShowReply] = useState(false);
  const [localResolved, setLocalResolved] = useState(comment.resolved === 1);

  function handleResolved() {
    setLocalResolved(true);
  }

  function handleReplySubmitted() {
    setShowReply(false);
    router.refresh();
  }

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

      {/* Reply action */}
      {!localResolved && (
        <div className="ml-8">
          {showReply ? (
            <ReplyForm
              entitySlug={entitySlug}
              parentCommentId={comment.commentId}
              onSubmitted={handleReplySubmitted}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-6 px-2"
              onClick={() => setShowReply(true)}
            >
              Reply
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
