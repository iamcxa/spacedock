"use client";

// spacebridge/ui/components/suggest-form.tsx
// ABOUTME: Client Component — form to submit an inline edit suggestion for a comment.
// Two textareas (original / replacement), POSTs to suggest route, calls onSubmitted on success.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SuggestFormProps {
  entitySlug: string;
  commentId: string;
  onSubmitted?: () => void;
}

export function SuggestForm({ entitySlug, commentId, onSubmitted }: SuggestFormProps) {
  const [diffFrom, setDiffFrom] = useState("");
  const [diffTo, setDiffTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/entities/${entitySlug}/comments/${commentId}/suggest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diff_from: diffFrom, diff_to: diffTo, author: "captain" }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to submit suggestion.");
      } else {
        setDiffFrom("");
        setDiffTo("");
        onSubmitted?.();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 text-sm">
      <div className="space-y-1">
        <Label htmlFor={`diff-from-${commentId}`} className="text-xs text-muted-foreground">
          Original text (diff_from)
        </Label>
        <Textarea
          id={`diff-from-${commentId}`}
          value={diffFrom}
          onChange={(e) => setDiffFrom(e.target.value)}
          rows={3}
          className="text-xs font-mono resize-y"
          placeholder="Text to replace…"
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`diff-to-${commentId}`} className="text-xs text-muted-foreground">
          Replacement text (diff_to)
        </Label>
        <Textarea
          id={`diff-to-${commentId}`}
          value={diffTo}
          onChange={(e) => setDiffTo(e.target.value)}
          rows={3}
          className="text-xs font-mono resize-y"
          placeholder="Replacement text…"
          required
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" className="text-xs h-7 px-3" disabled={loading}>
        {loading ? "Submitting…" : "Submit suggestion"}
      </Button>
    </form>
  );
}
