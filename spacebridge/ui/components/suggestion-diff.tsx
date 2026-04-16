"use client";

// spacebridge/ui/components/suggestion-diff.tsx
// ABOUTME: Client Component — renders a line-by-line diff card (before/after) for an inline edit suggestion.
// Shows red-tinted before block, green-tinted after block, status badge, and Accept/Reject buttons for pending suggestions.

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SuggestionDiffProps {
  suggestionId: string;
  diffFrom: string;
  diffTo: string;
  status: "pending" | "accepted" | "rejected";
  author: string;
  entitySlug: string;
  onAccepted?: () => void;
  onRejected?: () => void;
}

export function SuggestionDiff({
  suggestionId,
  diffFrom,
  diffTo,
  status: initialStatus,
  author,
  entitySlug,
  onAccepted,
  onRejected,
}: SuggestionDiffProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading("accept");
    setError(null);
    try {
      const res = await fetch(
        `/api/entities/${entitySlug}/suggestions/${suggestionId}/accept`,
        { method: "POST" }
      );
      if (res.status === 409) {
        setError("Conflict: the original text has already changed.");
      } else if (!res.ok) {
        setError("Failed to accept suggestion.");
      } else {
        setStatus("accepted");
        onAccepted?.();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setError(null);
    try {
      const res = await fetch(
        `/api/entities/${entitySlug}/suggestions/${suggestionId}/reject`,
        { method: "POST" }
      );
      if (!res.ok) {
        setError("Failed to reject suggestion.");
      } else {
        setStatus("rejected");
        onRejected?.();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(null);
    }
  }

  const statusBadge =
    status === "pending" ? (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300">
        Pending
      </Badge>
    ) : status === "accepted" ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-300">
        Accepted
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300">
        Rejected
      </Badge>
    );

  return (
    <div className="rounded-md border bg-card p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Suggested by {author}</span>
        {statusBadge}
      </div>

      {/* Before block */}
      <pre className="whitespace-pre-wrap font-mono text-xs rounded p-2 bg-red-50 dark:bg-red-950/30 border-l-2 border-red-400 overflow-x-auto">
        {diffFrom}
      </pre>

      {/* After block */}
      <pre className="whitespace-pre-wrap font-mono text-xs rounded p-2 bg-green-50 dark:bg-green-950/30 border-l-2 border-green-400 overflow-x-auto">
        {diffTo}
      </pre>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {status === "pending" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-3 border-green-400 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
            disabled={loading !== null}
            onClick={handleAccept}
          >
            {loading === "accept" ? "Accepting…" : "Accept"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-3 border-red-400 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            disabled={loading !== null}
            onClick={handleReject}
          >
            {loading === "reject" ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      )}
    </div>
  );
}
