---
id: 125
title: Decouple SD UI from spacedock fork; extract as independent CC plugin
slug: decouple-ui-plugin
status: draft
context_status: pending
source: /shape
created: 2026-04-16T10:26:27Z
shape_status: validated
intent:
scale:
project: spacedock
---

## Captain Context Snapshot

**Invocation timestamp**: 2026-04-16T10:26:27Z

**Raw directive**: Decouple spacedock UI from spacedock fork; extract as independent CC plugin that reads spacedock entity markdown via explicit schema contract.

**Upstream conversation context** (Musk-perspective session 2026-04-16):

- Current coupling: UI lives inside `spacebridge/ui/` (Next.js 16 + Radix + better-sqlite3). spacedock fork churn forces UI to re-merge.
- Proposed target: UI extracted to independent repo / plugin. Reads entity markdown via explicit `docs/contracts/entity-schema.md` contract. spacedock fork focuses on skills + schema only.
- clkao independent confirmation (Slack thread 2026-04-16): sharability of workflows is a real problem; his current workaround is "tell FO to create a concise commission prompt to replicate the workflow".
- Primary owner of the pain: Kent (reduces fork-sync burden). Secondary owner: future plugin users who install sd-ui without forking spacedock.
- Related but OUT of this shape: Q2 "workflow as plugin" (build-flow extraction), build-flow diet, `build-setup` skill. Those are separate shape candidates scheduled after Q1 ships + diet runs.
- Technical pre-existence: `spacebridge/.claude-plugin/plugin.json` + `spacebridge/ui/` already structurally separable. This shape focuses on CONTRACT design + repo-split discipline, not greenfield UI work.

## Problem Statement

The spacedock dashboard UI lives inside `spacebridge/ui/` within the spacedock fork, so every upstream spacedock change requires Kent to re-merge or re-align UI code against fork drift. The UI is functionally independent — it only reads entity markdown and schema on disk — yet repo coupling forces it to move in lockstep with spacedock internals. This creates recurring maintenance toil on every fork sync and makes the UI impossible to share with teams who have not forked spacedock. The contract between UI and entity schema is implicit (unwritten), so even trivially separable code behaves as tightly coupled in practice. The cost compounds each time spacedock moves, and Kent is the sole person absorbing it today.

## User Stories

- **US-1**: As Kent maintaining a spacedock fork, I want the dashboard UI to live in a separate repository with a defined contract to spacedock's entity schema, so that upstream spacedock changes do not require me to re-merge UI code on every fork sync.
- **US-2**: As Kent iterating on the dashboard UI, I want to develop and test UI changes without touching spacedock internals, so that UI iteration cycles are independent of the build pipeline's release cadence.
- **US-3**: As an external team member installing sd-ui, I want to install the dashboard as a standalone plugin without forking spacedock, so that my team can adopt the UI without taking on spacedock fork maintenance burden.
- **US-4**: As clkao evaluating whether sharability is real, I want to read a written contract specifying what entity schema fields and file paths the UI reads, so that I can verify the UI's claimed independence from spacedock internals is mechanically enforced rather than aspirational.
- **US-5**: As Kent maintaining a spacedock fork, I want fork-sync operations to leave the UI layer untouched when spacedock internals change but the schema contract is stable, so that the recurring merge toil on every upstream advance is eliminated.

## Scope: In

- A written contract document (`CONTRACT.md` in the new sd-ui repo) enumerating every entity schema field and file path the UI reads from disk, with enough specificity for mechanical verification (grep or static analysis).
- Verification that the existing `spacebridge/ui/` Next.js app reads ONLY the fields named in the contract; findings written into CONTRACT.md as ground-truth baseline. Violations (if any) documented, not silently fixed.
- `.claude-plugin/plugin.json` populated with minimum fields for standalone CC plugin install (name, version, description, entrypoint).
- Instructions (README) allowing an external team member to install sd-ui as a CC plugin without forking spacedock, pointing at a local or remote entity directory.
- `spacebridge/ui/` confirmed as self-contained subtree — no import/require paths crossing into spacedock-internal modules outside the contract boundary.
- A runnable fork-sync test script that confirms "when spacedock internals change but CONTRACT.md fields are stable, no UI file needs to change" — reads CONTRACT.md field list, checks paths/fields exist in current entity schema, passes or fails with diff.
- Git repo extraction: `spacebridge/ui/` extracted to `git@github.com:iamcxa/spacedock-ui.git` as a standalone repository (git filter-branch or subtree split preserving history), with plugin.json + CONTRACT.md + README in place.

## Scope: Out

- Any new UI features, visual redesigns, or component refactors — this shape is repo-split + contract only.
- Q2 workflow-as-plugin extraction (build-flow diet + sharability) — separate shape, scheduled after Q1 ships.
- build-flow diet (Idiot Index audit + delete-in-place) — spacedock-internal refactor, not sd-ui work.
- `build-setup` skill / bootstrap automation — deferred until override pattern emerges from dogfood.
- Entity schema redesign / new fields — schema already canonical; this shape writes it down, does not change it.
- Daemon / IPC / tunnel / share-token changes — current infra kept as-is; audit only UI surface reads.
- Multi-tenant, SaaS, or hosted sd-ui — solo-broadcaster + small-team install only.
- Automated CI schema-drift detection (could expand: wire CONTRACT.md into PR gate) — runnable script delivered, CI integration deferred to avoid scope creep into spacedock CI config.

## References

- `spacebridge/ui/` — current UI location (Next.js 16 + Radix + better-sqlite3 standalone build)
- `spacebridge/.claude-plugin/plugin.json` — existing plugin shell
- `spacebridge/src/schema.ts` / `spacebridge/src/schema.test.ts` — current schema definitions (15K+ lines test coverage)
- `spacebridge/package.json` — current dependency manifest (MCP SDK, Drizzle, Zod)
- Slack thread 2026-04-16 (clkao + even): confirmed sharability as real team problem; clkao's workaround = "tell FO to create a concise commission prompt to replicate workflow"
- Slack thread 2026-04-08 (even): "Kinda realized and understood how powerful Spacedock is by using it in a visual way" — dashboard UI is the team onboarding unlock
- Target repo: `git@github.com:iamcxa/spacedock-ui.git`

## Stage Report: shape

- **Directive**: Decouple SD UI from spacedock fork; extract as independent CC plugin that reads spacedock entity markdown via explicit schema contract
- **Subagent dispatches**: framer (3 candidates), story-gen (5 stories), scope-drafter (7 In / 8 Out bullets)
- **Captain accepts**: Problem Statement = Candidate A (fork-coupling toil); User Stories = all 5 accepted; Scope In = 7 bullets (6 original + git split added by captain with target repo); Scope Out = 8 bullets accepted as-is
- **Pressure test (Step 5.5)**: Goal confirmed (UI fully decoupled from fork); Gap confirmed (contract + repo split); 7 In bullets confirmed minimal for gap closure
- **Final story count**: 5
