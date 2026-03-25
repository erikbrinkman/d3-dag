import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { graphConnect } from "../src/graph/connect";
import { grid } from "../src/grid";
import { laneGreedy } from "../src/grid/lane/greedy";
import { laneOpt } from "../src/grid/lane/opt";
import { sugiyama } from "../src/sugiyama";
import { coordCenter } from "../src/sugiyama/coord/center";
import { coordGreedy } from "../src/sugiyama/coord/greedy";
import { coordQuad } from "../src/sugiyama/coord/quad";
import { coordSimplex } from "../src/sugiyama/coord/simplex";
import { coordTopological } from "../src/sugiyama/coord/topological";
import { decrossDfs } from "../src/sugiyama/decross/dfs";
import { decrossOpt } from "../src/sugiyama/decross/opt";
import { decrossTwoLayer } from "../src/sugiyama/decross/two-layer";
import { layeringLongestPath } from "../src/sugiyama/layering/longest-path";
import { layeringSimplex } from "../src/sugiyama/layering/simplex";
import { layeringTopological } from "../src/sugiyama/layering/topological";
import type { DagreAlgorithm } from "../src/dagre";
import { tweakDirection, tweakGridHandles, tweakSugiyama } from "../src/tweaks";
import { zherebko } from "../src/zherebko";
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
  edgeKey,
  formatMeta,
  graphs,
  toFlowElements,
} from "./shared";


function runLayout(
  graphData: GraphData,
  algorithm: DagreAlgorithm,
  direction: Direction,
  nodesep: number,
  ranksep: number,
  opts: {
    layering?: "simplex" | "longest-path" | "topological";
    decross?: "two-layer" | "dfs" | "opt";
    coord?: "simplex" | "quad" | "greedy" | "center" | "topological";
    lane?: "greedy" | "opt";
  },
): AppLayoutResult {
  const t0 = performance.now();

  const connect = graphConnect();
  const pairs: [string, string][] = graphData.edges.map((e) => [e.source, e.target]);
  // graphConnect needs at least one edge; if graph is edgeless, use graph() directly
  // but all our examples have edges
  const grf = connect(pairs);

  const isHorizontal = direction === "LR" || direction === "RL";
  const nodeSize = isHorizontal
    ? () => [NODE_H, NODE_W] as const
    : () => [NODE_W, NODE_H] as const;
  const gap: readonly [number, number] = isHorizontal
    ? [ranksep, nodesep]
    : [nodesep, ranksep];

  const tweaks = [];
  if (algorithm === "sugiyama") tweaks.push(tweakSugiyama(nodeSize));
  if (algorithm === "grid") tweaks.push(tweakGridHandles(nodeSize, gap));
  tweaks.push(tweakDirection(direction));

  let op;
  if (algorithm === "zherebko") {
    op = zherebko().nodeSize(nodeSize).gap(gap).tweaks(tweaks);
  } else if (algorithm === "grid") {
    let lane;
    if (opts.lane === "opt") lane = laneOpt();
    else lane = laneGreedy();
    op = grid().lane(lane).nodeSize(nodeSize).gap(gap).tweaks(tweaks);
  } else {
    let layering;
    if (opts.layering === "longest-path") layering = layeringLongestPath();
    else if (opts.layering === "topological") layering = layeringTopological();
    else layering = layeringSimplex();

    let decross;
    if (opts.decross === "dfs") decross = decrossDfs();
    else if (opts.decross === "opt") decross = decrossOpt();
    else decross = decrossTwoLayer();

    let coord;
    if (opts.coord === "quad") coord = coordQuad();
    else if (opts.coord === "greedy") coord = coordGreedy();
    else if (opts.coord === "center") coord = coordCenter();
    else if (opts.coord === "topological") coord = coordTopological();
    else coord = coordSimplex();

    op = sugiyama()
      .layering(layering)
      .decross(decross)
      .coord(coord)
      .nodeSize(nodeSize)
      .gap(gap)
      .tweaks(tweaks);
  }

  const result = op(grf);
  const elapsed = performance.now() - t0;

  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const node of grf.nodes()) {
    const id = node.data;
    positions.set(id, {
      x: node.x,
      y: node.y,
      width: isHorizontal ? NODE_H : NODE_W,
      height: isHorizontal ? NODE_W : NODE_H,
    });
  }

  const edgePoints = new Map<string, [number, number][]>();
  for (const link of grf.links()) {
    const srcId = link.source.data;
    const tgtId = link.target.data;
    edgePoints.set(edgeKey(srcId, tgtId), link.points);
  }

  return { positions, edgePoints, width: result.width, height: result.height, elapsed };
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const initLayout = (params.get("layout") ?? "sugiyama") as DagreAlgorithm;

  const [algorithm, setAlgorithm] = useState<DagreAlgorithm>(initLayout);
  const [graphName, setGraphName] = useState("square");
  const [direction, setDirection] = useState<Direction>("TB");
  const [nodesep, setNodesep] = useState(20);
  const [ranksep, setRanksep] = useState(40);
  const [edgeMode, setEdgeMode] = useState<EdgeMode>("routed");

  // sugiyama options
  const [layering, setLayering] = useState<"simplex" | "longest-path" | "topological">("simplex");
  const [decross, setDecross] = useState<"two-layer" | "dfs" | "opt">("two-layer");
  const [coord, setCoord] = useState<"simplex" | "quad" | "greedy" | "center" | "topological">("simplex");

  // grid options
  const [lane, setLane] = useState<"greedy" | "opt">("greedy");

  // update URL when algorithm changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("layout", algorithm);
    history.replaceState(null, "", url.toString());
  }, [algorithm]);

  const graphData = graphs[graphName]!;

  const result = useMemo(
    () => runLayout(graphData, algorithm, direction, nodesep, ranksep, {
      layering,
      decross,
      coord,
      lane,
    }),
    [graphData, algorithm, direction, nodesep, ranksep, layering, decross, coord, lane],
  );

  const flow = useMemo(
    () => toFlowElements(graphData, result, edgeMode, direction, { proportional: true }),
    [graphData, result, edgeMode, direction],
  );

  const meta = formatMeta(result);

  return (
    <>
      <div className="examples-controls">
        <Select label="Layout" value={algorithm} onChange={(v) => setAlgorithm(v as DagreAlgorithm)}>
          <option value="sugiyama">Sugiyama</option>
          <option value="zherebko">Zherebko</option>
          <option value="grid">Grid</option>
        </Select>
        <Select label="Graph" value={graphName} onChange={setGraphName}>
          {Object.keys(graphs).map((name) => (
            <option key={name} value={name}>
              {name} ({graphs[name]!.nodes.length} nodes)
            </option>
          ))}
        </Select>
        <Select label="Direction" value={direction} onChange={(v) => setDirection(v as Direction)}>
          <option value="TB">TB</option>
          <option value="LR">LR</option>
          <option value="BT">BT</option>
          <option value="RL">RL</option>
        </Select>

        {algorithm === "sugiyama" && (
          <>
            <Select label="Layering" value={layering} onChange={(v) => setLayering(v as typeof layering)}>
              <option value="simplex">simplex</option>
              <option value="longest-path">longest-path</option>
              <option value="topological">topological</option>
            </Select>
            <Select label="Decross" value={decross} onChange={(v) => setDecross(v as typeof decross)}>
              <option value="two-layer">two-layer</option>
              <option value="dfs">dfs</option>
              <option value="opt">opt</option>
            </Select>
            <Select label="Coord" value={coord} onChange={(v) => setCoord(v as typeof coord)}>
              <option value="simplex">simplex</option>
              <option value="quad">quad</option>
              <option value="greedy">greedy</option>
              <option value="center">center</option>
              <option value="topological">topological</option>
            </Select>
          </>
        )}

        {algorithm === "grid" && (
          <Select label="Lane" value={lane} onChange={(v) => setLane(v as typeof lane)}>
            <option value="greedy">greedy</option>
            <option value="opt">opt</option>
          </Select>
        )}

        <Slider label="nodesep" value={nodesep} onChange={setNodesep} min={1} max={100} />
        <Slider label="ranksep" value={ranksep} onChange={setRanksep} min={1} max={100} />
        <Select label="Edges" value={edgeMode} onChange={(v) => setEdgeMode(v as EdgeMode)}>
          <option value="straight">straight</option>
          <option value="curved">curved</option>
          <option value="routed">routed</option>
        </Select>
      </div>

      <div className="examples-meta">{meta}</div>

      <div className="examples-panel">
        <ReactFlowProvider>
          <FlowInner nodes={flow.nodes} edges={flow.edges} />
        </ReactFlowProvider>
      </div>

    </>
  );
}

createRoot(document.getElementById("examples-root")!).render(<App />);
