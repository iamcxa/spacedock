---
id: 054
title: "Entity detail page + comments API (parity part 1)"
status: execute
context_status: ready
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
started: 2026-04-14T09:00:00+08:00
worktree: .worktrees/spacedock-ensign-spacebridge-entity-detail-comments-api
completed:
verdict:
score: 0.0
issue:
pr:
intent: feature
scale: Medium
project: spacedock
depends-on: [053]
---

## Directive

> Build the entity detail page and comments API for the spacebridge Next.js app. The detail page shows the full entity view (frontmatter, body content, stage history, activity timeline). The comments system is a 🟢 full fmodel CQRS domain with pure decider, Drizzle persistence, and REST endpoints via Next.js Route Handlers. Comments push to the SSE live feed in real-time. This replaces the current dashboard's JSON sidecar comment storage (`tools/dashboard/src/comments.ts`) with a proper event-sourced implementation. Design doc §3.5 classifies comments as full CQRS.

## Captain Context Snapshot

- **Repo**: main @ eb38bac
- **Session**: SO pipeline for spacebridge entities. 056 (lease manager) and 053 (war room) context ready. 054 is third.
- **Domain**: User-facing Visual, Behavioral/Callable, Organizational/Data-transforming
- **Related entities**: 053 -- War room + SSE (context ready -- establishes Next.js app at `spacebridge/ui/`, shadcn Standard set, SSE via poll 500ms, fs parse), 056 -- Lease manager (context ready -- lease owner badge for comment routing), 050 -- Plugin skeleton (shipped -- `comments` table already exists in Drizzle schema with fmodel columns)
- **Created**: 2026-04-13T18:30:00+08:00

## Brainstorming Spec

**APPROACH**: Build the entity detail page as a Next.js dynamic route at `spacebridge/ui/app/entity/[slug]/page.tsx` (Server Component for initial render). The page reads the entity markdown file from filesystem (same pattern as 053 O-3: filesystem parse at request time), parses frontmatter + body, and renders: (1) frontmatter header (title, status, stage, owner badge), (2) markdown body with rendered sections, (3) stage history timeline (from events table), (4) inline comment threads anchored to entity sections. The comments system is implemented as a fmodel CQRS aggregate in `spacebridge/src/domain/comment/` (same pattern as 056's lease domain): pure `decider` (add_comment → comment_added, reply_to_comment → reply_added, resolve_comment → comment_resolved), `evolve` function, Zod schemas with `.passthrough()`. REST endpoints via Next.js Route Handlers: `POST /api/entities/[slug]/comments` (add comment), `GET /api/entities/[slug]/comments` (list), `POST /api/entities/[slug]/comments/[id]/reply` (reply), `POST /api/entities/[slug]/comments/[id]/resolve` (manual resolve). Auto-resolve: when an entity advances past a stage, all comments anchored to that stage are auto-resolved with `resolved_reason: 'stage_advanced'`. The existing `comments` table in schema.ts (entity 050) already has the necessary columns; a `comment_events` table is added for the event log (same dual-table pattern as 056 O-1). New comments are written to the events table (type: `comment_added`) so the war room's SSE feed (entity 053) picks them up via its 500ms poll. This replaces the JSON sidecar pattern (`tools/dashboard/src/comments.ts`) with structured Drizzle persistence.

**ALTERNATIVE**: Keep the JSON sidecar approach from the current dashboard but adapt it for Next.js Route Handlers -- read/write `.comments.json` files alongside entity markdown. -- D-01 Rejected: JSON sidecars don't support event replay (tunnel participants can't catch up), have no pure decider testability, and lose data on sidecar file conflicts when multiple sessions edit simultaneously. Design doc §3.5 explicitly classifies comments as 🟢 full CQRS. The sidecar approach was acceptable for the single-session vanilla dashboard; multi-session spacebridge needs CQRS.

**GUARDRAILS**:
- Pure decider must have zero I/O -- same discipline as 056's lease decider (design doc §5.3 pattern)
- Comments table already exists in schema.ts (entity 050) -- do NOT recreate it, add the `comment_events` event log table alongside
- LCD schema discipline for `comment_events`: integer PKs, integer epoch-ms timestamps, text strings (design doc §3.3)
- Zod event schemas use `.passthrough()` (design doc §3.5 gotcha)
- Entity detail page lives in `spacebridge/ui/` (entity 053 O-1 decision) -- same Next.js app, new route
- SSE integration: write events to events table, 053's SSE endpoint picks them up via poll. No direct SSE push from comments API
- Comment attribution: `author` field supports `'captain' | 'fo' | 'guest'` (matches existing schema.ts:69). Tunnel participants use nickname-based attribution (pre-auth, design doc §8 share model)
- shadcn components from 053's Standard set (Card, Badge, etc.) -- extend with additional components only if needed for comment UI

**RATIONALE**: The fmodel CQRS pattern for comments is mandated by the design doc and proven by 056's lease aggregate. The dual benefit is testability (pure decider = exhaustive edge case coverage for reply threading, auto-resolve timing, concurrent comment conflicts) and replay capability (tunnel participants joining mid-session can replay comment events to see the full discussion). The existing `comments` table in schema.ts provides the snapshot projection; adding `comment_events` completes the CQRS dual-table pattern established by 056. The entity detail page extends 053's Next.js app with a new dynamic route, sharing the same shadcn component library, Tailwind theme, and SSE infrastructure.

## Acceptance Criteria

- [ ] Given an entity slug, when navigating to `/entity/[slug]`, then the detail page renders full entity content: frontmatter header, markdown body, stage history timeline (how to verify: start daemon, open browser to `/entity/test-entity`, assert all sections visible)
- [ ] Given the detail page, when a user submits a comment via the form, then a `POST /api/entities/[slug]/comments` creates the comment and it appears inline on the page (how to verify: `curl -X POST` with comment payload, reload page, assert comment visible)
- [ ] Given an existing comment, when a user submits a reply, then `POST /api/entities/[slug]/comments/[id]/reply` creates a threaded reply (how to verify: `bun test` -- add comment, add reply, assert reply.parent_id matches comment.id)
- [ ] Given a `CommentCommand` of type `add_comment` and valid `CommentState`, when `decide()` is called, then it returns a `comment_added` event (how to verify: `bun test spacebridge/src/domain/comment/decider.test.ts` -- pure function, no DB)
- [ ] Given an entity that advances past stage X, when the stage transition event is processed, then all comments anchored to stage X are auto-resolved with `resolved_reason: 'stage_advanced'` (how to verify: `bun test` -- seed comments at stage, emit stage advance, assert resolved)
- [ ] Given a new comment is added, when the events table is polled by 053's SSE endpoint, then the comment event appears in the war room live feed (how to verify: add comment, check SSE stream within 1s)
- [ ] Given the `comment_events` table, when its schema is inspected, then it follows LCD discipline (how to verify: `grep -E 'serial|timestamptz|datetime|RETURNING' spacebridge/drizzle/*.sql` returns 0 matches)
- [ ] Given a tunnel participant with a share link, when they submit a comment, then the author is attributed as `'guest'` with their nickname (how to verify: `bun test` -- comment with author='guest', assert stored correctly)

## References

- Design doc §3.5 (Scoped fmodel CQRS): comments listed as 🟢 full CQRS domain
- Design doc §8 (Share model): tunnel participants use nickname-based attribution
- Entity 053 (context ready): Next.js app at `spacebridge/ui/`, shadcn Standard set, SSE via poll 500ms, filesystem parse
- Entity 056 (context ready): fmodel CQRS aggregate pattern (decider/evolve/types), dual-table persistence, Zod `.passthrough()`
- Entity 050 (shipped): `comments` table already in schema.ts with fmodel columns (commentId, entityPath, selectedText, sectionHeading, content, author, resolved, resolvedReason)
- Current dashboard: `tools/dashboard/src/comments.ts` -- JSON sidecar storage being replaced
- Current dashboard: `tools/dashboard/src/comments.ts:65-81` -- addSuggestion/applyBodyEdit for inline edit proposals (scope question for 054)

## Assumptions

A-1: Comment decider follows 056's lease decider pattern -- pure function at `spacebridge/src/domain/comment/decider.ts`, same structure (commands → decide → events, evolve → state).
Confidence: 🟢 Confident (0.95)
Evidence: entity 056 APPROACH establishes the pattern; design doc §3.5 classifies both leases and comments as 🟢 full CQRS; schema.ts:60-80 comments table already has fmodel columns (event_type, aggregate_id, sequence_number, payload)
→ Confirmed: captain, 2026-04-13 (batch)

A-2: Dual-table persistence -- `comments` table (snapshot projection, already in schema.ts) + new `comment_events` table (append-only event log). Same pattern as 056 O-1 (selected: dual table).
Confidence: 🟢 Confident (0.95)
Evidence: entity 056 O-1 captain selected dual table. schema.ts:62-80 comments table exists. Pattern is established and consistent.
→ Confirmed: captain, 2026-04-13 (batch)

A-3: Detail page at `/entity/[slug]` -- standard Next.js App Router dynamic route in `spacebridge/ui/app/entity/[slug]/page.tsx`.
Confidence: 🟢 Confident (0.95)
Evidence: entity 053 O-1 selected `spacebridge/ui/` as the Next.js app directory. Dynamic routes are core Next.js App Router feature, proven by 049 spike.
→ Confirmed: captain, 2026-04-13 (batch)

A-4: Entity body rendering via `react-markdown` (or `@next/mdx`) -- renders markdown to React components, compatible with Server Components.
Confidence: 🟢 Confident (0.85)
Evidence: react-markdown is the standard React markdown renderer, works with RSC. Entity body is markdown with YAML frontmatter. The frontmatter is already parsed separately (A-5 in 053); body needs markdown→HTML rendering.
→ Confirmed: captain, 2026-04-13 (batch)

A-5: Auto-resolve is event-driven -- when a `stage_transition` event is written to events table, the comment domain processes it as a command that triggers `comment_resolved` events for all comments anchored to the previous stage.
Confidence: 🟢 Confident (0.85)
Evidence: design doc §3.5 -- comments listed as full CQRS with "auto-resolve on stage advance" in the scope. The decider can accept a `resolve_by_stage_advance` command type that bulk-resolves by section_heading matching.
→ Confirmed: captain, 2026-04-13 (batch)

A-6: Comment reply threading uses `parent_id` field on the comments snapshot table -- flat storage with parent reference, not nested JSON.
Confidence: 🟢 Confident (0.90)
Evidence: schema.ts:62-80 comments table doesn't have a parent_id column yet, but addReply in comments.ts:29+ stores replies in a `thread: []` array. The CQRS version uses a flat table with parent_id for SQL queryability + LCD discipline. Requires adding `parent_id` column to comments table.
→ Confirmed: captain, 2026-04-13 (batch)

## Option Comparisons

### O-1: Reply threading depth

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Single-level replies (comment → replies, no nested replies) | Simple UI; flat query; matches existing dashboard pattern (comment.thread[]) | Can't have discussion threads deeper than 1 level | Low | Recommended |
| Unlimited nesting (each reply can have replies) | Full discussion capability | Recursive queries; complex UI rendering; indentation hell on narrow screens; overkill for code review comments | High | Not recommended |
| Two-level max (comment → reply → sub-reply, then stop) | Middle ground | Still needs recursion; marginal benefit over single-level | Medium | Viable |

Design doc invariant check: the current dashboard's `comment.thread[]` is single-level. Entity 054 is "parity part 1" -- matching existing capability. Deeper threading is a future enhancement, not parity. Return value trace: `GET /api/entities/[slug]/comments` returns flat list with parent_id → UI groups by parent → single-level nesting renders cleanly in a Card component.

→ Selected: Single-level replies -- captain, 2026-04-13

### O-2: Suggestions (inline edit proposals) scope

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Defer suggestions to v2 (054 = comments only) | Smaller scope; focus on CQRS foundation; suggestions add diff logic (applyBodyEdit) that crosses comment domain into entity-editing domain | No parity with existing dashboard's addSuggestion/acceptSuggestion | Low | Recommended |
| Include suggestions in 054 | Full parity with current dashboard; suggestions are tightly coupled to comments | Adds 3 more commands to decider (add_suggestion, accept_suggestion, reject_suggestion); applyBodyEdit needs entity file write access from the comment domain -- violates domain boundary | High | Not recommended |
| Suggestion commands in comment domain, apply logic in separate module | Clean domain boundary; comment domain only stores suggestions, a separate module applies edits | Still complex; partial parity but cleaner architecture | Medium | Viable |

Design doc invariant check: design doc §3.5 lists "Comments + replies (with auto-resolve)" as the 🟢 CQRS scope. Suggestions are not mentioned. Current dashboard's suggestions are a convenience feature, not a core coordination primitive. Entity title says "parity part 1" — suggestions can be part 2.

→ Selected: Defer suggestions to v2 -- captain, 2026-04-13. Open a separate draft entity to track suggestions scope and relationship to 054.

### O-3: Comment anchoring strategy

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Section-based anchoring (match by `section_heading`) | Matches existing comments.ts pattern; sections are stable across minor edits; simple to implement | Can't anchor to specific lines within a section; less precise | Low | Recommended |
| Line-based anchoring (line number + content hash) | Precise; code-review style | Line numbers shift on any edit; requires content-hash verification; complex reconciliation | High | Not recommended |
| Both (section default, optional line-level) | Maximum flexibility | Over-engineered for v1; line-level has the same instability issues | Medium | Viable |

Design doc invariant check: schema.ts:66-67 has `selected_text` and `section_heading` fields — both exist. The current dashboard uses section_heading for anchoring and selected_text for highlight context. This is proven and stable. Line-based is a v2 enhancement.

→ Selected: Section-based anchoring -- captain, 2026-04-13

## Open Questions

Q-1: Should the entity detail page include a stage history timeline (showing all stage transitions with timestamps), or is that a v2 feature?

Domain: User-facing Visual

Why it matters: The directive mentions "stage history timeline" but the events table may not have comprehensive stage transition data yet (depends on what FO writes during dispatch). Including it in v1 means querying the events table for `type: 'stage_transition'` events for this entity. Excluding it simplifies the detail page to: header + body + comments.

Suggested options: (a) Include -- query events table for stage transitions, render as a vertical timeline component. Data is available since FO writes stage events. (b) Exclude -- detail page is header + body + comments only. Stage history added when more event types are consistently written. (c) Minimal -- show current stage + previous stage only (from frontmatter, no events query).

→ Answer: (a) Include -- query events table for stage_transition events, render as vertical timeline. FO already writes stage events so data is available. Makes the detail page complete. -- captain, 2026-04-13

## UI Spec

### Design System
- Inherits from entity 053: shadcn/UI + Tailwind CSS v4 + Radix (same `spacebridge/ui/` app)
- Additional shadcn components needed beyond 053's Standard set: **Textarea** (comment input), **Avatar** (author attribution), **Collapsible** (comment threads)

### Component Hierarchy
```
app/entity/[slug]/page.tsx (Server Component -- fetch entity markdown + events + comments)
├── <EntityHeader> (Server Component -- Card with title, status Badge, stage Badge, owner Badge)
├── <StageTimeline> (Server Component -- vertical timeline from events table)
│   └── <TimelineEntry> (stage name + timestamp + duration)
├── <EntityBody> (Server Component -- react-markdown rendered body)
│   └── <SectionWithComments> (section heading + markdown content + anchored comments)
│       └── <CommentThread> (Client Component -- "use client" for reply form)
│           ├── <Comment> (Card -- author Avatar, content, timestamp, resolve button)
│           └── <ReplyForm> (Textarea + Button -- POST to /api/.../reply)
└── <AddCommentForm> (Client Component -- select section, write comment, POST)

app/api/entities/[slug]/comments/route.ts (GET list, POST add)
app/api/entities/[slug]/comments/[id]/reply/route.ts (POST reply)
app/api/entities/[slug]/comments/[id]/resolve/route.ts (POST resolve)
```

### Layout Pattern
- **Desktop**: Single-column, full-width content. Entity header at top, stage timeline below header (horizontal or vertical), markdown body with inline comments anchored per section, add-comment form at bottom.
- **Mobile (v1)**: Same single-column, natural responsive behavior. No special mobile treatment.

### Key Interactions
- Click entity card in war room → navigate to `/entity/[slug]`
- Comment form: select section heading from dropdown → write content → submit
- Reply: click "Reply" on comment → inline reply form expands (Collapsible)
- Resolve: click "Resolve" → comment visually dimmed, `resolved: true`
- Auto-resolve: when stage advances, resolved comments show "Auto-resolved: stage advanced" badge
- New comments from other sessions appear via SSE → page revalidation or client-side append

### Empty / Loading / Error States
- **No comments**: "No comments yet. Be the first to comment on this entity." prompt
- **Loading**: Skeleton for entity body and comment threads
- **Entity not found**: 404 page with "Entity not found" message and back-to-war-room link
- **Comment submit error**: Toast notification with error message, form retains input

### Comment Attribution
- `captain`: displayed as "Captain" with distinct avatar color
- `fo`: displayed as "First Officer" with role badge
- `guest`: displayed as nickname (from tunnel share link) with guest badge

## Stage Report: explore

- [x] Files mapped: 15 across ui(new), domain(new), schema, dashboard(reference)
  ui: ~6 new files (detail page, route handlers, comment components); domain: ~5 new (comment decider, evolve, types, tests); schema: 2 read + 1 modify (add comment_events table + parent_id column); dashboard: 1 reference (comments.ts for parity comparison)
- [x] Assumptions formed: 6 (🟢 Confident: 6, 🟡 Likely: 0, 🔴 Unclear: 0)
  A-1 through A-6 all Confident (0.85-0.95); decider pattern, dual-table, dynamic route, markdown rendering, auto-resolve, flat threading
- [x] Options surfaced: 3
  O-1 reply threading depth; O-2 suggestions scope; O-3 comment anchoring strategy
- [x] Questions generated: 1
  Q-1 stage history timeline scope
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: confirmed Medium
  ~15 files across 4 layers; cohesive "detail view + comments domain" unit; decomposition not recommended
- [x] Research dispatched: 0 researchers (skipped -- all patterns established by 056/053, no external tech claims)

## Stage Report: clarify

- [x] Assumptions confirmed: 6 / 6
  All batch-confirmed by captain, 2026-04-13. Zero reclassified.
- [x] Options selected: 3 / 3
  O-1: Single-level replies. O-2: Defer suggestions to v2 (open separate entity). O-3: Section-based anchoring.
- [x] Questions answered: 1 / 1
  Q-1: Include stage history timeline -- query events table for stage_transition events.
- [x] UI Spec produced: yes
  Component hierarchy (detail page + comment threads + route handlers), layout pattern (single-column), comment attribution model, additional shadcn components (Textarea, Avatar, Collapsible).
- [x] Sufficiency gate: PASS
  All assumptions confirmed, all options selected, all questions answered, UI Spec produced, zero unresolved items.
