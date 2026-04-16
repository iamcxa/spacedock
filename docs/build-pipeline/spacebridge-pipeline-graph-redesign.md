---
id: 124
title: "Spacebridge Pipeline Graph Redesign -- Responsive Layout + Polish + Design"
status: draft
context_status:
source: entity 094 UAT follow-on (captain 2026-04-16)
created: 2026-04-16T00:00:00+08:00
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
parent:
children:
depends-on: [094]
---

## Directive

Entity 094 shipped functional parity with `tools/dashboard/static/visualizer.js` (all visual capabilities of the legacy graph), but UAT surfaced design and polish gaps that go beyond parity. The legacy visualizer itself was not great UX — 094 dutifully mirrored it. This entity addresses the gaps:

### Polish bugs (low-effort, high-value)

1. **FO hooks summary duplicates** — header annotation shows `pr-review-loop, pr-review-loop, pr-merge, pr-merge, workflow-index-maintainer, workflow-index-maintainer`. Library mods (under `mods/`) and workflow mods (under `_mods/`) are scanned independently and concatenated without dedup. Fix: dedup by mod name in `parseModHooks` or in the rendering site (war-room.tsx).

2. **Hydration warning on entity detail page** — React hydration mismatch warning in console. Most likely culprit: `components/comment.tsx:28` calls `new Date(epochMs).toLocaleDateString()` without explicit locale; SSR uses Node's locale, client uses browser locale. Fix: pin to a specific locale (e.g., `"en-US"`) or render date client-side only via `useEffect`.

3. **Feedback arc label overlap** — multiple feedback arcs converging on the same target stage (quality→execute, review→execute, uat→execute) stack vertically with the staggered offset, but their `feedback` text labels still overlap. Fix: stagger label positions horizontally or hide labels except on hover.

### Layout / responsive (medium-effort)

4. **Viewport overflow** — at 11 stages with NODE_W=120 + NODE_GAP_X=60, the SVG width is ~1980px. On narrower viewports the graph is hidden behind `overflow-x-auto` scroll, but there's no zoom-to-fit or pan UI hint. Fix options:
   - Auto-fit-to-width: scale SVG via `viewBox` so all nodes fit horizontally; node text remains readable above some min-zoom.
   - Pan + zoom controls: small zoom +/- buttons + drag-to-pan, retain natural sizes.
   - Vertical layout option: collapse to vertical for narrow viewports.

5. **Inactive stages take same visual weight as active** — every stage is a fully filled node regardless of whether any entity is currently in it. Fix: stages with `count === 0` could render as outlined-only / lower opacity.

### Design redesign (larger scope)

6. **Visual hierarchy weak** — current design treats all stages equally. Could use color/size hierarchy (e.g., gate stages emphasized, manual stages de-emphasized).

7. **Stage descriptors invisible** — stage name is the only label inside each node; no indication of model (sonnet/opus/haiku), gate type, or skill name. Hover tooltip with this metadata would aid comprehension.

8. **No "current pipeline state" affordance** — at-a-glance, you can't tell which stages are bottlenecks (high count) vs. healthy. Color-grade badges by count quartile? Or add a sparkline of recent throughput?

## Brainstorming Spec

(Pending /shape or /build to convert directive into Goal Check + APPROACH/ALTERNATIVE/GUARDRAILS/RATIONALE)

## Acceptance Criteria

(Pending plan)

## Captain Context Snapshot

- Source: 094 UAT (2026-04-16) -- captain reviewed running prod build, identified design + polish gaps beyond parity scope
- 094 explicitly excluded "Edit Pipeline" button per captain decision (will be replanned separately when needed)
- Test environment to dogfood the redesign: same setup as 094 UAT (integration-ish worktree, prod build, port 3535)

## Expected Scope Hints

- ~3-5 files: pipeline-graph.tsx (most changes), war-room.tsx (integration), maybe lib/pipeline-parse.ts (if mod dedup at source)
- 1 polish task per bug above (3 tasks for fixes #1-3)
- 1 design task with 2-3 layout options (#4 + #5)
- Decompose-or-defer: items #6-#8 may warrant a separate "design" entity if redesign scope expands.

Scale: Medium. Intent: feature (UX hardening + polish).
