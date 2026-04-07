---
id: 020
title: Dashboard Dependency Graph — Entity 相依性視覺化與 Blocked 偵測
status: research
source: captain direction (pipeline operation observation)
started: 2026-04-07T10:45:00Z
worktree: .worktrees/auto-researcher-dashboard-dependency-graph
completed:
verdict:
score: 0.85
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- None (can be built on current dashboard)

## Brainstorming Spec

APPROACH:     三層遞進：(1) Frontmatter 結構化 — 新增 `depends-on:` field（ID list），status script 偵測 blocked entities（dependency 未 shipped/completed）。(2) Table UI — entity table 顯示 dependency badge（🔗 有依賴、🚫 blocked），hover 顯示依賴清單。(3) DAG 視覺化 — detail page 或主頁以 mini dependency graph 呈現 entity 間的關係，標示完成/進行中/blocked 狀態。
ALTERNATIVE:  (A) 純文字 Dependencies section 不動（rejected: 已證明不夠 — captain 無法從 UI 看出相依性）。(B) 只做 frontmatter + CLI（rejected: 不符合 dashboard 視覺化方向）。(C) 全功能 Gantt chart（rejected: 過度設計，entity 沒有時間估算）。
GUARDRAILS:   `depends-on:` field 是 optional — 不破壞現有 entity 格式。Blocked 偵測是 advisory（不阻止 dispatch — FO 仍可判斷）。Graph 渲染複用現有 SVG pipeline graph pattern（visualizer.js）。不引入外部 graph library（保持 zero-dependency frontend）。
RATIONALE:    Pipeline 運作到 20 個 entity 後，相依性管理變成痛點。016 依賴 015（pending），017 依賴 016 和 015 — 這些關係目前只存在 markdown 文字中，captain 需要手動追蹤。結構化 + 視覺化讓 pipeline 操作更透明。

## Acceptance Criteria

- Entity frontmatter 支援 `depends-on: [007, 016]` field（ID list）
- `status --next` 考慮 dependency：未完成的 dependency 不出現在 dispatchable list
- Entity table 顯示 dependency 狀態（有依賴/blocked/clear）
- Hover 或 tooltip 顯示依賴清單和各依賴的完成狀態
- Detail page 顯示 dependency mini-graph（SVG，複用 visualizer.js pattern）
- 現有無 `depends-on` field 的 entity 不受影響（向後相容）
