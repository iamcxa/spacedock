---
id: 100
title: "Spacebridge Cloud — multi-tenant collaborative war room with CC bridge"
status: draft
context_status: none
source: captain (2026-04-14 SO session)
created: 2026-04-14T19:30:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Large
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: []
---

## Directive

> Host the spacebridge UI on a cloud platform (e.g., Vercel) as a multi-tenant collaborative war room. Two operating modes: **Solo mode** (zero-config, no auth required) and **Cloud mode** (Google OAuth + multi-tenant). Solo mode is the out-of-the-box default — same logic, same UI, but single-user with no auth setup required. Cloud mode layers auth, persistence, and sharing on top.
>
> **Solo mode (default, zero-config):**
> - No Google OAuth, no Supabase Auth — just deploy and connect CC
> - Single implicit user, all repos/entities visible to whoever has the URL
> - Data persists in Supabase (or local SQLite fallback) but no user isolation
> - CC connects via WebSocket, bidirectional sync works identically
> - Sharing: all entities are "public" by default (no ACL layer)
> - Use case: individual developer who wants cloud-hosted UI without auth ceremony
>
> **Cloud mode (opt-in via env config):**
> - Google OAuth registration/login via Supabase Auth
> - Multi-tenant data model: Users -> Repos -> Entities (three-layer)
> - Privacy default: after login, user's repos and entities are private
> - Entity sharing: manually set individual entities to "public" (like Notion/HackMD)
> - Collaborative commenting: on shared entities, any viewer can comment, CC responds on reconnect
>
> **Shared behaviors (both modes):**
> 1. **Repo connection**: User connects local CC + MCP to the cloud UI. When online, bidirectional real-time sync via WebSocket. When offline, diffs are queued.
> 2. **Reconnect pull**: On CC reconnection, pull all pending diffs + comments accumulated while offline. CC should automatically respond to queued comments.
> 3. **Collaborative commenting**: On accessible entities, viewers can post comments. CC responds on next connected session. Bidirectional comment flow: viewer -> cloud -> CC -> cloud -> viewer.
>
> The core insight: the remote UI only renders the connected repo's content. It's not a separate data source — it's a cloud mirror of the local CC session's filesystem, with persistence and sharing layered on top. The auth layer is orthogonal to the sync/render layer — adding or removing auth doesn't change how CC connects or how entities render.
>
> Mode switch: single env var (e.g., `SPACEBRIDGE_AUTH=google` enables Cloud mode; absent or `SPACEBRIDGE_AUTH=none` is Solo mode). All auth-dependent code paths check this flag. Solo mode skips auth middleware entirely — no token setup, no OAuth redirect, no user table queries.
