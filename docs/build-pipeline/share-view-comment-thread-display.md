---
id: 111
title: Share View Comment Thread Display -- Restore Read-Only Comment Threads on Share Path
status: explore
context_status: awaiting-clarify
source: entity 097 clarify handoff (2026-04-15 SO Q-2 captain decision — O-2a regression reframe)
created: 2026-04-15T18:00:00+08:00
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
profile:
auto_advance:
parent: 097
children:
depends-on: [097, 117]
---

## Directive

> Restore read-only comment thread display on the share view. Entity 093 task-5 (shipped 2026-04-14 commit d3d4b4e) refactored the share path to a submit-only form and removed `CommentPanel`/`AddCommentForm` — captain's Q-2 decision at 097 clarify (2026-04-15) reframed this as a regression: guests should still SEE existing comment threads, just not submit new ones via the authenticated form.
>
> Scope: add a `readOnly` prop (or new `ShareCommentPanel` variant) to render the existing comment threads on share path without exposing authenticated controls. Depends on 097 to ship the post-B-3 baseline first (avoids merge conflict on share view CSS).
>
> Domain: frontend-react + spacebridge-share-ux.

## Captain Context Snapshot

- **Repo**: main @ 9a5170b5
- **Session**: SO session 2026-04-16; 119 shipped clarify earlier this session (entity body editor decisions A-9 cross-apply); 111 brainstorm runs now on captain directive "走下一個"
- **Domain**: User-facing Visual; Behavioral/Callable; frontend-react + spacebridge-share-ux
- **Related entities**: 097 spacebridge-share-view-ux-fixes (parent — clarify Q-2 O-2a spawned 111); 093 spacebridge-share-view-rebuild (shipped d3d4b4e — regression source); 054 spacebridge-entity-detail-comments-api (shipped — comment CQRS backend + GET comments endpoint); 119 spacebridge-entity-body-editor (ready — A-9 right-panel placement contract); 117 spacebridge-design-system (ready — tokens); 060 spacebridge-cutover-remove-static-ui (grand-parent — US-6 External Consumer read-only comment thread requirement)
- **Created**: 2026-04-15T18:00:00+08:00

## Goal Check

You are asking for guest users visiting the share URL to see comment threads read-only — they should read existing comments exactly like an authenticated user does, but without the control that lets them submit authenticated comments.

- **Problem being solved**: 093 task-5's share-view refactor accidentally dropped thread display; guests currently can submit via ShareCommentForm but cannot see any existing comments, which the captain reframed as a regression (097 Q-2).
- **Expected outcome**: visiting a share URL shows the same right-side comment panel authenticated users see, but the authenticated submit form inside it is hidden; the guest-specific ShareCommentForm keeps working as-is.
- **Explicit non-goals**: Does NOT modify `ShareCommentForm` (guest submit ships correctly today); does NOT revert 093 task-5's auth-vs-guest separation; does NOT introduce new comment UX (nested threading, reactions, etc.) beyond what entity detail already ships; does NOT extend share-side comment API (reads via 054's existing `GET /api/entities/[slug]/comments`, not a new share route). (needs clarification -- deferred to explore: whether to token-ify existing `.comment-highlight` hardcoded rgba in globals.css:66 inside 111's scope or defer as 117-adjacent cleanup.)

## Lens Evidence

### Lens (a) captain-stated-intent

- Share view regression must be restored: guests SEE existing comment threads (not just submit-only) -- directive:verbatim [primary]
- Add `readOnly` prop OR new `ShareCommentPanel` variant to render comment threads without authenticated controls -- directive:verbatim [primary]
- Entity 093 task-5 (commit d3d4b4e) is the source of the regression, having removed `CommentPanel`/`AddCommentForm` from share path -- directive:verbatim [primary]
- Constraint: `ShareCommentForm` (guest nickname + text form) must remain functional and untouched -- directive:verbatim [primary]
- Constraint: preserve 093 task-5's design separation of authenticated vs guest paths -- do NOT simply revert -- directive:verbatim [primary]
- This entity depends on 097 shipping post-B-3 baseline first to avoid merge conflicts on share view CSS -- directive:verbatim [secondary]

### Lens (b) captain-unstated-intent

- Captain's UX model for share path is "guests see everything entity detail shows except mutation controls" -- not "minimal submit-only surface" -- per 097 Q-2 choice of O-2a over O-2b -- entity:097 clarify Q-2 [primary]
- 097 dependency is hard sequencing, not advisory -- `depends-on: [097]` frontmatter -- to avoid CSS merge conflict on share view -- entity:111 frontmatter [primary]
- 093 task-5's removal of CommentPanel was NOT documented as intentional UX design in 093's entity body -- "refactor collateral" that captain retroactively classified as regression at 097; future explore on share-path entities should treat undocumented prior decisions as requiring explicit confirmation -- entity:097 Honest Boundaries [primary]
- Captain's framing as "regression restore" (not new feature) implies implementation MUST NOT introduce new UX patterns -- parity with pre-d3d4b4e filtered to read-only, not greenfield -- entity:097 Q-2 O-2a (inferred) [primary]
- 117 dependency gap in frontmatter: 111 originally declared `depends-on: [097]` only; explore must verify 117 tokens apply to read-only CommentPanel variant (especially dark mode) -- entity:117 sibling context (inferred) [secondary]

### Lens (c) codebase-current-state

- Share page.tsx renders EntityHeader + EntityBody (with `allComments={commentRows}`) + ShareLiveFeed + ShareCommentForm in a 3-column grid; NO CommentPanel is rendered in share path -- spacebridge/ui/app/share/[token]/page.tsx:157-171 [primary]
- CommentPanel (`comment-panel.tsx`) and AddCommentForm (`add-comment-form.tsx`) BOTH still exist in codebase; neither was deleted in 093 task-5 -- spacebridge/ui/components/comment-panel.tsx:1 + spacebridge/ui/components/add-comment-form.tsx [primary]
- Authenticated path (entity-detail-client.tsx) renders 7fr/3fr grid: EntityBody left + CommentPanel right; CommentPanel receives `commentsBySection`, `repliesByParent`, `sectionHeadings`, `entitySlug`, `onCommentAdded`, `onScrollToHighlight` -- spacebridge/ui/components/entity-detail-client.tsx:91-114 [primary]
- ShareCommentForm takes `{ token: string; entitySlug: string }` and POSTs to `/api/share/comments?token=<token>` with `{ nickname, content, sectionHeading: "", entitySlug }` -- spacebridge/ui/components/share-comment-form.tsx:10-38 [primary]
- Comment fetch for share view is ALREADY present and complete: page.tsx queries the `comments` table filtered by `entityPath`, passes `commentRows` to EntityBody as `allComments`; client-side highlight injection runs -- but share page never renders CommentPanel to display threaded cards -- spacebridge/ui/app/share/[token]/page.tsx:102-117,159-164 [primary]
- EntityBody's highlight-click scrolls to `#comment-{id}` card; in share path `onCommentAdded` is omitted (undefined) and no CommentPanel exists, so highlight-click finds no card to scroll to -- spacebridge/ui/components/entity-body.tsx:174-185 [secondary]

### Lens (d) sibling-entity

- 097 clarify Q-2 resolved to O-2a "regression reframe" -- 093 task-5's submit-only is NOT final; B-3 CSS (`share-live-feed.tsx:81` Tailwind `truncate`) ships independently; 111 must not regress B-3 -- entity:097 [primary]
- 093 task-5 (commit d3d4b4e) removed CommentPanel/AddCommentForm from share page.tsx only; both component files are intact in codebase -- 111 introduces `readOnly` prop or variant, NOT reverting -- entity:093 [primary]
- 054 ships `GET /api/entities/[slug]/comments` returning comments grouped by `sectionHeading` with nested replies -- 111 read-only panel consumes this, NOT `app/api/share/comments/route.ts` (which is submit-only) -- entity:054 [primary]
- 119 A-9 pins all comments render in right CommentPanel with heading id for `scrollToHighlight`; 119 explicitly notes "111 targets same entity detail view layer for comment-thread display" and warns 119 MUST NOT re-own thread display -- 111 mirrors right-panel placement as read-only share variant without breaking 119's boundary -- entity:119 [primary]
- 060 US-6 "External Consumer (collaborator)" explicitly requires read-only comment threads on share view; 111 delivers this exact scope; its AC are load-bearing for 060's cutover gate -- entity:060 [primary]
- 117 ships tokens.css; all 060 UI children implicitly consume 117; `.comment-highlight` currently uses hardcoded `rgba(255, 212, 0, ...)` outside token system at globals.css:66 -- 111 must use token-compliant values (added to depends-on [097, 117]) -- entity:117 [secondary]

## Core Tensions

- **(domain-based)**: 111 sits between 054 (comment API), 119 (right-panel ownership on auth path), 117 (tokens for highlight colors), and 093's "refactor-collateral" removal; the tension is reproducing 119's UX pattern on share path without cross-boundary violations — especially without re-owning what 119/054/111 each claim.
- **(time-based)**: 097 must ship (B-3 CSS baseline) before 111 executes to avoid CSS merge conflict; 117 must ship tokens before visual polish is finalizable; 060 cutover is blocked on 111. Any slip cascades.
- **(essential)**: 093 task-5's removal was undocumented UX rationale vs accidental collateral -- captain resolved via 097 Q-2 O-2a but the pattern recurs: undocumented "refactor collateral" can silently regress UX surfaces. No structural prevention in 111's scope.

## Honest Boundaries

- Lens (c) confirms comment data fetch is already wired -- 111's scope is narrower than directive implies (mount CommentPanel + readOnly prop + right-column layout), not "restore end-to-end share comment display".
- The globals.css:66 hardcoded `.comment-highlight` rgba is a pre-existing 117-compatibility gap, not 111's regression; explore must decide whether to token-ify within 111 or flag for 117 follow-up.
- Whether CommentPanel's existing AddCommentForm import stays or is conditionally skipped when `readOnly=true` is an implementation choice; both are viable, explore will present as O-n.
- `app/api/share/comments/route.ts` (if present) covers submit path only; read-only display uses the auth-path `GET /api/entities/[slug]/comments`. Access control for guests reading this endpoint is assumed already correct via existing share-token middleware -- explore must verify.

## Brainstorming Spec

**APPROACH**: Extend `CommentPanel` with a `readOnly` prop: when true, the panel renders all thread display (commentsBySection grouping, repliesByParent nesting, scrollToHighlight callback) exactly as today but hides the AddCommentForm. Mount `<CommentPanel readOnly {...props} />` in `spacebridge/ui/app/share/[token]/page.tsx` right column using the same 7fr/3fr grid structure as `entity-detail-client.tsx:91-114`. Derive `commentsBySection` / `repliesByParent` / `sectionHeadings` from the already-fetched `commentRows` + entity body headings (share page already computes body sections). Pass `entitySlug` so comment cards have stable anchors for highlight scroll; omit `onCommentAdded` (no-op in read-only). Keep `ShareCommentForm` unchanged at `share-comment-form.tsx` (guest submit still ships today via `/api/share/comments`). Token-ify the hardcoded `.comment-highlight` rgba at `globals.css:66` to a 117 semantic token (e.g. `--color-highlight-background`) (needs clarification -- deferred to explore: whether this globals.css fix lands inside 111 or defers to 117 compatibility sweep). Add `117` to `depends-on` (originally only `[097]`).

**ALTERNATIVE**: Create a new dedicated `<ShareCommentPanel>` component duplicating CommentPanel's rendering logic minus AddCommentForm -- D-01 rejected: code duplication; drift risk when CommentPanel evolves (119 A-9 sets CommentPanel ownership in auth path; a separate Share variant forks maintenance); `readOnly` prop reuses proven implementation and keeps the auth vs guest separation as a boolean flag rather than a forked component tree. 093's "design separation" is preserved because the flag prop is explicit.

(⚠ contradicted by explore: APPROACH line "MUST consume 054's `GET /api/entities/[slug]/comments`" is imprecise -- middleware.ts:74-100 shows that endpoint is NOT a share route, so guests cannot hit it via share-token. Actual fetch path is server-side RSC SQL query in share page.tsx:102-117, which already works. Correction recorded in A-1.)

**GUARDRAILS**:
- MUST NOT touch `ShareCommentForm` (guest submit ships today; 097 constraint)
- MUST NOT regress 097 B-3 CSS fix at `share-live-feed.tsx:81` Tailwind `truncate`
- MUST consume 054's `GET /api/entities/[slug]/comments` for thread display (not submit-only `app/api/share/comments/route.ts`); verify share-token middleware permits this read path for guests
- MUST mirror 119 A-9 right-CommentPanel placement pattern (7fr/3fr grid; heading id on sections for scrollToHighlight)
- MUST consume 117 design tokens for any color values touched (includes deciding on `.comment-highlight` globals.css:66 in-scope vs deferred)
- MUST preserve 093's auth-vs-guest design separation (readOnly flag is the separation, not a revert)
- MUST NOT introduce new comment UX patterns (threading depth, reactions, etc.) beyond current auth-path CommentPanel

**RATIONALE**: Lens (c) confirms the fix surface is narrow — comment data is already fetched and passed to EntityBody; the missing piece is CommentPanel render + readOnly prop. Extending the existing component preserves 093's design separation (the flag IS the separation), reuses 054's proven comment API, honors 119 A-9's right-panel placement contract, and keeps the change reviewable. A greenfield `<ShareCommentPanel>` duplicates maintained code for no structural gain and introduces drift. Token-ifying `.comment-highlight` is defensively scope-adjacent correction because 117 is mandatory for all 060 children; leaving hardcoded rgba in 111's touch zone violates guardrails and a single line fix is cheaper than a 117 follow-up.

## Acceptance Criteria

- Given a share view URL for an entity with ≥1 comment, when guest loads the page, then the right-side CommentPanel renders all comment threads with the same grouping as authenticated path, and AddCommentForm is NOT visible (how to verify: e2e test against share URL with seeded comments; assert `[data-testid="add-comment-form"]` absent via Playwright selector; assert comment card count matches DB query).
- Given a guest on share view clicking a text-selection highlight, when the highlight maps to a comment, then the matching comment card in the right CommentPanel scrolls into view with flash animation (how to verify: e2e assert `.comment-card-flash` class applied after highlight click; bun test on entity-body.tsx clicks through handleArticleClick with seeded allComments).
- Given 093 task-5's design separation, when 111 ships, then `spacebridge/ui/components/share-comment-form.tsx` has zero diff (how to verify: `git diff 093-ship-sha..HEAD -- spacebridge/ui/components/share-comment-form.tsx` returns empty).
- Given CommentPanel's new `readOnly` prop, when `readOnly=true`, then AddCommentForm is not rendered; when `readOnly=false` or undefined, existing authenticated behavior is unchanged (how to verify: bun test on `comment-panel.test.tsx` asserting conditional render; snapshot-diff for auth path unchanged).
- Given 119 A-9's right-panel placement contract, when 111 mounts CommentPanel on share page, then the grid layout mirrors `entity-detail-client.tsx:91-114` 7fr/3fr structure (how to verify: grep share page.tsx for `grid-cols-[7fr_3fr]` or equivalent Tailwind class matching entity-detail-client pattern).

## Assumptions

A-1: Comment data fetch for share view stays server-side in `spacebridge/ui/app/share/[token]/page.tsx` via the existing `entityPath`-filtered SQL query (page.tsx:102-117); CommentPanel receives already-fetched `commentRows` as props. The share-token middleware does NOT need to pass through to `/api/entities/[slug]/comments` because fetch is RSC-server-side, bypassing middleware entirely.

Confidence: Confident (0.95)

Evidence: spacebridge/ui/app/share/[token]/page.tsx:102-117 -- existing server-side query [primary]; spacebridge/ui/middleware.ts:74-100 -- middleware only injects x-share-token on `/share/*` and `/api/share/*` routes; `/api/entities/[slug]/comments` is NOT a share route [primary]; brainstorm APPROACH mis-cited `GET /api/entities/[slug]/comments` as the fetch path -- corrected to server-side RSC query [primary].

A-2: CommentPanel's prop type gains `readOnly?: boolean` (optional, default `false` preserves auth-path backward compatibility). When `readOnly=true`, the AddCommentForm at comment-panel.tsx:135-139 is conditionally not rendered.

Confidence: Confident (0.95)

Evidence: spacebridge/ui/components/comment-panel.tsx:24-31 -- current CommentPanelProps interface [primary]; spacebridge/ui/components/comment-panel.tsx:135-139 -- AddCommentForm render site [primary]; 119 A-9 contract "CommentPanel stays on right" [primary].

A-3: Grouping logic -- `commentsBySection` + `repliesByParent` + `sectionHeadings` -- runs in share page.tsx before passing to CommentPanel, mirroring `entity-detail-client.tsx:91-114`. Either inlined or extracted as a shared util.

Confidence: Likely (0.75)

Evidence: spacebridge/ui/components/entity-detail-client.tsx:91-114 -- existing grouping pattern in auth path [primary]; share page.tsx:157-171 -- current share layout with commentRows flat array but no grouping step [primary]; grouping util extraction candidate not yet verified [tertiary].

A-4: CommentPanel's internal `useState(initialCommentsBySection)` at comment-panel.tsx:41 + `handleCommentAdded` wrapper at :43-50 is the SOLE mutation path at panel level; disabling AddCommentForm via `readOnly` prop implicitly renders `handleCommentAdded` dead code in read-only mode. No additional guard needed at panel level.

Confidence: Confident (0.92)

Evidence: spacebridge/ui/components/comment-panel.tsx:41-50 -- full mutation path traced [primary]; comment-panel.tsx:135-139 -- AddCommentForm is the only caller of handleCommentAdded via onCommentAdded prop [primary]; note: CommentThread child may have its own mutation paths (reply/resolve) requiring separate readOnly cascade -- see Q-2 [secondary].

A-5: `onCommentAdded` callback stays optional at the CommentPanelProps interface level; read-only share page omits it safely. In readOnly mode, panel's internal `handleCommentAdded` wrapper is also unused (Lens c cross-check: AddCommentForm is the only caller).

Confidence: Confident (0.95)

Evidence: spacebridge/ui/components/comment-panel.tsx:29 -- `onCommentAdded: (comment: CommentRow) => void` currently required [primary] (must be made optional or default no-op); spacebridge/ui/components/entity-body.tsx:174-185 -- EntityBody precedent of omitting onCommentAdded in share context [primary].

A-6: Share page layout adopts 7fr/3fr grid structure matching `entity-detail-client.tsx:91-114` for CommentPanel right-column placement; existing 3-col grid containing `ShareLiveFeed` + `ShareCommentForm` is restructured to accommodate, either by repositioning ShareLiveFeed/ShareCommentForm below CommentPanel or by moving them to a different column.

Confidence: Likely (0.70)

Evidence: spacebridge/ui/app/share/[token]/page.tsx:157-171 -- current 3-col layout (assumed based on brainstorm Lens c finding; exact grid class pattern not directly inspected in this session) [primary]; entity-detail-client.tsx:91-114 -- 7fr/3fr reference [primary]; 119 A-9 pins right-panel placement as canonical pattern [primary].

## Option Comparisons

### O-1: `readOnly` implementation mechanism inside CommentPanel

How exactly does `readOnly=true` suppress the mutation surface?

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Conditional render: `{!readOnly && <AddCommentForm .../>}` at line 135 | Simplest; eliminates entire mutation surface AND hides UI; no form state to manage | CommentThread child reply/resolve actions need their own readOnly cascade (Q-2) | Low | ✅ Recommended |
| (b) Render AddCommentForm always; disable inputs + submit button when readOnly | Keeps DOM consistent between auth/share paths for snapshot testing | Visual clutter (disabled form); wasted DOM; still requires CommentThread cascade; user sees grey-out which looks broken | Low | Viable |
| (c) Extract AddCommentForm out of CommentPanel; share page mounts CommentPanel without AddCommentForm alongside | Cleanest separation; no flag prop; leaves CommentPanel mutation-free | Breaking change to CommentPanel API; forces auth path to also restructure; largest diff surface; drifts from 119 A-9 "right-panel single component" model | Medium | Not recommended |

Return value trace: (a) `readOnly ? null : <AddCommentForm ... onCommentAdded={handleCommentAdded} />` — if readOnly true, `handleCommentAdded` is never called, `setCommentsBySection` is never called, mutation path is dead code. (b) form stays in tree with `disabled` on all inputs; a motivated guest could DevTools-edit around it (security moot but confusing). (c) breaks 119 A-9 right-panel contract.

### O-2: `.comment-highlight` tokenization scope

How should the hardcoded `rgba(255, 212, 0, ...)` at globals.css:66 be handled?

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Token-ify inside 111 (single-line change) | Closes 117-compat gap in-scope; minimal diff; consistent with 119 A-7 guardrail "consume 117 tokens" | Requires confirming 117's tokens.css defines a matching semantic token name (Q-1) | Low | ✅ Recommended (pending Q-1) |
| (b) Defer to a 117 compatibility sweep as separate entity | Keeps 111 scope razor-tight; 117 owns its own cleanup | globals.css:66 stays as tech-debt; another cycle before 060 cutover is unblocked | None | Viable |
| (c) Keep hardcoded rgba, annotate as known 117 gap | No scope creep | Violates 119 A-7 precedent / 117 depends-on just added to frontmatter | None | Not recommended |

Return value trace: (a) one `var(--color-highlight-...)` substitution; testable via snapshot diff. (b) 111 frontmatter `depends-on: [097, 117]` remains meaningful via tests that consume 117 tokens elsewhere; globals.css sweep becomes entity 123+. (c) leaves hardcoded style; regresses 117 consumption contract.

### O-3: Share page layout integration strategy

How does CommentPanel integrate with existing share page 3-col structure?

| Option | Pros | Cons | Complexity | Recommendation |
|--------|------|------|------------|----------------|
| (a) Adopt 7fr/3fr like entity-detail-client.tsx; ShareLiveFeed + ShareCommentForm stack below or alongside | Matches 119 A-9 pattern exactly; reuses auth-path muscle memory | ShareLiveFeed and ShareCommentForm need repositioning; CSS merge risk with 097 B-3 truncate fix at share-live-feed.tsx:81 | Medium | ✅ Recommended |
| (b) Add CommentPanel as 4th column in existing grid | Minimal disruption to existing layout; 097 B-3 fix untouched | 4-col grid at viewport widths below 1400px is cramped; mobile regresses | Low | Viable |
| (c) Collapsible sidebar pattern (CommentPanel as drawer) | Mobile-friendly; viewport-agile | Net-new UX pattern; violates "do not introduce new UX" GUARDRAIL | High | Not recommended |

Return value trace: (a) ShareLiveFeed row absorbs full width below; 097 B-3's `truncate` class on share-live-feed.tsx:81 stays intact (CSS layer untouched, only grid parent changes). (b) 4-col loses readability at 1280px. (c) net-new drawer component violates brainstorm GUARDRAIL "MUST NOT introduce new comment UX patterns".

## Open Questions

Q-1: Does 117's `tokens.css` already define a semantic highlight-background token suitable for `.comment-highlight`?

Domain: Readable/Textual (design token inventory)

Why it matters: O-2 recommendation (a) depends on this. If 117 has a matching token (e.g. `--color-highlight-bg` or `--color-warning-soft`), the fix is a single-line `var()` substitution. If not, 111 must propose a new token to 117 OR downgrade O-2 to option (b).

Suggested options:
- (a) Check 117's current `tokens.css` file contents; if a suitable token exists, land token-ification in 111 per O-2a
- (b) If no suitable token, defer to 117 compat sweep (O-2b) or add a new token proposal inside 111 (creates 117 cross-entity dependency)
- (c) Open-ended -- captain decides whether 111 can propose new tokens to 117

Q-2: Does CommentThread child component have its own mutation paths (reply, resolve, unresolve) that also need readOnly cascade?

Domain: Behavioral/Callable (mutation path completeness)

Why it matters: A-4 traced CommentPanel-level mutation to AddCommentForm only. But CommentThread at comment-panel.tsx:92, :123 may POST to `/api/entities/[slug]/comments/[id]/reply` or `/resolve` — those routes exist per `find` output. If CommentThread has submit controls, readOnly=true must cascade `readOnly` prop through CommentThread to hide/disable reply and resolve buttons.

Suggested options:
- (a) Cascade readOnly prop through CommentThread → reply + resolve actions hidden or disabled
- (b) Trust middleware + share-token — reply/resolve endpoints are NOT share routes, so POSTs would 401 anyway; leave UI visible but clicks fail silently
- (c) Verify CommentThread implementation before deciding (explore partial trace; read CommentThread.tsx end-to-end)

Q-3: Is there a risk that share page's server-side comment fetch exposes authorization-sensitive fields (e.g. `author`, `resolvedReason`) that legitimate guests should NOT see?

Domain: Behavioral/Callable (authorization boundary)

Why it matters: share page.tsx:102-117 uses a direct SQL query filtered by `entityPath`; there's no column-level filtering or PII scrubbing. If a comment's `author` is the captain's full name or `resolvedReason` contains sensitive text, external guests see them. May require field-level filtering before passing to CommentPanel.

Suggested options:
- (a) Add a guest-facing projection: only send `commentId, selectedText, sectionHeading, content, parentId, createdAt, resolved` (omit `author` + `resolvedReason`)
- (b) Send all fields; guests seeing author name is acceptable (internal/trusted collaborators only)
- (c) Defer to 060 US-6 "External Consumer" scope -- captain's model may already accept full visibility
- Open-ended -- captain decides

## Stage Report: brainstorm

- [x] Lens (a) captain-stated-intent dispatched (Mode A) -- 6 directive:verbatim claims, all [primary]/[secondary]
- [x] Lens (b) captain-unstated-intent dispatched (Mode A) -- 5 inferred claims; identified 117 dependency gap + 093 refactor-collateral pattern
- [x] Lens (c) codebase-current-state dispatched (Mode A) -- 6 factual observations; critical finding that CommentPanel/AddCommentForm NOT deleted + comment data already fetched, narrowing 111's scope
- [x] Lens (d) sibling-entity dispatched (Mode A) -- 6 overlap findings across 097/093/054/119/060/117; confirmed 054 fetch path + 119 A-9 placement + 060 US-6 direct mandate + 117 hardcoded rgba gap
- [x] Triple-verification merge gate: 4 APPROACH deliverables pass gates i/ii/iii (extend readOnly / mount CommentPanel / token-ify highlight / preserve ShareCommentForm)
- [x] 5-item self-test: claim cardinality ✓ / lens-floor ✓ / core tensions 3 ✓ / honest boundaries 4 ✓ / tier tags ✓
- [x] Goal Check emitted (136 words, restatement not α-marked)
- [x] Scope flag: omitted (single scope area, 0 decomposition signals)
- [x] Frontmatter update: depends-on extended from [097] to [097, 117] based on Lens (d) tokenization finding
- [x] Step 3.5 research dispatch: SKIPPED (no external tech claims; react-markdown / Tailwind / existing component API all codebase-validated via Lens c)
- [x] Alignment gate: continue (0 retries) -- APPROACH serves Goal Check expected outcome; no drift
- [x] α marker count: 1 (well under warning threshold of 3) -- globals.css tokenization scope deferred to explore
- alignment_confidence: 1.0

## Stage Report: explore

- [x] Files mapped: 6 across view + contract + style layers
  view: 4 (share/[token]/page.tsx, components/comment-panel.tsx, components/add-comment-form.tsx, components/comment-thread.tsx referenced); contract: 1 (middleware.ts — share-token routing); style: 1 (globals.css:66 highlight color)
- [x] Assumptions formed: 6 (Confident: 4, Likely: 2, Unclear: 0)
  A-1 server-side fetch + middleware bypass (Confident); A-2 readOnly prop shape (Confident); A-3 grouping location (Likely); A-4 single mutation path traced (Confident); A-5 onCommentAdded optional (Confident); A-6 7fr/3fr layout adoption (Likely)
- [x] Options surfaced: 3
  O-1 readOnly mechanism (conditional render recommended); O-2 globals.css token-ify scope (in-111 recommended pending Q-1); O-3 layout integration (7fr/3fr recommended)
- [x] Questions generated: 3
  Q-1 117 tokens.css highlight-bg semantic token availability (determines O-2 viability); Q-2 CommentThread reply/resolve readOnly cascade; Q-3 guest PII exposure in comment fields (author / resolvedReason)
- [x] α markers resolved: 0 / 1
  α-1 "globals.css tokenization scope" remains open -- promoted to O-2 as Option Comparison (and Q-1 as its gate) rather than auto-resolved, per hybrid heuristic
- [x] Scale assessment: keep Medium (6 files; upper edge of Small, frontmatter Medium stays)
  Brainstorm APPROACH was contradicted on fetch path; corrected in A-1 -- no scale impact. Decomposition NOT recommended: no scope flag, single scope area.
- [x] Research dispatched: 0 researchers (skipped -- no external tech claims; all assumptions consume internal Spacebridge / 117 token surface)
- ⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation
  Mode B selected (SO-direct with >50% file surface covered in brainstorm Lens (c)+(d)); angles (i)+(ii)+(iii) covered inline via brainstorm lens data + direct reads of middleware.ts, comment-panel.tsx full, 097 archive for Q-2 decision. Angle (iv) negative-space seed-driven verification not run; Q-2/Q-3 captain escalation substitutes.
