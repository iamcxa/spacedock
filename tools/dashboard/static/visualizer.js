/**
 * Pipeline graph visualizer — pure SVG, no external dependencies.
 * Renders workflow stages as a directed graph with:
 * - Rect nodes (normal), diamond nodes (gate), rounded rect (terminal/initial)
 * - Forward arrows (solid), feedback arrows (curved dashed)
 * - Entity count badges per node
 */
(function (window) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var NODE_W = 120;
  var NODE_H = 40;
  var NODE_GAP_X = 60;
  var NODE_GAP_Y = 20;
  var DIAMOND_SIZE = 50;
  var BADGE_R = 10;
  var ARROW_SIZE = 6;
  var FEEDBACK_ARC_HEIGHT = 40;
  var PADDING = 30;

  // --- SVG element helpers ---

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
      "font-size": "11",
      fill: "#c9d1d9",
    }, attrs || {}));
    t.textContent = text;
    return t;
  }

  // --- Layout: simplified topological ordering ---

  function buildLayout(stages) {
    // For a mostly-linear pipeline, layer = index in array (already topologically ordered).
    // Feedback-to edges are backward edges rendered separately.
    var nodes = [];
    var forwardEdges = [];
    var feedbackEdges = [];
    var nameToIdx = {};

    stages.forEach(function (stage, i) {
      nameToIdx[stage.name] = i;
      nodes.push({
        idx: i,
        name: stage.name,
        gate: stage.gate,
        terminal: stage.terminal,
        initial: stage.initial,
        conditional: stage.conditional || false,
        feedback_to: stage.feedback_to || "",
        x: 0,
        y: 0,
      });
    });

    // Forward edges: each stage connects to the next stage in sequence
    for (var i = 0; i < nodes.length - 1; i++) {
      forwardEdges.push({ from: i, to: i + 1 });
    }

    // Feedback edges: from stage with feedback_to to the named target
    nodes.forEach(function (node) {
      if (node.feedback_to && nameToIdx[node.feedback_to] !== undefined) {
        feedbackEdges.push({
          from: node.idx,
          to: nameToIdx[node.feedback_to],
          label: "feedback",
        });
      }
    });

    // Position nodes in a horizontal line
    nodes.forEach(function (node, i) {
      node.x = PADDING + i * (NODE_W + NODE_GAP_X) + NODE_W / 2;
      node.y = PADDING + FEEDBACK_ARC_HEIGHT + NODE_H / 2;
    });

    var totalW = PADDING * 2 + nodes.length * NODE_W + (nodes.length - 1) * NODE_GAP_X;
    var totalH = PADDING * 2 + FEEDBACK_ARC_HEIGHT + NODE_H + BADGE_R * 2;

    return {
      nodes: nodes,
      forwardEdges: forwardEdges,
      feedbackEdges: feedbackEdges,
      width: totalW,
      height: totalH,
    };
  }

  // --- Render node shapes ---

  function renderNode(node, isActiveFilter) {
    var g = svgEl("g", { "data-stage": node.name, class: "pipeline-node" });
    var cx = node.x;
    var cy = node.y;

    if (node.gate) {
      // Diamond shape for gate stages
      var half = DIAMOND_SIZE / 2;
      var points = [
        cx + "," + (cy - half),
        (cx + half) + "," + cy,
        cx + "," + (cy + half),
        (cx - half) + "," + cy,
      ].join(" ");
      g.appendChild(svgEl("polygon", {
        points: points,
        fill: isActiveFilter ? "#58a6ff22" : "#161b22",
        stroke: isActiveFilter ? "#58a6ff" : "#f0883e",
        "stroke-width": isActiveFilter ? "2" : "1.5",
        "stroke-dasharray": node.conditional ? "4,3" : "none",
      }));
    } else {
      // Rect shape — rounded for terminal/initial
      var rx = (node.terminal || node.initial) ? 12 : 4;
      var strokeColor = node.terminal ? "#3fb950" : (node.initial ? "#d2a8ff" : "#21262d");
      g.appendChild(svgEl("rect", {
        x: cx - NODE_W / 2,
        y: cy - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
        rx: rx,
        fill: isActiveFilter ? "#58a6ff22" : "#161b22",
        stroke: isActiveFilter ? "#58a6ff" : strokeColor,
        "stroke-width": isActiveFilter ? "2" : "1",
        "stroke-dasharray": node.conditional ? "4,3" : "none",
      }));
    }

    // Label
    g.appendChild(svgText(cx, cy, node.name, {
      fill: isActiveFilter ? "#58a6ff" : "#c9d1d9",
      "font-size": "11",
      "font-weight": isActiveFilter ? "600" : "400",
    }));

    return g;
  }

  // --- Render entity count badge ---

  function renderBadge(node, count) {
    if (count === 0) return null;
    var cx = node.x + NODE_W / 2 - 5;
    var cy = node.y - NODE_H / 2 - 2;
    var g = svgEl("g", { class: "pipeline-badge" });
    g.appendChild(svgEl("circle", {
      cx: cx, cy: cy, r: BADGE_R,
      fill: "#58a6ff",
    }));
    g.appendChild(svgText(cx, cy, String(count), {
      fill: "#0d1117",
      "font-size": "9",
      "font-weight": "700",
    }));
    return g;
  }

  // --- Render forward edge (arrow) ---

  function renderForwardEdge(fromNode, toNode) {
    var g = svgEl("g", { class: "pipeline-edge" });

    var x1, x2;
    if (fromNode.gate) {
      x1 = fromNode.x + DIAMOND_SIZE / 2;
    } else {
      x1 = fromNode.x + NODE_W / 2;
    }
    if (toNode.gate) {
      x2 = toNode.x - DIAMOND_SIZE / 2;
    } else {
      x2 = toNode.x - NODE_W / 2;
    }

    var y = fromNode.y;

    // Line
    g.appendChild(svgEl("line", {
      x1: x1, y1: y, x2: x2 - ARROW_SIZE, y2: y,
      stroke: "#21262d",
      "stroke-width": "1.5",
    }));

    // Arrowhead
    var arrowPoints = [
      (x2) + "," + y,
      (x2 - ARROW_SIZE) + "," + (y - ARROW_SIZE / 2),
      (x2 - ARROW_SIZE) + "," + (y + ARROW_SIZE / 2),
    ].join(" ");
    g.appendChild(svgEl("polygon", {
      points: arrowPoints,
      fill: "#21262d",
    }));

    return g;
  }

  // --- Render feedback edge (curved dashed arrow above nodes) ---

  function renderFeedbackEdge(fromNode, toNode) {
    var g = svgEl("g", { class: "pipeline-feedback-edge" });

    var x1 = fromNode.x;
    var x2 = toNode.x;
    var yTop = fromNode.y - NODE_H / 2;
    var arcY = yTop - FEEDBACK_ARC_HEIGHT;

    // Curved path from source top to target top
    var d = "M " + x1 + " " + yTop +
            " C " + x1 + " " + arcY + ", " + x2 + " " + arcY + ", " + x2 + " " + yTop;

    g.appendChild(svgEl("path", {
      d: d,
      fill: "none",
      stroke: "#f0883e",
      "stroke-width": "1.5",
      "stroke-dasharray": "5,3",
    }));

    // Arrowhead at target (pointing down)
    var arrowPoints = [
      x2 + "," + yTop,
      (x2 - ARROW_SIZE / 2) + "," + (yTop - ARROW_SIZE),
      (x2 + ARROW_SIZE / 2) + "," + (yTop - ARROW_SIZE),
    ].join(" ");
    g.appendChild(svgEl("polygon", {
      points: arrowPoints,
      fill: "#f0883e",
    }));

    // Label
    var midX = (x1 + x2) / 2;
    g.appendChild(svgText(midX, arcY - 5, "feedback", {
      fill: "#f0883e",
      "font-size": "9",
      "font-style": "italic",
    }));

    return g;
  }

  // --- Main render function ---

  /**
   * @param {Array} stages - Stage objects from API ({name, gate, terminal, initial, feedback_to, conditional})
   * @param {Object} entityCountByStage - {stageName: count}
   * @param {Set} activeFilters - Set of active filter stage names
   * @param {Function} onStageClick - callback(stageName) for filter toggle
   * @returns {SVGElement}
   */
  function renderPipelineGraph(stages, entityCountByStage, activeFilters, onStageClick) {
    if (!stages || stages.length === 0) return null;

    var layout = buildLayout(stages);
    var svg = svgEl("svg", {
      viewBox: "0 0 " + layout.width + " " + layout.height,
      class: "pipeline-graph-svg",
    });

    // Render edges first (behind nodes)
    layout.forwardEdges.forEach(function (edge) {
      svg.appendChild(renderForwardEdge(layout.nodes[edge.from], layout.nodes[edge.to]));
    });
    layout.feedbackEdges.forEach(function (edge) {
      svg.appendChild(renderFeedbackEdge(layout.nodes[edge.from], layout.nodes[edge.to]));
    });

    // Render nodes
    layout.nodes.forEach(function (node) {
      var isActive = activeFilters && activeFilters.has(node.name);
      var nodeEl = renderNode(node, isActive);

      // Click handler for filtering
      nodeEl.style.cursor = "pointer";
      nodeEl.addEventListener("click", function () {
        if (onStageClick) onStageClick(node.name);
      });

      svg.appendChild(nodeEl);

      // Badge
      var count = (entityCountByStage || {})[node.name] || 0;
      var badge = renderBadge(node, count);
      if (badge) svg.appendChild(badge);
    });

    return svg;
  }

  // Export
  window.SpacedockVisualizer = {
    renderPipelineGraph: renderPipelineGraph,
  };
})(window);
