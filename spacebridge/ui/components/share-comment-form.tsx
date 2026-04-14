"use client";

// ABOUTME: ShareCommentForm — nickname + comment form for external collaborators.
// POSTs to /api/share/comments?token=<token>. Author set to guest:{nickname} (A-6).
// Flat comments only — no text selection popover, no threading (A-9).

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ShareCommentFormProps {
  token: string;
  entitySlug: string;
}

export function ShareCommentForm({ token, entitySlug }: ShareCommentFormProps) {
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || !content.trim()) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/share/comments?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          content: content.trim(),
          sectionHeading: "",
          entitySlug,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setStatus("success");
      setContent("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message);
    }
  }

  return (
    <div className="border rounded-lg p-3">
      <h3 className="text-sm font-semibold mb-3">Leave a Comment</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Your name"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={64}
          required
          className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <textarea
          placeholder="Write a comment..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          required
          className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs">
            {status === "success" && <span className="text-green-600">Comment submitted</span>}
            {status === "error" && <span className="text-destructive">{errorMsg}</span>}
          </div>
          <Button type="submit" size="sm" disabled={status === "submitting" || !nickname.trim() || !content.trim()}>
            {status === "submitting" ? "Sending..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
