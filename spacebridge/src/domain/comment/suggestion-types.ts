// spacebridge/src/domain/comment/suggestion-types.ts
// ABOUTME: Domain types for the suggestion aggregate (inline edit suggestions on comments).
// Commands: add_suggestion, accept_suggestion, reject_suggestion.
// Events: suggestion_added, suggestion_accepted, suggestion_rejected.
// State: Map<suggestionId, SuggestionSnapshot> — rebuilt via event replay.

// ─── State ─────────────────────────────────────────────────────────────────────

export interface SuggestionSnapshot {
  suggestionId: string;
  commentId: string;
  diff_from: string;
  diff_to: string;
  status: "pending" | "accepted" | "rejected";
  author: "captain" | "fo" | "guest";
  createdAt: number; // epoch-ms
}

export type SuggestionState = Map<string, SuggestionSnapshot>;

export const emptySuggestionState: SuggestionState = new Map();

// ─── Commands ──────────────────────────────────────────────────────────────────

export interface AddSuggestionCommand {
  type: "add_suggestion";
  suggestionId: string;
  commentId: string;
  diff_from: string;
  diff_to: string;
  author: "captain" | "fo" | "guest";
}

export interface AcceptSuggestionCommand {
  type: "accept_suggestion";
  suggestionId: string;
  author: "captain" | "fo" | "guest";
}

export interface RejectSuggestionCommand {
  type: "reject_suggestion";
  suggestionId: string;
  author: "captain" | "fo" | "guest";
}

export type SuggestionCommand =
  | AddSuggestionCommand
  | AcceptSuggestionCommand
  | RejectSuggestionCommand;

// ─── Events ────────────────────────────────────────────────────────────────────

export interface SuggestionAddedEvent {
  type: "suggestion_added";
  suggestionId: string;
  commentId: string;
  diff_from: string;
  diff_to: string;
  author: string;
  createdAt: number; // epoch-ms
}

export interface SuggestionAcceptedEvent {
  type: "suggestion_accepted";
  suggestionId: string;
  acceptedBy: string;
  acceptedAt: number; // epoch-ms
}

export interface SuggestionRejectedEvent {
  type: "suggestion_rejected";
  suggestionId: string;
  rejectedBy: string;
  rejectedAt: number; // epoch-ms
}

export type SuggestionEvent =
  | SuggestionAddedEvent
  | SuggestionAcceptedEvent
  | SuggestionRejectedEvent;
