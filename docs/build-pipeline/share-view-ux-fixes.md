---
id: 097
title: "Share view UX fixes — duplicate form, comment content display, activity truncation"
status: draft
context_status: pending
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
