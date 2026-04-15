---
slug: build-entry-routing-and-alignment-gate
shape_status: validated
context_status: pending
---

## Captain Context Snapshot

- **Invoked**: 2026-04-15 via `/spacedock:build-shape`
- **Captain directive (verbatim)**:

  > build-entry-routing-and-alignment-gate -- (1) /build 總是跑 Sonnet 守門員，hedge-word + concrete-target 兩軸判斷 directive 明確性，明顯不明確時主動提議轉 /spacedock:build-shape；(2) build-shape 可自 seed entity（入口 B）— 看到 raw directive 時呼叫 /build seed 邏輯產 entity 再做 product 對齊，看到 existing slug 只做對齊；(3) SO 管線在 N-lens brainstorm 之後、explore 之前插 alignment-gate — captain 輕量對齊方向，支援「對 → 繼續 deep research」「不對但方向可調 → 回 brainstorm 重跑」「product 層有問題 → escalate 到 build-shape」三條分支。基於 entity 104 (brainstorm-nuwa-distillation, shipped) + 105 (explore-nuwa-subagent-first, shipped) 已落地的 N-lens + subagent-first 架構之上加 stage-editing + 入口編排。

- **Pre-shape conversation context**: Captain and SO diagnosed that SO's 3-stage flow (brainstorm → explore → clarify) is over-engineered for meta / skill-tweak entities. After reviewing entity 102's decomposition children (104 shipped 1.00, 105 shipped 0.99 — N-lens + subagent-first already landed), captain proposed three additions on top: (a) Sonnet gatekeeper on `/build` to auto-suggest `/shape` when directive is unclear, (b) `/shape` as an independent entry that can self-seed entities from raw directives, (c) alignment-gate between brainstorm and explore with three branches (continue / retry brainstorm / escalate to shape). Two captain decisions locked before invoking shape: gatekeeper lives inside `/build` (not captain self-judgment), shape auto-seeds on raw directive (option β).

## Problem Statement

The SO pipeline's stages are sequenced linearly with no alignment checkpoints wired between them, structurally locking captain judgment — the cheapest and highest-signal correction available — out of the interior of the flow, and this rigidity compounds in three ways. First, every SO traversal imposes a fixed latency before the captain's first alignment moment: brainstorm must complete, then explore must complete, before clarify even reaches captain — by which point deep-research budget has already been spent on directions a captain could have redirected in seconds. Second, clarify itself surfaces questions captain cannot meaningfully answer (skill-internal wording, section-level phrasing) and captain ends up guessing by confidence score, because the pipeline lacks a rule that filters out questions whose answer is already pinned by code-level evidence and only escalates genuine unresolved gaps. Third, the serial wiring throttles throughput: entities captain drafts pile up faster than SO-then-FO can consume them one-at-a-time, so concurrent work streams (build-pipeline refinement and spacebridge rearchitecture, for instance) cannot both advance — one always waits behind the other. Compounding all of this, shape and build are two disjoint worlds with no sanctioned mid-flow return to product alignment, so any mid-stream product-layer realization forces entity abandonment. The ideal shape — SO clarifies only what it genuinely cannot resolve, FO drives execution autonomously, a DAG advances multiple entities continuously end-to-end — is blocked by these stage-to-stage rigidities and by a captain-interaction contract that fires at the wrong moments on the wrong questions.

## User Stories

- **US-1**: As a captain, I want a lightweight direction-check immediately after the multi-lens brainstorm synthesis — presenting a recommended direction and key alternatives in under a minute of my attention — so that whole-direction mistakes are caught before explore begins, while finer-grained alignment remains captain's work during clarify.

- **US-2**: As a Science Officer, I want to filter clarify questions against code-level evidence before escalating to the captain, so that the captain only answers questions that genuinely cannot be resolved from existing codebase signals.

- **US-3**: As a captain, I want to queue multiple entities and have the First Officer advance them concurrently through the execution pipeline, so that build-pipeline refinement and spacebridge rearchitecture can both make progress without one blocking the other.

- **US-4**: As a captain, I want a sanctioned return path from mid-flow back to the shape stage when a product-layer realization invalidates the current direction, so that I can reframe without abandoning the entity and losing accumulated build artifacts.

## Scope: In

- `/build` Sonnet gatekeeper: runs at `/build` entry on every invocation, evaluating directive on two axes — (a) hedge-word presence (e.g. "maybe", "possibly", "可能", "某種", "我在想") and (b) concrete-target presence (named file, component, slug, or explicit acceptance criterion). Both axes trigger → auto-suggest `/shape {directive}` and halt. Only one axis (grey zone) → log warning in stage report, proceed without halting. Neither → silent pass-through. Defined as new `## Step 0: Gatekeeper` in build-entry skill.

- `/shape` self-seed path: when `skills/build-shape/SKILL.md` Step 0 detects raw directive (no `--from` flag), calls `/build seed` logic to create `docs/build-pipeline/{slug}.md` with `shape_status: draft`, then populates five locked body sections through normal Steps 3-7. Existing `--from {slug}` resume path unchanged. Escape-hatch (Step 1) still fires before entity creation on small/bugfix directives.

- Alignment-gate stage inserted in SO pipeline between `build-brainstorm` (entity 104, shipped) and `build-explore` (entity 105, shipped): after `## Brainstorming Spec` is written, SO presents captain with recommended direction (APPROACH headline) + key alternatives (ALTERNATIVE headlines), framed for under-one-minute attention. Three branches: (a) continue → proceed to explore; (b) retry brainstorm with captain correction signal → re-invoke brainstorm with appended correction note, new synthesis overwrites prior `## Brainstorming Spec`, gate re-presents; (c) escalate to shape → write `context_status: blocked` + emit `supersedes: {current-slug}` hint directing captain to open new entity via `/shape`. Gate logic as new post-synthesis step in `skills/build-brainstorm/SKILL.md` or SO dispatcher layer. Does NOT modify entity 104/105 content.

- Clarify code-evidence self-filter rule (US-2): before SO presents any Open Question to captain in `skills/build-clarify/SKILL.md` Step 2, SO runs self-filter pass. For each question, checks whether answer is pinned by (a) `file:line` citation in `## Lens Evidence`, (b) parent entity `→ Answer:` annotation, or (c) existing `→ Selected:` option annotation. If pinned → write `→ Self-resolved: {evidence}` inline, remove from captain queue. Only unpinned questions escalate to captain. Result reported in `## Stage Report: clarify`.

- New forge fixture `build-shape-f5-alignment-gate.smoke.yaml` covering three gate branches, asserting retry rewrites `## Brainstorming Spec` without touching `## Lens Evidence`, escalate emits `supersedes:` hint without mutating shape sections.

- Stage report additions: `## Stage Report: brainstorm` gains `- Alignment gate: {branch taken} ({retry count} retries)` + `alignment_confidence: {0.0-1.0}` line; `## Stage Report: clarify` gains `- Self-filter: {N} self-resolved, {M} captain-escalated` + `clarify_self_filter_ratio: {0.0-1.0}` line.

- Entity readiness score fields (DAG-consumable signals): `alignment_confidence` derived from alignment-gate branch (continue=1.0; retry-then-continue=0.6-0.8 by retry count; escalate=N/A entity superseded). `clarify_self_filter_ratio` = self-resolved / (self-resolved + captain-escalated). Both machine-parseable in Stage Report. Consumed by entity 070 (`build-flow-roadmap-orchestration`) as DAG ordering weights; consumable by 094 or future entity-DAG-viz for node rendering.

- Dependency declaration: entity 070 (`build-flow-roadmap-orchestration`) depends on this entity's readiness score field definitions as a contract-level coupling. Express via `depends-on: [build-entry-routing-and-alignment-gate]` in 070's frontmatter when 070 advances to explore.

## Scope: Out

- Any modification to entity 104 (`brainstorm-nuwa-distillation`) or 105 (`explore-nuwa-subagent-first`) content — both archived/shipped/locked; this entity adds hooks that invoke them, not edits inside them.

- Full FO DAG / parallel entity orchestration (US-3 ambitious scope) — this entity MUST NOT bake single-entity-at-a-time assumptions into new primitives, but DAG scheduler, queue, and concurrent FO dispatch are out of scope. Alignment-gate branch (c) writes `context_status: blocked`, not a queue entry, to remain DAG-neutral. Groundwork only.

- Re-shaping validated entities in place — mid-flow escape (alignment-gate branch c) uses `supersedes: {slug}` on a new entity per P-4 immutable-pitch; no mutation of five locked body sections on current entity.

- Captain UX / dashboard rendering changes for alignment-gate output — gate presents via existing `AskUserQuestion` in SO session; no new dashboard pill, card, or event type introduced.

- Changes to brainstorm synthesis content itself — gate consumes APPROACH/ALTERNATIVE output, does not rewrite synthesis algorithm, lens collection, or α-marker rules inside `skills/build-brainstorm/SKILL.md` Steps 1-5.

- Changes to FO dispatch mechanics beyond alignment-gate branch (c) requirements — troops architecture, ensign routing, profile selection, `effective_stages()` untouched.

- Automatic gatekeeper insertion into `/commission` or `/build-clarify` entry points — gatekeeper lives exclusively in `/build` entry skill.

- Entity-DAG visualization UI — this entity emits machine-readable signals (Layer 1); human-readable entity-DAG visualization belongs to 094 scope extension or new entity (`warroom-entity-dag-visualization`). Requires warroom SSE + graph rendering outside this entity's concern.

- Entity 070's DAG scheduler / topological sort implementation — this entity produces DAG-consumable signals; 070 owns sorting, parallel dispatch, blocked-node retry. 070 is Large scale, separately scoped.

## References

- `docs/build-pipeline/build-entry-routing-and-alignment-gate.md` — this entity
- `skills/build-shape/SKILL.md` — Step 0 (raw-directive vs `--from` parse), Step 1 (escape hatch), Step 2 (entity creation), Step 7 (ship / `shape_status: validated`)
- `skills/build-shape/references/output-format.md` — P-4 immutable-pitch rule, five locked body sections, `supersedes:` pattern
- `skills/build-brainstorm/SKILL.md` — Mode A/B dispatch, Lens Evidence sections, APPROACH/ALTERNATIVE output consumed by alignment-gate
- `skills/build-explore/SKILL.md` — Step 1a parent-decision consumption (source for self-filter code-evidence); SO-direct vs ensign-wrapper mode
- `skills/build-clarify/SKILL.md` — Step 2 Open Question presentation loop (insertion point for self-filter rule); Stage Report format
- `_archive/brainstorm-nuwa-distillation.md` — entity 104, shipped, locked
- `_archive/explore-nuwa-subagent-first.md` — entity 105, shipped, locked
- `docs/build-pipeline/build-flow-roadmap-orchestration.md` — entity 070, DAG backend (consumes readiness scores)
- `docs/build-pipeline/warroom-pipeline-graph-visualization.md` — entity 094, stage viz (potential extension for entity-DAG view)

## Stage Report: shape

- **Directive**: build-entry-routing-and-alignment-gate (SO pipeline entry routing + alignment-gate + clarify self-filter + DAG-ready signals)
- **Subagent dispatches**: framer (1 round + 1 captain-guided inline revision), story-gen (1 round), scope-drafter (1 round)
- **Captain accepts**: Problem Statement 1/1 (C-revised with 3 captain expansions), User Stories 4/4 (US-1 revised per two-tier alignment analysis), Scope: In 8/8, Scope: Out 9/9
- **Final story count**: 4 (US-1 through US-4)
- **Captain decisions locked during shape**: (1) /build Sonnet gatekeeper — not captain self-judgment, (2) /shape self-seed on raw directive — option β, (3) alignment-gate position — post-brainstorm-synthesis before explore, (4) two-tier alignment model — Tier 1 direction gate + Tier 2 clarify self-filter, (5) DAG integration — Layer 1 signals only, 070 owns scheduling, (6) shape-validated entities still run alignment-gate — but branch (c) probability lower
- **Decomposition gate**: not triggered (4 US converge on single feature surface)
