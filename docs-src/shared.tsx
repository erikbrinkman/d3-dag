import {
  applyNodeChanges,
  BaseEdge,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeChange,
  Position,
  ReactFlow,
  useInternalNode,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Rankdir } from "../src/layout.js";
import { exampleGraphs, type GraphData } from "./graphs.js";

export type { GraphData };

export const NODE_W = 40;
export const NODE_H = 30;

export const graphs: Record<string, GraphData> = {
  square: exampleGraphs.square,
  dag: exampleGraphs.dag,
  ex: exampleGraphs.ex,
  dummy: {
    nodes: [{ id: "0" }, { id: "1" }, { id: "2" }],
    edges: [
      { source: "0", target: "1" },
      { source: "0", target: "2" },
      { source: "1", target: "2" },
    ],
  },
  zherebko: exampleGraphs.zherebko,
  grafo: exampleGraphs.grafo,
};

/** a node's center and size */
export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppLayoutResult {
  positions: Map<string, NodeBox>;
  edgePoints: Map<string, [number, number][]>;
  width: number;
  height: number;
  elapsed: number;
}

/**
 * create a function that keys repeated edges by how many came before
 *
 * Keys from two such functions match only when both are given repeated edges
 * in the same order.
 */
export function edgeKeys(): (source: string, target: string) => string {
  const counts = new Map<string, number>();
  return (source, target) => {
    const pair = `${source}\0${target}`;
    const occurrence = counts.get(pair) ?? 0;
    counts.set(pair, occurrence + 1);
    return `${pair}\0${occurrence}`;
  };
}

export function formatMeta(result: AppLayoutResult): string {
  return `${Math.round(result.width)}\u00d7${Math.round(result.height)}  \u00b7  ${result.elapsed.toFixed(1)}ms`;
}

/** extract positions and edge points from a dagre-style graph after layout */
export function extractDagreLayout(
  graphData: GraphData,
  grf: {
    node(id: string): { x: number; y: number };
    edge(v: string, w: string): { points: { x: number; y: number }[] };
    graph(): { width?: number; height?: number };
  },
  elapsed: number,
): AppLayoutResult {
  const positions = new Map<string, NodeBox>();
  for (const n of graphData.nodes) {
    const pos = grf.node(n.id);
    positions.set(n.id, { x: pos.x, y: pos.y, width: NODE_W, height: NODE_H });
  }
  const edgePoints = new Map<string, [number, number][]>();
  const keyOf = edgeKeys();
  for (const e of graphData.edges) {
    const pts = grf.edge(e.source, e.target).points;
    edgePoints.set(
      keyOf(e.source, e.target),
      pts.map((p): [number, number] => [p.x, p.y]),
    );
  }
  const info = grf.graph();
  return {
    positions,
    edgePoints,
    width: info.width ?? 0,
    height: info.height ?? 0,
    elapsed,
  };
}

/** move a link's layout points to follow its nodes after they're dragged */
function followNodes(
  points: readonly (readonly [number, number])[],
  [sourceDx, sourceDy]: readonly [number, number],
  [targetDx, targetDy]: readonly [number, number],
  proportional: boolean,
): (readonly [number, number])[] {
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const [startX, startY] = [sx + sourceDx, sy + sourceDy];
  const [endX, endY] = [tx + targetDx, ty + targetDy];
  const interior = points.slice(1, -1);
  if (proportional) {
    // keep each interior point's place along the line between the ends, and
    // its offset from that line
    const dx = tx - sx;
    const dy = ty - sy;
    const len2 = dx * dx + dy * dy;
    const moved = interior.map(([px, py]): [number, number] => {
      const frac = len2 > 0 ? ((px - sx) * dx + (py - sy) * dy) / len2 : 0.5;
      const perpX = px - (sx + frac * dx);
      const perpY = py - (sy + frac * dy);
      return [
        startX + frac * (endX - startX) + perpX,
        startY + frac * (endY - startY) + perpY,
      ];
    });
    return [[startX, startY], ...moved, [endX, endY]];
  } else {
    return [[startX, startY], ...interior, [endX, endY]];
  }
}

/** smooth svg path through points, curving at each interior point */
function smoothPath(points: readonly (readonly [number, number])[]): string {
  const [[fx, fy]] = points;
  const [lx, ly] = points[points.length - 1];
  if (points.length === 2) {
    return `M ${fx},${fy} L ${lx},${ly}`;
  } else {
    const [nx, ny] = points[1];
    let path = `M ${fx},${fy} L ${(fx + nx) / 2},${(fy + ny) / 2}`;
    for (const [ind, [cx, cy]] of points.slice(1, -1).entries()) {
      const [px, py] = points[ind + 2];
      path += ` Q ${cx},${cy} ${(cx + px) / 2},${(cy + py) / 2}`;
    }
    return `${path} L ${lx},${ly}`;
  }
}

/** how far a node has been dragged from where the layout put it */
function useNodeShift(
  id: string,
  origin: XYPosition | undefined,
): [number, number] {
  const node = useInternalNode(id);
  if (node && origin) {
    const { x, y } = node.internals.positionAbsolute;
    return [x - origin.x, y - origin.y];
  } else {
    return [0, 0];
  }
}

/** data a layout edge carries */
interface LayoutEdgeData extends Record<string, unknown> {
  /** the link's layout points */
  points: [number, number][] | undefined;
  /** whether interior points move with the ends when nodes are dragged */
  proportional: boolean;
  /** the source node's top left corner from the layout */
  sourceOrigin: XYPosition | undefined;
  /** the target node's top left corner from the layout */
  targetOrigin: XYPosition | undefined;
}

/** an edge drawn through its layout points */
type LayoutFlowEdge = Edge<LayoutEdgeData, "layout">;

/** smooth curve through a link's layout points, its ends following its nodes */
export function LayoutEdge({
  id,
  source,
  target,
  data,
  style,
  markerStart,
  markerEnd,
  interactionWidth,
}: EdgeProps<LayoutFlowEdge>) {
  const layoutPoints = data?.points;
  const proportional = data?.proportional ?? false;
  const [sourceDx, sourceDy] = useNodeShift(source, data?.sourceOrigin);
  const [targetDx, targetDy] = useNodeShift(target, data?.targetOrigin);

  const path = useMemo(
    () =>
      layoutPoints
        ? smoothPath(
            followNodes(
              layoutPoints,
              [sourceDx, sourceDy],
              [targetDx, targetDy],
              proportional,
            ),
          )
        : "",
    [layoutPoints, proportional, sourceDx, sourceDy, targetDx, targetDy],
  );

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerStart={markerStart}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth}
    />
  );
}

export const edgeTypes = { layout: LayoutEdge };

export type EdgeMode = "straight" | "curved" | "routed";
export type Direction = Rankdir;

export function handlePositions(dir: Direction): {
  source: Position;
  target: Position;
} {
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

/** top left corner of a node centered at its layout position */
function origin({ x, y, width, height }: NodeBox): XYPosition {
  return { x: x - width / 2, y: y - height / 2 };
}

export function toFlowElements(
  graphData: GraphData,
  result: AppLayoutResult,
  edgeMode: EdgeMode,
  direction: Direction,
  opts?: { proportional?: boolean },
): { nodes: Node[]; edges: Edge<LayoutEdgeData>[] } {
  const { source: sourcePosition, target: targetPosition } =
    handlePositions(direction);
  const nodes: Node[] = [];
  for (const n of graphData.nodes) {
    const pos = result.positions.get(n.id);
    if (!pos) continue;
    nodes.push({
      id: n.id,
      position: origin(pos),
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

  const edges: Edge<LayoutEdgeData>[] = [];
  const keyOf = edgeKeys();
  for (const e of graphData.edges) {
    const key = keyOf(e.source, e.target);
    const pts = edgeMode === "routed" ? result.edgePoints.get(key) : undefined;
    const type = pts
      ? "layout"
      : edgeMode === "curved"
        ? "default"
        : "straight";
    const sourcePos = result.positions.get(e.source);
    const targetPos = result.positions.get(e.target);
    edges.push({
      id: key,
      source: e.source,
      target: e.target,
      type,
      data: {
        points: pts,
        proportional: opts?.proportional ?? false,
        sourceOrigin: sourcePos && origin(sourcePos),
        targetOrigin: targetPos && origin(targetPos),
      },
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
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
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
