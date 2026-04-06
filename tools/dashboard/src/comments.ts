import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Comment, Suggestion, CommentThread } from "./types";

function sidecarPath(entityPath: string): string {
  return entityPath.replace(/\.md$/, ".comments.json");
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readSidecar(entityPath: string): CommentThread {
  const path = sidecarPath(entityPath);
  if (!existsSync(path)) {
    return { comments: [], suggestions: [] };
  }
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw) as CommentThread;
}

function writeSidecar(entityPath: string, thread: CommentThread): void {
  writeFileSync(sidecarPath(entityPath), JSON.stringify(thread, null, 2));
}

export function getComments(entityPath: string): CommentThread {
  return readSidecar(entityPath);
}

export function addComment(
  entityPath: string,
  input: { selected_text: string; section_heading: string; content: string; author?: "captain" | "fo" | "guest" }
): Comment {
  const thread = readSidecar(entityPath);
  const comment: Comment = {
    id: generateId(),
    entity_path: entityPath,
    selected_text: input.selected_text,
    section_heading: input.section_heading,
    content: input.content,
    author: input.author ?? "captain",
    timestamp: new Date().toISOString(),
    resolved: false,
    thread: [],
  };
  thread.comments.push(comment);
  writeSidecar(entityPath, thread);
  return comment;
}

export function resolveComment(entityPath: string, commentId: string): Comment {
  const thread = readSidecar(entityPath);
  const comment = thread.comments.find((c) => c.id === commentId);
  if (!comment) throw new Error("Comment not found: " + commentId);
  comment.resolved = true;
  writeSidecar(entityPath, thread);
  return comment;
}

export function addSuggestion(
  entityPath: string,
  input: { comment_id: string; diff_from: string; diff_to: string }
): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion: Suggestion = {
    id: generateId(),
    comment_id: input.comment_id,
    diff_from: input.diff_from,
    diff_to: input.diff_to,
    status: "pending",
    timestamp: new Date().toISOString(),
  };
  thread.suggestions.push(suggestion);
  writeSidecar(entityPath, thread);
  return suggestion;
}

export function applyBodyEdit(fileText: string, diffFrom: string, diffTo: string): string {
  // Find frontmatter boundary to only operate on body text
  const lines = fileText.split("\n");
  if (!lines.length || lines[0].trim() !== "---") {
    throw new Error("Missing YAML frontmatter");
  }
  let fmEnd: number | null = null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      fmEnd = i;
      break;
    }
  }
  if (fmEnd === null) {
    throw new Error("Unterminated YAML frontmatter");
  }

  const frontmatterPart = lines.slice(0, fmEnd + 1).join("\n");
  const bodyPart = lines.slice(fmEnd + 1).join("\n");

  if (!bodyPart.includes(diffFrom)) {
    throw new Error("Text not found in entity body: diff_from text not found");
  }
  // Intentionally replaces only the first occurrence — suggestion targets a specific text selection
  const newBody = bodyPart.replace(diffFrom, diffTo);
  return frontmatterPart + "\n" + newBody;
}

export function acceptSuggestion(entityPath: string, suggestionId: string): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion = thread.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found: " + suggestionId);

  // Re-read entity file (concurrent edit protection)
  const fileText = readFileSync(entityPath, "utf-8");
  const updated = applyBodyEdit(fileText, suggestion.diff_from, suggestion.diff_to);
  writeFileSync(entityPath, updated);

  suggestion.status = "accepted";
  writeSidecar(entityPath, thread);
  return suggestion;
}

export function rejectSuggestion(entityPath: string, suggestionId: string): Suggestion {
  const thread = readSidecar(entityPath);
  const suggestion = thread.suggestions.find((s) => s.id === suggestionId);
  if (!suggestion) throw new Error("Suggestion not found: " + suggestionId);
  suggestion.status = "rejected";
  writeSidecar(entityPath, thread);
  return suggestion;
}
