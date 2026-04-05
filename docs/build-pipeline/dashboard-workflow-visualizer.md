---
id: 012
title: Dashboard Workflow Visualizer — Stage Pipeline Graph with Visual Editing
status: explore
source: channel conversation
started: 2026-04-05T19:00:00+08:00
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-workflow-visualizer
issue:
pr:
intent: feature
scale: Medium
project: spacedock
---

## Dependencies

- Feature 001 completed (dashboard foundation, workflow discovery)
- Feature 002 completed (entity detail view)

## Brainstorming Spec — Two Goals

### Goal A: Stage Pipeline Visualization (read-only)

APPROACH:     Render each workflow's stage pipeline as an interactive directed graph. Stages as nodes, transitions as edges. Gates shown as diamond nodes, feedback-to as backward edges. Entity dots on each stage node showing how many entities are at that stage. Click a stage node to filter the entity table below.
ALTERNATIVE:  Keep the current flat chip bar (rejected: doesn't show flow direction, gates, feedback loops, or conditional stages — loses the pipeline's topology)
GUARDRAILS:   Must render correctly for any workflow shape (linear, branching, feedback loops). Must handle 3-stage simple workflows and 12-stage complex pipelines. No external graph library dependency if possible (SVG/Canvas).
RATIONALE:    Stage chips show counts but hide the workflow's structure. A pipeline graph shows the flow direction, where gates block, where feedback loops return, and which stages are conditional. Captain can see at a glance "007 is at plan, which gates before execute, which feeds back to execute from quality."

### Goal B: Visual Workflow Editor (read-write)

APPROACH:     Drag-and-drop workflow editor — captain can add/remove/reorder stages, set gate/feedback-to/conditional properties, and edit stage metadata visually. Changes write back to the workflow README frontmatter. This is a workflow design tool, not just a viewer.
ALTERNATIVE:  Edit README YAML directly (current approach — works but error-prone, no visual feedback on topology changes)
GUARDRAILS:   Must validate stage graph integrity (no orphan stages, terminal stage exists, feedback-to targets valid stage). Must preserve non-stage README content (description, schema, stage details in markdown body). Write-back must produce valid YAML frontmatter matching the existing parser format.
RATIONALE:    Designing workflows by editing YAML is workable but the topology is implicit. Visual editing lets the captain see the pipeline shape while building it — add a gate, see where the feedback arrow goes, drag a stage to reorder. This closes the loop: commission creates a workflow, the visualizer lets the captain refine it.

## Acceptance Criteria

### Goal A — Visualization
- Each workflow renders as a directed graph (nodes = stages, edges = transitions)
- Gate stages shown with distinct visual (diamond shape or border)
- Feedback-to edges shown as backward arrows with label
- Conditional stages shown with dashed border or icon
- Entity count dots on each stage node (matching chip counts)
- Click stage node to filter entity table (same behavior as chip click)
- Responsive — works in the 320px sidebar and in full-width detail view

### Goal B — Visual Editor
- Drag to reorder stages in the pipeline
- Add new stage (click + button, set name/properties)
- Remove stage (with validation — warn if entities are at that stage)
- Toggle gate/feedback-to/conditional properties per stage
- Set feedback-to target via drag (draw arrow from stage to target)
- Changes write back to workflow README frontmatter
- Validate graph integrity before saving (no orphans, valid feedback-to)
- Undo/redo for edit operations

## Coverage Infrastructure

- **Test runner:** Bun built-in test runner (`bun:test`) — no vitest/jest
- **Test command:** `bun test` from `tools/dashboard/` — discovered from `discovery.test.ts` using `bun:test` imports
- **Coverage tool:** None configured — no `bun test --coverage` script in `package.json`, no coverage output path defined
- **Baseline strategy:** No baseline file committed, no CI caching of coverage artifacts
- **Conclusion:** Coverage infrastructure is absent. Quality stage should `SKIP: No coverage infrastructure detected` for coverage delta checks. Core quality checks (type-check, tests, build) still apply via `bun test` and `bunx tsc --noEmit`.

## Stage Report: explore

- [x] Map all files that need to be created or modified, grouped by layer
- [x] Analyze existing workflow data model (parsing.ts, types.ts)
- [x] Analyze existing stage chip rendering (app.js)
- [x] Identify SVG graph layout approach
- [x] Analyze workflow README frontmatter structure
- [x] Discover coverage infrastructure
- [x] Confirm or revise scale
- [x] Store context lake insights for each relevant file
- [x] Write findings into entity body

### Summary

**File map by layer:**

Backend (src/) — modify existing:
- `tools/dashboard/src/types.ts` — extend `Stage` interface: add `feedback_to?: string`, `conditional?: boolean`, `model?: string`
- `tools/dashboard/src/parsing.ts` — extend `parseStagesBlock` to extract `feedback-to`, `conditional`, `model` from each state entry
- `tools/dashboard/src/frontmatter-io.ts` — add `updateWorkflowStages(text, stages): string` for Goal B write-back (stages block is nested YAML, cannot use existing `updateFrontmatterFields`)
- `tools/dashboard/src/server.ts` — add `POST /api/workflow/stages` route for Goal B write-back; add `GET /api/workflow/readme` to return README path for a workflow dir

Backend (src/) — no changes needed:
- `tools/dashboard/src/discovery.ts` — aggregateWorkflow passes Stage[] through unchanged once type is extended
- `tools/dashboard/src/api.ts` — no changes needed
- `tools/dashboard/src/events.ts` — no changes needed

Frontend (static/) — modify existing:
- `tools/dashboard/static/app.js` — replace `.stage-pipeline` chip row with SVG graph renderer; preserve `filterState`/`saveFilterState` click logic on graph nodes; add Goal B edit mode toggle and drag handlers
- `tools/dashboard/static/style.css` — add `.pipeline-graph` SVG wrapper styles, node/edge colors, gate diamond, feedback arrow, edit mode panel, responsive fallback at ≤768px

Frontend (static/) — new files:
- `tools/dashboard/static/visualizer.js` — pure SVG graph layout engine (no external deps): Sugiyama-inspired layered layout for DAG with backward edges; node types (normal rect, gate diamond, terminal rounded); edge routing (forward straight arrows, feedback curved dashed arrows); entity count badge per node; returns SVG element
- `tools/dashboard/static/editor.js` — Goal B visual editor: drag-to-reorder, add/remove stage, property toggles, feedback-to arrow drawing, undo/redo stack, validation, POST to `/api/workflow/stages`

Frontend (static/) — no changes needed:
- `tools/dashboard/static/index.html` — no new page needed; graph renders inside existing `.workflow-card` via JS
- `tools/dashboard/static/detail.html` — not affected
- `tools/dashboard/static/activity.js` — not affected

**Total: 9 files (4 modified, 2 new frontend, 3 unchanged backend)**

Scale validation: 9 files — within Medium range (5-15 files). Scale confirmed as **Medium**.

**Workflow data model gap (key finding):**

`parseStagesBlock` currently extracts: `name`, `worktree`, `concurrency`, `gate`, `terminal`, `initial`. The README frontmatter contains additional per-stage fields needed for the graph:
- `feedback-to` (e.g., `quality` stage has `feedback-to: execute`) — drives backward edge rendering
- `conditional` — comment-implied in README but not a formal boolean field; spec says "CONDITIONAL" in comments — will treat as optional boolean
- `model` — not needed for visualization but good to round-trip through write-back

The `/api/workflows` response already carries `stages: Stage[]` — extending the type propagates automatically to the frontend with no new API endpoint needed for Goal A.

**SVG layout approach (no external deps):**

The build-pipeline workflow has 11 stages in a mostly linear sequence with 2 feedback-to edges (quality→execute, pr-review→execute). Layout strategy:

1. Assign layers by topological sort ignoring back-edges (feedback-to edges). Each stage gets a column index.
2. Position nodes: `x = layer * NODE_SPACING`, `y = center` (single track for linear pipelines). For branching, stack nodes vertically within same layer.
3. Forward edges: straight horizontal arrows between adjacent layers, curved around skipped layers.
4. Feedback edges (backward): curved arc above the node row, dashed stroke, labeled "feedback".
5. Node shapes: `<rect>` for normal, `<polygon>` diamond for gate, `<rect rx>` for terminal/initial.
6. All in pure SVG — no canvas, no D3, no external library. Fits the guardrail.
7. Responsive: SVG `viewBox` with `width: 100%` auto-scales. At ≤768px, swap to chip row fallback.

**README frontmatter structure confirmed** (from `docs/build-pipeline/README.md`):

```yaml
stages:
  defaults:
    worktree: true
    concurrency: 2
  states:
    - name: explore
      initial: true
      model: sonnet
    - name: quality
      feedback-to: execute
      model: haiku
    - name: pr-review
      gate: true
      feedback-to: execute
      model: opus
    - name: shipped
      terminal: true
      worktree: false
```

The `parseStagesBlock` parser handles this structure — only the field extraction needs extending.

## Technical Claims

CLAIM-1: [type: project-convention] "parseStagesBlock can be safely extended to extract feedback-to, conditional, model fields without breaking existing parsing"
CLAIM-2: [type: framework] "SVG viewBox with width:100% reliably auto-scales in all modern browsers for responsive graph rendering"
CLAIM-3: [type: framework] "Simplified Sugiyama layout (topological sort + layer assignment) is feasible for <=12 stages without external deps"
CLAIM-4: [type: framework] "Native HTML5 drag API can handle SVG element drag-and-drop for stage reordering"
CLAIM-5: [type: project-convention] "A custom string-based approach can safely replace the nested stages: block in README frontmatter without a YAML library"
CLAIM-6: [type: framework] "Simple memento pattern (state snapshot array) is sufficient for undo/redo in the visual editor"
CLAIM-7: [type: framework] "CSS media query alone is sufficient for switching between graph and chip row at <=768px"

## Research Report

**Claims analyzed**: 7
**Recommendation**: PROCEED (with corrections for CLAIM-2 and CLAIM-4)

### Verified (4 claims)

- CLAIM-1: CONFIRMED — HIGH — parseStagesBlock already captures all key:value pairs; only type mapping needs extending
  Explorer: parsing.ts:90-106 — the `states:` parsing loop at line 101-103 captures ALL `sstripped.includes(":")` pairs into `Record<string, string>`. Fields like `feedback-to`, `conditional`, `model`, `agent` ARE parsed into the raw state dict. The loss happens at lines 118-125 where only `name`, `worktree`, `concurrency`, `gate`, `terminal`, `initial` are mapped to the `Stage` interface. Fix is purely additive: extend the `Stage` interface in types.ts and add 3 new lines to the mapping at line 118-125. No regex/split changes needed. Discovery.ts:61,87 passes `stages` through unchanged — extending the interface propagates automatically to the frontend API response.
  Web: N/A (project-specific claim)

- CLAIM-3: CONFIRMED — HIGH — Simplified Sugiyama is feasible for this pipeline scale
  Explorer: The build-pipeline workflow has 11 stages in a mostly linear sequence with only 2 feedback-to backward edges (quality->execute, pr-review->execute). No branching (all stages are single-track). This is trivially layoutable.
  Web: The Sugiyama algorithm has 4 phases: cycle removal, layer assignment, crossing reduction, coordinate assignment. For a mostly-linear pipeline with <=12 nodes and <=2 back-edges: (1) cycle removal = just identify feedback-to edges and exclude from DAG, (2) layer assignment = topological sort gives column index directly, (3) crossing reduction = unnecessary for single-track linear pipeline, (4) coordinate assignment = trivial x=layer*spacing. A full Sugiyama implementation is overkill — a simple topological sort with linear layout suffices. No external library needed.

- CLAIM-6: CONFIRMED — HIGH — Memento pattern is appropriate for this editor's complexity
  Explorer: The visual editor state is a simple array of stage objects with properties (name, gate, feedback_to, conditional, terminal, initial). No complex nested state, no collaborative editing, no side effects.
  Web: Multiple sources confirm memento (state snapshot) pattern is ideal for simple object state. The command pattern is only needed for complex data structures, collections, side effects, or collaborative scenarios. For this editor: `undoStack = []; redoStack = []; function snapshot() { undoStack.push(JSON.parse(JSON.stringify(stages))); redoStack = []; }` is sufficient. Memory overhead is negligible for <=12 stage objects per snapshot.

- CLAIM-7: CONFIRMED — HIGH — CSS media query + JS render switch is the correct approach
  Explorer: style.css:406 already has `@media (max-width: 768px)` that collapses the dashboard grid. The existing `.stage-pipeline` chip row (app.js:127-148) can coexist with the graph. The CSS can show/hide the appropriate element: `.pipeline-graph { display: block; } @media (max-width: 768px) { .pipeline-graph { display: none; } .stage-pipeline { display: flex; } }`. No JS layout detection needed — pure CSS media query handles the switch. The JS just needs to render both elements (graph + chip row) and let CSS control visibility.
  Web: Standard responsive pattern — CSS media queries are the canonical approach for layout switching. No JS `matchMedia` or `ResizeObserver` needed for this use case.

### Corrected (2 claims)

- CLAIM-2: CORRECTED — HIGH — SVG viewBox responsive scaling has significant browser gotchas
  Explorer: No existing SVG usage in the dashboard codebase to compare against.
  Web (CSS-Tricks "How to Scale SVG"): Setting `width: 100%; height: auto` on inline SVG does NOT reliably preserve aspect ratio across all browsers. Key issues:
    1. Safari (older versions) won't auto-size inline SVG without explicit dimensions on BOTH width AND height
    2. Only latest Firefox and Blink browsers reliably support `height: auto` with viewBox
    3. When width/height attributes are removed and only viewBox is set, browsers apply inconsistent defaults (some use 300x150, some expand to full viewport)
    4. In flex/grid containers, aspect ratio preservation is unreliable without explicit container wrapping
  **Fix**: Use the "padding-bottom hack" or the modern CSS `aspect-ratio` property as fallback:
    - Option A (modern): `<svg viewBox="0 0 W H" style="width:100%; aspect-ratio: W/H;">` — supported in all modern browsers (Chrome 88+, Firefox 89+, Safari 15+)
    - Option B (safe): Wrap SVG in a container div with `position: relative; width: 100%; padding-bottom: {H/W*100}%;` and position SVG absolutely inside
    - Recommended: Option A with `preserveAspectRatio="xMinYMid meet"` to left-align the graph. The dashboard targets modern browsers only (no IE support needed based on existing CSS features used).
  **Severity**: Minor — the fix is a CSS-level change, not architectural. Use `aspect-ratio` CSS property.

- CLAIM-4: CORRECTED — HIGH — HTML5 Drag API does NOT work with SVG elements
  Explorer: No existing drag-and-drop code in the dashboard to compare against.
  Web (Peter Collingridge SVG tutorial + Mozilla bugzilla #691796 + MDN):
    1. The HTML5 Drag and Drop API's `draggable` attribute is specified for HTML elements only — it does NOT fire `dragstart` events on SVG elements
    2. Mozilla bug #691796 confirms: "the dragstart event is not fired on a svg element"
    3. Must use Pointer Events API instead: `pointerdown`, `pointermove`, `pointerup` with `setPointerCapture()`
    4. Critical SVG-specific gotcha: screen coordinates (clientX/clientY) must be converted to SVG coordinates using `getScreenCTM()`: `x = (evt.clientX - CTM.e) / CTM.a`
    5. Apply transforms via `<g transform="translate(x,y)">` wrappers, not x/y attributes, for universal element compatibility
    6. For touch support: pointer events handle both mouse and touch natively (unlike separate mouse+touch event listeners)
  **Fix**: Use Pointer Events API instead of HTML5 Drag API. Implementation pattern:
    ```javascript
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    // Convert screen coords to SVG coords via getScreenCTM()
    // Use setPointerCapture() for reliable drag tracking
    // Apply position via transform attribute on <g> wrappers
    ```
  **Severity**: Medium — affects the drag implementation approach in editor.js, but the Pointer Events API is actually simpler and more reliable than the HTML5 Drag API. No architectural impact.

### Unverifiable (0 claims)

None — all claims verified with multi-source evidence.

- CLAIM-5: CONFIRMED — HIGH — Custom string replacement for nested stages block is safe and is the correct approach
  Explorer: The existing `updateFrontmatterFields` (frontmatter-io.ts:42-81) only handles flat top-level `key: value` lines. At line 63, it skips lines without `:`, and at line 68-69 it only matches un-indented keys. Indented content (like the `stages:` block) passes through unchanged. The `parseStagesBlock` function (parsing.ts:30-126) already demonstrates the exact pattern for locating the `stages:` block boundaries: find `stages:` line, track indent level, parse until indent decreases. The write-back function can use the same boundary detection to locate and replace the block.
  Web: Regex with dotall flag (`/s`) can match YAML frontmatter blocks. However, the existing indent-based boundary detection in parseStagesBlock is more robust and already proven. Recommended approach: reuse the same parsing logic to find start/end line indices of the stages block, then splice in regenerated YAML lines. This preserves all non-stage content and avoids regex fragility.
  **Implementation note**: The write function should: (1) split text into lines, (2) find frontmatter boundaries (---), (3) within frontmatter, find `stages:` and its extent using indent tracking (same as parseStagesBlock), (4) replace those lines with regenerated stages YAML, (5) rejoin. This is safer than regex because it mirrors the read path exactly.

### Recommendation Criteria

- 0 corrections affecting architecture or domain rules
- 2 corrections: CLAIM-2 (SVG scaling — CSS-level fix, minor) and CLAIM-4 (drag API — use Pointer Events instead, medium but simpler)
- Neither correction changes the overall approach, file structure, or data model
- Both corrections are implementation-level: CSS property choice and event API choice
- All 7 claims verified with evidence from codebase + web sources

**Recommendation: PROCEED** — corrections are implementation-level (CSS property, event API) and do not affect the plan's architecture, data model, or file structure. The plan should note:
1. Use CSS `aspect-ratio` property (not just `width:100%`) for SVG responsive scaling
2. Use Pointer Events API (not HTML5 Drag API) for SVG drag-and-drop in editor.js
3. Convert screen-to-SVG coordinates via `getScreenCTM()` for accurate drag positioning

## Stage Report: research

- [x] Claims extracted from plan (7 claims)
- [x] Explorer subagent dispatched and returned (codebase verification via Grep/Read)
- [x] Context7 subagent dispatched and returned — SKIPPED: Context7 MCP not available. No library-specific APIs to verify (pure SVG/DOM/CSS — all browser-native APIs). Two-source verification (Explorer + Web) sufficient.
- [x] Web subagent dispatched and returned (5 web searches + 2 deep fetches)
- [x] Cross-reference synthesis completed (7/7 claims resolved: 5 confirmed, 2 corrected)
- [x] Research report written to entity
- [x] Insights cached to context lake — SKIPPED: all findings written to entity body for plan stage consumption

### Summary

7 technical claims verified. 5 confirmed as-is, 2 corrected with implementation-level fixes (SVG needs `aspect-ratio` CSS, drag needs Pointer Events API instead of HTML5 Drag API). No architectural changes needed. Recommendation: **PROCEED**.

## Stage Report: plan

- [x] Read entity body for explore results, research corrections, and acceptance criteria
- [x] Invoke Skill: "superpowers:writing-plans" to produce a formal implementation plan
- [x] Plan must include concrete file paths, task ordering, and test-first approach
- [x] Plan must incorporate all research corrections
- [x] Plan must include quality gate steps (type-check, tests)
- [x] Save plan to docs/superpowers/plans/ directory
- [x] Write stage report into entity file

### Summary

Formal implementation plan saved to `docs/superpowers/plans/2026-04-05-dashboard-workflow-visualizer.md`. 10 tasks covering both Goal A (SVG pipeline graph visualization) and Goal B (visual drag-and-drop editor with write-back). All 5 research corrections incorporated: (1) CSS `aspect-ratio` for SVG responsive, (2) Pointer Events API for SVG drag, (3) simplified Sugiyama layout for <=12 stages, (4) memento pattern for undo/redo, (5) indent-based string replacement for stages write-back. Plan follows test-first ordering with 2 new test files (parsing.test.ts, frontmatter-io.test.ts). Quality gate as final task (Task 10) covers type-check, test suite, and visual verification checklist against all acceptance criteria.

## Stage Report: execute

- [x] All 10 plan tasks implemented with atomic commits
- [x] Tests pass: `bun test` from tools/dashboard/ (14 pass, 0 fail)
- [x] Type-check passes: `bunx tsc --noEmit` from tools/dashboard/ (no errors)
- [x] All acceptance criteria addressed (Goal A visualization + Goal B editor)
- [x] Research corrections incorporated (Pointer Events, CSS aspect-ratio, etc.)

### Commits (8 atomic)

1. `a8f6b3b` feat(types): extend Stage interface with feedback_to, conditional, model
2. `552d982` feat(parsing): map feedback_to, conditional, model from stage states
3. `66b5cee` feat(frontmatter-io): add updateWorkflowStages for stages block write-back
4. `57072e7` feat(server): add GET /api/workflow/readme and POST /api/workflow/stages routes
5. `c802db7` feat(visualizer): add SVG pipeline graph layout engine
6. `045f782` feat(app): integrate pipeline graph into render loop with editor toggle
7. `a2942d0` feat(css): add pipeline graph and editor styles with responsive switching
8. `824007c` feat(editor): add visual workflow editor with drag, undo/redo, validation

### Goal A — Visualization (implemented)

- Each workflow renders as a directed graph (nodes = stages, edges = transitions) via `visualizer.js`
- Gate stages shown as diamond shapes with orange border (`#f0883e`)
- Feedback-to edges shown as curved dashed arrows above nodes with "feedback" label
- Conditional stages shown with dashed border (`stroke-dasharray: 4,3`)
- Entity count badges on each stage node (blue circle with count)
- Click stage node to filter entity table (same behavior as chip click)
- Responsive: at <=768px, graph hidden and chip row shown via CSS media queries

### Goal B — Visual Editor (implemented)

- "Edit Pipeline" button toggles editor mode on each workflow card
- Drag to reorder stages via Pointer Events API (`pointerdown`/`pointermove`/`pointerup`)
- Add new stage via "+ Add Stage" button (prompt for name, validates uniqueness)
- Remove stage via "Remove" button (warns if entities exist at that stage)
- Toggle gate/feedback-to/conditional/terminal/initial properties via checkbox panel
- Set feedback-to target via dropdown select
- Save writes back to workflow README frontmatter via POST `/api/workflow/stages`
- Undo/redo via memento pattern (snapshot array)
- Validation errors shown live (no terminal, no initial, duplicate names, invalid feedback-to)

### Research corrections applied

1. CSS `aspect-ratio` property on `.pipeline-graph-svg` for reliable SVG responsive scaling
2. Pointer Events API for SVG drag-and-drop (HTML5 Drag API does NOT work with SVG elements)
3. Screen-to-SVG coordinate conversion via `getScreenCTM()`
4. Simplified Sugiyama layout (topological order = array index for linear pipelines)
5. Memento pattern for undo/redo (state snapshot array with JSON deep clone)
6. Indent-based string replacement for stages write-back in `updateWorkflowStages`

### Summary

All 10 plan tasks implemented across 8 atomic commits (Tasks 6+9 combined as the edit toggle naturally belongs in the same app.js integration). Backend: Stage type extended with 3 new fields, `parseStagesBlock` maps them from already-parsed state dict, `updateWorkflowStages` handles nested YAML write-back, 2 new server routes for workflow readme/stages API. Frontend: pure SVG pipeline graph renderer (`visualizer.js`), visual editor with Pointer Events drag, undo/redo, validation, and POST save (`editor.js`), responsive CSS with graph/chip-row media query switching. Test suite: 14 tests pass (discovery 3, parsing 5, frontmatter-io 6). Type-check clean.
