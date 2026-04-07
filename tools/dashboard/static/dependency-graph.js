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
   * Filter entities to a subgraph relevant to a given entity:
   *   - the entity itself
   *   - direct parents (entities the given entity depends on, depth 1)
   *   - direct children (entities that depend on the given entity, depth 1)
   * Returns the filtered entity list. Each returned entity keeps its
   * original `depends-on` field, but the renderer will only build edges
   * between entities present in the filtered set.
   */
  function filterSubgraph(entities, focusId) {
    if (focusId === null || focusId === undefined) return entities;
    var idToEntity = {};
    entities.forEach(function (e) {
      var eid = parseInt(e.id, 10);
      if (!isNaN(eid)) idToEntity[eid] = e;
    });
    var focus = idToEntity[focusId];
    if (!focus) return [];

    var keep = new Set();
    keep.add(focusId);

    // Direct parents (what focus depends on)
    parseDependsOn(focus["depends-on"]).forEach(function (pid) {
      keep.add(pid);
    });

    // Direct children (what depends on focus)
    entities.forEach(function (e) {
      var deps = parseDependsOn(e["depends-on"]);
      if (deps.indexOf(focusId) !== -1) {
        var eid = parseInt(e.id, 10);
        if (!isNaN(eid)) keep.add(eid);
      }
    });

    // Build clones with `depends-on` pruned to only refer to entities in keep,
    // so the graph builder won't pull in extra ancestors via parent edges.
    var result = [];
    keep.forEach(function (id) {
      var e = idToEntity[id];
      if (!e) return;
      var clone = {};
      Object.keys(e).forEach(function (k) { clone[k] = e[k]; });
      var prunedDeps = parseDependsOn(e["depends-on"]).filter(function (d) {
        return keep.has(d);
      });
      clone["depends-on"] = prunedDeps.length > 0
        ? "[" + prunedDeps.map(function (d) { return String(d).padStart(3, "0"); }).join(", ") + "]"
        : "";
      result.push(clone);
    });
    return result;
  }

  /**
   * Build adjacency from entities. Returns { nodes, edges, idToIdx }.
   * Only includes entities that participate in dependency relationships.
   */
  function buildGraph(entities, focusId) {
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

    // Always include the focus entity, even if it has no dependency edges yet,
    // so the detail page can still render a single highlighted node + heading.
    if (focusId !== null && focusId !== undefined && idToEntity[focusId]) {
      participatingIds.add(focusId);
    }

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

    edges.forEach(function (e) {
      inDegree[e.to]++;
      children[e.from].push(e.to);
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
      execute: "#58a6ff",
      implementation: "#58a6ff",
      validation: "#f0883e",
    };
    return colors[status] || "#8b949e";
  }

  // --- Render functions ---

  function renderDagNode(node, highlightId) {
    var isHighlight = node.id === highlightId;
    var g = svgEl("g", {
      class: isHighlight ? "dag-node dag-node-highlighted" : "dag-node",
      "data-id": node.id,
    });
    var cx = node.x;
    var cy = node.y;
    var color = nodeColor(node.status);

    g.appendChild(svgEl("rect", {
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      width: NODE_W,
      height: NODE_H,
      rx: 6,
      fill: isHighlight ? color + "55" : "#161b22",
      stroke: isHighlight ? "#f0883e" : color,
      "stroke-width": isHighlight ? "3" : "1",
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
   * @param {number|null} highlightId - Current entity ID to highlight (on detail page).
   *        When provided, the graph is also filtered to the subgraph
   *        containing the entity, its direct parents, and direct children.
   *        Pass null/undefined to render the full workflow graph.
   * @returns {SVGElement|null} - null if no nodes to render
   */
  function renderDependencyGraph(entities, highlightId) {
    var hasFocus = highlightId !== null && highlightId !== undefined;
    var workingEntities = hasFocus ? filterSubgraph(entities, highlightId) : entities;

    var graph = buildGraph(workingEntities, hasFocus ? highlightId : null);
    if (!graph) return null;
    if (graph.nodes.length === 0) return null;

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
    filterSubgraph: filterSubgraph,
  };
})(window);
