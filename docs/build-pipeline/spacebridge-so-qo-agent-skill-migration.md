---
id: 055
title: "SO/QO agent + build-* skill namespace migration"
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
depends-on: [054]
---

## Problem

Science Officer (SO) and Quality Officer (QO) roles belong in the bridge plugin because their work is interaction-heavy and depends on the bridge's messaging surface. The build-* skills (build-brainstorm, build-explore, build-clarify, build-quality, build-pr-review, build-ship) currently live in the spacedock engine namespace (`spacedock:build-*`). They need to migrate to the spacebridge plugin namespace since they are part of the "build studio" — the interaction-driven workflow surface that the bridge owns.

## Scope

- Create SO agent file in spacebridge plugin (`agents/science-officer.md`)
- Define QO as mod hook (v1, not agent) per §5.4 — register hooks for `entity.stage_transition` and `entity.ready_for_verify`
- Mod registration API: `bridge.mods.register({ id, hooks })` with documented hook signatures
- Migrate build-* skills from `spacedock:build-*` to `spacebridge:build-*` namespace
- Ensure backward compatibility: `spacedock:build-*` aliases or deprecation warnings during transition
- Define mod API shape: hook names, signatures, invocation model (inline vs subagent vs background)
- Wire SO agent to use `CoordinationClient.getAvailableWork('SO')` for work discovery

## Acceptance Criteria

- [ ] SO agent file exists in spacebridge plugin and is loadable
- [ ] QO mod hook fires on `entity.stage_transition` to `pr-draft` stage
- [ ] QO mod hook fires on `entity.ready_for_verify` and invokes review skills
- [ ] build-* skills are accessible under `spacebridge:build-*` namespace
- [ ] `spacedock:build-*` invocations produce deprecation warning but still work
- [ ] Mod API documented: hook names, signatures, registration pattern
- [ ] SO uses `CoordinationClient` for work discovery (not hardcoded entity scanning)
- [ ] Multiple mods can register for the same hook without conflict

## References

- Design doc §2.3 (Why SO in bridge, FO in engine): role placement rationale
- Design doc §5.4 (QO as mod hook v1): mod API design and QO-as-agent future path
- Design doc §5.5 (FO prompt modifications): coordination wiring pattern SO also uses
