---
id: 041
title: Dashboard Browser Notifications — Captain Attention Alerts
status: explore
source: captain request 2026-04-09 (during 033 ship session)
started:
completed:
verdict:
score: 0.85
worktree:
issue:
pr:
intent: feature
scale: Small
project: spacedock
---

## Dependencies

- 033 (MCP Tool Expansion) — shipped, provides comment events
- 027 (Comment Realtime) — shipped, provides WS event channel

## Problem

Dashboard runs in a browser tab, but captain often has it backgrounded while doing other work. When the FO needs captain's attention (gate approval, PR review, ensign error, pipeline completion), captain has no signal — they have to manually check the dashboard tab. This creates dispatch delays and missed escalations.

## Scope

### 1. Web Notifications API integration

- `Notification.requestPermission()` flow on first dashboard open or when toggle is enabled
- Wrap browser permission state in a tiny module (`static/notifications.js`) so detail.js / share.js / activity.js can call it without duplication
- Handle 3 states: `default` (ask), `granted` (notify), `denied` (no-op + show toggle disabled)

### 2. Notification trigger events

Listen on the existing WebSocket (`/ws/activity`) and trigger notifications for:

| Event Type | Notification | Click Action |
|---|---|---|
| `gate_request` (new) | "Entity {ID}: {stage} gate awaiting approval" | Focus tab + scroll to entity |
| `permission_request` | "Permission requested: {reason}" | Focus tab + show approve/deny |
| `comment` (from FO) | "FO commented on {entity}" | Focus tab + open entity detail |
| `pr_ready` (new) | "PR #{number} ready for review" | Focus tab + open PR section |
| `pipeline_error` (new) | "Entity {ID} {stage} failed" | Focus tab + show error |
| `entity_shipped` | "✅ {entity} shipped" | Focus tab (low priority, optional) |

### 3. Settings toggle UI

- Add a settings panel/sidebar item in the dashboard (or reuse existing settings if any)
- Toggle: "Browser Notifications" (on/off)
- Per-event-type checkboxes (don't notify for ship events, only escalations, etc.)
- Persist to `localStorage` key `dashboard.notifications.config`
- Show current permission state (granted/denied/ask)
- "Test notification" button

### 4. Notification deduplication

- If same event ID notified within 30s, suppress duplicate
- If tab is currently focused and visible, don't notify (use `document.visibilityState`)
- Auto-dismiss after 10s for low-priority events; persistent for gates and permissions

### 5. Cross-instance considerations

Per MEMORY.md WebSocket cross-instance limitation, the 8420 (channel) and 8421 (ctl.sh) instances have separate WS subscribers. Notifications fire only on the writing instance — captain may miss events sent to the other instance.

**Out of scope** for this entity (entity 031 will fix cross-instance sync). For now, document the limitation and ensure share-page (`share.js`) and detail-page (`detail.js`) both wire notifications independently.

## Acceptance Criteria

- Captain enables notifications in settings → sees browser permission prompt → grants → toggle shows enabled
- Captain backgrounds dashboard tab → FO triggers gate request → captain sees browser notification
- Captain clicks notification → tab focuses + scrolls to relevant entity
- Captain disables notifications → no further notifications fire
- Notifications respect per-event-type toggles
- Test notification button works without requiring a real event
- Tab focused → no notification (avoid annoying captain when already looking)

## Notes

- Web Notifications API: `Notification.requestPermission()` returns Promise. Cannot be called from non-user-gesture context (must be wired to button click).
- macOS Safari quirk: notifications work only if dashboard is added as Web App. Document this.
- Linux: depends on notification daemon (libnotify). May silently fail if no daemon.
- Test on Chrome, Firefox, Safari at minimum.

## Spec Reference

Captain request during 033 ship session (2026-04-09):
> "UI 需要串瀏覽器通知，當需要我注意或互動時，應該要跳通知呼叫我，而且可以設定開關"
