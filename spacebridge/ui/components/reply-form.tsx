"use client";
// spacebridge/ui/components/reply-form.tsx
// ABOUTME: Client Component — Textarea + Button for submitting a reply to a comment.
// POSTs to /api/entities/[slug]/comments/[id]/reply.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ReplyFormProps {
  entitySlug: string;
  parentCommentId: string;
  onSubmitted?: () => void;
}

export function ReplyForm({ entitySlug, parentCommentId, onSubmitted }: ReplyFormProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/entities/${entitySlug}/comments/${parentCommentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          author: "captain",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to submit reply");
      } else {
        setContent("");
        onSubmitted?.();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply..."
        rows={2}
        className="text-sm resize-none"
        disabled={submitting}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
          {submitting ? "Sending..." : "Reply"}
        </Button>
      </div>
    </form>
  );
}
