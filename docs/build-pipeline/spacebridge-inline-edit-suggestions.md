---
id: 089
title: "Inline edit suggestions (comments parity part 2)"
status: draft
context_status: pending
source: entity 054 O-2 deferral (2026-04-13)
started:
completed:
verdict:
score: 0.0
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [054]
note: "Deferred from entity 054 O-2. Captain decided suggestions are v2 scope -- comments CQRS foundation (054) ships first, suggestions build on top."
---

## Directive

> The current dashboard supports inline edit suggestions (`addSuggestion`, `acceptSuggestion`, `rejectSuggestion`, `applyBodyEdit` in `tools/dashboard/src/comments.ts:65-109`). These let reviewers propose specific text changes to entity body content, which the captain can accept (auto-apply) or reject. Entity 054 deferred this to keep the comment CQRS foundation clean -- suggestions cross the comment domain boundary into entity-editing, requiring file write access that the comment decider shouldn't own.

## Captain Context Snapshot

- **Repo**: main @ 301f168
- **Session**: SO pipeline for spacebridge entities. 060 context ready (cutover). 054 clarified with O-2 deferral creating this entity.
- **Domain**: User-facing Visual (suggestion diff view, accept/reject buttons), Behavioral/Callable (suggestion decider, apply logic), Organizational/Data-transforming (event storage, entity body file writes)
- **Related entities**: 054 -- Entity detail page + comments API (clarify, ready) -- parent; O-2 is the deferral decision. 056 -- Lease manager (review, ready) -- fmodel CQRS pattern reference. 050 -- Plugin skeleton (shipped) -- schema.ts with comments table.
- **Created**: 2026-04-14T00:15:00+08:00

## Brainstorming Spec

**APPROACH**: Extend 054's comment CQRS domain with 3 new suggestion commands (`add_suggestion`, `accept_suggestion`, `reject_suggestion`) and corresponding events. The suggestion decider is a SEPARATE pure function from the comment decider -- it lives in the same domain directory (`spacebridge/src/domain/comment/suggestion-decider.ts`) but owns its own command/event/state types via Zod schemas. Key architectural split per 054 O-2 rationale: the *domain side* (decider + events) stays pure with zero I/O, while the *application side* has a separate `SuggestionApplier` module at `spacebridge/src/application/suggestion-applier.ts` that reads entity markdown, applies text diff (find `diff_from`, replace with `diff_to` -- first occurrence only, frontmatter-safe), and writes back. This mirrors the existing `applyBodyEdit` pattern at `comments.ts:84-109` (parse frontmatter boundary, replace only in body text, throw on missing `diff_from`). Suggestion events flow through the same `comment_events` table with a `category: 'suggestion'` discriminator (needs clarification -- deferred to explore) or a dedicated `suggestion_events` table. UI extends 054's `CommentThread` component with an inline diff view (from/to) and accept/reject buttons. REST endpoints via Next.js Route Handlers: `POST /api/entities/[slug]/comments/[id]/suggest` (add suggestion), `POST /api/entities/[slug]/suggestions/[id]/accept` (apply + mark accepted), `POST /api/entities/[slug]/suggestions/[id]/reject` (mark rejected). SSE integration: suggestion events appear in the war room feed via the same 053 poll mechanism.

**ALTERNATIVE**: Implement suggestions as a completely separate domain ("edit proposals") with its own aggregate, its own Drizzle table, and no link to the comment system. -- D-01 Rejected: suggestions are semantically part of the review conversation (a reviewer says "I think this line should be X instead of Y"). Separating them from comments means the UI can't render suggestions inline in comment threads, and the domain model loses the connection between "discussion about a change" and "the proposed change itself." 054 O-2 deferred suggestions to keep the v1 foundation clean, not to permanently separate them from the comment concept.

**GUARDRAILS**:
- Suggestion decider MUST be a pure function with zero I/O -- same discipline as 054's comment decider and 056's lease decider (design doc §5.3)
- Entity body file write logic MUST live in a separate application-layer module, NOT in the domain decider (054 O-2 rationale: domain boundary crossing)
- LCD schema discipline for any new table/columns: integer PKs, integer epoch-ms timestamps, text strings (design doc §3.3)
- Zod event schemas use `.passthrough()` (design doc §3.5 gotcha)
- Must handle concurrent edit conflict: if `diff_from` text no longer exists when "Accept" is clicked, fail with clear error (throw, not silent patch) -- same semantics as existing `applyBodyEdit` at comments.ts:93
- 054 must be shipped first -- this entity extends the CQRS foundation 054 builds

**RATIONALE**: Extending the comment domain (rather than creating a separate domain) preserves the conceptual link between discussion and proposed changes. The architectural split (pure decider for domain logic + impure applier module for file I/O) respects the domain boundary 054 O-2 identified while keeping the UI integration natural -- suggestions render inside CommentThread, not in a separate panel. This is the same separation-of-concerns pattern the existing `applyBodyEdit` function uses (comments.ts:84-109), just expressed through CQRS rather than imperative code. The pure decider is exhaustively testable (accept/reject state machine, conflict detection as a domain rule) without requiring filesystem mocks.

## Acceptance Criteria

- Given an `add_suggestion` command with `diff_from`/`diff_to` and a valid comment ID, when `decide()` is called, then it returns a `suggestion_added` event with status `pending` (how to verify: `bun test spacebridge/src/domain/comment/suggestion-decider.test.ts` -- pure function, no DB)
- Given an `accept_suggestion` command and the suggestion is `pending`, when `decide()` returns `suggestion_accepted` and `SuggestionApplier.apply()` runs, then the entity body markdown has `diff_from` replaced with `diff_to` (how to verify: `bun test` -- seed entity file, add suggestion, accept, read file, assert text changed)
- Given an `accept_suggestion` command where `diff_from` text no longer exists in the entity body, when `SuggestionApplier.apply()` runs, then it throws a conflict error without modifying the file (how to verify: `bun test` -- modify entity body, attempt accept, assert error + file unchanged)
- Given a `reject_suggestion` command and the suggestion is `pending`, when `decide()` is called, then it returns `suggestion_rejected` and the entity body is NOT modified (how to verify: `bun test` -- reject suggestion, assert file unchanged, suggestion status = rejected)
- Given a suggestion is added, when 053's SSE poll fires within 500ms, then the war room feed includes the suggestion event (how to verify: add suggestion via API, check SSE stream, assert event present)
- Given the detail page with a pending suggestion, when the page renders, then the suggestion appears as an inline diff view (from/to) with Accept/Reject buttons in the comment thread (how to verify: start daemon, navigate to entity with suggestion, assert diff view + buttons visible)

## References

- Entity 054 O-2: deferral decision with rationale (domain boundary crossing)
- `tools/dashboard/src/comments.ts:65-81`: existing `addSuggestion` implementation (id, comment_id, diff_from, diff_to, status, timestamp)
- `tools/dashboard/src/comments.ts:84-109`: existing `applyBodyEdit` implementation (frontmatter-safe, first-occurrence, throw on missing diff_from)
- Entity 056 pattern: fmodel CQRS aggregate (commands → decider → events, evolve → state, dual-table persistence)
- Entity 054: comment CQRS domain foundation (decider, events table, section-based anchoring, single-level replies)
- Design doc §3.5 (Scoped fmodel CQRS): comments as 🟢 full CQRS domain
- Design doc §3.3 (LCD schema discipline): integer PKs, epoch-ms timestamps, text strings
