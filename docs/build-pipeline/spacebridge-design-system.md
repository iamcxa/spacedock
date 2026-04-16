---
id: 117
title: "Spacebridge Design System -- Dark-Mode-First Tokens + Component Library + Theme Toggle"
status: explore
context_status: awaiting-clarify
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
- **Explicit non-goals**: Building new page layouts or components for sibling entities (119-121 build their own UI on top of these tokens). Runtime theming beyond light/dark (no custom brand themes). Performance optimization or bundle-size work (060 Scope: Out). (✓ resolved by explore: parent 060 Scope: Out explicitly excludes "Performance optimization" and "New features absent from legacy dashboard")

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

**APPROACH**: Install `next-themes` as the theme provider (✓ research: next-themes README + community articles -- confirmed compatible with Next.js App Router + Tailwind v4 class-based dark mode; requires `"use client"` wrapper in `providers.tsx`, `suppressHydrationWarning` on `<html>`, and `attribute="class"`) (✓ confirmed by explore: angle (iv) confirms no providers.tsx, no next-themes in package.json, no ThemeToggle component exist yet -- clean greenfield). Wrap root layout in `<ThemeProvider defaultTheme="dark" attribute="class" disableTransitionOnChange>`. Fix the dark variant selector from `(&:is(.dark *))` to `(&:where(.dark, .dark *))` per Tailwind v4 canonical form (⚠ research: current selector misses self-match on `<html>` element -- `dark:` utilities on `<html>`/`<body>` would silently fail) (✓ confirmed by explore: angle (i) confirms `<html>` has no `.dark` class applied at runtime, dark mode CSS is dead code). Restructure `globals.css` to separate semantic design tokens (color, typography scale, spacing scale) from component-specific styles (✓ confirmed by explore: angle (i) confirms 54 occurrences of CSS var token consumption across 23 files via Tailwind utilities -- existing bridge works, just needs token definitions expanded). Replace the 6 hardcoded `rgba(255, 212, 0, ...)` values in `.comment-highlight` with new `--highlight-*` tokens (✓ confirmed by explore: angle (i) confirms globals.css:124-150 has exactly these hardcoded values). (⚠ contradicted: explore found 13 additional hardcoded Tailwind palette colors in gate-buttons.tsx, chat-input.tsx, and comment.tsx using green-600, red-200, yellow-600, blue-500, purple-500 -- see O-1). Load Geist fonts via `next/font/local` and apply the font className to `<html>` (✓ confirmed by explore: angle (iv) confirms font vars are dangling -- --font-geist-sans/--font-geist-mono referenced in @theme inline but never set; no geist package installed, no next/font import). Add a `<ThemeToggle>` component (shadcn-pattern: dropdown with system/light/dark options) that persists preference to localStorage. Produce `docs/spacebridge-design-system.md` architecture doc with a "Cloud Multi-Tenant Compatibility" section confirming no hostname, port, or session coupling in the token/component layer.

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

## Assumptions

A-1: All 11 existing shadcn/ui primitives (avatar, badge, button, card, collapsible, scroll-area, separator, skeleton, tabs, textarea, tooltip) already consume tokens exclusively via Tailwind utility classes -- no internal hardcoded color values need fixing.
Confidence: Confident (0.90)
Evidence: spacebridge/ui/components/ui/button.tsx:7-28 -- 6 variants + 4 sizes all via semantic CSS var tokens (bg-primary, text-primary-foreground, etc.) [primary]; spacebridge/ui/components/ui/badge.tsx:5 -- 4 variants all via CSS var tokens [secondary]; spacebridge/ui/components/ui/card.tsx:8 -- spacing via Tailwind scale p-6, space-y-1.5, no hardcoded colors [secondary]. Angle (i) audited all 11 primitives.

A-2: The existing `:root` / `.dark` CSS variable blocks in globals.css (oklch-based) are the correct foundation for the token system -- they do not need to be replaced, only extended with typography and spacing tokens.
Confidence: Confident (0.95)
Evidence: spacebridge/ui/app/globals.css:46-113 -- 30+ oklch color tokens defined in :root, mirrored in .dark block [primary]; spacebridge/ui/components.json:1 -- shadcn configured with cssVariables: true, baseColor: neutral [primary]; angle (i) confirms 54 token consumption occurrences across 23 files via Tailwind utilities [secondary].

A-3: Typography does not need a custom scale beyond Tailwind defaults -- the codebase uses text-xs/text-sm exclusively (80 occurrences), with text-lg and text-2xl as rare exceptions. The "typography scale" deliverable means documenting the Tailwind scale as the authoritative scale and ensuring Geist font loads correctly.
Confidence: Likely (0.70)
Evidence: angle (i) found text-xs + text-sm account for the overwhelming majority of 80 font-size occurrences [secondary]; angle (iv) confirms no custom --font-size or --text- tokens exist [secondary]. Gate (ii): claim predicts that plan will document Tailwind scale rather than define custom tokens -- predictive of execute output. Gate (iii): exclusive to this entity's design-system scope.

A-4: Spacing does not need custom CSS tokens -- the codebase uses Tailwind numeric scale exclusively (101 occurrences of p-2, p-3, gap-2, gap-4, etc.) with no custom spacing values. The "spacing scale" deliverable means documenting the Tailwind 4px grid as the authoritative scale.
Confidence: Likely (0.70)
Evidence: angle (i) confirms all padding/margin/gap uses Tailwind numeric scale values with zero custom CSS spacing [secondary]; angle (iv) confirms no --spacing or --space- custom properties exist [secondary]. Same gate reasoning as A-3.

A-5: The `entity-body.tsx` comment highlight marks (imperatively created via `document.createElement`) cannot use Tailwind classes and must use CSS custom properties via inline `style` attributes. The `--highlight-*` tokens defined in globals.css will be consumed as `var(--highlight-bg)` in the imperative code.
Confidence: Confident (0.85)
Evidence: spacebridge/ui/components/entity-body.tsx:72 -- uses rgba(255,212,0,...) as inline style for DOM-injected comment highlight mark elements [primary]; spacebridge/ui/app/globals.css:124-150 -- .comment-highlight class also uses hardcoded rgba [primary]. Gate (ii): predicts plan will wire CSS vars into imperative JS -- predictive. Gate (i): crosses frontend (entity-body.tsx) + config (globals.css) layers.

A-6: Entity 094 (pipeline graph) consumes tokens via `hsl(var(--primary))` pattern for SVG rendering. After 117 ships, 094's execute stage must verify its token name references still resolve correctly under the oklch palette -- but no breaking change is expected because Tailwind's `@theme inline` bridge maps CSS var names identically regardless of color space.
Confidence: Likely (0.75)
Evidence: docs/build-pipeline/warroom-pipeline-graph-visualization.md:95-97 -- A-7 maps Primer hex to hsl(var(--primary)) [secondary]; spacebridge/ui/app/globals.css:54 -- --primary is defined as oklch(0.205 0 0), consumed via Tailwind bridge as bg-primary [primary]. Note: hsl() wrapping a CSS var that contains oklch() will fail silently -- 094's execute must use the Tailwind utility class (bg-primary) not hsl(var(--primary)) directly.

## Option Comparisons

### O-1: Hardcoded Tailwind palette colors in status components

Angle (i) found 13 hardcoded Tailwind palette colors (green-600, red-200, yellow-600, blue-500, purple-500) in gate-buttons.tsx (10 occurrences), chat-input.tsx (3), and comment.tsx author avatar colors. These bypass the semantic token system.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Convert to semantic status tokens (--status-approved, --status-rejected, --status-pending) in globals.css and consume via Tailwind | Token discipline consistent across entire codebase. Dark mode can adjust status colors independently. GUARDRAIL compliance ("no hardcoded hex or absolute-pixel values outside the token file"). | More tokens to maintain. Status colors are intentionally direct (green = approved) -- adding indirection may be over-engineering. | Low | ✅ Recommended |
| Keep hardcoded Tailwind palette colors as intentional semantic overrides for status states | No change required. Tailwind palette colors DO have dark mode variants (green-600 renders differently in dark). Simpler. | Violates the directive's explicit constraint ("no hardcoded hex or absolute-pixel values outside the token file"). Tailwind palette colors are not CSS custom properties. | None | Viable but violates directive |

### O-2: Token file architecture -- restructure globals.css vs new tokens.css

Parent 060 Scope: In says "ships a CSS design-token file (`tokens.css`)" but the APPROACH says "restructure globals.css". These conflict.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| Keep tokens in globals.css (restructure with clear sections) | Single file import. shadcn/ui convention already uses globals.css for tokens. No import chain change needed. Tailwind v4 `@theme inline` already references globals.css. | 060 Scope: In explicitly says "tokens.css". File grows larger. Harder to share tokens across projects. | Low | ✅ Recommended |
| Create separate tokens.css imported by globals.css | Matches 060 Scope: In literally. Clean separation. Shareable across projects. | Extra import hop. shadcn convention is globals.css. Tailwind v4 @theme inline must reference the right file. More complex for a single-project codebase. | Low | Viable |

### O-3: Default theme strategy -- dark-only vs dark-with-system-fallback

The directive says "dark mode as default theme on first load" which could mean: (a) always dark unless user explicitly toggles, or (b) dark as fallback when system preference is unset, but respect system preference when available.

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| defaultTheme="dark" (always dark on first load, ignore system preference) | Matches directive literally ("dark mode as default on first load"). Predictable. Captain pain was "顏色不對 -- 應該要是 dark mode" -- this guarantees dark. | Ignores users who prefer light mode via OS settings. next-themes still offers system/light/dark in the toggle -- just not on first load. | Low | ✅ Recommended |
| defaultTheme="system" with dark fallback | Respects OS preference. Modern convention. | Captain explicitly said dark should be default -- system preference might show light, which is the exact pain being fixed. | Low | Viable |

## Open Questions

Q-1: Should the ThemeToggle offer three options (system / light / dark) or two (light / dark)?

Domain: User-facing Visual
Why it matters: Three options (system / light / dark) is the shadcn convention and allows respecting OS preference. Two options (light / dark) is simpler but removes the system-detection feature. The choice affects both the ThemeToggle component design and how `next-themes` is configured.
Suggested options:
- (a) Three options: system / light / dark (shadcn convention, more flexible)
- (b) Two options: light / dark (simpler, captain's pain is about default not about system detection)

Q-2: Should the Geist font be loaded via the `geist` npm package (maintained by Vercel, provides next/font integration) or via `next/font/local` with self-hosted font files?

Domain: User-facing Visual, Readable / Textual
Why it matters: The `geist` npm package is the official Vercel-maintained distribution with `next/font` integration built in. Self-hosting via `next/font/local` requires obtaining and bundling the .woff2 files manually. Both achieve the same visual result but differ in maintenance and dependency footprint.
Suggested options:
- (a) `geist` npm package (official, maintained, clean API: `import { GeistSans, GeistMono } from 'geist/font'`)
- (b) `next/font/local` with self-hosted .woff2 files (no npm dependency, full control, but manual font file management)

## Core Tensions

- **(domain-based)**: globals.css is already contracted to entity warroom-sse-feed; 117 must modify the same file to restructure tokens without breaking the existing contract. Resolution path: 117 supersedes the token portion since warroom-sse-feed is shipped and 117 is the designated design-system owner.
- **(essential)**: Dark-mode-first default vs. respecting OS `prefers-color-scheme` -- the directive says "dark mode as default on first load" which may override system preference. Elevated to O-3 for captain selection.
- **(time-based)**: Token contract must stabilize before siblings (118-121) enter execute -- 117 is on the critical path for the entire 060 epic.
- **(domain-based)**: Entity 094 uses `hsl(var(--primary))` for SVG coloring but 117 ships oklch tokens -- hsl() wrapping oklch values will silently fail. 094's execute must use Tailwind utility classes, not direct hsl(var()) access. Flagged as A-6.

## Honest Boundaries

- The 11 shadcn primitives were audited by angle (i) but text-selection-popover.tsx and add-comment-form.tsx were NOT read (20-file cap reached) -- they may contain additional hardcoded values.
- The scope of "component library" (which new components beyond the existing 11) is not specified in the directive and cannot be inferred from explore evidence. Captain must decide in clarify.
- US-7 / entity 100 details are not readable from the current codebase -- the "cloud multi-tenant compatibility" constraint is taken at face value from the directive without verifying entity 100's actual requirements.
- Angle (ii) found no ADR infrastructure (docs/adr/ does not exist) -- it is unknown whether 117 should create a formal ADR entry in DECISIONS.md.

## Stage Report: explore

- [x] Files mapped: 18 across frontend (18)
  angle (i): 18 files (11 shadcn primitives + 7 app components); angle (ii): 4 files (entity docs + DECISIONS.md); angle (iii): 8 files (7 sibling entities + CONTRACTS.md); angle (iv): 6 seed verifications
- [x] Assumptions formed: 6 (Confident: 3, Likely: 3, Unclear: 0)
  A-1 shadcn primitives clean (0.90); A-2 oklch token foundation correct (0.95); A-3 typography scale = Tailwind defaults (0.70); A-4 spacing scale = Tailwind defaults (0.70); A-5 highlight tokens via CSS vars in imperative code (0.85); A-6 entity 094 token consumption safe (0.75)
- [x] Options surfaced: 3
  O-1 hardcoded status colors (semantic tokens ✅ vs keep palette); O-2 token file architecture (globals.css ✅ vs tokens.css); O-3 default theme strategy (dark ✅ vs system)
- [x] Questions generated: 2
  Q-1 ThemeToggle option count (3 vs 2); Q-2 Geist font loading strategy (npm vs local)
- [x] α markers resolved: 1 / 1
  α-1 (non-goals) resolved via parent 060 Scope: Out
- [x] Scale assessment: Medium confirmed
  18 files mapped; 6 assumptions + 3 options + 2 questions consistent with Medium complexity
- [x] Research dispatched: 0 researchers (skipped -- all assumptions validated by 4-angle codebase exploration; no external technology claims remaining after brainstorm research)
