---
id: 093
title: "Comment UX polish — right panel layout + text-selection highlights"
status: shipped
context_status: ready
source: /build
created: 2026-04-14T12:00:00+08:00
started: 2026-04-14T17:30:00+08:00
worktree:
completed: 2026-04-14T13:13:30Z
verdict: PASSED
score:
issue:
pr: "#53"
intent: feature
scale: Small
project: spacedock
auto_advance:
uat_pending_count: 7
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

## Assumptions

A-1: Current layout is single-column `max-w-4xl` with comments rendered inline under section headings via `EntityBody` component.
Confidence: 🟢 Confident (0.95)
Evidence: `spacebridge/ui/app/entity/[slug]/page.tsx:140` -- `<main className="container mx-auto px-4 py-8 max-w-4xl">`; `:163-175` -- `<EntityBody>` receives `commentsBySection` and renders comments inline
→ Confirmed: captain, 2026-04-14 (batch)

A-2: Comments already have `selectedText` field in DB schema, available on the page as `commentRows[].selectedText`.
Confidence: 🟢 Confident (0.95)
Evidence: `spacebridge/ui/app/entity/[slug]/page.tsx:37` -- `selectedText: string` in commentRows type; `spacebridge/ui/lib/schema.ts` defines the column
→ Confirmed: captain, 2026-04-14 (batch)

A-3: shadcn ScrollArea, Card, Badge components already in project dependencies (from 054 ship).
Confidence: 🟢 Confident (0.95)
Evidence: `spacebridge/ui/package.json:12-13` -- `@radix-ui/react-scroll-area`, `@radix-ui/react-tabs`; shadcn component set established by 053
→ Confirmed: captain, 2026-04-14 (batch)

A-4: Text-selection popover component already exists from 054 — can be extended for highlight click behavior.
Confidence: 🟡 Likely (0.75)
Evidence: `spacebridge/ui/components/text-selection-popover.tsx` exists. Needs verification that it handles `selectedText` matching for highlight injection.
→ Confirmed: captain, 2026-04-14 (batch)

A-5: EntityBody currently receives and renders comments inline — refactor must separate body rendering from comment rendering to enable the two-column layout.
Confidence: 🟢 Confident (0.90)
Evidence: `page.tsx:163-175` -- EntityBody receives `commentsBySection`, `repliesByParent`, `entitySlug` props alongside `body` and `sectionHeadings`. The component is responsible for both markdown body AND comment display.
→ Confirmed: captain, 2026-04-14 (batch)

## Option Comparisons

### O-1: Text highlight injection method

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| useEffect + DOM TreeWalker post-hydration | Matches entity 013 proven pattern; works on any rendered HTML; decoupled from markdown parser | DOM manipulation in React is fragile; must re-run on body changes | Medium | Recommended |
| React-level: custom remark plugin during markdown parse | Type-safe; React-native; no post-hydration DOM surgery | Tightly coupled to markdown parser; harder to match arbitrary selectedText spans that cross markdown nodes | High | Not recommended |

→ Selected: useEffect + DOM TreeWalker post-hydration (captain, 2026-04-14, interactive)

## Open Questions

(none -- approach is clear, 054 provides all needed infrastructure)

## Decomposition Recommendation

Not warranted. 5-6 files, all UI components in the same app. Single coherent change.

## Canonical References

- `spacebridge/ui/app/entity/[slug]/page.tsx:140-179` -- current single-column layout (refactor target)
- `spacebridge/ui/components/entity-body.tsx` -- inline comment rendering (must separate body from comments)
- `spacebridge/ui/components/text-selection-popover.tsx` -- text selection infrastructure from 054

## Stage Report: explore

- [x] Files mapped: 6 across view, component layers
  page: 1 (entity/[slug]/page.tsx), components: 4 (entity-body, comment, comment-thread, text-selection-popover), api: 1 (comments route -- no changes, reference only)
- [x] Assumptions formed: 5 (Confident: 4, Likely: 1, Unclear: 0)
  A-1 layout (0.95), A-2 selectedText field (0.95), A-3 shadcn deps (0.95), A-4 popover extension (0.75), A-5 EntityBody separation (0.90)
- [x] Options surfaced: 1
  O-1 highlight injection method (useEffect TreeWalker vs remark plugin)
- [x] Questions generated: 0
  054 infrastructure sufficient
- [x] α markers resolved: 0 / 0
  No α markers
- [x] Scale assessment: Small confirmed
  5-6 UI files, no backend changes
- [x] Research dispatched: 0 researchers (skipped -- all internal UI patterns, entity 013 prior art in codebase)

## Stage Report: clarify

- [x] Decomposition: not-applicable -- Small UI entity
- [x] Re-validation: 5 assumptions checked, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
- [x] Assumptions confirmed: 5 / 5 (0 corrected)
  A-1 through A-5 confirmed via batch
- [x] Options selected: 1 / 1
  O-1 useEffect + DOM TreeWalker post-hydration (matches entity 013 proven pattern)
- [x] Questions answered: 0 / 0
- [x] Open exploration: 0 gray areas surfaced
- [x] Canonical refs added: 0
  3 refs already populated from explore
- [x] Context status: ready
  gate passed: all assumptions confirmed, all options selected. Ready for FO execution.
- [x] Handoff mode: loose
  auto_advance not set; captain must say "execute 093" to advance
- [x] Clarify duration: 2 questions asked, session complete
  1 batch confirmation + 1 O-1 AskUserQuestion
