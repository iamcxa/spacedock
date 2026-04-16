---
id: 119
title: "Spacebridge Entity Body Editor -- Full Render + Edit Parity with Legacy detail.html"
status: clarify
context_status: ready
source: entity 060 shape (US-1 parity, 2026-04-16)
created: 2026-04-16T20:02:00+08:00
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
depends-on: [117, 120]
---

## Directive

> Ensure Spacebridge's entity detail page (`spacebridge/ui/app/entity/[slug]/page.tsx`) reaches full render + interaction parity with the legacy `tools/dashboard/static/detail.html`. Scope includes: stage report rendering, brainstorming spec sections, assumptions/options/questions display, inline comment threads, markdown rendering fidelity, and any interactive features present in the legacy detail page. Identify gaps via parity audit (entity 060 US-1) and close them.

## Captain Context Snapshot

- **Repo**: main @ 9a5170b5
- **Session**: SO session resumed 2026-04-16; captain priority order pushes 119 next before 060 cutover. Entity 054 shipped "parity part 1" already scaffolding page.tsx; 119 closes remaining rendering + interaction gaps.
- **Domain**: User-facing Visual; Behavioral/Callable; Readable/Textual
- **Scope flag**: ⚠️ likely-decomposable (signal count ≥2: "full parity" + "any interactive features" + 6 scope areas × 3 domains) -- deferred decomposition decision to explore/clarify
- **Related entities**: 060 spacebridge-cutover-remove-static-ui (parent, draft); 054 spacebridge-entity-detail-comments-api (shipped parity part 1); 047 entity-body-rendering-hotfixes (clarify — canonical markdown contract); 089 spacebridge-inline-edit-suggestions (clarify ready — inline edits); 094 spacebridge-pipeline-graph (clarify ready); 111 share-view-comment-thread-display (pending); 117 spacebridge-design-system (ready — tokens); 120 spacebridge-session-list-ui (ready — owner/repo routing)
- **Created**: 2026-04-16T20:02:00+08:00

## Goal Check

You are asking for Spacebridge's entity detail page to render and behave the same way the legacy dashboard's entity detail page does, so nothing is lost when the old `tools/dashboard/static` UI is deleted.

- **Problem being solved**: The new Spacebridge entity page is missing rendering fidelity and interactive features present in the legacy detail.html/detail.js — e.g. Stage Report checklists, brainstorming spec sections, open questions formatting — which blocks the legacy UI from being retired (parent entity 060).
- **Expected outcome**: Opening any entity in Spacebridge shows the same visual structure, the same interactive controls, and the same markdown/section fidelity as opening it in legacy dashboard. A parity audit document enumerates every section + interaction and each row is either implemented or explicitly non-goal.
- **Explicit non-goals**: Does NOT add new features beyond legacy; does NOT reimplement inline-edit suggestion flow owned by 089; does NOT own comment CQRS/API owned by 054/111; does NOT deliver design-token system owned by 117; does NOT restructure routing owned by 120. (needs clarification -- deferred to explore: exact boundary between 119 "render" and 089 "edit" for non-suggestion edits.)

## Lens Evidence

### Lens (a) captain-stated-intent

- Target page to bring to parity is `spacebridge/ui/app/entity/[slug]/page.tsx` -- directive:verbatim [primary]
- Legacy reference for parity is `tools/dashboard/static/detail.html` -- directive:verbatim [primary]
- Scope enumerated: stage report rendering, brainstorming spec sections, assumptions/options/questions display, inline comment threads, markdown rendering fidelity, and any interactive features present in the legacy detail page -- directive:verbatim [primary]
- Gap identification method: parity audit labeled "entity 060 US-1" -- directive:verbatim [primary]
- Gaps identified must be closed (remediation required, not audit-only) -- directive:verbatim [primary]
- US-1 source-of-truth doc: `docs/build-pipeline/spacebridge-cutover-remove-static-ui.md` -- directive:verbatim [secondary]

### Lens (b) captain-unstated-intent

- Spacebridge must faithfully reproduce legacy section-split rendering quirks (Stage Report extracted before markdown pass, Open Questions format honoring blank-line separation) before cutover can claim parity -- entity:047 A-2/A-5 [primary]
- 054 is parity part 1 (scaffold only); interactive features (edit via 089, comment threads via 111, pipeline graph via 094) remain open children of 060 — static render correctness is a prerequisite already partially delivered but interactivity parity is not -- entity:054 + entity:060 children [primary]
- Legacy `detail.html`/`detail.js` deletion (terminal cutover in 060) is implicitly blocked until every child of 060 (including 119) reaches shipped -- entity:060 Scope In "Terminal Cutover" [secondary]
- Spacebridge detail page visual must consume 117 design tokens before a parity audit is meaningful (visually broken UI inflates gap counts) -- entity:117 [secondary]
- (inferred) Captain expects parity to include behavioral edge-case handling already landed in 047 (Open Questions blank-line, Stage Report indent detail lines) — 047 was doc-only, so Spacebridge's NEW renderer must independently honor these shapes -- entity:047 A-5 [secondary]

### Lens (c) codebase-current-state

- Spacebridge `page.tsx` renders: back-link, EntityHeader, StageTimeline (conditional), EntityDetailClient two-column body+comments grid -- spacebridge/ui/app/entity/[slug]/page.tsx:133 [primary]
- Spacebridge uses `react-markdown` for body; legacy uses `marked` + `DOMPurify` -- spacebridge/ui/components/entity-body.tsx:9 vs tools/dashboard/static/detail.js:69 [primary]
- Stage Report rendering is ABSENT in Spacebridge `entity-body.tsx`; legacy has dedicated `renderStageReports()` that splits on `## Stage Report:` and renders checklist cards with done/skip/fail icons -- tools/dashboard/static/detail.js:64 vs entity-body.tsx (no equivalent) [primary]
- Brainstorming spec sections (Assumptions / Options / Open Questions) have no section-aware rendering in Spacebridge; body is passed as raw markdown -- spacebridge/ui/components/entity-body.tsx:96 [primary]
- `CommentRow` interface duplicated inline at entity-body.tsx:14 AND entity-detail-client.tsx:12 (drift risk; no shared types file) -- spacebridge/ui/components/entity-body.tsx:14 + entity-detail-client.tsx:12 [secondary]
- Interactive features present in Spacebridge today: text-selection popover comment creation, section-level comment panel, scrollToHighlight flash, GateButtons (accept/reject), ChatInput -- spacebridge/ui/components/entity-detail-client.tsx:72 + entity-body.tsx:10 [primary]
- No shared component/util between legacy detail.js and Spacebridge; the two codepaths are fully parallel -- spacebridge/ui/components/ vs tools/dashboard/static/detail.js (no cross-import) [secondary]

### Lens (d) sibling-entity

- Canonical markdown-rendering contract (Stage Report detail lines, Open Questions blank-line separation) is authored by 047; 119's renderer must match it -- entity:047 [primary]
- 119's files_modified will collide with 054's registered `spacebridge/ui/app/entity/[slug]/page.tsx` ownership — 119 extends rather than replaces 054 -- entity:054 [primary]
- 117 design tokens are hard dependency: all sibling UI entities (089/094/111/118-121) are blocked on 117 shipping stable tokens before execute; 119 same -- entity:117 [primary]
- 089 owns inline-edit suggestion logic at `spacebridge/src/domain/comment/suggestion-decider.ts` — 119 must NOT reimplement suggestion application -- entity:089 [primary]
- 120 replaces current `.limit(1)` session/projectRoot selection at page.tsx with owner/repo routing key — 119 page work must either depend on 120 or deliberately not touch the session lookup -- entity:120 [secondary]
- 111 targets same entity detail view layer for comment-thread display — 119 and 111 must coordinate component slot ownership to avoid duplicate rendering -- entity:111 [secondary]

## Core Tensions

- **(domain-based)**: 119 is a renderer-and-fidelity entity sitting between 054 (page scaffold + comments CQRS), 089 (inline-edit logic), 111 (comment-thread UI), and 117 (visual tokens). Every section of the parity audit lands somewhere in a sibling's territory; the tension is defining exactly which pixels 119 owns vs coordinates.
- **(time-based)**: 117 tokens and 120 routing must ship before 119's visual/routing work is finalizable, but 060 cutover is blocked on 119 and the other children. Any slip in 117 or 120 cascades.
- **(essential)**: Parity requires reproducing undocumented rendering quirks (Stage Report split, Open Questions blank-line, indent detail lines) that currently live only in legacy `detail.js` source. Any parity gap means regressions ship when legacy deletes.

## Honest Boundaries

- Parity audit document (`docs/spacebridge-parity-audit.md`) does NOT exist yet — it is both an input (gap list) and output (remediation tracker) of this entity; brainstorm cannot pre-populate its rows without explore-phase file-diff walk.
- Spacebridge `entity-body.tsx` was read only up to line 96 in lens scan; GateButtons gate-review flow parity with `detail.js:685` (WebSocket + status derivation + accept/reject actions) is UNVERIFIED.
- "Interactive features" in the directive is an open set — explore stage must enumerate every handler in `detail.js` (71.5K) and classify as in-scope / deferred-to-sibling / explicit-non-goal.

## Brainstorming Spec

**APPROACH**: Treat 119 as a renderer-fidelity + interaction-gap-closure entity on top of 054's existing scaffold. Deliverable 1: run a mechanical parity audit walk through `tools/dashboard/static/detail.js` (71.5K) classifying every section-render and event-handler into (a) missing in Spacebridge → close here, (b) partially present → enhance here, (c) owned by sibling (089/094/111/117/120) → link + defer, (d) explicit non-goal (legacy-only dead code). Output = `docs/spacebridge-parity-audit.md` consumed by the plan stage (✓ confirmed by explore: 060 Scope In mandates this doc at spacebridge-cutover-remove-static-ui.md:56). Deliverable 2: add missing section-aware renderers to `spacebridge/ui/components/entity-body.tsx` — pre-split body on `## Stage Report:` / `## Assumptions` / `## Options` / `## Open Questions` BEFORE react-markdown, render split sections with custom React components per 047's canonical contract (✓ confirmed by explore: legacy pattern at tools/dashboard/static/detail.js:62-64, 86-138; Spacebridge entity-body.tsx:214 currently passes raw body to ReactMarkdown with NO split). Deliverable 3: extract shared types to `spacebridge/ui/types/entity.ts` so `CommentRow` stops drifting between `entity-body.tsx:14` + `entity-detail-client.tsx:12` (✓ confirmed by explore: duplication verified). Deliverable 4: close GateButtons gaps — port legacy `isEntityAtGate(status, stages)` workflow-driven gate-visibility derivation to replace entity-body.tsx:88 hardcoded `status === "plan" || status === "uat"`; port status-poll race detection from detail.js:846; port WebSocket `gate_decision` event listener from detail.js:1148. GateButtons.tsx itself already ships full approve/reject flow via `/api/entities/[slug]/gate` (⚠ contradicted: detail.js:685 was mis-cited in brainstorm as the "gate-review flow" — actual accept/reject at :619-683 is 089's suggestion territory; true gate flow lives at detail.js:685-1160 -- see Q-3). Consume 117 tokens + shared header once shipped; route via 120's `?repo=owner/name` shape when 120's plan lands.

**ALTERNATIVE**: Greenfield rewrite of `entity-body.tsx` from scratch directly porting `detail.js` semantics without consulting 054's existing scaffold -- D-01 rejected: 054 already shipped the page route, comment-highlight wrapTextRange logic, EntityDetailClient layout, and GateButtons/ChatInput slots; a greenfield rewrite would duplicate shipped infrastructure and risk divergence from 054's contract. Closing gaps incrementally preserves 054's sunk value and keeps the change surface reviewable.

**GUARDRAILS**:
- MUST NOT reimplement inline-edit suggestion application (owned by 089 `spacebridge/src/domain/comment/suggestion-decider.ts`).
- MUST NOT re-own comment thread display layer (coordinate with 111; render-slot ownership must be explicit in parity audit).
- MUST consume 117 design tokens for all added sections — no ad-hoc colors/typography in 119 commits.
- MUST preserve 047's canonical rendering contract: Open Questions blank-line separation, Stage Report indent detail lines; parity audit must cite 047's assumptions where applicable.
- MUST extract `CommentRow` (and any other duplicated type) to a shared types file before adding new components that touch it — drift is already visible.
- Parity audit rows MUST be explicit about owner per row (119 vs 089/094/111/117/120 vs non-goal); no ambiguous "TBD" rows ship.

**RATIONALE**: 054 landed the scaffold; 047 codified legacy rendering edge cases; the actual parity gap is (a) missing section-aware renderers, (b) unverified gate-flow completeness, (c) type drift. An audit-first approach makes the gap measurable and plan-stage actionable, while extension-over-rewrite preserves 054's shipped work and respects sibling ownership boundaries. A greenfield alternative loses 054's value and re-creates coordination pain. Deferring 117/120 dependencies explicitly is correct because those entities are clarify-ready already — 119 reads downstream from them.

## Acceptance Criteria

- Given an entity file with ≥1 `## Stage Report:` block, when rendered in Spacebridge entity detail, then the block displays as a checklist card with done/skip/fail iconography matching legacy detail.js output (how to verify: visual diff screenshot Spacebridge vs legacy detail.html for entity 046 or 047; structural assertion bun test asserting `.stage-report-card` + checklist items present).
- Given an entity body containing `## Assumptions`, `## Options`, `## Open Questions` sections, when rendered in Spacebridge, then each section has a visually distinct container matching legacy output AND Open Questions honor blank-line separation per 047's contract (how to verify: bun test on entity-body.tsx output; parity audit row citation).
- Given a parity audit walkthrough, when `docs/spacebridge-parity-audit.md` exists, then every row labels owner ∈ {119, 089, 094, 111, 117, 120, non-goal} and every row currently labeled 119 has a corresponding commit in 119's execute wave (how to verify: grep audit doc; cross-check with plan tasks).
- Given two component files currently defining `CommentRow` inline, when 119 ships, then exactly one canonical `CommentRow` type lives in a shared types file and both component files import it (how to verify: `grep -l "interface CommentRow" spacebridge/ui/` returns exactly one source file outside tests).
- Given legacy `detail.js:685` gate-review flow, when Spacebridge GateButtons is invoked on a gated entity, then the accept/reject actions produce identical server-side state transitions to legacy (how to verify: e2e test against dashboard WS feed asserting status transitions match for both codepaths; parity audit row for gate flow marked closed).

## Assumptions

A-1: Parity audit document lives at `docs/spacebridge-parity-audit.md` as mandated by entity 060 Scope In.

Confidence: Confident (0.95)

Evidence: docs/build-pipeline/spacebridge-cutover-remove-static-ui.md:56 -- "Audit document listing every legacy dashboard UI feature with per-feature status (present / degraded / missing) in Spacebridge, committed to `docs/spacebridge-parity-audit.md`." [primary]

→ Auto-confirmed via 1f self-verification, 2026-04-16 (SO direct-read of 060 Scope In line :56) [self-verified]

A-2: Section-aware rendering strategy: pre-split entity body on section markers (`## Stage Report:`, `## Assumptions`, `## Options`, `## Option Comparisons`, `## Open Questions`) BEFORE passing remaining markdown to `react-markdown`, then render each split section with a dedicated custom React component. Mirrors 047's canonical pattern.

Confidence: Confident (0.92)

Evidence: tools/dashboard/static/detail.js:62-64 -- `var parts = bodyMarkdown.split(/^## Stage Report: /m); var bodyContent = parts[0].trim()` -- legacy precedent [primary]; tools/dashboard/static/detail.js:86-138 -- `renderStageReports()` canonical checklist card renderer with done/skip/fail iconography and `.item-detail` span [primary]; docs/build-pipeline/_archive/entity-body-rendering-hotfixes.md:108-110 -- 047 A-5 "Stage Report rendering bypasses markdown soft-newline collapsing entirely because renderBody() splits the entity body at `## Stage Report:` before markdown renders the body section" [primary]; spacebridge/ui/components/entity-body.tsx:197-215 -- current Spacebridge implementation passes raw `body` to `ReactMarkdown` with zero pre-split (gap confirmed) [primary].

A-3: Markdown library stays `react-markdown` (no switch to `marked` + `DOMPurify`).

Confidence: Confident (0.90)

Evidence: spacebridge/ui/components/entity-body.tsx:9 -- already imports `ReactMarkdown` [primary]; react-markdown sanitizes by default (no XSS regression); switching would force full DOM rewrite [secondary].

A-4: `CommentRow` (and any other duplicated types) extract to `spacebridge/ui/types/entity.ts`, following Next.js app-internal types convention.

Confidence: Likely (0.75)

Evidence: spacebridge/ui/components/entity-body.tsx:14 + spacebridge/ui/components/entity-detail-client.tsx:12 -- identical inline interface definitions [primary]; no existing `spacebridge/ui/types/` directory yet (greenfield) [tertiary]; 117 shared-header extraction pattern establishes precedent for `spacebridge/ui/` shared reusables [secondary].

A-5: Gate-visibility derivation ports legacy `isEntityAtGate(status, stages)`: fetch workflow definitions from `/api/workflows`, find matching workflow, check `stage.gate === true` for the current entity status. Replaces hardcoded `status === "plan" || status === "uat"`.

Confidence: Likely (0.70)

Evidence: tools/dashboard/static/detail.js:711-717 -- canonical legacy derivation [primary]; spacebridge/ui/components/entity-body.tsx:88 -- `showGateButtons = !autoAdvance && (status === "plan" || status === "uat")` hardcoded list [primary]; rationale: workflows can declare additional gate stages; hardcoded list breaks on workflow evolution [secondary].

A-6: Open Questions section-aware rendering follows 047's canonical contract -- blank-line separation between Q-n fields (Domain / Why it matters / Suggested options / → Answer) so markdown soft-newline collapse does not concatenate them into a single paragraph.

Confidence: Confident (0.95)

Evidence: docs/build-pipeline/_archive/entity-body-rendering-hotfixes.md:61 -- "each Q-n's Domain / Why it matters / Suggested options / Answer lines render as distinct markdown paragraphs" [primary]; skills/build-explore/references/output-format.md (referenced by 047 A-3) [primary].

A-7: All added/modified components consume 117's hybrid Tailwind+custom tokens (no ad-hoc hex or absolute-pixel values), and ThemeToggle is accessed via 117's extracted shared header component, not re-wired.

Confidence: Confident (0.95)

Evidence: docs/build-pipeline/spacebridge-design-system.md:130 -- captain-corrected token strategy [primary]; docs/build-pipeline/spacebridge-design-system.md:213 -- "extract a shared header component used by both war room (page.tsx) and entity detail (entity/[slug]/page.tsx); place ThemeToggle in the shared header" [primary]; 119 depends-on: [117] [primary].

A-8: Page routing consumes 120's `?repo=owner/name` URL shape; entity 119's page.tsx modifications do NOT re-introduce `.limit(1)` session selection.

Confidence: Confident (0.95)

Evidence: docs/build-pipeline/spacebridge-session-list-ui.md:156 -- "→ Selected: URL query param -- but key is `?repo=owner/name`, NOT `?session={sessionId}` (captain, 2026-04-16, interactive -- corrected by Q-2 reframe per entity 100 hierarchy alignment)" [primary]; docs/build-pipeline/spacebridge-session-list-ui.md:65 -- current `.limit(1)` at entity/[slug]/page.tsx:59-66 is the targeted UX failure [primary]; 119 depends-on: [120] [primary].

### 1f Self-Verification Audit (2026-04-16, SO direct-read)

A-2 through A-8 auto-confirmed via direct file read in session; A-1 annotated inline above.

- A-2 [self-verified]: detail.js:62-64,86-138 + 047:108-110 + entity-body.tsx:197-215 all re-read; pre-split pattern + custom component rendering confirmed on legacy side, gap confirmed on Spacebridge side
- A-3 [self-verified]: entity-body.tsx:9 `import ReactMarkdown from "react-markdown"` confirmed
- A-4 [self-verified]: duplicate `interface CommentRow` at entity-body.tsx:14 + entity-detail-client.tsx:12 confirmed; `ls spacebridge/ui/types/` returned "No such file or directory" -- greenfield dir confirmed
- A-5 [self-verified]: detail.js:711-717 `isEntityAtGate(entityStatus, stages)` + entity-body.tsx:88 hardcoded `(status === "plan" || status === "uat")` both re-read; derivation gap confirmed
- A-6 [self-verified]: 047 archive :61 literal text match -- "each Q-n's Domain / Why it matters / Suggested options / Answer lines render as distinct markdown paragraphs"
- A-7 [self-verified]: 117 :130 captain-corrected token strategy + :213 shared header mandate both grep-confirmed
- A-8 [self-verified]: 120 :156 `→ Selected: URL query param ... ?repo=owner/name` grep-confirmed

Verification ratio: 8 / 8 = 1.0. Zero [needs-captain-judgment] items. Per build-clarify Step 2, captain batch skipped -- proceeding directly to O-1 selection.

A-9: Per-section comment placement -- all comments continue to render in the right-side `<CommentPanel>`; pre-split section components expose `id={headingText}` on their heading so `scrollToHighlight` still resolves to the heading anchor inside the new section DOM; `wrapTextRange` runs per-section for text-selection highlights. Section components do NOT embed inline comment threads.

Confidence: Confident (captain, 2026-04-16, interactive)

Evidence: spacebridge/ui/components/entity-detail-client.tsx:94 -- existing right-panel + scrollToHighlight architecture [primary]; spacebridge/ui/components/entity-body.tsx:206 -- `id={headingText}` on h2 heading (must transfer to section components) [primary]; 111 clarify-pending status means cross-section thread UX stays in 111's scope [secondary].

→ Confirmed: captain, 2026-04-16 (interactive, Step 4.5 open exploration)

A-10: Section component testing strategy -- each new section component (`<StageReportSection>`, `<AssumptionsSection>`, `<OptionsSection>`, `<OpenQuestionsSection>`) ships with its own `*.test.tsx` co-located in `spacebridge/ui/components/` using bun test + React Testing Library, rendering with fixture markdown strings and asserting DOM structure. Follows the pattern already proven by `gate-buttons.test.tsx` and `chat-input.test.tsx`.

Confidence: Confident (captain, 2026-04-16, interactive)

Evidence: spacebridge/ui/components/gate-buttons.test.tsx -- existing bun test + RTL precedent [primary]; spacebridge/ui/components/chat-input.test.tsx -- second existing precedent [primary]; spacebridge/ui/package.json bun test runner already configured [secondary].

→ Confirmed: captain, 2026-04-16 (interactive, Step 4.5 open exploration)

## Option Comparisons

### O-1: Gate WebSocket `gate_decision` event parity

Legacy detail.js:1148 listens for WebSocket `gate_decision` events to update the gate status badge in real time when the gate is resolved elsewhere (e.g., another browser tab, FO-triggered). Spacebridge currently has no such listener. How should parity be achieved?

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Port the WebSocket `gate_decision` listener into a new `use-gate-events` hook subscribed in GateButtons | Real-time parity; no polling overhead; matches legacy UX exactly | Requires Spacebridge WS bridge to forward `gate_decision` event type; may overlap with 053's SSE feed | Medium | ✅ Recommended |
| (b) Defer real-time sync; rely on Next.js `router.refresh()` on focus + status-poll | Simpler; no WS surface change | Delayed UX -- captain sees stale Pending state until focus/poll; regresses vs legacy | Low | Viable |
| (c) Emit server-sent events (SSE) from the gate-decision API endpoint; consume via EventSource in GateButtons | Re-uses 053's SSE pattern; avoids widening WS contract | Adds endpoint; duplicates the 053 SSE surface without clear gain over (a) | High | Not recommended |

Return value trace: (a) flows through existing WS bridge registered at spacebridge/ui/app layout; cost is one additional event-type case in the receiver. (b) regresses real-time parity vs legacy. (c) adds a new endpoint surface — audit doc row would need "119 owns new SSE endpoint" annotation which risks boundary blur with 053.

→ Selected: (a) Port WS listener to use-gate-events hook (captain, 2026-04-16, interactive)

### O-2: Status-poll race detection parity

Legacy detail.js:846 polls `/api/entity/detail` every 5 seconds after a local gate decision to detect race conditions (gate resolved by another actor). Without polling, the UI could stay in Pending state indefinitely if WebSocket delivery drops.

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Next.js `router.refresh()` triggered on window focus + every 5s interval while gate is pending | Idiomatic Next.js; forces RSC re-fetch; no custom polling infrastructure | `router.refresh()` re-fetches the entire RSC tree; heavier than a single endpoint poll | Low | ✅ Recommended |
| (b) Port legacy `setInterval` polling of `/api/entity/detail` as client-side fetch | Matches legacy cost profile; no RSC tree refetch | Requires client-side state mgmt to merge poll results; duplicates RSC responsibility | Medium | Viable |
| (c) WebSocket-only sync (no polling) | Simplest when WS is reliable | No resilience if WS delivery drops; regresses parity guarantee | None | Not recommended |

Return value trace: `router.refresh()` triggers a server roundtrip that returns new RSC payload; Next.js reconciles. Cost comparable to a 1-endpoint poll for a small RSC tree. (c) fails the parity guarantee.

→ Selected: (a) router.refresh() on focus + 5s interval (captain, 2026-04-16, interactive)

### O-3: Body section-aware rendering implementation strategy

How exactly does `entity-body.tsx` pre-split the body and render split sections?

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Eager pre-split using regex on `## {heading}` markers in a single pass; render each split section with a dedicated `<StageReportSection>` / `<QuestionsSection>` / `<AssumptionsSection>` component; remaining body streams to `<ReactMarkdown>` | Mirrors legacy detail.js exactly; deterministic; easy to test per-section in isolation | Regex-based split is fragile if section headings contain nested `## ` subheadings; must match 047's exact grammar | Medium | ✅ Recommended |
| (b) Use `react-markdown` `components` override for `h2` to swap rendering based on heading text | Keeps a single markdown parse pass; leverages existing library | h2 override only has access to heading node, not sibling content; would need a tree-walker to collect section bodies -- complex and fights the library | High | Not recommended |
| (c) Two-pass: parse full markdown AST (via remark), transform nodes with matching heading IDs into custom React components via `rehype` | Most robust against nested heading edge cases | Large dependency surface; team unfamiliar with remark/rehype custom transforms; overkill for 4 known section types | High | Not recommended |

Return value trace: (a) returns a small component tree (header + split sections) consumed directly by the render. (b) requires sibling-walker which `react-markdown`'s components API does not directly provide. (c) requires remark/rehype plugin authoring, a stack the codebase does not currently use.

→ Selected: (a) Eager pre-split + dedicated Section components (captain, 2026-04-16, interactive)

## Open Questions

Q-1: `docs/spacebridge-parity-audit.md` -- input or output?

Domain: Readable/Textual (scope boundary)

Why it matters: Determines plan-stage task shape. If input: an explore-phase task must walk detail.js (71.5K) end-to-end NOW and pre-populate every parity row before plan, so plan tasks can break down per-row. If output: plan drafts an empty scaffold and execute fills rows as each gap closes; audit becomes a remediation tracker rather than a pre-flight gap list.

Suggested options:
- (a) Input-first -- explore (this stage) produces a complete gap inventory before plan runs; plan tasks keyed to specific audit rows
- (b) Output-first -- explore writes an empty scaffold; plan tasks include "walk detail.js + populate audit" as the first task; execute fills rows
- (c) Hybrid -- explore writes audit scaffold + a coarse top-level row list (Stage Report / brainstorming spec / Open Questions / gate derivation / markdown fidelity / interactive handlers); plan tasks decompose each top-level row further

→ Answer: (c) Hybrid -- explore writes scaffold + coarse top-level row list; plan tasks decompose each row further (captain, 2026-04-16, interactive)

Q-2: 089 vs 119 scope boundary for suggestion rendering UI

Domain: User-facing Visual (render slot ownership)

Why it matters: Legacy detail.js:619-683 renders suggestion accept/reject buttons inline in the entity body. 089's clarify-ready design owns the LOGIC (`suggestion-decider.ts`) but the rendering slot in Spacebridge entity body is greenfield -- neither entity currently claims it. If 119 owns the slot, 119 ships a `<SuggestionCard>` component that 089 wires up later. If 089 owns the slot, 119 leaves a hole and 089's execute wave adds the component.

Suggested options:
- (a) 119 owns the slot; 089 plugs in logic (119 ships placeholder `<SuggestionCard>` reading suggestion data from 089's API contract)
- (b) 089 owns slot + logic; 119 leaves a comment marker in entity-body.tsx pointing to 089
- (c) Slot ownership deferred to joint 089+119 planning session; neither ships suggestion UI this cycle

→ Answer: (a) 119 owns the slot; 089 plugs in logic -- 119 ships `<SuggestionCard>` placeholder reading 089's API contract; 089 subsequently wires logic. 119 plan task explicitly cites 089 clarify decisions as API source to mitigate drift. (captain, 2026-04-16, interactive; SO recommendation accepted after captain asked 哪一個比較好)

Q-3: Gate flow citation correction -- is `detail.js:685` reference in brainstorm materially wrong or just imprecise?

Domain: Readable/Textual (brainstorm annotation)

Why it matters: Brainstorm APPROACH cited `detail.js:685` as "the gate-review flow" — explore confirmed :688 is the actual init of `initGateReview` IIFE (spanning :685-1160) and that :619-683 is suggestion accept/reject (089 territory). The annotation is imprecise, not materially misleading, but the ⚠ contradiction marker added to APPROACH flags it for captain review. Is the marker appropriate, or should the APPROACH be silently corrected in clarify?

Suggested options:
- (a) Keep the ⚠ marker; clarify converts it into an explicit note in the parity audit that detail.js line-ranges per-handler matter
- (b) Clarify silently rewrites the APPROACH line to cite :685-1160 range; remove the ⚠ marker
- Open-ended -- captain decides

→ Answer: (a) Keep the ⚠ marker; parity audit doc includes an explicit row noting "legacy detail.js line-ranges per-handler matter -- Stage Report split at :62-64, renderStageReports at :86-138, suggestion accept/reject at :619-683 is 089 territory, initGateReview IIFE at :685-1160" so plan + execute inherit the correction. (captain, 2026-04-16, interactive)

Q-4: Scale revision -- keep Medium or revise?

Domain: Organizational (plan-stage task budget)

Why it matters: Files likely touched: `entity-body.tsx`, `entity-detail-client.tsx`, new `types/entity.ts`, new section-renderer components (~4 files: StageReport / Assumptions / Options / OpenQuestions), possibly `gate-buttons.tsx`, `use-gate-events` hook, `docs/spacebridge-parity-audit.md`, possibly `page.tsx` for gate-visibility prop flow. Count: 8-11 files in view layer + 1 doc. Currently frontmatter says Medium (5-15). Upper edge of Medium; could justify Large if WS bridge extension (O-1 option a) lands in 119.

Suggested options:
- (a) Keep Medium -- current scope fits 5-15
- (b) Revise to Large if O-1 option (a) selected (WS bridge extension pushes over 15 files when counting the bridge)
- (c) Defer to plan-stage task breakdown -- let actual file count drive scale

→ Answer: (a) Keep Medium -- current scope fits 5-15 upper edge. Plan-stage may revisit if WS bridge extension actually crosses 15 files. (captain, 2026-04-16, interactive)

## Canonical References

*(No captain-cited external docs during clarify -- all references resolved to sibling entity files already tracked in `## Lens Evidence` and frontmatter `depends-on`.)*

## Stage Report: brainstorm

- [x] Lens (a) captain-stated-intent dispatched (Mode A) -- 6 claims, all [primary]/[secondary]
- [x] Lens (b) captain-unstated-intent dispatched (Mode A) -- 5 inferred claims with entity citations
- [x] Lens (c) codebase-current-state dispatched (Mode A) -- 7 factual observations w/ file:line
- [x] Lens (d) sibling-entity dispatched (Mode A) -- 6 overlap findings across 054/047/117/089/120/111
- [x] Triple-verification merge gate: 4 APPROACH deliverables pass gates i/ii/iii
- [x] 5-item self-test: claim cardinality ✓ / lens-floor ✓ / core tensions 3 ✓ / honest boundaries 3 ✓ / tier tags ✓
- [x] Goal Check emitted (120 words, restatement not α-marked)
- [x] Scope flag: ⚠️ likely-decomposable (6 scope areas × 3 domains); decomposition decision deferred to explore/clarify
- [x] Step 3.5 research dispatch: SKIPPED (all technology claims codebase-validated; no external tech needing validation)
- [x] Alignment gate: continue (0 retries) -- APPROACH serves Goal Check expected outcome, no drift detected
- [x] α marker count: 2 (well under warning threshold of 3)
- alignment_confidence: 1.0

## Stage Report: explore

- [x] Files mapped: 8 across view + contract + doc layers
  view: 5 (spacebridge/ui/app/entity/[slug]/page.tsx, spacebridge/ui/components/entity-body.tsx, spacebridge/ui/components/entity-detail-client.tsx, spacebridge/ui/components/gate-buttons.tsx, tools/dashboard/static/detail.js -- legacy reference); contract: 0 (types inlined, will add types/entity.ts); doc: 3 (060 shape, 047 canonical rendering contract, 117/120 decisions)
- [x] Assumptions formed: 8 (Confident: 6, Likely: 2, Unclear: 0)
  A-1 parity audit path + A-2 pre-split render + A-3 react-markdown retained + A-6 Open Questions blank-line + A-7 117 tokens + A-8 120 routing all Confident; A-4 shared types location Likely (greenfield dir); A-5 gate derivation port Likely (legacy correctness reference)
- [x] Options surfaced: 3
  O-1 WebSocket gate_decision event parity; O-2 status-poll race detection; O-3 body section-aware rendering implementation strategy. All three have ✅ Recommended designation with return-value trace + design-doc-invariant cross-check.
- [x] Questions generated: 4
  Q-1 audit doc input-vs-output; Q-2 089 vs 119 suggestion-UI slot ownership; Q-3 brainstorm gate citation correction scope; Q-4 Medium-vs-Large scale revision
- [x] α markers resolved: 2 / 2
  α-1 and α-2 (duplicate) "089 vs 119 body-text edit boundary" resolved: no "other edit" path exists in either codebase — 089 owns suggestion accept/reject, no freeform body-text-edit mode present in Spacebridge or legacy; boundary question dissolves.
- [x] Scale assessment: keep Medium (initial Medium stands)
  8-11 files expected across view layer + 1 doc; upper-edge of Medium (5-15). Q-4 offers Large revision only if O-1 option (a) selected (WS bridge extension). Decomposition flag present but decomposition NOT recommended: all deliverables modify the same 2-3 component files + share one audit doc; no independent sub-scope with sensible dependency ordering.
- [x] Research dispatched: 0 researchers (skipped -- all technology claims codebase-validated via brainstorm Lens (c) + explore reads; no external tech needing validation)
- ⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation
  Mode B selected (not ensign-mode -- SO-direct with >50% file surface already read in brainstorm Lens (c)+(d)); angles (i)+(ii)+(iii) covered inline via brainstorm lens data + direct reads of 060/117/120/047/GateButtons.tsx/entity-body.tsx full/detail.js:685-855. Angle (iv) negative-space seed-driven verification not run; parity-audit walk during plan stage will serve as negative-space discovery for 119 specifically.

## Stage Report: clarify

- [x] Decomposition: not-applicable -- entity has no `## Decomposition Recommendation`; explore noted decomposition NOT recommended despite scope flag (shared files + no sub-scope ordering)
- [x] Re-validation: 8 assumptions checked via 1f self-verification, 0 stale, 0 contradicted, 0 options deduped, 0 coverage gaps, 0 research re-validated
  1f Self-verification: 8 [self-verified], 0 [self-verified, refined], 0 [self-verified, corrected], 0 [needs-captain-judgment]
  verification_ratio: 8 / 8 = 1.0
- [x] Self-filter: 0 self-resolved, 4 captain-escalated
  clarify_self_filter_ratio: 0 / 4 = 0.0 (no [primary]-tier citation directly pinned any of Q-1..Q-4; conservative threshold enforced)
- [x] Assumptions confirmed: 10 / 10 (0 corrected)
  A-1..A-8 auto-confirmed via 1f self-verification (direct file re-read); A-9 per-section comment placement + A-10 section-component testing strategy confirmed via Step 4.5 open exploration
- [x] Options selected: 3 / 3
  O-1 (a) Port WS gate_decision listener to use-gate-events hook; O-2 (a) router.refresh() on focus + 5s interval; O-3 (a) Eager pre-split + dedicated Section components
- [x] Questions answered: 4 / 4 (0 deferred)
  Q-1 (c) Hybrid audit scaffold + coarse top-level row list; Q-2 (a) 119 owns suggestion slot + 089 plugs in logic; Q-3 (a) Keep ⚠ marker + parity audit row for line-range clarity; Q-4 (a) Keep Medium scale
- [x] Open exploration: 2 gray areas surfaced (0 from templates, 1 from CONTRACTS cross-entity, 1 from directive-implied via testing concern, 0 via freeform)
  A-9 per-section comment placement (054/111 cross-entity concern) + A-10 section-component testing strategy (Spacebridge test infra precedent)
- [x] Canonical refs added: 0 (captain did not cite external docs; all references resolved to sibling entity files already tracked in Lens Evidence + frontmatter depends-on)
- [x] Context status: ready
  gate passed: 10/10 assumptions confirmed, 3/3 options selected, 4/4 questions answered, 5 acceptance criteria with zero α markers, Canonical References section exists (empty is acceptable)
- [x] Handoff mode: loose
  no `auto_advance: true` in frontmatter; captain must say "execute 119" for FO to pick up and transition status: clarify → plan
- [x] Clarify duration: 8 AskUserQuestion calls (0 batch -- all assumptions self-verified + 3 options + 4 questions + 2 open-exploration iterations -- actually 3 OQs + Q-2 re-ask + 2 Step 4.5 rounds = 8 interactions total), session complete
