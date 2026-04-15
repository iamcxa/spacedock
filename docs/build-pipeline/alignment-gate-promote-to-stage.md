---
id: 114
title: Alignment-Gate Promote to Stage -- Pipeline Control Point Visibility + SO Depolicing
slug: alignment-gate-promote-to-stage
status: draft
context_status: pending
source: /shape
created: 2026-04-16T00:30:00+08:00
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

## Captain Context Snapshot

- **Invoked**: 2026-04-16T00:30:00+08:00 via `/shape`
- **Directive (verbatim)**:

> alignment-gate-promote-to-stage -- 把 entity 113 shipped 的 Step 3.6 Alignment Gate 從 agents/science-officer.md 內部抽出來，升格成 build pipeline 的 first-class stage（位於 brainstorm 和 explore 之間，gate: true, worktree: false, dispatch: simple）。目的是把 captain 控制點從 SO 內部顯性化到 pipeline 骨架上 — (a) dashboard 活動流能看到進入/離開 alignment-gate 的事件；(b) 獨立 Stage Report: alignment-gate 可被 confidence-gate 當 factor 來源；(c) CONTRACTS.md 能追蹤 alignment-gate 的 in-flight 狀態給 plan-checker Dim 7；(d) SO 職責瘦回 routing + context_status transition，不 hosting gates。同時 review：clarify stage 已經是 gated stage，alignment-gate 與它同構，不對稱是 113 當時 O-1 的實作便利誤判。牽涉 README stages list、effective_stages()、FO dispatch 路徑、dashboard event schema、confidence-gate factor 定義 — 架構級修正。

- **Conversation context**: Captain critiqued entity 113's O-1 decision post-ship: alignment-gate embedded in SO is (1) invisible on pipeline graph, (2) makes SO a god-object, (3) skips pipeline-level observability (events, CONTRACTS, Stage Report, confidence factor). FO acknowledged the critique and drafted this shape directive. Entity 113 remains shipped and unmodified; this entity refactors the implementation location without revising 113's behavioral contract.

## Problem Statement

The build pipeline's Alignment Gate is a consequential captain control point — the moment where science-officer pauses to confirm problem framing before committing downstream analysis effort — yet it lives inside agents/science-officer.md as an internal Step 3.6 rather than as a first-class pipeline stage. Because it is not a stage, the decision event is invisible to the dashboard activity stream, buried in agent transcripts, and untraceable across sessions or concurrent multi-entity work, so captains cannot audit or resume an alignment conversation the way they can a clarify gate. The same sub-stage placement causes structural accretion in science-officer, which now bundles routing, context_status management, brainstorm/explore/clarify orchestration, and this captain gate into a single agent file that no downstream layer can cleanly bind against. Confidence-gate factor sources, plan-checker Dim 7 in-flight tracking, CONTRACTS.md stage rows, and effective_stages() routing all key off stage identity, so a gate that doesn't exist at the stage layer cannot be referenced, tested, or routed around. Meanwhile clarify — a structurally equivalent captain gate — is a first-class stage with its own row, its own skill, and its own dashboard footprint, making the asymmetry glaring to anyone comparing the two. That asymmetry trains agents, captains, and downstream skill authors to stop trusting the pipeline model as source of truth, because they can see with their own eyes that the model omits a gate they depend on. All three pains — invisible control, accreted architecture, broken symmetry — are surface expressions of the same root condition: a load-bearing captain decision lives below the pipeline's abstraction layer, where neither tooling nor humans can reach it as a stage.

## User Stories

- **US-1**: As a captain, I want the alignment gate to appear as a named pipeline stage with its own dashboard footprint, so that I can audit and resume alignment conversations across sessions the same way I can with the clarify gate.

- **US-2**: As a captain, I want alignment gate decisions to be visible in the dashboard activity stream, so that I can trace when and how problem framing was confirmed without digging through agent transcripts.

- **US-3**: As a first officer, I want the alignment gate to have a dedicated stage identity that effective_stages() and confidence-gate can reference, so that routing and confidence scoring key off a real stage rather than an invisible sub-step inside science-officer.

- **US-4**: As a skill author / plugin developer, I want science-officer to delegate alignment gate logic to a first-class stage with its own skill file, so that I can bind contracts against a stable stage boundary instead of an accreted single-agent file that bundles routing, context_status management, and captain interaction.

- **US-5**: As a downstream consumer (confidence-gate / plan-checker / dashboard), I want alignment gate to carry a stage row in CONTRACTS.md and a plan-checker Dim 7 tracking entry, so that in-flight gate status is mechanically checkable rather than inferred from transcript archaeology.

## Scope: In

- New file `skills/build-alignment-gate/SKILL.md` created, containing the logic extracted verbatim from `agents/science-officer.md` Step 3.6 (three branches: continue / retry / escalate-to-shape, retry cap 3, alignment_confidence formula `1.0 - (retry_count * 0.2)`)
- `docs/build-pipeline/README.md` updated to list `alignment-gate` as a named pipeline stage inserted between `brainstorm` and `explore` (making the stage count 11)
- `agents/science-officer.md` Step 3.6 body replaced with a single routing delegation hint pointing to `skills/build-alignment-gate/SKILL.md`; all alignment decision logic removed from the SO god-object
- `docs/build-pipeline/_index/CONTRACTS.md` receives a new row for the `alignment-gate` stage (stage name, skill path, input contract, output contract, consumer list); entity 113's row updated to `final` status
- `references/confidence-gate.md` reviewed and updated if `alignment_confidence` factor sourcing changes as a result of the stage becoming addressable by name (no new factors added, only sourcing reference corrected)
- `docs/build-pipeline/_archive/build-entry-routing-and-alignment-gate.md` annotated with a supersession notice pointing to the new `skills/build-alignment-gate/SKILL.md`
- `effective_stages()` routing in `skills/first-officer/` or `shared-core` updated so the alignment-gate stage identity is recognized and the stage is included/excluded per profile correctly
- The four existing smoke tests in `skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` remain passing without modification (behavioral parity guarantee: extraction does not alter the gate's logic)
- Dashboard activity stream auto-picks up alignment-gate events with no new dashboard code, verified by confirming the graph is data-driven against the stage registry (acceptance criterion: alignment-gate stage name appears in dashboard stage graph after a pipeline run)

## Scope: Out

- Retroactive mutation of entity 113's body content (entity 113 is shipped and frozen; this entity only adds a supersession annotation to the archive doc)
- Any change to alignment gate behavior: retry cap, branch names (continue / retry / escalate-to-shape), or the `alignment_confidence` formula (behavioral changes are a separate follow-up entity)
- Adding new factors to `references/confidence-gate.md` beyond correcting the sourcing reference (new gate factors are a separate entity)
- Migrating other SO internal steps (Step 3.5 research dispatch, Step 3.7+) into first-class stages (each would be its own entity; this entity scopes only Step 3.6)
- Dashboard UI additions beyond what the data-driven stage graph auto-renders (no new pills, panels, or detail views; deferred to a dedicated dashboard entity)
- Generalizing a meta-framework for "any future gate becomes a stage" (the pattern may be documented as a note inside the new SKILL.md, but no framework skill or tooling is built here)
- New forge smoke-test fixtures beyond the four already in `build-shape-f5-alignment-gate.smoke.yaml` (existing fixture coverage is accepted as sufficient for this extraction; new behavioral scenarios belong to a follow-up)

## References

- `docs/build-pipeline/_archive/build-entry-routing-and-alignment-gate.md` -- entity 113 (shipped 2026-04-16), origin of Step 3.6 alignment-gate logic; this entity extracts and promotes its body
- `agents/science-officer.md` Step 3.6 (~lines 153-205) -- current internal alignment-gate implementation to be extracted
- `docs/build-pipeline/README.md` stages list -- 10-stage pipeline to become 11 stages with alignment-gate inserted
- `references/first-officer-shared-core.md` -- effective_stages() routing algorithm to be updated
- `references/confidence-gate.md` -- confidence factor sourcing; alignment_confidence consumer
- `docs/build-pipeline/_index/CONTRACTS.md` -- stage-level coherence tracking table
- `skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` -- 4 scenarios (branch-a-continue / branch-b-retry / branch-c-escalate / retry-preserves-lens-evidence), must continue passing post-extraction
- `skills/build-brainstorm/SKILL.md` "Stage Report: brainstorm (Format Addition)" section -- currently documents alignment_confidence field; may migrate to new alignment-gate stage's Stage Report contract
- `skills/build-clarify/SKILL.md` -- reference pattern for first-class gated stage skill (alignment-gate should follow its structure)

## Stage Report: shape

- **Directive**: alignment-gate-promote-to-stage (SO depolicing + pipeline control-point visibility + clarify/alignment-gate symmetry restoration)
- **Subagent dispatches**: framer (2 rounds: 3 candidates + captain-requested synthesis), story-gen (1 round), scope-drafter (1 round)
- **Captain accepts**: Problem Statement 1/1 (C1 observability-led weave synthesizing A+B+C), User Stories 5/5 (US-1..US-5 all accepted first-round), Scope: In 9/9 (Accept all), Scope: Out 7/7 (Accept all)
- **Final story count**: 5 (US-1 captain-observability, US-2 captain-dashboard, US-3 FO-routing, US-4 skill-author-binding, US-5 downstream-consumer)
- **Captain decisions locked during shape**: (1) all 3 problem framings apply (observability / architecture / symmetry), synthesized as one; (2) C1 weave preferred (observability-led); (3) conversation language switched to 中文 mid-session
- **Decomposition gate**: not triggered (5 US converge on one feature surface — SO's Step 3.6 extraction. Each US is a different stakeholder view of the same promotion action.)

## Goal Check

You are asking for the alignment-gate (currently a sub-step inside the science-officer agent) to become a first-class pipeline stage between brainstorm and explore, so its decisions show up where every other pipeline decision shows up.

- **Problem being solved**: A load-bearing captain decision is buried below the pipeline's abstraction layer, making it invisible on the dashboard, untraceable across sessions, and unreachable by downstream tooling (CONTRACTS, confidence-gate, plan-checker Dim 7).
- **Expected outcome**: `alignment-gate` appears as the 11th named stage in `docs/build-pipeline/README.md`; its extraction into `skills/build-alignment-gate/SKILL.md` leaves science-officer thinner; entity 113's Step 3.6 body is replaced with a routing hint; dashboard activity stream shows entry/exit events for this stage; CONTRACTS carries a stage row; F5 smoke tests keep passing unchanged.
- **Explicit non-goals**: Changing the gate's retry cap, branch names, or `alignment_confidence` formula; introducing new confidence factors; migrating other SO internal steps to stages; adding dashboard UI elements beyond data-driven stage-graph pickup; generalizing a "any gate → stage" framework.

## Lens Evidence

### Lens (a) captain-stated-intent

- Alignment Gate must be positioned between brainstorm and explore, with stage flags `gate: true, worktree: false, dispatch: simple` -- directive:verbatim [primary]
- Engine-level edits are in-scope: README stages list, effective_stages(), FO dispatch paths, dashboard event schema, confidence-gate factor definition -- directive:verbatim [primary]
- 113 body is frozen; F5 smoke tests must remain passing unmodified (behavioral parity guarantee) -- shape:Scope-In + Scope-Out [primary]
- Clarify stage is the structural analog -- already a gated stage, isomorphic to alignment-gate; the 113 O-1 asymmetry was an implementation-convenience misjudgment -- directive:verbatim [primary]
- SO must shrink to routing + context_status transition; "hosting gates" is explicitly called out as the god-object anti-pattern -- directive:verbatim [primary]
- Pipeline stage count changes 10 → 11; gate-behavior parameters (retry cap, branches, formula) are OUT-of-scope -- shape:Scope-In + Scope-Out [primary]

### Lens (b) captain-unstated-intent

- Captain assumes pipeline-graph visibility is the authoritative control-point audit surface; hidden in-skill steps are a defect not a cosmetic issue -- entity:094 [primary]
- Captain assumes SO agent stays narrow/single-purpose; orthogonal concerns belong in their own stage -- memory:subagent-first-for-all-stages-except-clarify [primary]
- Captain assumes effective_stages / profile routing is the correct extension point for new control points, not in-agent Step N.N insertions (inferred) -- entity:113 [secondary]
- Captain assumes entity 113's shipped Step 3.6 will be migrated-not-duplicated once 114 lands (inferred) -- entity:113 [primary]
- Captain assumes alignment-gate needs its own CONTRACTS entry post-extraction because cross-skill calls require contract tests -- memory:contract-tests-cover-unconditional-calls [secondary]
- Captain assumes this extraction unblocks entity 070 DAG/roadmap work that consumes stage-graph readiness -- entity:070 [tertiary]

### Lens (c) codebase-current-state

- `docs/build-pipeline/README.md:7-82` defines 10 stages in `stages.states`; clarify at :44-61 (`gate: true`, `manual: true`, `skill: spacedock:build-clarify`) is the direct structural precedent [primary]
- `references/first-officer-shared-core.md:88-115` — `effective_stages()` reads `stages.states` as canonical ordering; stage names are the routing keys [primary]
- `agents/science-officer.md:153-206` — Step 3.6 body spans 54 lines; writes into `## Stage Report: brainstorm` (NOT its own stage report); has 3 branches + retry cap + `alignment_confidence` formula [primary]
- `references/confidence-gate.md:1-44` — confidence factors only parse `## Stage Report: {quality|execute|review|uat}` sections today; alignment_confidence has no factor slot — **adding one is OUT of scope, but a new alignment Stage Report could become sourceable later** [secondary]
- `docs/build-pipeline/_index/CONTRACTS.md` — entity 113 has 7 rows currently `🟡 in-flight` keyed on `(entity, task, file)`, NOT on stage name — "auto-pickup by stage name" is partly aspirational; CONTRACTS schema may need extension OR the stage row goes in a different section [primary]
- `skills/build-shape/smoke-tests/build-shape-f5-alignment-gate.smoke.yaml` — 4 scenarios, declared `skill: spacedock:science-officer`; if skill ownership moves to `spacedock:build-alignment-gate`, fixture's `skill:` field must still pass — verify F5 contract handles the rename [secondary]

### Lens (d) sibling-entity

- entity 113 (archived, shipped) has 7 in-flight CONTRACTS rows on the exact same files touched here — entity 114 MUST finalize these to `final` as part of its CONTRACTS transition -- entity:build-entry-routing-and-alignment-gate [primary]
- entity 091 (clarify-pre-presentation-evidence-gate, clarify) modifies `agents/science-officer.md` Step 3 (~line 99) and `skills/build-clarify/SKILL.md` — disjoint line-wise from 114's Step 3.6 replacement, but same file; coordinate merge order -- entity:clarify-pre-presentation-evidence-gate [primary]
- entity 094 (warroom-pipeline-graph-visualization, clarify ready) parses `README.md` stages list server-side into `PipelineStage[]` — if 094's graph is data-driven, alignment-gate auto-appears as stage #11 (US-2 depends on this) -- entity:warroom-pipeline-graph-visualization [secondary]
- entity 082/083 (pre-ship-confidence-gate, in-flight) edits `references/confidence-gate.md` and `references/first-officer-shared-core.md` — 114's sourcing-correction risks line-conflict; sequence 114 AFTER 082 ships -- entity:pre-ship-confidence-gate [primary]
- entity 090 (shipped-stage-mod-and-graft-migration) edits `references/first-officer-shared-core.md:390-391` (mod loading) — orthogonal to 114's effective_stages() edits (different line range); minor merge coordination -- entity:shipped-stage-mod-and-graft-migration [tertiary]
- entity 070 (build-flow-roadmap-orchestration, draft) — no current CONTRACTS binding to alignment-gate; readiness-score consumption not yet coupled -- entity:build-flow-roadmap-orchestration [tertiary]

## Core Tensions

- **(time-based)**: entity 082/083 (pre-ship-confidence-gate) is in-flight on `references/confidence-gate.md`; entity 114 also touches it. Ship-order coordination required — 114 either sequences AFTER 082 or limits confidence-gate.md touch to zero-conflict zones.
- **(domain-based)**: CONTRACTS.md today keys rows on `(entity, task, file)` not on stage names. "Auto-pickup by stage name" for alignment-gate requires either CONTRACTS schema extension or accepting that stage-level tracking is a future-oriented contract. Scope: In claims "auto-pickup verified" — this may need α-marking during plan unless schema already allows it.
- **(essential)**: F5 smoke fixture hard-codes `skill: spacedock:science-officer`. If alignment-gate becomes `spacedock:build-alignment-gate`, the fixture's `skill:` field drifts — but Scope: In forbids modifying F5. Resolution: F5's top-level skill remains `spacedock:science-officer` (SO still routes to the new stage, just delegates the body); actual gate-internal assertions (branches, confidence formula) are agnostic to skill ownership.

## Honest Boundaries

- "Dashboard auto-picks up alignment-gate events with no new dashboard code" depends on entity 094's rendering being truly data-driven. Lens (d) confirmed server-side parses `stages.states` into `PipelineStage[]`, but client-side rendering may have enumeration not yet verified. Plan phase must read 094's current state.
- confidence-gate currently does not parse a `## Stage Report: alignment-gate` section. Making the new stage's Stage Report *sourceable* for a future factor is Scope: Out for 114, but the Stage Report format must still be grep-parseable in case a follow-up entity adds the factor slot.
- CONTRACTS schema compatibility for stage-level rows (vs task-level) is not yet verified. If CONTRACTS requires a task-id per row, "CONTRACTS row for alignment-gate stage" may need to be task-like (e.g. "Task: alignment-gate stage run N") rather than schema-genuinely-stage-level.
- Forge fixture F5's semantics after skill-name change are not yet tested — the assertion text (`context_status: blocked`, `supersedes:`, `alignment_confidence`) is behavior-level and should survive, but `skill:` field compatibility needs plan-phase verification.

## Brainstorming Spec

**APPROACH**: Perform a targeted extraction refactor in 4 coordinated edits. (1) Create `skills/build-alignment-gate/SKILL.md` by lifting `agents/science-officer.md:153-206` (Step 3.6 body) verbatim, re-framing it as a first-class skill with its own Stage Report contract (`## Stage Report: alignment-gate` with fields `branch`, `retries`, `alignment_confidence`). (2) Add `alignment-gate` as the 11th entry in `docs/build-pipeline/README.md` `stages.states`, positioned between `brainstorm` and `explore`, with `gate: true, worktree: false, dispatch: simple, skill: spacedock:build-alignment-gate`. (3) Replace `agents/science-officer.md:153-206` with a 5-10 line routing hint: "After brainstorm completes, FO dispatches the alignment-gate stage (see `skills/build-alignment-gate/SKILL.md`). SO returns control." (4) Annotate `docs/build-pipeline/_archive/build-entry-routing-and-alignment-gate.md` with a supersession note pointing to entity 114 and the new skill path. CONTRACTS transitions: entity 113's 7 in-flight rows → `final`; add a new row scoped to entity 114 tracking the alignment-gate stage promotion. Because `effective_stages()` reads `stages.states` as the source of truth (Lens (c) primary finding at `references/first-officer-shared-core.md:88-115`), routing updates happen automatically once README is edited — no separate routing-table edit needed. Dashboard auto-pickup is verified as an acceptance criterion by running any entity through the pipeline and observing the stage appears in the graph. F5 smoke fixture stays unmodified; since `skill:` field names SO (who now dispatches rather than hosts), assertions remain semantically valid.

**ALTERNATIVE**: Keep Step 3.6 inside science-officer.md but add an `alignment-gate` entry to `stages.states` as a "virtual stage" that dispatches back into SO (essentially a stage alias). -- D-01 Rejected: this preserves the accretion problem (SO still hosts gate logic) while adding stage-list complexity. It creates a worse architecture than either the current state or full extraction: visibility improves superficially but the skill-contract boundary remains blurred, and future skill authors still cannot bind contracts to a clean skill file. Captain's Scope: In item "all alignment decision logic removed from the SO god-object" explicitly rules this out.

**GUARDRAILS**:
- Entity 113's body (including its Stage Report: execute) MUST NOT be edited; only the archive file gets a supersession header appended (Scope: Out item 1)
- F5 smoke tests MUST continue to pass unchanged — any scenario failure after extraction is a blocker (Scope: In item 8, parity guarantee)
- Gate behavior (retry cap = 3, branches = continue/retry/escalate, formula = `1.0 - retry_count × 0.2`) MUST be preserved verbatim (Scope: Out item 2)
- No new fields added to `references/confidence-gate.md` factor list (Scope: Out item 3, sourcing-correction only)
- Coordinate merge order with in-flight entity 082/083 (pre-ship-confidence-gate) on `references/confidence-gate.md` — ship AFTER 082 OR restrict 114's touch to non-overlapping lines (Core Tension time-based)
- Use `--` double-dash discipline everywhere (no em-dash), matching build-skill family conventions
- Any CONTRACTS schema assumption about "stage-level rows" must be verified against the current CONTRACTS format before plan approval — if schema is task-keyed only, stage-level tracking requires a Scope: In item amendment OR α-marker acknowledging the limitation

**RATIONALE**: Extraction (APPROACH) is chosen over virtual-stage aliasing (ALTERNATIVE) because only extraction achieves the full set of declared outcomes. The captain's explicit Scope: In bullet "all alignment decision logic removed from the SO god-object" (US-4) eliminates any design that leaves the body inside SO. Once extraction is chosen, the only remaining design decisions are mechanical: where the new skill file lives, how the routing hint reads, and what the new Stage Report looks like. The cost of extraction is modest — one new skill file, four small edits across README/SO/archive — and the correctness surface is small because F5 smoke fixtures already cover the behavioral contract that must survive. Precedent strongly supports this path: clarify is already a first-class gated stage (Lens (c) confirms symmetry); entity 113's own O-1 analysis already enumerated the extraction option and rejected it only on implementation-convenience grounds that captain now overrides explicitly. Risk is concentrated on cross-entity merge coordination (Core Tension time-based with 082/083) and CONTRACTS schema assumptions (Honest Boundary), both of which are plan-phase concerns not APPROACH-phase showstoppers.

## Acceptance Criteria

- Given `docs/build-pipeline/README.md` after 114 ships, when `grep -c "name: alignment-gate" README.md` runs, then it returns ≥1 (how to verify: `grep -c "name: alignment-gate" docs/build-pipeline/README.md`)
- Given the new skill file, when `ls skills/build-alignment-gate/SKILL.md` runs, then the file exists and is non-empty (how to verify: `test -s skills/build-alignment-gate/SKILL.md && echo OK`)
- Given `agents/science-officer.md` after 114 ships, when `grep -c "Step 3.6: Alignment Gate" agents/science-officer.md` runs, then it returns 0 or ≤1 (only a routing-hint reference, not the full body) AND `wc -l` on the Step 3.6 region is ≤15 lines (how to verify: `grep -c` + `sed -n` to extract Step 3.6 region, then `wc -l`)
- Given the F5 smoke fixture unchanged, when forge (or manual walkthrough) validates F5's 4 scenarios, then all 4 continue to pass with the new skill dispatching via SO routing (how to verify: `forge validate skills/build-shape` — if forge unavailable, manual walkthrough against current fixture assertions)
- Given the archive file, when `grep "supersed" docs/build-pipeline/_archive/build-entry-routing-and-alignment-gate.md` runs, then it finds a supersession annotation pointing to entity 114 or skills/build-alignment-gate/SKILL.md (how to verify: `grep -l "alignment-gate-promote-to-stage\|skills/build-alignment-gate" docs/build-pipeline/_archive/build-entry-routing-and-alignment-gate.md`)
- Given CONTRACTS.md after 114 ships, when checking entity 113's rows, then all 7 rows are `✅ final` (none remain `🟡 in-flight`) (how to verify: `grep "build-entry-routing-and-alignment-gate" docs/build-pipeline/_index/CONTRACTS.md | grep -c "in-flight"` returns 0)
- Given dashboard activity stream after 114 ships, when the next entity passes through the alignment-gate stage, then a `dispatch` event with `stage: alignment-gate` appears in `/api/events` (how to verify: POST to `/api/events` during a pipeline run and `grep "alignment-gate"` the event log)
- Given `references/first-officer-shared-core.md` effective_stages() logic unchanged in code, when the 11-stage README is loaded, then `effective_stages()` returns the full 11-stage ordering including alignment-gate (how to verify: read README stages in order; pipeline should traverse brainstorm → alignment-gate → explore for a fresh entity)
