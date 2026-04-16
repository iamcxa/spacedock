---
id: 120
title: "Spacebridge Session List UI -- Connected Sessions + Repo Visibility"
status: draft
context_status: none
source: entity 060 shape + captain directive (2026-04-16 "要可以看到連上去的 session 是誰，repo 有哪些")
created: 2026-04-16T20:03:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
parent: 060
children:
depends-on: [057]
---

## Directive

Add a "Connected Sessions" page or panel to Spacebridge's Next.js UI that surfaces the session registry data from entity 057's shipped domain layer (`spacebridge/src/domain/session/`). Captain must be able to see: which CC sessions are connected, which repo (projectRoot) each session owns, liveness status (last heartbeat), and a session picker to switch which repo's entities are displayed. Currently the UI hard-codes the first session's projectRoot (`entity/[slug]/page.tsx:59-66`); this entity replaces that with an explicit session-aware routing model.

## Captain Context Snapshot

Spawned from entity 060 shape session (2026-04-16). Captain asked: "要可以看到連上去的 session 是誰，repo 有哪些". Entity 057 (multi-root session registry) shipped the fmodel CQRS domain layer with `sessionRegistry.getState()` + `getActiveProjectRoots()`, but no UI page exposes this data. Daemon supports multiple CC sessions connecting simultaneously; UI must reflect this.

Domain: `spacebridge-ui-session-management`.
