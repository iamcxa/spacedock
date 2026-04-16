---
id: 089
title: "Inline edit suggestions (comments parity part 2)"
status: uat
context_status: ready
source: entity 054 O-2 deferral (2026-04-13)
started: 2026-04-16T00:00:00+08:00
completed:
verdict:
score: 0.0
worktree: .worktrees/spacedock-ensign-spacebridge-inline-edit-suggestions
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

**APPROACH**: Extend 054's comment CQRS domain with 3 new suggestion commands (`add_suggestion`, `accept_suggestion`, `reject_suggestion`) and corresponding events (✓ confirmed by explore: existing impl at comments.ts:65-132 has exactly these 3 operations with matching semantics). The suggestion decider is a SEPARATE pure function from the comment decider -- it lives in the same domain directory (`spacebridge/src/domain/comment/suggestion-decider.ts`) but owns its own command/event/state types via Zod schemas (✓ confirmed by explore: 054 A-1 + 056 pattern establish per-aggregate pure decider discipline). Key architectural split per 054 O-2 rationale: the *domain side* (decider + events) stays pure with zero I/O, while the *application side* has a separate `SuggestionApplier` module at `spacebridge/src/application/suggestion-applier.ts` that reads entity markdown, applies text diff (find `diff_from`, replace with `diff_to` -- first occurrence only, frontmatter-safe), and writes back (✓ confirmed by explore: existing `applyBodyEdit` at comments.ts:84-109 is the reference implementation -- frontmatter boundary parsing, body-only replace, throw on missing diff_from). Suggestion events flow through the same `comment_events` table with a `category: 'suggestion'` discriminator or a dedicated `suggestion_events` table -- see O-1 for comparison. UI extends 054's `CommentThread` component with an inline diff view (from/to) and accept/reject buttons. REST endpoints via Next.js Route Handlers: `POST /api/entities/[slug]/comments/[id]/suggest` (add suggestion), `POST /api/entities/[slug]/suggestions/[id]/accept` (apply + mark accepted), `POST /api/entities/[slug]/suggestions/[id]/reject` (mark rejected). SSE integration: suggestion events appear in the war room feed via the same 053 poll mechanism.

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

## Assumptions

A-1: Suggestion decider follows 054/056 pattern -- pure function at `spacebridge/src/domain/comment/suggestion-decider.ts`, same structure (commands → decide → events, evolve → state). Separate from comment decider but in the same domain directory.
Confidence: 🟢 Confident (0.95)
Evidence: 054 A-1 establishes decider pattern for comment domain. 056 APPROACH establishes it for lease domain. Design doc §3.5 lists both as 🟢 full CQRS. Two consistent precedents → Confident. NOTE: `spacebridge/src/domain/` dir does not exist yet (created by 054/056 in-flight); path is speculative-but-authoritative based on parent entity designs.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: SuggestionApplier replicates `applyBodyEdit` logic -- frontmatter boundary parsing (find second `---`), body-only text replacement (first occurrence of `diff_from`), throw Error on missing `diff_from`.
Confidence: 🟢 Confident (0.95)
Evidence: `tools/dashboard/src/comments.ts:84-109` is the reference implementation. Line 93: `if (!bodyPart.includes(diffFrom)) throw new Error("Text not found in entity body: diff_from text not found")`. Line 106: `// Intentionally replaces only the first occurrence`. Proven production code; CQRS version ports the same logic to a separate module.
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Suggestion type has 6 fields: `{ id, comment_id, diff_from, diff_to, status: "pending"|"accepted"|"rejected", timestamp }` -- matching the existing `Suggestion` interface.
Confidence: 🟢 Confident (0.95)
Evidence: `tools/dashboard/src/types.ts:136-143` defines the interface verbatim. `comments.ts:70-77` constructs suggestions with exactly these fields. The CQRS version converts these to Zod schemas but preserves the same shape.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Suggestions are linked to comments via `comment_id` (not standalone). A suggestion is always a reply-to-comment that proposes a text change.
Confidence: 🟢 Confident (0.95)
Evidence: `types.ts:138` `comment_id: string`. `comments.ts:67` `input: { comment_id: string; ... }`. `CommentThread` at types.ts:145-148 holds both `comments[]` and `suggestions[]` -- parallel arrays linked by `comment_id`. UI renders suggestions inline within the comment thread that owns them.
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Status machine is `{ pending → accepted, pending → rejected }` with no other transitions. Once accepted or rejected, the suggestion is terminal.
Confidence: 🟢 Confident (0.90)
Evidence: `comments.ts:121` sets `"accepted"`, `comments.ts:130` sets `"rejected"`. No code path transitions from accepted to rejected or vice versa. The decider's `decide()` function should reject commands on non-pending suggestions.
→ Confirmed: captain, 2026-04-14 (batch)

A-6: Permission model for v1 -- all roles (captain/fo/guest) can `add_suggestion`; only captain/fo can `accept_suggestion` and `reject_suggestion`. No per-user reject-own logic in v1. Guest as external reviewer can propose changes but cannot apply them (file write boundary). Permission refinement deferred to when spacebridge auth layer matures (058 tunnel share integration).
Confidence: 🟢 Confident (0.90)
Evidence: Captain intent: "希望訪客也可以作為外部審查者來看，但不一定要這一次就做到位". Current dashboard has zero permission checks (comments.ts:111-132). 054 A-7 (if present) established author field supports captain/fo/guest. The decider can gate on author role in `decide()` — reject `accept_suggestion` commands from guest role.
→ Confirmed: captain, 2026-04-14 (interactive) -- v1 simple, v2 refine with auth maturity

A-7: Multi-suggestion conflict resolution is thread-based, not automatic invalidation. Multiple suggestions on the same text region are grouped into the same comment thread (Notion-like model: second reviewer replies to the first reviewer's comment, adding their own suggestion). Captain sees all proposals in one thread and accepts the best one. After accepting, stale suggestions whose `diff_from` is gone will naturally fail via `applyBodyEdit` throw — no auto-invalidation logic needed in v1. This aligns with 054 O-3 (section-based anchoring) — suggestions are anchored to the same section heading, so they thread together.
Confidence: 🟢 Confident (0.90)
Evidence: 054 O-3 selected section-based anchoring. 054 O-1 selected single-level replies. Together these give: comment anchored to section → replies within thread → each reply can carry a suggestion. `applyBodyEdit` at comments.ts:93 already throws on missing `diff_from` — the natural fail path is proven production code.
→ Confirmed: captain, 2026-04-14 (interactive) -- Notion-like threading model, natural fail for stale suggestions

A-8: Suggestion SSE events follow the existing events table format (schema.ts:44-58). Event types: `suggestion_added`, `suggestion_accepted`, `suggestion_rejected`. The `detail` field carries a human-readable summary with 30-char truncated preview of diff_from/diff_to and section heading. The `agent` field carries the author role. No new event table or format needed -- 053's SSE poll picks them up from the existing events table via the standard poll mechanism.
Confidence: 🟢 Confident (0.95)
Evidence: schema.ts:44-58 `events` table has `type`, `entity`, `stage`, `agent`, `timestamp`, `detail` columns. Existing event types (`stage_transition`, `share_created`, `comment_added` from 054) establish the pattern. Suggestion events are a natural extension with same structure.
→ Confirmed: captain, 2026-04-14 (interactive) -- follows existing events table pattern, 30-char truncation for detail

## Option Comparisons

### O-1: Suggestion event storage -- shared comment_events table vs dedicated suggestion_events table

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Shared `comment_events` table with `category` discriminator column | Single table for SSE poll query (one SELECT, not two). Simpler schema migration. Comment and suggestion events naturally interleave in chronological order for replay. | Mixes two aggregate event streams in one table -- violates fmodel strict aggregate-per-table pattern from 056. Category discriminator adds a conditional to event deserialization. | Low | ✅ Recommended |
| Dedicated `suggestion_events` table | Clean aggregate boundary -- suggestion events in their own table, matching 056's per-aggregate pattern. No discriminator needed. | SSE poll needs UNION query or two queries. Schema grows wider. Harder to replay interleaved comment+suggestion history for a single entity. | Medium | Viable |

Return value trace: 053's SSE endpoint polls the `events` table for new events. If suggestions use `comment_events`, the existing poll query picks them up automatically (assuming it queries `comment_events` too). If suggestions use a separate table, the poll query needs modification to include `suggestion_events`.

Design doc invariant check: §3.5 says "comments" is 🟢 full CQRS. Suggestions are conceptually part of the comment domain (reviewer proposes a text change as part of a discussion). Sharing the event table reflects this conceptual unity. §3.3 LCD discipline applies equally to both options. No invariant blocks either choice.

→ Selected: Shared `comment_events` table with `category` discriminator -- SSE poll + replay only need one SELECT; category column separates aggregates within the shared table (captain, 2026-04-14, interactive -- confirmed after Q&A on event consumer paths)

## Open Questions

Q-1: Should the suggestion diff view use a visual diff component (green/red highlighting like GitHub PRs) or a simpler before/after text block?

Domain: User-facing Visual

Why it matters: The diff rendering approach determines whether 089 needs an external dependency (`diff` or `react-diff-viewer` library) or can use inline styling. A complex diff view adds visual polish but also adds a dependency and rendering complexity for multi-line diffs. A simple before/after block is dependency-free but less intuitive for large text changes.

Suggested options:
- (a) Simple before/after: show `diff_from` in a red-tinted block, `diff_to` in a green-tinted block, stacked vertically. No external deps. Matches the simplicity of the existing dashboard.
- (b) Inline diff highlighting: use `react-diff-viewer-continued` (active fork) or roll a lightweight char-level diff with `diff` npm package. GitHub PR-style green/red highlighting.
- (c) Minimal: just show `diff_to` with a "replaces: {diff_from}" tooltip/expandable. Least visual noise, most compact.

→ Answer: (a) Simple before/after -- diff_from 紅底、diff_to 綠底，上下疊放。零外部依賴，與現有 dashboard 風格一致。 (captain, 2026-04-14, interactive)

## Stage Report: explore

- [x] Files mapped: 10 across domain (3 new), application (2 new), ui (3 new + 1 modify), schema (1 modify)
  domain: suggestion-decider.ts, suggestion-types.ts, suggestion-decider.test.ts (all new, under spacebridge/src/domain/comment/); application: suggestion-applier.ts, suggestion-applier.test.ts (new, under spacebridge/src/application/); ui: 3 new Route Handler files (suggest, accept, reject), 1 modify CommentThread component; schema: schema.ts (add storage — O-1 decides shape). NOTE: domain/ and application/ dirs do not yet exist — created by 054/056 (in-flight).
- [x] Assumptions formed: 5 (Confident: 5, Likely: 0, Unclear: 0)
  A-1 decider pattern (0.95, 2 precedents 054+056), A-2 applyBodyEdit port (0.95, comments.ts:84-109), A-3 Suggestion 6-field type (0.95, types.ts:136-143), A-4 comment_id linkage (0.95, types.ts:138), A-5 terminal status machine (0.90, comments.ts:121+130)
- [x] Options surfaced: 1
  O-1 suggestion event storage (shared comment_events ✅ vs dedicated suggestion_events)
- [x] Questions generated: 1
  Q-1 diff view rendering approach (visual diff library vs simple before/after blocks)
- [x] α markers resolved: 1 / 1
  α-1 (storage strategy: comment_events with discriminator vs suggestion_events) → reclassified as O-1 with codebase-grounded comparison table
- [x] Scale assessment: confirmed Medium
  10 files across 4 layers; matches brainstorm estimate
- [x] Research dispatched: 0 researchers (skipped -- all patterns are internal codebase architecture, no external tech claims; parent entities 054+056 already validated fmodel/Drizzle/Next.js)

## Canonical References

- `tools/dashboard/src/comments.ts:65-81` -- existing `addSuggestion` (reference for CQRS command shape -- A-3)
- `tools/dashboard/src/comments.ts:84-109` -- existing `applyBodyEdit` (reference for SuggestionApplier -- A-2)
- `tools/dashboard/src/comments.ts:111-132` -- existing `acceptSuggestion`/`rejectSuggestion` (reference for status machine -- A-5)
- `tools/dashboard/src/types.ts:136-148` -- `Suggestion` interface + `CommentThread` shape (A-3, A-4)
- `spacebridge/src/schema.ts:62-80` -- `comments` table with fmodel columns (A-1, O-1)
- Entity 054 O-2: deferral decision -- "suggestions cross domain boundary" rationale (GUARDRAILS foundation)
- Entity 054 A-1: comment decider pattern (precedent for A-1)
- Entity 056 O-1: dual-table persistence (precedent for O-1)
- `spacebridge/src/schema.ts:44-58` -- events table format (precedent for A-8 SSE event shape)

## Stage Report: clarify

- [x] Decomposition: not-applicable
  Medium entity, no decomposition recommendation from explore
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  All evidence cites verified in same session; no intervening commits
- [x] Assumptions confirmed: 8 / 8 (0 corrected)
  A-1..A-5 batch-confirmed; A-6 (permission model) surfaced in exploration loop; A-7 (thread-based conflict) surfaced in exploration loop; A-8 (SSE event format) surfaced in exploration loop
- [x] Options selected: 1 / 1
  O-1: shared comment_events table with category discriminator (SSE poll + replay simplicity)
- [x] Questions answered: 1 / 1 (0 deferred)
  Q-1: simple before/after diff view (red block / green block, zero external deps)
- [x] Open exploration: 3 gray areas surfaced (0 from templates, 0 from CONTRACTS, 0 from directive, 3 via captain interaction)
  A-6 permission model (captain+fo can accept/reject, guest can only add); A-7 multi-suggestion conflict (Notion-like thread model, natural fail for stale); A-8 SSE event format (follows events table pattern)
- [x] Canonical refs added: 1
  schema.ts:44-58 events table (A-8 SSE event format precedent)
- [x] Context status: ready
  Gate passed: 8 assumptions confirmed, 1 option selected, 1 question answered, 6 acceptance criteria α-clean
- [x] Handoff mode: loose
  No auto_advance in frontmatter; captain must say "execute 089" to FO
- [x] Clarify duration: 7 AskUserQuestion calls + 1 assumption batch + 2 freeform explanations
  Batch(1) + O-1(2, captain asked "用在哪裡？" before deciding) + Q-1(1) + exploration(3 iterations: permission, conflict, SSE event format + Complete)
