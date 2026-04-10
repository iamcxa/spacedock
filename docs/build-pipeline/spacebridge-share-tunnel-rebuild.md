---
id: 058
title: "spacebridge share tunnel rebuild"
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
depends-on: [057]
---

## Problem

Pre-SaaS multi-human collaboration requires sharing a specific entity's live state with external collaborators (reviewers, domain experts, teammates) without requiring them to install anything. The existing `/dashboard share` tunnel functionality needs to be rebuilt for the spacebridge architecture: SSE-based transport (reliable through tunnels), entity-scoped bearer-token auth, and rate limiting to prevent abuse if share links leak.

## Scope

- `spacebridge share --entity <slug>` command: creates a share token scoped to one entity
- Tunnel backend abstraction: support cloudflared named tunnels, ngrok, and tailscale funnel
- Share token management:
  - Bearer-token URLs: `https://<random>.spacebridge.dev/<share_id>`
  - Token scoped to specific entity (not whole workflow or bridge)
  - Default 7-day expiry, configurable
  - `spacebridge share --revoke <share_id>` to revoke tokens
- External collaborator view: read-only entity detail + live SSE feed + comment form
- Comment attribution: nickname-based (no verified auth in v1)
- Comments from tunnel participants become events in bridge event stream, visible to SO/FO
- Rate limiting at daemon: N requests per minute per share token
- Drizzle storage for share tokens (reuse/migrate from existing ShareRegistry concept)

## Acceptance Criteria

- [ ] `spacebridge share --entity <slug>` creates a share token and prints a URL
- [ ] External user can open share URL in browser and see entity live state via SSE
- [ ] External user can leave comments via the share page
- [ ] Comments appear in the bridge event stream and are visible to local SO/FO sessions
- [ ] Share tokens expire after configured duration (default 7 days)
- [ ] `spacebridge share --revoke <share_id>` invalidates a token immediately
- [ ] Rate limiting prevents abuse (configurable N requests/minute/token)
- [ ] SSE works through cloudflared tunnel without degradation
- [ ] Share view is entity-scoped: no access to other entities or workflow-level data

## References

- Design doc §6.1 (Use case): collaboration flow description
- Design doc §6.2 (Why SSE makes this easy): tunnel reliability rationale
- Design doc §6.3 (Auth model v1): bearer-token URL design and limitations
- Design doc §6.4 (Rate limiting): abuse prevention strategy
