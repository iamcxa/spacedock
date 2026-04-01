---
id: 081
title: Team name collision across sessions
status: backlog
source: CL
started:
completed:
verdict:
score:
worktree:
pr:
---

The first-officer startup step 3 deletes stale team directories (`rm -rf ~/.claude/teams/{name}/`) and recreates with the same name. This causes orphaned agent processes, phantom team members, and "two ensigns working" scenarios when a session creates/destroys teams multiple times.

Fix: never delete existing team directories. Use numeric suffixes to find a free name (`spacedock-plans`, `spacedock-plans-2`, `spacedock-plans-3`).

Affects: `templates/first-officer.md` (startup step 3), `agents/first-officer.md` (same).
