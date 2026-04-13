---
id: 090
title: "Shipped stage mod (pr-review-loop) + graft shipped_config migration"
status: draft
context_status: pending
source: /build
created: 2026-04-13T23:30:00Z
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
---

## Directive

> Implement the pr-review-loop mod for the shipped stage, then add a graft migration path that converts LOCAL.yaml `shipped_config` to the mod format.

## Captain Context Snapshot

- **Repo**: main @ spacedock
- **Session**: graft init carlove (2026-04-13) — shipped stage left unconfigured, opted for LOCAL.yaml shipped_config as interim
- **Domain**: build-pipeline (shipped stage), graft (localize sub-command)
- **Related entities**: entity 050 (spacebridge skeleton), Phase E+1 scope
- **Created**: 2026-04-13

## Brainstorming Spec

**APPROACH**: Two-part delivery:
1. Implement `mods/pr-review-loop.md` — the shipped stage mod that FO loads via merge/idle/startup hooks. Handles: PR summary from entity body, `gh pr create`, PR state polling, CHANGES_REQUESTED reset, APPROVED merge, post-merge archive.
2. Add `graft localize` migration: detect `shipped_config` in LOCAL.yaml → generate project-specific mod → remove shipped_config section → update manifest.

**ALTERNATIVE**: Keep shipped_config in LOCAL.yaml permanently — D-01 rejected because mod is the architecturally correct mechanism and shipped_config has limited expressiveness (no state machine, no hooks).

**GUARDRAILS**:
- FO mod loading mechanism must be defined before implementing the mod itself
- Graft migration must be non-destructive (backup shipped_config before removal)
- Projects without shipped_config should not be affected by the migration

**RATIONALE**: shipped_config was chosen as interim because mod spec didn't exist yet. Once mod spec ships, the migration closes the gap and unifies all shipped-stage behavior under one mechanism.

## Acceptance Criteria

- pr-review-loop mod exists at `mods/pr-review-loop.md` with merge/idle/startup hooks (how to verify: file exists with hook definitions)
- FO loads mods from `mods/` directory at startup and attaches hooks to stages (how to verify: FO dispatch with mod present triggers hooks)
- `graft localize` detects shipped_config in LOCAL.yaml and offers migration (how to verify: run graft localize on a repo with shipped_config)
- Migration produces a working mod file that references the skills from shipped_config (how to verify: FO reads generated mod and invokes correct skills)
- Projects without shipped_config are unaffected by graft localize (how to verify: run graft localize on a repo without shipped_config)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate)

## Canonical References

(clarify stage will populate)
