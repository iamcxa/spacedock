---
id: 089
title: "Inline edit suggestions (comments parity part 2)"
status: draft
source: entity 054 O-2 deferral (2026-04-13)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
depends-on: [054]
note: "Deferred from entity 054 O-2. Captain decided suggestions are v2 scope -- comments CQRS foundation (054) ships first, suggestions build on top."
---

## Problem

The current dashboard supports inline edit suggestions (`addSuggestion`, `acceptSuggestion`, `rejectSuggestion`, `applyBodyEdit` in `tools/dashboard/src/comments.ts:65-109`). These let reviewers propose specific text changes to entity body content, which the captain can accept (auto-apply) or reject. Entity 054 deferred this to keep the comment CQRS foundation clean -- suggestions cross the comment domain boundary into entity-editing, requiring file write access that the comment decider shouldn't own.

## Scope

- Suggestion commands in comment CQRS domain: `add_suggestion`, `accept_suggestion`, `reject_suggestion`
- Suggestion events: `suggestion_added`, `suggestion_accepted`, `suggestion_rejected`
- Suggestion storage: extend `comment_events` table or add `suggestion_events` table
- Apply logic in a separate module (NOT in comment decider): reads entity markdown, applies diff, writes back
- UI: suggestion diff view (from/to) inline in comment thread, accept/reject buttons
- SSE integration: suggestion events appear in live feed

## Acceptance Criteria

- [ ] Given an existing comment, when a user submits a suggestion with diff_from/diff_to, then it appears as a pending suggestion in the comment thread (how to verify: API call + page reload)
- [ ] Given a pending suggestion, when the captain clicks "Accept", then the entity body markdown is updated with the suggested text (how to verify: accept suggestion, read entity file, assert text changed)
- [ ] Given a pending suggestion, when the captain clicks "Reject", then it's marked as rejected without modifying the entity body (how to verify: reject, assert file unchanged, suggestion status = rejected)
- [ ] Given a suggestion's diff_from text no longer exists in the entity body (concurrent edit), when "Accept" is clicked, then it fails with a clear conflict error (how to verify: modify entity body, attempt accept, assert error)

## References

- Entity 054 O-2: deferral decision with rationale (domain boundary crossing)
- `tools/dashboard/src/comments.ts:65-109`: existing addSuggestion/applyBodyEdit implementation
- Entity 056 pattern: fmodel CQRS aggregate (commands → decider → events)
