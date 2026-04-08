---
id: 041
title: Dashboard Browser Notifications — Captain Attention Alerts
status: pr-draft
source: captain request 2026-04-09 (during 033 ship session)
started: 2026-04-09
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-browser-notifications
issue:
pr: 24
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

## Stage Report (pr-draft)

- Branch pushed: `spacedock-ensign/dashboard-browser-notifications`
- Draft PR created: iamcxa/spacedock#24
- Frontmatter updated: `status: pr-draft`, `pr: 24`, `started: 2026-04-09`, `worktree` filled

---

## Stage Report (quality)

### Test Suite

**notifications.test.ts**: 18/18 pass (bun test tests/dashboard/notifications.test.ts)

**tools/dashboard bun test**: 83 pass, 4 fail — all 4 failures are pre-existing tech debt:
- `error: Cannot find package 'diff'` (snapshots.ts dependency not installed)
- `error: Cannot find module '@modelcontextprotocol/sdk/server/index.js'` (channel.ts dependency not installed)

Zero new failures introduced by 041.

---

### Code Review: notifications.js

| Check | Result |
|---|---|
| `requestPermission` wired to user gesture only (no onload) | PASS — only called inside `enabledToggle.addEventListener("change", ...)` in activity.js. Never called on page load. |
| Dedup window 30s, keyed by (type, entity, body) | PASS — `dedupKey(type, entity, body.slice(0,32))`, `DEDUP_WINDOW_MS = 30000`. |
| Visibility check `document.visibilityState === "visible"` | PASS — `var doc = global.document; if (doc && doc.visibilityState === "visible") return;` |
| Config from `localStorage.dashboard.notifications.config` | PASS — `CONFIG_KEY = "dashboard.notifications.config"`, read via `global.localStorage`. |
| No unbounded Maps — dedup cleanup | PASS — `cleanDedupMap()` called on every `showNotification()`, evicts entries older than 60s. Map stays bounded. |
| `NotifAPI` captured at IIFE init | PASS — `var NotifAPI = global.Notification`. `permission` is a live class property (not snapshotted), so `NotifAPI.permission` reflects runtime state correctly. |

---

### Code Review: Settings UI

| Check | Result |
|---|---|
| Master toggle triggers `requestPermission()` on click | PASS — `enabledToggle.addEventListener("change", ...)` calls `N.requestPermission()` only when `checked === true`. |
| Per-event-type checkboxes persist independently | PASS — each checkbox's `change` event calls `saveFromUI()` which reads all checkboxes and writes full config to localStorage. |
| Test button works without real event | PASS — directly constructs `new Notification("Spacedock Test", ...)`, bypasses dedup/visibility. |
| Permission state indicator | PASS — `updatePermBadge()` reads `N.getPermissionState()`, updates text + CSS class. Called on panel open and after permission request resolves. |
| Toggle disabled when permission denied/unsupported | PASS — `updatePermBadge()` sets `enabledToggle.disabled = true` for denied/unsupported states. |

---

### Code Review: WS Integration

| Check | Result |
|---|---|
| activity.js: calls `maybeNotify` for all captain-attention types | PASS — `maybeNotify(msg.data.event)` called in `msg.type === "event"` branch. `NOTIF_TITLES` covers: gate, permission_request, comment, channel_response, pr_ready, pipeline_error, entity_shipped. |
| detail.js: calls for detail-scoped events | PASS — IIFE after each WS event processes gate, comment, channel_response. |
| Both dedup via shared singleton | PASS — both pages load `/notifications.js` first. `SpacedockNotifications` is a singleton on `window`. `dedupMap` is shared. If captain has both pages open, same key within 30s suppresses duplicate. |
| share.js untouched | PASS — no changes to share.js or share.html. |

---

### Commit Hygiene

All 5 execute commits use `041 execute:` prefix, atomic, each covering exactly one logical change:

```
77753ae 041 execute: wire browser notifications to entity detail page WS
1c0cad3 041 execute: wire browser notifications to activity feed WS
02ff9ba 041 execute: add notification settings panel to dashboard index
bf81948 041 execute: add notifications.js module — permission, dedup, visibility, config
437003b 041 execute: add pr_ready, pipeline_error, entity_shipped event types
```

---

### Issues Found

**Minor**: Test button in activity.js (line 856) uses bare `Notification` and `new Notification(...)` rather than going through `SpacedockNotifications.showNotification`. This is intentional — the test button bypasses dedup/visibility to guarantee a visible notification. However, it also bypasses the `global.Notification` abstraction in notifications.js. In a browser context this is fine (`Notification` is the same as `window.Notification`). Not a bug, acceptable trade-off for a test utility.

**None blocking**.

---

### Manual Test Plan (Browser)

Prerequisites: Start dashboard (`bun run tools/dashboard/src/server.ts` or via `spacedock dashboard`), open `http://localhost:8420` in Chrome/Firefox.

1. **Settings panel open/close**
   - Click the ⚙ button in the header → settings panel expands
   - Click again → panel collapses

2. **Enable notifications (permission=default)**
   - Open panel, check "Browser Notifications" toggle
   - Browser shows native permission prompt → click "Allow"
   - Permission badge shows "Permission: granted", toggle stays checked

3. **Test button**
   - With notifications enabled, click "Test" button
   - System notification appears: "Spacedock Test — Notifications are working."
   - Notification auto-dismisses after 5s

4. **Gate notification (background tab)**
   - Open a second browser window, put dashboard tab in background
   - In terminal: `curl -s -X POST http://localhost:8420/api/events -H 'Content-Type: application/json' -d '{"type":"gate","entity":"041","stage":"quality","agent":"test","timestamp":"2026-04-09T00:00:00Z","detail":"Awaiting captain approval"}'`
   - System notification appears: "Gate awaiting approval — 041"

5. **Click notification → focus + navigate**
   - Click the notification from step 4
   - Browser tab focuses
   - URL navigates to `/detail.html?path=docs%2Fbuild-pipeline%2F041.md`

6. **Disable notifications**
   - Uncheck master toggle
   - Post another gate event (curl as above)
   - No notification appears

7. **Tab visible suppression**
   - Re-enable notifications, keep tab in foreground (visible)
   - Post a gate event → no notification (tab is visible)
   - Switch to another app (tab hidden), post gate event → notification appears

8. **Per-type filter**
   - Enable notifications, uncheck "Gate approval"
   - Post a gate event → no notification
   - Post a comment event → notification appears

9. **Dedup (30s window)**
   - Post the same gate event twice within 30s
   - Only first notification appears; second is suppressed

10. **macOS Safari caveat**
    - Safari requires dashboard to be added as a Web App (File → Add to Dock) for notifications to work
    - Test in Chrome/Firefox for reliable verification

---

## Stage Report (plan)

### Gate Type Resolution

**決策：重用 `gate`，不新增 `gate_request`。**

`references/first-officer-shared-core.md` line 52 明確定義：`gate` event 在「呈現 gate 給 captain 批准時」發出，detail = "Awaiting captain approval"。這與 spec 的 `gate_request` 語意完全一致。`gate` 已存在於 VALID_EVENT_TYPES，無需新增 type。

**最終需新增的 event types（3 個）：**

| Type | 語意 | 發出方 |
|---|---|---|
| `pr_ready` | PR 準備好供 captain 審閱 | FO（未來）或 pipeline hook |
| `pipeline_error` | Entity/stage 執行失敗 | FO（未來）或 ensign error handler |
| `entity_shipped` | Entity 完成 ship | FO（terminal stage 後） |

`pr_ready`、`pipeline_error`、`entity_shipped` 目前沒有 FO 端 emit 實作。本 entity 只負責前端監聽與 VALID_EVENT_TYPES 白名單，emit 邏輯留待未來另一 entity 補充。

---

### Task Breakdown（有序 atomic commits）

**Task 1**: 新增 event types 至後端型別定義
- `tools/dashboard/src/types.ts` — `AgentEventType` union 加入 `pr_ready | pipeline_error | entity_shipped`
- `tools/dashboard/src/events.ts` — `VALID_EVENT_TYPES` Set 加入三個新 type

**Task 2**: 新建 `static/notifications.js` 核心模組
- `tools/dashboard/static/notifications.js` — 封裝：
  - `getConfig()` / `saveConfig()` — localStorage `dashboard.notifications.config` 讀寫
  - `requestPermission(onGranted)` — 包裝 `Notification.requestPermission()` promise
  - `notify(type, title, body, onClick)` — 主要公開介面，內含：
    - permission 狀態檢查
    - visibility 檢查（`document.visibilityState === 'visible'` → 不發）
    - per-type 開關檢查
    - 30s dedup（`Map<dedup_key, timestamp>`，dedup_key = `${type}:${entity}:${detail_prefix}`）
    - auto-close timeout（10s 低優先；`gate`/`permission_request` 不自動關）

**Task 3**: 設定面板 UI（index.html + activity.js）
- `tools/dashboard/static/index.html` — header 加入齒輪按鈕 `#notif-settings-btn`；header 下方加入可收折的 `#notif-settings-panel`
- `tools/dashboard/static/activity.js` — 設定面板初始化邏輯：toggle 開/關、per-type checkboxes、permission 狀態顯示、Test 按鈕、localStorage 讀寫

**Task 4**: activity.js WS 整合（主頁通知）
- `tools/dashboard/static/activity.js` — `ws.onmessage` event branch 加入 `notify()` 呼叫
- 觸發 types：`gate`、`permission_request`、`comment`、`channel_response`、`pr_ready`、`pipeline_error`、`entity_shipped`
- onClick：`window.focus()`；若有 entity slug 則導向 detail 頁

**Task 5**: detail.js WS 整合（entity 詳情頁通知）
- `tools/dashboard/static/detail.html` — 加入 `<script src="/notifications.js">`
- `tools/dashboard/static/detail.js` — `detailWs.onmessage` 加入通知呼叫（`gate`、`comment`）

---

### File-Level Changes Per Task

| Task | 檔案 | 變更性質 |
|---|---|---|
| 1 | `src/types.ts` | 修改 AgentEventType union |
| 1 | `src/events.ts` | 修改 VALID_EVENT_TYPES Set |
| 2 | `static/notifications.js` | 新建（約 120 行） |
| 3 | `static/index.html` | 修改 header，加入設定 panel |
| 3 | `static/activity.js` | 新增設定面板初始化（約 80 行） |
| 4 | `static/activity.js` | ws.onmessage notify 整合（約 20 行） |
| 5 | `static/detail.html` | 加入 script tag |
| 5 | `static/detail.js` | detailWs.onmessage notify 整合（約 15 行） |

share.js / share.html：**不修改**（guest reviewer 不需要 captain 通知）。

---

### Settings UI Design

**位置**：index.html header 右側加入齒輪按鈕，點擊展開/收折 `#notif-settings-panel` div，位於 header 正下方（全寬 banner 風格，不另開 modal）。

```
┌─────────────────────────────────────────────────────────┐
│ Spacedock Dashboard   [Connecting...] [Channel: ...]  ⚙ │
├─────────────────────────────────────────────────────────┤
│ ▼ Notifications  [Permission: granted]                  │
│   [x] Enabled                           [Test]          │
│   Notify on: [x] Gate approval  [x] Permission request  │
│              [x] FO comment     [x] FO channel reply    │
│              [x] PR ready       [x] Pipeline error      │
│              [ ] Entity shipped (low priority, opt-in)  │
└─────────────────────────────────────────────────────────┘
```

Panel 預設 `hidden`，按鈕 toggle `hidden` attribute。無 modal、無 sidebar — 最小 DOM footprint。

---

### Permission Flow

1. 頁面載入：讀 `Notification.permission`
   - `granted` → 直接啟用，不呼叫 requestPermission
   - `denied` → toggle 顯示 disabled + 說明文字
   - `default` → toggle 顯示 "Click to enable"
2. **Toggle 開啟點擊**（user gesture）→ 呼叫 `Notification.requestPermission()` → resolve 後更新 config 和 UI
3. Toggle 關閉 → 只更新 localStorage config（瀏覽器不提供 revoke API）

---

### Deduplication Strategy

```js
function dedupKey(type, entity, detail) {
  return type + ':' + (entity || '') + ':' + (detail || '').slice(0, 32);
}
// Map<key, timestamp_ms> — 30s 內相同 key suppress
// 每次 notify 時清除 >60s 舊 entry（避免 Map 無限增長）
```

不使用 event seq，因為 WS replay 會重放歷史 event（舊 seq），用 `(type, entity, detail)` + 時間窗口更可靠。

---

### Test Plan

**單元測試（bun:test）**：新建 `tests/dashboard/notifications.test.ts`
- `getConfig()` 回傳預設值（無 localStorage 環境）
- `saveConfig()` → `getConfig()` round-trip（mock localStorage）
- `dedupKey()` 產生穩定 key
- dedup：同 key 30s 內第二次呼叫 → mock Notification 不被建立
- visibility 抑制：mock `document.visibilityState = 'visible'` → 不通知
- per-type 過濾：config disable type → 不通知

Mock 策略：`globalThis.Notification = class { static permission = 'granted'; constructor() {...} }` in test setup；localStorage 用 Map shim。

**手動驗證 checklist：**
- [ ] 點設定按鈕 → panel 展開/收折
- [ ] Toggle 開啟（permission=default）→ 瀏覽器跳 permission prompt
- [ ] 授權後 → toggle enabled，permission 狀態顯示 granted
- [ ] 點 Test 按鈕 → 系統通知出現
- [ ] `curl POST /api/events` 發出 `gate` event → 背景 tab 收到通知
- [ ] 點通知 → tab focus + 導向正確 entity detail
- [ ] Toggle 關閉 → 再發 event → 無通知
- [ ] Tab 在前景（visibilityState=visible）→ 發 event → 無通知
- [ ] 30s 內同 event 重複 → 第二次無通知
- [ ] Permission denied → toggle disabled + 說明文字

---

### Estimated Commits

5 個 atomic commits：

1. `feat(041): add pr_ready, pipeline_error, entity_shipped event types`
2. `feat(041): add notifications.js module — permission, dedup, visibility, config`
3. `feat(041): add notification settings panel to dashboard index`
4. `feat(041): wire browser notifications to activity feed WS`
5. `feat(041): wire browser notifications to entity detail page WS`

---

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
