---
id: 094
title: "War room pipeline graph — stage visualization + mod hooks"
status: draft
context_status: pending
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

**APPROACH**: Add a `PipelineGraph` React Client Component to the war room home page at `spacebridge/ui/app/page.tsx`. Two layers: (1) **README parser** — a server-side utility (`lib/pipeline-graph.ts`) reads the build-pipeline README.md from the connected workflow directory, parses YAML frontmatter `stages.states`, and returns typed `PipelineStage[]` with properties (name, gate, manual, feedback-to, model, skill, dispatch). (2) **Graph renderer** — a Client Component using lightweight custom SVG (no heavy graph library) that renders stage nodes and directed edges. Node shapes per directive: rounded rect for normal, diamond for gate, dashed border for manual. Forward edges are solid arrows left-to-right; `feedback-to` edges are dashed orange arcs above the node row. Mod hooks sourced from workflow `_mods/` directory — each mod file's `## Hook:` sections declare hook types (startup, idle, merge); these appear as small labeled pills on relevant stage nodes. Entity count badges populated by `/api/pipeline-status` route querying Drizzle DB for counts grouped by stage. Graph rendered above entity card list. Clicking a stage node sets `?stage=stageName`, filtering the entity list below. SSE live feed drives real-time badge updates (entity transition events update counts without page reload).

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

## Open Questions

(explore stage will populate)

## Bundled Fix: Multi-Session Entity Routing

Entity detail page (`/entity/[slug]`) currently uses `limit(1)` to pick the first session's projectRoot — breaks when multiple CC sessions are connected with different repos. Fix: pass repo context via URL param or scan all projectRoots to find the matching entity file. This is a natural fit for 094 since the war room home page already handles multi-session correctly.

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
