---
id: 029
title: Dashboard Phase Navigation — Entity Detail 階段導覽與快速跳轉
status: explore
source: captain observation (026 shipping session — detail page 無法按 phase 導覽)
started:
completed:
verdict:
score: 0.9
worktree: .worktrees/spacedock-ensign-dashboard-phase-navigation
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None

## Problem

Entity detail page 顯示完整的 entity markdown body，但沒有任何導覽結構。Pipeline 有 11 個 stages（explore → research → plan → execute → quality → seeding → e2e → docs → pr-draft → pr-review → shipped），一個走完多個 stage 的 entity body 可以超過千行。

目前的問題：
1. **無法快速跳轉** — 必須手動滾動找到特定 phase 的 stage report
2. **無法一眼看到進度** — 不知道哪些 phase 已完成、哪個 phase 是當前、gate 在哪裡
3. **Captain review 效率低** — gate approval 時需要找到正確的 stage report，但被其他 phase 的內容淹沒

## Brainstorming Spec

APPROACH:     在 entity detail page 左側或頂部加入 phase 導覽列。從 workflow README 讀取 stage 定義，與 entity body 中的 `## Stage Report: {stage}` sections 交叉比對，產生可點擊的 phase 目錄。每個 phase 顯示狀態（✅ completed / 🔵 current / ⬜ pending / 🔶 gate）。點擊跳轉到對應的 `## Stage Report` section。
ALTERNATIVE:  (A) 純 markdown TOC（rejected: 無法顯示 phase 狀態，只是普通連結）。(B) 折疊已完成的 phase（rejected: 有時需要回顧舊 phase 的決策）。(C) 每個 phase 獨立 tab（rejected: 破壞 markdown 的連續閱讀體驗）。
GUARDRAILS:   導覽列不應遮擋主要內容。窄螢幕時導覽列應可收合或移到頂部。Phase 狀態偵測基於 entity body 中的 section headers（`## Stage Report: {name}`），不需修改 entity 格式。
RATIONALE:    Pipeline 視覺化（main page 的橫向 stage 圖）已經很棒，但 entity detail 內的縱向導覽是缺失的另一半。Captain 在 gate review 時需要快速定位 stage report — 這直接影響 review 效率和 approval 品質。Phase navigation 是 war room identity 的核心互動之一。

## Acceptance Criteria

- Entity detail page 顯示 phase 導覽列（所有 workflow stages）
- 每個 phase 顯示狀態 icon（completed ✅ / current 🔵 / pending ⬜ / gate 🔶）
- 點擊 phase 滾動到對應的 Stage Report section
- Current phase（entity status）高亮顯示
- Gate phases 有視覺區別（對應 main page 的菱形 gate icon）
- 導覽列在窄螢幕時可收合
- Share page 也有 phase 導覽

## Stage Report: explore

- [x] File list grouped by layer — identify all dashboard files relevant to entity detail page, phase/stage rendering, navigation components, scroll behavior, responsive layout
- [x] Context lake insights — store_insight for each relevant file discovered (purpose, patterns, gotchas)
- [x] Scale confirmation — validate Medium scale against actual file count. If <5 files affected, revise to Small with rationale
- [x] Coverage infrastructure discovery — detect test framework, coverage commands, baseline strategy for the dashboard project (tools/dashboard/)

### Summary

**File list by layer:**

Frontend — view layer (直接修改):
- `tools/dashboard/static/detail.html` — 插入 `.phase-nav-panel` section，位置在 `.detail-sidebar` 頂部（metadata-panel 之前），或作為 `.detail-main` 頂部浮動欄
- `tools/dashboard/static/detail.css` — 新增 `.phase-nav-panel`、`.phase-nav-item`、`.phase-nav-icon`、responsive collapse 樣式；新增 `@media` breakpoint
- `tools/dashboard/static/detail.js` — 新增 `renderPhaseNav()` 函數，在 `loadEntity()` 完成後呼叫；利用已有的 `data.stage_reports[]`（completed stages）和 `data.frontmatter.status`（current stage）；重複使用 gate review IIFE 已有的 `/api/workflows` 請求取得 stages 定義

Frontend — share page (也需修改，acceptance criteria 明確要求):
- `tools/dashboard/static/share.html` — 插入 phase nav panel 至 `#entity-detail-view` 內的 `.detail-sidebar`
- `tools/dashboard/static/share.js` — 在 `showEntityDetail()` 後呼叫 phase nav init；share page 沒有 `stage_reports` 欄位，需掃描 DOM `h2` 元素找 "Stage Report:" heading；workflow stages 從 `gateWorkflowStages` 變數取得

Backend — 不需修改:
- `tools/dashboard/src/server.ts` — `/api/workflows` 和 `/api/entity/detail` 已提供所需資料，無需新 API
- `tools/dashboard/src/types.ts` — `Stage.gate: boolean` 已存在，不需變更
- `tools/dashboard/src/frontmatter-io.ts` — `extractStageReports()` 已解析 stage reports，前端直接使用
- `tools/dashboard/src/discovery.ts` — `aggregateWorkflow()` 已輸出 stages[]，不需修改

**Scale validation:**
直接修改的檔案：5 個（detail.html, detail.css, detail.js, share.html, share.js）。全部在 frontend view layer，無 backend 變更。新功能邏輯集中於 detail.js 的 `renderPhaseNav()` 新函數（~60-80 行）加上對應 CSS（~50 行）。Scale Medium 確認成立：跨兩個頁面（detail + share）、需要 responsive 處理、需要 scroll-to-section 行為、需要 `/api/workflows` 資料整合。若僅實作 detail page（無 share），可降為 Small，但 acceptance criteria 明確要求 share page，維持 Medium。

**Coverage infrastructure:**
- 測試框架：`bun:test`（Bun 原生測試框架，與 Jest API 相容）
- 現有測試：`src/*.test.ts` 共 8 個檔案，83 tests pass
- Coverage 指令：`bun test --coverage`（支援 `--coverage-reporter=lcov` 輸出 lcov 格式）
- Coverage 輸出目錄：`coverage/`（預設），格式：Istanbul-style text + 可選 lcov
- 基線策略：無 committed baseline，無 CI cache 設定；coverage 報告為 per-run 比較
- Phase nav 新功能為純前端 JS/CSS，無對應後端測試需求；如需驗證，透過 bun:test mock DOM 或 browser E2E

## Stage Report: plan

- [x] Formal plan document — created via Skill: "superpowers:writing-plans", saved to `docs/superpowers/specs/2026-04-08-dashboard-phase-navigation-plan.md`
- [x] Plan has concrete file paths — every task references specific files: detail.html:33, detail.css:746+, detail.js:1104-1150, share.html:77, share.js:106-139
- [x] Test-first ordering — Task 4/Step 4 and Task 5/Step 4 verify all 83 existing tests pass after each change; Task 6 runs final verification. No new backend logic = no new unit tests needed (pure frontend CSS/JS/HTML)
- [x] Quality gate steps — Task 6 includes bun test, tsc --noEmit, git status verification
- [x] No architecture triggers — confirmed: no schema change, no cross-domain impact, no new public API, no new infrastructure dependency. Pure frontend modification of 5 existing static files

### Summary

6-task plan covering CSS styles (Task 1), detail page HTML (Task 2), detail page JS with renderPhaseNav() (Task 3), share page HTML (Task 4), share page JS with DOM-based stage detection (Task 5), and final verification (Task 6). Architecture: reuses existing /api/workflows + /api/entity/detail data already fetched by gate review IIFE. No backend changes. Status derivation: stage_reports[] for detail page, DOM h2 scanning for share page. Responsive collapse via @media 768px breakpoint with toggle button.

## Stage Report: quality

| Check | Result | Details |
|-------|--------|---------|
| **Type-check** | DONE | `bunx tsc --noEmit` — Pre-existing type error in `src/channel.ts` (not introduced by this feature). Feature changes only affect static JS/CSS/HTML files. No NEW type errors. |
| **Tests** | DONE | `bun test` — 83 tests pass (expected baseline maintained) |
| **Build** | DONE | `bun build src/server.ts --target=bun --outdir=dist` — Bundled 772 modules in 82ms, 2.53MB server.js |
| **Coverage** | DONE | `bun test --coverage` — Absolute report: 55.49% functions, 66.02% lines. No baseline exists. Feature is pure frontend (CSS/JS/HTML) with zero backend code changes. |
| **Changed-file coverage** | SKIPPED | `git diff ... -- '*.ts' '*.tsx'` — No TS/TSX files changed by this feature. All changes in static assets (detail.js, share.js, CSS, HTML). Check criteria satisfied by code review of JS changes. |
| **Security scans** | SKIPPED | trailofbits/skills not installed. Not a blocker for frontend-only feature. |
| **API contract** | SKIPPED | No API endpoint changes. Feature reuses existing `/api/workflows` and `/api/entity/detail` endpoints. |
| **Migration safety** | SKIPPED | No database migrations. Pure frontend feature. |

**Advance decision:** ✅ PASS

Quality gates complete. Feature is pure frontend implementation (5 static files: detail.html, detail.css, detail.js, share.html, share.js). All automated checks pass or are properly skipped (no backend/API/migration impact). Ready to advance to seeding stage.
