---
id: 119
title: "Spacebridge Entity Body Editor -- Full Render + Edit Parity with Legacy detail.html"
status: brainstorm
context_status: pending
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

**APPROACH**: Treat 119 as a renderer-fidelity + interaction-gap-closure entity on top of 054's existing scaffold. Deliverable 1: run a mechanical parity audit walk through `tools/dashboard/static/detail.js` (71.5K) classifying every section-render and event-handler into (a) missing in Spacebridge → close here, (b) partially present → enhance here, (c) owned by sibling (089/094/111/117/120) → link + defer, (d) explicit non-goal (legacy-only dead code). Output = `docs/spacebridge-parity-audit.md` consumed by the plan stage. Deliverable 2: add missing section-aware renderers to `spacebridge/ui/components/entity-body.tsx` — Stage Report split + checklist cards, brainstorming spec section boundaries, Open Questions blank-line-respecting format per 047's contract. Deliverable 3: extract shared types (`spacebridge/ui/types/entity.ts` or similar) so `CommentRow` stops drifting between two component files. Deliverable 4: verify GateButtons gate-review flow (WebSocket status derivation + accept/reject) against `detail.js:685`; extend where gaps exist. Consume 117 tokens once shipped; route via 120's owner/repo shape when its clarify-ready plan lands. (needs clarification -- deferred to explore: exact 089 vs 119 boundary for body text edits other than comment-suggestion applies.)

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
