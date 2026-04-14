"use client";
// spacebridge/ui/components/text-selection-popover.tsx
// ABOUTME: Client Component — detects text selection in entity body, shows floating
// "Comment" button near selection, expands to mini form pre-filled with selected text
// and auto-detected section heading. Posts to /api/entities/[slug]/comments.

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

interface PopoverState {
  visible: boolean;
  expanded: boolean;
  x: number;
  y: number;
  selectedText: string;
  sectionHeading: string;
}

interface TextSelectionPopoverProps {
  entitySlug: string;
  containerRef: React.RefObject<HTMLElement | null>;
  onCommentAdded?: (comment: CommentRow) => void;
}

export function TextSelectionPopover({
  entitySlug,
  containerRef,
  onCommentAdded,
}: TextSelectionPopoverProps) {
  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    expanded: false,
    x: 0,
    y: 0,
    selectedText: "",
    sectionHeading: "",
  });
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function detectSectionHeading(range: Range): string {
    const container = containerRef.current;
    if (!container) return "";
    // Walk backwards from range start node to find nearest h2
    let node: Node | null = range.startContainer;
    while (node && node !== container) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (el.tagName === "H2") {
          return el.textContent?.trim() ?? "";
        }
        // Check previous siblings for h2
        let sibling = el.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === "H2") {
            return sibling.textContent?.trim() ?? "";
          }
          sibling = sibling.previousElementSibling;
        }
      }
      node = node.parentNode;
    }
    return "";
  }

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const container = containerRef.current;
    if (!container) return;

    const range = selection.getRangeAt(0);
    // Check selection is within our container
    if (!container.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPopover({
      visible: true,
      expanded: false,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
      selectedText,
      sectionHeading: detectSectionHeading(range),
    });
    setContent("");
    setError(null);
  }, [containerRef, detectSectionHeading]);

  // Close popover on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover((p) => ({ ...p, visible: false, expanded: false }));
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseUp]);

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
          sectionHeading: popover.sectionHeading,
          content: trimmedContent,
          selectedText: popover.selectedText,
          author: "captain",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to submit comment");
      } else {
        const data = await res.json().catch(() => ({}));
        setPopover((p) => ({ ...p, visible: false, expanded: false }));
        setContent("");
        onCommentAdded?.({
          commentId: (data as { commentId?: string }).commentId ?? crypto.randomUUID(),
          selectedText: popover.selectedText,
          sectionHeading: popover.sectionHeading,
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

  if (!popover.visible) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        left: popover.x,
        top: popover.y,
        transform: "translate(-50%, -100%)",
        zIndex: 50,
      }}
      className="shadow-lg rounded-md border border-border bg-popover"
    >
      {!popover.expanded ? (
        <Button
          size="sm"
          variant="secondary"
          className="text-xs h-7 px-2"
          onClick={() => setPopover((p) => ({ ...p, expanded: true }))}
        >
          Comment
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="p-3 space-y-2 w-64">
          {popover.selectedText && (
            <blockquote className="text-xs text-muted-foreground border-l-2 border-border pl-2 italic line-clamp-2">
              {popover.selectedText}
            </blockquote>
          )}
          {popover.sectionHeading && (
            <p className="text-xs text-muted-foreground">
              Section: <span className="font-medium">{popover.sectionHeading}</span>
            </p>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment on this selection..."
            rows={3}
            className="text-sm resize-none"
            disabled={submitting}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() => setPopover((p) => ({ ...p, visible: false, expanded: false }))}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-7"
              disabled={submitting || !content.trim()}
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
