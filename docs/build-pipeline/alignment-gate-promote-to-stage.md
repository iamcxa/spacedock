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
