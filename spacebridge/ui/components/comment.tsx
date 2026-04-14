"use client";
// spacebridge/ui/components/comment.tsx
// ABOUTME: Client Component — individual comment display with author attribution,
// content, timestamp, resolve button. captain/fo/guest styling per UI Spec.

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CommentProps {
  commentId: string;
  selectedText?: string;
  content: string;
  author: string;
  createdAt: number;
  resolved: boolean;
  resolvedReason: string | null;
  entitySlug: string;
  onResolved?: (commentId: string) => void;
}

function formatTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(epochMs).toLocaleDateString();
}

function authorLabel(author: string): string {
  if (author === "captain") return "Captain";
  if (author === "fo") return "First Officer";
  return author; // guest: show nickname
}

function authorInitials(author: string): string {
  if (author === "captain") return "C";
  if (author === "fo") return "FO";
  return author.slice(0, 2).toUpperCase();
}

function avatarColor(author: string): string {
  if (author === "captain") return "bg-blue-500 text-white";
  if (author === "fo") return "bg-purple-500 text-white";
  return "bg-green-500 text-white"; // guest
}

export function Comment({
  commentId,
  selectedText,
  content,
  author,
  createdAt,
  resolved,
  resolvedReason,
  entitySlug,
  onResolved,
}: CommentProps) {
  async function handleResolve() {
    try {
      await fetch(`/api/entities/${entitySlug}/comments/${commentId}/resolve`, {
        method: "POST",
      });
      onResolved?.(commentId);
    } catch {
      // ignore — user can retry
    }
  }

  return (
    <Card className={resolved ? "opacity-60" : ""}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback className={`text-xs ${avatarColor(author)}`}>
              {authorInitials(author)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-medium">{authorLabel(author)}</span>
              {author === "guest" && (
                <Badge variant="outline" className="text-xs py-0">
                  guest
                </Badge>
              )}
              {author === "fo" && (
                <Badge variant="secondary" className="text-xs py-0">
                  FO
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{formatTime(createdAt)}</span>
            </div>
            {selectedText && (
              <blockquote className="text-xs text-muted-foreground border-l-2 border-border pl-2 mb-1 italic line-clamp-2">
                {selectedText}
              </blockquote>
            )}
            <p className="text-sm text-foreground break-words">{content}</p>
            {resolved && resolvedReason && (
              <p className="text-xs text-muted-foreground mt-1">
                {resolvedReason === "stage_advanced" ? "Auto-resolved: stage advanced" : "Resolved"}
              </p>
            )}
          </div>
          {!resolved && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleResolve}
            >
              Resolve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
