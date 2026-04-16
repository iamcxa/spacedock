---
id: 111
title: Share View Comment Thread Display -- Restore Read-Only Comment Threads on Share Path
status: brainstorm
context_status: pending
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
