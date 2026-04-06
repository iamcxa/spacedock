---
id: 015
title: Dashboard War Room Identity — 戰情室品牌重塑與指揮中心體驗
status: quality
source: /build brainstorming
started: 2026-04-06T00:30:00+08:00
completed:
verdict:
score: 0.75
worktree: .worktrees/spacedock-ensign-dashboard-warroom-identity
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- Feature 007 completed (channel plugin, dashboard foundation)

## Brainstorming Spec

APPROACH:     將 dashboard 從「監控面板」重新定位為「戰情室」(War Room)。三大支柱：(1) 品牌重塑 — 命名、標題、header 統一為「戰情室」。(2) B+C 整合 Layout — 三欄佈局（MISSIONS tree + MAIN + COMMS 固定 320px）+ 頂部警報列（僅限需要人類行動的項目）。(3) Retro Aerospace 視覺風格 — 深海軍藍底(#1a1a2e) + 暖白文字(#e0d6c8) + 紅色 accent(#e94560) + 青綠互動(#53a8b6)，刻意避開 Agentic AI 共同風格（GitHub Primer / Claude 藍色系）。
ALTERNATIVE:  (A) 保持 "Dashboard" 命名 + 現有雙欄 layout（rejected: 被動觀看心智模型，無法承載後續 gate approval 和多人協作）。(B) Pipeline Hero layout — pipeline 全寬置頂（rejected: 缺乏深度操作空間）。(C) Military HUD 風格（rejected: 太極端，不夠專業溫暖）。(D) Clean Tactical 亮色風格（rejected: 反差太大，不符合指揮中心氛圍）。
GUARDRAILS:   命名變更不影響現有 API routes 和 channel protocol。內部程式碼保留 "dashboard" 命名。Multi-root 聚合拆到 entity 018 獨立處理。Gate approval 操作拆到 entity 016。左欄 tree view 先支援單 repo 多 workflow。
RATIONALE:    Captain 的使用模式分析（14 entities 歷史）顯示最接近 Mission Control — 多任務並行監控、gate 介入點決策、activity feed 為核心、異常驅動介入。但願景正往 War Room 移動（016 Gate Approval UI、017 Shareable）。「戰情室」品牌重塑是這個轉型的概念基礎。Retro Aerospace 風格在 brainstorming 中從 4 個方案中選出，兼顧辨識度和專業感。

## Design Spec

Full design spec: `docs/superpowers/specs/2026-04-06-dashboard-warroom-identity-design.md`

## Acceptance Criteria

- 頁面標題和 header 顯示「◆ 戰情室」，detail page 顯示「← 返回戰情室」
- 三欄 layout：MISSIONS tree (120px) + MAIN (flex) + COMMS (320px fixed)
- 警報列：僅顯示需要人類行動的項目（gate pending, agent error），無待處理時隱藏
- MISSIONS tree view：workflow 可展開/收合，entity 顯示狀態 icon（🟠 gate / 🔵 active），shipped 顯示計數
- Retro Aerospace 色系：深海軍藍底、紅色 accent、暖白文字、青綠互動元素
- COMMS ticker：底部一行式摘要顯示最近事件
- 現有功能全部保留，無 API/channel 破壞性變更
- 內部程式碼命名保留 dashboard（避免 scope creep）
- 響應式：窄螢幕隱藏 MISSIONS 欄、堆疊 COMMS
