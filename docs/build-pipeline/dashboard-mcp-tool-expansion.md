---
id: 033
title: Dashboard MCP Tool Expansion — Bidirectional Entity Collaboration
status: explore
source: spec 2026-04-08-pipeline-brainstorm-profiles-design.md (WP3)
started: 2026-04-08
completed:
verdict:
score: 0.85
worktree: .worktrees/spacedock-ensign-dashboard-mcp-tool-expansion
issue:
pr:
intent: feature
scale: Large
project: spacedock
---

## Dependencies

- 032 (SQLite Snapshots) — `update_entity` needs snapshot integration

## Problem

The dashboard MCP currently exposes only one tool (`reply`) — FO can broadcast messages but can't read comments, reply to specific threads, or update entity specs. Brainstorm collaboration requires bidirectional communication through MCP.

## Scope

5 MCP tools registered in `channel.ts`:

### 1. `reply({ content, entity? })` — Enhancement
Add optional `entity` parameter. When provided, event scoped to entity detail feed. Backwards compatible.

### 2. `get_comments({ entity, workflow? })` — New
Read entity's comment threads. Returns open + resolved comments with full thread history. Workflow parameter for multi-workflow disambiguation.

### 3. `add_comment({ entity, section_heading?, content, workflow? })` — New
FO posts comment on entity. Optional `section_heading` for section-targeted comments. Used for brainstorm analysis, questions, status updates.

### 4. `reply_to_comment({ entity, comment_id, content, resolve?, workflow? })` — New
FO replies to specific comment thread. Optional resolve flag to reply + resolve in one action.

### 5. `update_entity({ entity, reason, frontmatter?, body?, sections?, workflow? })` — New
Update entity spec. Three modes (mutually exclusive where noted):
- `frontmatter` — partial merge (no permission needed)
- `body` — full replacement (permission request with diff preview)
- `sections` — heading-targeted replace/append/remove (remove needs permission)

Integrates with snapshot system (every update creates version), auto-resolves affected comments.

### Supporting work

- **Section parser**: Parse markdown into sections by headings, fuzzy heading match, ambiguity detection
- **Entity resolution**: Slug → file path via workflow directory discovery at startup
- **Permission integration**: `body` and `sections.remove` trigger permission request with diff preview through existing channel permission infrastructure
- **Comment notification**: Forward comment/reply events to FO via `onChannelMessage` with structured metadata (`{ type: "comment_added", entity, comment_id }`)

## Spec Reference

See `docs/superpowers/specs/2026-04-08-pipeline-brainstorm-profiles-design.md` — Section 3 (MCP Tool Expansion), Section 3.4 (Comment Notification), Known Limitations (Multi-Workflow).

## Acceptance Criteria

- All 5 tools registered and callable via MCP
- `reply` with `entity` parameter scopes events to entity detail feed
- `get_comments` returns full thread structure including resolved threads
- `add_comment` creates comments visible in dashboard UI
- `reply_to_comment` creates thread replies, optional resolve works
- `update_entity` frontmatter merge works without permission
- `update_entity` body replacement triggers permission request with diff
- `update_entity` section operations: replace, append, remove all work
- Section parser handles fuzzy heading match and ambiguity errors
- Snapshot created on every update_entity call
- Comments auto-resolved when their section is updated
- Comment notifications forwarded to FO via channel
- Entity resolution works with slug, errors on ambiguous multi-workflow match

## Stage Report (explore)

### Key File Inventory

| 檔案 | 功能 |
|------|------|
| `tools/dashboard/src/channel.ts` | MCP Server 進入點。目前只有 `reply` tool。`createChannelServer()` 建立 MCP + HTTP/WS 雙實例。`onChannelMessage` callback 做 MCP → browser 轉發。 |
| `tools/dashboard/src/server.ts` | Bun HTTP/WebSocket 伺服器。`createServer()` 含所有 REST API 路由。`publishEvent()` (line 1184) 是核心廣播函數：push 到 EventBuffer + `server.publish("activity", ...)` WS 廣播。 |
| `tools/dashboard/src/comments.ts` | 純存儲模組。以 JSON sidecar (`*.comments.json`) 存放評論。`addComment()`, `addReply()`, `resolveComment()` 均無 WS 廣播（廣播由 server.ts 呼叫端負責）。 |
| `tools/dashboard/src/snapshots.ts` | SQLite 快照模組。`SnapshotStore` 類別。`createSnapshot()` 自動遞增版本，transaction 安全。`parseSections()` 解析 markdown headings（fence-aware）。`findSectionByHeading()` 支援 exact + substring fallback。`replaceSection()` 替換 section body。 |
| `tools/dashboard/src/discovery.ts` | `discoverWorkflows(root)` 遞迴掃描找 `README.md` 含 `commissioned-by: spacedock@` 的目錄。`aggregateWorkflow()` 讀取實體清單。 |
| `tools/dashboard/src/frontmatter-io.ts` | `parseEntity()` 分離 frontmatter + body。`updateFrontmatterFields()` 更新平坦 key:value。`replaceBody()` 保留原始 frontmatter 換 body。 |
| `tools/dashboard/src/db.ts` | `openDb()` 建立 SQLite，包含 `events`, `share_links`, `entity_snapshots` 三張表。 |
| `tools/dashboard/src/types.ts` | `Comment` (line 116), `CommentReply` (line 127), `CommentThread` (line 142), `AgentEventType` (line 78) 含 `"comment"` 型別，`EntitySnapshot` (line 168)。 |
| `tools/dashboard/src/permission-tracker.ts` | 前端純模組（亦複製到 `static/activity.js`）。追蹤 pending permission requests，30s timeout，conversation-continues 啟發式解析。 |

### 現有架構理解

**MCP 工具呼叫流程**

```
FO (Claude Code) → MCP stdio → channel.ts CallToolRequestSchema
  → dashboard.publishEvent(AgentEvent)
  → server.ts publishEvent()
  → EventBuffer.push() + server.publish("activity", WS payload)
  → Browser WebSocket clients
```

**Captain → FO 訊息流程**

```
Browser → POST /api/channel/send 或 WS "channel_send"
  → opts.onChannelMessage(content, meta)
  → channel.ts → mcp.notification("notifications/claude/channel", ...)
  → FO session
```

**Permission 流程**

```
Claude Code → MCP notification (permission_request)
  → channel.ts → dashboard.publishEvent(permission_request event)
  → Browser 顯示 approve/deny UI
  → Captain → POST /api/channel/send (meta.type = "permission_response")
  → opts.onChannelMessage → channel.ts sendPermissionVerdict()
  → mcp.notification("notifications/claude/channel/permission", ...)
  → Claude Code
```

**評論存儲架構**

評論以 JSON sidecar 儲存（`*.comments.json`），而非 SQLite。`CommentThread.comments[]` 含內嵌 thread replies。沒有評論專用 DB table。

**快照 API 介面（032 已完成）**

```typescript
snapshotStore.createSnapshot({ entity, body, frontmatter?, author, reason, source? })
// entity 是識別符（slug or path），source 預設 "update"

parseSections(markdown)  // → ParsedSection[]
findSectionByHeading(sections, query)  // exact + substring, throws on ambiguous
replaceSection(body, section, newSectionBody)  // 行精確替換
```

`snapshotStore` 已在 `server.ts` line 56 實例化，`createServer()` 回傳值透過 `Object.assign` 公開。

### 5 個工具的整合分析

#### 1. `reply({ content, entity? })`

**現狀**：`channel.ts` line 121-134，`entity` 硬編碼為 `""`。

**需要做的**：
- 在 `inputSchema.properties` 加 `entity?: string`
- `CallToolRequestSchema` handler 解構 `entity`，將其填入 `AgentEvent.entity`
- 無需其他改動，backwards compatible

**風險**：無。

---

#### 2. `get_comments({ entity, workflow? })`

**需要做的**：
- 新增 entity resolution 函數：`slug → file path`，以 `discoverWorkflows()` + `aggregateWorkflow()` 取得所有實體的 `entity.path`，用 `entity.slug` 或 `basename(path).replace(.md)` 比對
- 呼叫 `getComments(filepath)` 回傳 `CommentThread`

**挑戰**：
- Entity resolution 需要在 MCP tool call 時掃描 workflow 目錄 — 每次都 scan 效能可接受（本地 git repo）
- `workflow?` 參數用於多 workflow 同名 slug 消歧

**風險**：slug 衝突跨 workflow。需要「找到唯一結果或拋出錯誤」語義。

---

#### 3. `add_comment({ entity, section_heading?, content, workflow? })`

**需要做的**：
- Entity resolution → filepath
- 呼叫 `addComment(filepath, { selected_text: "", section_heading: ..., content, author: "fo" })`
  - 注意：現有 `addComment` 要求 `selected_text`，但 MCP 工具不需要文字選取。需要讓 `selected_text` 在 MCP 情境下為空字串。
- 呼叫 `publishEvent({ type: "comment", entity: slug, agent: "fo", ... })`
- 透過 `opts.onChannelMessage` 轉發 `{ type: "comment_added", entity, comment_id }`（spec 3.4 要求）

**風險**：`selected_text` 必填但 MCP 情境無值 — 傳 `""` 即可，現有 `addComment` 無驗證。

---

#### 4. `reply_to_comment({ entity, comment_id, content, resolve?, workflow? })`

**需要做的**：
- Entity resolution → filepath
- 呼叫 `addReply(filepath, comment_id, { content, author: "fo" })`
- 若 `resolve === true`，再呼叫 `resolveComment(filepath, comment_id)`
- 呼叫 `publishEvent({ type: "comment", entity: slug, agent: "fo", ... })`

**風險**：無。現有 `addReply` + `resolveComment` 都有。

---

#### 5. `update_entity({ entity, reason, frontmatter?, body?, sections?, workflow? })`

這是最複雜的工具。

**Frontmatter 模式**（`frontmatter: Record<string, string>`）：
- 呼叫 `updateFrontmatterFields(text, updates)` 更新
- 呼叫 `snapshotStore.createSnapshot(...)` 建立快照
- 不需要 permission

**Body 模式**（`body: string`）：
- 需要 permission request — 透過現有 permission infrastructure：
  ```
  channel.ts → mcp.notification("notifications/claude/channel/permission")
  等待 sendPermissionVerdict() 結果
  ```
- 獲得 allow 後呼叫 `replaceBody(text, body)` + snapshot
- 挑戰：MCP tool call 是 request/response 模式，但 permission 是 async notification — 需要 Promise + 等待機制（目前 sendPermissionVerdict 有 callback，但 tool call handler 需要 await）

**Sections 模式**（`sections: Array<{ heading, content?, action }>`）：
- action = `"replace"` | `"append"` | `"remove"`
- `remove` 需要 permission（同 body 模式）
- 使用 `parseSections()` + `findSectionByHeading()` + `replaceSection()`
- Snapshot 在所有 section 操作完成後建立一次
- **Auto-resolve comments**：操作後掃描評論，`section_heading` 匹配被修改 section 的評論 → 呼叫 `resolveComment()`

**Permission 等待問題**：這是本實體最大的技術挑戰。目前 MCP tool handler 是 async function，但 permission 核准是透過另一個 MCP notification 進來。需要在 `channel.ts` 內建立 pending permission Map（`request_id → { resolve, reject }`），`sendPermissionVerdict` 呼叫時解開。

### 風險與未知事項

1. **Permission async 等待** — `update_entity` 的 body/remove 模式需要 MCP tool call 在等待 captain 核准期間暫停。需實作 pending-promise Map pattern。若 captain 不回應，要有 timeout（建議 60s）。

2. **Entity resolution 效能** — 每次 MCP tool call 都 scan project tree。在大型 monorepo 可能慢。但目前 dashboard 已在每個 API request scan，應可接受。可加 in-memory cache（初次 scan 後快取）。

3. **Multi-workflow slug 衝突** — `workflow?` 參數需要明確定義：是 workflow dir basename 還是 `commissioned-by` 值？建議 dir basename。

4. **Sidecar 評論 vs. SQLite** — 評論以 `.comments.json` 存放，不在 SQLite。`get_comments` 直接讀 sidecar 即可，不需要跨 DB query。

5. **`selected_text` 欄位** — `addComment()` 要求 `selected_text`，但 MCP 工具沒有文字選取語義。傳空字串 `""` 可行，但型別定義可能需要讓 `selected_text` optional。

6. **Comment auto-resolve 邊界** — 僅對 `section_heading` 精確匹配的評論 auto-resolve，模糊匹配可能誤殺。建議 exact match only。

### Profile 與跳 Stage 建議

**推薦 Profile：Standard**（explore → design → implement → quality → ship）

理由：
- 有 5 個工具，其中 `update_entity` 含複雜 permission-async 邏輯，需要 design 階段明確 API 合約
- 需要實體解析邏輯，entity resolution cache 設計需要決策
- 現有測試套件完整（`channel.ts` 沒有自己的測試但 server.test.ts 覆蓋 API），需要 quality 驗證

**不建議跳過任何 stage**。`design` 階段特別重要，因為：
- Permission async 等待 pattern 需要與 FO 溝通協議達成共識
- `update_entity` sections API 合約（`action` 欄位語義）需要明確文件

## Stage Report (plan)

### MCP Tool Schemas（API 合約）

#### Tool 1: `reply`（增強現有工具）

```typescript
// Input
{
  content: string;       // required — message to display
  entity?: string;       // optional — scope event to entity detail feed
}
// Output: { content: [{ type: "text", text: "Message sent to dashboard" }] }
// Behaviour: AgentEvent.entity = args.entity ?? ""
```

#### Tool 2: `get_comments`

```typescript
// Input
{
  entity: string;        // required — entity slug
  workflow?: string;     // optional — workflow dir basename for disambiguation
}
// Output: CommentThread  { comments: Comment[], suggestions: Suggestion[] }
// Errors: "Entity not found: <slug>" | "Ambiguous entity slug: matches <a>, <b>"
```

#### Tool 3: `add_comment`

```typescript
// Input
{
  entity: string;        // required
  content: string;       // required
  section_heading?: string;
  workflow?: string;
}
// Output: Comment (the created comment object)
// Side effects: publishEvent({type:"comment", agent:"fo"}), onChannelMessage({type:"comment_added"})
```

#### Tool 4: `reply_to_comment`

```typescript
// Input
{
  entity: string;        // required
  comment_id: string;    // required
  content: string;       // required
  resolve?: boolean;     // optional, default false
  workflow?: string;
}
// Output: { reply: CommentReply, resolved: boolean }
```

#### Tool 5: `update_entity`

```typescript
// Input — body 與 sections 互斥；frontmatter 可與 sections 同時存在
{
  entity: string;        // required
  reason: string;        // required — snapshot reason string
  workflow?: string;
  frontmatter?: Record<string, string>;  // Mode A: partial merge, no permission needed
  body?: string;                          // Mode B: full replace, requires permission
  sections?: Array<{                      // Mode C: section operations
    heading: string;
    action: "replace" | "append" | "remove";
    content?: string;   // required for replace/append
  }>;
}
// Output:
{
  ok: true;
  new_version: number;
  warning?: string | null;
  auto_resolved_comments?: string[];
}
// Errors: "Entity not found" | "Ambiguous section heading" | "Permission denied" | "Permission timeout"
```

---

### Permission Async Pattern 設計

**問題**：MCP `CallToolRequestSchema` handler 是 `async (request) => Response`，但 captain 的核准是透過獨立的 `onChannelMessage` callback 傳入，兩者在不同的非同步路徑。

**解法：pending-promise Map（在 `createChannelServer()` 閉包內）**

```typescript
const pendingPermissions = new Map<string, {
  resolve: (allowed: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

async function requestPermissionAndWait(
  toolName: string,
  description: string,
  diffPreview: string,
  timeoutMs = 120_000,
): Promise<boolean> {
  const requestId = crypto.randomUUID();
  // 發送 permission_request event 顯示在 dashboard UI
  dashboard.publishEvent({
    type: "permission_request",
    entity: "", stage: "", agent: "fo",
    timestamp: new Date().toISOString(),
    detail: JSON.stringify({ request_id: requestId, tool_name: toolName,
                             description, input_preview: diffPreview }),
  });
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      pendingPermissions.delete(requestId);
      resolve(false); // timeout → treat as deny
    }, timeoutMs);
    pendingPermissions.set(requestId, { resolve, timer });
  });
}
```

**核准路徑**（`onChannelMessage` callback 修改）：

```typescript
onChannelMessage: async (content, meta) => {
  if (meta?.type === "permission_response" && meta?.request_id) {
    const pending = pendingPermissions.get(meta.request_id);
    if (pending) {
      // Tool-level permission: resolve the waiting promise
      clearTimeout(pending.timer);
      pendingPermissions.delete(meta.request_id);
      pending.resolve(content === "allow");
      return;
    }
    // No pending entry → system-level permission (Claude Code tool approval)
    const behavior = content === "allow" ? "allow" : "deny";
    await sendPermissionVerdict(meta.request_id, behavior as "allow" | "deny");
  } else {
    await mcp.notification({ method: "notifications/claude/channel",
                             params: { content, meta: meta ?? {} } });
  }
}
```

**Timeout 行為**：120 秒後自動 deny，tool call 回傳 `{ isError: true, content: [{ type: "text", text: "Permission request timed out after 120s" }] }`。

**重要區分**：這是應用層 permission（FO 請求修改實體規格，captain 審批），與 Claude Code 系統層的 `notifications/claude/channel/permission`（Claude Code tool 呼叫審批）是不同層。兩者共存，以 `pendingPermissions` Map 是否有對應 `request_id` 區分。

---

### Task Breakdown（原子 commits）

#### Commit 1：Entity resolution 模組

**新建** `tools/dashboard/src/entity-resolver.ts`

```typescript
export function resolveEntity(slug: string, projectRoot: string, workflow?: string): string
// 邏輯：discoverWorkflows() → 各 workflow aggregateWorkflow() → 收集 entities
// slug 比對：entity.slug 或 basename(entity.path).replace(/\.md$/,"")
// 無結果 → throw "Entity not found: <slug>"
// 多結果且無 workflow 過濾 → throw "Ambiguous entity slug: <slug> matches: <paths>"
// workflow 過濾後仍多結果 → throw "Ambiguous entity slug in workflow <w>: matches: <paths>"
```

---

#### Commit 2：`reply` 工具增強

**修改** `tools/dashboard/src/channel.ts`

- `inputSchema.properties` 加 `entity?: { type: "string" }`
- Handler 解構 `entity?: string`，`AgentEvent.entity = args.entity ?? ""`

---

#### Commit 3：`get_comments` 工具

**修改** `tools/dashboard/src/channel.ts`

- 加 `get_comments` tool definition
- Handler：`resolveEntity` → `getComments(filepath)` → 回傳 JSON

---

#### Commit 4：`add_comment` 工具

**修改** `tools/dashboard/src/channel.ts`

- Handler：`resolveEntity` → `addComment(filepath, { selected_text: "", section_heading: args.section_heading ?? "", content, author: "fo" })` → `publishEvent` → `onChannelMessage({ type: "comment_added", entity, comment_id })`

---

#### Commit 5：`reply_to_comment` 工具

**修改** `tools/dashboard/src/channel.ts`

- Handler：`resolveEntity` → `addReply(filepath, comment_id, { content, author: "fo" })` → 若 `resolve === true` → `resolveComment(filepath, comment_id)` → `publishEvent`

---

#### Commit 6：Permission async 基礎設施

**修改** `tools/dashboard/src/channel.ts`

- 加入 `pendingPermissions` Map 和 `requestPermissionAndWait()` 函數
- 修改 `onChannelMessage`：先查 Map，found → resolve promise；not found → 走原 `sendPermissionVerdict` 路徑

---

#### Commit 7：`update_entity` — frontmatter 模式

**修改** `tools/dashboard/src/channel.ts`

- 加 `update_entity` tool definition（完整 inputSchema）
- 驗證互斥：`body` 和 `sections` 不可同時存在
- Frontmatter mode：`resolveEntity` → `readFileSync` → `parseEntity` → `updateFrontmatterFields` → `writeFileSync` → `snapshotStore.createSnapshot` → 回傳 `{ ok: true, new_version }`

需要 import：`dashboard.snapshotStore`（已由 `Object.assign` 公開於 createServer 回傳值）、`parseEntity`、`updateFrontmatterFields`、`readFileSync`、`writeFileSync`

---

#### Commit 8：`update_entity` — sections 模式（含 auto-resolve）

**修改** `tools/dashboard/src/channel.ts`

- Sections mode：
  1. `readFileSync` → `parseEntity`
  2. 按序處理每個 section operation（全在 memory）：
     - `parseSections(body)` + `findSectionByHeading(sections, heading)`（throws on ambiguous）
     - `replace`：`replaceSection(body, section, content)`
     - `append`：`replaceSection(body, section, section.body + "\n" + content)`
     - `remove`：await `requestPermissionAndWait(...)` → denied → early return error；allowed → 重建 body 略過該 section（lines `section.start..section.end`）
  3. `writeFileSync(filepath, newFile)`
  4. `snapshotStore.createSnapshot(...)` on final body
  5. Auto-resolve：`getComments(filepath).comments.filter(c => modifiedHeadings.has(c.section_heading) && !c.resolved)` → 各呼叫 `resolveComment`

---

#### Commit 9：`update_entity` — body 模式

**修改** `tools/dashboard/src/channel.ts`

- Body mode：
  1. `readFileSync` → `parseEntity`
  2. `createPatch("entity", parsedBody, args.body, "current", "proposed")` → diff preview
  3. `await requestPermissionAndWait("update_entity body", "Replace full entity body", diffPreview)`
  4. Denied → `{ isError: true, content: [{ type: "text", text: "Permission denied" }] }`
  5. Allowed：`replaceBody(text, args.body)` → `writeFileSync` → `snapshotStore.createSnapshot` → auto-resolve → 回傳

---

#### Commit 10：Entity resolver 單元測試

**新建** `tools/dashboard/src/entity-resolver.test.ts`

使用 `tmp` 目錄建立假 workflow（含 `README.md` 有 `commissioned-by: spacedock@test`）和假 entity `.md` 檔。

Cases：找到唯一、not found、ambiguous（無 workflow）、workflow 縮窄成功、workflow 縮窄後仍 ambiguous。

---

#### Commit 11：Channel MCP 工具整合測試

**新建** `tools/dashboard/src/channel.test.ts`

使用 `createChannelServer({ port: 0, dbPath: ":memory:", projectRoot: TMP })`，直接 HTTP fetch 或呼叫 `dashboard.snapshotStore`/`eventBuffer` 驗證。

Permission test 策略：`requestPermissionAndWait` 需要能在測試中快速 resolve。方案：建立 channel server 後，測試直接呼叫 `onChannelMessage("allow", { type: "permission_response", request_id: "..." })`（透過 `dashboard.port` 的 `POST /api/channel/send`）在背景 trigger permission resolve。

---

### 檔案異動總覽

| 檔案 | 操作 | Commits |
|------|------|---------|
| `tools/dashboard/src/entity-resolver.ts` | 新建 | 1 |
| `tools/dashboard/src/entity-resolver.test.ts` | 新建 | 10 |
| `tools/dashboard/src/channel.ts` | 修改（加 imports + 8 tool handlers + permission infra） | 2–9 |
| `tools/dashboard/src/channel.test.ts` | 新建 | 11 |

`channel.ts` 新增 imports：
- `resolveEntity` from `./entity-resolver`
- `getComments`, `addComment`, `addReply`, `resolveComment` from `./comments`
- `parseSections`, `findSectionByHeading`, `replaceSection` from `./snapshots`
- `parseEntity`, `updateFrontmatterFields`, `replaceBody` from `./frontmatter-io`
- `readFileSync`, `writeFileSync` from `node:fs`
- `createPatch` from `diff`（already a dependency of snapshots.ts）

---

### Test Plan

| 工具 / 情境 | 測試檔 | 關鍵 edge cases |
|------------|--------|----------------|
| Entity resolution | `entity-resolver.test.ts` | not found, ambiguous, workflow filter |
| `reply` entity scoping | `channel.test.ts` | entity="" default, entity set → AgentEvent.entity |
| `get_comments` | `channel.test.ts` | empty thread, populated thread |
| `add_comment` | `channel.test.ts` | event broadcast, onChannelMessage metadata |
| `reply_to_comment` | `channel.test.ts` | resolve=true, resolve=false, unknown comment_id |
| `update_entity` frontmatter | `channel.test.ts` | partial merge, new key, snapshot version |
| `update_entity` sections replace | `channel.test.ts` | fuzzy heading, ambiguous → error |
| `update_entity` sections remove | `channel.test.ts` | timeout → deny, allow path |
| `update_entity` body | `channel.test.ts` | allow path, deny path |
| auto-resolve | `channel.test.ts` | exact heading match resolves, non-matching preserved |
| body+sections 互斥 | `channel.test.ts` | both present → error before any write |

---

### Risk Mitigations

| 風險 | 緩解措施 |
|------|---------|
| Permission async 等待 — captain 離開 | 120s timeout → deny，明確錯誤訊息，不靜默失敗 |
| Permission async 等待 — 測試困難 | 測試透過 `POST /api/channel/send` 模擬 captain approve，在背景 fire |
| Entity resolution 掃描效能 | 先不做 cache（workflow scan 已被 API 路由每次呼叫，可接受）；未來按需加 cache |
| Slug 衝突跨 workflow | 錯誤訊息列出所有衝突路徑；`workflow?` 提供消歧手段 |
| `selected_text` 語義 | MCP 情境傳 `""`，`comments.ts` 無驗證。若 UI 需區分來源，可用 `author === "fo"` 判斷 |
| sections remove 半途失敗 | 所有 section 操作在 memory 完成後才 `writeFileSync`；snapshot 在 write 後才建立 |
| `channel.ts` 膨脹 | entity-resolver 已抽出；可視情況抽 `mcp-tools.ts`，但不在本 entity scope |

---

### Estimated Commits：11 個

