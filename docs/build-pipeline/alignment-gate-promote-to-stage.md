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
shape_status: draft
---

## Captain Context Snapshot

- **Invoked**: 2026-04-16T00:30:00+08:00 via `/shape`
- **Directive (verbatim)**:

> alignment-gate-promote-to-stage -- 把 entity 113 shipped 的 Step 3.6 Alignment Gate 從 agents/science-officer.md 內部抽出來，升格成 build pipeline 的 first-class stage（位於 brainstorm 和 explore 之間，gate: true, worktree: false, dispatch: simple）。目的是把 captain 控制點從 SO 內部顯性化到 pipeline 骨架上 — (a) dashboard 活動流能看到進入/離開 alignment-gate 的事件；(b) 獨立 Stage Report: alignment-gate 可被 confidence-gate 當 factor 來源；(c) CONTRACTS.md 能追蹤 alignment-gate 的 in-flight 狀態給 plan-checker Dim 7；(d) SO 職責瘦回 routing + context_status transition，不 hosting gates。同時 review：clarify stage 已經是 gated stage，alignment-gate 與它同構，不對稱是 113 當時 O-1 的實作便利誤判。牽涉 README stages list、effective_stages()、FO dispatch 路徑、dashboard event schema、confidence-gate factor 定義 — 架構級修正。

- **Conversation context**: Captain critiqued entity 113's O-1 decision post-ship: alignment-gate embedded in SO is (1) invisible on pipeline graph, (2) makes SO a god-object, (3) skips pipeline-level observability (events, CONTRACTS, Stage Report, confidence factor). FO acknowledged the critique and drafted this shape directive. Entity 113 remains shipped and unmodified; this entity refactors the implementation location without revising 113's behavioral contract.

## Problem Statement

The build pipeline's Alignment Gate is a consequential captain control point — the moment where science-officer pauses to confirm problem framing before committing downstream analysis effort — yet it lives inside agents/science-officer.md as an internal Step 3.6 rather than as a first-class pipeline stage. Because it is not a stage, the decision event is invisible to the dashboard activity stream, buried in agent transcripts, and untraceable across sessions or concurrent multi-entity work, so captains cannot audit or resume an alignment conversation the way they can a clarify gate. The same sub-stage placement causes structural accretion in science-officer, which now bundles routing, context_status management, brainstorm/explore/clarify orchestration, and this captain gate into a single agent file that no downstream layer can cleanly bind against. Confidence-gate factor sources, plan-checker Dim 7 in-flight tracking, CONTRACTS.md stage rows, and effective_stages() routing all key off stage identity, so a gate that doesn't exist at the stage layer cannot be referenced, tested, or routed around. Meanwhile clarify — a structurally equivalent captain gate — is a first-class stage with its own row, its own skill, and its own dashboard footprint, making the asymmetry glaring to anyone comparing the two. That asymmetry trains agents, captains, and downstream skill authors to stop trusting the pipeline model as source of truth, because they can see with their own eyes that the model omits a gate they depend on. All three pains — invisible control, accreted architecture, broken symmetry — are surface expressions of the same root condition: a load-bearing captain decision lives below the pipeline's abstraction layer, where neither tooling nor humans can reach it as a stage.
