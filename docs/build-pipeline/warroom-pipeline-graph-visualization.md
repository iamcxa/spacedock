---
id: 094
title: "War room pipeline graph — stage visualization + mod hooks"
status: clarify
context_status: ready
source: /build
created: 2026-04-14T12:00:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: feature
scale: Medium
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: [053]
---

## Directive

> War room pipeline graph — stage visualization + mod hooks. Parse README.md frontmatter stages.states to render an interactive pipeline graph on the war room home page. Nodes = stages (rounded rect for normal, diamond for gate, dashed border for manual). Edges = stage transitions (solid arrows for forward, dashed orange arrows for feedback-to). Show mod hooks (startup/idle/merge labels on relevant stages). Entity count badge on each stage node (how many entities at that stage). Clickable nodes → filter entity list below to that stage. Below the graph: entity table (reuse existing entity card data). Reference screenshot shows the exact UX pattern (Spacedock Dashboard with phase-ship-pipeline graph). Depends on: 053 (war room + SSE). Scale: Medium (new component + README parser + interactive graph).

## Captain Context Snapshot

- **Repo**: main @ 94bb37f
- **Session**: Entity 053 (Next.js war room + SSE) shipped as PR #44. Entity 064 (dashboard mod visibility) is draft with overlapping scope — should be superseded.
- **Domain**: User-facing Visual, Behavioral/Callable, Organizational/Data-transforming
- **Related entities**: 053 -- Next.js war room view + SSE live feed (shipped, PR #44 -- establishes spacebridge/ui/, entity card list, SSE endpoint, shadcn/Tailwind stack), 064 -- Dashboard mod visibility (draft -- adds mod hook labels to stage graph, overlapping scope — candidate for supersede/merge), 028 -- Dashboard mermaid rendering (explore -- mermaid in entity detail, orthogonal to pipeline graph)
- **Created**: 2026-04-14T12:00:00+08:00

## Brainstorming Spec

**APPROACH**: Add a `PipelineGraph` React Client Component to the war room home page at `spacebridge/ui/app/page.tsx` (✓ confirmed by explore: page.tsx exists, renders WarRoom component, Server Component with force-dynamic). Two layers: (1) **README parser** — a server-side utility (`lib/pipeline-graph.ts`) reads the build-pipeline README.md from the connected workflow directory, parses YAML frontmatter `stages.states`, and returns typed `PipelineStage[]` with properties (name, gate, manual, feedback-to, model, skill, dispatch) (⚠ contradicted: spacebridge/ui/lib/entity-parse.ts is line-based key:value only, cannot handle nested YAML arrays; no YAML library in package.json -- see O-1). (2) **Graph renderer** — a Client Component using lightweight custom SVG (no heavy graph library) that renders stage nodes and directed edges (✓ confirmed by explore: D-01 already rejected graph libraries). Node shapes per directive: rounded rect for normal, diamond for gate, dashed border for manual. Forward edges are solid arrows left-to-right; `feedback-to` edges are dashed orange arcs above the node row. Mod hooks sourced from workflow `_mods/` directory — each mod file's `## Hook:` sections declare hook types (startup, idle, merge) (✓ confirmed by explore: docs/build-pipeline/_mods/pr-review-loop.md:17,31,47 uses consistent ## Hook: pattern; docs/plans/_mods/pr-merge.md:11,23,28 same pattern); these appear as small labeled pills on relevant stage nodes (⚠ note: mod files declare hook types but not which stage they attach to -- see Q-1). Entity count badges populated by `/api/pipeline-status` route querying Drizzle DB for counts grouped by stage (⚠ contradicted: entity current stage is in filesystem markdown frontmatter `status` field, not Drizzle DB; scanEntitiesForRepo already returns status per entity -- see A-1). Graph rendered above entity card list (✓ confirmed by explore: graph is workflow-level, renders above per-repo WarRoom Tabs -- see A-2). Clicking a stage node sets `?stage=stageName`, filtering the entity list below. SSE live feed drives real-time badge updates (entity transition events update counts without page reload) (✓ confirmed by explore: events table has type/entity/stage fields, LiveFeed already parses them -- see A-4, O-2).

**ALTERNATIVE**: Use a third-party graph library (React Flow, D3-dagre, Cytoscape.js) for node-edge layout -- D-01 Rejected: pipeline has fixed linear topology (~10 nodes, 3 feedback arcs). A full graph library adds 100-400KB bundle, requires Client Component boundary, and introduces dependency maintenance burden. Linear topology is fully expressible with flexbox row of SVG nodes + positioned arcs — no layout engine needed. Custom SVG is cheaper, faster, fits the fixed structure.

**GUARDRAILS**:
- Builds on entity 053's stack (shadcn/UI + Tailwind CSS v4 + Radix, React 19, Next.js App Router) — no new UI framework dependencies
- README.md parsing is server-side only; client receives typed `PipelineStage[]` props — no raw file I/O in browser
- Entity 064 (mod visibility, draft) has overlapping scope — this entity implements mod hook labels; 064 should be superseded or merged
- SSE live feed from entity 053 drives real-time badge updates — no separate polling
- `feedback-to` edge rendering must handle multiple edges to same target (quality→execute, review→execute, uat→execute) without visual overlap
- Custom SVG approach — no external graph rendering libraries

**RATIONALE**: The spacebridge Next.js app (entity 053) already provides SSE infrastructure, entity card list, Drizzle DB access, and shadcn/Tailwind stack. Adding the pipeline graph as a new component is the minimal-integration path. Custom SVG for graph layout is correct given the pipeline's known fixed topology (10 nodes, linear, 3 feedback arcs): minimal bundle, no dependencies, fully within React/Tailwind conventions. Entity counts from DB via API route keeps data consistent with entity cards. URL-param-driven filtering connects graph interaction to entity list without global state manager.

## Acceptance Criteria

- Given the war room home page loads, when the pipeline graph renders, then all stages appear as nodes with correct shapes: rounded rect for normal, diamond for gate, dashed border for manual (how to verify: open browser, inspect SVG node shapes against README.md frontmatter properties)
- Given `feedback-to` relationships exist (quality→execute, review→execute, uat→execute), when rendered, then dashed orange arrows appear above the node row connecting source to target (how to verify: visual inspection of SVG, assert orange stroke + dashed stroke-dasharray)
- Given workflow has mods in `_mods/`, when rendered, then stage nodes with mod hooks show labeled pills (startup/idle/merge) (how to verify: check _mods/ hook sections, assert pills visible on corresponding nodes)
- Given entities exist at various stages in DB, when rendered, then each stage node displays correct entity count badge (how to verify: bun test with mocked counts, or manual check — assert badge numbers match `status --next` output)
- Given a stage node is clicked, when the click fires, then entity list below filters to that stage and URL updates to `?stage={name}` (how to verify: click node, assert filtered list + URL param)
- Given `?stage=execute` in URL on page load, when rendered, then entity list is pre-filtered and execute node appears highlighted (how to verify: navigate directly, assert filter active)
- Given SSE live feed connected, when an entity transitions stage, then count badges update without page reload within 2s (how to verify: trigger transition event, observe badge update)

## Assumptions

A-1: Entity stage counts derived from filesystem scan data already fetched by page.tsx, not from a new Drizzle DB query. The `scanEntitiesForRepo` function returns `status` per entity from markdown frontmatter. Counts per stage are computed by grouping these results -- no new `/api/pipeline-status` endpoint needed for initial render.
Confidence: 🟢 Confident (0.95)
Evidence: `spacebridge/ui/app/page.tsx:44-49` -- scanEntitiesForRepo returns EntityCard[] with status field; `spacebridge/ui/lib/entity-scan.ts:39` -- status extracted from frontmatter parsing. Also confirmed: `tools/dashboard/src/discovery.ts:73-79` -- old dashboard computes entityCountByStage with identical grouping pattern.
→ Confirmed: captain, 2026-04-14 (batch)

A-2: Pipeline graph renders above the WarRoom Tabs component in page.tsx, not inside a tab. The graph represents the whole workflow (one pipeline definition shared across repos), while Tabs are per-repo entity lists.
Confidence: 🟢 Confident (0.90)
Evidence: `spacebridge/ui/app/page.tsx:63-67` -- WarRoom is the single main content block; `spacebridge/ui/components/war-room.tsx:24-53` -- Tabs are repo-level grouping
→ Confirmed: captain, 2026-04-14 (batch)

A-3: Mod hook types extracted by parsing `## Hook: {type}` markdown headings from `_mods/*.md` files. This pattern is consistent across both known mod files in different workflow directories.
Confidence: 🟢 Confident (0.90)
Evidence: `docs/build-pipeline/_mods/pr-review-loop.md:17,31,47` -- `## Hook: startup`, `## Hook: idle`, `## Hook: merge`; `docs/plans/_mods/pr-merge.md:11,23,28` -- same `## Hook:` heading pattern
→ Confirmed: captain, 2026-04-14 (batch)

A-4: SSE event stream already carries stage transition data (type, entity, stage fields) sufficient for real-time badge count updates. The client-side EventSource pattern is proven in LiveFeed.
Confidence: 🟢 Confident (0.90)
Evidence: `spacebridge/ui/lib/schema.ts:35-38` -- events table has type, entity, stage columns; `spacebridge/ui/components/live-feed.tsx:29-39` -- parses these fields from SSE stream
→ Confirmed: captain, 2026-04-14 (batch)

A-5: Graceful fallback when README.md is missing or unparseable -- return an empty pipeline definition and render no graph. The codebase consistently follows this pattern for missing data sources.
Confidence: 🟢 Confident (0.90)
Evidence: `spacebridge/ui/lib/entity-scan.ts:22-25` -- try/catch returns [] on readdir failure; `spacebridge/ui/app/page.tsx:13-31` -- try/catch around DB reads with graceful fallback
→ Confirmed: captain, 2026-04-14 (batch)

A-6: Entity 064 (Dashboard -- Mod Visibility in Pipeline UI) should be superseded by this entity. Entity 094's mod hook feature fully implements 064's directive (show mod hooks on stage graph).
Confidence: 🟢 Confident (0.85)
Evidence: `docs/build-pipeline/dashboard-mod-visibility.md:26-30` -- 064's directive is "show registered mods alongside stage graph, display hook types"; 094 GUARDRAILS explicitly note the overlap
→ Confirmed: captain, 2026-04-14 (batch). Captain also confirmed mod hooks stay in 094 scope (not split out).

A-7: React port uses Tailwind CSS variables instead of hardcoded Primer hex colors. SVG attributes use `fill="hsl(var(--primary))"` pattern for theme-aware rendering (dark/light mode support). Mapping: blue→primary, dark-bg→card, border→border, orange→amber-500, green→green-500, purple→purple-400, text→foreground.
Confidence: 🟢 Confident (0.90)
Evidence: `spacebridge/ui/components/entity-card.tsx` -- all existing components use shadcn/Tailwind classes; `tools/dashboard/static/visualizer.js` -- 14 hardcoded Primer hex values to replace
→ Confirmed: captain, 2026-04-14 (interactive, Step 4.5 exploration)

## Option Comparisons

### O-1: README YAML frontmatter parsing approach

The README.md frontmatter uses complex nested YAML (arrays of objects with comments). The existing `entity-parse.ts` is a line-based `key: value` parser that cannot handle this. However, the old dashboard already has `parseStagesBlock()` in `tools/dashboard/src/parsing.ts:30-129` -- a custom line-based parser (~100 LOC) that handles the exact README format, returns typed `Stage[]`, and is battle-tested. Three approaches:

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Port `parseStagesBlock()` from old dashboard | Already validated against same README format; zero new dependencies; follows `entity-parse.ts` inline-duplicate pattern; typed `Stage` interface exists | Another inline duplicate (but codebase accepts this pattern per entity-parse.ts ABOUTME) | Low | Recommended |
| Add `js-yaml` dependency | Handles full YAML spec; future-proof | New dependency (+50KB) when a working custom parser already exists; overkill for one file | Low | Not needed |
| Write new custom parser from scratch | Zero dependencies | Reinventing `parseStagesBlock()` which already exists and works | Medium | Not recommended |

→ Selected: Port parseStagesBlock() from old dashboard (captain, 2026-04-14, interactive)

### O-2: Real-time badge count update mechanism

PipelineGraph needs SSE events to update stage count badges in real-time. LiveFeed already connects to `/api/events`. Two components should not open duplicate SSE connections.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Shared SSE context provider | Single EventSource shared by LiveFeed + PipelineGraph; clean React pattern; no resource waste | Requires extracting LiveFeed's EventSource logic into a React Context; small refactor of existing component | Medium | Recommended |
| PipelineGraph opens own EventSource | Self-contained; no refactor of existing code | Two SSE connections to same endpoint; wastes server resources and client memory | Low | Not recommended |
| Lift SSE to page.tsx via custom hook | Clean separation of data fetching; reusable `useSSE` hook | Larger refactor; page.tsx is currently a Server Component, would need to split SSE logic to a Client Component wrapper | Medium | Viable |

→ Selected: Shared SSE context provider (captain, 2026-04-14, interactive)

### O-3: Multi-session entity routing fix approach (bundled fix)

Entity detail page `/entity/[slug]` currently picks the first session's projectRoot via `limit(1)` -- breaks with multiple CC sessions. Two approaches for the bundled fix:

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Scan all projectRoots for matching slug | Backward compatible; no URL changes; entity slugs are unique within workflows so first match is correct | O(n) filesystem scan per detail page load (n = connected sessions, typically 1-3) | Low | Recommended |
| Pass repo context via URL param | Explicit O(1) lookup; handles theoretical cross-repo slug collisions | Requires updating all entity links (card, graph node clicks); changes URL structure; breaks existing bookmarks | Medium | Viable |

→ Selected: Scan all projectRoots for matching slug (captain, 2026-04-14, interactive). Captain note: this is the best approach given entity slugs are unique within workflows and N is small.

## Open Questions

Q-1: How should mod hooks map to specific stage nodes in the pipeline graph?

Domain: User-facing Visual

Why it matters: Mod files declare hook types (startup, idle, merge) but do NOT declare which pipeline stage they attach to. The README stage comments reference mods in free text (e.g., `# Mod-driven: mods/pr-review-loop.md` on the shipped stage), but this is unstructured. Without a mapping strategy, the graph cannot show "this stage has these hooks" accurately.

Suggested options: (a) Add a structured `hooks:` or `mods:` field to README stage definitions -- clean but requires README schema change, (b) Parse free-text references from README stage comment lines -- works for existing format but fragile, (c) Show mod hooks globally (separate legend/sidebar) without mapping to specific stages -- simple but loses stage-level insight, (d) Infer from hook name conventions (merge → shipped/terminal stages, startup/idle → global FO lifecycle indicators shown outside the graph)

→ Answer: Verified FO hook semantics (references/first-officer-shared-core.md:18-22, claude-first-officer-runtime.md:104). Only 3 hook types exist: `merge` is stage-specific (fired at terminal/shipped boundary) → pill on `shipped` node. `startup` and `idle` are FO lifecycle hooks (not stage-specific) → show as mod summary annotation outside the stage graph (e.g., header or legend). No schema change needed. Hardcode the 3-type mapping. (captain, 2026-04-14, interactive)

## Bundled Fix: Multi-Session Entity Routing

Entity detail page (`/entity/[slug]`) currently uses `limit(1)` to pick the first session's projectRoot -- breaks when multiple CC sessions are connected with different repos. Fix: pass repo context via URL param or scan all projectRoots to find the matching entity file. This is a natural fit for 094 since the war room home page already handles multi-session correctly. (See O-3 for option comparison.)

## Cross-Entity Notes

- **Entity 060 (cutover) ordering**: 060 will delete `tools/dashboard/static/*` including `visualizer.js` (094's reference implementation). 094 should ship before 060. Currently 060 `depends-on: [059]` does not include 094. Recommend updating 060's depends-on to include 094 during 060's plan stage. (Surfaced in clarify Step 4.5, captain, 2026-04-14)

## Canonical References

- `tools/dashboard/static/visualizer.js` -- old pipeline graph SVG renderer (310 LOC, reference implementation for React port: node shapes, forward/feedback edges, badges, click-to-filter)
- `tools/dashboard/src/parsing.ts:30-129` -- `parseStagesBlock()` to port as inline-duplicate to spacebridge/ui/lib/
- `tools/dashboard/src/types.ts:5-15` -- `Stage` interface (name, worktree, concurrency, gate, terminal, initial, feedback_to, conditional, model)
- `tools/dashboard/src/discovery.ts:73-79` -- `entityCountByStage` grouping pattern (group entities by `status` field)
- `references/first-officer-shared-core.md:18-22` -- FO hook discovery: scans `_mods/*.md` for `## Hook:` sections, registers startup/idle/merge
- `references/claude-first-officer-runtime.md:104` -- FO event loop: idle hooks fire when nothing dispatchable

## Stage Report: explore

- [x] Files mapped: 15 across frontend, data/lib, API, config
  frontend: 6 files (page.tsx, war-room.tsx, entity-card.tsx, repo-section.tsx, live-feed.tsx, stage-timeline.tsx); data/lib: 4 (entity-scan.ts, entity-parse.ts, schema.ts, db.ts); API: 1 (events/route.ts); config: 2 (README.md, _mods/pr-review-loop.md); new: 2 (pipeline-graph.ts, pipeline-graph.tsx)
- [x] Assumptions formed: 6 (Confident: 6, Likely: 0, Unclear: 0)
  A-1 entity counts from filesystem (0.95); A-2 graph above Tabs (0.90); A-3 ## Hook: pattern (0.90); A-4 SSE carries stage data (0.90); A-5 graceful fallback (0.90); A-6 entity 064 superseded (0.85)
- [x] Options surfaced: 3
  O-1 README YAML parsing approach; O-2 SSE badge update mechanism; O-3 multi-session entity routing fix
- [x] Questions generated: 1
  Q-1 mod hook to stage node mapping strategy
- [x] α markers resolved: 0 / 0
  No α markers in brainstorming spec
- [x] Scale assessment: confirmed Medium
  15 files across 4 layers; 3 options + 1 question align with Medium complexity
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident 0.85-0.95 via deep file reads, no external tech claims in assumptions, purely internal codebase patterns)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity is Medium scope, no children proposed
- [x] Re-validation: 6 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps (responsive below threshold), 0 research re-validated
  All evidence lines re-read in-session; all hold
- [x] Assumptions confirmed: 7 / 7 (0 corrected)
  A-1~A-6 confirmed via batch; A-7 (color scheme) added and confirmed via Step 4.5 exploration
- [x] Options selected: 3 / 3
  O-1 Port parseStagesBlock() (recommended); O-2 Shared SSE context provider (recommended); O-3 Scan all projectRoots (recommended)
- [x] Questions answered: 1 / 1
  Q-1 mod hook mapping -- hardcode 3-type semantics (merge→shipped pill, startup/idle→FO annotation)
- [x] Open exploration: 2 gray areas surfaced (0 from templates, 1 from cross-entity, 0 from directive, 1 via captain question)
  A-7 color scheme (Primer→Tailwind); cross-entity note (060 cutover ordering)
- [x] Canonical refs added: 6
  visualizer.js, parsing.ts, types.ts, discovery.ts, first-officer-shared-core.md, claude-first-officer-runtime.md
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected, all Qs answered
- [x] Handoff mode: loose
  captain must say "execute 094" or FO picks up in separate session
- [x] Clarify duration: 7 questions asked, session complete
  1 batch confirmation + 3 options (O-1, O-2, O-3) + 1 question (Q-1) + 2 exploration iterations

## Research Findings

### Upstream Constraints

- `spacebridge/ui/tsconfig.json` uses `@/*` path alias mapping to project root, strict mode enabled, `bun-types` for test runner (tsconfig.json:9,28)
- `spacebridge/ui/package.json` has no YAML parsing library -- confirms O-1 decision to port `parseStagesBlock()` rather than add `js-yaml` (package.json:16-36)
- No existing React Context providers in `spacebridge/ui/` -- the SSE context (O-2) will be the first context provider in the codebase (grep `createContext|useContext` returns zero matches)
- `spacebridge/ui/app/layout.tsx` is a minimal Server Component wrapper with no client providers -- SSE context must be added as a Client Component wrapper inside the layout or page

### Existing Patterns

- **Server-to-Client data flow**: `page.tsx` (Server Component) fetches data via DB queries and filesystem scans, passes typed props to `<WarRoom repos={nonEmpty} leaseMap={leaseMap} />` Client Component (page.tsx:72). PipelineGraph will follow the same pattern: server parses README stages + computes entity counts, passes as props.
- **Inline-duplicate pattern**: `entity-parse.ts` is an inline duplicate of `tools/dashboard/src/frontmatter-io.ts` with ABOUTME comment (entity-parse.ts:1-3). The `parseStagesBlock` port follows this established pattern -- new file `lib/pipeline-parse.ts` as inline duplicate of `tools/dashboard/src/parsing.ts:30-129`.
- **Component structure**: All Client Components use `"use client"` directive, shadcn/UI primitives (`Badge`, `Card`, `Tabs`, `ScrollArea`, `Tooltip`), and Tailwind classes. No inline styles, no CSS modules.
- **Entity card grid**: `RepoSection` renders entities in a responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (repo-section.tsx:16). Entity list filtering will modify this existing component.
- **SSE pattern**: `LiveFeed` opens `EventSource("/api/events")`, parses JSON `FeedEntry` objects with `type/entity/stage/agent/timestamp/detail` fields, maintains entries in state (live-feed.tsx:28-41). The SSE route polls DB every 500ms (route.ts:43).

### Library/API Surface

- **SVG in React**: Standard `<svg>` JSX with namespace attributes. React handles SVG elements natively -- no need for `createElementNS`. The visualizer.js reference uses `document.createElementNS` (IIFE pattern); React port uses JSX `<svg>`, `<rect>`, `<polygon>`, `<path>`, `<text>`, `<circle>` directly.
- **Next.js App Router**: `useSearchParams()` from `next/navigation` for reading URL params in Client Components. `useRouter().push()` or `<Link>` for updating URL params. `searchParams` prop available in Server Components via page props.
- **Drizzle ORM**: Used for DB queries in Server Components (page.tsx:16-22, entity detail page). Entity counts are filesystem-derived (A-1 confirmed), not DB queries.

### Known Gotchas

- **Entity detail page multi-session bug**: `entity/[slug]/page.tsx:59-63` uses `sessions` table with `limit(1)` to get `projectRoot`. With multiple CC sessions connected to different repos, the first session's root may not contain the requested entity. Fix (O-3 confirmed): scan all `projectRoot` values and find the one containing `docs/build-pipeline/{slug}.md`.
- **`manual` stage property not in Stage type**: `tools/dashboard/src/types.ts:5-15` `Stage` interface does not include `manual` property, but README stages use `manual: true` for draft/clarify. The `parseStagesBlock` parser in `parsing.ts:101-103` captures any `key: value` pairs into the state record, but only maps known fields to the typed `Stage` return (parsing.ts:118-128). The port must add `manual: boolean` to the new `PipelineStage` type and map it in the parser output.
- **`dispatch` and `skill` stage properties**: README stages include `dispatch:` and `skill:` fields not in the old `Stage` type. These are not needed for graph rendering (no visual distinction), so the port can safely ignore them.
- **Tailwind CSS v4 color variables**: Entity card and other components use Tailwind class names (`text-muted-foreground`, `bg-primary`, etc.) not CSS variable references. For SVG `fill`/`stroke` attributes that can't use Tailwind classes, use `currentColor` or CSS custom properties via `hsl(var(--primary))` pattern per A-7.
- **Multiple feedback-to edges to same target**: README shows quality->execute, review->execute, uat->execute (3 edges to execute). The visualizer.js `renderFeedbackEdge` function spaces arcs by `FEEDBACK_ARC_HEIGHT` but doesn't offset multiple arcs to the same target. The React port must stagger arc heights to prevent visual overlap.

### Reference Examples

- **visualizer.js** (tools/dashboard/static/visualizer.js): 310 LOC reference implementation. Key patterns to port: `buildLayout()` for node positioning (line 48-103), `renderNode()` for shape rendering with gate/terminal/initial/conditional distinctions (line 107-153), `renderBadge()` for count badges (line 157-172), `renderForwardEdge()` with arrowheads (line 176-212), `renderFeedbackEdge()` with curved dashed paths (line 216-256), `renderPipelineGraph()` main orchestrator (line 267-304).
- **parseStagesBlock** (tools/dashboard/src/parsing.ts:30-129): 100 LOC battle-tested parser. Handles `stages:` -> `defaults:` -> `states:` nested structure. Returns `Stage[]` with name, worktree, concurrency, gate, terminal, initial, feedback_to, conditional, model fields.
- **entityCountByStage** (tools/dashboard/src/discovery.ts:73-79): Simple grouping pattern `for (const e of entities) { entityCountByStage[e.status] = (entityCountByStage[e.status] ?? 0) + 1; }`.

## PLAN

Goal: Add interactive pipeline graph to war room home page with stage visualization, entity count badges, click-to-filter, mod hook annotations, SSE real-time updates, and fix multi-session entity routing.

<task id="task-0" model="sonnet" wave="0">
  <read_first>
    - spacebridge/ui/app/page.tsx
    - spacebridge/ui/lib/entity-scan.ts
    - spacebridge/ui/lib/entity-parse.ts
    - spacebridge/ui/components/war-room.tsx
    - spacebridge/ui/components/live-feed.tsx
    - spacebridge/ui/app/entity/[slug]/page.tsx
    - spacebridge/ui/app/api/events/route.ts
    - tools/dashboard/src/parsing.ts
    - tools/dashboard/src/types.ts
    - tools/dashboard/static/visualizer.js
    - docs/build-pipeline/README.md
  </read_first>

  <action>
  Environment verification. Confirm all files exist and contain expected content:
  1. `spacebridge/ui/app/page.tsx` exists and renders `<WarRoom>` component
  2. `spacebridge/ui/lib/entity-scan.ts` exports `scanEntitiesForRepo` and `EntityCard` interface with `status` field
  3. `spacebridge/ui/components/war-room.tsx` exports `WarRoom` and `RepoData` interface
  4. `spacebridge/ui/components/live-feed.tsx` exports `LiveFeed` with `EventSource("/api/events")`
  5. `spacebridge/ui/app/entity/[slug]/page.tsx` has `limit(1)` on sessions query (multi-session bug)
  6. `tools/dashboard/src/parsing.ts` exports `parseStagesBlock` at line 30
  7. `tools/dashboard/src/types.ts` exports `Stage` interface with `gate`, `terminal`, `initial`, `feedback_to` fields
  8. `tools/dashboard/static/visualizer.js` exists (reference implementation)
  9. `docs/build-pipeline/README.md` has `stages:` block with `states:` containing stage definitions
  10. No existing `spacebridge/ui/lib/pipeline-parse.ts` file (will be created)
  11. No existing `spacebridge/ui/components/pipeline-graph.tsx` file (will be created)
  12. No existing `spacebridge/ui/lib/sse-context.tsx` file (will be created)
  </action>

  <acceptance_criteria>
    - All 12 checks pass. If any fail, STOP and revise the plan.
  </acceptance_criteria>

  <files_modified>
  </files_modified>
</task>

<task id="task-1" model="sonnet" wave="1" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - tools/dashboard/src/parsing.ts
    - tools/dashboard/src/types.ts
    - spacebridge/ui/lib/entity-parse.ts
    - docs/build-pipeline/README.md
  </read_first>

  <action>
  Port `parseStagesBlock()` from `tools/dashboard/src/parsing.ts:30-129` to `spacebridge/ui/lib/pipeline-parse.ts` as an inline duplicate following the entity-parse.ts ABOUTME pattern. Define a `PipelineStage` interface extending the old `Stage` type with `manual: boolean` field. The parser reads a README.md file path, extracts frontmatter `stages:` block, parses `defaults:` and `states:` sections, and returns `PipelineStage[]`.

  Specific implementation:
  - Add ABOUTME comment: `// ABOUTME: Inline-duplicate of tools/dashboard/src/parsing.ts parseStagesBlock.`
  - `PipelineStage` interface: `{ name: string; gate: boolean; terminal: boolean; initial: boolean; manual: boolean; conditional: boolean; feedback_to: string; model: string; worktree: boolean; concurrency: number }`
  - `parsePipelineStages(readmePath: string): PipelineStage[]` -- reads file, extracts frontmatter, finds `stages:` block, parses `defaults:` and `states:`, maps state records to typed `PipelineStage` objects. Returns `[]` on missing file or missing `stages:` block.
  - Add `manual` field mapping: `(state.manual ?? "false").toLowerCase() === "true"`

  Also add a helper function `parseModHooks(modsDir: string): Map<string, string[]>` that scans `*.md` files in the given directory, extracts `## Hook: {type}` headings from each file, and returns a map of `{modName -> hookTypes[]}`. This is used to display mod hook pills on graph nodes.

  Write tests in `spacebridge/ui/lib/pipeline-parse.test.ts`:
  - Test `parsePipelineStages` with the actual `docs/build-pipeline/README.md` -- assert it returns 11 stages with correct names in order (draft, brainstorm, alignment-gate, explore, clarify, plan, execute, quality, review, uat, shipped)
  - Test gate stages: brainstorm, alignment-gate, clarify, plan, uat are gates
  - Test terminal: shipped is terminal
  - Test initial: draft is initial
  - Test manual: draft and clarify are manual
  - Test feedback_to: alignment-gate->brainstorm, quality->execute, review->execute, uat->execute
  - Test `parsePipelineStages` with non-existent path returns `[]`
  - Test `parseModHooks` with `docs/build-pipeline/_mods/` directory -- assert pr-review-loop has hooks [startup, idle, merge]
  - Test `parseModHooks` with non-existent directory returns empty Map
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/ui/lib/pipeline-parse.test.ts` passes
    - `grep "parsePipelineStages" spacebridge/ui/lib/pipeline-parse.ts` returns >= 1 match
    - `grep "parseModHooks" spacebridge/ui/lib/pipeline-parse.ts` returns >= 1 match
    - `grep "PipelineStage" spacebridge/ui/lib/pipeline-parse.ts` returns >= 1 match
    - `grep "manual" spacebridge/ui/lib/pipeline-parse.ts` returns >= 1 match
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/lib/pipeline-parse.ts
    - spacebridge/ui/lib/pipeline-parse.test.ts
  </files_modified>
</task>

<task id="task-2" model="sonnet" wave="1" test_first="true" skills="superpowers:test-driven-development">
  <read_first>
    - spacebridge/ui/components/live-feed.tsx
    - spacebridge/ui/app/api/events/route.ts
  </read_first>

  <action>
  Create a shared SSE context provider at `spacebridge/ui/lib/sse-context.tsx` (O-2 decision). This extracts the EventSource logic from LiveFeed into a React Context so both LiveFeed and PipelineGraph can share a single SSE connection.

  Implementation:
  - `"use client"` directive
  - Define `SSEEvent` interface matching the existing `FeedEntry` type in live-feed.tsx: `{ id: number; type: string; entity: string; stage: string; agent: string; timestamp: number; detail?: string | null }`
  - `SSEContext` created via `createContext` with value `{ events: SSEEvent[]; status: "connecting" | "connected" | "reconnecting" }`
  - `SSEProvider` component: wraps children, opens single `EventSource("/api/events")`, maintains events array (newest first, capped at 200), exposes via context
  - `useSSE()` custom hook: returns context value, throws if used outside provider
  - Export `SSEProvider`, `useSSE`, and `SSEEvent` type

  Write tests in `spacebridge/ui/lib/sse-context.test.tsx`:
  - Test that `useSSE()` throws outside provider
  - Test that `SSEProvider` renders children
  </action>

  <acceptance_criteria>
    - `bun test spacebridge/ui/lib/sse-context.test.tsx` passes
    - `grep "SSEProvider" spacebridge/ui/lib/sse-context.tsx` returns >= 1 match
    - `grep "useSSE" spacebridge/ui/lib/sse-context.tsx` returns >= 1 match
    - `grep "createContext" spacebridge/ui/lib/sse-context.tsx` returns >= 1 match
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/lib/sse-context.tsx
    - spacebridge/ui/lib/sse-context.test.tsx
  </files_modified>
</task>

<task id="task-3" model="sonnet" wave="2">
  <read_first>
    - spacebridge/ui/components/live-feed.tsx
    - spacebridge/ui/lib/sse-context.tsx
  </read_first>

  <action>
  Refactor LiveFeed to consume the shared SSE context instead of managing its own EventSource.

  Changes to `spacebridge/ui/components/live-feed.tsx`:
  - Remove the internal `useState` for `entries` and `status`
  - Remove the `useEffect` that creates `EventSource`
  - Import `useSSE` from `@/lib/sse-context`
  - Call `const { events, status } = useSSE()` at component top
  - Replace `entries` references with `events`
  - Keep the auto-scroll `useEffect` and all rendering logic unchanged
  - Remove the `FeedEntry` interface (now `SSEEvent` from sse-context)
  </action>

  <acceptance_criteria>
    - `grep "useSSE" spacebridge/ui/components/live-feed.tsx` returns >= 1 match
    - `grep "EventSource" spacebridge/ui/components/live-feed.tsx` returns 0 matches (removed)
    - `grep "FeedEntry" spacebridge/ui/components/live-feed.tsx` returns 0 matches (removed)
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/components/live-feed.tsx
  </files_modified>
</task>

<task id="task-4" model="sonnet" wave="2">
  <read_first>
    - tools/dashboard/static/visualizer.js
    - spacebridge/ui/lib/pipeline-parse.ts
    - spacebridge/ui/components/entity-card.tsx
    - spacebridge/ui/lib/sse-context.tsx
  </read_first>

  <action>
  Create the PipelineGraph React Client Component at `spacebridge/ui/components/pipeline-graph.tsx`. Port the SVG rendering logic from `tools/dashboard/static/visualizer.js` to React/JSX with Tailwind CSS variable colors per A-7.

  Component interface:
  ```typescript
  interface PipelineGraphProps {
    stages: PipelineStage[];
    entityCountByStage: Record<string, number>;
    modHooks: { merge: string[]; lifecycle: string[] };
    activeStage?: string;
    onStageClick: (stageName: string) => void;
  }
  ```

  Implementation details:
  - `"use client"` directive
  - Import `useSSE` from `@/lib/sse-context` for real-time badge updates
  - Constants ported from visualizer.js: NODE_W=120, NODE_H=40, NODE_GAP_X=60, DIAMOND_SIZE=50, BADGE_R=10, ARROW_SIZE=6, FEEDBACK_ARC_HEIGHT=40, PADDING=30
  - `buildLayout(stages)` function: same logic as visualizer.js -- nodes positioned in horizontal row, forward edges between sequential nodes, feedback edges from feedback_to to named target
  - Node rendering: `<rect>` for normal stages (rx=4), `<polygon>` diamond for gate stages, rx=12 for terminal/initial, `stroke-dasharray="4,3"` for manual stages (not conditional -- the directive says "dashed border for manual")
  - Color mapping per A-7: blue (`hsl(var(--primary))`) for active/badges, border color (`hsl(var(--border))`) for edges/inactive strokes, orange (`rgb(245 158 11)` amber-500) for feedback edges and gate strokes, green (`rgb(34 197 94)` green-500) for terminal, purple (`rgb(192 132 252)` purple-400) for initial, foreground (`hsl(var(--foreground))`) for text, card (`hsl(var(--card))`) for node fills
  - Badge rendering: circle with count at top-right of node, only shown when count > 0
  - Forward edge rendering: solid lines with arrowhead polygons, accounting for diamond vs rect node widths
  - Feedback edge rendering: curved dashed orange paths above nodes using cubic bezier. **Stagger multiple arcs to same target**: when multiple feedback edges target the same node, offset each arc's height by `FEEDBACK_ARC_HEIGHT * (1 + 0.4 * index)` to prevent overlap (quality->execute at base height, review->execute at 1.4x, uat->execute at 1.8x)
  - Mod hook pills: on the `shipped` node, render a small "merge" pill below the node (per Q-1 answer: merge is stage-specific to shipped). Lifecycle hooks (startup, idle) rendered as a small annotation text above the graph: "FO hooks: startup, idle"
  - Click handler: `onStageClick(node.name)` on node group click, cursor pointer
  - Active stage highlight: thicker border (stroke-width 2), primary color fill tint
  - SSE real-time updates: `useSSE()` to get events, maintain local `countsOverride` state. On `stage_transition` events, increment target stage count and decrement source stage count. Merge with initial `entityCountByStage` props.
  - Wrap SVG in a horizontally scrollable container with `overflow-x-auto` for narrow viewports
  </action>

  <acceptance_criteria>
    - `grep "PipelineGraph" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "useSSE" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "buildLayout" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "feedback" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "onStageClick" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "diamond\|DIAMOND\|polygon" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
    - `grep "stroke-dasharray\|dasharray" spacebridge/ui/components/pipeline-graph.tsx` returns >= 1 match
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/components/pipeline-graph.tsx
  </files_modified>
</task>

<task id="task-5" model="sonnet" wave="3">
  <read_first>
    - spacebridge/ui/app/page.tsx
    - spacebridge/ui/lib/pipeline-parse.ts
    - spacebridge/ui/lib/entity-scan.ts
    - spacebridge/ui/components/pipeline-graph.tsx
    - spacebridge/ui/components/war-room.tsx
    - spacebridge/ui/lib/sse-context.tsx
    - docs/build-pipeline/README.md
  </read_first>

  <action>
  Integrate PipelineGraph into the war room home page. Modify `page.tsx` (Server Component) to parse pipeline stages and compute entity counts, then pass them to the WarRoom Client Component which renders PipelineGraph above the Tabs.

  Changes to `spacebridge/ui/app/page.tsx`:
  - Import `parsePipelineStages` and `parseModHooks` from `@/lib/pipeline-parse`
  - After `scanEntitiesForRepo` calls, compute:
    1. For each unique projectRoot, call `parsePipelineStages(join(projectRoot, "docs", "build-pipeline", "README.md"))` -- use first non-empty result (all repos share the same pipeline definition)
    2. Compute `entityCountByStage` by grouping all entities across repos by `status` field: `const entityCountByStage: Record<string, number> = {}; for (const repo of nonEmpty) for (const e of repo.entities) entityCountByStage[e.status] = (entityCountByStage[e.status] ?? 0) + 1;`
    3. Parse mod hooks: scan `_mods/` directories in each workflow dir. For the build-pipeline, call `parseModHooks(join(projectRoot, "docs", "build-pipeline", "_mods"))`. Also scan library mods `parseModHooks(join(projectRoot, "mods"))`. Merge results. Classify: `merge` hooks go on shipped node, `startup`/`idle` are lifecycle.
  - Pass `stages`, `entityCountByStage`, and `modHooks` as new props to `<WarRoom>`

  Changes to `spacebridge/ui/components/war-room.tsx`:
  - Add `PipelineStage` import from `@/lib/pipeline-parse`
  - Add `SSEProvider` import from `@/lib/sse-context`
  - Extend `WarRoomProps` with `stages: PipelineStage[]`, `entityCountByStage: Record<string, number>`, `modHooks: { merge: string[]; lifecycle: string[] }`
  - Add `useSearchParams` and `useRouter` from `next/navigation` for stage filter URL param
  - Read `?stage=` param, use as active filter. Clicking a stage toggles the filter (click same stage again to clear).
  - Wrap entire component content in `<SSEProvider>`
  - Render `<PipelineGraph>` above the Tabs div, passing stages, entityCountByStage, modHooks, activeStage, and onStageClick handler
  - When `activeStage` is set, filter entities across all repos: only show entities whose `status` matches `activeStage`. Pass filtered entities to RepoSection. Show a clear-filter chip/badge next to the graph.
  - Update URL with `router.push(\`?stage=\${name}\`, { scroll: false })` on stage click, or `router.push("/", { scroll: false })` on clear
  </action>

  <acceptance_criteria>
    - `grep "PipelineGraph" spacebridge/ui/components/war-room.tsx` returns >= 1 match
    - `grep "SSEProvider" spacebridge/ui/components/war-room.tsx` returns >= 1 match
    - `grep "parsePipelineStages" spacebridge/ui/app/page.tsx` returns >= 1 match
    - `grep "entityCountByStage" spacebridge/ui/app/page.tsx` returns >= 1 match
    - `grep "parseModHooks" spacebridge/ui/app/page.tsx` returns >= 1 match
    - `grep "useSearchParams" spacebridge/ui/components/war-room.tsx` returns >= 1 match
    - `grep "stage=" spacebridge/ui/components/war-room.tsx` returns >= 1 match
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/app/page.tsx
    - spacebridge/ui/components/war-room.tsx
  </files_modified>
</task>

<task id="task-6" model="sonnet" wave="3">
  <read_first>
    - spacebridge/ui/app/entity/[slug]/page.tsx
  </read_first>

  <action>
  Fix the multi-session entity routing bug in the entity detail page (O-3 decision: scan all projectRoots).

  Changes to `spacebridge/ui/app/entity/[slug]/page.tsx`:
  - Replace the `limit(1)` session query (lines 59-63) with a query that fetches ALL connected sessions' projectRoots: `const sessionRows = handle.db.select({ projectRoot: sessions.projectRoot }).from(sessions).all();`
  - Extract unique projectRoots: `const roots = [...new Set(sessionRows.map(r => r.projectRoot))];`
  - For each root, attempt to read `join(root, "docs", "build-pipeline", \`\${slug}.md\`)`. Use the first root where the file exists as `projectRoot`.
  - Keep the rest of the page logic (events query, comments query, entity rendering) unchanged -- they already use `projectRoot` variable.
  </action>

  <acceptance_criteria>
    - `grep "limit(1)" spacebridge/ui/app/entity/[slug]/page.tsx` returns 0 matches (removed)
    - `grep "new Set" spacebridge/ui/app/entity/[slug]/page.tsx` returns >= 1 match
    - `grep "projectRoot" spacebridge/ui/app/entity/[slug]/page.tsx` returns >= 3 matches
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/app/entity/[slug]/page.tsx
  </files_modified>
</task>

<task id="task-7" model="sonnet" wave="4">
  <read_first>
    - spacebridge/ui/app/page.tsx
    - spacebridge/ui/components/war-room.tsx
    - spacebridge/ui/components/pipeline-graph.tsx
    - spacebridge/ui/components/live-feed.tsx
    - spacebridge/ui/app/entity/[slug]/page.tsx
    - spacebridge/ui/lib/pipeline-parse.ts
    - spacebridge/ui/lib/sse-context.tsx
  </read_first>

  <action>
  Integration verification. Run type checker and linter across the full spacebridge/ui project to catch any integration issues from the previous tasks.

  Commands:
  1. `cd spacebridge/ui && bunx tsc --noEmit` -- type check all files
  2. `cd spacebridge && bun run lint` -- biome lint
  3. `cd spacebridge/ui && bun test` -- run all tests (pipeline-parse, sse-context, existing tests)

  Fix any type errors, lint issues, or test failures found. Common expected fixes:
  - Import path adjustments if any module resolution issues
  - Missing type exports between new modules
  - Biome lint auto-fixable issues (unused imports, formatting)
  </action>

  <acceptance_criteria>
    - `cd /Users/kent/Project/spacedock/spacebridge/ui && bunx tsc --noEmit` exits 0
    - `cd /Users/kent/Project/spacedock/spacebridge && bun run lint` exits 0
    - `cd /Users/kent/Project/spacedock/spacebridge/ui && bun test` exits 0 with all tests passing
  </acceptance_criteria>

  <files_modified>
    - spacebridge/ui/app/page.tsx
    - spacebridge/ui/components/war-room.tsx
    - spacebridge/ui/components/pipeline-graph.tsx
    - spacebridge/ui/components/live-feed.tsx
    - spacebridge/ui/lib/pipeline-parse.ts
    - spacebridge/ui/lib/sse-context.tsx
    - spacebridge/ui/app/entity/[slug]/page.tsx
  </files_modified>
</task>

## UAT Spec

### Browser
- [ ] War room home page loads and displays pipeline graph above entity cards
- [ ] Pipeline graph shows all 11 stages (draft through shipped) with correct node shapes: diamonds for gate stages (brainstorm, alignment-gate, clarify, plan, uat), rounded rect for terminal (shipped) and initial (draft), dashed border for manual (draft, clarify), plain rect for others
- [ ] Forward edges (solid arrows) connect sequential stages left to right
- [ ] Feedback edges (dashed orange arcs above nodes) connect alignment-gate->brainstorm, quality->execute, review->execute, uat->execute without overlapping
- [ ] Entity count badges appear on stages that have entities, showing correct counts
- [ ] Clicking a stage node filters the entity list below to that stage and updates URL to `?stage={name}`
- [ ] Navigating directly to `/?stage=execute` pre-filters entity list and highlights the execute node
- [ ] Clicking the active stage again (or a clear button) removes the filter
- [ ] "merge" mod hook pill appears on the shipped node
- [ ] "FO hooks: startup, idle" annotation appears near the graph
- [ ] Graph is horizontally scrollable on narrow viewports
- [ ] When an entity transitions stage (SSE event), count badges update within 2 seconds without page reload
- [ ] LiveFeed continues to work correctly after SSE context refactor
- [ ] Entity detail page (`/entity/{slug}`) loads correctly with multiple CC sessions connected

### CLI
- None

### API
- None

### Interactive
- None

## Validation Map

| Requirement | Task | Command | Status | Last Run |
|-------------|------|---------|--------|----------|
| AC-1: All stages appear as nodes with correct shapes | task-4, task-5 | Browser: inspect SVG node shapes against README.md | pending | -- |
| AC-2: Feedback-to dashed orange arrows above node row | task-4 | `grep "stroke-dasharray" spacebridge/ui/components/pipeline-graph.tsx` | pending | -- |
| AC-3: Mod hook labeled pills on relevant nodes | task-4, task-5 | Browser: check shipped node has "merge" pill | pending | -- |
| AC-4: Entity count badge on each stage node | task-4, task-5 | `bun test spacebridge/ui/lib/pipeline-parse.test.ts` + browser verify | pending | -- |
| AC-5: Click node filters entity list, URL updates to ?stage={name} | task-5 | Browser: click node, verify URL + filtered list | pending | -- |
| AC-6: ?stage=execute pre-filters and highlights | task-5 | Browser: navigate to /?stage=execute, verify | pending | -- |
| AC-7: SSE live feed updates badges within 2s | task-4 | Browser: trigger transition, observe badge update | pending | -- |

## Stage Report: plan

status: passed
plan-checker verdict: PASS (after 1 revision iteration)
iteration count: 1
knowledge capture: skipped -- no findings met D1/D2 threshold
workflow-index append: 9 append calls, covering 8 tasks and 9 files, all successful

### Plan-checker final output

```yaml
issues:
  - dimension: task_completeness
    task: task-0
    severity: warning
    description: "task-0 has empty files_modified (verification-only task)"
    fix_hint: "Acceptable for Wave 0 environment verification tasks that only read files"
  - dimension: cross_entity_coherence
    severity: warning
    description: "Skill tool unavailable in dispatched plan-checker context; Dim 7 not evaluated at check time"
    fix_hint: "Captain: verify Dim 7 out-of-band via workflow-index read from main session"
  - dimension: type_test_coverage
    task: task-4
    severity: warning
    description: "pipeline-graph.tsx has no test file pairing"
    fix_hint: "SVG rendering component is primarily browser-verified; unit testing SVG output has low ROI. Browser UAT covers this."
  - dimension: type_test_coverage
    task: task-3
    severity: warning
    description: "live-feed.tsx refactor has no dedicated test"
    fix_hint: "Existing live-feed behavior is covered by integration; SSE context has its own tests"
```

### Dispatch Gaps

- Plan-checker ran inline (all 10 dimensions) -- Agent tool unavailable in ensign context, per-dim haiku subagent dispatch not possible
- Monolithic parallel-run diff skipped -- Agent tool unavailable for monolithic sonnet dispatch (parallel-run window count: 1/3)

### Checklist

- [x] 1. Invoke spacedock:build-plan skill and execute all its steps
- [x] 2. Produce ## Research Findings section (5 subsections with citations, inline fallback mode)
- [x] 3. Produce ## PLAN section with 8 tasks (wave 0-4), per-task model hints, files_modified, acceptance_criteria
- [x] 4. Produce ## UAT Spec section (4 categories: Browser 14 items, CLI/API/Interactive none)
- [x] 5. Produce ## Validation Map section (7 rows mapping ACs to tasks and commands)
- [x] 6. Run self-review + plan-checker (1 iteration, 0 blockers, 4 warnings)
- [x] 7. Append CONTRACTS.md rows -- 9 file sections (4 new, 5 appended), commit chore(index): 61a8fef
- [x] 8. Write ## Stage Report: plan with verdict and iteration count

### Commits

- 61a8fef chore(index): add contracts for entity-warroom-pipeline-graph-visualization entering plan (9 files)
- (next) chore(plan): warroom-pipeline-graph-visualization pipeline graph + stage viz + mod hooks + SSE context + multi-session fix
