---
id: 113
title: Build Entry Routing + Alignment Gate -- SO Pipeline Dual-Entry, Mid-Flow Direction Check, Clarify Self-Filter
slug: build-entry-routing-and-alignment-gate
status: draft
context_status: pending
source: /build --from build-entry-routing-and-alignment-gate
created: 2026-04-15T20:30:00+08:00
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
- **Explicit non-goals**: Full DAG scheduler (owned by entity 070), entity-DAG visualization UI (owned by 094 or future entity), changes to brainstorm/explore skill internals (104/105 locked) (needs clarification -- deferred to explore).

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

**APPROACH**: Add four pipeline primitives that restructure SO's entry and mid-flow captain interaction points. (1) A Sonnet gatekeeper as new Step 0 in `skills/build/SKILL.md` that evaluates each directive on two syntactic axes -- hedge-word presence (pattern-match against a closed keyword set: "maybe", "possibly", "可能", "某種", "我在想", "or perhaps") and concrete-target presence (regex for file paths, component names, entity slugs, acceptance-criteria-like phrasing) -- and auto-suggests `/shape` when both axes trigger, while silently passing grey-zone directives. (2) A self-seed branch in `skills/build-shape/SKILL.md` Step 0 that detects raw directives (no `--from` flag) and calls `/build`'s entity-creation logic before running Steps 3-7, making `/shape` a true independent entry point. (3) An alignment-gate as a new post-synthesis step in the SO dispatcher layer (`agents/science-officer.md` Step 2→Step 3 boundary) that presents captain with a 2-3 line APPROACH/ALTERNATIVE summary via AskUserQuestion, supporting three branches: continue, retry-with-correction (capped at 3 iterations), or escalate-to-shape (writes `context_status: blocked` + `supersedes:` hint). (4) A code-evidence self-filter pass prepended to `skills/build-clarify/SKILL.md` Step 2 that checks each Open Question against existing Lens Evidence citations, parent entity annotations, and selected option annotations -- auto-resolving questions whose answer is already pinned and reporting the self-filter ratio in Stage Report. All four primitives emit machine-parseable fields (alignment_confidence, clarify_self_filter_ratio) consumable by entity 070's future DAG ordering.

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

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
