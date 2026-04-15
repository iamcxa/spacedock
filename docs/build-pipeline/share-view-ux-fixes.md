---
id: 097
title: "Share view UX fixes — duplicate form, comment content display, activity truncation"
status: execute
context_status: ready
source: entity 058 UAT live test (2026-04-14 captain manual)
created: 2026-04-14T17:00:00+08:00
started: 2026-04-15T18:05:00+08:00
completed:
verdict:
score: 0.98
worktree: .worktrees/spacedock-ensign-share-view-ux-fixes
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
auto_advance:
uat_pending_count:
parent:
children: [111]
depends-on: [058]
---

## Directive

> Fix 3 UX bugs discovered during entity 058 live UAT testing. The share view page (`spacebridge/ui/app/share/[token]/page.tsx`) has rendering issues that don't affect core functionality (comments are correctly stored and appear in activity feed) but degrade the user experience for external collaborators.

## Bugs

### B-1 (MEDIUM): Duplicate comment forms

The share view renders BOTH `ShareCommentForm` (simple nickname + comment for guests) AND `AddCommentForm` (section dropdown + comment for authenticated users). Only `ShareCommentForm` should appear on the share view.

**Root cause**: The share page renders `EntityBody` component which likely includes `AddCommentForm` internally. The share page also adds its own `ShareCommentForm`.

**Fix**: Either pass a `readOnly` prop to `EntityBody` to suppress `AddCommentForm`, or conditionally render based on share context.

### B-2 (HIGH): Comment content not visible

Comments submitted via the share view appear in DOCUMENT COMMENTS section with author + timestamp, but the comment content text is missing. The Live Updates feed shows the `comment_added` event correctly.

**Root cause**: Likely a rendering issue in the comment display component — the `content` field may not be passed or rendered for guest comments.

### B-3 (LOW): Activity message truncation

Live Updates shows truncated messages like "Guest comment from teeest on comment-...". The entity slug or section heading is cut off.

**Root cause**: CSS overflow or message template truncation in `ShareLiveFeed` component.

## Additional fixes from live test

These were already applied directly to main during the UAT session:
- ✅ `SPACEBRIDGE_PORT` env var (default 6535) — replaces hardcoded 8420 (review F-4)
- ✅ `SPACEBRIDGE_PROJECT_ROOT` env fallback — resolves entity when sessions table empty

## References

- Entity 058 UAT live test results (in archive)
- `spacebridge/ui/app/share/[token]/page.tsx` — share view page
- `spacebridge/ui/components/share-comment-form.tsx` — guest comment form (058)
- `spacebridge/ui/components/share-live-feed.tsx` — activity feed (058)
- Entity 054 `AddCommentForm` — the component that shouldn't appear on share view
- **Entity 093** (shipped 2026-04-14, commit d3d4b4e) — two-column comment UX refactor; task-5 already cleaned up share page (removed CommentPanel/AddCommentForm from share path)

## Brainstorming Spec Annotations

Directive's 3 bugs cross-referenced against current code (post-093 ship):

- B-1 (MEDIUM) duplicate comment forms (⚠ contradicted: d3d4b4e already removed CommentPanel rendering from share/page.tsx; AddCommentForm only lives inside CommentPanel at comment-panel.tsx:138, which is never imported by share/page.tsx -- see Q-1) [primary]
- B-1 root cause "EntityBody likely includes AddCommentForm internally" (⚠ contradicted: entity-body.tsx is markdown+highlights only; no AddCommentForm import or render -- see Q-1) [primary]
- B-2 (HIGH) comment content not visible in DOCUMENT COMMENTS (⚠ contradicted: share page no longer renders any DOCUMENT COMMENTS section at all post-093; CommentPanel is desktop-detail-only -- see Q-2) [primary]
- B-2 root cause "rendering issue in comment display component" (⚠ contradicted: no comment display component in share path post-093 -- see Q-2) [primary]
- B-3 (LOW) activity message truncation (✓ confirmed by explore: share-live-feed.tsx:81 `<div className="text-muted-foreground truncate">{entry.detail}</div>` -- CSS `truncate` class clips detail text to one line) [primary]

## Assumptions

### A-1: B-3 root cause is CSS `truncate` class on the detail div in ShareLiveFeed
- **Confidence**: Confident (0.95)
- **Evidence**: spacebridge/ui/components/share-live-feed.tsx:81 renders `{entry.detail && (<div className="text-muted-foreground truncate">{entry.detail}</div>)}` -- `truncate` applies `text-overflow: ellipsis; white-space: nowrap; overflow: hidden` per Tailwind [primary]
- **Additional evidence**: entry.detail field is already populated with full text upstream (SSE serialization is not the truncation source); UAT observation "Guest comment from teeest on comment-..." matches one-line CSS truncation cutoff rather than string-truncation pattern [secondary]

### A-2: Entity 093 task-5 refactor removed CommentPanel/AddCommentForm rendering from share page
- **Confidence**: Confident (0.95)
- **Evidence**: git commit d3d4b4e (2026-04-14) "task-5 — optional onCommentAdded prop + share page cleanup" explicitly removed commentsBySection/repliesByParent props; current page.tsx:136-167 renders EntityHeader + EntityBody + ShareLiveFeed + ShareCommentForm only [primary]
- **Additional evidence**: Grep for `AddCommentForm|add-comment-form` in spacebridge/ui returns only 2 source files (comment-panel.tsx:10 import + add-comment-form.tsx definition); comment-panel.tsx is NOT imported by share path [secondary]

### A-3: Current share view shows NO comment threads at all (only live event feed + submit form)
- **Confidence**: Confident (0.90)
- **Evidence**: share/page.tsx:136-167 render tree: EntityHeader, EntityBody (markdown + highlights only), ShareLiveFeed (events), ShareCommentForm (submit only). No component renders CommentThread for guests to read existing comments [primary]
- **Additional evidence**: entity-body.tsx:176-208 only renders `<article>` + TextSelectionPopover; allComments prop is consumed only for yellow-highlight injection, not thread display [secondary]

## Option Comparisons

### O-1: Treatment of B-1 (duplicate forms) given 093 task-5 already addressed it

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Close B-1 as "already fixed by 093", drop from scope** | Honest scope reset; saves implementation effort; accurate audit trail | Captain may have observed B-1 on a server running pre-093 build -- need to confirm current deploy is post-d3d4b4e | Low | ✅ Recommended |
| **(b) Keep B-1 as verification task** -- write a guard test that asserts AddCommentForm is not rendered on /share/ route | Defensive against future regressions; converts bug into test | Test-only work for an already-fixed bug; small ROI for Small entity | Low | Viable |
| **(c) Re-verify B-1 manually on current deploy, THEN decide** | Minimizes assumption risk; captures exact current UI state | Requires live UAT round before planning; delays 097 | Low | Viable |

**Recommendation validation**: Option (a) aligns with captain's "fix the real bug" preference (MEMORY captain-preferences). Return trace: scope-out B-1 → 097 scope shrinks to B-2 + B-3 → Small stays Small. Design invariant check: no conflict with spacebridge design doc. (✅ validated — but captain should confirm via Q-1 whether UAT was against pre-093 build)

### O-2: Treatment of B-2 (comment content missing in DOCUMENT COMMENTS)

| Option | Pros | Cons | Complexity | Recommendation |
|---|---|---|---|---|
| **(a) Reframe as UX regression: share view should show existing comments** -- restore a read-only CommentPanel on share path (guests see existing threads but can only submit via ShareCommentForm) | Restores parity with entity detail view; guests can follow conversation; matches UAT mental model | Non-trivial scope bump: share page needs new read-only CommentPanel variant (or readOnly prop on CommentPanel); crosses Small→Medium threshold | Medium | ✅ Recommended |
| **(b) Accept current state as intended** -- share view is submit-only + live feed; guests don't see historical comments, only real-time events | Simplest; keeps 097 Small; aligns with 093 refactor direction | Loses conversational context for guests; Live Updates feed is event-log shape, not threaded comments; UX regression from UAT expectation | Low | Viable |
| **(c) Hybrid: show only top-level comments in flat list (no threads, no forms)** | Balances simplicity with conversation visibility | Third UI pattern to maintain (entity detail threaded, share flat, internal mixed); inconsistent | Medium | Not recommended |

**Recommendation validation**: Option (a) matches UAT-expected behavior captured in Directive "Comments submitted ... appear in DOCUMENT COMMENTS section". Return trace: reframe requires new `CommentPanel readOnly` prop OR new `ShareCommentPanel` component; both flow into 2-level child impact (comment-panel.tsx + share/page.tsx). Design invariant check: consistent with "read-only entity detail for external collaborators" ABOUTME at page.tsx:1. (✅ validated) BUT -- scale escalates Small→Medium if captain picks (a); O-1/O-2 interact with decomposition Q-3.

## Open Questions

### Q-1: Was the 058 UAT observation against a build running d3d4b4e (post-093) or pre-093?
- **Domain**: scope validation / bug currency
- **Status**: **RESOLVED by SO self-investigation** — pre-093 build confirmed via git timestamp forensics
- **Evidence**: UAT commit 0a010c9 @ 2026-04-14 17:01:34 (base 952aef9 @ 16:25:30). 093 task-1 through task-5 all shipped 17:45–17:56 on the same day — after UAT. UAT captured pre-refactor state where share page rendered CommentPanel (containing AddCommentForm), explaining B-1 and B-2. 093 task-5 (d3d4b4e) subsequently removed CommentPanel from share path, invalidating both root-cause claims.
- **Implication**: B-1 is moot against current code (close-as-fixed, O-1 option (a)). B-2 reframes from "content-not-rendered bug" to "section-intentionally-removed UX decision" — Q-2 handles. [primary]

### Q-2: Should B-2 be reframed as UX regression (O-2 option (a)) or accepted as 093's intended final state (O-2 option (b))?
- **Domain**: share view UX philosophy / scope boundary
- **Why it matters**: 093 task-5 removed comment thread rendering from share view without an explicit "share view should be submit-only" decision captured in 093's decisions. Could be intentional (simpler UX for external collaborators) or incidental (refactor collateral). The answer determines whether 097 restores threaded display (medium scope) or accepts current minimal UX (small scope).
- **Suggested options**:
  1. **Reframe as regression, restore read-only threads (O-2a)** — matches UAT expectation; 097 scale becomes Medium
  2. **Accept current state, Q-3 decides decomposition (O-2b)** — keeps 097 Small; B-2 drops from scope
  3. **Defer B-2 to a new entity** — 097 ships B-3 only; spawn "share-view-comment-thread-display" as separate Small entity
- **Evidence for options**: [primary]

### Q-3: If O-1 picks (a) + O-2 picks (a), does 097 scale escalate to Medium or decompose?
- **Domain**: scope management / decomposition gate
- **Status**: **RESOLVED by SO self-investigation** — decompose recommendation (option 2)
- **Rationale**: 097's original `intent: bugfix` + `scale: Small` targets mechanical fixes, not UX-design refactors. If Q-2 lands on regression (O-2a), the CommentPanel-readOnly work is a design decision spanning new prop plumbing + share-specific render path — crosses Small→Medium via complexity not file count. Cleanest split: 097 ships B-3 (true Small CSS fix) immediately; spawn child entity 111 `share-view-comment-thread-display` for the UX work if Q-2 selects O-2a. Honors 097's original framing and separates the mechanical fix from the design call. If Q-2 selects O-2b (accept current state), 097 stays Small and B-2 drops entirely — no decomposition needed.
- **Conditional Decomposition**: child 111 only spawns IF Q-2 resolves to O-2a. [primary]

## Core Tensions

- **time-based**: **097 Directive written pre-093-ship vs current code post-093** — 097 was created 2026-04-14T17:00 based on 058 UAT observations. Entity 093 task-5 shipped later the same day (d3d4b4e), fundamentally refactoring the share page. 097's root-cause claims are stale relative to current code. Requires captain Q-1 to confirm which build state the UAT captured.
- **domain-based**: **"Read-only share view" has 2 plausible UX models** — (a) guests see everything entity detail shows but can't mutate (preserves conversational context), vs (b) guests see only live events + can submit comments (minimal surface, maximum privacy). 093 task-5 chose (b) without explicit decision; UAT expectation was (a). Captain needs to pick the UX model explicitly, not incidentally.
- **essential**: **Bug report vs root-cause fix vs UX redesign boundary** — Directive framed 097 as bugfix, but the actual work (per current code) is UX design decision + redesign, not just fixing rendering bugs. Captain needs to confirm the entity is still a bugfix or reclassify as a feature/UX entity.

## Honest Boundaries

- **Explore did not run a live UI test** on the current deploy; all findings come from static code reading + git history. The empirical UAT behavior on a current build is unverified -- Q-1 may need captain to re-run UAT manually.
- **Explore did not check the LiveFeed event rendering for the DOCUMENT COMMENTS symptom** -- if the UAT observation was actually about an event-feed rendering bug (not a CommentPanel bug), the explore missed that angle. Q-1 option (3) covers this.
- **Post-093 deploy state (which server is running which SHA)** is outside codebase scope; captain operational knowledge required to answer Q-1.
- **093's implicit UX decision** (share view is submit-only + live feed, no threaded comment display) is NOT documented in 093's body as an intentional design choice; the decision shape is inferred from code behavior only.
- **Mode B inline single-pass**: this explore ran Mode B (Small entity, 4 well-known target files); Angle (iv) seed verification was skipped. ⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation

## Stage Report: explore

- [x] Files mapped: 5 across frontend layer (share page.tsx + 4 components)
  frontend: share/[token]/page.tsx, entity-body.tsx, share-live-feed.tsx, comment-panel.tsx (reference), entity-detail-client.tsx (reference)
- [x] Assumptions formed: 3 (Confident: 3, Likely: 0, Unclear: 0)
  A-1 B-3 CSS truncate root cause; A-2 093 task-5 refactor removed CommentPanel from share path; A-3 current share view has no comment thread display
- [x] Options surfaced: 2
  O-1 B-1 treatment (close-as-fixed vs verify vs re-check); O-2 B-2 treatment (UX regression reframe vs accept vs defer)
- [x] Questions generated: 3
  Q-1 which build state did 058 UAT capture; Q-2 B-2 reframe vs accept as intended; Q-3 scope escalation or decomposition decision
- [x] α markers resolved: 0 / 0 (no brainstorm spec block; bugfix-intent entities carry Directive bugs list instead)
- [x] Scale assessment: Small confirmed for current scope; MAY escalate to Medium pending Q-2/Q-3 captain decisions
- [x] Research dispatched: 0 researchers (skipped -- all assumptions Confident, no external tech claims, purely codebase grep verification)
  ⚠ ensign-mode inline fallback -- 4-angle quality not achieved this invocation (Mode B per Small-entity heuristic)

## Decomposition Recommendation

⚠️ **Decomposition triggered by Q-2 captain decision (regression reframe)**:

- **097 (this entity)** stays `scale: Small`, scope reduced to **B-3 only** (ShareLiveFeed activity truncation CSS fix at share-live-feed.tsx:81). Domain: frontend-css.
- **111 share-view-comment-thread-display** (child, spawn at handoff) — `scale: Medium`, `intent: feature`, scope = restore read-only comment threads on share view (readOnly prop on CommentPanel or new ShareCommentPanel variant; render on share path). Domain: frontend-react + spacebridge-share-ux. Depends-on: 097 (to share the post-B-3 baseline).

Rationale: 097's original `intent: bugfix` + `scale: Small` framing is preserved by scoping to mechanical CSS. UX refactor (restoring threaded display) is design-decision work that warrants its own entity with proper brainstorm + clarify flow — not tacked onto a "3 small bug fixes" entity.

## Clarify Annotations

**Open Questions — resolved 2026-04-15:**

- Q-1 → **Resolved by SO self-investigation** (git timestamp forensics): UAT commit 0a010c9 @ 17:01:34, 093 task-1–5 shipped 17:45–17:56 same day. UAT captured pre-093 state. B-1 and B-2 root-cause claims accurate at UAT time but invalidated by 093 task-5's refactor. No captain interaction needed.
- Q-2 → **Answer (captain)**: **Regression — restore read-only comment threads** (option 1). 093 task-5's submit-only UX is not the intended final state; guests should see existing threaded comments on the share view. Spawn child entity 111 to carry the UX restore work.
- Q-3 → **Resolved by SO self-investigation** (conditional on Q-2): Q-2 selected regression → decomposition path. 097 ships B-3 only (Small, mechanical CSS); child 111 (Medium, UX refactor) depends-on 097.

**Option Comparisons — selected:**

- O-1 → **Selected (auto via Q-1 resolution)**: **Close B-1 as "already fixed by 093"** (option (a)). 097 scope drops B-1 entirely.
- O-2 → **Selected (via Q-2)**: **Reframe as UX regression** (option (a)). Work moves to child 111; 097 does not carry B-2 directly.

**Assumption Confirmations:**

- A-1 (B-3 CSS `truncate` root cause) — ✓ confirmed, stays as only 097 fix target.
- A-2 (093 task-5 refactor removed CommentPanel from share path) — ✓ confirmed, is the load-bearing premise for Q-2's regression framing.
- A-3 (current share view has no comment thread display) — ✓ confirmed, is the regression 111 will reverse.

**097 Revised Scope (single task):**

- B-3 fix: change `spacebridge/ui/components/share-live-feed.tsx:81` to remove the `truncate` Tailwind class OR replace with multi-line wrap (e.g., `line-clamp-2` or drop class entirely). Captain may express preference at plan stage — likely `line-clamp-2` to balance readability with compact feed.

**Child 111 Seed (to be spawned at handoff):**

- Directive seed: "Restore read-only comment thread display on share view (spacebridge/ui/app/share/[token]/page.tsx). Post-093 refactor removed CommentPanel from share path, eliminating guests' ability to see existing threaded comments. Add readOnly mode to CommentPanel OR create ShareCommentPanel variant; render on share path alongside existing ShareCommentForm + ShareLiveFeed. Depends-on 097."
- Scope: Medium (multi-file: comment-panel.tsx refactor + share/page.tsx integration + possible new component).
- Intent: feature (UX restoration is design work, not bugfix — proper brainstorm flow required to pick readOnly-prop vs new-component approach).

## Stage Report: clarify

- [x] Open Questions resolved: 3 / 3
  Q-1 SO self-resolved (git forensics); Q-2 captain-answered (regression reframe); Q-3 SO self-resolved (decomposition path)
- [x] Options selected: 2 / 2
  O-1 close B-1 as 093-fixed (auto via Q-1); O-2 regression reframe (via Q-2)
- [x] Assumptions confirmed: 3 / 3
  A-1, A-2, A-3 all confirmed; no revisions needed
- [x] Decomposition: warranted (Q-2 → option 1 path)
  097 scale-down to Small (B-3 only); spawn child 111 (Medium, share-view-comment-thread-display)
- [x] Child seeds queued: 1
  111 share-view-comment-thread-display — directive + scope + intent pre-drafted above; FO spawns via /build at handoff
- [x] Sufficiency gate: PASS
  097 scope is single-task CSS fix; no further clarify rounds needed. Plan stage can proceed immediately.
