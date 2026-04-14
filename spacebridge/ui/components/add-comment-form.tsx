"use client";
// spacebridge/ui/components/add-comment-form.tsx
// ABOUTME: Client Component — section dropdown + Textarea + Button for adding a top-level comment.
// POSTs to /api/entities/[slug]/comments. Calls onCommentAdded on success for optimistic update.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

interface AddCommentFormProps {
  entitySlug: string;
  sectionHeadings: string[];
  onCommentAdded?: (comment: CommentRow) => void;
}

export function AddCommentForm({
  entitySlug,
  sectionHeadings,
  onCommentAdded,
}: AddCommentFormProps) {
  const [section, setSection] = useState(sectionHeadings[0] ?? "");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);

    const trimmedContent = content.trim();
    const now = Date.now();

    try {
      const res = await fetch(`/api/entities/${entitySlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionHeading: section,
          content: trimmedContent,
          selectedText: "",
          author: "captain",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to submit comment");
      } else {
        const data = await res.json().catch(() => ({}));
        setContent("");
        onCommentAdded?.({
          commentId: (data as { commentId?: string }).commentId ?? crypto.randomUUID(),
          selectedText: "",
          sectionHeading: section,
          content: trimmedContent,
          author: "captain",
          parentId: null,
          createdAt: now,
          resolved: 0,
          resolvedReason: null,
        });
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (sectionHeadings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Add Comment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Section</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              disabled={submitting}
            >
              {sectionHeadings.map((h) => (
                <option key={h === "" ? "__general__" : h} value={h}>
                  {h === "" ? "General (document)" : h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Comment</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment on this entity..."
              rows={3}
              className="resize-none"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
