/**
 * A dagre-compatible drop-in layout adapter backed by d3-dag's sugiyama
 *
 * @packageDocumentation
 */
import type { GraphNode, MutGraphNode } from "./graph";
import { graph } from "./graph";
import { grid } from "./grid";
import type { Operator, Rankdir } from "./layout";
import type { Sugiyama, SugiyamaOps } from "./sugiyama";
import { sugiyama } from "./sugiyama";
import { coordGreedy } from "./sugiyama/coord/greedy";
import { decrossDfs } from "./sugiyama/decross/dfs";
import { decrossOpt } from "./sugiyama/decross/opt";
import { layeringLongestPath } from "./sugiyama/layering/longest-path";
import { layeringTopological } from "./sugiyama/layering/topological";
import type { Tweak } from "./tweaks";
import { tweakDirection, tweakGridHandles, tweakSugiyama } from "./tweaks";
import { err } from "./utils";
import { zherebko } from "./zherebko";

/** @internal */
interface IdDagreNode extends DagreNode {
  id: string;
}

type DagreOperator = Operator<IdDagreNode, undefined>;
type DagreSugiyama = Sugiyama<SugiyamaOps<IdDagreNode, undefined>>;

export type { Rankdir } from "./layout";

/** quality preset for layout speed/quality trade-off */
export type DagreQuality = "fast" | "medium" | "slow";

/** layering algorithm for rank assignment */
export type DagreRanker = "network-simplex" | "longest-path" | "topological";

/** layout algorithm */
export type DagreAlgorithm = "sugiyama" | "zherebko" | "grid";

/** graph configuration set via {@link DagreGraph.setGraph} */
export interface DagreGraphConfig {
  /** layout direction (default: `"TB"`) */
  rankdir?: Rankdir;
  /** within-layer gap (default: `50`) */
  nodesep?: number;
  /** between-layer gap (default: `50`) */
  ranksep?: number;
  /** quality preset (default: `"medium"`) */
  quality?: DagreQuality;
  /** layering algorithm (default: `undefined`, uses preset default) */
  ranker?: DagreRanker;
  /** layout algorithm (default: `"sugiyama"`); `quality`/`ranker` only apply to sugiyama */
  algorithm?: DagreAlgorithm;
  /** total layout width (set by {@link dagre.layout}) */
  width?: number;
  /** total layout height (set by {@link dagre.layout}) */
  height?: number;
}

/** node label with position (x, y set by {@link dagre.layout}) */
export interface DagreNode {
  /** center x coordinate */
  x: number;
  /** center y coordinate */
  y: number;
  /** node width */
  width: number;
  /** node height */
  height: number;
}

/** a control point with x and y coordinates */
export interface DagrePoint {
  /** x coordinate */
  x: number;
  /** y coordinate */
  y: number;
}

/** edge label with control points (set by {@link dagre.layout}) */
export interface DagreEdge {
  /** control points (matches dagre's `{x, y}` format) */
  points: DagrePoint[];
}

/** edge descriptor returned by {@link DagreGraph.edges} */
export interface DagreEdgeDescriptor {
  /** source node id */
  v: string;
  /** target node id */
  w: string;
}

function presetSugiyama(
  quality: DagreQuality,
  ranker: DagreRanker | undefined,
): DagreSugiyama {
  let base: DagreSugiyama;
  if (quality === "fast") {
    base = sugiyama().decross(decrossDfs()).coord(coordGreedy());
  } else if (quality === "slow") {
    base = sugiyama().decross(decrossOpt().check("slow"));
  } else {
    base = sugiyama();
  }
  // "network-simplex" and undefined both use the default (layeringSimplex)
  if (ranker === "longest-path") {
    base = base.layering(layeringLongestPath());
  } else if (ranker === "topological") {
    base = base.layering(layeringTopological());
  }
  return base;
}

/**
 * dagre-compatible mutable graph backed by d3-dag
 *
 * Accessed as `dagre.graphlib.Graph`. Use with {@link dagre.layout}.
 *
 * @example
 *
 * ```ts
 * import { dagre } from "d3-dag";
 *
 * const grf = new dagre.graphlib.Graph();
 * grf.setGraph({});
 * grf.setDefaultEdgeLabel(() => ({}));
 * grf.setNode("a", { width: 40, height: 40 });
 * grf.setNode("b", { width: 40, height: 40 });
 * grf.setEdge("a", "b");
 * dagre.layout(grf);
 * const pos = grf.node("a"); // { x, y, width, height }
 * ```
 */
export class DagreGraph {
  #mutGraph = graph<IdDagreNode, undefined>();
  #graphNodes = new Map<string, MutGraphNode<IdDagreNode, undefined>>();
  #defaultNodeLabel: () => {
    readonly width?: number;
    readonly height?: number;
  } = () => ({});
  #config: Required<DagreGraphConfig> = {
    rankdir: "TB",
    nodesep: 50,
    ranksep: 50,
    quality: "medium",
    ranker: "network-simplex",
    algorithm: "sugiyama",
    width: 0,
    height: 0,
  };

  /** set graph configuration */
  setGraph(config?: DagreGraphConfig): this {
    if (config) {
      if (config.rankdir !== undefined) this.#config.rankdir = config.rankdir;
      if (config.nodesep !== undefined) this.#config.nodesep = config.nodesep;
      if (config.ranksep !== undefined) this.#config.ranksep = config.ranksep;
      if (config.quality !== undefined) this.#config.quality = config.quality;
      if (config.ranker !== undefined) this.#config.ranker = config.ranker;
      if (config.algorithm !== undefined)
        this.#config.algorithm = config.algorithm;
    }
    return this;
  }

  /** get graph configuration (includes width/height after layout) */
  graph(): Required<DagreGraphConfig> {
    return { ...this.#config };
  }

  /** set default node label factory, used when {@link setNode} is called without a label */
  setDefaultNodeLabel(
    fn: () => { readonly width?: number; readonly height?: number },
  ): this {
    this.#defaultNodeLabel = fn;
    return this;
  }

  /** set default edge label factory (accepted for compatibility, not used) */
  setDefaultEdgeLabel(_fn: () => Record<string, unknown>): this {
    return this;
  }

  /** add or update a node */
  setNode(
    id: string,
    label?: { readonly width?: number; readonly height?: number },
  ): this {
    const existing = this.#graphNodes.get(id);
    if (existing) {
      if (label !== undefined) {
        existing.data.width = label.width ?? 0;
        existing.data.height = label.height ?? 0;
      }
    } else {
      const resolved = label ?? this.#defaultNodeLabel();
      this.#graphNodes.set(
        id,
        this.#mutGraph.node({
          id,
          width: resolved.width ?? 0,
          height: resolved.height ?? 0,
          x: 0,
          y: 0,
        }),
      );
    }
    return this;
  }

  /** add or update multiple nodes */
  setNodes(
    ids: string[],
    label?: { readonly width?: number; readonly height?: number },
  ): this {
    for (const id of ids) this.setNode(id, label);
    return this;
  }

  /** add an edge (label is accepted for dagre compatibility but not used) */
  setEdge(v: string, w: string, _label?: Record<string, unknown>): this {
    const src = this.#graphNodes.get(v);
    const tgt = this.#graphNodes.get(w);
    if (!src) throw err`edge references unknown source node: ${v}`;
    if (!tgt) throw err`edge references unknown target node: ${w}`;
    if (src.nchildLinksTo(tgt) === 0) {
      this.#mutGraph.link(src, tgt);
    }
    return this;
  }

  /** check if a node exists */
  hasNode(id: string): boolean {
    return this.#graphNodes.has(id);
  }

  /** check if an edge exists */
  hasEdge(v: string, w: string): boolean {
    const src = this.#graphNodes.get(v);
    const tgt = this.#graphNodes.get(w);
    if (!src || !tgt) return false;
    return src.nchildLinksTo(tgt) > 0;
  }

  /** remove a node and all its edges */
  removeNode(id: string): this {
    const graphNode = this.#graphNodes.get(id);
    if (graphNode) {
      graphNode.delete();
      this.#graphNodes.delete(id);
    }
    return this;
  }

  /** remove an edge */
  removeEdge(v: string, w: string): this {
    const src = this.#graphNodes.get(v);
    const tgt = this.#graphNodes.get(w);
    if (src && tgt) {
      for (const link of src.childLinksTo(tgt)) {
        link.delete();
        break;
      }
    }
    return this;
  }

  /** get node label (includes x, y after layout) */
  node(id: string): DagreNode {
    const graphNode = this.#graphNodes.get(id);
    if (!graphNode) throw err`unknown node: ${id}`;
    return graphNode.data;
  }

  /** get edge label (includes points after layout) */
  edge(v: string, w: string): DagreEdge {
    const src = this.#graphNodes.get(v);
    const tgt = this.#graphNodes.get(w);
    if (!src || !tgt) throw err`unknown edge: ${v} -> ${w}`;
    for (const link of src.childLinksTo(tgt)) {
      return {
        points: link.points.map(([x, y]) => ({ x, y })),
      };
    }
    throw err`unknown edge: ${v} -> ${w}`;
  }

  /** get all node ids */
  nodes(): string[] {
    return [...this.#graphNodes.keys()];
  }

  /** get all edges as `{ v, w }` descriptors */
  edges(): DagreEdgeDescriptor[] {
    return Array.from(this.#mutGraph.links(), (link) => ({
      v: link.source.data.id,
      w: link.target.data.id,
    }));
  }

  /** number of nodes */
  nodeCount(): number {
    return this.#graphNodes.size;
  }

  /** number of edges */
  edgeCount(): number {
    return this.#mutGraph.nlinks();
  }

  /** get predecessor node ids */
  predecessors(id: string): string[] {
    const node = this.#graphNodes.get(id);
    if (!node) throw err`unknown node: ${id}`;
    return Array.from(node.parents(), (n) => n.data.id);
  }

  /** get successor node ids */
  successors(id: string): string[] {
    const node = this.#graphNodes.get(id);
    if (!node) throw err`unknown node: ${id}`;
    return Array.from(node.children(), (n) => n.data.id);
  }

  /** get all neighbor node ids (predecessors and successors, deduplicated) */
  neighbors(id: string): string[] {
    const node = this.#graphNodes.get(id);
    if (!node) throw err`unknown node: ${id}`;
    const seen = new Set<string>();
    for (const n of node.parents()) seen.add(n.data.id);
    for (const n of node.children()) seen.add(n.data.id);
    return [...seen];
  }

  #edgesOf(
    v: string,
    w: string | undefined,
    linksTo: "parentLinksTo" | "childLinksTo",
    linksAll: "parentLinks" | "childLinks",
  ): DagreEdgeDescriptor[] {
    const node = this.#graphNodes.get(v);
    if (!node) throw err`unknown node: ${v}`;
    if (w !== undefined) {
      const other = this.#graphNodes.get(w);
      if (!other) throw err`unknown node: ${w}`;
      return Array.from(node[linksTo](other), (link) => ({
        v: link.source.data.id,
        w: link.target.data.id,
      }));
    }
    return Array.from(node[linksAll](), (link) => ({
      v: link.source.data.id,
      w: link.target.data.id,
    }));
  }

  /** get incoming edge descriptors, optionally filtered to edges from `w` */
  inEdges(v: string, w?: string): DagreEdgeDescriptor[] {
    return this.#edgesOf(v, w, "parentLinksTo", "parentLinks");
  }

  /** get outgoing edge descriptors, optionally filtered to edges to `w` */
  outEdges(v: string, w?: string): DagreEdgeDescriptor[] {
    return this.#edgesOf(v, w, "childLinksTo", "childLinks");
  }

  /** get all edge descriptors incident to `v`, optionally filtered to edges with `w` */
  nodeEdges(v: string, w?: string): DagreEdgeDescriptor[] {
    const node = this.#graphNodes.get(v);
    if (!node) throw err`unknown node: ${v}`;
    const other = w !== undefined ? this.#graphNodes.get(w) : undefined;
    if (w !== undefined && !other) throw err`unknown node: ${w}`;
    const toDesc = (link: {
      source: { data: { id: string } };
      target: { data: { id: string } };
    }): DagreEdgeDescriptor => ({
      v: link.source.data.id,
      w: link.target.data.id,
    });
    const result: DagreEdgeDescriptor[] = [];
    if (other) {
      for (const link of node.parentLinksTo(other)) result.push(toDesc(link));
      for (const link of node.childLinksTo(other)) result.push(toDesc(link));
    } else {
      for (const link of node.parentLinks()) result.push(toDesc(link));
      for (const link of node.childLinks()) result.push(toDesc(link));
    }
    return result;
  }

  /** get source node ids (no parents) */
  sources(): string[] {
    return Array.from(this.#mutGraph.sources(), (n) => n.data.id);
  }

  /** get sink node ids (no children) */
  sinks(): string[] {
    return Array.from(this.#mutGraph.sinks(), (n) => n.data.id);
  }

  /** always true — dagre graphs are directed */
  isDirected(): true {
    return true;
  }

  /** always false — compound graphs are not supported */
  isCompound(): false {
    return false;
  }

  /** true if the graph has multiple edges between the same pair of nodes */
  isMultigraph(): boolean {
    return this.#mutGraph.multi();
  }

  /** add edges between consecutive pairs of nodes */
  setPath(nodes: string[]): this {
    for (let i = 0; i < nodes.length - 1; i++) {
      this.setEdge(nodes[i], nodes[i + 1]);
    }
    return this;
  }

  /** create a new graph containing only nodes that pass the filter */
  filterNodes(fn: (id: string) => boolean): DagreGraph {
    const result = new DagreGraph();
    result.#config = { ...this.#config };
    result.#defaultNodeLabel = this.#defaultNodeLabel;
    for (const [id, graphNode] of this.#graphNodes) {
      if (fn(id)) {
        result.setNode(id, {
          width: graphNode.data.width,
          height: graphNode.data.height,
        });
      }
    }
    for (const link of this.#mutGraph.links()) {
      const v = link.source.data.id;
      const w = link.target.data.id;
      if (result.hasNode(v) && result.hasNode(w)) {
        result.setEdge(v, w);
      }
    }
    return result;
  }

  /**
   * run layout — called by {@link dagre.layout}
   *
   * @internal
   */
  static layout(grf: DagreGraph, operator?: DagreOperator): void {
    const config = grf.#config;

    if (grf.#mutGraph.nnodes() === 0) {
      config.width = 0;
      config.height = 0;
      return;
    }

    const isHorizontal = config.rankdir === "LR" || config.rankdir === "RL";

    const nodeSizeFn = (
      graphNode: GraphNode<IdDagreNode, undefined>,
    ): readonly [number, number] => {
      const w = graphNode.data.width;
      const h = graphNode.data.height;
      return isHorizontal ? [h, w] : [w, h];
    };

    const gap: readonly [number, number] = isHorizontal
      ? [config.ranksep, config.nodesep]
      : [config.nodesep, config.ranksep];

    const extraTweaks: Tweak<IdDagreNode, undefined>[] = [];

    let op: DagreOperator;
    if (operator) {
      // custom operator: apply nodeSize/gap but not direction or algorithm tweaks
      // (the caller is responsible for their own tweaks)
      op = operator;
    } else {
      if (config.algorithm === "zherebko") {
        op = zherebko();
      } else if (config.algorithm === "grid") {
        op = grid();
        extraTweaks.push(tweakGridHandles(nodeSizeFn, gap));
      } else {
        op = presetSugiyama(config.quality, config.ranker);
        extraTweaks.push(tweakSugiyama(nodeSizeFn));
      }
      extraTweaks.push(tweakDirection(config.rankdir ?? "TB"));
    }

    const existingTweaks = op.tweaks();
    const configured = op
      .nodeSize(nodeSizeFn)
      .gap(gap)
      .tweaks([...existingTweaks, ...extraTweaks]);

    const result = configured(grf.#mutGraph);

    // write results back
    config.width = result.width;
    config.height = result.height;

    for (const graphNode of grf.#mutGraph.nodes()) {
      graphNode.data.x = graphNode.x;
      graphNode.data.y = graphNode.y;
    }
  }
}

/**
 * dagre-compatible namespace backed by d3-dag
 *
 * Drop-in replacement for `dagre` using d3-dag's layout algorithms.
 * Optionally pass a custom {@link sugiyama} or {@link zherebko} operator
 * to `layout` for fine-tuned algorithm selection.
 *
 * @example
 *
 * ```ts
 * import { dagre } from "d3-dag";
 *
 * const grf = new dagre.graphlib.Graph();
 * grf.setGraph({});
 * grf.setDefaultEdgeLabel(() => ({}));
 * grf.setNode("a", { width: 40, height: 40 });
 * grf.setNode("b", { width: 40, height: 40 });
 * grf.setEdge("a", "b");
 * dagre.layout(grf);
 * const { x, y } = grf.node("a");
 * ```
 */
export const dagre = {
  /** graph constructors */
  graphlib: {
    /** dagre-compatible graph class */
    Graph: DagreGraph,
  },
  /**
   * run layout on a graph, mutating it in-place
   *
   * Sets `x`/`y` on node labels, `points` on edge labels, and
   * `width`/`height` on the graph config.
   *
   * @param grf - the graph to lay out
   * @param operator - optional {@link Operator}; graph config is applied on top
   */
  layout: DagreGraph.layout,
} as const;
