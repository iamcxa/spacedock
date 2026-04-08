# Dashboard Phase Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a phase navigation panel to the entity detail page (and share page) showing all workflow stages with status indicators, click-to-scroll behavior, and responsive collapse.

**Architecture:** Pure frontend — no backend changes. The detail page already fetches `/api/workflows` (stages with `gate: boolean`) and `/api/entity/detail` (with `stage_reports[]` and `frontmatter.status`). We add a `renderPhaseNav()` function that cross-references these to derive each stage's status (completed/current/pending/gate), renders a clickable nav panel in the sidebar, and scrolls to the corresponding `## Stage Report` section. The share page uses DOM scanning instead of `stage_reports` since the share API doesn't return that field.

**Tech Stack:** Vanilla JS, CSS (dark theme matching existing dashboard), HTML

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `tools/dashboard/static/detail.css` | Modify | Phase nav panel styles, responsive collapse at narrow breakpoint |
| `tools/dashboard/static/detail.html` | Modify | Add `#phase-nav-panel` section to sidebar (before metadata-panel) |
| `tools/dashboard/static/detail.js` | Modify | `renderPhaseNav()` function + integration into `window.loadEntity()` |
| `tools/dashboard/static/share.html` | Modify | Add `#phase-nav-panel` section to entity-detail-view sidebar |
| `tools/dashboard/static/share.js` | Modify | Phase nav init in `showEntityDetail()` using DOM scanning for stage reports |

---

### Task 1: Add Phase Nav CSS Styles

**Files:**
- Modify: `tools/dashboard/static/detail.css` (append after line 746, end of `.dag-node-highlighted:hover rect`)

- [ ] **Step 1: Add phase-nav-panel base styles**

Append to `tools/dashboard/static/detail.css`:

```css
/* --- Phase Navigation Panel --- */

.phase-nav-panel {
    background: #161b22;
    border: 1px solid #21262d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
}

.phase-nav-panel h3 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8b949e;
    margin-bottom: 0.75rem;
}

.phase-nav-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.phase-nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    color: #8b949e;
    cursor: pointer;
    transition: background 0.15s;
    text-decoration: none;
}

.phase-nav-item:hover {
    background: #1c2128;
    color: #c9d1d9;
}

.phase-nav-item.current {
    background: rgba(88, 166, 255, 0.1);
    color: #58a6ff;
    font-weight: 600;
}

.phase-nav-item.completed {
    color: #8b949e;
}

.phase-nav-item.gate {
    color: #f0883e;
}

.phase-nav-icon {
    flex-shrink: 0;
    width: 1.2em;
    text-align: center;
    font-size: 0.85em;
}

.phase-nav-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Phase nav collapse toggle (hidden on wide screens) */
.phase-nav-toggle {
    display: none;
    background: none;
    border: none;
    color: #8b949e;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
    margin-left: auto;
}

.phase-nav-toggle:hover {
    color: #c9d1d9;
}
```

- [ ] **Step 2: Add responsive collapse styles**

Continue appending to `tools/dashboard/static/detail.css`:

```css
/* --- Phase Nav Responsive Collapse --- */

@media (max-width: 768px) {
    .phase-nav-toggle {
        display: inline-block;
    }

    .phase-nav-list.collapsed {
        display: none;
    }

    .phase-nav-panel h3 {
        display: flex;
        align-items: center;
        cursor: pointer;
    }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git add tools/dashboard/static/detail.css
git commit -m "feat(dashboard): add phase navigation CSS styles with responsive collapse"
```

---

### Task 2: Add Phase Nav HTML to Detail Page

**Files:**
- Modify: `tools/dashboard/static/detail.html:33` (insert before `<section class="metadata-panel">`)

- [ ] **Step 1: Insert phase-nav-panel section in sidebar**

In `tools/dashboard/static/detail.html`, find this block inside `<aside class="detail-sidebar">` (line 33-34):

```html
        <aside class="detail-sidebar">
            <section class="metadata-panel">
```

Insert the phase nav panel between `<aside class="detail-sidebar">` and `<section class="metadata-panel">`:

```html
        <aside class="detail-sidebar">
            <section class="phase-nav-panel" id="phase-nav-panel" style="display:none;">
                <h3>Phases <button class="phase-nav-toggle" id="phase-nav-toggle" aria-label="Toggle phase list"></button></h3>
                <ul class="phase-nav-list" id="phase-nav-list">
                    <!-- Phase items rendered by detail.js -->
                </ul>
            </section>

            <section class="metadata-panel">
```

Note: The toggle button text content is set by JS (`\u25BC` / `\u25B6` characters).

- [ ] **Step 2: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git add tools/dashboard/static/detail.html
git commit -m "feat(dashboard): add phase navigation panel HTML to detail sidebar"
```

---

### Task 3: Implement renderPhaseNav() in Detail Page JS

**Files:**
- Modify: `tools/dashboard/static/detail.js`

This is the core task. `renderPhaseNav()` derives each stage's status and renders clickable items. It integrates into the existing `window.loadEntity()` inside the gate review IIFE (line 1108-1138), which already has access to `workflowStages` and `data.stage_reports`.

- [ ] **Step 1: Add renderPhaseNav() function**

In `tools/dashboard/static/detail.js`, find the gate review IIFE's `// --- Initialize ---` comment (line 1106). Insert the `renderPhaseNav()` function BEFORE that comment (after the `submitReply` / `click` listener block ending around line 1104):

```javascript
  // --- Phase Navigation ---

  function renderPhaseNav(stages, stageReports, entityStatus) {
    var panel = document.getElementById('phase-nav-panel');
    var list = document.getElementById('phase-nav-list');
    if (!panel || !list || !stages || !stages.length) {
      if (panel) panel.style.display = 'none';
      return;
    }

    // Build set of completed stage names from stage_reports
    var completedStages = {};
    if (stageReports && stageReports.length) {
      for (var i = 0; i < stageReports.length; i++) {
        completedStages[stageReports[i].stage] = true;
      }
    }

    while (list.firstChild) list.removeChild(list.firstChild);

    for (var i = 0; i < stages.length; i++) {
      var stage = stages[i];
      var isCurrent = stage.name === entityStatus;
      var isCompleted = !!completedStages[stage.name];
      var isGate = !!stage.gate;

      // Determine status: completed > current > gate (pending) > pending
      var icon, statusClass;
      if (isCompleted) {
        icon = '\u2705'; // check mark
        statusClass = 'completed';
      } else if (isCurrent) {
        icon = '\uD83D\uDD35'; // blue circle
        statusClass = 'current';
      } else if (isGate) {
        icon = '\uD83D\uDD36'; // orange diamond
        statusClass = 'gate';
      } else {
        icon = '\u2B1C'; // white square
        statusClass = 'pending';
      }

      var li = document.createElement('li');
      li.className = 'phase-nav-item ' + statusClass;
      li.setAttribute('data-stage', stage.name);

      var iconSpan = document.createElement('span');
      iconSpan.className = 'phase-nav-icon';
      iconSpan.textContent = icon;
      li.appendChild(iconSpan);

      var label = document.createElement('span');
      label.className = 'phase-nav-label';
      label.textContent = stage.name;
      li.appendChild(label);

      // Click handler: scroll to corresponding stage report card
      (function (stageName) {
        li.addEventListener('click', function () {
          // Find matching stage-report-card by heading text
          var cards = document.querySelectorAll('.stage-report-card h3');
          for (var c = 0; c < cards.length; c++) {
            if (cards[c].textContent.indexOf(stageName) !== -1) {
              cards[c].parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              // Brief highlight flash
              cards[c].parentElement.style.outline = '2px solid #58a6ff';
              setTimeout(function () {
                cards[c].parentElement.style.outline = '';
              }, 1500);
              return;
            }
          }
          // If no stage report exists yet (pending/gate), scroll to stage-reports section
          var reportsSection = document.getElementById('stage-reports');
          if (reportsSection) {
            reportsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      })(stage.name);

      list.appendChild(li);
    }

    panel.style.display = '';

    // Setup responsive toggle
    setupPhaseNavToggle();
  }

  function setupPhaseNavToggle() {
    var toggle = document.getElementById('phase-nav-toggle');
    var list = document.getElementById('phase-nav-list');
    if (!toggle || !list) return;

    // Set initial toggle arrow text
    toggle.textContent = '\u25BC'; // down-pointing triangle

    // Remove previous listener by cloning
    var newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);

    newToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isCollapsed = list.classList.toggle('collapsed');
      newToggle.textContent = isCollapsed ? '\u25B6' : '\u25BC';
    });

    // Also allow clicking the h3 header to toggle on mobile
    var heading = newToggle.parentNode;
    if (heading && heading.tagName === 'H3') {
      heading.addEventListener('click', function () {
        newToggle.click();
      });
    }
  }
```

- [ ] **Step 2: Integrate renderPhaseNav into window.loadEntity()**

In `tools/dashboard/static/detail.js`, find the `window.loadEntity` function (line 1109-1138). After the gate panel update block, add the phase nav call. Specifically, find these lines inside `window.loadEntity`:

```javascript
        var entityStatus = data.frontmatter.status;
        if (workflowStages) {
          updateGatePanel(entityStatus, workflowStages);
        } else {
          fetchWorkflowStages().then(function (stages) {
            updateGatePanel(entityStatus, stages);
          });
        }
```

Replace with:

```javascript
        var entityStatus = data.frontmatter.status;
        if (workflowStages) {
          updateGatePanel(entityStatus, workflowStages);
          renderPhaseNav(workflowStages, data.stage_reports, entityStatus);
        } else {
          fetchWorkflowStages().then(function (stages) {
            updateGatePanel(entityStatus, stages);
            renderPhaseNav(stages, data.stage_reports, entityStatus);
          });
        }
```

- [ ] **Step 3: Add renderPhaseNav to initial load path**

In the same IIFE, find the initial load block (line 1142-1150):

```javascript
  if (entityPath) {
    fetchWorkflowStages().then(function (stages) {
      if (!stages) return;
      apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function (data) {
          updateGatePanel(data.frontmatter.status, stages);
        });
    });
  }
```

Replace with:

```javascript
  if (entityPath) {
    fetchWorkflowStages().then(function (stages) {
      if (!stages) return;
      apiFetch('/api/entity/detail?path=' + encodeURIComponent(entityPath))
        .then(function (data) {
          updateGatePanel(data.frontmatter.status, stages);
          renderPhaseNav(stages, data.stage_reports, data.frontmatter.status);
        });
    });
  }
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation/tools/dashboard
bun test
```

Expected: All 83 tests pass (no backend changes, no test regressions).

- [ ] **Step 5: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git add tools/dashboard/static/detail.js
git commit -m "feat(dashboard): implement renderPhaseNav() with status derivation and scroll-to-section"
```

---

### Task 4: Add Phase Nav HTML to Share Page

**Files:**
- Modify: `tools/dashboard/static/share.html:73-77` (insert phase nav panel into entity-detail-view sidebar)

- [ ] **Step 1: Insert phase-nav-panel in share page sidebar**

In `tools/dashboard/static/share.html`, find the entity-detail-view sidebar (line 77):

```html
                <aside class="detail-sidebar">
                    <section class="comments-panel" id="comments-panel">
```

Insert the phase nav panel before the comments panel:

```html
                <aside class="detail-sidebar">
                    <section class="phase-nav-panel" id="phase-nav-panel" style="display:none;">
                        <h3>Phases <button class="phase-nav-toggle" id="phase-nav-toggle" aria-label="Toggle phase list"></button></h3>
                        <ul class="phase-nav-list" id="phase-nav-list">
                            <!-- Phase items rendered by share.js -->
                        </ul>
                    </section>

                    <section class="comments-panel" id="comments-panel">
```

- [ ] **Step 2: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git add tools/dashboard/static/share.html
git commit -m "feat(dashboard): add phase navigation panel HTML to share page sidebar"
```

---

### Task 5: Implement Phase Nav in Share Page JS

**Files:**
- Modify: `tools/dashboard/static/share.js`

The share page doesn't have `stage_reports` from the API. Instead, we scan the rendered DOM for `h2` elements containing "Stage Report:" to derive which stages are completed. The `gateWorkflowStages` variable (set at line 605) provides the stage definitions.

- [ ] **Step 1: Add renderPhaseNavShare() function**

In `tools/dashboard/static/share.js`, find the `showEntityDetail()` function (line 106). Insert the phase nav function BEFORE `showEntityDetail`:

```javascript
  // --- Phase Navigation (Share Page) ---

  function renderPhaseNavShare(stages, entityStatus) {
    var panel = document.getElementById('phase-nav-panel');
    var list = document.getElementById('phase-nav-list');
    if (!panel || !list || !stages || !stages.length) {
      if (panel) panel.style.display = 'none';
      return;
    }

    // Scan DOM for completed stage names from h2 "Stage Report: xxx" headings
    var completedStages = {};
    var headings = document.getElementById('entity-body').querySelectorAll('h2');
    for (var h = 0; h < headings.length; h++) {
      var text = headings[h].textContent || '';
      var match = text.match(/^Stage Report:\s*(.+)/);
      if (match) {
        completedStages[match[1].trim()] = true;
      }
    }

    while (list.firstChild) list.removeChild(list.firstChild);

    for (var i = 0; i < stages.length; i++) {
      var stage = stages[i];
      var isCurrent = stage.name === entityStatus;
      var isCompleted = !!completedStages[stage.name];
      var isGate = !!stage.gate;

      var icon, statusClass;
      if (isCompleted) {
        icon = '\u2705';
        statusClass = 'completed';
      } else if (isCurrent) {
        icon = '\uD83D\uDD35';
        statusClass = 'current';
      } else if (isGate) {
        icon = '\uD83D\uDD36';
        statusClass = 'gate';
      } else {
        icon = '\u2B1C';
        statusClass = 'pending';
      }

      var li = document.createElement('li');
      li.className = 'phase-nav-item ' + statusClass;
      li.setAttribute('data-stage', stage.name);

      var iconSpan = document.createElement('span');
      iconSpan.className = 'phase-nav-icon';
      iconSpan.textContent = icon;
      li.appendChild(iconSpan);

      var label = document.createElement('span');
      label.className = 'phase-nav-label';
      label.textContent = stage.name;
      li.appendChild(label);

      (function (stageName) {
        li.addEventListener('click', function () {
          var bodyHeadings = document.getElementById('entity-body').querySelectorAll('h2');
          for (var c = 0; c < bodyHeadings.length; c++) {
            if (bodyHeadings[c].textContent.indexOf('Stage Report:') !== -1 &&
                bodyHeadings[c].textContent.indexOf(stageName) !== -1) {
              bodyHeadings[c].scrollIntoView({ behavior: 'smooth', block: 'start' });
              bodyHeadings[c].style.outline = '2px solid #58a6ff';
              setTimeout(function () {
                bodyHeadings[c].style.outline = '';
              }, 1500);
              return;
            }
          }
        });
      })(stage.name);

      list.appendChild(li);
    }

    panel.style.display = '';
    setupPhaseNavToggleShare();
  }

  function setupPhaseNavToggleShare() {
    var toggle = document.getElementById('phase-nav-toggle');
    var list = document.getElementById('phase-nav-list');
    if (!toggle || !list) return;

    toggle.textContent = '\u25BC';

    var newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);

    newToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isCollapsed = list.classList.toggle('collapsed');
      newToggle.textContent = isCollapsed ? '\u25B6' : '\u25BC';
    });

    var heading = newToggle.parentNode;
    if (heading && heading.tagName === 'H3') {
      heading.addEventListener('click', function () {
        newToggle.click();
      });
    }
  }
```

- [ ] **Step 2: Call renderPhaseNavShare from showEntityDetail()**

In `tools/dashboard/static/share.js`, find the `showEntityDetail` function (line 106-139). After the body rendering and before `loadComments(path)` (around line 120), insert the phase nav call. Find:

```javascript
    loadComments(path);
    setupCommentTooltip(path);
```

Insert BEFORE those lines:

```javascript
    // Render phase nav — needs body rendered first for DOM scanning
    if (gateWorkflowStages) {
      renderPhaseNavShare(gateWorkflowStages, data.frontmatter && data.frontmatter.status);
    } else {
      // Fetch stages if not yet loaded (checkGateStatus will also fetch, but we need them now)
      fetch("/api/workflows")
        .then(function (res) { return res.json(); })
        .then(function (workflows) {
          var stages = null;
          for (var i = 0; i < workflows.length; i++) {
            var wf = workflows[i];
            for (var j = 0; j < wf.entities.length; j++) {
              if (wf.entities[j].path === path) {
                stages = wf.stages;
                break;
              }
            }
            if (stages) break;
          }
          if (stages) {
            gateWorkflowStages = stages;
            renderPhaseNavShare(stages, data.frontmatter && data.frontmatter.status);
          }
        });
    }

    loadComments(path);
    setupCommentTooltip(path);
```

- [ ] **Step 3: Hide phase nav when returning to entity list**

In `tools/dashboard/static/share.js`, find the back-to-list handler (line 134-138):

```javascript
    document.getElementById("back-to-list").onclick = function () {
      detailView.style.display = "none";
      document.getElementById("entity-list").style.display = "block";
      resetGatePanel();
    };
```

Add phase nav cleanup:

```javascript
    document.getElementById("back-to-list").onclick = function () {
      detailView.style.display = "none";
      document.getElementById("entity-list").style.display = "block";
      resetGatePanel();
      var phasePanel = document.getElementById('phase-nav-panel');
      if (phasePanel) phasePanel.style.display = 'none';
    };
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation/tools/dashboard
bun test
```

Expected: All 83 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git add tools/dashboard/static/share.js tools/dashboard/static/share.html
git commit -m "feat(dashboard): implement phase navigation on share page with DOM-based stage detection"
```

---

### Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation/tools/dashboard
bun test
```

Expected: All 83 tests pass.

- [ ] **Step 2: Type-check (if applicable)**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation/tools/dashboard
bunx tsc --noEmit 2>/dev/null || echo "No tsconfig for static JS — skip"
```

Expected: No errors, or skip (static JS files aren't type-checked).

- [ ] **Step 3: Verify git status is clean**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-phase-navigation
git status
git log --oneline -5
```

Expected: Clean working tree, 5 commits from this feature on branch `spacedock-ensign/dashboard-phase-navigation`.

---

## Acceptance Criteria Traceability

| Criteria | Task |
|----------|------|
| Entity detail page shows phase nav panel (all workflow stages) | Task 2 (HTML) + Task 3 (JS) |
| Each phase shows status icon (completed/current/pending/gate) | Task 3 (renderPhaseNav status derivation) |
| Click phase scrolls to Stage Report section | Task 3 (click handler with scrollIntoView) |
| Current phase highlighted | Task 1 (.current class) + Task 3 (statusClass) |
| Gate phases have visual distinction | Task 1 (.gate class with #f0883e) + Task 3 (gate icon) |
| Nav panel collapses on narrow screens | Task 1 (@media 768px) + Task 3 (setupPhaseNavToggle) |
| Share page also has phase navigation | Task 4 (HTML) + Task 5 (JS with DOM scanning) |
