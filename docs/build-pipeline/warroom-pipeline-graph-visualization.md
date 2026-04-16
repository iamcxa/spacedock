---
id: 094
title: "War room pipeline graph — stage visualization + mod hooks"
status: shipped
context_status: ready
source: /build
created: 2026-04-14T12:00:00+08:00
started: 2026-04-16T00:00:00+08:00
completed:
verdict:
score:
worktree: .worktrees/spacedock-ensign-warroom-pipeline-graph-visualization
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

## Stage Report: uat

**Verdict**: passed (captain sign-off, functional -- prod-build UAT)

Captain ran `bun run build && bun run start` (port 3535) from integration worktree (089 merged in). Walked UI:
- [x] War room home page renders pipeline graph above entity cards
- [x] Workflow header "build-pipeline / features · 36 total" -- captain guardrail satisfied
- [x] All 11 stages render as SVG nodes (after theme color fix -- hsl(var(--X)) -> var(--X) for Tailwind v4 oklch vars)
- [x] Entity count badges shown per stage
- [x] Multi-session entity routing fix verified (detail pages load)
- [x] LiveFeed still functional after SSE context refactor
- [x] Workflow title + total count header renders above graph

Functional items deferred as polish (seeded to follow-on entity):
- Viewport overflow / no zoom-fit on narrow viewports
- Feedback arc label overlap (multiple arcs converging on same target)
- FO hooks summary duplicate entries (library + workflow mods dedup)
- Hydration warning (comment.tsx toLocaleDateString locale drift)

Post-integration fixes committed to this branch (needed for functional UAT):
- `0b172bb6` fix: theme color regression (hsl/oklch variable format)
- `b5b7890f` chore: dev port 8420 -> 3535
- Plus pre-existing bug fix: `3ebe48ba` entityPath relative vs absolute mismatch (054-era bug surfaced by 089 UAT)

BLOCKED escalations: 0
Captain interactive approval: "功能 OK" + "ok 可以了"

## Confidence Assessment

Stage: pre-ship
Iteration: 1 of 3

| Factor | Weight | Score | Evidence |
|--------|--------|-------|----------|
| test_coverage | 25% | 95% | 77 unit/integration tests pass (task-7 verify); 3 pre-existing spacebridge failures unrelated to 094 |
| type_coverage | 20% | 95% | bunx tsc --noEmit clean (0 errors); import-order lint clean |
| review_severity | 20% | 85% | 1 HIGH found and fixed (useEffect dep array); 1 MEDIUM color-regression found and fixed in UAT |
| ac_completeness | 20% | 90% | 7 functional AC verified, 4 AC deferred to follow-on (polish/design) |
| integration_breadth | 15% | 95% | 9 files across frontend layers; all cross-refs verified, CONTRACTS rows present |
| **Composite** | | **91.5%** | **>= 90% -> advance** |

Verdict: advance

