# Dashboard War Room Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Spacedock Dashboard into "戰情室" (War Room) with a three-column layout, Retro Aerospace visual identity, and tree-based mission navigation.

**Architecture:** Purely frontend changes — no server-side modifications. The existing two-column grid (`1fr 320px`) becomes a three-column grid (`120px 1fr 320px`) with an alert bar above. Color system swaps from GitHub Primer dark to Retro Aerospace palette. Tree view replaces the flat workflow card list. All existing functionality (polling, WebSocket, pipeline graph, entity table, comments) is preserved.

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks), Bun server (unchanged)

---

### Task 1: Naming Changes

**Files:**
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/detail.html`
- Modify: `tools/dashboard/src/server.ts:616` (banner text)

- [ ] **Step 1: Update index.html title and header**

In `tools/dashboard/static/index.html`, change:

```html
<!-- Line 5: page title -->
<title>戰情室 — Spacedock</title>

<!-- Line 11: header h1 -->
<h1>◆ 戰情室</h1>
```

- [ ] **Step 2: Update detail.html title and back link**

In `tools/dashboard/static/detail.html`, change:

```html
<!-- Line 5: page title -->
<title>Entity Detail — 戰情室</title>

<!-- Line 12: back link -->
<a href="/" class="back-link">&larr; 返回戰情室</a>
```

- [ ] **Step 3: Update server startup banner**

In `tools/dashboard/src/server.ts`, find line 616 and change:

```typescript
const banner = `[${new Date().toISOString().slice(0, 19).replace("T", " ")}] 戰情室 started on http://127.0.0.1:${server.port}/ (root: ${projectRoot})`;
```

- [ ] **Step 4: Verify naming changes**

Run: `cd /Users/kent/Project/spacedock/tools/dashboard && bun run src/server.ts --port 8420`

Check:
- Browser shows "◆ 戰情室" in header
- Tab title reads "戰情室 — Spacedock"
- Terminal shows "戰情室 started on..."
- Detail page shows "← 返回戰情室"

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/index.html tools/dashboard/static/detail.html tools/dashboard/src/server.ts
git commit -m "feat(dashboard): rebrand to 戰情室 — naming changes"
```

---

### Task 2: Retro Aerospace Color System

**Files:**
- Modify: `tools/dashboard/static/style.css`
- Modify: `tools/dashboard/static/detail.css`

This task replaces the entire GitHub Primer color palette with the Retro Aerospace system. Every color reference is mapped below.

**Color mapping:**

| Old (Primer) | New (Retro Aerospace) | Role |
|---|---|---|
| `#0d1117` | `#1a1a2e` | body background |
| `#161b22` | `#16213e` | card/panel background |
| `#21262d` | `#0f3460` | borders, muted elements |
| `#1c2128` | `#16213e` | hover row background |
| `#f0f6fc` | `#e0d6c8` | bright text (headings) |
| `#c9d1d9` | `#e0d6c8` | primary text |
| `#8b949e` | `#e0d6c899` | secondary/muted text |
| `#484f58` | `#e0d6c866` | disabled text |
| `#58a6ff` | `#53a8b6` | links, interactive accent |
| `#1f6feb` | `#e94560` | primary button, captain bubble |
| `#388bfd` | `#e94560cc` | button hover |
| `#3fb950` | `#2ecc71` | success/green |
| `#52c41a` | `#2ecc71` | indicator green |
| `#1b4332` | `#2ecc7122` | green badge background |
| `#f0883e` | `#e94560` | warning/gate (now unified with accent) |
| `#d4a017` | `#e9456099` | paused indicator |
| `#3b2e00` | `#e9456022` | paused indicator bg |
| `#d2a8ff` | `#d4a574` | explore/ideation stage color |
| `#79c0ff` | `#53a8b6` | research/merge stage color |
| `#da3633` | `#e94560` | deny/danger button |
| `#f85149` | `#e94560cc` | danger hover |
| `#a0c4ff` | `#53a8b699` | captain bubble timestamp |

- [ ] **Step 1: Replace body and base colors in style.css**

In `tools/dashboard/static/style.css`, replace:

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    background: #1a1a2e;
    color: #e0d6c8;
    padding: 1.5rem;
}

header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e94560;
}

h1 { font-size: 1.5rem; color: #e94560; }
```

- [ ] **Step 2: Replace indicator colors**

```css
.indicator {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    background: #2ecc7122;
    color: #2ecc71;
}

.indicator.paused { background: #e9456022; color: #e9456099; }
```

- [ ] **Step 3: Replace workflow card colors**

```css
.workflow-card {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
}

.workflow-card h2 {
    font-size: 1.1rem;
    color: #e0d6c8;
    margin-bottom: 0.25rem;
}

.workflow-meta {
    font-size: 0.8rem;
    color: #e0d6c899;
    margin-bottom: 1rem;
}
```

- [ ] **Step 4: Replace stage chip colors**

```css
.stage-chip {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    background: #0f3460;
    color: #e0d6c899;
    cursor: pointer;
}

.stage-chip--active {
    background: #53a8b633;
    border: 1px solid #53a8b6;
}

.stage-chip .count {
    font-weight: bold;
    color: #53a8b6;
    margin-left: 0.25rem;
}
```

- [ ] **Step 5: Replace table colors**

```css
th {
    text-align: left;
    padding: 0.5rem;
    border-bottom: 1px solid #0f3460;
    color: #e0d6c899;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
}

th:hover { color: #e0d6c8; }

td {
    padding: 0.5rem;
    border-bottom: 1px solid #16213e;
}

tr:hover td { background: #16213e; }

.entity-row--archived .status-badge { background: #0f3460 !important; color: #e0d6c899 !important; }

.loading { color: #e0d6c899; text-align: center; padding: 2rem; }
.empty-state { color: #e0d6c899; text-align: center; padding: 1rem; }
```

- [ ] **Step 6: Replace activity feed and chat bubble colors**

```css
.indicator.channel-connected { background: #2ecc7122; color: #2ecc71; }
.indicator.channel-disconnected { background: #e9456022; color: #e9456099; }

.chat-bubble.captain {
    margin-left: auto;
    background: #e94560;
    color: #e0d6c8;
    border-radius: 12px 12px 2px 12px;
    text-align: right;
}

.chat-bubble.fo {
    margin-right: auto;
    background: #0f3460;
    color: #e0d6c8;
    border-radius: 12px 12px 12px 2px;
}

.chat-bubble .bubble-time {
    display: block;
    font-size: 0.65rem;
    color: #e0d6c866;
    margin-top: 0.2rem;
}

.chat-bubble.captain .bubble-time {
    color: #e0d6c899;
}

.chat-bubble .show-more {
    display: inline-block;
    font-size: 0.7rem;
    color: #53a8b6;
    cursor: pointer;
    margin-top: 0.2rem;
}

.activity-item {
    padding: 0.5rem;
    border-bottom: 1px solid #0f3460;
    font-size: 0.8rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: baseline;
}

.activity-info {
    color: #e0d6c8;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.activity-time {
    color: #e0d6c866;
    font-size: 0.7rem;
    flex-shrink: 0;
}

.activity-detail {
    width: 100%;
    color: #e0d6c899;
    font-size: 0.75rem;
    padding-left: 0.5rem;
    margin-top: 0.15rem;
}
```

- [ ] **Step 7: Replace permission card colors**

```css
.permission-card {
    background: #16213e;
    border: 1px solid #e94560;
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0.4rem 0;
    font-size: 0.8rem;
}

.permission-card .perm-header {
    color: #e94560;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
}

.permission-card .perm-tool {
    color: #e0d6c8;
    font-weight: 500;
}

.permission-card .perm-preview {
    color: #e0d6c899;
    font-family: "SF Mono", Menlo, monospace;
    font-size: 0.75rem;
    margin-top: 0.3rem;
    padding: 0.3rem;
    background: #1a1a2e;
    border-radius: 4px;
    overflow-x: auto;
}

.permission-card .perm-btn.approve {
    background: #2ecc71;
    color: #1a1a2e;
}

.permission-card .perm-btn.approve:hover {
    background: #27ae60;
}

.permission-card .perm-btn.deny {
    background: #e94560;
    color: #e0d6c8;
}

.permission-card .perm-btn.deny:hover {
    background: #e94560cc;
}

.permission-card.resolved {
    border-color: #0f3460;
    opacity: 0.7;
}

.permission-card .perm-verdict {
    font-size: 0.7rem;
    color: #e0d6c899;
    margin-top: 0.3rem;
}
```

- [ ] **Step 8: Replace input bar and button colors**

```css
#channel-input-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 0;
    border-top: 1px solid #0f3460;
    margin-top: 0.5rem;
}

#channel-input {
    flex: 1;
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #e0d6c8;
    padding: 0.5rem;
    font-family: inherit;
    font-size: 0.8rem;
    resize: none;
    min-height: 2rem;
    max-height: 6rem;
    overflow-y: auto;
}

#channel-input:focus {
    outline: none;
    border-color: #53a8b6;
}

#channel-input:disabled {
    background: #16213e;
    color: #e0d6c866;
    cursor: not-allowed;
}

#channel-send-btn {
    padding: 0.5rem 1rem;
    background: #e94560;
    color: #e0d6c8;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    align-self: flex-end;
}

#channel-send-btn:hover {
    background: #e94560cc;
}

#channel-send-btn:disabled {
    background: #0f3460;
    color: #e0d6c866;
    cursor: not-allowed;
}
```

- [ ] **Step 9: Replace editor panel colors**

```css
.editor-btn {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid #0f3460;
    background: #16213e;
    color: #e0d6c8;
    cursor: pointer;
}

.editor-btn:hover {
    border-color: #53a8b6;
    color: #53a8b6;
}

.editor-btn.active {
    background: #53a8b622;
    border-color: #53a8b6;
    color: #53a8b6;
}

.editor-btn.save {
    background: #2ecc71;
    border-color: #2ecc71;
    color: #1a1a2e;
}

.editor-btn.save:hover {
    background: #27ae60;
}

.editor-btn.danger {
    border-color: #e94560;
    color: #e94560;
}

.editor-btn.danger:hover {
    background: #e9456022;
}

.editor-props-panel {
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.8rem;
}

.editor-props-panel label {
    color: #e0d6c8;
}

.editor-props-panel input[type="checkbox"] {
    accent-color: #53a8b6;
}

.editor-props-panel input[type="text"],
.editor-props-panel select {
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #e0d6c8;
    padding: 0.2rem 0.4rem;
    font-size: 0.75rem;
    font-family: inherit;
}

.editor-validation-error {
    color: #e94560;
    font-size: 0.75rem;
    margin-top: 0.25rem;
}
```

- [ ] **Step 10: Update statusColor in app.js**

In `tools/dashboard/static/app.js`, replace the `statusColor` function (lines 62-74):

```javascript
function statusColor(status) {
    var colors = {
      backlog: "#e0d6c866",
      ideation: "#d4a574",
      implementation: "#53a8b6",
      validation: "#e94560",
      done: "#2ecc71",
      explore: "#d4a574",
      research: "#53a8b6",
      plan: "#e94560",
    };
    return colors[status] || "#e0d6c866";
}
```

- [ ] **Step 11: Update statusColor in activity.js**

In `tools/dashboard/static/activity.js`, replace the `statusColor` function (lines 89-99):

```javascript
function statusColor(type) {
    var colors = {
      dispatch: "#53a8b6",
      completion: "#2ecc71",
      gate: "#e94560",
      feedback: "#d4a574",
      merge: "#53a8b6",
      idle: "#e0d6c866",
    };
    return colors[type] || "#e0d6c866";
}
```

- [ ] **Step 12: Update detail.css with Retro Aerospace palette**

Read `tools/dashboard/static/detail.css` and apply the same color mapping. Replace all occurrences of Primer colors with their Retro Aerospace equivalents per the mapping table in Step 0.

- [ ] **Step 13: Verify color system**

Run dashboard, check:
- Deep navy background (`#1a1a2e`), not GitHub dark (`#0d1117`)
- Red header accent bar (`#e94560`)
- Warm white text, not cold white
- Captain chat bubbles are red, not blue
- Teal interactive elements (`#53a8b6`), not GitHub blue
- No remaining `#58a6ff`, `#0d1117`, `#161b22` visible

- [ ] **Step 14: Commit**

```bash
git add tools/dashboard/static/style.css tools/dashboard/static/detail.css tools/dashboard/static/app.js tools/dashboard/static/activity.js
git commit -m "feat(dashboard): retro aerospace color system — replace GitHub Primer palette"
```

---

### Task 3: Three-Column Layout + Alert Bar HTML

**Files:**
- Modify: `tools/dashboard/static/index.html`
- Modify: `tools/dashboard/static/style.css`

- [ ] **Step 1: Restructure index.html to three columns + alert bar**

Replace the `<div class="dashboard-layout">` section in `tools/dashboard/static/index.html`:

```html
<body>
    <header>
        <h1>◆ 戰情室</h1>
        <div class="header-indicators">
            <span id="ws-status" class="indicator paused">Connecting...</span>
            <span id="channel-status" class="indicator paused">Channel: disconnected</span>
            <span id="refresh-indicator" class="indicator">Auto-refresh: ON</span>
            <span id="telemetry-indicator" class="indicator" style="display:none"></span>
        </div>
    </header>
    <div id="alert-bar" class="alert-bar"></div>
    <div class="warroom-layout">
        <nav id="missions-nav" class="missions-nav">
            <div class="nav-section-label">MISSIONS</div>
            <div id="missions-tree"></div>
        </nav>
        <main id="workflows-container">
            <p class="loading">Loading workflows...</p>
        </main>
        <aside id="activity-panel">
            <h3>Activity Feed</h3>
            <div id="activity-feed">
                <p class="empty-state">No activity yet.</p>
            </div>
            <div id="comms-ticker" class="comms-ticker"></div>
            <div id="channel-input-bar">
                <textarea id="channel-input" placeholder="No active session — launch with --channels to enable" disabled rows="1"></textarea>
                <button id="channel-send-btn" disabled>Send</button>
            </div>
        </aside>
    </div>
    <script src="visualizer.js"></script>
    <script src="editor.js"></script>
    <script src="app.js"></script>
    <script src="activity.js"></script>
</body>
```

- [ ] **Step 2: Add three-column grid CSS**

Add to `tools/dashboard/static/style.css`, replacing the existing `.dashboard-layout`:

```css
/* --- Three-Column War Room Layout --- */

.warroom-layout {
    display: grid;
    grid-template-columns: 120px 1fr 320px;
    gap: 1rem;
    height: calc(100vh - 8rem);
}

.missions-nav {
    overflow-y: auto;
    border-right: 1px solid #0f3460;
    padding-right: 0.75rem;
}

.nav-section-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #e0d6c866;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

#activity-panel {
    position: sticky;
    top: 0;
    max-height: calc(100vh - 8rem);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

#activity-panel h3 {
    font-size: 0.9rem;
    color: #e0d6c8;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #0f3460;
}

#activity-feed {
    flex: 1;
    overflow-y: auto;
}

#workflows-container {
    overflow-y: auto;
}
```

- [ ] **Step 3: Add alert bar CSS**

```css
/* --- Alert Bar --- */

.alert-bar {
    margin-bottom: 0.75rem;
}

.alert-bar:empty {
    display: none;
}

.alert-item {
    background: #e9456018;
    border-left: 3px solid #e94560;
    border-radius: 4px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
}

.alert-item .alert-text {
    color: #e94560;
}

.alert-item .alert-action {
    font-size: 0.75rem;
    color: #e94560;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
}

.alert-item .alert-action:hover {
    text-decoration: underline;
}
```

- [ ] **Step 4: Add ticker strip CSS**

```css
/* --- Comms Ticker --- */

.comms-ticker {
    padding: 0.4rem 0.5rem;
    border-top: 1px solid #0f3460;
    font-size: 0.7rem;
    color: #e0d6c866;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.comms-ticker:empty {
    display: none;
}
```

- [ ] **Step 5: Update responsive breakpoint**

Replace the existing `@media (max-width: 768px)` rule:

```css
@media (max-width: 768px) {
    .warroom-layout {
        grid-template-columns: 1fr;
    }
    .missions-nav {
        display: none;
    }
    #activity-panel {
        position: static;
        max-height: 300px;
    }
    .pipeline-graph-container {
        display: none;
    }
}
```

- [ ] **Step 6: Verify layout**

Run dashboard, check:
- Three columns visible: narrow MISSIONS left, wide MAIN center, COMMS right
- Alert bar area above columns (empty = hidden)
- COMMS has ticker strip at bottom (empty = hidden)
- Responsive: narrow screen hides MISSIONS and stacks

- [ ] **Step 7: Commit**

```bash
git add tools/dashboard/static/index.html tools/dashboard/static/style.css
git commit -m "feat(dashboard): three-column warroom layout with alert bar"
```

---

### Task 4: Missions Tree View

**Files:**
- Modify: `tools/dashboard/static/app.js`
- Modify: `tools/dashboard/static/style.css`

- [ ] **Step 1: Add tree view CSS**

Append to `tools/dashboard/static/style.css`:

```css
/* --- Missions Tree --- */

.tree-workflow {
    margin-bottom: 0.75rem;
}

.tree-workflow-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    padding: 0.25rem 0.4rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #e0d6c8;
    font-weight: 500;
}

.tree-workflow-header:hover {
    background: #0f346066;
}

.tree-workflow-header.selected {
    background: #0f3460;
    border-left: 2px solid #53a8b6;
}

.tree-toggle {
    font-size: 0.6rem;
    color: #e0d6c866;
    width: 1em;
    text-align: center;
    flex-shrink: 0;
}

.tree-entities {
    padding-left: 1rem;
}

.tree-entities.collapsed {
    display: none;
}

.tree-entity {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    color: #e0d6c899;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tree-entity:hover {
    background: #0f346066;
    color: #e0d6c8;
}

.tree-entity.selected {
    background: #0f3460;
    color: #e0d6c8;
}

.tree-entity-icon {
    flex-shrink: 0;
    font-size: 0.6rem;
}

.tree-shipped-count {
    font-size: 0.65rem;
    color: #e0d6c866;
    padding: 0.15rem 0.4rem;
    padding-left: 1.2rem;
}
```

- [ ] **Step 2: Add tree rendering logic to app.js**

In `tools/dashboard/static/app.js`, add the tree rendering function after the `el()` helper (after line 110), and add state tracking at the top:

```javascript
var selectedEntity = null;
var expandedWorkflows = {};

function renderMissionsTree(workflows) {
    var treeContainer = document.getElementById("missions-tree");
    if (!treeContainer) return;
    treeContainer.textContent = "";

    workflows.forEach(function (wf, wfIdx) {
        var wfNode = el("div", { className: "tree-workflow" });

        // Workflow header
        var isExpanded = expandedWorkflows[wfIdx] !== false; // default expanded
        var header = el("div", {
            className: "tree-workflow-header" + (selectedEntity === null && wfIdx === 0 ? " selected" : "")
        }, [
            el("span", { className: "tree-toggle", textContent: isExpanded ? "▼" : "▶" }),
            wf.name
        ]);
        header.addEventListener("click", function () {
            expandedWorkflows[wfIdx] = !isExpanded;
            fetchWorkflows();
        });
        wfNode.appendChild(header);

        // Entity list
        var entityList = el("div", { className: "tree-entities" + (isExpanded ? "" : " collapsed") });

        var active = wf.entities.filter(function (e) {
            return e.archived !== "true" && e.status !== "shipped";
        });
        var shippedCount = wf.entities.length - active.length;

        // Determine which entities need gate icon
        var gateStages = {};
        wf.stages.forEach(function (s) {
            if (s.gate) gateStages[s.name] = true;
        });

        active.forEach(function (entity) {
            var isGate = gateStages[entity.status];
            var icon = isGate ? "🟠" : "🔵";
            var isSelected = selectedEntity === entity.path;
            var item = el("div", {
                className: "tree-entity" + (isSelected ? " selected" : "")
            }, [
                el("span", { className: "tree-entity-icon", textContent: icon }),
                (entity.id || "") + " " + (entity.slug || entity.title || "")
            ]);
            item.addEventListener("click", function (ev) {
                ev.stopPropagation();
                selectedEntity = entity.path;
                if (entity.path) {
                    window.location.href = "/detail?path=" + encodeURIComponent(entity.path);
                }
            });
            entityList.appendChild(item);
        });

        if (shippedCount > 0) {
            entityList.appendChild(el("div", {
                className: "tree-shipped-count",
                textContent: "✅ " + shippedCount + " shipped"
            }));
        }

        wfNode.appendChild(entityList);
        treeContainer.appendChild(wfNode);
    });
}
```

- [ ] **Step 3: Wire tree rendering into the render loop**

In the existing `render()` function in `app.js`, add at the beginning (right after `container.textContent = "";`):

```javascript
renderMissionsTree(workflows);
```

- [ ] **Step 4: Verify tree view**

Run dashboard, check:
- Left column shows MISSIONS label
- Workflows listed with ▼/▶ toggle
- Active entities show with 🟠 (gate) or 🔵 (active) icons
- Shipped count shows at bottom of each workflow
- Clicking entity navigates to detail page
- Clicking workflow header toggles expand/collapse

- [ ] **Step 5: Commit**

```bash
git add tools/dashboard/static/app.js tools/dashboard/static/style.css
git commit -m "feat(dashboard): missions tree view navigation"
```

---

### Task 5: Alert Bar Rendering

**Files:**
- Modify: `tools/dashboard/static/app.js`

- [ ] **Step 1: Add alert bar rendering logic**

In `tools/dashboard/static/app.js`, add after the `renderMissionsTree` function:

```javascript
function renderAlertBar(workflows) {
    var alertBar = document.getElementById("alert-bar");
    if (!alertBar) return;
    alertBar.textContent = "";

    workflows.forEach(function (wf) {
        // Determine gate stages
        var gateStages = {};
        wf.stages.forEach(function (s) {
            if (s.gate) gateStages[s.name] = true;
        });

        wf.entities.forEach(function (entity) {
            if (entity.archived === "true" || entity.status === "shipped") return;

            // Gate pending alert
            if (gateStages[entity.status]) {
                var item = el("div", { className: "alert-item" }, [
                    el("span", { className: "alert-text", textContent:
                        "⚠ GATE: " + (entity.id || "") + " " + (entity.title || entity.slug || "") + " — awaiting " + entity.status + " approval"
                    }),
                    el("span", { className: "alert-action", textContent: "Review →" })
                ]);
                item.querySelector(".alert-action").addEventListener("click", function () {
                    if (entity.path) {
                        window.location.href = "/detail?path=" + encodeURIComponent(entity.path);
                    }
                });
                alertBar.appendChild(item);
            }
        });
    });
}
```

- [ ] **Step 2: Wire alert bar into the render loop**

In the `render()` function, add right after the `renderMissionsTree(workflows);` call:

```javascript
renderAlertBar(workflows);
```

- [ ] **Step 3: Verify alert bar**

Run dashboard, check:
- If entity 008 is at `plan` stage (a gate), alert bar shows: "⚠ GATE: 008 ... — awaiting plan approval"
- Click "Review →" navigates to entity detail
- If no gate-pending entities, alert bar is hidden (`:empty` CSS)

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/static/app.js
git commit -m "feat(dashboard): alert bar for gate-pending entities"
```

---

### Task 6: Comms Ticker Summary

**Files:**
- Modify: `tools/dashboard/static/activity.js`

- [ ] **Step 1: Add ticker update logic**

In `tools/dashboard/static/activity.js`, add after the `capFeedItems()` function (around line 134):

```javascript
var tickerEl = document.getElementById("comms-ticker");
var tickerBuffer = [];
var TICKER_MAX = 5;

function updateTicker(entry) {
    if (!tickerEl) return;
    var e = entry.event;
    var text = "";

    if (e.type === "channel_message") {
        text = "captain: " + (e.detail || "").slice(0, 30);
    } else if (e.type === "channel_response") {
        text = "FO: " + (e.detail || "").slice(0, 30);
    } else if (e.type === "dispatch") {
        text = "dispatch: " + (e.entity || "") + "→" + (e.stage || "");
    } else if (e.type === "completion") {
        text = "done: " + (e.entity || "") + " " + (e.stage || "");
    } else if (e.type === "gate") {
        text = "gate: " + (e.entity || "") + " pending";
    } else if (e.type === "merge") {
        text = "merge: " + (e.entity || "") + " shipped";
    } else {
        return; // skip idle and unknown types
    }

    tickerBuffer.unshift(text);
    if (tickerBuffer.length > TICKER_MAX) tickerBuffer.pop();
    tickerEl.textContent = tickerBuffer.join(" · ");
}
```

- [ ] **Step 2: Wire ticker into renderEntry**

In the `renderEntry()` function (around line 108), add `updateTicker(entry);` as the first line:

```javascript
function renderEntry(entry) {
    updateTicker(entry);
    var e = entry.event;
    // ... rest of existing code
}
```

- [ ] **Step 3: Verify ticker**

Run dashboard with channel connected, check:
- Bottom of COMMS shows condensed one-line summary
- Shows latest events separated by " · "
- Max 5 items, oldest evicted
- Hidden when empty

- [ ] **Step 4: Commit**

```bash
git add tools/dashboard/static/activity.js
git commit -m "feat(dashboard): comms ticker summary strip"
```

---

### Task 7: Remove Old Layout CSS

**Files:**
- Modify: `tools/dashboard/static/style.css`

- [ ] **Step 1: Remove deprecated `.dashboard-layout` rule**

Delete the old two-column grid rule that's no longer used:

```css
/* DELETE this block — replaced by .warroom-layout */
.dashboard-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 1.5rem;
}
```

- [ ] **Step 2: Remove old responsive rule for `.dashboard-layout`**

Any `@media` rule referencing `.dashboard-layout` should already be replaced. Verify no references remain.

- [ ] **Step 3: Verify no regressions**

Run dashboard and navigate:
- Main page: three-column layout, alert bar, tree nav, COMMS with ticker
- Detail page: colors consistent with Retro Aerospace, "← 返回戰情室"
- Mobile viewport: columns stack, MISSIONS hidden

- [ ] **Step 4: Final commit**

```bash
git add tools/dashboard/static/style.css
git commit -m "refactor(dashboard): remove deprecated dashboard-layout CSS"
```
