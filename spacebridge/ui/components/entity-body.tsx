"use client";
// spacebridge/ui/components/entity-body.tsx
// ABOUTME: Client Component — renders markdown body with react-markdown,
// injects comment threads per section heading with optimistic update support.
// Supports 3-mode comment UX: document-level, section-level, text-selection popover.
// Manages local comment state; background router.refresh() keeps RSC in sync.

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ChatInput } from "@/components/chat-input";
import { GateButtons } from "@/components/gate-buttons";
import { TextSelectionPopover } from "@/components/text-selection-popover";

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

interface EntityBodyProps {
  body: string;
  sectionHeadings: string[];
  allComments: CommentRow[];
  entitySlug: string;
  onCommentAdded?: (comment: CommentRow) => void;
  /** Frontmatter status — used to conditionally show gate buttons */
  status?: string;
  /** Frontmatter auto_advance — when true, gate buttons are hidden (FO auto-advances) */
  autoAdvance?: boolean;
}

function wrapTextRange(
  nodeOffsets: Array<{ node: Text; start: number; end: number }>,
  rangeStart: number,
  rangeEnd: number,
  commentIds: string[],
  resolved: boolean,
) {
  for (let i = 0; i < nodeOffsets.length; i++) {
    const info = nodeOffsets[i];
    if (info.end <= rangeStart || info.start >= rangeEnd) continue;

    let node = info.node;
    const nodeStart = info.start;
    let localStart = Math.max(0, rangeStart - nodeStart);
    let localEnd = Math.min((node.textContent ?? "").length, rangeEnd - nodeStart);

    if (localStart > 0) {
      const before = node.splitText(localStart);
      const splitLen = (node.textContent ?? "").length;
      info.node = before;
      info.start = nodeStart + splitLen;
      node = before;
      localEnd = localEnd - localStart;
      localStart = 0;
    }
    if (localEnd < (node.textContent ?? "").length) {
      node.splitText(localEnd);
    }

    if (!node.parentNode) break;
    const mark = document.createElement("mark");
    mark.className = `comment-highlight${resolved ? " resolved" : ""}`;
    mark.setAttribute("data-comment-ids", commentIds.join(","));
    mark.style.cssText =
      "background: rgba(255,212,0,0.25); border-bottom: 2px solid rgba(255,212,0,0.8); cursor: pointer; border-radius: 2px;";
    node.parentNode.insertBefore(mark, node);
    mark.appendChild(node);
    break;
  }
}

export function EntityBody({
  body,
  sectionHeadings: _sectionHeadings,
  allComments,
  entitySlug,
  onCommentAdded,
  status,
  autoAdvance,
}: EntityBodyProps) {
  const showGateButtons = !autoAdvance && (status === "plan" || status === "uat");
  const articleRef = useRef<HTMLElement>(null);

  // Inject yellow highlight marks for comments with selectedText
  useEffect(() => {
    const bodyEl = articleRef.current;
    if (!bodyEl) return;

    // Remove existing highlights
    const existingMarks = bodyEl.querySelectorAll<HTMLElement>(".comment-highlight");
    for (let m = existingMarks.length - 1; m >= 0; m--) {
      const mark = existingMarks[m];
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    }
    bodyEl.normalize();

    const textComments = allComments.filter((c) => c.selectedText);
    if (!textComments.length) return;

    // Flatten all text nodes via TreeWalker
    const walker = document.createTreeWalker(bodyEl, NodeFilter.SHOW_TEXT);
    let fullText = "";
    const nodeOffsets: Array<{ node: Text; start: number; end: number }> = [];
    for (;;) {
      const next = walker.nextNode() as Text | null;
      if (!next) break;
      const start = fullText.length;
      fullText += next.textContent;
      nodeOffsets.push({ node: next, start, end: fullText.length });
    }

    // Build intervals for each comment
    const intervals: Array<{
      start: number;
      end: number;
      commentId: string;
      resolved: boolean;
    }> = [];
    for (const c of textComments) {
      const idx = fullText.indexOf(c.selectedText);
      if (idx === -1) continue;
      intervals.push({
        start: idx,
        end: idx + c.selectedText.length,
        commentId: c.commentId,
        resolved: c.resolved === 1,
      });
    }
    if (!intervals.length) return;

    // Build segment breakpoints for overlapping highlights
    let points = intervals.flatMap((iv) => [iv.start, iv.end]);
    points = [...new Set(points)].sort((a, b) => a - b);

    const segments: Array<{
      start: number;
      end: number;
      commentIds: string[];
      resolved: boolean;
    }> = [];
    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      const ids: string[] = [];
      let allResolved = true;
      for (const iv of intervals) {
        if (iv.start <= segStart && iv.end >= segEnd) {
          ids.push(iv.commentId);
          if (!iv.resolved) allResolved = false;
        }
      }
      if (ids.length > 0) {
        segments.push({ start: segStart, end: segEnd, commentIds: ids, resolved: allResolved });
      }
    }

    // Apply highlights in reverse order to preserve offsets
    for (let s = segments.length - 1; s >= 0; s--) {
      const seg = segments[s];
      wrapTextRange(nodeOffsets, seg.start, seg.end, seg.commentIds, seg.resolved);
    }
  }, [allComments]);

  // Click handler: highlight click → scroll comment card into view
  function handleArticleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as Element).closest(".comment-highlight");
    if (!target) return;
    const ids = target.getAttribute("data-comment-ids");
    if (!ids) return;
    const firstId = ids.split(",")[0];
    const card = document.getElementById(`comment-${firstId}`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("comment-card-flash");
    setTimeout(() => card.classList.remove("comment-card-flash"), 700);
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        Entity Content
      </h2>

      {/* Relative container so popover can be absolutely positioned */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: highlight click-to-scroll is a progressive enhancement; keyboard users navigate via comment cards directly */}
      <div className="relative" onClick={handleArticleClick}>
        <article ref={articleRef} className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <ReactMarkdown
            components={{
              h2: ({ node, children, ...props }) => {
                const headingText = typeof children === "string" ? children : String(children);
                return (
                  <h2
                    {...props}
                    className="text-lg font-semibold mt-6 mb-2 scroll-mt-16"
                    id={headingText}
                  >
                    {children}
                  </h2>
                );
              },
            }}
          >
            {body}
          </ReactMarkdown>
        </article>

        <TextSelectionPopover
          entitySlug={entitySlug}
          containerRef={articleRef}
          onCommentAdded={onCommentAdded}
        />
      </div>

      {showGateButtons && <GateButtons entitySlug={entitySlug} stage={status ?? ""} />}

      <ChatInput entitySlug={entitySlug} />
    </div>
  );
}
