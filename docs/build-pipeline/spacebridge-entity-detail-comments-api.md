---
id: 054
title: "Entity detail page + comments API (parity part 1)"
status: draft
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

## Problem

The current dashboard's entity detail page and comment system are core interaction surfaces for Science Officer discuss-phase work. The spacebridge UI must reach feature parity with these before the old static UI can be retired. Comments are a 🟢 full fmodel CQRS domain: they are intent-driven (command → event), benefit from replay (tunnel participants catching up), and need pure-function testability to avoid race conditions across sessions.

## Scope

- Entity detail page: full entity view with frontmatter, body content, stage history, activity timeline
- Comments API as fmodel CQRS aggregate:
  - Commands: `add_comment`, `reply_to_comment`, `resolve_comment` (auto-resolve on stage advance)
  - Events: `comment_added`, `reply_added`, `comment_resolved`
  - Pure decider function (no I/O, testable with `assert.deepEqual`)
- Comments storage in Drizzle schema (LCD discipline from entity 050)
- REST endpoints via Next.js Route Handlers: `POST /api/entities/:slug/comments`, `GET /api/entities/:slug/comments`
- SSE integration: new comments push to live feed in real-time
- Comment routing: comments from tunnel participants and local sessions routed to the entity's lease owner

## Acceptance Criteria

- [ ] Entity detail page renders full entity content (frontmatter + body + stage history)
- [ ] Comments can be added via API and appear on the detail page
- [ ] Reply threading works (reply to a specific comment)
- [ ] Comments resolve automatically when entity advances past the relevant stage
- [ ] fmodel decider is pure and has unit tests with no mocks
- [ ] SSE pushes new comments to all connected clients in real-time
- [ ] Comments from tunnel participants are correctly attributed (nickname-based, pre-auth)
- [ ] Drizzle schema for comments follows LCD discipline

## References

- Design doc §3.5 (Scoped fmodel CQRS): comments listed as 🟢 full CQRS domain
