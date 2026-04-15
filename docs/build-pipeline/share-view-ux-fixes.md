---
id: 097
title: "Share view UX fixes — duplicate form, comment content display, activity truncation"
status: brainstorm
context_status: awaiting-clarify
source: entity 058 UAT live test (2026-04-14 captain manual)
created: 2026-04-14T17:00:00+08:00
started:
completed:
verdict:
score:
worktree:
issue:
pr:
intent: bugfix
scale: Small
project: spacedock
auto_advance:
uat_pending_count:
parent:
children:
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
- **Why it matters**: If UAT ran against pre-093 build, B-1 (duplicate forms) and B-2 (DOCUMENT COMMENTS rendering gap) were both symptoms of the pre-refactor code that 093 task-5 already cleaned up. The current code has a DIFFERENT shape — no duplicate form (B-1 moot), no DOCUMENT COMMENTS section at all (B-2 isn't "content missing" but "section missing"). 097's scope depends on this answer.
- **Suggested options**:
  1. **Pre-093 build confirmed** — close B-1 and reframe B-2 per O-2; 097 scope becomes "B-2 redesign (O-2) + B-3 truncation fix"
  2. **Post-093 build confirmed with bugs still present** — re-investigate; possible different code path or cache issue; explore missed something
  3. **Unknown / didn't capture build SHA** — run Option (c) of O-1 (manual re-verify on current deploy before planning)
- **Evidence for options**: [primary]

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
- **Why it matters**: 097 is currently `scale: Small`. If B-1 drops (O-1a) and B-2 becomes a CommentPanel-readOnly refactor (O-2a), scope shifts from "3 small CSS/rendering bug fixes" to "1 UX refactor + 1 CSS fix". That crosses the Small→Medium line via complexity, not file count.
- **Suggested options**:
  1. **Escalate to Medium, keep single entity** — bump scale frontmatter; plan accordingly
  2. **Decompose into 097 (B-3 CSS) + 111 (share-view-threads-restore)** — 097 ships fast as true Small; 111 is the Medium UX entity
  3. **Keep Small, pick O-2b instead** — B-2 accepted as intended state; 097 ships B-3 only; known-gap log carries the UX debate
- **Evidence for options**: [primary]

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
