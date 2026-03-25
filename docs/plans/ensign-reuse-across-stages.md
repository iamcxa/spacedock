---
title: Ensign reuse across stages
status: ideation
source: email-triage testflight
started: 2026-03-25T02:20:00Z
completed:
verdict:
score: 0.65
worktree:
---

The email-triage pipeline discovered that an ensign can be reused across consecutive stages by sending it the next task via SendMessage instead of shutting down and respawning. The ensign retains context from the prior stage (e.g., knows entity IDs from intake without re-parsing).

Current first-officer template always shuts down an ensign after each stage and spawns a fresh one. This wastes context and adds spawn overhead.

The reuse pattern: spawn once → complete stage → SendMessage with next stage's work → complete next stage → shutdown. The first officer skips worktree creation if the entity already has an active worktree from the prior stage.

Scope: update the first-officer template in SKILL.md to support ensign reuse when consecutive stages use the same worktree (or both run on main). Fresh ensigns should still be used when validation independence matters (implementation → validation).
