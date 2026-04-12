import { createRoot } from "react-dom/client";
import { useMemo, useState } from "react";
import { ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import originalDagre from "@dagrejs/dagre";
import type { DagreAlgorithm, DagreQuality, DagreRanker, Rankdir } from "../src/dagre";
import { dagre } from "../src/dagre";
import {
  type Direction,
  type EdgeMode,
  FlowInner,
  type GraphData,
  type AppLayoutResult,
  NODE_H,
  NODE_W,
  Select,
  Slider,
  extractDagreLayout,
  formatMeta,
  graphs,
  toFlowElements,
} from "./shared";

function layoutWithD3Dag(
  graphData: GraphData,
  dir: Direction,
  nodesep: number,
  ranksep: number,
  quality: DagreQuality,
  ranker: DagreRanker | undefined,
  algorithm: DagreAlgorithm,
): AppLayoutResult {
  const t0 = performance.now();
  const grf = new dagre.graphlib.Graph();
  grf.setGraph({ rankdir: dir as Rankdir, nodesep, ranksep, quality, ranker, algorithm });
  grf.setDefaultEdgeLabel(() => ({}));
  for (const n of graphData.nodes) grf.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of graphData.edges) grf.setEdge(e.source, e.target);
  dagre.layout(grf);
  return extractDagreLayout(graphData, grf, performance.now() - t0);
}

function layoutWithDagre(
  graphData: GraphData,
  dir: Direction,
  nodesep: number,
  ranksep: number,
): AppLayoutResult {
  const t0 = performance.now();
  const grf = new originalDagre.graphlib.Graph();
  grf.setGraph({ rankdir: dir, nodesep, ranksep });
  grf.setDefaultEdgeLabel(() => ({}));
  for (const n of graphData.nodes) grf.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of graphData.edges) grf.setEdge(e.source, e.target);
  originalDagre.layout(grf);
  return extractDagreLayout(graphData, grf, performance.now() - t0);
}

function Panel({
  title,
  meta,
  nodes,
  edges,
}: {
  title: string;
  meta: string;
  nodes: Node[];
  edges: Edge[];
}) {
  return (
    <div className="compare-panel">
      <h3>{title}</h3>
      <div className="meta">{meta}</div>
      <div style={{ width: "100%", height: 400, position: "relative" }}>
        <ReactFlowProvider>
          <FlowInner nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

function App() {
  const [graphName, setGraphName] = useState("square");
  const [direction, setDirection] = useState<Direction>("TB");
  const [quality, setQuality] = useState<DagreQuality>("medium");
  const [nodesep, setNodesep] = useState(20);
  const [ranksep, setRanksep] = useState(40);
  const [ranker, setRanker] = useState<DagreRanker | undefined>(undefined);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("routed");
  const [algorithm, setAlgorithm] = useState<DagreAlgorithm>("sugiyama");

  const graphData = graphs[graphName]!;
  const isSugiyama = algorithm === "sugiyama";

  const dagreResult = useMemo(
    () => layoutWithDagre(graphData, direction, nodesep, ranksep),
    [graphData, direction, nodesep, ranksep],
  );

  const d3dagResult = useMemo(
    () => layoutWithD3Dag(graphData, direction, nodesep, ranksep, quality, ranker, algorithm),
    [graphData, direction, nodesep, ranksep, quality, ranker, algorithm],
  );

  const dagreFlow = useMemo(
    () => toFlowElements(graphData, dagreResult, edgeMode === "routed" ? "straight" : edgeMode, direction, { proportional: true }),
    [graphData, dagreResult, edgeMode, direction],
  );

  const d3dagFlow = useMemo(
    () => toFlowElements(graphData, d3dagResult, edgeMode, direction, { proportional: true }),
    [graphData, d3dagResult, edgeMode, direction],
  );

  const metaDagre = formatMeta(dagreResult);
  const metaD3dag = formatMeta(d3dagResult);

  return (
    <>
      <div className="compare-controls">
        <Select label="Graph" value={graphName} onChange={setGraphName}>
          {Object.keys(graphs).map((name) => (
            <option key={name} value={name}>
              {name} ({graphs[name]!.nodes.length} nodes)
            </option>
          ))}
        </Select>
        <Select label="Algorithm" value={algorithm} onChange={(v) => setAlgorithm(v as DagreAlgorithm)}>
          <option value="sugiyama">sugiyama</option>
          <option value="zherebko">zherebko</option>
          <option value="grid">grid</option>
        </Select>
        <Select label="Direction" value={direction} onChange={(v) => setDirection(v as Direction)}>
          <option value="TB">TB</option>
          <option value="LR">LR</option>
          <option value="BT">BT</option>
          <option value="RL">RL</option>
        </Select>
        {isSugiyama && (
          <Select label="Quality" value={quality} onChange={(v) => setQuality(v as DagreQuality)}>
            <option value="fast">fast</option>
            <option value="medium">medium</option>
            <option value="slow">slow</option>
          </Select>
        )}
        {isSugiyama && (
          <Select label="Ranker" value={ranker ?? ""} onChange={(v) => setRanker((v || undefined) as DagreRanker | undefined)}>
            <option value="">default</option>
            <option value="network-simplex">network-simplex</option>
            <option value="longest-path">longest-path</option>
            <option value="topological">topological</option>
          </Select>
        )}
        <Slider label="nodesep" value={nodesep} onChange={setNodesep} min={1} max={100} />
        <Slider label="ranksep" value={ranksep} onChange={setRanksep} min={1} max={100} />
        <Select label="Edges" value={edgeMode} onChange={(v) => setEdgeMode(v as EdgeMode)}>
          <option value="straight">straight</option>
          <option value="curved">curved</option>
          <option value="routed">routed (d3-dag)</option>
        </Select>
      </div>
      <div className="compare-container">
        <Panel title="dagre" meta={metaDagre} nodes={dagreFlow.nodes} edges={dagreFlow.edges} />
        <Panel title="d3-dag" meta={metaD3dag} nodes={d3dagFlow.nodes} edges={d3dagFlow.edges} />
      </div>
    </>
  );
}

createRoot(document.getElementById("cmp-root")!).render(<App />);
