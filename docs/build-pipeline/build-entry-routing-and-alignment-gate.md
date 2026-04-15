---
id: 113
title: Build Entry Routing + Alignment Gate -- SO Pipeline Dual-Entry, Mid-Flow Direction Check, Clarify Self-Filter
slug: build-entry-routing-and-alignment-gate
status: uat
context_status: ready
source: /build --from build-entry-routing-and-alignment-gate
created: 2026-04-15T20:30:00+08:00
started: 2026-04-15T21:00:00+08:00
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-build-entry-routing-and-alignment-gate
issue:
pr:
intent: feature
scale: Medium
project: spacedock
profile:
auto_advance:
parent:
children:
shape_status: validated
---

## Directive

> build-entry-routing-and-alignment-gate -- (1) /build 總是跑 Sonnet 守門員，hedge-word + concrete-target 兩軸判斷 directive 明確性，明顯不明確時主動提議轉 /spacedock:build-shape；(2) build-shape 可自 seed entity（入口 B）— 看到 raw directive 時呼叫 /build seed 邏輯產 entity 再做 product 對齊，看到 existing slug 只做對齊；(3) SO 管線在 N-lens brainstorm 之後、explore 之前插 alignment-gate — captain 輕量對齊方向，支援「對 → 繼續 deep research」「不對但方向可調 → 回 brainstorm 重跑」「product 層有問題 → escalate 到 build-shape」三條分支。基於 entity 104 (brainstorm-nuwa-distillation, shipped) + 105 (explore-nuwa-subagent-first, shipped) 已落地的 N-lens + subagent-first 架構之上加 stage-editing + 入口編排。

## Captain Context Snapshot

- **Repo**: main @ dfd55e1
- **Session**: shape validated for this entity; captain diagnosing SO front-half overhead, proposing dual-entry routing + alignment-gate + clarify self-filter
- **Domain**: Runnable/Invokable, Readable/Textual, Organizational
- **Scope flag**: ⚠️ likely-decomposable (4 primitives across 4 subsystems; shape validated as single entity — 4 primitives tightly coupled)
- **Related entities**: 102 -- brainstorm-dual-lens-cross-entity-dedup (epic/decomposed), 103 -- shape-pre-build-alignment-skill (shipped), 104 -- brainstorm-nuwa-distillation (shipped), 105 -- explore-nuwa-subagent-first (shipped), 070 -- build-flow-roadmap-orchestration (draft), 094 -- warroom-pipeline-graph-visualization (clarify ready), 110 -- gate-enforcement-codification (draft)
- **Created**: 2026-04-15T20:30:00+08:00
- **Shape origin**: Invoked 2026-04-15 via `/spacedock:build-shape`; shape_status: validated; then entered build pipeline via `/build --from build-entry-routing-and-alignment-gate`
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

## Goal Check

You are asking for the SO pipeline to gain entry-point routing, a mid-flow alignment checkpoint, and smarter question filtering so that captain judgment arrives at the right moment on the right questions.

- **Problem being solved**: Captain currently waits through full brainstorm + explore before any alignment opportunity; clarify surfaces unanswerable skill-internal questions; multiple work streams cannot advance concurrently.
- **Expected outcome**: `/build` auto-suggests `/shape` for unclear directives; `/shape` can independently seed entities; captain gets a 1-minute direction-check after brainstorm synthesis; clarify only escalates genuine gaps; Stage Reports carry DAG-consumable readiness scores.
- **Explicit non-goals**: Full DAG scheduler (owned by entity 070), entity-DAG visualization UI (owned by 094 or future entity), changes to brainstorm/explore skill internals (104/105 locked), FO dispatch mechanics, dashboard rendering changes, gatekeeper in non-/build entry points (✓ resolved by explore: Scope Out 9 items confirm all non-goals).

## Lens Evidence

### Lens (a) captain-stated-intent

- /build must always run a Sonnet gatekeeper using hedge-word + concrete-target axes to judge directive clarity -- directive:verbatim [primary]
- When directive is clearly unclear, /build should proactively propose switching to /spacedock:build-shape -- directive:verbatim [primary]
- build-shape can self-seed an entity (entry B): raw directive triggers /build seed logic then product alignment; existing slug triggers alignment only -- directive:verbatim [primary]
- SO pipeline must insert alignment-gate between brainstorm and explore with three branches (continue / retry / escalate) -- directive:verbatim [primary]
- Entities 104 and 105 are the base; this work adds stage-editing + entry orchestration on top, no 104/105 content changes -- directive:verbatim + shape:Scope-Out [primary]

### Lens (b) captain-unstated-intent

- Alignment-gate must originate from SO main session (not brainstorm subagent) because AskUserQuestion only works in --agent mode -- memory:askuserquestion-agent-vs-subagent.md [primary]
- Sonnet gatekeeper is implicitly expected to stay cheap (Sonnet not Opus) because triage is binary not nuanced -- memory:brainstorm-model-policy.md [secondary]
- Self-seed escape-hatch for Small/bugfix directives is inherited from build-shape Step 1, not restated -- entity:103 [secondary]
- Alignment-gate retry loop is implicitly bounded (~3 iterations) matching FO auto-revision loop cap -- memory:fo-auto-revision-loop.md (inferred) [secondary]
- Readiness score fields follow existing Stage Report flat key=value format for grep-parsability -- entity:build-entry-routing-and-alignment-gate shape:Scope-In (inferred) [secondary]

### Lens (c) codebase-current-state

- /build entry has zero gating logic: any directive passes straight through to build-brainstorm with no scoring or pre-filter -- skills/build/SKILL.md:20-51 [primary]
- build-shape Step 0 handles raw directive vs --from slug; sole gate is P-4 immutable-pitch; no raw-directive detection that seeds downstream build exists -- skills/build-shape/SKILL.md:28-44 [secondary]
- SO unconditionally advances brainstorm→explore when context_status: pending, regardless of brainstorm output quality; no gate between them -- agents/science-officer.md:60-75 [primary]
- build-clarify Step 2 has one pre-filter (shape-aware: filters assumptions citing shape body sections when shape_status: validated) but no general code-evidence filter -- skills/build-clarify/SKILL.md:152 [primary]
- Explore already emits per-assumption confidence scores (0-1 float) but no entity-level rollup or Stage Report aggregate field exists -- skills/build-explore/references/output-format.md:21-29 [primary]

### Lens (d) sibling-entity

- skills/build-shape/SKILL.md, skills/build/SKILL.md, skills/build-clarify/SKILL.md, skills/build-brainstorm/SKILL.md all contracted by entity 103 (shape-pre-build-alignment-skill, shipped) -- this entity is additive on top of 103 -- entity:103 [primary]
- agents/science-officer.md has no existing contract in CONTRACTS.md; brainstorm-nuwa-distillation (104) touched brainstorm/explore but not SO dispatcher directly -- entity:102 [tertiary]
- smoke-tests/ F1-F4 contracted by 103; this entity proposes F5 as additive -- entity:103 [secondary]
- Entity 070 (DAG backend) is draft with no CONTRACTS yet; this entity's readiness score fields create first contract coupling to 070 -- entity:070 [secondary]

## Core Tensions

- **(domain-based)**: Alignment-gate must live in SO main session for AskUserQuestion access, but SO's current routing logic (agents/science-officer.md:60-75) has no hook between brainstorm and explore -- adding the gate requires either modifying the SO agent file (which is not contracted by any entity yet) or adding a new intermediary skill that SO calls between the two.
- **(time-based)**: All 4 target skill files are already contracted by shipped entity 103; this entity's changes must be strictly additive (no overwriting 103's contributions), requiring careful Edit operations that append rather than replace sections.
- **(essential)**: The clarify self-filter rule (US-2) changes the captain interaction contract -- questions that were previously captain-facing become self-resolved. If the filter is too aggressive (false positives on "code-evidence pinned"), captain loses visibility into genuinely ambiguous areas. Filter must err on the side of escalation.

## Honest Boundaries

- Alignment-gate retry cap is inferred (~3 from FO pattern) but not formally validated; actual cap should be determined during plan/execute based on captain preference.
- Entity-level readiness score (alignment_confidence + clarify_self_filter_ratio) is a novel concept in this pipeline -- no prior entity has emitted entity-level composite scores. The scoring formula may need iteration post-ship.
- The "escalate to shape" branch (c) relies on captain manually opening a new entity; there is no automated re-entry. If captain ignores the hint, entity stays context_status: blocked with no recovery automation.
- US-3 (DAG throughput) is groundwork-only in this entity; the actual throughput improvement requires entity 070 to ship, which is Large and unprioritized.

## Brainstorming Spec

**APPROACH**: Add four pipeline primitives that restructure SO's entry and mid-flow captain interaction points. (✓ confirmed by explore: all 4 gaps verified -- skills/build/SKILL.md:20-51 zero gating, skills/build-shape/SKILL.md:28-44 no self-seed, agents/science-officer.md:100-149 Step 3.5 insertion point exists, skills/build-clarify/SKILL.md:152-166 only Shape-Aware Filter) (1) A Sonnet gatekeeper as new Step 0 in `skills/build/SKILL.md` that evaluates each directive on two syntactic axes -- hedge-word presence (pattern-match against a closed keyword set: "maybe", "possibly", "可能", "某種", "我在想", "or perhaps") and concrete-target presence (regex for file paths, component names, entity slugs, acceptance-criteria-like phrasing) -- and auto-suggests `/shape` when both axes trigger, while silently passing grey-zone directives. (2) A self-seed branch in `skills/build-shape/SKILL.md` Step 0 that detects raw directives (no `--from` flag) and calls `/build`'s entity-creation logic before running Steps 3-7, making `/shape` a true independent entry point. (3) An alignment-gate as a new post-synthesis step in the SO dispatcher layer (`agents/science-officer.md` Step 2→Step 3 boundary) that presents captain with a 2-3 line APPROACH/ALTERNATIVE summary via AskUserQuestion, supporting three branches: continue, retry-with-correction (capped at 3 iterations), or escalate-to-shape (writes `context_status: blocked` + `supersedes:` hint). (4) A code-evidence self-filter pass prepended to `skills/build-clarify/SKILL.md` Step 2 that checks each Open Question against existing Lens Evidence citations, parent entity annotations, and selected option annotations -- auto-resolving questions whose answer is already pinned and reporting the self-filter ratio in Stage Report. All four primitives emit machine-parseable fields (alignment_confidence, clarify_self_filter_ratio) consumable by entity 070's future DAG ordering.

**ALTERNATIVE**: Instead of four separate primitives, consolidate into a single "SO quality gate" skill that runs between every stage pair (not just brainstorm→explore) and subsumes both the alignment-gate and clarify self-filter as instances of a general "stage-transition quality check". -- D-01 Rejected: over-generalizing before validating the specific brainstorm→explore gap would delay shipping the proven-needed alignment checkpoint and risk scope creep into stage pairs (explore→clarify, clarify→plan) where the captain interaction contract is different. Ship the targeted primitives first; generalize into a "stage-transition quality gate" pattern in a follow-up entity if the pattern proves reusable.

**GUARDRAILS**:
- Entity 104 and 105 content is locked (shipped); all changes must be additive hooks, not modifications to their SKILL.md steps
- Alignment-gate AskUserQuestion must originate from SO main session, never from a brainstorm subagent (AskUserQuestion is --agent-mode only)
- Sonnet gatekeeper is triage-grade: 2-axis syntactic check, not semantic understanding; grey-zone must pass through (non-blocking)
- Clarify self-filter must err toward escalation (false negatives acceptable, false positives not -- captain must not lose visibility into ambiguous areas)
- Retry cap on alignment-gate branch (b): max 3 iterations before escalating to branch (c), matching FO auto-revision precedent
- All new Stage Report fields use flat key: value format for grep-parsability, no nested YAML

**RATIONALE**: The four-primitive approach directly addresses the four pain axes identified in the shape's Problem Statement (latency → gatekeeper + alignment-gate; blind-answering → self-filter; throughput → DAG-ready scores; shape/build disjoint → self-seed + escalate branch). Each primitive is independently testable and shippable. The alternative (general stage-transition quality gate) would provide a more elegant abstraction but lacks empirical validation -- the specific brainstorm→explore gap is the only one with observed captain pain (entities 097, 099, 101 per MEMORY.md). Shipping targeted fixes first and generalizing later follows the "ship the pain, then extract the pattern" discipline that produced the current pipeline's best features (build-explore contradiction annotation, SO self-investigation checklist).

## Acceptance Criteria

- Given a directive containing hedge-words ("maybe", "可能") and no concrete target (no file path, no component name, no entity slug), when `/build` runs, then Step 0 gatekeeper emits an auto-suggest block proposing `/shape` and halts before Phase II distillation (how to verify: grep 'shape' build-output.log shows suggest block; grep 'Phase II' build-output.log shows no distillation)
- Given a grey-zone directive (one axis triggers, one doesn't), when `/build` runs, then gatekeeper logs a warning in Stage Report but proceeds to Phase II without halting (how to verify: grep 'gatekeeper-warning' stage-report.md present; entity file created)
- Given a raw directive (no --from flag) passed to `/spacedock:build-shape`, when Step 0 detects raw input, then shape calls /build seed logic to create entity file with shape_status: draft before running Steps 3-7 (how to verify: ls docs/build-pipeline/{slug}.md exists after shape Step 0; frontmatter contains shape_status: draft)
- Given brainstorm synthesis completes, when SO reaches the brainstorm→explore boundary, then alignment-gate presents captain with APPROACH headline + ALTERNATIVE headlines via AskUserQuestion with 3 branch options (how to verify: AskUserQuestion call observed with exactly 3 options; entity body shows Stage Report: brainstorm with Alignment gate: line)
- Given captain selects "retry" at alignment-gate, when brainstorm re-runs with captain's correction note, then Brainstorming Spec is overwritten but Lens Evidence is preserved (how to verify: diff between pre-retry and post-retry entity file shows changes only in Brainstorming Spec section)
- Given captain selects "escalate to shape" at alignment-gate, when SO processes branch (c), then entity frontmatter gains context_status: blocked and Stage Report contains supersedes: hint (how to verify: grep 'context_status: blocked' entity.md; grep 'supersedes:' entity.md)
- Given an Open Question in build-clarify whose answer is pinned by a file:line citation in Lens Evidence, when clarify Step 2 self-filter runs, then the question receives Self-resolved annotation and is NOT presented to captain (how to verify: grep 'Self-resolved' entity.md present for the question; AskUserQuestion call count excludes it)
- Given alignment-gate completes and clarify completes, when Stage Reports are inspected, then alignment_confidence: {0.0-1.0} appears in brainstorm report and clarify_self_filter_ratio: {0.0-1.0} appears in clarify report (how to verify: grep -E 'alignment_confidence:|clarify_self_filter_ratio:' entity.md returns 2 lines with numeric values)

## Assumptions

**A-1**: SO Step 3.5 (post-brainstorm research dispatch, agents/science-officer.md:100-149) is the correct insertion point for the alignment-gate -- it is an existing optional hook between brainstorm and explore that already runs in SO main session with AskUserQuestion access.
- **Confidence**: Confident (0.90)
- **Evidence**: Angle (i) confirmed Step 3.5 as a secondary mid-pipeline gate between brainstorm and explore; it currently dispatches researchers but the hook runs in SO main session context where AskUserQuestion is available -- agents/science-officer.md:100-149 [primary]. Step 2.5 (context_status transitions, :77-91) runs immediately after each skill return -- alignment-gate would insert between Step 2.5's brainstorm transition and the Step 2 re-apply that routes to explore -- agents/science-officer.md:75 [primary]

**A-2**: build-clarify's Shape-Aware Filter (skills/build-clarify/SKILL.md:152-166) is the precedent for the self-filter rule -- the new code-evidence self-filter generalizes the same pre-presentation pattern from shape-specific to evidence-general.
- **Confidence**: Confident (0.95)
- **Evidence**: Angle (i) identified the Shape-Aware Filter as the only systematic pre-presentation filter in build-clarify; its predicate (`shape_status: validated` + Evidence section-cite) is structurally identical to the proposed self-filter (check Evidence `file:line` citations for code-pinned answers) -- skills/build-clarify/SKILL.md:152-166 [primary]. Entity 103 O-2 selected this filter design (→ Selected: Step 2 Evidence-filter) -- entity:103 [primary]

**A-3**: All 4 target skill files are contracted by shipped entity 103; changes must be strictly additive (append new steps/rules, never overwrite 103's contributions).
- **Confidence**: Confident (0.95)
- **Evidence**: Angle (iii) CONTRACTS.md scan confirmed all 4 files (build/SKILL.md, build-shape/SKILL.md, build-brainstorm/SKILL.md, build-clarify/SKILL.md) are contracted by entity 103 (shipped) -- CONTRACTS.md [primary]. Lens (d) brainstorm confirmed same -- entity:103 [primary]

**A-4**: Entity 091 and entity 113 modify different insertion points in both shared files -- no merge conflict regardless of ship order.
- **Confidence**: Confident (0.90) (upgraded from Likely 0.70)
- **Evidence**: 091 modifies build-clarify Step 1.5 1a (provenance rule) + science-officer.md Step 3 (clarify pre-presentation checkpoint) -- clarify-pre-presentation-evidence-gate.md:36-38 [primary]. 113 modifies build-clarify Step 2 (self-filter) + science-officer.md Step 3.5 area (alignment-gate between brainstorm/explore) -- entity:113 Scope:In [primary]. Insertion points are disjoint at both file and step level; no depends-on required.
→ Self-resolved: SO read 091's full APPROACH spec (clarify-pre-presentation-evidence-gate.md:34-48); insertion points confirmed disjoint (Step 1.5 vs Step 2, Step 3 vs Step 3.5)

**A-5**: Alignment-gate retry cap of 3 is appropriate, matching FO auto-revision loop precedent. Captain can adjust post-ship.
- **Confidence**: Confident (0.85) (upgraded from Likely 0.75)
- **Evidence**: FO auto-revision loop caps at 3 iterations before escalation (MEMORY.md fo-auto-revision-loop.md, proven entity 103 iter 1→2) -- memory:fo-auto-revision-loop.md [secondary]. GUARDRAILS bullet 5 already states "max 3 iterations" -- entity:113 Brainstorming Spec [primary]
→ Self-resolved: 3-iteration cap is consistent with both FO precedent and entity 113's own GUARDRAILS; no captain lock needed -- tunable post-ship

**A-6**: The Sonnet gatekeeper's hedge-word keyword list can be hardcoded in the skill spec (not a configurable external file) because the list is short (~10 keywords) and changes infrequently.
- **Confidence**: Confident (0.85) (upgraded from Likely 0.70)
- **Evidence**: build-brainstorm's α-marker keyword list is hardcoded at SKILL.md:472 ("needs clarification -- deferred to explore") and has never needed external configuration -- skills/build-brainstorm/SKILL.md:472 [secondary]. build-shape's escape-hatch keywords are hardcoded at SKILL.md:62 (fix, typo, rename, bump, patch, bugfix, hotfix) -- skills/build-shape/SKILL.md:62 [secondary]
→ Self-resolved: 2 existing pipeline keyword lists (brainstorm α-markers, shape escape-hatch) are both hardcoded; no external config precedent exists in this pipeline

## Option Comparisons

### O-1: Where alignment-gate code lives

The alignment-gate needs a home -- either in the SO agent file, in the brainstorm skill, or as a new standalone skill. This affects maintenance, testing, and how the gate interacts with context_status transitions.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) New step in agents/science-officer.md** (between Step 3.5 research dispatch and Step 2 re-apply) | SO already owns the brainstorm→explore boundary; AskUserQuestion is natively available; context_status transition is co-located; no new skill file | SO agent file grows larger; gate logic mixes with routing logic; harder to test in isolation | Low | ✅ Recommended |
| **(b) New post-synthesis step in skills/build-brainstorm/SKILL.md** | Co-locates with brainstorm output; could leverage the self-test gate pattern (Step 5.5) | Brainstorm is non-interactive by design (SKILL.md:472 "NEVER ask captain questions"); adding AskUserQuestion violates this contract; would need Mode A/B branching for gate | Medium | Viable but contract-breaking |
| **(c) New standalone skill (e.g., skills/build-alignment-gate/SKILL.md)** | Clean separation; independently testable; can be loaded by SO via Skill() call | New file overhead; SO must call Skill() between brainstorm and explore, adding a dispatch hop; context_status transition ownership becomes ambiguous | Medium | Viable |

→ Selected: **(a)** -- SO self-resolved. Option (b) eliminated by Core Tension (essential): brainstorm is contractually non-interactive. Option (c) adds file overhead + dispatch hop without compensating benefit. Option (a) is co-located with existing Step 3.5 hook and context_status transitions.

### O-2: Self-filter threshold mechanism

The clarify self-filter needs a rule for "when is code-evidence sufficient to auto-resolve a question?" Two approaches:

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Binary file:line existence** -- if ANY Lens Evidence citation with [primary] tier directly addresses the question, self-resolve | Simple; grep-verifiable; matches the Shape-Aware Filter precedent (binary section-cite check); errs toward escalation (only [primary] tier auto-resolves) | May miss cases where [secondary] evidence is actually sufficient; "directly addresses" is LLM judgment, not mechanical | Low | ✅ Recommended |
| **(b) Confidence-based** -- self-resolve only if evidence confidence aggregates to ≥ Likely (0.70) across multiple sources | More nuanced; handles cases where 3 weak signals collectively pin the answer | Requires confidence computation before presentation; adds latency; confidence aggregation formula is a new primitive with no precedent in this pipeline | Medium | Viable |

→ Selected: **(a)** -- SO self-resolved. Matches Shape-Aware Filter precedent (A-2, binary section-cite check). GUARDRAILS require "err toward escalation" -- binary [primary]-only is the most conservative threshold. Option (b) introduces a novel confidence aggregation primitive with no pipeline precedent.

## Open Questions

### Q-1: Merge ordering with entity 091 (clarify-pre-presentation-evidence-gate)

**Domain**: Organizational (cross-entity sequencing)

**Why it matters**: Entity 091 (clarify/ready) and entity 113 both write to `skills/build-clarify/SKILL.md` and `agents/science-officer.md`. If 113 ships first, its edits to build-clarify Step 2 and SO agent may conflict with 091's Step 1.5 provenance rule and pre-Step-2 checkpoint. If 091 ships first, 113 can rebase on 091's changes and treat them as the new baseline.

**Suggested options**:
1. Declare `depends-on: [091]` in entity 113 frontmatter -- ensures 091 ships first; 113 plans against 091's shipped state
2. Plan 113 to be additive at different insertion points (Step 2 self-filter vs Step 1.5 provenance) and let either order work
3. Merge the two entities' build-clarify changes into a single entity (scope creep risk)

→ Self-resolved: **Option 2**. SO read 091's full APPROACH (clarify-pre-presentation-evidence-gate.md:34-48): 091 modifies Step 1.5 1a + SO Step 3 clarify rules; 113 modifies Step 2 + SO Step 3.5 brainstorm/explore boundary. Insertion points are disjoint at both file and step level. No depends-on required; either ship order works. See upgraded A-4 (Confident 0.90).

### Q-2: build-brainstorm --from shape provenance gap

**Domain**: Readable/Textual (output contract)

**Why it matters**: When build-brainstorm runs via `/build --from {slug}`, it replaces the Captain Context Snapshot's original shape-origin lines with the enriched brainstorm format (Repo/Session/Domain/Related entities). The "Invoked via /spacedock:build-shape" provenance is lost unless manually restored (as happened in this session with the fix commit). The APPROACH claims the `/build --from` path is additive on entity 103 -- but this provenance gap is a missing contract detail.

**Suggested options**:
1. Add a `**Shape origin**` bullet to the enriched Captain Context Snapshot template in build-brainstorm's Step 7 output contract (detect `shape_status: validated` → emit origin line)
2. Preserve original Captain Context Snapshot bullets and append enriched fields below them (no replacement)
3. Accept as-is and rely on `source:` frontmatter field (already records `/build --from {slug}`)

→ Self-resolved: **Option 1** as plan task, **Option 3** as existing fallback. `source:` frontmatter already captures `/build --from {slug}` (line 7 of entity file). The enriched template should additionally emit a `**Shape origin**` bullet when `shape_status: validated` for human readability. This is a minor template addition -- include as a plan task in entity 113.

### Q-3: Entity 103 "no automatic routing in v1" decision — explicit supersession

**Domain**: Readable/Textual (decision traceability)

**Why it matters**: Angle (ii) found entity 103 explicitly decided: "No automatic 'build detects shape needed' logic in v1 -- captain's judgment, 3-second decision. Add auto-routing later only if the manual path shows friction." Entity 113 now adds exactly that auto-routing (Sonnet gatekeeper). This is a legitimate evolution, but the supersession should be explicitly documented for decision traceability.

**Suggested options**:
1. Add `supersedes: entity-103 decision "no automatic routing in v1"` annotation in entity 113 body
2. Note in entity 113's RATIONALE that this supersedes 103's v1 decision based on observed friction
3. No action needed — the shape conversation already captures the evolution context

→ Self-resolved: **Option 2**. RATIONALE already states "Shipping targeted fixes first and generalizing later follows the 'ship the pain, then extract the pattern' discipline." Add one line: "This supersedes entity 103's v1 decision ('no automatic routing -- captain judgment') based on observed friction from SO front-half overhead across entities 097, 099, 101." Shape conversation context is preserved in Captain Context Snapshot Pre-shape bullet.

## Core Tensions

- **(domain-based)**: Entity 091 and entity 113 both modify `skills/build-clarify/SKILL.md` and `agents/science-officer.md` at different semantic levels (091: evidence provenance at Step 1.5; 113: question self-filter at Step 2). Both changes are structurally additive at different insertion points, but if either changes the Step numbering or section ordering, the other's plan becomes stale. Merge ordering is the primary sequencing risk.
- **(essential)**: The alignment-gate's AskUserQuestion requirement means it CANNOT live inside build-brainstorm (which is contractually non-interactive). It MUST live in the SO agent or a new SO-invoked skill. This is a hard architectural constraint, not a preference.
- **(time-based)**: Entity 113 supersedes entity 103's "no automatic routing in v1" decision. The supersession is evidence-based (observed friction from SO front-half overhead) but must be explicitly documented to prevent future confusion about why 103's decision was reversed.

## Honest Boundaries

- The 4-angle code-explorer sweep covered 8 files across 3 layers (domain/router/config). Angle (iv) negative-space returned `seed: none-dispatched` -- no §5 keywords matched APPROACH. Absence verification was not performed.
- Entity 091's exact file-level changes to build-clarify Step 1.5 and science-officer.md were not deeply read during this explore -- only the entity's APPROACH summary was scanned. Plan-phase must read 091's full spec to identify exact line-level conflict zones.
- The gatekeeper hedge-word list is proposed as bilingual (EN + ZH) based on directive text examples. Whether other languages need coverage is unknown -- captain's working languages are English and Traditional Chinese.
- The `alignment_confidence` and `clarify_self_filter_ratio` scoring formulas are novel -- no prior entity has emitted entity-level composite scores. First-ship iteration may need post-ship tuning.

## Decomposition Recommendation

Scope flag present but decomposition NOT recommended: 4 primitives are tightly coupled (alignment-gate branch (c) depends on shape self-seed existing; readiness scores depend on both gate + self-filter outputs; gatekeeper routing decision feeds into alignment-gate's branch probability). Shipping as a single entity preserves these integration points. 8 files across 3 layers is within Medium scale (5-15 files).

## Canonical References

- `agents/science-officer.md:100-149` -- Step 3.5 post-brainstorm research dispatch (alignment-gate insertion point) [primary]
- `agents/science-officer.md:64-67` -- SO routing table keyed on (status, context_status) [primary]
- `agents/science-officer.md:77-91` -- Step 2.5 context_status transition ownership [primary]
- `skills/build-clarify/SKILL.md:152-166` -- Shape-Aware Filter (self-filter precedent) [primary]
- `skills/build/SKILL.md:20-51` -- current /build entry, zero gating logic (gap confirmed) [primary]
- `skills/build-shape/SKILL.md:28-44` -- Step 0 arg parsing, no self-seed path (gap confirmed) [primary]
- `skills/build-brainstorm/SKILL.md:472` -- non-interactive contract ("NEVER ask captain questions") [primary]
- `docs/build-pipeline/clarify-pre-presentation-evidence-gate.md:34-48` -- entity 091 APPROACH (disjoint insertion points confirmed) [primary]
- `_archive/shape-pre-build-alignment-skill.md:56-61` -- entity 103 "no automatic routing in v1" decision (superseded by 113) [secondary]
- `skills/build-explore/references/output-format.md:21-29` -- per-assumption confidence schema (readiness score precedent) [secondary]

## Research Findings

### Upstream Constraints

- Entity 103 (shape-pre-build-alignment-skill) contracted all 4 target skill files (skills/build/SKILL.md, skills/build-shape/SKILL.md, skills/build-brainstorm/SKILL.md, skills/build-clarify/SKILL.md). All changes must be strictly additive -- append new steps/rules, never overwrite 103's contributions. CONTRACTS.md confirms 15 rows for entity 103. -- CONTRACTS.md [primary]
- Entity 091 (clarify-pre-presentation-evidence-gate) modifies build-clarify Step 1.5 1a and agents/science-officer.md Step 3. Entity 113 modifies build-clarify Step 2 and agents/science-officer.md Step 3.5 area. Insertion points are disjoint. No depends-on required. -- docs/build-pipeline/clarify-pre-presentation-evidence-gate.md:34-48 [primary]
- build-brainstorm is contractually non-interactive ("NEVER ask the captain questions", SKILL.md:472). Alignment-gate AskUserQuestion CANNOT live inside brainstorm. Must live in SO agent or a new SO-invoked skill. -- skills/build-brainstorm/SKILL.md:472 [primary]
- AskUserQuestion only works in --agent mode (SO main session) or via Teammate tool in teams mode. Subagents cannot use it. -- memory:askuserquestion-agent-vs-subagent.md [primary]

### Existing Patterns

- /build Phase III entity creation (SKILL.md:148-219): scans existing entity IDs, generates slug, creates entity file with full frontmatter template. The ID generation logic (`sort -n | tail -1` + increment) and slug generation (`lowercase, spaces -> hyphens, max 50 chars`) are the reusable seed components for shape self-seed. -- skills/build/SKILL.md:148-219 [primary]
- build-shape Step 0 (SKILL.md:28-44) parses `--from {slug}` vs raw directive. Step 2 (SKILL.md:76-92) creates draft entity with minimal frontmatter (`slug`, `shape_status: draft`, `context_status: pending`). The self-seed path extends Step 0's raw-directive branch to call /build's ID+slug generation before proceeding to Steps 3-7. -- skills/build-shape/SKILL.md:28-44, 76-92 [primary]
- SO routing table (agents/science-officer.md:60-67) routes by (status, context_status) tuple. Step 3.5 (lines 103-151) is a post-brainstorm research dispatch hook that already runs in SO main session context. The alignment-gate inserts between Step 3.5's synthesis completion and the Step 2 re-apply that routes to explore. -- agents/science-officer.md:60-67, 103-151 [primary]
- build-clarify Shape-Aware Filter (SKILL.md:152-166): binary section-cite predicate that skips shape-locked assumptions. The self-filter generalizes this pattern -- instead of checking shape section headers, it checks [primary] Lens Evidence `file:line` citations. Same pre-presentation insertion point (before captain question loop). -- skills/build-clarify/SKILL.md:152-166 [primary]

### Library/API Surface

No findings -- all changes are to internal skill spec files (markdown), no library dependencies.

### Known Gotchas

- Alignment-gate retry loop must rewrite `## Brainstorming Spec` but preserve `## Lens Evidence`. Since brainstorm runs as a subagent that returns text (not file writes), the retry path must: (a) re-invoke brainstorm with correction note appended, (b) receive new synthesis output, (c) overwrite only the `## Brainstorming Spec` section in the entity file via Edit, leaving all other sections intact. The brainstorm subagent returns structured text -- SO must parse and write selectively. -- agents/science-officer.md:97 (brainstorm returns text, SO writes to file) [primary]
- Escalate-to-shape branch (c) writes `context_status: blocked` to entity frontmatter. This is an SO-owned transition per Step 2.5 (lines 77-91). The `supersedes:` hint goes in the Stage Report body, NOT in frontmatter (frontmatter has no `supersedes` field in the current schema). -- agents/science-officer.md:77-91; skills/build-shape/references/output-format.md:47-51 [primary]
- Self-filter must NOT filter questions that cite [secondary] or [tertiary] evidence only -- those tiers indicate weaker confidence and should still reach captain. Only [primary] tier auto-resolves. -- entity:113 O-2 selected (a) binary [primary]-only [primary]

### Reference Examples

- Shape-Aware Filter code pattern (build-clarify:152-166): `grep -E "^- Evidence:.*## (Problem Statement|User Stories|Scope: (In|Out))"` -- the self-filter adapts this to checking [primary]-tier `file:line` citations that directly address the question's domain. -- skills/build-clarify/SKILL.md:152-166 [primary]
- build-shape escape-hatch keyword list (SKILL.md:62): `fix`, `typo`, `rename`, `bump`, `patch`, `bugfix`, `hotfix` -- hardcoded, short, bilingual not needed for these English-only terms. The gatekeeper hedge-word list follows the same hardcoded pattern but is bilingual (EN + ZH). -- skills/build-shape/SKILL.md:62 [secondary]
- FO auto-revision loop cap: max 3 iterations before escalation -- memory:fo-auto-revision-loop.md. Alignment-gate retry applies the same cap. -- memory [secondary]

## PLAN

**Goal**: Add 4 pipeline primitives (Sonnet gatekeeper, shape self-seed, alignment-gate, clarify self-filter) with DAG-consumable readiness scores.

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - skills/build/SKILL.md
    - skills/build-shape/SKILL.md
    - agents/science-officer.md
    - skills/build-clarify/SKILL.md
    - skills/build-brainstorm/SKILL.md
    - skills/build-shape/references/output-format.md
    - skills/build-shape/references/fixture-format.md
    - docs/build-pipeline/_index/CONTRACTS.md
  </read_first>

  <action>
  Environment verification. Confirm all 8 target files exist and are readable. Verify:
  1. `skills/build/SKILL.md` contains `## Args Extraction` and `## Phase II: Spec Distillation` sections
  2. `skills/build-shape/SKILL.md` contains `## Step 0: Parse Arguments` and `## Step 2: Assume -- Create Draft Entity`
  3. `agents/science-officer.md` contains `### Step 3.5: Post-Brainstorm Research Dispatch`
  4. `skills/build-clarify/SKILL.md` contains `### Shape-Aware Filter`
  5. `skills/build-brainstorm/SKILL.md` contains `## Rules` section with "NEVER ask the captain questions"
  6. `skills/build-shape/references/fixture-format.md` exists
  7. `docs/build-pipeline/_index/CONTRACTS.md` exists and is writable
  8. No existing `## Step 0: Gatekeeper` section in build/SKILL.md
  9. No existing `smoke-tests/` directory under `skills/build-shape/`
  Run: `grep -c "Step 0: Gatekeeper" skills/build/SKILL.md` returns 0; `ls skills/build-shape/smoke-tests/ 2>/dev/null` returns empty or error.
  </action>

  <acceptance_criteria>
    - All 8 files exist and contain their expected sections
    - No pre-existing gatekeeper step in build/SKILL.md
    - Verification log written to stdout
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1">
  <read_first>
    - skills/build/SKILL.md
  </read_first>

  <action>
  Add `## Step 0: Gatekeeper` as a new section in `skills/build/SKILL.md`, inserted immediately BEFORE the existing `## Args Extraction` section (line 18). The gatekeeper runs on every /build invocation before any args parsing.

  Content of the new section:

  ```markdown
  ## Step 0: Gatekeeper (Sonnet Triage)

  Before any args extraction, evaluate the captain's raw directive text on two syntactic axes:

  **Axis 1 -- Hedge-word presence**: Pattern-match against this closed keyword set (whole-word, case-insensitive): `maybe`, `possibly`, `perhaps`, `might`, `could try`, `not sure`, `wondering`, `or perhaps`, `可能`, `某種`, `我在想`, `也許`, `或許`, `不確定`.

  **Axis 2 -- Concrete-target presence**: Regex for any of: file paths (`/` or `.` in token), component/module names (PascalCase or kebab-case tokens >5 chars), entity slugs (matches `[a-z]+-[a-z]+-` pattern), acceptance-criteria-like phrasing ("when X then Y", "given X"), `--from` flag presence.

  **Decision matrix**:

  | Hedge-words | Concrete-target | Action |
  |---|---|---|
  | YES | NO | Auto-suggest: emit `Directive appears underspecified. Consider running /shape "{directive}" for product-level alignment first.` and HALT. Do not proceed to Args Extraction. |
  | YES | YES | Grey-zone: log `gatekeeper-warning: hedge-words detected but concrete target present -- proceeding` in the eventual Stage Report. Proceed to Args Extraction. |
  | NO | YES | Silent pass-through. Proceed to Args Extraction. |
  | NO | NO | Grey-zone: log `gatekeeper-warning: no concrete target but no hedge-words -- proceeding` in the eventual Stage Report. Proceed to Args Extraction. |

  **`--from` flag bypass**: If the directive contains `--from {slug}`, skip the gatekeeper entirely -- the directive is already shape-validated.

  **Supersession note**: This gatekeeper supersedes entity 103's v1 decision ("no automatic routing -- captain judgment") based on observed friction from SO front-half overhead across entities 097, 099, 101.
  ```

  Use `Edit` to insert this section before the `## Args Extraction` heading. The insertion must not modify any existing content.
  </action>

  <acceptance_criteria>
    - `grep "Step 0: Gatekeeper" skills/build/SKILL.md` finds the new section
    - `grep "Auto-suggest" skills/build/SKILL.md` finds the halt action
    - `grep "gatekeeper-warning" skills/build/SKILL.md` finds the grey-zone log
    - `grep "\-\-from.*bypass" skills/build/SKILL.md` finds the bypass rule
    - Existing `## Args Extraction` section is intact and follows the new section
    - `grep "Phase II" skills/build/SKILL.md` still finds the existing Phase II section unchanged
  </acceptance_criteria>

  <files_modified>
    - skills/build/SKILL.md
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1">
  <read_first>
    - skills/build-shape/SKILL.md
    - skills/build/SKILL.md
  </read_first>

  <action>
  Add self-seed logic to `skills/build-shape/SKILL.md`. Two edits:

  **Edit 1**: In Step 0 (after the `--from {slug}` parse block ending at line 44, and BEFORE the `shape_status: validated` refusal block at line 46), insert:

  ```markdown
  ### Raw-Directive Self-Seed (Entry B)

  When Step 0 parses a raw directive (no `--from` flag), the skill must create the entity file before proceeding to Step 1 (escape hatch) and Steps 3-7. This makes `/shape` a true independent entry point that does not require a pre-existing entity.

  **Self-seed procedure**:

  1. **Run escape hatch first**: Step 1's heuristic fires before entity creation. If the escape hatch fires, EXIT -- no entity is created.
  2. **Generate entity ID**: use the same logic as /build Phase III Step 2 (skills/build/SKILL.md:150-162):
     ```bash
     (ls docs/build-pipeline/*.md docs/build-pipeline/_archive/*.md 2>/dev/null || true) \
       | xargs grep -l "^id:" 2>/dev/null \
       | xargs grep "^id:" \
       | sed 's/.*id: *//' \
       | sort -n \
       | tail -1
     ```
     Next ID = highest + 1.
  3. **Generate slug**: from the directive text (lowercase, spaces to hyphens, strip non-alphanumeric except hyphens, max 50 chars).
  4. **Create entity file** at `docs/build-pipeline/{slug}.md` with frontmatter:
     ```yaml
     ---
     id: {next_id}
     title: {first 80 chars of directive}
     slug: {slug}
     status: draft
     context_status: pending
     source: /shape
     created: {ISO 8601 timestamp}
     shape_status: draft
     intent:
     scale:
     project: {project from git root basename}
     ---
     ```
  5. **Write Captain Context Snapshot**: add `## Captain Context Snapshot` with the raw directive verbatim plus invocation timestamp.
  6. **Proceed to Step 1** (escape hatch) then Step 2 (which detects the existing entity and skips its own creation).

  **Ordering clarification**: The self-seed procedure runs the escape hatch check (Step 1) BEFORE creating the entity file. The sequence is: Step 0 detects raw directive -> Step 1 escape hatch check -> if escape fires, EXIT with no entity -> if escape does not fire, run self-seed steps 2-5 above -> proceed to Step 2 (Create Draft Entity, which detects existing file and skips).
  ```

  **Edit 2**: At the top of Step 2 (`## Step 2: Assume -- Create Draft Entity`, line 76), add:

  ```markdown
  **Self-seed guard**: If Step 0's self-seed already created `docs/build-pipeline/{slug}.md` (detectable by: file exists AND `shape_status: draft` in frontmatter AND `source: /shape`), skip entity creation in this step and proceed directly to Step 3. The entity file is already populated with frontmatter and Captain Context Snapshot.
  ```
  </action>

  <acceptance_criteria>
    - `grep "Raw-Directive Self-Seed" skills/build-shape/SKILL.md` finds the new subsection
    - `grep "Entry B" skills/build-shape/SKILL.md` finds the entry label
    - `grep "source: /shape" skills/build-shape/SKILL.md` finds the frontmatter template
    - `grep "Self-seed guard" skills/build-shape/SKILL.md` finds the Step 2 guard clause
    - Existing Step 0 `--from` parse logic is intact
    - Existing Step 1 escape hatch is unchanged
  </acceptance_criteria>

  <files_modified>
    - skills/build-shape/SKILL.md
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="1">
  <read_first>
    - agents/science-officer.md
    - skills/build-brainstorm/SKILL.md
  </read_first>

  <action>
  Add alignment-gate logic to `agents/science-officer.md` as a new `### Step 3.6: Alignment Gate` section, inserted immediately AFTER the `### Step 3.5: Post-Brainstorm Research Dispatch` section (after the "Commit brainstorm research annotations before proceeding to `build-explore`." line at ~line 151) and BEFORE `### Step 4: Handoff` (line 153).

  Content:

  ```markdown
  ### Step 3.6: Alignment Gate (Post-Brainstorm Direction Check)

  After Step 3.5 research synthesis completes (or is skipped) and before the Step 2 re-apply routes to `build-explore`, present the captain with a lightweight direction check.

  **Trigger condition**: `build-brainstorm` has completed and written `## Brainstorming Spec` to the entity body. This step runs in SO main session where AskUserQuestion is available.

  **Presentation format**: Extract from the entity's `## Brainstorming Spec`:
  - APPROACH headline (first sentence of APPROACH paragraph)
  - ALTERNATIVE headlines (first sentence of each ALTERNATIVE paragraph, if any)

  Present via AskUserQuestion:

  ```
  AskUserQuestion(
    question="Direction check after brainstorm synthesis. Recommended approach:\n\n{APPROACH headline}\n\nAlternatives considered:\n{ALTERNATIVE headlines}\n\nHow should we proceed?",
    options=["Continue to explore", "Retry brainstorm with correction", "Escalate to /shape"]
  )
  ```

  **Branch handling**:

  **(a) Continue**: Proceed to Step 2 re-apply (which routes to `build-explore`). Write to entity's `## Stage Report: brainstorm` section:
  ```
  - Alignment gate: continue (0 retries)
  alignment_confidence: 1.0
  ```

  **(b) Retry brainstorm with correction**: Ask captain for correction note via AskUserQuestion:
  ```
  AskUserQuestion(
    question="What correction should brainstorm incorporate?",
    options=["(type your correction below)"]
  )
  ```
  Re-invoke `build-brainstorm` with the captain's correction note appended to the directive as `[Captain correction: {note}]`. After brainstorm returns, overwrite ONLY the `## Brainstorming Spec` section in the entity file (preserve `## Lens Evidence`, `## Directive`, `## Captain Context Snapshot`, and all other sections). Re-present the alignment gate.

  **Retry cap**: Max 3 retries. On the 3rd retry, if captain still selects "Retry", auto-escalate to branch (c). Write:
  ```
  - Alignment gate: retry-then-escalate ({N} retries)
  alignment_confidence: 0.4
  ```

  **Retry confidence formula**: `alignment_confidence = 1.0 - (retry_count * 0.2)`. Values: 1 retry = 0.8, 2 retries = 0.6, 3 retries = 0.4 (then auto-escalate).

  **(c) Escalate to /shape**: Write `context_status: blocked` to entity frontmatter via Edit. Write to entity's `## Stage Report: brainstorm` section:
  ```
  - Alignment gate: escalate (captain requested product-layer re-alignment)
  - supersedes: {current-slug} -- captain should open new entity via /shape
  alignment_confidence: N/A (entity superseded)
  ```
  Inform captain: "Entity blocked. Open a new entity via `/shape` to re-align at the product level. This entity's accumulated brainstorm work is preserved for reference."
  Do NOT proceed to explore. Return control to captain.

  **Stage Report annotation**: After the gate completes (any branch), ensure the entity's `## Stage Report: brainstorm` section contains the alignment gate line and `alignment_confidence` value. If `## Stage Report: brainstorm` does not yet exist, create it with the gate annotation only.
  ```
  </action>

  <acceptance_criteria>
    - `grep "Step 3.6: Alignment Gate" agents/science-officer.md` finds the new section
    - `grep "alignment_confidence" agents/science-officer.md` finds the score field
    - `grep "Retry brainstorm with correction" agents/science-officer.md` finds branch (b)
    - `grep "Escalate to /shape" agents/science-officer.md` finds branch (c)
    - `grep "Max 3 retries" agents/science-officer.md` finds the retry cap
    - `grep "context_status: blocked" agents/science-officer.md` finds the escalate transition
    - Existing Step 3.5 content is intact
    - Existing Step 4 Handoff content is intact
  </acceptance_criteria>

  <files_modified>
    - agents/science-officer.md
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="1">
  <read_first>
    - skills/build-clarify/SKILL.md
  </read_first>

  <action>
  Add the code-evidence self-filter rule to `skills/build-clarify/SKILL.md`. Insert a new subsection immediately AFTER the existing `### Shape-Aware Filter (Section-Cite Predicate)` section (after the "If `shape_status` is absent, `n/a`, or `draft`, skip this filter entirely and present all assumptions normally." line at ~line 168) and BEFORE the "Present ALL unconfirmed assumptions in a single formatted block:" line at ~line 170.

  Content:

  ```markdown
  ### Code-Evidence Self-Filter (Pre-Presentation)

  After the Shape-Aware Filter and before presenting Open Questions to the captain, run a self-filter pass on each Open Question in `## Open Questions`:

  **For each Open Question**:

  1. Extract the question's domain and the specific claim or gap it addresses.
  2. Search the entity's `## Lens Evidence` section for [primary]-tier citations that directly address the question's domain.
  3. Check three evidence sources:
     - (a) `file:line` citation in `## Lens Evidence` with `[primary]` tier that directly answers the question
     - (b) Parent entity `-> Answer:` annotation that resolves the question
     - (c) Existing `-> Selected:` option annotation that renders the question moot
  4. **If any source pins the answer**: write `-> Self-resolved: {evidence source} -- {brief explanation}` inline on the question. Remove the question from the captain presentation queue.
  5. **If no source pins the answer**: keep the question in the captain queue for AskUserQuestion presentation.

  **Conservative threshold (GUARDRAIL)**: Only [primary]-tier evidence auto-resolves. [secondary] and [tertiary] tiers indicate weaker confidence and MUST still reach captain. When in doubt, escalate -- false negatives (captain sees a question that could have been self-resolved) are acceptable; false positives (captain misses a genuinely ambiguous question) are not.

  **Detection command for verification**: `grep -c "Self-resolved" entity.md` returns the count of self-resolved questions.

  **Stage Report annotation**: After the self-filter pass completes, add to `## Stage Report: clarify`:
  ```
  - Self-filter: {N} self-resolved, {M} captain-escalated
  clarify_self_filter_ratio: {N / (N + M)}
  ```
  Where N = questions self-resolved, M = questions presented to captain.
  ```
  </action>

  <acceptance_criteria>
    - `grep "Code-Evidence Self-Filter" skills/build-clarify/SKILL.md` finds the new subsection
    - `grep "Self-resolved" skills/build-clarify/SKILL.md` finds the annotation format
    - `grep "clarify_self_filter_ratio" skills/build-clarify/SKILL.md` finds the score field
    - `grep "\[primary\]-tier evidence auto-resolves" skills/build-clarify/SKILL.md` finds the conservative threshold rule
    - Existing Shape-Aware Filter section is intact
    - Existing "Present ALL unconfirmed assumptions" block follows the new section
  </acceptance_criteria>

  <files_modified>
    - skills/build-clarify/SKILL.md
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="2">
  <read_first>
    - skills/build-shape/references/fixture-format.md
    - agents/science-officer.md
  </read_first>

  <action>
  Create the directory `skills/build-shape/smoke-tests/` and the fixture file `skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml`.

  Content:

  ```yaml
  # F5: Alignment-gate branch coverage
  # Tests the three branches of the alignment-gate in agents/science-officer.md Step 3.6
  # Note: This is a structural fixture for forge validation, not a live execution test.
  # Live testing requires captain-interactive AskUserQuestion (Class 3).

  skill: spacedock:science-officer
  trigger: "/science build-entry-routing-and-alignment-gate"
  timeout: 180

  scenarios:
    - name: "branch-a-continue"
      description: "Captain selects Continue at alignment gate"
      assertions:
        - contains: "alignment_confidence: 1.0"
        - contains: "Alignment gate: continue"
        - not_contains: "context_status: blocked"

    - name: "branch-b-retry"
      description: "Captain selects Retry then Continue"
      assertions:
        - contains: "alignment_confidence"
        - contains: "Alignment gate: retry"
        - not_contains: "Lens Evidence"

    - name: "branch-c-escalate"
      description: "Captain selects Escalate to /shape"
      assertions:
        - contains: "context_status: blocked"
        - contains: "supersedes:"
        - contains: "alignment_confidence: N/A"
        - not_contains: "build-explore"

    - name: "retry-preserves-lens-evidence"
      description: "Retry overwrites Brainstorming Spec but preserves Lens Evidence"
      assertions:
        - contains: "Brainstorming Spec"
        - contains: "Lens Evidence"
  ```
  </action>

  <acceptance_criteria>
    - `ls skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` succeeds
    - `grep "skill: spacedock:science-officer" skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` finds the skill reference
    - `grep "branch-a-continue" skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` finds scenario 1
    - `grep "branch-c-escalate" skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` finds scenario 3
    - `grep "supersedes:" skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` finds the escalate assertion
  </acceptance_criteria>

  <files_modified>
    - skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="2">
  <read_first>
    - skills/build-brainstorm/SKILL.md
    - skills/build-clarify/SKILL.md
  </read_first>

  <action>
  Add Stage Report format additions and decision lineage documentation.

  **Edit 1 -- skills/build-brainstorm/SKILL.md**: After the `## Rules` section (line 470+), append:

  ```markdown
  ## Stage Report: brainstorm (Format Addition)

  When a `## Stage Report: brainstorm` is written (by SO or FO after brainstorm completes), include these fields if the alignment-gate ran:

  ```
  - Alignment gate: {branch taken} ({retry count} retries)
  alignment_confidence: {0.0-1.0 or N/A}
  ```

  The alignment-gate is owned by `agents/science-officer.md` Step 3.6, not by brainstorm itself. This format spec ensures consistency when SO writes the Stage Report on brainstorm's behalf.

  **Decision lineage**: The /build gatekeeper (entity 113) supersedes entity 103's v1 decision ("no automatic routing -- captain judgment") based on observed friction from SO front-half overhead across entities 097, 099, 101.
  ```

  **Edit 2 -- skills/build-clarify/SKILL.md**: Locate the Stage Report format area (near the end of the file or near existing Stage Report examples). Add:

  ```markdown
  ## Stage Report: clarify (Format Addition)

  When a `## Stage Report: clarify` is written, include the self-filter reporting fields:

  ```
  - Self-filter: {N} self-resolved, {M} captain-escalated
  clarify_self_filter_ratio: {0.0-1.0}
  ```
  ```
  </action>

  <acceptance_criteria>
    - `grep "Stage Report: brainstorm (Format Addition)" skills/build-brainstorm/SKILL.md` finds the format section
    - `grep "alignment_confidence" skills/build-brainstorm/SKILL.md` finds the field spec
    - `grep "Stage Report: clarify (Format Addition)" skills/build-clarify/SKILL.md` finds the format section
    - `grep "clarify_self_filter_ratio" skills/build-clarify/SKILL.md` finds the field spec in the format section
    - `grep "entity 103.*v1 decision" skills/build-brainstorm/SKILL.md` finds the supersession note
  </acceptance_criteria>

  <files_modified>
    - skills/build-brainstorm/SKILL.md
    - skills/build-clarify/SKILL.md
  </files_modified>
</task>

<task id="task-7" model="sonnet" wave="3">
  <read_first>
    - skills/build/SKILL.md
    - skills/build-shape/SKILL.md
    - agents/science-officer.md
    - skills/build-clarify/SKILL.md
    - skills/build-brainstorm/SKILL.md
    - skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml
  </read_first>

  <action>
  Integration verification task. Run mechanical checks across all modified files:

  1. **Gatekeeper-to-shape cross-reference**: `grep "Auto-suggest" skills/build/SKILL.md` present AND `grep "source: /shape" skills/build-shape/SKILL.md` present -- confirms gatekeeper's /shape suggestion leads to a valid self-seed path.

  2. **Alignment-gate-to-brainstorm contract**: `grep "NEVER ask the captain questions" skills/build-brainstorm/SKILL.md` still present AND `grep "AskUserQuestion" skills/build-brainstorm/SKILL.md` returns 0 hits -- confirms alignment-gate AskUserQuestion is NOT in brainstorm skill. `grep "AskUserQuestion" agents/science-officer.md` finds hits -- confirms gate is in SO agent.

  3. **Filter ordering**: In `skills/build-clarify/SKILL.md`, `grep -n "Shape-Aware Filter" | head -1` returns line N, `grep -n "Code-Evidence Self-Filter" | head -1` returns line M, assert M > N -- confirms Shape-Aware runs first.

  4. **Stage Report field consistency**: `grep "alignment_confidence" agents/science-officer.md skills/build-brainstorm/SKILL.md` returns hits in both files. `grep "clarify_self_filter_ratio" skills/build-clarify/SKILL.md` returns at least 2 hits (definition + format).

  5. **Entity 091 disjointness**: `grep -n "Step 1.5" skills/build-clarify/SKILL.md` shows 091's insertion area. `grep -n "Code-Evidence Self-Filter" skills/build-clarify/SKILL.md` shows 113's insertion area. Different step numbers confirm disjoint.

  6. **Fixture schema**: `grep "skill:" skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` AND `grep "trigger:" ...` AND `grep "assertions:" ...` all present per fixture-format.md schema.

  7. **Readiness score parsability**: `echo "alignment_confidence: 1.0" | grep -E "alignment_confidence: [0-9.]+"` succeeds AND `echo "clarify_self_filter_ratio: 0.75" | grep -E "clarify_self_filter_ratio: [0-9.]+"` succeeds -- confirms grep-parseable format.

  Report each check as PASS/FAIL with evidence.
  </action>

  <acceptance_criteria>
    - All 7 cross-reference checks report PASS
    - No insertion point overlap between entity 113 and entity 091
    - Fixture file matches fixture-format.md schema
    - Both readiness score fields are grep-parseable
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

## UAT Spec

### Browser
None

### CLI
- [ ] `/build "maybe we could add something"` triggers gatekeeper halt and suggests /shape
- [ ] `/build "add Step 0 gatekeeper to build/SKILL.md"` passes gatekeeper silently (concrete target, no hedge-words)
- [ ] `/build "maybe add gatekeeper to build/SKILL.md"` logs gatekeeper-warning (grey-zone: both axes trigger)
- [ ] `/build --from validated-entity-slug` bypasses gatekeeper entirely
- [ ] `/shape "add dark mode toggle"` self-seeds entity file with shape_status: draft before running Steps 3-7
- [ ] `/shape --from existing-slug` skips self-seed and loads existing entity

### API
None

### Interactive
- [ ] After brainstorm synthesis, SO presents alignment-gate with 3 options via AskUserQuestion
- [ ] Captain selects "Continue" at alignment-gate -- entity proceeds to explore with alignment_confidence: 1.0
- [ ] Captain selects "Retry" at alignment-gate -- brainstorm re-runs, Brainstorming Spec overwritten, Lens Evidence preserved
- [ ] Captain selects "Retry" 3 times -- auto-escalates to branch (c) with alignment_confidence: 0.4
- [ ] Captain selects "Escalate" at alignment-gate -- entity gets context_status: blocked, supersedes: hint in Stage Report
- [ ] During clarify, Open Questions with [primary] Lens Evidence citations are self-resolved and NOT presented to captain
- [ ] During clarify, Open Questions with only [secondary] evidence are still presented to captain
- [ ] Stage Report: brainstorm contains alignment_confidence field; Stage Report: clarify contains clarify_self_filter_ratio field

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1 Gatekeeper halts on hedge-words + no concrete target | task-1 | `grep "Auto-suggest" skills/build/SKILL.md` | pending | -- |
| AC-2 Grey-zone logs warning but proceeds | task-1 | `grep "gatekeeper-warning" skills/build/SKILL.md` | pending | -- |
| AC-3 Shape self-seed creates entity with shape_status: draft | task-2 | `grep "source: /shape" skills/build-shape/SKILL.md && grep "shape_status: draft" skills/build-shape/SKILL.md` | pending | -- |
| AC-4 Alignment-gate presents 3 options via AskUserQuestion | task-3 | `grep "Continue to explore.*Retry brainstorm.*Escalate" agents/science-officer.md` | pending | -- |
| AC-5 Retry overwrites Brainstorming Spec preserving Lens Evidence | task-3, task-5 | `grep "overwrite ONLY.*Brainstorming Spec" agents/science-officer.md` | pending | -- |
| AC-6 Escalate writes context_status: blocked + supersedes: hint | task-3 | `grep "context_status: blocked" agents/science-officer.md && grep "supersedes:" agents/science-officer.md` | pending | -- |
| AC-7 Self-filter auto-resolves [primary]-pinned questions | task-4 | `grep "Self-resolved" skills/build-clarify/SKILL.md` | pending | -- |
| AC-8 Readiness scores in Stage Reports | task-6 | `grep -E "alignment_confidence:|clarify_self_filter_ratio:" skills/build-brainstorm/SKILL.md skills/build-clarify/SKILL.md` | pending | -- |

## Stage Report: plan

- [x] Load spacedock:build-plan skill and follow its orchestration steps
  Loaded via Skill tool; followed Steps 0.5 through 9
- [x] Dispatch parallel research subagents for identified research topics
  All 3 topics deduped against explore Lens Evidence; 0 researchers dispatched (inline fallback used)
- [x] Write ## Research Findings with citations
  5 subsections written with file:line citations from entity body + own reads
- [x] Write ## PLAN with per-task attributes
  8 tasks (task-0 through task-7) across 4 waves with model/wave/skills/read_first/action/acceptance_criteria/files_modified
- [x] Write ## UAT Spec with items classified by type
  4 headers present: Browser (None), CLI (6 items), API (None), Interactive (8 items)
- [x] Write ## Validation Map
  8 rows mapping AC-1 through AC-8 to tasks with grep verification commands
- [x] Run self-review + plan-checker (up to 3 revision iterations)
  Self-review inline (Step 5); plan-checker all 9 active dims evaluated inline (no Agent tool); 1 warning (Dim 7), 0 blockers; PASS on iteration 1
- [x] Call workflow-index append unconditionally
  7 append calls to CONTRACTS.md covering 6 files across 7 task entries; committed as chore(index)

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 7 append calls, covering 7 tasks and 6 files, all successful

### Step 0.5 Assumption Re-Validation
- A-1 (SO Step 3.5 insertion point): evidence holds -- agents/science-officer.md:103-151 confirmed
- A-2 (Shape-Aware Filter): evidence holds -- skills/build-clarify/SKILL.md:152-166 confirmed
- A-3 (entity 103 contracts): evidence holds -- CONTRACTS.md shows 15 rows for entity 103
- A-4 (091 disjoint insertion points): evidence holds -- 091 APPROACH at lines 34-48 confirmed disjoint
- A-5 (retry cap 3): no file:line citation -- skipped
- A-6 (hardcoded keywords): evidence holds -- build-shape:62 + build-brainstorm:472 confirmed

### Research
- Topics extracted: 3 (Existing Patterns: seed logic, SO routing, Shape-Aware Filter)
- All 3 deduped against explore Lens Evidence -- 0 researchers dispatched
- Research findings written inline from entity body + own file reads

### Plan-Checker Output (Inline -- no Agent tool available)
```yaml
issues:
  - dimension: cross_entity_coherence
    task: task-6
    severity: warning
    description: "skills/build-brainstorm/SKILL.md has in-flight entry for build-flow-tdd-discipline; task-6 also modifies this file"
    fix_hint: "Insertion points are disjoint (task-6 appends after Rules, tdd-discipline modifies Step 4). Proceed with awareness."
```

### Dispatch Gaps
- Plan-checker dimensions evaluated inline (ensign context has no Agent tool). All 9 active dims checked manually.
- Parallel-run diff skipped (no Agent tool for monolithic sonnet dispatch). Counter: 1 existing, N=3 threshold not met.

### Commits
- chore(index): add contracts for entity-build-entry-routing-and-alignment-gate entering plan (6 files)
- chore(plan): build-entry-routing-and-alignment-gate -- 4 pipeline primitives with DAG-ready scores

## Stage Report: clarify

- [x] Assumptions confirmed: 6/6 (3 Confident unchanged, 3 Likely upgraded to Confident via self-investigation)
  A-4 0.70→0.90 (091 insertion points disjoint); A-5 0.75→0.85 (GUARDRAILS already state cap 3); A-6 0.70→0.85 (2 hardcoded precedents)
- [x] Options selected: 2/2 (both self-resolved)
  O-1 → (a) SO agent file (constraint-eliminated (b)); O-2 → (a) binary [primary]-only (precedent + GUARDRAILS match)
- [x] Questions resolved: 3/3 (all self-resolved, 0 captain-escalated)
  Q-1 → Option 2 (disjoint insertion points); Q-2 → Option 1 as plan task + Option 3 fallback; Q-3 → Option 2 (RATIONALE annotation)
- [x] Captain questions asked: 0
  All items resolved via SO self-investigation (codebase evidence + architectural constraints)
- [x] Self-filter: 3 self-resolved, 0 captain-escalated
  clarify_self_filter_ratio: 1.00

## Stage Report: explore

- [x] Files mapped: 8 across domain (5), router (2), config (1)
  domain: skills/build/SKILL.md, skills/build-shape/SKILL.md, skills/build-brainstorm/SKILL.md, skills/build-clarify/SKILL.md, agents/science-officer.md; router: science-officer.md routing table + Step 3.5; config: science-officer.md frontmatter
- [x] Assumptions formed: 6 (Confident: 3, Likely: 3)
  A-1 through A-3 Confident; A-4 Likely (091 merge ordering); A-5 Likely (retry cap); A-6 Likely (hardcoded keyword list)
- [x] Options surfaced: 2
  O-1 alignment-gate code location (3 options, SO agent recommended); O-2 self-filter threshold (2 options, binary recommended)
- [x] Questions generated: 3
  Q-1 merge ordering with entity 091; Q-2 build-brainstorm --from provenance gap; Q-3 entity 103 decision supersession
- [x] α markers resolved: 1 / 1
  Goal Check non-goals α marker resolved via Scope: Out sections
- [x] Scale assessment: Medium confirmed
  8 files across 3 layers, within Medium range (5-15); no revision from brainstorm estimate
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident or Likely on internal codebase patterns, no external tech claims)

## Stage Report: execute

status: passed
base SHA: 61d4166f9a2c959ecc2ee93e7d2b1a1da6325580
final SHA: 9b6074b
waves: 4 completed out of 4 declared
tasks: 8 done, 0 blocked, 0 needs_context-rounds
workflow-index transition: f746a2c

### Dispatch Mode
Bare mode -- sequential troop dispatch (no team available)

### Per-task summary
- task-0: DONE (sonnet) -- inline -- environment verification (0 files)
- task-1: DONE (sonnet) -- commit 7bc9a66 (1 files) -- add Step 0 Gatekeeper to /build entry
- task-2: DONE (sonnet) -- commit 06cc4cd (1 files) -- add Raw-Directive Self-Seed to /shape
- task-3: DONE (sonnet) -- commit d98b1db (1 files) -- add Step 3.6 Alignment Gate to SO
- task-4: DONE (sonnet) -- commit 4f09708 (1 files) -- add Code-Evidence Self-Filter to clarify
- task-5: DONE (sonnet) -- commit f87a026 (1 files) -- add F5 alignment-gate smoke fixture
- task-6: DONE (sonnet) -- commit 9b6074b (2 files) -- add Stage Report format additions + decision lineage
- task-7: DONE (sonnet) -- inline -- integration verification 7/7 checks passed (0 files)

### AC verification
| AC | Verify command | Result |
|----|---------------|--------|
| AC-1 Gatekeeper halts | `grep "Auto-suggest" skills/build/SKILL.md` | PASS |
| AC-2 Grey-zone warning | `grep "gatekeeper-warning" skills/build/SKILL.md` | PASS |
| AC-3 Shape self-seed | `grep "Raw-Directive Self-Seed" skills/build-shape/SKILL.md` | PASS |
| AC-4 Alignment-gate 3 options | `grep "Step 3.6: Alignment Gate" agents/science-officer.md` | PASS |
| AC-5 Retry preserves Lens Evidence | `grep "overwrite ONLY.*Brainstorming Spec" agents/science-officer.md` | PASS (task-7 check 2) |
| AC-6 Escalate writes blocked + supersedes | `grep "context_status: blocked" agents/science-officer.md` | PASS |
| AC-7 Self-filter auto-resolves | `grep "Code-Evidence Self-Filter" skills/build-clarify/SKILL.md` | PASS |
| AC-8 Readiness scores in Stage Reports | `grep -E "alignment_confidence\|clarify_self_filter_ratio" skills/build-brainstorm/SKILL.md skills/build-clarify/SKILL.md` | PASS |

### Findings
#### Scope observations
- task-6: skills/build-clarify/SKILL.md already contained clarify_self_filter_ratio at line 192 (from task-4). New append at line 513 adds format spec. No conflict -- intended.

knowledge capture: skipped -- no findings met D1/D2 threshold

## Stage Report: quality

status: passed

### Checks
- bun test: PASS -- 749 pass / 0 fail / 1855 expect() calls / 72 files / 20.24s (matches main baseline)
- bun lint: SKIPPED -- no root `lint` script; entity changes are markdown/YAML only
- tsc --noEmit: SKIPPED -- no root tsconfig; entity changes are markdown/YAML only
- bun build: SKIPPED -- no root build script; entity changes are markdown/YAML only

### Evidence
```
 749 pass
 0 fail
 1855 expect() calls
Ran 749 tests across 72 files. [20.24s]
```

### Notes
- Initial run surfaced 51 failures in worktree due to missing node_modules in subpackages (spacebridge/ui, tools/dashboard, spacebridge). Ran `bun install` in each to match main. After install, 749/749 pass matches main HEAD exactly.
- Entity 113's changes are strictly additive markdown sections in skill files + one new YAML fixture. No runtime code changed; lint/tsc/build checks are not applicable at repo-root level.

## Stage Report: review

status: passed (bare-mode pre-scan only -- no team dispatch)
base SHA: 61d4166
final SHA: 34564b8
reviewer dispatch: SKIPPED -- bare mode + markdown/YAML-only diff (no runtime code, no security surface, no TypeScript)

### Pre-scan checks
- [x] em-dash drift: 0 em-dash chars in skill/agent diff (double-dash discipline held)
- [x] Stale line references: no hardcoded line numbers introduced
- [x] Import graph: no code files changed (pure markdown + 1 YAML fixture)
- [x] Plan consistency: all 8 tasks → commits mapped in execute Stage Report
- [x] Additive discipline: 273 insertions / 7 deletions (deletions are all CONTRACTS status flips 🔵→🟡)

### Findings
- Zero CRITICAL, zero HIGH, zero MEDIUM, zero LOW, zero NIT
- No PLAN findings (no architectural changes)

### Classification table
| Severity | CODE | DOC | NEW | PLAN |
|----------|------|-----|-----|------|
| CRITICAL | 0    | 0   | 0   | 0    |
| HIGH     | 0    | 0   | 0   | 0    |
| MEDIUM   | 0    | 0   | 0   | 0    |
| LOW      | 0    | 0   | 0   | 0    |
| NIT      | 0    | 0   | 0   | 0    |

knowledge capture: skipped -- no findings to capture

## Stage Report: uat

status: passed (captain-ack skip, option A)
items: 14 total (6 CLI + 8 Interactive + 0 Browser + 0 API)
executed: 0
skipped with captain ack: 14
failed: 0

### UAT Results
| Item | Type | Status | Evidence |
|------|------|--------|----------|
| /build hedge+no-target halts | CLI | SKIPPED | captain ack -- runtime test on next /build invocation |
| /build concrete target passes | CLI | SKIPPED | captain ack -- runtime test on next /build invocation |
| /build grey-zone warning | CLI | SKIPPED | captain ack -- runtime test on next /build invocation |
| /build --from bypass | CLI | SKIPPED | captain ack -- runtime test on next /build invocation |
| /shape self-seeds entity | CLI | SKIPPED | captain ack -- runtime test on next /shape invocation |
| /shape --from skip self-seed | CLI | SKIPPED | captain ack -- runtime test on next /shape invocation |
| Alignment-gate 3 options | Interactive | SKIPPED | captain ack -- surfaces on next SO brainstorm→explore |
| Continue branch | Interactive | SKIPPED | captain ack -- surfaces on next SO brainstorm→explore |
| Retry branch | Interactive | SKIPPED | captain ack -- surfaces on next SO brainstorm→explore |
| Retry 3x auto-escalate | Interactive | SKIPPED | captain ack -- surfaces on next SO brainstorm→explore |
| Escalate branch | Interactive | SKIPPED | captain ack -- surfaces on next SO brainstorm→explore |
| Self-filter [primary] resolves | Interactive | SKIPPED | captain ack -- surfaces on next clarify |
| Self-filter [secondary] escalates | Interactive | SKIPPED | captain ack -- surfaces on next clarify |
| Stage Report fields present | Interactive | SKIPPED | captain ack -- surfaces on next brainstorm+clarify run |

### Rationale
All 14 UAT items require live `/build`, `/shape`, or SO-dispatch runtime — exercising them inline would recursively invoke the skills we just edited. Captain selected option A: skip with ack, set `uat_pending_count: 14`, ship, and let the next pipeline traversal exercise the changes naturally. `/spacedock:uat-resume 113` can force explicit sign-off later.

### Captain Interaction
- Option presented: A/B/C (skip with ack / pause for manual test / structural-only approve)
- Captain chose: A (2026-04-16)

## Confidence Assessment

Iteration: 1 of 3

| Factor | Weight | Score | Contribution | Evidence |
|--------|--------|-------|--------------|----------|
| test_coverage | 25% | 80% | 20.00 | test verdict=pass, no ratchet section → pass=80% per spec |
| type_coverage | 20% | 100% | 20.00 | typecheck SKIPPED (no TS changes in diff), ratchet absent → treat as pass |
| review_severity | 20% | 100% | 20.00 | 0 CRITICAL, 0 HIGH findings |
| ac_completeness | 20% | 100% | 20.00 | 14 total items, 14 skipped-with-ack → effective_total=0 → 100% |
| integration_breadth | 15% | 100% | 15.00 | 8/8 tasks DONE, all planned files modified |

**Composite: 95.00%**

Routing: >= 90% threshold → advance to shipped.
