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

> Host the spacebridge UI on a cloud platform (e.g., Vercel) as a multi-tenant collaborative war room. Users register via Google OAuth (Supabase Auth), connect their local CC + MCP sessions, and get a persistent cloud dashboard of their workflows. Data model is three-layer: Users -> Repos -> Entities. Key behaviors:
>
> 1. **User auth**: Google OAuth registration/login via Supabase Auth.
> 2. **Repo connection**: User connects local CC + MCP to the cloud UI. When online, bidirectional real-time sync via WebSocket. When offline, diffs are queued.
> 3. **Reconnect pull**: On CC reconnection, pull all pending diffs + comments accumulated while offline. CC should automatically respond to queued comments.
> 4. **Privacy default**: After login, user's repos and entities are private (only visible to the user).
> 5. **Entity sharing**: User can manually set individual entities to "public" (like Notion/HackMD public page mode). Use the simpler approach between share tokens (existing pattern) and public toggle.
> 6. **Collaborative commenting**: On a shared/public entity, any viewer can post comments. CC responds to these comments on the next connected session. Bidirectional comment flow: viewer -> cloud -> CC -> cloud -> viewer.
>
> The core insight: the remote UI only renders the connected repo's content. It's not a separate data source — it's a cloud mirror of the local CC session's filesystem, with persistence and sharing layered on top.
>
> SQLite -> Supabase Postgres migration for cloud persistence. MCP stdio -> WebSocket transport for network bridge. Per-entity visibility ACL for sharing.
