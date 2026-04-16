---
id: 111
title: Share View Comment Thread Display -- Restore Read-Only Comment Threads on Share Path
status: draft
context_status: pending
parent: 060
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
depends-on: [097]
---

## Directive

Restore read-only comment thread display on the share view. Entity 093 task-5 (shipped 2026-04-14 commit d3d4b4e) refactored the share path to a submit-only form and removed `CommentPanel`/`AddCommentForm` — captain's Q-2 decision at 097 clarify (2026-04-15) reframed this as a regression: guests should still SEE existing comment threads, just not submit new ones via the authenticated form.

Scope: add a `readOnly` prop (or new `ShareCommentPanel` variant) to render the existing comment threads on share path without exposing authenticated controls. Depends on 097 to ship the post-B-3 baseline first (avoids merge conflict on share view CSS).

Domain: frontend-react + spacebridge-share-ux.

## Captain Context Snapshot

Parent 097 (share-view-ux-fixes) scope-split at clarify into Small (B-3 CSS fix) + Medium (this entity). Captain chose O-2a "regression reframe — 093 task-5's submit-only share view is NOT intended final state; restore read-only comment threads for guests." Child spawn was queued for "at handoff" — FO spawning now as 097 advances to plan.

Key constraints from 097 clarify body:
- Read-only: guests see comments + thread structure but NOT the submit controls for the authenticated `AddCommentForm`
- Keep `ShareCommentForm` (guest nickname + text form) functional — that ships correctly today
- Preserve 093 task-5's design separation of authenticated vs guest paths (don't just revert)

References: 097 clarify section "Resulting scope split"; 093 task-5 ship commit `d3d4b4e`; `spacebridge/ui/app/share/[token]/page.tsx`; `spacebridge/ui/components/share-comment-form.tsx`; `spacebridge/ui/components/CommentPanel` (or equivalent — verify in explore).
