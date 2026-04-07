---
id: 020
title: Dashboard Dependency Graph — Entity 相依性視覺化與 Blocked 偵測
status: plan
source: captain direction (pipeline operation observation)
started: 2026-04-07T10:45:00Z
worktree: .worktrees/spacedock-ensign-dashboard-dependency-graph
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

## Technical Claims

CLAIM-1: [type: project-convention] "Entity frontmatter can support `depends-on: [007, 016]` as a new field with inline YAML array syntax"
CLAIM-2: [type: project-convention] "parseFrontmatter() in both Python status script and TypeScript parsing.ts can handle `depends-on: [007, 016]` values"
CLAIM-3: [type: project-convention] "The status script `--next` can be extended to filter out entities with unmet dependencies"
CLAIM-4: [type: project-convention] "visualizer.js SVG pattern can be reused/adapted for DAG rendering of entity dependencies"
CLAIM-5: [type: framework] "Zero-dependency frontend constraint is maintainable for DAG graph layout"
CLAIM-6: [type: project-convention] "Entity table in app.js can display dependency badges with hover tooltips"
CLAIM-7: [type: project-convention] "Detail page (detail.js) can display a dependency mini-graph section"
CLAIM-8: [type: project-convention] "Existing `## Dependencies` section in entity body is free-text, not machine-readable"

## Research Report

**Claims analyzed**: 8
**Recommendation**: PROCEED

### Verified (6 claims)

- CLAIM-1: CONFIRMED HIGH -- `depends-on: [007, 016]` fits existing frontmatter conventions
  Explorer: All entity files use `key: value` frontmatter (e.g., `id: 020`, `status: research`, `score: 0.85`). Adding `depends-on:` follows the same pattern. Both parsers capture the value after `:` as a string — `"[007, 016]"` — which can be parsed downstream with `JSON.parse()` or regex. YAML standard supports inline array syntax `[item1, item2]` in frontmatter.
  Web: GitHub Docs, Hugo, Jekyll all confirm YAML frontmatter supports both inline `[a, b]` and vertical dash array formats.

- CLAIM-2: CONFIRMED HIGH (with note) -- Parsers capture the raw string, not a parsed array
  Explorer: `parseFrontmatter()` in `parsing.ts:22-23` does `val = line.slice(idx + 1).trim()` — for `depends-on: [007, 016]`, the result is the string `"[007, 016]"`. Python `status` script `parse_frontmatter()` at line 58-62 does identical `val = val.strip()` — same result. Neither parser breaks. The consuming code must parse `"[007, 016]"` into an actual array (trivial: `JSON.parse(val)` or regex `/\d+/g`).
  Note: The `Entity` TypeScript interface uses `[key: string]: string` — all values are strings. This is compatible since `"[007, 016]"` is a string.

- CLAIM-3: CONFIRMED HIGH -- Status script `--next` is straightforward to extend
  Explorer: `print_next_table()` in `status:228-271` already iterates entities and applies 4 dispatch rules (terminal, gate, worktree, concurrency). Adding a 5th rule (check if all `depends-on` entity IDs have `status: shipped`) follows the exact same pattern. The function already has access to all entities via `scan_entities()`. The TypeScript mirror in `parsing.ts:131-155` (`scanEntities()`) can be similarly extended.

- CLAIM-6: CONFIRMED HIGH -- Entity table supports badge additions
  Explorer: `app.js:260-273` already renders status badges with color coding (`statusColor(val)` + styled `<span class="status-badge">`). Adding a dependency badge column or inline indicator follows the identical pattern. The `columns` array at line 221 can be extended.

- CLAIM-7: CONFIRMED HIGH -- Detail page is extensible for dependency graph
  Explorer: `detail.js:215-228` `loadEntity()` calls `renderMetadata()`, `renderBody()`, `renderStageReports()`, `renderTags()` in sequence. Adding a `renderDependencyGraph()` call is purely additive. The `/api/entity/detail` endpoint returns full frontmatter including any new `depends-on` field.

- CLAIM-8: CONFIRMED HIGH -- Current `## Dependencies` sections are free-text
  Explorer: Grep across all entity files shows patterns like "Feature 007 completed (channel plugin)", "Feature 021 completed (SQLite persistence)", "None (can be built on current dashboard)". These are human-readable prose, not parseable structured data. Confirms the need for a structured `depends-on:` frontmatter field.

### Corrected (2 claims)

- CLAIM-4: CORRECTED MEDIUM -- visualizer.js is a linear pipeline renderer, NOT a general DAG layout engine
  Explorer: `visualizer.js:48-103` `buildLayout()` positions nodes on a **single horizontal line** (`node.x = PADDING + i * (NODE_W + NODE_GAP_X)`). It handles forward edges (sequential i to i+1) and feedback edges (curved arcs above). It has NO concept of: multiple layers, crossing minimization, or arbitrary parent-child relationships. The SVG helper functions (`svgEl`, `svgText`, arrow rendering) ARE reusable, but the layout algorithm itself cannot be "reused" for DAG rendering.
  **Fix**: The plan should create a NEW layout function (e.g., `buildDependencyLayout()`) that implements simplified Sugiyama-style layered layout. It CAN reuse `svgEl()`, `svgText()`, arrow rendering helpers, and the color/style conventions from visualizer.js, but must implement its own DAG-specific node positioning. For ~25 entities this is entirely feasible.

- CLAIM-5: CORRECTED LOW -- Zero-dependency is feasible but requires non-trivial custom code
  Web: Full Sugiyama algorithm has 4 steps (cycle removal, layer assignment via topological sort, vertex ordering/crossing minimization, coordinate assignment). For small graphs (<30 nodes), a simplified version is documented as practical: (1) topological sort for layers, (2) simple equal-distance positioning within layers, (3) skip spline routing — use straight/curved lines. Libraries like dagre and d3-dag exist but are unnecessary for this scale.
  **Fix**: The plan should acknowledge that DAG layout is ~100-150 lines of custom JS (not a trivial copy-paste from visualizer.js), but is absolutely achievable within the zero-dependency constraint. The implementation should use: topological sort for layer assignment, simple median heuristic for ordering within layers, and straight-line edges with the existing arrow rendering pattern.

### Unverifiable (0 claims)

None.

### Recommendation Criteria

- PROCEED: 2 corrections, both at implementation detail level (which functions to reuse vs. create new, complexity estimate for DAG layout). Neither affects the overall architecture, data model, or three-layer approach. The corrected understanding actually simplifies planning: reuse SVG helpers from visualizer.js but write a new DAG layout function.

### Key Implementation Notes for Plan Stage

1. **Frontmatter parsing**: `depends-on: [007, 016]` will be stored as string `"[007, 016]"` by existing parsers. Add a utility function to parse this into `number[]` — approximately 3 lines of code.
2. **Blocked detection**: Compare parsed dependency IDs against the entity list's statuses. An entity is "blocked" if any dependency has `status !== "shipped"`.
3. **DAG layout**: Implement simplified Sugiyama in ~100-150 lines: (a) topological sort assigns layers, (b) position nodes per layer with equal spacing, (c) render edges with existing SVG helpers.
4. **Reusable from visualizer.js**: `svgEl()`, `svgText()`, arrow/arrowhead rendering, color conventions, badge rendering. NOT reusable: `buildLayout()`, `renderNode()` (hardcoded to horizontal pipeline).
5. **API**: The `/api/workflows` endpoint already returns all entities with their frontmatter. The frontend can build the dependency graph client-side from the entity list + `depends-on` fields.

## Stage Report: research

- [x] Claims extracted from plan (8 claims)
- [x] Explorer subagent dispatched and returned -- performed inline (codebase cross-check of all 8 claims against status script, parsing.ts, types.ts, visualizer.js, app.js, detail.js, entity frontmatter patterns)
- [x] Context7 subagent dispatched and returned -- SKIPPED (no external library APIs to verify; all claims involve project-internal code patterns. Zero-dependency constraint means no library docs to check)
- [x] Web subagent dispatched and returned -- performed inline (verified YAML array syntax in frontmatter, Sugiyama DAG layout algorithm feasibility for small graphs, vanilla JS graph layout approaches)
- [x] Cross-reference synthesis completed (6 CONFIRMED HIGH, 1 CORRECTED MEDIUM, 1 CORRECTED LOW)
- [x] Research report written to entity
- [x] Insights cached to context lake -- key findings documented in report for plan stage consumption

## Stage Report: plan

- [x] Read entity body fully (spec + research report + acceptance criteria) -- read all 111 lines, 8 claims analyzed, 2 corrections noted, 6 acceptance criteria extracted
- [x] Create formal plan via `Skill: "superpowers:writing-plans"` incorporating research corrections -- 6 tasks, TDD-first ordering, complete code in every step
- [x] Save plan to `docs/superpowers/specs/` directory -- saved to `docs/superpowers/specs/2026-04-07-dashboard-dependency-graph.md`
- [x] Plan includes concrete file paths, test-first ordering, and quality gate steps -- 9 files mapped, Tasks 1-2 are test-first, quality gate at end runs full suite
- [x] Plan references research-verified patterns (especially the 2 corrections about visualizer.js and DAG layout) -- Research Corrections section at top of plan; Task 4 creates NEW `buildDependencyLayout` instead of reusing `buildLayout()`; DAG layout is ~130 lines simplified Sugiyama (topological sort + median heuristic)
- [x] Write ## Stage Report into entity file with all checklist items -- this section
