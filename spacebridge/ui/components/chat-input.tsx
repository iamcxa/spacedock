"use client";
// spacebridge/ui/components/chat-input.tsx
// ABOUTME: Client Component — captain chat input for sending messages to the active CC session.
// POSTs to /api/entities/[slug]/chat. Shows delivery confirmation or error banner.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  entitySlug: string;
}

type Status = "idle" | "sending" | "delivered" | "offline" | "error";

export function ChatInput({ entitySlug }: ChatInputProps) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    setStatus("sending");
    setErrorMsg(null);

    try {
      const resp = await fetch(`/api/entities/${entitySlug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!resp.ok) {
        const body = (await resp.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? `HTTP ${resp.status}`);
        setStatus("error");
        return;
      }

      const body = (await resp.json()) as { delivered: boolean };
      setContent("");
      setStatus(body.delivered ? "delivered" : "offline");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
        Chat with FO
      </h3>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Send a message to the active CC session..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          disabled={status === "sending"}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={status === "sending" || !content.trim()} size="sm">
            {status === "sending" ? "Sending…" : "Send"}
          </Button>

          {status === "delivered" && (
            <span className="text-sm text-green-600">✓ delivered</span>
          )}
          {status === "offline" && (
            <span className="text-sm text-yellow-600">⚠ CC session offline — message queued</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">Error: {errorMsg}</span>
          )}
        </div>
      </form>
    </div>
  );
}
