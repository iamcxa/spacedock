---
id: 093
title: "Comment UX polish — right panel layout + text-selection highlights"
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
scale: Small
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
depends-on: [054]
---

## Directive

> Comment UX polish — right panel layout + text-selection highlights. Move comments/activities to a right-side panel (like Notion's comment sidebar). Add yellow highlight underline on entity body text that has text-selection comments anchored to it. When clicking a highlighted text, scroll to/focus the corresponding comment in the right panel. Depends on: 054 (entity detail page + comments API). Scale: Small (UI-only, no backend changes).

## Captain Context Snapshot

- **Repo**: main @ 94bb37f
- **Session**: Entity 054 (detail page + comments API) shipped as PR #48 with 3-mode comment UX. Entity 013 (dashboard inline comment highlights) shipped PR #9 with yellow Notion-style highlights and sidebar-click-to-highlight — proven prior art.
- **Domain**: User-facing Visual, Behavioral/Callable
- **Related entities**: 054 -- Entity detail page + comments API (shipped, PR #48 -- provides REST endpoints, comments table, text-selection popover with selectedText field, inline comment display under sections), 053 -- Next.js war room + SSE feed (shipped, PR #44 -- establishes spacebridge/ui/ app, shadcn component set), 013 -- Dashboard inline comment highlights (shipped, PR #9 -- yellow highlight + sidebar scroll/flash pattern in vanilla dashboard, proven prior art)
- **Created**: 2026-04-14T12:00:00+08:00

## Brainstorming Spec

**APPROACH**: Restructure the entity detail page layout in `spacebridge/ui/app/entity/[slug]/page.tsx` from single-column to two-column: left column (~70%) holds entity header, stage timeline, and markdown body; right column (~30%) is a fixed/sticky comment panel showing all comments and activity feed. Comments are sorted by anchor position. Yellow highlight underlines (`rgba(255,212,0,0.25)` background + `rgba(255,212,0,0.8)` border-bottom underline) are injected via `<mark>` elements wrapping text matching each comment's `selectedText` field. Highlights are applied post-hydration via `useEffect` in a Client Component (DOM text-node manipulation is browser-only). Clicking a highlighted span scrolls the right panel to the corresponding comment card (`document.getElementById('comment-{id}').scrollIntoView()`) and applies a brief flash animation. Existing shadcn components (Card, Badge, Avatar, ScrollArea) provide the panel UI. This is a pure layout/interaction change — no API changes, no new Route Handlers, no schema modifications.

**ALTERNATIVE**: Keep inline-under-section layout but add a floating sidebar toggle (drawer slides out on click) -- D-01 Rejected: a toggle-based drawer adds interaction cost (user must click to see comments) and hides the association between highlighted text and comments. The Notion model requires comments to be simultaneously visible alongside the document body, not hidden in a drawer. A permanent right panel achieves co-presence; a drawer does not.

**GUARDRAILS**:
- No backend changes — UI-only per directive. No new API routes, schema changes, or Route Handlers.
- Match against `selectedText` in rendered markdown body (same pattern as entity 013's TreeWalker approach, adapted for React/Next.js)
- shadcn components from 054's established set (Card, Badge, Avatar, ScrollArea) — no new dependencies
- Highlights applied via useEffect post-hydration (not SSR time) — DOM text-node manipulation is browser-only
- Yellow highlight: `rgba(255,212,0,0.25)` background + `rgba(255,212,0,0.8)` border-bottom (matches entity 013's proven palette)
- Two-column layout degrades on narrow viewports (<768px): stack vertically, panel moves below body

**RATIONALE**: Permanent right-panel satisfies the Notion mental model — comments always visible, anchored text highlighted, clicking navigates panel without toggling. Entity 013 proved yellow-highlight + scroll-to-comment in the vanilla dashboard; this ports that proven UX to the spacebridge Next.js app with a two-column restructure.

## Acceptance Criteria

- Given the entity detail page at `/entity/[slug]` on desktop (>=1024px), when rendered, then the layout shows two columns: body on the left (~70%), comment panel on the right (~30%) with independent scrolling (how to verify: inspect CSS grid/flex layout, assert right panel visible without interaction, ScrollArea wrapping)
- Given a comment with non-empty `selectedText`, when the entity body renders, then the matching text has a yellow highlight mark (`<mark>` with rgba(255,212,0,0.25) background + underline) (how to verify: open detail page with text-selection comments, inspect DOM for highlight elements)
- Given a highlighted text span, when clicked, then the right panel scrolls to the corresponding comment card and a flash animation plays (how to verify: click highlight, assert comment card scrolls into view with flash class)
- Given a text-selection comment whose `selectedText` no longer matches body content, when rendered, then no error occurs and the comment still appears in the panel without a highlight (how to verify: bun test — render with mismatched selectedText, assert no exception)
- Given a narrow viewport (<768px), when rendered, then the comment panel stacks below the entity body (how to verify: resize browser, assert vertical stacking)

## Open Questions

(explore stage will populate)

## Assumptions

(explore stage will populate)

## Option Comparisons

(explore stage will populate)

## Decomposition Recommendation

(explore stage will populate if scope warrants it)

## Canonical References

(clarify stage will populate)
