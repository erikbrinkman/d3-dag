import { type FC, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  BaseEdge,
  Position,
  ReactFlow,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type { Rankdir } from "../src/layout";

export const NODE_W = 40;
export const NODE_H = 30;

export interface GraphData {
  nodes: { id: string }[];
  edges: { source: string; target: string }[];
}

export const graphs: Record<string, GraphData> = {
  square: {
    nodes: [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }],
    edges: [
      { source: "0", target: "1" },
      { source: "0", target: "2" },
      { source: "1", target: "3" },
      { source: "2", target: "3" },
    ],
  },
  dag: {
    nodes: [{ id: "0" }, { id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }],
    edges: [
      { source: "0", target: "1" },
      { source: "0", target: "2" },
      { source: "1", target: "3" },
      { source: "2", target: "3" },
      { source: "0", target: "4" },
      { source: "4", target: "5" },
    ],
  },
  ex: {
    nodes: [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
    ],
    edges: [
      { source: "0", target: "1" },
      { source: "1", target: "3" },
      { source: "2", target: "3" },
      { source: "3", target: "4" },
      { source: "3", target: "5" },
      { source: "5", target: "6" },
    ],
  },
  dummy: {
    nodes: [{ id: "0" }, { id: "1" }, { id: "2" }],
    edges: [
      { source: "0", target: "1" },
      { source: "0", target: "2" },
      { source: "1", target: "2" },
    ],
  },
  zherebko: {
    nodes: [
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
      { id: "7" },
      { id: "8" },
      { id: "9" },
      { id: "10" },
      { id: "11" },
    ],
    edges: [
      { source: "1", target: "2" },
      { source: "1", target: "5" },
      { source: "1", target: "7" },
      { source: "2", target: "3" },
      { source: "2", target: "4" },
      { source: "2", target: "5" },
      { source: "2", target: "7" },
      { source: "2", target: "8" },
      { source: "3", target: "6" },
      { source: "3", target: "8" },
      { source: "4", target: "7" },
      { source: "5", target: "7" },
      { source: "5", target: "8" },
      { source: "5", target: "9" },
      { source: "6", target: "8" },
      { source: "7", target: "8" },
      { source: "9", target: "10" },
      { source: "9", target: "11" },
    ],
  },
  grafo: {
    nodes: [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
      { id: "7" },
      { id: "8" },
      { id: "9" },
      { id: "10" },
      { id: "11" },
      { id: "12" },
      { id: "13" },
      { id: "14" },
      { id: "15" },
      { id: "16" },
      { id: "17" },
      { id: "18" },
      { id: "19" },
      { id: "20" },
      { id: "21" },
    ],
    edges: [
      { source: "8", target: "0" },
      { source: "11", target: "3" },
      { source: "12", target: "4" },
      { source: "18", target: "5" },
      { source: "9", target: "6" },
      { source: "15", target: "6" },
      { source: "17", target: "6" },
      { source: "3", target: "7" },
      { source: "17", target: "7" },
      { source: "20", target: "7" },
      { source: "21", target: "7" },
      { source: "4", target: "9" },
      { source: "16", target: "10" },
      { source: "21", target: "10" },
      { source: "2", target: "11" },
      { source: "21", target: "12" },
      { source: "4", target: "13" },
      { source: "12", target: "13" },
      { source: "1", target: "14" },
      { source: "8", target: "14" },
      { source: "0", target: "16" },
      { source: "19", target: "17" },
      { source: "9", target: "18" },
      { source: "13", target: "20" },
    ],
  },
};

export interface AppLayoutResult {
  positions: Map<string, { x: number; y: number; width: number; height: number }>;
  edgePoints: Map<string, [number, number][]>;
  width: number;
  height: number;
  elapsed: number;
}

export function edgeKey(source: string, target: string): string {
  return `${source}\0${target}`;
}

export function formatMeta(result: AppLayoutResult): string {
  return `${Math.round(result.width)}\u00d7${Math.round(result.height)}  \u00b7  ${result.elapsed.toFixed(1)}ms`;
}

/** extract positions and edge points from a dagre-style graph after layout */
export function extractDagreLayout(
  graphData: GraphData,
  grf: { node(id: string): { x: number; y: number }; edge(v: string, w: string): { points: { x: number; y: number }[] }; graph(): { width?: number; height?: number } },
  elapsed: number,
): AppLayoutResult {
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const n of graphData.nodes) {
    const pos = grf.node(n.id);
    positions.set(n.id, { x: pos.x, y: pos.y, width: NODE_W, height: NODE_H });
  }
  const edgePoints = new Map<string, [number, number][]>();
  for (const e of graphData.edges) {
    const pts = grf.edge(e.source, e.target).points;
    edgePoints.set(
      edgeKey(e.source, e.target),
      pts.map((p): [number, number] => [p.x, p.y]),
    );
  }
  const info = grf.graph();
  return { positions, edgePoints, width: info.width ?? 0, height: info.height ?? 0, elapsed };
}

/** smooth curve from handle → layout control points → handle */
export function LayoutEdge({ sourceX, sourceY, targetX, targetY, data, ...rest }: EdgeProps) {
  const layoutPoints = data?.points as [number, number][] | undefined;
  const proportional = data?.proportional as boolean | undefined;

  const d = useMemo(() => {
    const pts: [number, number][] = [[sourceX, sourceY]];
    if (layoutPoints && layoutPoints.length > 2) {
      if (proportional) {
        // proportional: decompose each interior point into t + perpendicular offset
        const [[sx, sy]] = layoutPoints;
        const [tx, ty] = layoutPoints[layoutPoints.length - 1];
        const dx = tx - sx;
        const dy = ty - sy;
        const len2 = dx * dx + dy * dy;
        for (const [px, py] of layoutPoints.slice(1, -1)) {
          const t = len2 > 0 ? ((px - sx) * dx + (py - sy) * dy) / len2 : 0.5;
          const perpX = px - (sx + t * dx);
          const perpY = py - (sy + t * dy);
          const rx = sourceX + t * (targetX - sourceX) + perpX;
          const ry = sourceY + t * (targetY - sourceY) + perpY;
          pts.push([rx, ry]);
        }
      } else {
        pts.push(...layoutPoints.slice(1, -1));
      }
    }
    pts.push([targetX, targetY]);

    if (pts.length === 2) {
      return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;
    }
    let path = `M ${pts[0][0]},${pts[0][1]}`;
    const mx = (pts[0][0] + pts[1][0]) / 2;
    const my = (pts[0][1] + pts[1][1]) / 2;
    path += ` L ${mx},${my}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const nx = (pts[i][0] + pts[i + 1][0]) / 2;
      const ny = (pts[i][1] + pts[i + 1][1]) / 2;
      path += ` Q ${pts[i][0]},${pts[i][1]} ${nx},${ny}`;
    }
    path += ` L ${pts[pts.length - 1][0]},${pts[pts.length - 1][1]}`;
    return path;
  }, [layoutPoints, proportional, sourceX, sourceY, targetX, targetY]);

  return <BaseEdge {...rest} path={d} />;
}

export const edgeTypes = { layout: LayoutEdge };

export type EdgeMode = "straight" | "curved" | "routed";
export type Direction = Rankdir;

export function handlePositions(dir: Direction): { source: Position; target: Position } {
  switch (dir) {
    case "LR":
      return { source: Position.Right, target: Position.Left };
    case "RL":
      return { source: Position.Left, target: Position.Right };
    case "BT":
      return { source: Position.Top, target: Position.Bottom };
    default:
      return { source: Position.Bottom, target: Position.Top };
  }
}

export function toFlowElements(
  graphData: GraphData,
  result: AppLayoutResult,
  edgeMode: EdgeMode,
  direction: Direction,
  opts?: { proportional?: boolean },
): { nodes: Node[]; edges: Edge[] } {
  const { source: sourcePosition, target: targetPosition } = handlePositions(direction);
  const nodes: Node[] = [];
  for (const n of graphData.nodes) {
    const pos = result.positions.get(n.id);
    if (!pos) continue;
    nodes.push({
      id: n.id,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: { label: n.id },
      sourcePosition,
      targetPosition,
      style: {
        width: pos.width,
        height: pos.height,
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      },
    });
  }

  const edges: Edge[] = [];
  for (const e of graphData.edges) {
    const key = edgeKey(e.source, e.target);
    const pts = edgeMode === "routed" ? result.edgePoints.get(key) : undefined;
    const type = pts ? "layout" : edgeMode === "curved" ? "default" : "straight";
    edges.push({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type,
      data: { points: pts, proportional: opts?.proportional ?? false },
      markerEnd: { type: "arrowclosed" as const },
    });
  }

  return { nodes, edges };
}

export const FlowInner: FC<{ nodes: Node[]; edges: Edge[] }> = ({
  nodes: layoutNodes,
  edges,
}) => {
  const [nodes, setNodes] = useState(layoutNodes);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(layoutNodes);
    // double rAF to ensure React Flow has measured nodes before fitting
    requestAnimationFrame(() => requestAnimationFrame(() => fitView()));
  }, [layoutNodes, fitView]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      fitView
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      colorMode="system"
    />
  );
};

export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label>
      {label}:{" "}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label>
      {label}:{" "}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />{" "}
      {value}
    </label>
  );
}
