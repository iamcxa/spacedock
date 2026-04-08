---
id: 028
title: Dashboard Mermaid Rendering — Entity Detail 架構圖支援
status: explore
source: captain observation (026 shipping session — spec 應含架構圖)
started:
completed:
verdict:
score: 0.7
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- None

## Problem

Entity detail page 渲染 markdown body 時不支援 mermaid 語法。Brainstorming spec 和 plan 文件中的架構圖只顯示為純文字 code block，無法視覺化。

Captain 期望：spec 應預設包含架構圖，方便 agent 和人類協作時快速理解系統邊界和資料流。

## Brainstorming Spec

APPROACH:     在 detail page 引入 mermaid.js（CDN 或 bundle），偵測 markdown 中的 ````mermaid` code blocks 並渲染為 SVG 圖表。同時在 build pipeline spec template 中建議加入架構圖（非強制）。
ALTERNATIVE:  (A) 只支援圖片嵌入（rejected: 需要額外工具產生圖片，不如 mermaid 直接在 markdown 中寫）。(B) 全套 markdown renderer 如 marked.js（rejected: 現有渲染邏輯夠用，只缺 mermaid）。
GUARDRAILS:   Mermaid.js 體積較大（~1.5MB minified）— 用 CDN lazy load，不影響首屏載入速度。僅在 detail page 載入，不影響 main dashboard 頁面。渲染失敗時 fallback 顯示原始 code block（不要空白）。
RATIONALE:    Architecture diagrams 是 agent-human 協作的高價值溝通工具。Mermaid 已是 GitHub/GitLab/Notion 標準，developer 熟悉語法。在 dashboard 支援 mermaid 讓 spec review 和 gate approval 更有效率。

## Acceptance Criteria

- Entity detail page 中的 ````mermaid` code blocks 渲染為 SVG 圖表
- 支援常用 mermaid 圖表類型：flowchart, sequence, class, graph
- 渲染失敗時 fallback 顯示原始 code block + 錯誤提示
- CDN lazy load — 不影響 dashboard 首屏載入
- Share page 也支援 mermaid 渲染
