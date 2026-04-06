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

## Technical Claims

CLAIM-1: [type: css-layout] "CSS Grid `grid-template-columns: 120px 1fr 320px` works in Bun-served vanilla HTML without build tooling or polyfills"
CLAIM-2: [type: project-convention] "All GitHub Primer colors can be replaced via find-and-replace without breaking CSS specificity or cascading behavior"
CLAIM-3: [type: css-layout] "`@media (max-width: 768px)` with `grid-template-columns: 1fr` + `display: none` on nav correctly hides the MISSIONS column"
CLAIM-4: [type: framework] "Changing DOM structure (two-column to three-column) won't break WebSocket event rendering since activity.js targets `#activity-feed` by ID"
CLAIM-5: [type: project-convention] "No server changes needed for layout restructure since Bun.serve() serves static files by path, not content hash"

## Research Report

**Claims analyzed**: 5
**Recommendation**: PROCEED (with 1 minor correction noted)

### Verified (4 claims)

- CLAIM-1: HIGH CONFIRMED -- CSS Grid three-column layout works without polyfills
  Explorer: Current layout uses `grid-template-columns: 1fr 320px` (style.css:129). Extending to three columns uses the same CSS Grid spec. No build tooling involved -- Bun.file() serves raw CSS.
  Web: CSS Grid has been supported in all major browsers since 2017 (Chrome 57, Firefox 52, Safari 10.1). No polyfills needed.

- CLAIM-3: HIGH CONFIRMED -- Responsive breakpoint pattern already proven in codebase
  Explorer: style.css:532-544 already uses `@media (max-width: 768px)` to collapse grid to `1fr` and make `#activity-panel` static. Adding `display: none` to a new nav element at the same breakpoint is identical pattern. No technical risk.

- CLAIM-4: HIGH CONFIRMED -- WebSocket rendering is DOM-structure-independent
  Explorer: activity.js:4 uses `document.getElementById("activity-feed")` to get `feedContainer`. All render functions (renderEvent:136, renderChannelMessage:173, renderChannelResponse:198, renderPermissionRequest:325) insert into this container by ID reference. Parent grid structure (2-col vs 3-col) is irrelevant to getElementById.
  Additionally: app.js:26 uses `document.getElementById("workflows-container")` for main content. Both are stable ID references unaffected by grid layout changes.

- CLAIM-5: HIGH CONFIRMED -- Bun.serve() serves static files by pathname, no server changes for layout
  Explorer: server.ts:539-555 resolves static files via `pathname.slice(1)` -> `resolve(staticDir, filename)` -> `Bun.file(filepath)`. No content hashing, no manifest, no build step. HTML/CSS/JS modifications are picked up immediately by filename. Only server change needed: banner string at line 616 ("Spacedock Dashboard started" -> "戰情室 started").

### Corrected (1 claim -- minor)

- CLAIM-2: HIGH CORRECTION -- Color swap is NOT purely mechanical find-and-replace across the 5 planned files. The plan underestimates the JS color scope.
  Explorer findings:
    - CSS files: style.css has 65 color occurrences, detail.css has 76 -- all simple property values, no CSS variables, no calc(). One `!important` at style.css:114 uses `#21262d`/`#8b949e` which map directly to new palette values. CSS swap IS mechanical.
    - JS statusColor maps: app.js:63-73 (7 colors) and activity.js:89-98 (6 colors) use hardcoded hex values. These are in scope and the explore stage identified them.
    - visualizer.js: 14 hardcoded Primer hex values (lines 40, 123-124, 131, 138-139, 147, 164, 167, 196, 208, 231, 244, 250). The design spec says "may inherit theme via CSS classes" but this is INCORRECT -- visualizer.js directly sets SVG fill/stroke attributes with hex strings like `#58a6ff`, `#161b22`, `#21262d`, `#f0883e`, `#3fb950`, `#c9d1d9`, `#0d1117`. These are inline SVG attributes that CSS cannot override.
    - editor.js: 1 hardcoded color at line 175 (`#f0f6fc`).
    - Total: 168 color occurrences across 6 files, not 4 files.
  **Fix**: The plan/execute stage must also update `visualizer.js` (14 occurrences) and `editor.js` (1 occurrence) color values, OR accept that the pipeline graph and editor will look visually inconsistent against the new Retro Aerospace palette. Since visualizer.js renders the pipeline graph prominently in the MAIN column, leaving it un-themed would be immediately visible. Recommend adding both files to the change list.
  **Severity**: Minor -- does not affect control flow, data model, or architecture. It is an omission in scope, easily addressed by extending the same find-and-replace pattern.

### Unverifiable (0 claims)

None -- all claims verified against codebase evidence.

### Recommendation Criteria

PROCEED: The single correction is a scope omission (2 additional JS files need color updates), not an architectural or control flow issue. The color replacement pattern is the same across all files. The correction adds ~15 color occurrences to the change list. No claims contradict the design spec's core approach.

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

## Stage Report: research

- [x] Claims extracted from spec and explore results (5 claims)
- [x] Per-claim verification with evidence from codebase exploration
  Explorer: Grep/Read across all 6 static files + server.ts. 168 color occurrences catalogued. DOM ID references verified. Grid layout pattern confirmed. Static file serving mechanism confirmed.
- [x] Cross-referenced synthesis with confidence levels (HIGH/MEDIUM/NONE)
  All 5 claims rated HIGH confidence. 4 CONFIRMED, 1 CORRECTED (minor scope omission).
- [x] Corrections for any incorrect assumptions, with cited sources
  CLAIM-2 correction: visualizer.js (14 hex values) and editor.js (1 hex value) need color updates but were omitted from the design spec's file change list. These files use inline SVG attributes, not CSS classes.
- [x] Verified patterns cached to context lake
  3 insights stored: research-verified color scope, DOM stability for layout change, static file serving confirmation.

### Summary

5 claims analyzed, 4 confirmed, 1 minor correction (scope omission — 2 additional JS files need color updates). Recommendation: PROCEED. The correction does not affect architecture or control flow — it extends the same color find-and-replace pattern to visualizer.js and editor.js.

## Implementation Plan

Lightweight TDD-style checklist with incremental commits. Each step leaves the app fully functional. Since the affected files (`static/`) have no unit test harness, verification is visual + `bun test` regression guard.

### Color Mapping Reference

All steps reference this single Primer-to-Retro-Aerospace mapping:

| Primer (current) | Retro Aerospace (new) | Role |
|---|---|---|
| `#0d1117` | `#1a1a2e` | Background |
| `#161b22` | `#16213e` | Panel/Card |
| `#21262d` | `#0f3460` | Border / Element bg |
| `#c9d1d9` | `#e0d6c8` | Primary text |
| `#f0f6fc` | `#e0d6c8` | Bright text (maps to warm white) |
| `#8b949e` | `#e0d6c880` | Muted text (warm white 50% opacity) |
| `#58a6ff` | `#53a8b6` | Primary accent (blue to teal) |
| `#79c0ff` | `#53a8b6` | Light blue (maps to same teal) |
| `#3fb950` / `#52c41a` | `#2ecc71` | Success green |
| `#f0883e` | `#e94560` | Orange/warning (maps to red accent) |
| `#d4a017` | `#e94560` | Yellow (maps to red accent) |
| `#d2a8ff` | `#53a8b6` | Purple (maps to teal) |
| `#f85149` | `#e94560` | Error red (maps to red accent) |
| `#58a6ff22` | `#53a8b622` | Accent translucent |

---

### Step 1: CSS Color Overhaul — style.css

**Files:** `tools/dashboard/static/style.css`

**Action:** Replace all 65 GitHub Primer hex values with Retro Aerospace equivalents using the mapping table above. No structural changes -- pure color swap.

**Verification:**
- `bun test` passes (regression guard)
- `grep -c '#0d1117\|#161b22\|#21262d\|#58a6ff\|#8b949e' tools/dashboard/static/style.css` returns 0
- Visual: open `http://localhost:3456` -- background should be deep navy (#1a1a2e), text warm white, accents teal/red

**Commit:** `style(dashboard): replace Primer palette with Retro Aerospace in style.css`

---

### Step 2: CSS Color Overhaul — detail.css

**Files:** `tools/dashboard/static/detail.css`

**Action:** Replace all 76 Primer hex values with Retro Aerospace equivalents. Same mapping as Step 1.

**Verification:**
- `bun test` passes
- `grep -c '#0d1117\|#161b22\|#21262d\|#58a6ff\|#8b949e' tools/dashboard/static/detail.css` returns 0
- Visual: open entity detail page -- consistent palette with main page

**Commit:** `style(dashboard): replace Primer palette with Retro Aerospace in detail.css`

---

### Step 3: JS Color Updates — app.js + activity.js status color maps

**Files:** `tools/dashboard/static/app.js`, `tools/dashboard/static/activity.js`

**Action:**
- `app.js` lines 64-73: Update `statusColor()` map (7 colors + fallback)
  - `backlog: "#8b949e"` -> `"#e0d6c880"` (muted)
  - `ideation: "#d2a8ff"` -> `"#53a8b6"` (teal)
  - `implementation: "#58a6ff"` -> `"#53a8b6"` (teal)
  - `validation: "#f0883e"` -> `"#e94560"` (red accent)
  - `done: "#3fb950"` -> `"#2ecc71"` (success green)
  - `explore: "#d2a8ff"` -> `"#53a8b6"` (teal)
  - `research: "#79c0ff"` -> `"#53a8b6"` (teal)
  - `plan: "#58a6ff"` -> `"#53a8b6"` (teal)
  - fallback `"#8b949e"` -> `"#e0d6c880"` (muted)
- `activity.js` lines 91-98: Update event type color map (6 colors + fallback)
  - `dispatch: "#58a6ff"` -> `"#53a8b6"`
  - `completion: "#3fb950"` -> `"#2ecc71"`
  - `gate: "#f0883e"` -> `"#e94560"`
  - `feedback: "#d2a8ff"` -> `"#53a8b6"`
  - `merge: "#79c0ff"` -> `"#53a8b6"`
  - `idle: "#8b949e"` -> `"#e0d6c880"`
  - fallback `"#8b949e"` -> `"#e0d6c880"`
- `activity.js` lines 264, 273: Update diff colors
  - `del.style.color = "#f85149"` -> `"#e94560"`
  - `ins.style.color = "#3fb950"` -> `"#2ecc71"`

**Verification:**
- `bun test` passes
- `grep -c '#58a6ff\|#3fb950\|#f0883e\|#8b949e\|#d2a8ff\|#79c0ff\|#f85149' tools/dashboard/static/app.js tools/dashboard/static/activity.js` returns 0
- Visual: entity status chips and activity feed badges should use teal/red/green palette

**Commit:** `style(dashboard): update JS status color maps to Retro Aerospace palette`

---

### Step 4: JS Color Updates — visualizer.js + editor.js (research correction)

**Files:** `tools/dashboard/static/visualizer.js`, `tools/dashboard/static/editor.js`

**Action (research correction -- these files were omitted from the original design spec):**
- `visualizer.js` -- 14 inline SVG hex values that set fill/stroke attributes directly:
  - Line 40: `fill: "#c9d1d9"` -> `"#e0d6c8"` (text)
  - Lines 123, 138: `fill: ... "#161b22"` -> `"#16213e"` (panel)
  - Lines 124, 139: `stroke: ... "#f0883e"` -> `"#e94560"` (accent); `"#58a6ff"` -> `"#53a8b6"` (teal)
  - Line 131: `"#3fb950"` -> `"#2ecc71"`, `"#d2a8ff"` -> `"#53a8b6"`, `"#21262d"` -> `"#0f3460"`
  - Lines 123, 138: `"#58a6ff22"` -> `"#53a8b622"` (translucent)
  - Line 147: `"#58a6ff"` -> `"#53a8b6"`, `"#c9d1d9"` -> `"#e0d6c8"`
  - Line 164: `fill: "#58a6ff"` -> `"#53a8b6"`
  - Line 167: `fill: "#0d1117"` -> `"#1a1a2e"`
  - Line 196: `stroke: "#21262d"` -> `"#0f3460"`
  - Lines 208, 231, 244, 250: `"#21262d"` -> `"#0f3460"`, `"#f0883e"` -> `"#e94560"`
- `editor.js` -- 1 color:
  - Line 175: `"#f0f6fc"` -> `"#e0d6c8"` (bright text to warm white)

**Verification:**
- `bun test` passes
- `grep -c '#58a6ff\|#161b22\|#0d1117\|#c9d1d9\|#21262d\|#f0883e\|#3fb950\|#d2a8ff\|#f0f6fc' tools/dashboard/static/visualizer.js tools/dashboard/static/editor.js` returns 0
- Visual: pipeline graph SVG should show teal/red/green nodes on deep navy background, consistent with rest of UI

**Commit:** `style(dashboard): update inline SVG colors in visualizer.js and editor.js`

---

### Step 5: HTML Structure + Naming — index.html

**Files:** `tools/dashboard/static/index.html`

**Action:**
- Change `<title>` from "Spacedock Dashboard" to "戰情室 — Spacedock"
- Change `<h1>` from "Spacedock Dashboard" to "◆ 戰情室"
- Add `<div id="alert-bar">` between header and main grid (empty by default, hidden via CSS)
- Change `.dashboard-layout` grid from two-column to three-column: add `<nav id="missions-tree" class="missions-tree">` as first child
- Move `#workflows-container` and `#activity-panel` into the new three-column structure

**Verification:**
- `bun test` passes
- Visual: page shows "◆ 戰情室" header, three-column layout with empty left nav, main content center, COMMS right
- Browser title tab shows "戰情室 — Spacedock"

**Commit:** `feat(dashboard): rebrand to War Room and restructure to three-column layout`

---

### Step 6: HTML Naming — detail.html + Server Banner

**Files:** `tools/dashboard/static/detail.html`, `tools/dashboard/src/server.ts`

**Action:**
- `detail.html`: Change `<title>` template to include "戰情室"
- `detail.html`: Change back link text from "← Back to Dashboard" to "← 返回戰情室"
- `server.ts` line 616: Change "Spacedock Dashboard started" to "戰情室 started"

**Verification:**
- `bun test` passes
- Visual: detail page back link shows "← 返回戰情室"
- Server restart shows "戰情室 started on..." in terminal

**Commit:** `feat(dashboard): rebrand detail page and server banner to War Room`

---

### Step 7: CSS Layout — Three-Column Grid + Alert Bar + Tree View Styles

**Files:** `tools/dashboard/static/style.css`

**Action:**
- Update `.dashboard-layout` grid: `grid-template-columns: 120px 1fr 320px`
- Add `.missions-tree` styles: width, background, overflow, tree item styles
- Add `.tree-workflow`, `.tree-entity` classes with expand/collapse, status icons
- Add `#alert-bar` styles: left border accent, translucent red bg, collapse when empty
- Add `.ticker-strip` styles for COMMS bottom summary line
- Add `@media (max-width: 768px)` rule to hide `.missions-tree` and collapse to single column

**Verification:**
- `bun test` passes
- Visual: three columns visible at >768px; narrow window hides left nav
- Alert bar invisible when empty (zero height)

**Commit:** `style(dashboard): add three-column grid, missions tree, alert bar, ticker styles`

---

### Step 8: JS Logic — Missions Tree View (app.js)

**Files:** `tools/dashboard/static/app.js`

**Action:**
- Add tree view rendering function: iterate workflows, render as expandable tree nodes
- Each workflow node: click to expand/collapse entity list
- Entity items: show status icon (emoji: gate pending, active, shipped)
- Shipped entities: collapse into count line "N shipped"
- Entity click: scroll MAIN panel to that entity or load detail
- Insert tree into `#missions-tree` DOM element

**Verification:**
- `bun test` passes
- Visual: left nav shows workflow names, click expands to entity list with status icons
- Clicking entity highlights it in the tree

**Commit:** `feat(dashboard): implement missions tree view navigation`

---

### Step 9: JS Logic — Alert Bar + Ticker (app.js + activity.js)

**Files:** `tools/dashboard/static/app.js`, `tools/dashboard/static/activity.js`

**Action:**
- `app.js`: Add alert bar rendering -- filter WebSocket events for `gate` (pending) and `error` types, render as alert items with action buttons in `#alert-bar`
- `app.js`: Show/hide alert bar based on whether actionable items exist
- `activity.js`: Add ticker summary extraction -- condense last N events into a one-line strip at bottom of COMMS column

**Verification:**
- `bun test` passes
- Visual: when gate-pending event exists, alert bar appears with action item; when cleared, bar collapses
- COMMS column shows one-line ticker at bottom

**Commit:** `feat(dashboard): add alert bar for human-action items and COMMS ticker`

---

### Quality Gate (Final)

Run after all steps complete:

```bash
# 1. Regression guard -- all existing tests pass
cd tools/dashboard && bun test

# 2. No Primer colors remaining in any modified file
grep -rn '#0d1117\|#161b22\|#21262d\|#58a6ff\|#8b949e\|#f0883e\|#3fb950\|#d2a8ff\|#79c0ff\|#f85149\|#d4a017\|#52c41a\|#f0f6fc' \
  tools/dashboard/static/style.css \
  tools/dashboard/static/detail.css \
  tools/dashboard/static/app.js \
  tools/dashboard/static/activity.js \
  tools/dashboard/static/visualizer.js \
  tools/dashboard/static/editor.js
# Expected: no output (all Primer colors replaced)

# 3. Naming verification
grep -n 'Spacedock Dashboard' tools/dashboard/static/index.html tools/dashboard/static/detail.html tools/dashboard/src/server.ts
# Expected: no output (all instances replaced with 戰情室)
```

### Visual Verification Checklist

After starting the dashboard server (`cd tools/dashboard && bun run src/server.ts`):

- [ ] Main page: title tab shows "戰情室 — Spacedock"
- [ ] Main page: header shows "◆ 戰情室" with red bottom border accent
- [ ] Three-column layout: MISSIONS tree (left 120px) + MAIN (center flex) + COMMS (right 320px)
- [ ] Color palette: deep navy background (#1a1a2e), warm white text, teal links, red accents
- [ ] Pipeline graph (visualizer.js): nodes use teal/red/green on navy background
- [ ] Activity feed: event badges use new color map (teal dispatch, red gate, green completion)
- [ ] Alert bar: hidden when no actionable items; visible with red accent when gate/error exists
- [ ] MISSIONS tree: workflows expand/collapse, entities show status icons
- [ ] COMMS ticker: one-line summary at bottom of activity column
- [ ] Detail page: back link shows "← 返回戰情室"
- [ ] Detail page: colors consistent with main page palette
- [ ] Responsive: at <768px, MISSIONS column hides, layout collapses to single column
- [ ] Server terminal: startup message shows "戰情室 started on..."

## Stage Report: plan

- [x] Lightweight TDD checklist written in entity body under ## Implementation Plan
  9-step incremental checklist with visual verification commands replacing unit tests (no test harness for frontend files).
- [x] Plan has concrete file paths for every step
  Every step specifies exact files: `tools/dashboard/static/{style.css,detail.css,app.js,activity.js,visualizer.js,editor.js,index.html,detail.html}` and `tools/dashboard/src/server.ts`.
- [x] Plan incorporates research correction (visualizer.js + editor.js color updates)
  Step 4 is dedicated entirely to the research-discovered omission: 14 inline SVG hex values in visualizer.js + 1 in editor.js, with per-line mapping.
- [x] Each step has a verification command or visual check
  Every step includes: (1) `bun test` regression guard, (2) grep command to verify no Primer colors remain, (3) visual check description.
- [x] Steps ordered for incremental commits (each commit leaves the app functional)
  Steps 1-4 (color swaps) are pure visual changes with no structural impact. Steps 5-6 (HTML/naming) add structure. Steps 7-9 (CSS layout + JS logic) build features incrementally. Each step produces a working app.
- [x] Quality gate commands included (bun test, visual verification checklist)
  Final quality gate section with 3 automated checks + 13-item visual verification checklist.

### Summary

Produced a 9-step implementation plan covering all 7 modified files (style.css, detail.css, app.js, activity.js, visualizer.js, editor.js, index.html, detail.html) plus server.ts. Steps are ordered color-first (Steps 1-4), then structure (Steps 5-7), then logic (Steps 8-9). The research correction (visualizer.js + editor.js) is incorporated as a dedicated Step 4 with per-line color mappings. Each step produces a functional commit. The complete color mapping table serves as a single reference for all steps.
