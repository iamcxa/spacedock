# Dashboard Dependency Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured `depends-on` frontmatter field, blocked detection in the status script, dependency badges in the entity table, and a DAG mini-graph on the detail page.

**Architecture:** Three layers -- (1) a `parseDependsOn()` utility parses `depends-on: [007, 016]` string into `number[]`, used by both the Python status script (5th dispatch rule) and the TypeScript dashboard; (2) the entity table in `app.js` gains a DEPS column with badges showing dependency status (clear/blocked); (3) the detail page gets a `dependency-graph.js` module implementing simplified Sugiyama layered layout (topological sort + median heuristic) rendered with SVG helpers reused from `visualizer.js`. All entity data already flows through `/api/workflows` -- no new API endpoints needed.

**Tech Stack:** Bun (server + test runner), vanilla JS (frontend SVG), TypeScript (backend parsing), Python 3 stdlib (status script)

---

## Research Corrections (MUST follow)

1. **Do NOT reuse `buildLayout()` from `visualizer.js`** -- it positions nodes on a single horizontal line and has no concept of multiple layers or arbitrary parent-child relationships. Create a NEW `buildDependencyLayout()` function. DO reuse: `svgEl()`, `svgText()`, arrow rendering helpers, color conventions.
2. **DAG layout is ~100-150 lines of custom JS** -- implement simplified Sugiyama: (a) topological sort for layer assignment, (b) median heuristic for ordering within layers, (c) straight-line edges with existing arrow helpers. This is non-trivial but feasible for <30 nodes.

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `tools/dashboard/src/parsing.ts` | Add `parseDependsOn()` utility |
| Modify | `tools/dashboard/src/parsing.test.ts` | Tests for `parseDependsOn()` |
| Modify | `skills/commission/bin/status` | Add 5th dispatch rule: dependency check |
| Modify | `tests/test_status_script.py` | Tests for dependency-based dispatch filtering |
| Modify | `tools/dashboard/static/app.js` | Add DEPS column with badges + tooltip |
| Create | `tools/dashboard/static/dependency-graph.js` | DAG layout engine + SVG renderer |
| Modify | `tools/dashboard/static/detail.js` | Integrate dependency graph into detail page |
| Modify | `tools/dashboard/static/detail.html` | Add dependency graph container + script tag |
| Modify | `tools/dashboard/static/detail.css` | Dependency graph section styling |

---

### Task 1: Add `parseDependsOn()` utility -- failing test

**Files:**
- Test: `tools/dashboard/src/parsing.test.ts`
- Modify: `tools/dashboard/src/parsing.ts`

- [ ] **Step 1: Write the failing tests for `parseDependsOn`**

Add this test block at the end of `tools/dashboard/src/parsing.test.ts`:

```typescript
import { parseDependsOn } from "./parsing";

describe("parseDependsOn", () => {
  test("parses bracket-wrapped ID list", () => {
    expect(parseDependsOn("[007, 016]")).toEqual([7, 16]);
  });

  test("parses single ID", () => {
    expect(parseDependsOn("[003]")).toEqual([3]);
  });

  test("returns empty array for empty string", () => {
    expect(parseDependsOn("")).toEqual([]);
  });

  test("returns empty array for undefined", () => {
    expect(parseDependsOn(undefined)).toEqual([]);
  });

  test("handles no brackets (bare numbers)", () => {
    expect(parseDependsOn("007, 016")).toEqual([7, 16]);
  });

  test("handles whitespace variations", () => {
    expect(parseDependsOn("[ 007 , 016 ]")).toEqual([7, 16]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tools/dashboard && bun test src/parsing.test.ts`
Expected: FAIL -- `parseDependsOn` is not exported from `./parsing`

- [ ] **Step 3: Implement `parseDependsOn` in `parsing.ts`**

Add this function at the end of `tools/dashboard/src/parsing.ts`, before the closing:

```typescript
/**
 * Parse a depends-on frontmatter value like "[007, 016]" into number[].
 * Returns empty array if the value is empty/undefined.
 */
export function parseDependsOn(raw: string | undefined): number[] {
  if (!raw) return [];
  const matches = raw.match(/\d+/g);
  if (!matches) return [];
  return matches.map(Number);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tools/dashboard && bun test src/parsing.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph
git add tools/dashboard/src/parsing.ts tools/dashboard/src/parsing.test.ts
git commit -m "feat(dashboard): add parseDependsOn() utility for depends-on frontmatter field"
```

---

### Task 2: Add dependency-based dispatch rule to Python status script -- failing test

**Files:**
- Test: `tests/test_status_script.py`
- Modify: `skills/commission/bin/status`

- [ ] **Step 1: Write the failing test for dependency filtering**

Add these test methods to the test class in `tests/test_status_script.py`. Find the existing test class (it uses `unittest.TestCase`) and add inside it:

```python
def test_next_excludes_entities_with_unmet_dependencies(self):
    """Entities whose depends-on targets are not shipped should not be dispatchable."""
    with tempfile.TemporaryDirectory() as tmpdir:
        make_pipeline(tmpdir, README_WITH_STAGES, entities={
            'entity-a.md': textwrap.dedent("""\
                ---
                id: 001
                status: backlog
                title: Entity A
                score: 0.9
                source: test
                worktree:
                ---
                """),
            'entity-b.md': textwrap.dedent("""\
                ---
                id: 002
                status: backlog
                title: Entity B
                score: 0.8
                source: test
                depends-on: [001]
                worktree:
                ---
                """),
        })
        script_path = build_status_script(tmpdir)
        result = run_status(tmpdir, '--next', script_path=script_path)
        lines = result.stdout.strip().split('\n')
        slugs = [l.split()[1] for l in lines[2:] if l.strip()]
        self.assertIn('entity-a', slugs)
        self.assertNotIn('entity-b', slugs)

def test_next_includes_entities_with_all_deps_shipped(self):
    """Entities whose depends-on targets are all shipped should be dispatchable."""
    with tempfile.TemporaryDirectory() as tmpdir:
        make_pipeline(tmpdir, README_WITH_STAGES, entities={
            'entity-b.md': textwrap.dedent("""\
                ---
                id: 002
                status: backlog
                title: Entity B
                score: 0.8
                source: test
                depends-on: [001]
                worktree:
                ---
                """),
        }, archived={
            'entity-a.md': textwrap.dedent("""\
                ---
                id: 001
                status: done
                title: Entity A
                score: 0.9
                source: test
                worktree:
                ---
                """),
        })
        script_path = build_status_script(tmpdir)
        # Need to include archived to resolve deps
        result = run_status(tmpdir, '--next', '--archived', script_path=script_path)
        lines = result.stdout.strip().split('\n')
        slugs = [l.split()[1] for l in lines[2:] if l.strip()]
        self.assertIn('entity-b', slugs)

def test_next_no_depends_on_still_dispatchable(self):
    """Entities without depends-on field should be unaffected."""
    with tempfile.TemporaryDirectory() as tmpdir:
        make_pipeline(tmpdir, README_WITH_STAGES, entities={
            'entity-c.md': textwrap.dedent("""\
                ---
                id: 003
                status: backlog
                title: Entity C
                score: 0.7
                source: test
                worktree:
                ---
                """),
        })
        script_path = build_status_script(tmpdir)
        result = run_status(tmpdir, '--next', script_path=script_path)
        lines = result.stdout.strip().split('\n')
        slugs = [l.split()[1] for l in lines[2:] if l.strip()]
        self.assertIn('entity-c', slugs)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && python3 -m pytest tests/test_status_script.py -v -k "depends"`
Expected: FAIL -- `entity-b` appears in dispatchable list when it should not

- [ ] **Step 3: Implement the 5th dispatch rule in the status script**

In `skills/commission/bin/status`, modify the `print_next_table` function. After the existing `if e['worktree']:` check (line 251) and before the `if stage_idx + 1 >= len(stage_names):` check (line 253), add the dependency check.

First, add a helper function to parse depends-on, before `print_next_table`:

```python
def parse_depends_on(value):
    """Parse depends-on field like '[007, 016]' into list of int IDs."""
    if not value:
        return []
    import re
    matches = re.findall(r'\d+', value)
    return [int(m) for m in matches]
```

Then in `print_next_table`, build an ID-to-status lookup from all entities, and add the 5th rule. Replace the function with:

```python
def print_next_table(entities, stages):
    """Print the --next dispatchable entities table."""
    stage_by_name = {s['name']: s for s in stages}
    stage_names = [s['name'] for s in stages]
    terminal_stages = {s['name'] for s in stages if s.get('terminal', False)}

    # Build ID-to-status map for dependency resolution
    id_to_status = {}
    for e in entities:
        eid = e.get('id', '')
        if eid:
            try:
                id_to_status[int(eid)] = e['status']
            except ValueError:
                pass

    active_counts = {}
    for e in entities:
        if e['worktree']:
            st = e['status']
            active_counts[st] = active_counts.get(st, 0) + 1

    candidates = sorted(entities, key=sort_key_next)
    next_stage_counts = dict(active_counts)
    dispatchable = []
    for e in candidates:
        status = e['status']
        if status not in stage_by_name:
            continue
        stage_idx = stage_names.index(status)
        stage = stage_by_name[status]
        if stage.get('terminal', False):
            continue
        if stage.get('gate', False):
            continue
        if e['worktree']:
            continue
        # Rule 5: dependency check — all depends-on IDs must be in terminal stages
        dep_ids = parse_depends_on(e.get('depends-on', ''))
        if dep_ids:
            all_met = True
            for dep_id in dep_ids:
                dep_status = id_to_status.get(dep_id)
                if dep_status is None or dep_status not in terminal_stages:
                    all_met = False
                    break
            if not all_met:
                continue
        if stage_idx + 1 >= len(stage_names):
            continue
        next_stage_name = stage_names[stage_idx + 1]
        next_stage = stage_by_name[next_stage_name]
        current_count = next_stage_counts.get(next_stage_name, 0)
        if current_count >= next_stage['concurrency']:
            continue
        next_stage_counts[next_stage_name] = current_count + 1
        dispatchable.append({
            **e,
            'next': next_stage_name,
            'next_worktree': 'yes' if next_stage['worktree'] else 'no',
        })

    fmt = '%-6s %-30s %-20s %-20s %s'
    print(fmt % ('ID', 'SLUG', 'CURRENT', 'NEXT', 'WORKTREE'))
    print(fmt % ('--', '----', '-------', '----', '--------'))
    for e in dispatchable:
        print(fmt % (e['id'], e['slug'], e['status'], e['next'], e['next_worktree']))
```

Also update `main()` so that when `--next` is used with `--archived`, archived entities are included for dependency resolution. The current code already does this -- `scan_entities` on archive dir appends to the same `entities` list. No change needed there.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && python3 -m pytest tests/test_status_script.py -v -k "depends"`
Expected: All 3 dependency tests PASS

- [ ] **Step 5: Run all status tests to confirm no regressions**

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && python3 -m pytest tests/test_status_script.py -v`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph
git add skills/commission/bin/status tests/test_status_script.py
git commit -m "feat(status): add 5th dispatch rule — filter entities with unmet depends-on"
```

---

### Task 3: Add dependency badges to entity table in `app.js`

**Files:**
- Modify: `tools/dashboard/static/app.js`

This task adds a DEPS column to the entity table showing dependency status. The `/api/workflows` endpoint already returns all entity frontmatter including `depends-on`, so no backend changes needed.

- [ ] **Step 1: Add `parseDependsOn` helper and dependency status resolver to `app.js`**

Add these functions inside the IIFE in `tools/dashboard/static/app.js`, after the `statusColor` function (after line 74):

```javascript
  function parseDependsOn(raw) {
    if (!raw) return [];
    var matches = raw.match(/\d+/g);
    if (!matches) return [];
    return matches.map(Number);
  }

  function depStatus(entity, allEntities) {
    var deps = parseDependsOn(entity["depends-on"]);
    if (deps.length === 0) return { status: "none", deps: [] };
    var idToEntity = {};
    allEntities.forEach(function (e) {
      var eid = parseInt(e.id, 10);
      if (!isNaN(eid)) idToEntity[eid] = e;
    });
    var resolved = [];
    var blocked = false;
    deps.forEach(function (depId) {
      var dep = idToEntity[depId];
      var depName = dep ? (dep.title || dep.slug) : ("entity " + depId);
      var depSt = dep ? dep.status : "unknown";
      var done = depSt === "shipped" || depSt === "done";
      resolved.push({ id: depId, name: depName, status: depSt, done: done });
      if (!done) blocked = true;
    });
    return { status: blocked ? "blocked" : "clear", deps: resolved };
  }
```

- [ ] **Step 2: Add DEPS column to the entity table**

In the `render` function, find the `columns` array definition at line 221:

```javascript
        var columns = ["id", "slug", "status", "title", "score", "source"];
```

Change it to:

```javascript
        var columns = ["id", "slug", "status", "deps", "title", "score", "source"];
```

- [ ] **Step 3: Render the DEPS cell with badge and tooltip**

In the same `render` function, find the cell rendering loop (lines 260-272). Replace the `columns.forEach` block:

```javascript
          columns.forEach(function (col) {
            var val = e[col] || "";
            var td = document.createElement("td");
            if (col === "status" && val) {
              var badge = el("span", { className: "status-badge" });
              badge.style.background = statusColor(val) + "22";
              badge.style.color = statusColor(val);
              badge.textContent = val;
              td.appendChild(badge);
            } else if (col === "deps") {
              var ds = depStatus(e, wf.entities);
              if (ds.status === "none") {
                td.textContent = "";
              } else {
                var depBadge = el("span", { className: "status-badge dep-badge dep-" + ds.status });
                if (ds.status === "blocked") {
                  depBadge.style.background = "#f8514922";
                  depBadge.style.color = "#f85149";
                  depBadge.textContent = "\u26D4 blocked";
                } else {
                  depBadge.style.background = "#3fb95022";
                  depBadge.style.color = "#3fb950";
                  depBadge.textContent = "\u2705 clear";
                }
                var tooltipLines = ds.deps.map(function (d) {
                  return (d.done ? "\u2713" : "\u2717") + " #" + String(d.id).padStart(3, "0") + " " + d.name + " (" + d.status + ")";
                });
                depBadge.title = tooltipLines.join("\n");
                td.appendChild(depBadge);
              }
            } else {
              td.textContent = val;
            }
            row.appendChild(td);
          });
```

- [ ] **Step 4: Verify manually**

Start the dashboard and verify the DEPS column appears in the entity table. Entities without `depends-on` show blank. Entities with `depends-on` show a colored badge with hover tooltip.

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph/tools/dashboard && bun run src/server.ts --port 3001`

- [ ] **Step 5: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph
git add tools/dashboard/static/app.js
git commit -m "feat(dashboard): add DEPS column with blocked/clear badges to entity table"
```

---

### Task 4: Create DAG layout engine -- `dependency-graph.js`

**Files:**
- Create: `tools/dashboard/static/dependency-graph.js`

This is the core DAG visualization module (~130 lines). It reuses `svgEl` and `svgText` from `visualizer.js` (exposed via `window.SpacedockVisualizer` -- but since they are not exported individually, we define local equivalents that match the same style).

- [ ] **Step 1: Create `dependency-graph.js` with the complete DAG layout and rendering engine**

Create `tools/dashboard/static/dependency-graph.js`:

```javascript
/**
 * Dependency DAG visualizer — simplified Sugiyama layout, pure SVG.
 * Renders entity dependencies as a layered directed graph.
 * Reuses color/style conventions from visualizer.js but implements
 * its own DAG-specific layout algorithm.
 */
(function (window) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var NODE_W = 140;
  var NODE_H = 36;
  var LAYER_GAP_X = 80;
  var NODE_GAP_Y = 24;
  var PADDING = 24;
  var ARROW_SIZE = 5;

  // --- SVG helpers (match visualizer.js conventions) ---

  function svgEl(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        el.setAttribute(k, String(attrs[k]));
      });
    }
    return el;
  }

  function svgText(x, y, text, attrs) {
    var t = svgEl("text", Object.assign({
      x: x, y: y,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace",
      "font-size": "10",
      fill: "#c9d1d9",
    }, attrs || {}));
    t.textContent = text;
    return t;
  }

  // --- DAG helpers ---

  function parseDependsOn(raw) {
    if (!raw) return [];
    var matches = raw.match(/\d+/g);
    if (!matches) return [];
    return matches.map(Number);
  }

  /**
   * Build adjacency from entities. Returns { nodes, edges, idToIdx }.
   * Only includes entities that participate in dependency relationships.
   */
  function buildGraph(entities) {
    var idToEntity = {};
    entities.forEach(function (e) {
      var eid = parseInt(e.id, 10);
      if (!isNaN(eid)) idToEntity[eid] = e;
    });

    // Collect all IDs that appear in any depends-on relationship
    var participatingIds = new Set();
    entities.forEach(function (e) {
      var deps = parseDependsOn(e["depends-on"]);
      if (deps.length > 0) {
        var eid = parseInt(e.id, 10);
        if (!isNaN(eid)) participatingIds.add(eid);
        deps.forEach(function (d) { participatingIds.add(d); });
      }
    });

    if (participatingIds.size === 0) return null;

    var ids = Array.from(participatingIds).sort(function (a, b) { return a - b; });
    var idToIdx = {};
    var nodes = [];
    ids.forEach(function (id, idx) {
      idToIdx[id] = idx;
      var ent = idToEntity[id];
      nodes.push({
        id: id,
        idx: idx,
        label: ent ? ("#" + String(id).padStart(3, "0")) : ("#" + String(id).padStart(3, "0") + "?"),
        title: ent ? (ent.title || ent.slug) : "unknown",
        status: ent ? ent.status : "unknown",
        x: 0,
        y: 0,
      });
    });

    // Edges: from dependency TO dependent (dependency must complete first)
    var edges = [];
    entities.forEach(function (e) {
      var deps = parseDependsOn(e["depends-on"]);
      var eid = parseInt(e.id, 10);
      if (isNaN(eid) || idToIdx[eid] === undefined) return;
      deps.forEach(function (depId) {
        if (idToIdx[depId] !== undefined) {
          edges.push({ from: idToIdx[depId], to: idToIdx[eid] });
        }
      });
    });

    return { nodes: nodes, edges: edges, idToIdx: idToIdx };
  }

  /**
   * Simplified Sugiyama layer assignment via topological sort.
   * Each node's layer = max(layer of all parents) + 1.
   * Roots (no incoming edges) get layer 0.
   */
  function assignLayers(nodes, edges) {
    var inDegree = new Array(nodes.length).fill(0);
    var children = nodes.map(function () { return []; });
    var parents = nodes.map(function () { return []; });

    edges.forEach(function (e) {
      inDegree[e.to]++;
      children[e.from].push(e.to);
      parents[e.to].push(e.from);
    });

    // Kahn's algorithm for topological order
    var queue = [];
    var layers = new Array(nodes.length).fill(0);
    for (var i = 0; i < nodes.length; i++) {
      if (inDegree[i] === 0) queue.push(i);
    }

    while (queue.length > 0) {
      var curr = queue.shift();
      children[curr].forEach(function (child) {
        var newLayer = layers[curr] + 1;
        if (newLayer > layers[child]) layers[child] = newLayer;
        inDegree[child]--;
        if (inDegree[child] === 0) queue.push(child);
      });
    }

    return layers;
  }

  /**
   * Order nodes within each layer using median heuristic.
   * Reduces edge crossings by positioning each node at the median
   * of its parents' positions in the previous layer.
   */
  function orderWithinLayers(nodes, edges, layers) {
    var maxLayer = 0;
    layers.forEach(function (l) { if (l > maxLayer) maxLayer = l; });

    var layerNodes = [];
    for (var l = 0; l <= maxLayer; l++) {
      layerNodes.push([]);
    }
    nodes.forEach(function (node, idx) {
      layerNodes[layers[idx]].push(idx);
    });

    // Build parent lookup
    var parentOf = nodes.map(function () { return []; });
    edges.forEach(function (e) {
      parentOf[e.to].push(e.from);
    });

    // Median heuristic: for each layer (starting from 1), sort nodes
    // by the median position of their parents in the previous layer
    for (var l = 1; l <= maxLayer; l++) {
      var prevPositions = {};
      layerNodes[l - 1].forEach(function (nodeIdx, pos) {
        prevPositions[nodeIdx] = pos;
      });

      layerNodes[l].sort(function (a, b) {
        var aParents = parentOf[a].map(function (p) { return prevPositions[p] || 0; });
        var bParents = parentOf[b].map(function (p) { return prevPositions[p] || 0; });
        var aMedian = aParents.length > 0 ? aParents.sort()[Math.floor(aParents.length / 2)] : 0;
        var bMedian = bParents.length > 0 ? bParents.sort()[Math.floor(bParents.length / 2)] : 0;
        return aMedian - bMedian;
      });
    }

    return layerNodes;
  }

  /**
   * Assign x,y coordinates to nodes based on layers.
   * Layout flows left-to-right: layer determines x, position within layer determines y.
   */
  function positionNodes(nodes, layerNodes) {
    var maxNodesInLayer = 0;
    layerNodes.forEach(function (layer) {
      if (layer.length > maxNodesInLayer) maxNodesInLayer = layer.length;
    });

    layerNodes.forEach(function (layer, layerIdx) {
      var layerHeight = layer.length * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y;
      var totalHeight = maxNodesInLayer * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y;
      var offsetY = (totalHeight - layerHeight) / 2;

      layer.forEach(function (nodeIdx, posInLayer) {
        nodes[nodeIdx].x = PADDING + layerIdx * (NODE_W + LAYER_GAP_X) + NODE_W / 2;
        nodes[nodeIdx].y = PADDING + offsetY + posInLayer * (NODE_H + NODE_GAP_Y) + NODE_H / 2;
      });
    });

    var totalW = PADDING * 2 + layerNodes.length * NODE_W + Math.max(0, layerNodes.length - 1) * LAYER_GAP_X;
    var totalH = PADDING * 2 + maxNodesInLayer * (NODE_H + NODE_GAP_Y) - NODE_GAP_Y;

    return { width: Math.max(totalW, 200), height: Math.max(totalH, 80) };
  }

  // --- Status colors (match app.js conventions) ---

  function nodeColor(status) {
    var colors = {
      shipped: "#3fb950",
      done: "#3fb950",
      backlog: "#8b949e",
      explore: "#d2a8ff",
      research: "#79c0ff",
      plan: "#58a6ff",
      implementation: "#58a6ff",
      validation: "#f0883e",
    };
    return colors[status] || "#8b949e";
  }

  // --- Render functions ---

  function renderDagNode(node, highlightId) {
    var g = svgEl("g", { class: "dag-node", "data-id": node.id });
    var cx = node.x;
    var cy = node.y;
    var color = nodeColor(node.status);
    var isHighlight = node.id === highlightId;

    g.appendChild(svgEl("rect", {
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
      rx: 6,
      fill: isHighlight ? color + "33" : "#161b22",
      stroke: color,
      "stroke-width": isHighlight ? "2" : "1",
    }));

    // Node label: #007 truncated title
    var label = node.label;
    var titleShort = node.title.length > 12 ? node.title.slice(0, 12) + "\u2026" : node.title;
    g.appendChild(svgText(cx, cy - 7, label, {
      fill: color,
      "font-size": "9",
      "font-weight": "600",
    }));
    g.appendChild(svgText(cx, cy + 7, titleShort, {
      fill: "#8b949e",
      "font-size": "9",
    }));

    // Tooltip on hover
    var titleEl = svgEl("title");
    titleEl.textContent = "#" + String(node.id).padStart(3, "0") + " " + node.title + " (" + node.status + ")";
    g.appendChild(titleEl);

    return g;
  }

  function renderDagEdge(fromNode, toNode) {
    var g = svgEl("g", { class: "dag-edge" });
    var x1 = fromNode.x + NODE_W / 2;
    var y1 = fromNode.y;
    var x2 = toNode.x - NODE_W / 2;
    var y2 = toNode.y;

    // Curved path
    var midX = (x1 + x2) / 2;
    var d = "M " + x1 + " " + y1 + " C " + midX + " " + y1 + ", " + midX + " " + y2 + ", " + x2 + " " + y2;

    g.appendChild(svgEl("path", {
      d: d,
      fill: "none",
      stroke: "#21262d",
      "stroke-width": "1.5",
    }));

    // Arrowhead at target
    var arrowPoints = [
      x2 + "," + y2,
      (x2 - ARROW_SIZE) + "," + (y2 - ARROW_SIZE / 2),
      (x2 - ARROW_SIZE) + "," + (y2 + ARROW_SIZE / 2),
    ].join(" ");
    g.appendChild(svgEl("polygon", {
      points: arrowPoints,
      fill: "#21262d",
    }));

    return g;
  }

  /**
   * Main render function.
   * @param {Array} entities - All entities from /api/workflows
   * @param {number|null} highlightId - Current entity ID to highlight (on detail page)
   * @returns {SVGElement|null} - null if no dependencies exist
   */
  function renderDependencyGraph(entities, highlightId) {
    var graph = buildGraph(entities);
    if (!graph) return null;

    var layers = assignLayers(graph.nodes, graph.edges);
    var layerNodes = orderWithinLayers(graph.nodes, graph.edges, layers);
    var size = positionNodes(graph.nodes, layerNodes);

    var svg = svgEl("svg", {
      viewBox: "0 0 " + size.width + " " + size.height,
      class: "dependency-graph-svg",
    });

    // Render edges first (behind nodes)
    graph.edges.forEach(function (edge) {
      svg.appendChild(renderDagEdge(graph.nodes[edge.from], graph.nodes[edge.to]));
    });

    // Render nodes
    graph.nodes.forEach(function (node) {
      svg.appendChild(renderDagNode(node, highlightId));
    });

    return svg;
  }

  // Export
  window.SpacedockDependencyGraph = {
    renderDependencyGraph: renderDependencyGraph,
  };
})(window);
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && node --check tools/dashboard/static/dependency-graph.js`
Expected: No output (syntax OK)

- [ ] **Step 3: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph
git add tools/dashboard/static/dependency-graph.js
git commit -m "feat(dashboard): add DAG layout engine with simplified Sugiyama algorithm"
```

---

### Task 5: Integrate dependency graph into detail page

**Files:**
- Modify: `tools/dashboard/static/detail.html`
- Modify: `tools/dashboard/static/detail.js`
- Modify: `tools/dashboard/static/detail.css`

- [ ] **Step 1: Add dependency graph container and script tag to `detail.html`**

In `tools/dashboard/static/detail.html`, add the dependency graph section inside `<main class="detail-main">`, between the `entity-body` section and the `stage-reports` section (between lines 21 and 22):

```html
            <section id="dependency-graph-section" class="dependency-graph-section" style="display:none;">
                <h3>Dependencies</h3>
                <div id="dependency-graph-container" class="dependency-graph-container">
                </div>
            </section>
```

Also add the script tag before `detail.js` (before line 122):

```html
    <script src="/dependency-graph.js"></script>
```

The result for the script section should be:

```html
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
    <script src="/dependency-graph.js"></script>
    <script src="/detail.js"></script>
```

- [ ] **Step 2: Add `renderDependencySection` to `detail.js`**

In `tools/dashboard/static/detail.js`, add this function after the `renderTags` function (after line 160):

```javascript
function renderDependencySection(frontmatter) {
    var section = document.getElementById('dependency-graph-section');
    var container = document.getElementById('dependency-graph-container');
    while (container.firstChild) container.removeChild(container.firstChild);

    // Need depends-on to show anything
    var hasDeps = frontmatter['depends-on'] && frontmatter['depends-on'].trim();
    if (!hasDeps) {
        section.style.display = 'none';
        return;
    }

    // Fetch all entities to build the graph
    fetch('/api/workflows')
        .then(function (res) { return res.json(); })
        .then(function (workflows) {
            var allEntities = [];
            workflows.forEach(function (wf) {
                wf.entities.forEach(function (e) { allEntities.push(e); });
            });

            var currentId = parseInt(frontmatter.id, 10) || null;
            var svg = window.SpacedockDependencyGraph.renderDependencyGraph(allEntities, currentId);
            if (svg) {
                container.appendChild(svg);
                section.style.display = '';
            } else {
                section.style.display = 'none';
            }
        })
        .catch(function () {
            section.style.display = 'none';
        });
}
```

- [ ] **Step 3: Call `renderDependencySection` from `loadEntity`**

In the `loadEntity` function (line 215-228), add the call after `renderBody`. Find:

```javascript
            renderMetadata(data.frontmatter);
            renderBody(data.body);
            renderStageReports(data.stage_reports);
```

Replace with:

```javascript
            renderMetadata(data.frontmatter);
            renderBody(data.body);
            renderDependencySection(data.frontmatter);
            renderStageReports(data.stage_reports);
```

- [ ] **Step 4: Add CSS styling for the dependency graph section**

Add these styles to the end of `tools/dashboard/static/detail.css`:

```css
/* --- Dependency Graph --- */
.dependency-graph-section {
    margin: 1.5rem 0;
    padding: 1rem;
    border: 1px solid #21262d;
    border-radius: 8px;
    background: #0d1117;
}

.dependency-graph-section h3 {
    margin: 0 0 0.75rem;
    font-size: 0.95rem;
    color: #8b949e;
}

.dependency-graph-container {
    overflow-x: auto;
}

.dependency-graph-svg {
    display: block;
    width: 100%;
    max-height: 300px;
}

.dag-node {
    cursor: default;
}

.dag-node:hover rect {
    stroke-width: 2;
    filter: brightness(1.2);
}
```

- [ ] **Step 5: Verify manually**

Start the dashboard and navigate to an entity detail page for an entity that has `depends-on` in its frontmatter. The dependency graph section should appear between the body and stage reports.

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph/tools/dashboard && bun run src/server.ts --port 3001`

- [ ] **Step 6: Commit**

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph
git add tools/dashboard/static/detail.html tools/dashboard/static/detail.js tools/dashboard/static/detail.css
git commit -m "feat(dashboard): integrate dependency DAG graph into entity detail page"
```

---

### Task 6: Add `depends-on` frontmatter to entity 020 as a test fixture

**Files:**
- Modify: `docs/build-pipeline/dashboard-dependency-graph.md` (this entity file itself -- only the `## Dependencies` section in the body, NOT the frontmatter which is managed by the workflow)

This task is intentionally deferred to the entity author (captain/FO). The feature should work with any entity that has `depends-on` in its frontmatter. For testing during development, you can manually add `depends-on: [007, 016]` to any entity's frontmatter to see the graph in action.

- [ ] **Step 1: Verify backward compatibility**

Confirm that entities without `depends-on` still render normally:
- Entity table: DEPS column shows blank
- Detail page: dependency graph section hidden
- Status `--next`: no change in dispatch logic

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && python3 -m pytest tests/test_status_script.py -v`
Expected: All tests PASS (including new dependency tests from Task 2)

Run: `cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph && cd tools/dashboard && bun test`
Expected: All tests PASS (including new `parseDependsOn` tests from Task 1)

- [ ] **Step 2: Commit (no-op if nothing to commit)**

If no changes needed, skip this step.

---

## Quality Gate

After all tasks complete, run the full test suite:

```bash
cd /Users/kent/Project/spacedock/.worktrees/spacedock-ensign-dashboard-dependency-graph

# TypeScript tests
cd tools/dashboard && bun test && cd ../..

# Python tests
python3 -m pytest tests/test_status_script.py -v

# Syntax check on new JS
node --check tools/dashboard/static/dependency-graph.js
```

All must pass. Then do a manual smoke test: start the dashboard, check entity table DEPS column, and check detail page dependency graph for an entity with `depends-on`.
