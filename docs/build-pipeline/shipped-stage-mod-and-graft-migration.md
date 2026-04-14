---
id: 090
title: "Shipped stage mod (pr-review-loop) + graft shipped_config migration"
status: clarify
context_status: ready
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
1. Implement `mods/pr-review-loop.md` — the shipped stage mod that FO loads via merge/idle/startup hooks. Handles: PR summary from entity body, `gh pr create`, PR state polling, CHANGES_REQUESTED reset, APPROVED merge, post-merge archive. (⚠ contradicted: mod already exists at mods/pr-review-loop.md with 89-line implementation covering startup/idle/merge hooks -- see Q-1)
2. Add `graft localize` migration: detect `shipped_config` in LOCAL.yaml → generate project-specific mod → remove shipped_config section → update manifest. (⚠ contradicted: shipped_config does not exist in any actual YAML file, only in entity documentation; entity 097 graft-runtime-overlay-redesign would supersede this migration -- see Q-1)

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

## Assumptions

A-1: `mods/pr-review-loop.md` already exists with full implementation (89 lines) covering startup, idle, and merge hooks with skill delegation to kc-pr-flow.
Confidence: 🟢 Confident (0.95)
Evidence: `mods/pr-review-loop.md:1-89` -- complete mod with 3 hooks (startup, idle, merge), error handling, thin-wrapper principle, kc-pr-create and kc-pr-review-resolve delegation
→ Confirmed: captain, 2026-04-14 (batch)

A-2: FO mod loading mechanism already exists with library/workflow-specific two-tier system.
Confidence: 🟢 Confident (0.95)
Evidence: `references/first-officer-shared-core.md:20` -- "Workflow mods: {workflow_dir}/_mods/*.md"; `:390-391` -- library mods at repo root `mods/`, workflow-specific at `{workflow_dir}/_mods/`, name-based override
→ Confirmed: captain, 2026-04-14 (batch)

A-3: `shipped_config` does not exist in any actual YAML/code file -- it is documentation-only, referenced exclusively in entity files (090, 097).
Confidence: 🟢 Confident (0.85)
Evidence: `grep shipped_config` across `*.yaml` returns 0 matches; all 12 hits are in `docs/build-pipeline/*.md` entity/doc files. The "carlove interim" may have been a verbal design decision that was never committed.
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Entity 097 (graft-runtime-overlay-redesign, Large, pending) plans to completely replace graft's build-time merge with runtime overlay, which would eliminate LOCAL.yaml's current structure and make any shipped_config migration moot.
Confidence: 🟡 Likely (0.75)
Evidence: `docs/build-pipeline/graft-runtime-overlay-redesign.md:26` -- "Redesign graft from build-time merge to runtime overlay. Eliminates _origin/, merged README, and the entire 3-way merge upgrade path."
→ Confirmed: captain, 2026-04-14 (batch)

## Option Comparisons

### O-1: Entity 090 disposition -- both parts pre-shipped or superseded

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Close as pre-shipped -- Part 1 done, Part 2 absorbed by 097 | Honest about reality; avoids building migration for a system about to be redesigned | Loses formal AC verification for Part 1 | Low | Recommended |
| Keep Part 2 alive as 097 subtask | Preserves the migration intent within the correct architectural context (097) | 097 is Large and may not ship soon | Low | Viable |
| Implement Part 2 now against current graft | Satisfies original AC | Builds against architecture about to be replaced by 097; wasted work | High | Not recommended |

→ Selected: Close as pre-shipped -- Part 1 done, Part 2 absorbed by 097 (captain, 2026-04-14, interactive)

## Open Questions

Q-1: Entity 090's primary deliverables are either already shipped (Part 1: pr-review-loop mod) or superseded by entity 097 (Part 2: graft shipped_config migration). How should the entity lifecycle be handled?

Domain: Organizational/Data-transforming
Why it matters: Part 1 (mod) already exists with full implementation. Part 2 (graft migration) targets a concept (shipped_config) that only exists in documentation and will be superseded by 097's graft redesign. Implementing Part 2 now would build against architecture about to be replaced.
Suggested options: (a) Close as pre-shipped + absorbed -- Part 1 verified done, Part 2 deferred to 097; (b) Keep entity open for Part 2 only, blocked on 097

→ Answer: Close as pre-shipped + absorbed -- Part 1 verified done, Part 2 deferred to 097. Entity reaches terminal state at clarify/ready (same pattern as entity 061). (captain, 2026-04-14, interactive)

## Decomposition Recommendation

Not warranted. Part 1 is already shipped. Part 2 is superseded. No implementation work remains that would benefit from decomposition.

## Canonical References

- `mods/pr-review-loop.md` -- Part 1 deliverable, already exists (89 lines)
- `references/first-officer-shared-core.md:390-391` -- FO mod loading two-tier system
- `docs/build-pipeline/graft-runtime-overlay-redesign.md` (entity 097) -- supersedes Part 2

## Stage Report: explore

- [x] Files mapped: 5 across mod, config, skill, entity
  mod: 1 (pr-review-loop.md, exists), config: 1 (first-officer-shared-core.md mod loading), skill: 1 (graft/SKILL.md, no shipped_config), entity: 2 (090 self, 097 supersedes Part 2)
- [x] Assumptions formed: 4 (Confident: 3, Likely: 1, Unclear: 0)
  A-1 mod exists (0.95), A-2 FO loading exists (0.95), A-3 shipped_config is doc-only (0.85), A-4 097 supersedes (0.75)
- [x] Options surfaced: 1
  O-1 entity disposition (close vs keep Part 2 vs implement now)
- [x] Questions generated: 1
  Q-1 entity lifecycle -- both parts pre-shipped or superseded
- [x] α markers resolved: 0 / 0
  No α markers in brainstorm
- [x] Scale assessment: revised from Medium to Small
  Part 1 done (0 files to create), Part 2 superseded. Remaining work is documentation/verification only.
- [x] Research dispatched: 0 researchers (skipped -- all assumptions internal codebase architecture, no external tech claims)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity closing as pre-shipped + absorbed
- [x] Re-validation: 4 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  Evidence verified same session
- [x] Assumptions confirmed: 4 / 4 (0 corrected)
  A-1 through A-4 confirmed via batch
- [x] Options selected: 1 / 1
  O-1 close as pre-shipped -- Part 1 done, Part 2 absorbed by entity 097
- [x] Questions answered: 1 / 1
  Q-1 entity lifecycle -- close as pre-shipped + absorbed, terminal at clarify/ready
- [x] Open exploration: 0 gray areas surfaced
  Skipped -- entity closing, no meaningful gray areas remain
- [x] Canonical refs added: 0
  3 refs already populated from explore
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered. Terminal entity -- does NOT advance to plan.
- [x] Handoff mode: loose (terminal)
  Entity is terminal at clarify/ready -- Part 1 pre-shipped, Part 2 absorbed by 097. No FO execution needed.
- [x] Clarify duration: 2 questions asked, session complete
  1 batch confirmation + 1 O-1 AskUserQuestion (Q-1 answered inline from O-1)
