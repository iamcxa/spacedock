# Dashboard War Room Identity — Design Spec

**Entity:** 015 — Dashboard War Room Identity — 戰情室品牌重塑與指揮中心體驗
**Date:** 2026-04-06
**Status:** Approved
**Scale:** Small

## Positioning

**戰情室 = Mission Control core + War Room collaboration readiness**

The dashboard transforms from a passive monitoring panel ("Spacedock Dashboard") into an active command center ("戰情室"). The identity shift is from C (Mission Control — situational awareness, anomaly-driven intervention) toward B (War Room — multi-person collaborative review), based on actual usage patterns across 14 entities and the captain's roadmap (016 Gate Approval, 017 Shareable War Room).

The Chinese term "戰情室" naturally encompasses both meanings — it's where you watch the situation AND where you coordinate action.

## Layout Architecture — B+C Hybrid

Three-column layout with a global alert bar, combining the deep-operation focus of a command layout (B) with the situational awareness of a situation board (C).

```
┌─ Alert Bar: human-action-required items only (gate pending, agent error) ──┐
├──────────┬──────────────────────────────┬──────────────────────────────────┤
│ MISSIONS │  MAIN                        │  COMMS (fixed 320px)             │
│ (tree)   │                              │                                  │
│          │  Selected entity detail,     │  Activity Feed                   │
│ ▼ build  │  gate review, stage report   │  (events + chat bubbles)         │
│   🟠 008 │                              │                                  │
│   🔵 016 │                              │  ─── ticker summary ───          │
│   🔵 013 │                              │  Channel Input                   │
│ ▶ plans  │                              │                                  │
└──────────┴──────────────────────────────┴──────────────────────────────────┘
```

### Alert Bar

- **Only shows items requiring human action**: gate pending, agent error/crash
- Excludes informational events (dispatch, merge, feedback) — those stay in COMMS feed
- Each alert has a direct action button (e.g., "Review →")
- Empty state: bar collapses to zero height (not visible when nothing needs attention)

### Left Column — MISSIONS (Tree View)

- Workflows listed at top level (e.g., `build-pipeline`, `plans`)
- Click workflow → expand inline to show entity list (tree view, VS Code-style)
- Entity items show status icon: 🟠 gate pending, 🔵 active, ✅ shipped
- Clicking entity loads it in the MAIN column without disrupting tree state
- Shipped entities collapsed into a count line: "✅ 10 shipped"
- Width: 100-120px
- Single-repo scope for 015 (multi-root expansion deferred to entity 018)

### Center Column — MAIN

- Default: workflow overview (pipeline graph + entity table, similar to current landing)
- On entity select: entity detail view (frontmatter + body + stage report)
- On gate entity: adds gate review UI elements (preview for 016, not implemented in 015)
- Responsive: takes remaining width after left (120px) and right (320px) columns

### Right Column — COMMS (Fixed 320px)

- Preserves current activity feed behavior (WebSocket events, chat bubbles, permission cards)
- Adds ticker summary strip at bottom — one-line condensed view of recent events
- Channel input textarea at bottom (existing behavior)
- No collapse/expand — always visible

## Visual Identity — Retro Aerospace (B)

Deliberately avoids the "agentic AI UI" aesthetic (GitHub Primer dark + blue accents + rounded cards) that is ubiquitous across Claude, Cursor, Windsurf, and similar tools.

Inspiration: NASA 1960s Mission Control + retro aerospace instrumentation. Professional, warm, distinctive.

### Color System

| Role | Hex | Description |
|------|-----|-------------|
| Background | `#1a1a2e` | Deep navy blue |
| Panel/Card | `#16213e` | Deep indigo |
| Primary text | `#e0d6c8` | Warm white (not cold white) |
| Primary accent | `#e94560` | Red (titles, alerts, gates, active elements) |
| Secondary accent | `#53a8b6` | Teal (captain messages, links, interactive) |
| Element background | `#0f3460` | Deep blue (badges, selected state, active items) |
| Muted text | `#e0d6c8` at 40-60% opacity | Warm white semi-transparent |
| Alert/warning | `#e94560` at 18% opacity bg + solid border | Red translucent background |
| Success | `#2ecc71` | Green (shipped, completed, approved) |

### Typography

- **Headers/UI chrome:** System sans-serif (`-apple-system`, `Segoe UI`) — clean, modern contrast against the retro palette
- **Code/data:** `SF Mono`, `Menlo`, monospace — for entity IDs, stage names, technical content
- **Body text:** System sans-serif — entity content, descriptions, stage reports
- No letter-spacing or ALL CAPS except for section labels (MISSIONS, COMMS)

### Visual Language

- Border-bottom accent on header (`2px solid #e94560`) — signature element
- Rounded corners: `4px` (subtle, not the 12px bubbly look of agentic UIs)
- Alert bar: left border accent (`3px solid #e94560`) + translucent background
- Selected tree item: `#0f3460` background + left border highlight
- Stage badges: filled background with rounded corners, color-coded by state
- Transitions: subtle opacity transitions (150ms) — no bouncy animations

## Naming Changes

| Location | Current | New |
|----------|---------|-----|
| Main page `<title>` | Spacedock Dashboard | 戰情室 — Spacedock |
| Main page `<h1>` | Spacedock Dashboard | ◆ 戰情室 |
| Detail page `<title>` | Entity Detail | {entity title} — 戰情室 |
| Detail page back link | ← Back to Dashboard | ← 返回戰情室 |
| Server startup banner | Spacedock Dashboard started | 戰情室 started |

Internal code naming (variable names, file names, API routes) remains `dashboard` to avoid scope creep.

## File Changes

| File | Change |
|------|--------|
| `static/index.html` | Three-column grid layout, alert bar, left tree nav, header rebrand |
| `static/detail.html` | Header rebrand, back link text |
| `static/style.css` | Complete color system overhaul (Retro Aerospace), three-column grid, tree view styles, alert bar styles, ticker strip |
| `static/app.js` | Tree view state management (expand/collapse workflows, entity click → main panel), alert bar rendering (filter gate-pending + agent-error events from feed), workflow→entity navigation |
| `static/activity.js` | Ticker summary extraction (condense recent events into one-line strip at bottom of COMMS) |

## Not In Scope

| Feature | Deferred To |
|---------|-------------|
| Multi-root workflow aggregation | Entity 018 |
| Gate approve/reject buttons in UI | Entity 016 |
| Shareable links + multi-person access | Entity 017 |
| Inline comment highlights | Entity 013 |
| Feed persistence (localStorage) | Entity 010 |
| Permission card auto-resolve | Entity 014 |
| Favicon / custom logo asset | Could be added in 015 if time permits, not required |

## Design Decisions Log

| Decision | Choice | Alternatives Considered |
|----------|--------|------------------------|
| Identity positioning | C→B (Mission Control → War Room) | A (pure C2), B (pure War Room), C (pure Mission Control) |
| Layout | B+C hybrid (three-column + alert bar) | A (pipeline hero), B (three-column only), C (situation board only) |
| Alert bar content | Human-action-required only | All events, informational + action, none |
| COMMS column | Fixed 320px (current improved) | Collapsible, bottom drawer |
| Left nav behavior | Tree view (expand inline) | Center column entity table |
| Visual identity | B (Retro Aerospace) | A (Military HUD), C (Tactical Amber), D (Clean Tactical) |
| Multi-root scope | Separate entity (018) | Bundled in 015 |
