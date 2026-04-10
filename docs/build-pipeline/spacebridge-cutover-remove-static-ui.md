---
id: 060
title: "Cutover — delete engine tools/dashboard/static"
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
scale: Small
project: spacedock
depends-on: [059]
---

## Problem

Once the spacebridge plugin reaches full feature parity with the old static dashboard and users have migrated, the legacy `tools/dashboard/static/*` files in the engine repo become dead code. They add maintenance burden, confuse contributors about which UI is authoritative, and bloat the engine. This entity is the final cleanup: remove the old static UI from the engine, keeping only the data-layer code that serves as the in-process default `ChannelProvider` implementation.

## Scope

- Delete `tools/dashboard/static/*` (HTML, JS, CSS files for the old single-session UI)
- Verify engine data-layer code is preserved: `db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`
- Update engine's default in-process `ChannelProvider` to remove references to static file serving
- Update any engine tests that depend on static UI files
- Update documentation: README, CLAUDE.md, any references to `tools/dashboard/static/`
- Migration guide: brief note for any users who relied on the old static UI

## Acceptance Criteria

- [ ] `tools/dashboard/static/` directory is removed from the engine repo
- [ ] Engine data-layer code (`db.ts`, `snapshots.ts`, `api.ts`, `entity-resolver.ts`, `frontmatter-io.ts`, `events.ts`) is preserved and functional
- [ ] Engine's in-process `ChannelProvider` works without static files (headless mode)
- [ ] All engine tests pass after removal
- [ ] No broken references to deleted files in documentation or code
- [ ] PR targets clkao/spacedock (upstream engine repo)

## References

- Design doc §2.4 (What happens to tools/dashboard/): phased removal plan (short/medium/long term)
