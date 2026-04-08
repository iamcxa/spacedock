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

## Stage Report (explore)

### Key File Inventory

| 檔案 | 角色 |
|---|---|
| `tools/dashboard/static/notifications.js` | 尚不存在 — 需新建的通知模組 |
| `tools/dashboard/static/activity.js` | 主頁 WS 事件接收器，所有 event type 在此 render；通知邏輯需掛在 `ws.onmessage` 的 `event` 分支 |
| `tools/dashboard/static/detail.js` | Entity 詳情頁 WS，訂閱 `/ws/activity`，目前處理 `gate_decision`、`comment`、`channel_response` |
| `tools/dashboard/static/share.js` | Share 頁 WS，訂閱 `/ws/share/:token/activity`，處理 `comment`、`gate_decision`、`channel_response` |
| `tools/dashboard/static/index.html` | 主頁 HTML shell，無設定面板，僅 header + aside#activity-panel |
| `tools/dashboard/static/detail.html` | Entity 詳情頁，sidebar 含多個 `<section>`，可在此插入通知設定區塊 |
| `tools/dashboard/src/events.ts` | `EventBuffer` + `VALID_EVENT_TYPES` 白名單 |
| `tools/dashboard/src/types.ts` | `AgentEventType` union type，需新增 3 個 event type |
| `tools/dashboard/src/server.ts` | `publishEvent()` 廣播至 `activity` topic 和 share scoped topics |

### 當前 WS 事件流

```
server.ts publishEvent()
  → server.publish("activity", payload)      ← Bun process-local
  → server.publish("share:{token}", payload) ← scoped share topics

activity.js  訂閱 /ws/activity
  → ws.onmessage: type=replay / event / channel_status
  → renderEntry() 分派所有 event type

detail.js    訂閱 /ws/activity
  → ws.onmessage: 處理 gate_decision, comment, channel_response

share.js     訂閱 /ws/share/:token/activity
  → ws.onmessage: 處理 comment, gate_decision, channel_response
```

### Event Type 現況稽核

**現有 VALID_EVENT_TYPES（events.ts line 4-8）：**

| Event Type | 當前用途 | 需要通知？ |
|---|---|---|
| `dispatch` | Agent 派遣 | 否（informational） |
| `completion` | Agent 完成 | 否 |
| `gate` | Gate 觸發（pipeline 內部） | — |
| `gate_decision` | Captain 批准/拒絕 gate | 否（captain 自己操作） |
| `feedback` | FO feedback | 否 |
| `merge` | PR merge | 否 |
| `idle` | Agent idle | 否 |
| `channel_message` | Captain 發訊 | 否 |
| `channel_response` | FO 回覆 | **是** — FO 有訊息給 captain |
| `permission_request` | 工具權限申請 | **是** — 需 captain 決策 |
| `permission_response` | 權限決策結果 | 否 |
| `comment` | 評論（FO/guest） | **是** — FO 有評論需 captain 看 |
| `suggestion` | 程式碼建議 | 否 |
| `share_created` | 分享連結建立 | 否 |
| `rollback` | Rollback 操作 | 否 |

**Spec 要求但尚未存在的 event types（需新增）：**

| Event Type | 說明 | 需修改 |
|---|---|---|
| `gate_request` | Gate 等待審批（由 pipeline 送出） | `VALID_EVENT_TYPES`、`AgentEventType` union |
| `pr_ready` | PR 準備好供審閱 | 同上 |
| `pipeline_error` | Entity/stage 失敗 | 同上 |
| `entity_shipped` | Entity 完成 ship | 同上（`completion` 目前部分重疊，但語義不同） |

**注意**：`gate_request` 與現有 `gate` type 語義重疊。需確認 pipeline 端是否已發出 `gate` 事件，或需要新增獨立的 `gate_request`。若 `gate` 已代表「等待審批」，則 spec 的 `gate_request` 可對應 `gate`，無需新增 type。

### Settings UI 基礎設施現況

- **localStorage**：目前**完全沒有**任何 localStorage 使用，需從零建立
- **設定面板**：無任何 settings panel/modal/sidebar，需新建
- **index.html**：結構簡單（header + main + aside），沒有預留設定入口點，需在 header 加入設定按鈕
- **detail.html**：sidebar 有多個 `<section>` 可插入通知設定 section，但設定應放主頁以全局生效

### 快取 Context 驗證

| 快取說明 | 當前狀態 |
|---|---|
| `detail.js detailWs.onmessage` 只處理 `gate_decision` | **已過時**。027/033 修復後，現在同時處理 `gate_decision`、`comment`、`channel_response`（line 821-881） |
| `share.js connectScopedWebSocket()` 處理 `comment` | **仍正確**。share.js line 656 處理 comment；line 667 處理 gate_decision；line 671 處理 channel_response |
| `server.ts publishEvent` 廣播至 activity topic 和 share topics | **仍正確**。line 1184-1206，POST /api/entity/comment 現在 _也_ 呼叫 publishEvent（line 338, 377, 415） |
| POST /api/entity/comment 不呼叫 publishEvent | **已過時**。027/033 修復後，comment CRUD 均呼叫 publishEvent |
| `events.ts` VALID_EVENT_TYPES 包含 comment, channel_response | **仍正確** |

### 風險與未知數

1. **`gate` vs `gate_request`**：spec 要求 `gate_request`，但 pipeline 端目前可能已發出 `gate` type。需確認二者是否相同語意，避免重複定義。
2. **`Notification.requestPermission()` 限制**：必須在 user gesture（按鈕點擊）內呼叫，不能在頁面載入時自動調用。Settings toggle 的實作需特別注意此約束。
3. **cross-instance WS 限制**：MEMORY.md 已記錄 8420/8421 兩個 Bun server 各有獨立 WS subscriber。通知只會在 captain 連接的那個 instance 上觸發。此問題 out of scope，但需在實作中加入文件說明。
4. **share.js 通知範圍**：share 頁面是給 guest reviewer 用的，guest 不需要 captain 的注意力通知。通知邏輯應只在 detail.js 和 activity.js 注入，share.js 跳過。
5. **macOS Safari**：Web Notifications API 在 Safari 只有加入 Web App 後才可用。需文件說明。

### 建議

**Profile**: Standard（無需特殊研究 phase）

**實作路線：**

1. 新建 `static/notifications.js`：封裝 permission 請求、config localStorage read/write、`notify(type, title, body, onClick)` 公開介面
2. `index.html` header 加入設定按鈕 → 展開 settings panel（inline 或 modal）含通知 toggle + per-type checkboxes + test button
3. `activity.js` ws.onmessage 掛入 notify 呼叫（`permission_request`、`channel_response`、`comment`）
4. `detail.js` ws.onmessage 同樣掛入 notify（`gate_decision` 作為備援，`comment`）
5. `types.ts` + `events.ts` 新增 `gate_request`、`pr_ready`、`pipeline_error`、`entity_shipped`（確認 `gate` 語意後決定是否保留 `gate_request`）
6. 通知點擊 → `window.focus()` + 依 event entity 導向

**可跳過 stage**: 無需跳過任何 stage。scale=Small，純前端工作，建議直接 plan → implement → quality → ship。
