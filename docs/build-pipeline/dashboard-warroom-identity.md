---
id: 015
title: Dashboard War Room Identity — 戰情室品牌重塑與指揮中心體驗
status: explore
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

## Stage Report: explore

- [x] File list grouped by layer (frontend: HTML, CSS, JS; server: TS) with one-line purpose note for each
  See layers below. 9 relevant files total across 3 layers.
- [x] Context lake insights stored for each relevant file discovered
  10 store_insight calls succeeded (all 9 relevant files + detail.js as adjacent context).
- [x] Scale confirmation or revision based on actual file count (currently marked Small)
  Confirmed Small. 5 files directly modified per design spec (index.html, detail.html, style.css, app.js, activity.js) + 1 server banner line in server.ts. No new files needed. Grep confirms no hidden dashboard UI files outside tools/dashboard/static/.
- [x] Coverage infrastructure discovery documented under ## Coverage Infrastructure
  See section below.
- [x] Key patterns identified: current color system, layout structure, DOM element IDs, CSS class naming conventions
  See patterns section below.

### File List by Layer

**Frontend — HTML (2 files)**
- `static/index.html` — Main page shell; two-column layout, header with status indicators, workflows container + activity aside. Needs: three-column grid, alert bar, missions tree, title rebrand.
- `static/detail.html` — Entity detail page; two-column grid, back-link "← Back to Dashboard". Needs: back-link text change to "← 返回戰情室", title template update.

**Frontend — CSS (2 files)**
- `static/style.css` — Dashboard stylesheet; GitHub Primer dark theme (bg #0d1117, accent #58a6ff). Defines `.dashboard-layout` grid, activity feed, chat bubbles, permission cards. Full color overhaul required for Retro Aerospace palette.
- `static/detail.css` — Detail page stylesheet; same Primer dark theme. Defines `.top-bar`, `.detail-layout`, stage report cards, sidebar panels, comment/suggestion components. Color overhaul required; back-link color changes from #58a6ff to teal.

**Frontend — JS (5 files)**
- `static/app.js` — Workflow fetch/render loop, entity table, pipeline graph toggle, sort+filter state. Key DOM target: `#workflows-container`. Needs: tree view state (expand/collapse), entity click → main panel navigation, alert bar rendering for gate-pending and agent-error events.
- `static/activity.js` — WebSocket client for activity feed; handles replay/live events, chat bubbles, permission cards. Status color map hardcodes GitHub Primer values. Needs: ticker summary extraction into one-line strip; color map update for Retro Aerospace.
- `static/visualizer.js` — Pure SVG pipeline graph renderer (310 lines); no external deps. Not directly in scope — may inherit theme via CSS classes.
- `static/editor.js` — Visual workflow editor, drag-reorder, undo/redo, write-back (403 lines). Not in scope for 015.
- `static/detail.js` — Entity detail page logic, markdown render via marked.js + DOMPurify, inline comments, score/tag editors (537 lines). Not structurally in scope; no dashboard branding strings found in this file.

**Server — TypeScript (1 file)**
- `src/server.ts` — Bun HTTP server; all API routes, WebSocket at /ws/activity. Single branding string at line 616: "Spacedock Dashboard started on..." → change to "戰情室 started on...". No route or protocol changes.

**Server — TypeScript (not in scope, referenced for context)**
- `src/api.ts`, `src/channel.ts`, `src/comments.ts`, `src/discovery.ts`, `src/events.ts`, `src/frontmatter-io.ts`, `src/parsing.ts`, `src/types.ts`, `src/telemetry.ts` — Backend domain logic; no changes required for 015.

### Key Patterns

**Current color system (GitHub Primer dark — being replaced):**
- Background: `#0d1117`
- Panel/card: `#161b22`
- Border: `#21262d`
- Primary text: `#c9d1d9`
- Bright text: `#f0f6fc`
- Muted text: `#8b949e`
- Accent (blue): `#58a6ff`
- Green: `#3fb950` / `#52c41a`
- Orange: `#f0883e`
- Yellow: `#d4a017`

**Incoming Retro Aerospace palette:**
- Background: `#1a1a2e`, Panel: `#16213e`, Text: `#e0d6c8`, Accent: `#e94560`, Teal: `#53a8b6`, Element bg: `#0f3460`, Success: `#2ecc71`

**Layout structure:** `.dashboard-layout` uses `grid-template-columns: 1fr 320px`. Responsive breakpoint at 768px collapses to single column. New layout adds a 120px MISSIONS column on the left: `120px 1fr 320px`.

**DOM element IDs (index.html):** `ws-status`, `channel-status`, `refresh-indicator`, `telemetry-indicator`, `workflows-container`, `activity-panel`, `activity-feed`, `channel-input-bar`, `channel-input`, `channel-send-btn`. New IDs needed: `alert-bar`, `missions-tree`.

**CSS class naming conventions:** BEM-adjacent, two-word hyphenated: `.workflow-card`, `.stage-chip`, `.activity-item`, `.activity-badge`, `.chat-bubble`, `.permission-card`. New classes follow same pattern: `.missions-tree`, `.alert-bar`, `.ticker-strip`, `.tree-workflow`, `.tree-entity`.

**JS patterns:** IIFE modules with `"use strict"`. DOM helpers: `el(tag, attrs, children)` utility in app.js. Status color maps as plain objects (update both `statusColor()` instances — one in app.js, one in activity.js). No module bundler; plain browser JS.

## Coverage Infrastructure

- **Test runner:** `bun test` (Bun built-in). No `test:coverage` script in package.json (scripts section absent); run as `bun test --coverage` directly per README.
- **Coverage format:** Bun text table output (% Funcs, % Lines, Uncovered Line #s). No Istanbul JSON (`coverage-final.json`) or LCOV (`lcov.info`) generated by default.
- **Coverage scope:** Backend TypeScript only (`src/*.ts`). Frontend JS files (`static/*.js`) are not covered by the test suite — they are plain browser JS with no test harness.
- **Current baseline:** 61.46% functions, 70.26% lines across 4 test files (28 tests pass). No committed baseline file. No CI cache for baseline.
- **Comparison script:** None found in `.github/scripts/` or `scripts/`.
- **Implication for 015:** The War Room Identity feature touches frontend files only (`static/`) plus one string in `server.ts`. None of the affected files (`index.html`, `detail.html`, `style.css`, `app.js`, `activity.js`) are covered by the existing test suite. Coverage delta for this feature is effectively zero — acceptance is visual/functional, not unit-tested. The `bun test` suite remains a pass/fail regression guard.

### Summary

Explored all 9 relevant files in `tools/dashboard/static/` and `tools/dashboard/src/server.ts`. The feature is correctly scaled as Small: 5 frontend files need direct modification (HTML, CSS, JS) plus one string in server.ts. The current codebase uses a consistent GitHub Primer dark palette hardcoded across both CSS files and the two JS status-color maps — the Retro Aerospace overhaul must update all four locations. No new files are required. Coverage infrastructure is minimal (bun test, backend-only, no baseline file) — this feature is accepted by visual verification rather than unit tests.

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
