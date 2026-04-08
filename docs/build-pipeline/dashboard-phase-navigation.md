---
id: 029
title: Dashboard Phase Navigation — Entity Detail 階段導覽與快速跳轉
status: plan
source: captain observation (026 shipping session — detail page 無法按 phase 導覽)
started: 2026-04-08T03:25:00Z
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
