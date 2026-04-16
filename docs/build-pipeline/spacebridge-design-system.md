---
id: 117
title: "Spacebridge Design System -- Dark-Mode-First Tokens + Component Library + Theme Toggle"
status: brainstorm
context_status: pending
source: entity 060 shape (US-2, 2026-04-16)
created: 2026-04-16T20:00:00+08:00
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
parent: 060
children:
depends-on: []
---

## Directive

Ship a coherent design system for Spacebridge: dark mode as default theme on first load, consistent typography scale, spacing scale, and component library with theme-toggle capability. All Spacebridge UI components must consume design tokens (no hardcoded hex or absolute-pixel values outside the token file). Architecture doc must include a "cloud multi-tenant compatibility" note confirming no hostname or session coupling in the token/component layer (US-7 compatibility with entity 100).

## Captain Context Snapshot

- **Repo**: main @ 95c81cc
- **Session**: Entity seeded from 060 shape (US-2) on 2026-04-16
- **Domain**: User-facing Visual, Readable / Textual
- **Related entities**: 060 -- Spacebridge Cutover Epic (draft, parent); 089 -- inline edit suggestions (clarify ready); 094 -- pipeline graph (clarify ready); 111 -- share view comments (pending); 118 -- dependency graph view (draft); 119 -- entity body editor (draft); 120 -- session list UI (draft); 121 -- version history (draft)
- **Created**: 2026-04-16T20:00:00+08:00

## Goal Check

You are asking for a unified design system that makes Spacebridge load in dark mode by default, replaces all ad-hoc color and spacing values with a single token file, and adds a theme toggle so users can switch to light mode.

- **Problem being solved**: Spacebridge currently renders in light mode with inconsistent styling — hardcoded rgba values coexist with CSS custom properties, Geist fonts are referenced but never loaded, and there is no way for users to toggle themes.
- **Expected outcome**: A single token source (`globals.css` restructured or a dedicated `tokens.css`) drives all color, typography, and spacing; `<html>` loads with `class="dark"` by default; a theme-toggle component persists preference; all existing components consume tokens exclusively.
- **Explicit non-goals**: Building new page layouts or components for sibling entities (119-121 build their own UI on top of these tokens). Runtime theming beyond light/dark (no custom brand themes). (needs clarification -- deferred to explore)

## Lens Evidence

### Lens (a) captain-stated-intent

- Dark mode must be the default theme on first load -- directive:verbatim [primary]
- All UI components must consume design tokens, no hardcoded hex or absolute-pixel values outside the token file -- directive:verbatim [primary]
- Architecture doc must include a "cloud multi-tenant compatibility" note confirming no hostname or session coupling in the token/component layer (US-7 / entity 100) -- directive:verbatim [primary]
- A consistent typography scale and spacing scale are required -- directive:verbatim [primary]
- Theme-toggle capability is required -- directive:verbatim [primary]
- Captain pain: "顏色不對 — 應該要是 dark mode" + "UX 不好" -- entity:060 shape [secondary]

### Lens (b) captain-unstated-intent

- All sibling UI entities (089, 094, 111, 118-121) are implicitly blocked on 117 shipping stable tokens; the token file must be a versioned contract before any sibling's execute stage begins (inferred) -- entity:060 [primary]
- "UX 不好" implies typography and spacing inconsistency across pages, not just wrong colors; "design system" means a single token source replacing all scattered values (inferred) -- entity:060 [primary]
- Theme-toggle must persist preference (localStorage or cookie) so returning visitors are not reset to dark on every load (inferred) -- entity:117 directive [secondary]
- US-7 / entity 100 compatibility means zero localhost references, zero session-scoped globals, zero hardcoded port assumptions in the token/component layer (inferred) -- entity:060 [secondary]
- The component library scope anticipates consumers from sibling entities, not just today's components (inferred) -- entity:117 directive [secondary]
- An architecture doc artifact is an implicit deliverable for future SO/FO sessions (inferred) -- entity:060 [tertiary]

### Lens (c) codebase-current-state

- Dark mode is declared in `.dark` CSS class in globals.css but never activated -- `<html>` has no `dark` class, no `next-themes`, no ThemeProvider -- spacebridge/ui/app/layout.tsx:9-14, spacebridge/ui/app/globals.css:4,81 [primary]
- `.comment-highlight` uses hardcoded `rgba(255, 212, 0, ...)` values outside the token system -- spacebridge/ui/app/globals.css:124-150 [primary]
- Geist font variables (`--font-geist-sans`, `--font-geist-mono`) are referenced in `@theme inline` but never injected into the document (no `localFont` import or className on `<html>`) -- spacebridge/ui/app/globals.css:9-10, spacebridge/ui/app/layout.tsx:9 [primary]
- shadcn/ui configured with `new-york` style, `neutral` baseColor, `cssVariables: true`; 11 primitives installed (avatar, badge, button, card, collapsible, scroll-area, separator, skeleton, tabs, textarea, tooltip) -- spacebridge/ui/components.json:1 [secondary]
- shadcn button.tsx consumes tokens exclusively via Tailwind utilities (`bg-primary`, `text-primary-foreground`) with no hardcoded colors -- spacebridge/ui/components/ui/button.tsx:7-28 [secondary]
- Typography uses Tailwind Typography plugin classes (`prose prose-sm dark:prose-invert`) for markdown rendering -- spacebridge/ui/components/entity-body.tsx:197 [secondary]

### Lens (d) sibling-entity

- `spacebridge/ui/app/globals.css` is already contracted to `spacebridge-nextjs-warroom-sse-feed` with intent "Tailwind v4 + shadcn theme" -- any token/theme changes create a direct write overlap on this file -- entity:warroom-sse-feed [primary]
- `spacebridge/ui/components.json` is contracted to `spacebridge-nextjs-warroom-sse-feed` as "shadcn/UI v4 config" -- base color and style choices are staked -- entity:warroom-sse-feed [primary]
- Entity 060 US-2 explicitly expects this child entity to ship `tokens.css`, dark-mode-first palette, theme-toggle, and `docs/spacebridge-design-system.md` -- scope is a direct match, not a conflict -- entity:060 [primary]
- Entity 119 (entity-body-editor) depends on `spacebridge/ui/components/entity-body.tsx` which uses `dark:prose-invert` -- it is a downstream consumer of whatever tokens 117 ships -- entity:119 [secondary]
- All shadcn primitive contracts are staked by warroom-sse-feed at plan stage -- new primitives must append to CONTRACTS.md, not overwrite -- entity:warroom-sse-feed [secondary]

## Core Tensions

- **(domain-based)**: globals.css is already contracted to entity warroom-sse-feed; 117 must modify the same file to restructure tokens without breaking the existing contract. Resolution path: 117 supersedes the token portion since warroom-sse-feed is shipped and 117 is the designated design-system owner.
- **(essential)**: Dark-mode-first default vs. respecting OS `prefers-color-scheme` -- the directive says "dark mode as default on first load" which may override system preference. Needs captain clarification.
- **(time-based)**: Token contract must stabilize before siblings (118-121) enter execute -- 117 is on the critical path for the entire 060 epic.

## Honest Boundaries

- Build-brainstorm cannot verify whether the existing 11 shadcn components have internal hardcoded values that violate the "no hardcoded hex" constraint -- that requires a per-file audit in explore.
- The scope of "component library" (which new components beyond the existing 11) is not specified in the directive and cannot be inferred from the 4-lens evidence alone.
- US-7 / entity 100 details are not readable from the current codebase -- the "cloud multi-tenant compatibility" constraint is taken at face value from the directive without verifying entity 100's actual requirements.

## Brainstorming Spec

**APPROACH**: Install `next-themes` as the theme provider (✓ research: next-themes README + community articles -- confirmed compatible with Next.js App Router + Tailwind v4 class-based dark mode; requires `"use client"` wrapper in `providers.tsx`, `suppressHydrationWarning` on `<html>`, and `attribute="class"`). Wrap root layout in `<ThemeProvider defaultTheme="dark" attribute="class" disableTransitionOnChange>`. Fix the dark variant selector from `(&:is(.dark *))` to `(&:where(.dark, .dark *))` per Tailwind v4 canonical form (⚠ research: current selector misses self-match on `<html>` element -- `dark:` utilities on `<html>`/`<body>` would silently fail). Restructure `globals.css` to separate semantic design tokens (color, typography scale, spacing scale) from component-specific styles, keeping all values in CSS custom properties consumed via Tailwind's `@theme inline` bridge. Replace the 6 hardcoded `rgba(255, 212, 0, ...)` values in `.comment-highlight` with new `--highlight-*` tokens. Load Geist fonts via `next/font/local` and apply the font className to `<html>`. Add a `<ThemeToggle>` component (shadcn-pattern: dropdown with system/light/dark options) that persists preference to localStorage. Produce `docs/spacebridge-design-system.md` architecture doc with a "Cloud Multi-Tenant Compatibility" section confirming no hostname, port, or session coupling in the token/component layer.

**ALTERNATIVE**: Skip `next-themes` and implement theme toggling manually via a React context + `useEffect` that reads/writes localStorage and toggles `.dark` on `<html>`. -- D-01 Rejected: `next-themes` is the standard Next.js solution for class-based dark mode, handles SSR flash-of-unstyled-content (FOUC), and avoids reimplementing hydration-safe theme detection. Manual implementation adds complexity with no benefit.

**GUARDRAILS**:
- All color values must use CSS custom properties (oklch-based, matching existing shadcn convention); no raw hex/rgb/oklch literals outside `globals.css` token definitions
- shadcn/ui `new-york` style and `neutral` baseColor are already staked by warroom-sse-feed -- do not change the shadcn style variant
- CLAUDE.md: strict TypeScript, Zod at boundaries, run linter
- Architecture doc must be grep-friendly (token names as headings, explicit "Cloud Multi-Tenant Compatibility" section) for downstream researcher consumption
- No hostname, port, or session-scoped globals in the token/component layer (US-7 / entity 100 forward-compatibility)

**RATIONALE**: `next-themes` is the idiomatic Next.js dark-mode solution with built-in SSR FOUC prevention, system-preference detection, and localStorage persistence -- all features the directive requires. The existing codebase already has the CSS variable infrastructure (`:root` / `.dark` blocks in oklch) and the shadcn token bridge (`@theme inline`), so the work is primarily wiring the provider, fixing the font loading gap, replacing hardcoded values, defining typography/spacing scales, and documenting the system. This approach has the smallest delta from current state while delivering all directive requirements.

## Acceptance Criteria

- Given a fresh browser session with no localStorage, when Spacebridge loads, then the `<html>` element has `class="dark"` and the page renders with the dark color palette (how to verify: browser devtools inspect `<html>` classList + visual check)
- Given a user clicks the theme toggle and selects "light", when the page re-renders, then all components switch to the light palette and the preference persists across page reloads (how to verify: toggle theme, reload page, confirm theme persists via localStorage inspection)
- Given any `.tsx` file in `spacebridge/ui/components/`, when searched for hardcoded color values, then zero matches are found for hex (`#`), `rgb(`, `rgba(`, or raw oklch literals outside `globals.css` (how to verify: `grep -rE '#[0-9a-fA-F]{3,8}|rgba?\(|oklch\(' spacebridge/ui/components/ | grep -v node_modules`)
- Given the `globals.css` file, when inspected for typography tokens, then `--font-sans`, `--font-mono`, and at least 3 `--spacing-*` custom properties are defined (how to verify: `grep -c '\-\-font-\|\-\-spacing-' spacebridge/ui/app/globals.css`)
- Given `docs/spacebridge-design-system.md` exists, when searched for the multi-tenant section, then a "Cloud Multi-Tenant Compatibility" heading is present confirming no hostname/session coupling (how to verify: `grep 'Cloud Multi-Tenant Compatibility' docs/spacebridge-design-system.md`)
