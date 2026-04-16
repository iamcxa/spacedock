---
id: 123
title: "Spacedock core reshape — FO/ensign architecture, upstream alignment, workflow-as-plugin framework"
slug: spacedock-core-reshape-workflow-as-plugin
status: draft
context_status: pending
source: /shape (post-PR #55 strategic pivot, 2026-04-16)
created: 2026-04-16T00:00:00+08:00
shape_status: draft
intent:
scale:
project: spacedock
---

## Captain Context Snapshot

**Raw directive** (2026-04-16): spacedock 的 FO/ensign/workflow 架構重塑，結合 upstream (clkao) 演進 + fork (iamcxa) 特色 + workflow-as-plugin 目標

**Session context**:
- PR #54 opened as upstream clkao review artifact (368 non-UI files drifted)
- PR #55 opened as focused FO shared-core merge using new A-B-C-D-E protocol (57/57 invariants pass)
- Captain proposed workflow-as-plugin framework earlier this session, parked pending upgrade
- Captain pivoted to redesign approach — merge protocol won't scale to 6 more drifted files and doesn't serve workflow-as-plugin goal
- Entity 040 (plugin-architecture-v2) + entity 060 (engine/bridge cutover) are the architectural endpoints this reshape serves

**Three concerns to be unified in shape**:
1. Absorb upstream (clkao) semantic evolution (#58 runtime adapter, #97 FO Write Scope, #157 model routing, #159 grep discipline, #148 pytest migration, debrief skill)
2. Preserve fork (iamcxa) feature surface (Event Emission, Effective Stages, Brainstorm Triage, Channel Awareness, Confidence Gate, Dashboard wiring, Layered mods)
3. Enable workflow-as-plugin framework shape where workflow = skills + workflow-meta + officers packaged as composable plugin unit

## Problem Statement

Spacedock 今天是以單一 monolithic CC plugin 出貨 — skills / workflow pipeline / agents 全部 entangled 在一個 `.claude-plugin/plugin.json` 底下，即使 captain 長期以來的工作模型一直把 workflow 當成 `{skills/, workflow/, agents/}` 這樣一個可組合的單元，第三方應該能 author 並 plug 進一個共享的 engine。想在 upstream 上疊 dashboard、channel、或自訂 gate 行為的 fork 貢獻者無法表達這個意圖 — 除了 fork 整個 repo 之外 — 而這恰好就是目前 drift 累積的方式。Captain 要做其他 workflow（overhaul、spacebridge、未來 domain-specific pipelines）也沒有能 target 的 contract，除非把整個 engine vendor 進來。這現在重要是因為每一場架構對話 — engine/bridge split、FO redesign、workflow-as-plugin — 都預設了一個還沒存在於 codebase 裡的組合邊界，而繼續圍繞這個隱性邊界做設計會產出 skills 的依賴只能靠讀每個檔案才能理解。

## User Stories

- **US-1**: As a fork maintainer, I want to drive multiple workflow plugins with the same FO engine, so that I can upgrade upstream spacedock core without re-merging my domain-specific pipeline logic each time.
- **US-2**: As an upstream contributor, I want a stable engine contract to contribute against, so that my changes to core primitives don't silently break fork maintainers' workflows.
- **US-3**: As a downstream plugin author, I want to express a domain-specific workflow as a plugin that registers against a shared engine, so that I can ship and maintain it independently without forking the entire spacedock repo.
- **US-4**: As an end-user captain, I want FO behavior to remain consistent regardless of which workflow plugin is active, so that I can run entities without needing to understand the underlying plugin composition.
- **US-5**: As a fork maintainer, I want composition boundaries between engine, workflow, and skills to be explicit and machine-readable, so that dependency relationships don't require reading every file to understand.

## Pending Knowledge Captures

<capture>
**Type**: skill UX improvement (build-shape)
**Observation**: AskUserQuestion 的 preview 欄位對長段落（3-6 sentence problem statements / scope items / user stories）太窄，captain 看不到全文。
**Pattern that works**: 先在對話主線列出完整候選內容，AskUserQuestion 只用短 label + description 當選擇器。preview 適合 ASCII mockup / code snippet 這類固定寬度藝術品，不適合中長段落文字。
**Scope**: 影響 build-shape Steps 3/4/5 的所有 AskUserQuestion 呼叫。build-clarify 類似場景也可能適用。
**Recommended edit target**: `skills/build-shape/SKILL.md` Step 3/4/5 的 AskUserQuestion 示例要加 note：「long-form content 不要放 preview，改放對話主線」。
</capture>

