---
id: 054
title: "Entity detail page + comments API (parity part 1)"
status: draft
context_status: pending
source: spacebridge design doc (2026-04-10-spacebridge-engine-bridge-split-design.md)
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
