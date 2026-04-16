"use client";

// ABOUTME: PipelineGraph React Client Component — SVG pipeline stage graph.
// Port of tools/dashboard/static/visualizer.js to React/JSX with Tailwind CSS variable colors.
// Node shapes: rect (normal), diamond (gate), rounded rect (terminal/initial), dashed border (manual).
// Edges: solid forward arrows + curved dashed orange feedback arcs (staggered for multi-arc targets).
// Features: entity count badges, click-to-filter, active stage highlight, SSE real-time badge updates.

import { useEffect, useMemo, useState } from "react";
import type { PipelineStage } from "@/lib/pipeline-parse";
import { useSSE } from "@/lib/sse-context";

// --- Layout constants (ported from visualizer.js) ---
const NODE_W = 120;
const NODE_H = 40;
const NODE_GAP_X = 60;
const DIAMOND_SIZE = 50;
const BADGE_R = 10;
const ARROW_SIZE = 6;
const FEEDBACK_ARC_HEIGHT = 40;
const PADDING = 30;

// --- Color tokens (A-7: Primer hex → Tailwind CSS variables) ---
// Active/badge blue  → var(--primary)
// Node fill          → var(--card)
// Inactive border    → var(--border)
// Text               → var(--foreground)
// Orange (feedback)  → rgb(245 158 11)  [amber-500]
// Green  (terminal)  → rgb(34 197 94)   [green-500]
// Purple (initial)   → rgb(192 132 252) [purple-400]

// --- Interfaces ---

interface LayoutNode {
  idx: number;
  name: string;
  gate: boolean;
  terminal: boolean;
  initial: boolean;
  manual: boolean;
  conditional: boolean;
  feedback_to: string;
  x: number;
  y: number;
}

interface ForwardEdge {
  from: number;
  to: number;
}

interface FeedbackEdge {
  from: number;
  to: number;
  stackIndex: number;
}

interface Layout {
  nodes: LayoutNode[];
  forwardEdges: ForwardEdge[];
  feedbackEdges: FeedbackEdge[];
  width: number;
  height: number;
}

export interface PipelineGraphProps {
  stages: PipelineStage[];
  entityCountByStage: Record<string, number>;
  modHooks: { merge: string[]; lifecycle: string[] };
  activeStage?: string;
  onStageClick: (stageName: string) => void;
}

// --- Layout builder (ported from visualizer.js buildLayout) ---

function buildLayout(stages: PipelineStage[]): Layout {
  const nameToIdx: Record<string, number> = {};
  const nodes: LayoutNode[] = [];

  stages.forEach((stage, i) => {
    nameToIdx[stage.name] = i;
    nodes.push({
      idx: i,
      name: stage.name,
      gate: stage.gate,
      terminal: stage.terminal,
      initial: stage.initial,
      manual: stage.manual,
      conditional: stage.conditional,
      feedback_to: stage.feedback_to,
      x: 0,
      y: 0,
    });
  });

  // Forward edges: sequential
  const forwardEdges: ForwardEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    forwardEdges.push({ from: i, to: i + 1 });
  }

  // Feedback edges with staggering for multiple arcs to same target
  const feedbackEdges: FeedbackEdge[] = [];
  const targetArcCount: Record<number, number> = {};
  nodes.forEach((node) => {
    if (node.feedback_to && nameToIdx[node.feedback_to] !== undefined) {
      const toIdx = nameToIdx[node.feedback_to];
      const stackIndex = targetArcCount[toIdx] ?? 0;
      targetArcCount[toIdx] = stackIndex + 1;
      feedbackEdges.push({ from: node.idx, to: toIdx, stackIndex });
    }
  });

  // Position nodes in horizontal row
  nodes.forEach((node, i) => {
    node.x = PADDING + i * (NODE_W + NODE_GAP_X) + NODE_W / 2;
    node.y = PADDING + FEEDBACK_ARC_HEIGHT + NODE_H / 2;
  });

  // Extra height for staggered feedback arcs
  const maxStackIndex =
    feedbackEdges.length > 0 ? Math.max(...feedbackEdges.map((e) => e.stackIndex)) : 0;
  const maxArcHeight = FEEDBACK_ARC_HEIGHT * (1 + 0.4 * maxStackIndex);

  const totalW = PADDING * 2 + nodes.length * NODE_W + (nodes.length - 1) * NODE_GAP_X;
  const totalH = PADDING + maxArcHeight + NODE_H + PADDING + BADGE_R * 2;

  return { nodes, forwardEdges, feedbackEdges, width: totalW, height: totalH };
}

// --- Node shape components ---

function NodeShape({ node, isActive }: { node: LayoutNode; isActive: boolean }) {
  const cx = node.x;
  const cy = node.y;

  const activeFill = "color-mix(in oklch, var(--primary) 13%, transparent)";
  const inactiveFill = "var(--card)";
  const fill = isActive ? activeFill : inactiveFill;
  const activeStroke = "var(--primary)";
  const strokeWidth = isActive ? 2 : 1;
  const dasharray = node.manual ? "4,3" : "none";

  if (node.gate) {
    const half = DIAMOND_SIZE / 2;
    const points = [
      `${cx},${cy - half}`,
      `${cx + half},${cy}`,
      `${cx},${cy + half}`,
      `${cx - half},${cy}`,
    ].join(" ");
    const stroke = isActive ? activeStroke : "rgb(245 158 11)";
    return (
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dasharray}
      />
    );
  }

  // Rect — rounded corners for terminal/initial
  const rx = node.terminal || node.initial ? 12 : 4;
  let stroke: string;
  if (isActive) {
    stroke = activeStroke;
  } else if (node.terminal) {
    stroke = "rgb(34 197 94)";
  } else if (node.initial) {
    stroke = "rgb(192 132 252)";
  } else {
    stroke = "var(--border)";
  }

  return (
    <rect
      x={cx - NODE_W / 2}
      y={cy - NODE_H / 2}
      width={NODE_W}
      height={NODE_H}
      rx={rx}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={dasharray}
    />
  );
}

// --- Forward edge ---

function ForwardEdge({ fromNode, toNode }: { fromNode: LayoutNode; toNode: LayoutNode }) {
  const x1 = fromNode.gate ? fromNode.x + DIAMOND_SIZE / 2 : fromNode.x + NODE_W / 2;
  const x2 = toNode.gate ? toNode.x - DIAMOND_SIZE / 2 : toNode.x - NODE_W / 2;
  const y = fromNode.y;

  const arrowPoints = [
    `${x2},${y}`,
    `${x2 - ARROW_SIZE},${y - ARROW_SIZE / 2}`,
    `${x2 - ARROW_SIZE},${y + ARROW_SIZE / 2}`,
  ].join(" ");

  return (
    <g className="pipeline-edge">
      <line
        x1={x1}
        y1={y}
        x2={x2 - ARROW_SIZE}
        y2={y}
        stroke="var(--border)"
        strokeWidth={1.5}
      />
      <polygon points={arrowPoints} fill="var(--border)" />
    </g>
  );
}

// --- Feedback arc (staggered) ---

function FeedbackArc({
  fromNode,
  toNode,
  stackIndex,
}: {
  fromNode: LayoutNode;
  toNode: LayoutNode;
  stackIndex: number;
}) {
  const x1 = fromNode.x;
  const x2 = toNode.x;
  const yTop = fromNode.y - NODE_H / 2;
  const arcHeight = FEEDBACK_ARC_HEIGHT * (1 + 0.4 * stackIndex);
  const arcY = yTop - arcHeight;

  const d = `M ${x1} ${yTop} C ${x1} ${arcY}, ${x2} ${arcY}, ${x2} ${yTop}`;

  // Arrowhead pointing down at target node top
  const arrowPoints = [
    `${x2},${yTop}`,
    `${x2 - ARROW_SIZE / 2},${yTop - ARROW_SIZE}`,
    `${x2 + ARROW_SIZE / 2},${yTop - ARROW_SIZE}`,
  ].join(" ");

  const midX = (x1 + x2) / 2;

  return (
    <g className="pipeline-feedback-edge">
      <path d={d} fill="none" stroke="rgb(245 158 11)" strokeWidth={1.5} strokeDasharray="5,3" />
      <polygon points={arrowPoints} fill="rgb(245 158 11)" />
      <text
        x={midX}
        y={arcY - 5}
        textAnchor="middle"
        dominantBaseline="auto"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace"
        fontSize={9}
        fontStyle="italic"
        fill="rgb(245 158 11)"
      >
        feedback
      </text>
    </g>
  );
}

// --- Entity count badge ---

function EntityBadge({ node, count }: { node: LayoutNode; count: number }) {
  if (count === 0) return null;
  const cx = node.x + NODE_W / 2 - 5;
  const cy = node.y - NODE_H / 2 - 2;
  return (
    <g className="pipeline-badge">
      <circle cx={cx} cy={cy} r={BADGE_R} fill="var(--primary)" />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace"
        fontSize={9}
        fontWeight={700}
        fill="var(--card)"
      >
        {count}
      </text>
    </g>
  );
}

// --- Mod hook merge pill on shipped node ---

function MergePill({ node }: { node: LayoutNode }) {
  const pillW = 42;
  const pillH = 14;
  const cx = node.x;
  const cy = node.y + NODE_H / 2 + 10;
  return (
    <g className="pipeline-mod-pill">
      <rect
        x={cx - pillW / 2}
        y={cy - pillH / 2}
        width={pillW}
        height={pillH}
        rx={7}
        fill="rgb(245 158 11)"
        fillOpacity={0.15}
        stroke="rgb(245 158 11)"
        strokeWidth={0.8}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace"
        fontSize={8}
        fill="rgb(245 158 11)"
        fontWeight={600}
      >
        merge
      </text>
    </g>
  );
}

// --- Main PipelineGraph component ---

export function PipelineGraph({
  stages,
  entityCountByStage,
  modHooks,
  activeStage,
  onStageClick,
}: PipelineGraphProps) {
  const { events } = useSSE();

  // Real-time badge count overrides via SSE stage_transition events
  const [countsOverride, setCountsOverride] = useState<Record<string, number>>({});

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[0];
    if (latest.type !== "stage_transition") return;
    setCountsOverride((prev) => {
      const next = { ...prev };
      if (latest.stage) {
        next[latest.stage] = (next[latest.stage] ?? entityCountByStage[latest.stage] ?? 0) + 1;
      }
      // Decrement source stage if provided in detail field
      if (latest.detail) {
        try {
          const detail = JSON.parse(latest.detail) as { from?: string };
          if (detail.from) {
            next[detail.from] = Math.max(
              0,
              (next[detail.from] ?? entityCountByStage[detail.from] ?? 1) - 1,
            );
          }
        } catch {
          // ignore unparseable detail
        }
      }
      return next;
    });
  }, [events, entityCountByStage]);

  const effectiveCounts = useMemo(() => {
    const merged = { ...entityCountByStage };
    for (const [stage, count] of Object.entries(countsOverride)) {
      merged[stage] = count;
    }
    return merged;
  }, [entityCountByStage, countsOverride]);

  const layout = useMemo(() => buildLayout(stages), [stages]);

  if (stages.length === 0) return null;

  // Determine which nodes have merge mod hooks
  const mergeHookNodes = new Set(modHooks.merge);
  // lifecycle hooks (startup/idle) shown as annotation outside SVG

  return (
    <div className="space-y-1">
      {modHooks.lifecycle.length > 0 && (
        <p className="text-xs text-muted-foreground font-mono">
          FO hooks: {modHooks.lifecycle.join(", ")}
        </p>
      )}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="pipeline-graph-svg"
          style={{ minWidth: layout.width, height: layout.height }}
        >
          <title>Pipeline stage graph</title>
          {/* Forward edges (behind nodes) */}
          {layout.forwardEdges.map((edge) => (
            <ForwardEdge
              key={`fwd-${edge.from}-${edge.to}`}
              fromNode={layout.nodes[edge.from]}
              toNode={layout.nodes[edge.to]}
            />
          ))}

          {/* Feedback arcs (behind nodes) */}
          {layout.feedbackEdges.map((edge) => (
            <FeedbackArc
              key={`fb-${edge.from}-${edge.to}-${edge.stackIndex}`}
              fromNode={layout.nodes[edge.from]}
              toNode={layout.nodes[edge.to]}
              stackIndex={edge.stackIndex}
            />
          ))}

          {/* Nodes */}
          {layout.nodes.map((node) => {
            const isActive = activeStage === node.name;
            const _count = effectiveCounts[node.name] ?? 0;
            const hasMergePill =
              (node.terminal || mergeHookNodes.has(node.name)) && modHooks.merge.length > 0;

            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced with <button>
              <g
                key={node.name}
                data-stage={node.name}
                className="pipeline-node"
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                onClick={() => onStageClick(node.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onStageClick(node.name);
                }}
              >
                <NodeShape node={node} isActive={isActive} />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace"
                  fontSize={11}
                  fontWeight={isActive ? 600 : 400}
                  fill={isActive ? "var(--primary)" : "var(--foreground)"}
                >
                  {node.name}
                </text>
                {hasMergePill && <MergePill node={node} />}
              </g>
            );
          })}

          {/* Badges (on top of nodes) */}
          {layout.nodes.map((node) => (
            <EntityBadge
              key={`badge-${node.name}`}
              node={node}
              count={effectiveCounts[node.name] ?? 0}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
