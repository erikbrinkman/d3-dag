/**
 * A dagre-compatible drop-in layout adapter backed by d3-dag's sugiyama
 *
 * @packageDocumentation
 */
import type {
  Graph,
  GraphNode,
  MutGraphLink,
  MutGraphNode,
} from "./graph/index.js";
import { graph } from "./graph/index.js";
import { grid } from "./grid/index.js";
import type { Operator, Rankdir } from "./layout.js";
import { coordGreedy } from "./sugiyama/coord/greedy.js";
import { decrossDfs } from "./sugiyama/decross/dfs.js";
import { decrossOpt } from "./sugiyama/decross/opt.js";
import type { Sugiyama, SugiyamaOps } from "./sugiyama/index.js";
import { sugiyama } from "./sugiyama/index.js";
import { layeringLongestPath } from "./sugiyama/layering/longest-path.js";
import { layeringTopological } from "./sugiyama/layering/topological.js";
import type { Tweak } from "./tweaks.js";
import { tweakDirection, tweakGridHandles, tweakSugiyama } from "./tweaks.js";
import { err, ierr } from "./utils.js";
import { zherebko } from "./zherebko/index.js";

type StoredNode = Partial<DagreNode>;
type StoredEdge = Partial<DagreEdge>;
type DagreOperator = Operator<DagreLayoutNode, DagreLayoutEdge>;
type DagreSugiyama = Sugiyama<SugiyamaOps<DagreLayoutNode, DagreLayoutEdge>>;

export type { Rankdir } from "./layout.js";

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
  /** layering algorithm (default: `"network-simplex"`) */
  ranker?: DagreRanker;
  /** layout algorithm (default: `"sugiyama"`); `quality`/`ranker` only apply to sugiyama */
  algorithm?: DagreAlgorithm;
  /** total layout width (set by {@link dagre.layout}) */
  width?: number;
  /** total layout height (set by {@link dagre.layout}) */
  height?: number;
}

/** node label passed to {@link DagreGraph.setNode} */
export interface DagreNodeLabel {
  /** node width (default: `0`) */
  readonly width?: number;
  /** node height (default: `0`) */
  readonly height?: number;
}

/** node label with position (`x` and `y` set by {@link dagre.layout}) */
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

/** edge label passed to {@link DagreGraph.setEdge} */
export type DagreEdgeLabel = object;

/** edge label with control points (`points` set by {@link dagre.layout}) */
export interface DagreEdge {
  /** control points (matches dagre's `{x, y}` format) */
  points: DagrePoint[];
}

/**
 * node label seen by an operator passed to {@link dagre.layout}
 *
 * Its `x` and `y` are unset until layout finishes.
 */
export interface DagreLayoutNode extends Partial<DagreNode> {
  /** node width */
  width: number;
  /** node height */
  height: number;
}

/** edge label seen by an operator passed to {@link dagre.layout} */
export type DagreLayoutEdge = Partial<DagreEdge>;

/** edge descriptor returned by {@link DagreGraph.edges} */
export interface DagreEdgeDescriptor {
  /** source node id */
  v: string;
  /** target node id */
  w: string;
}

/** check whether a label is an object for dagre.layout to write onto */
function isLabel(label: unknown): label is object {
  return typeof label === "object" && label !== null;
}

/** fill a missing node width or height with 0 */
function fillSizes(
  grf: Graph<StoredNode, StoredEdge>,
): asserts grf is Graph<DagreLayoutNode, DagreLayoutEdge> {
  for (const graphNode of grf.nodes()) {
    graphNode.data.width ??= 0;
    graphNode.data.height ??= 0;
  }
}

function presetSugiyama(
  quality: DagreQuality,
  ranker: DagreRanker,
): DagreSugiyama {
  let base: DagreSugiyama;
  if (quality === "fast") {
    base = sugiyama().decross(decrossDfs()).coord(coordGreedy());
  } else if (quality === "slow") {
    base = sugiyama().decross(decrossOpt().check("slow"));
  } else {
    base = sugiyama();
  }
  // "network-simplex" is sugiyama's default layering
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
 * Accessed as `dagre.graphlib.Graph`. Use with {@link dagre.layout}. Like dagre's
 * `Graph`, it takes the graph, node and edge label types as parameters, so {@link
 * node} returns the node label with `x` and `y`, and {@link edge} returns the edge
 * label with `points`.
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
 * const pos = grf.node("a"); // the label passed to setNode, with x and y
 * ```
 */
export class DagreGraph<
  GraphLabel extends DagreGraphConfig = DagreGraphConfig,
  NodeLabel extends DagreNodeLabel = DagreNodeLabel,
  EdgeLabel extends DagreEdgeLabel = DagreEdgeLabel,
> {
  #mutGraph = graph<StoredNode, StoredEdge>();
  #graphNodes = new Map<string, MutGraphNode<StoredNode, StoredEdge>>();
  #ids = new Map<GraphNode<StoredNode, StoredEdge>, string>();
  #defaultNodeLabel: () => DagreNodeLabel = () => ({});
  #label: GraphLabel | undefined;

  /**
   * set the graph label, replacing any earlier one
   *
   * The object is kept as is: {@link dagre.layout} reads its options, using defaults
   * for missing ones without writing them, and writes `width` and `height` onto it.
   */
  setGraph(label: GraphLabel): this {
    if (!isLabel(label)) {
      throw err`graph labels must be objects: ${label}`;
    } else {
      this.#label = label;
      return this;
    }
  }

  /** get the graph label passed to {@link setGraph} (includes `width` and `height` after layout) */
  graph(): GraphLabel {
    // undefined until setGraph runs; typed as set to match dagre
    return this.#label as GraphLabel;
  }

  /** set default node label factory, used when {@link setNode} is called without a label */
  setDefaultNodeLabel(fn: () => NodeLabel): this {
    this.#defaultNodeLabel = fn;
    return this;
  }

  /** set default edge label factory (accepted for compatibility, not used) */
  setDefaultEdgeLabel(_fn: () => EdgeLabel): this {
    return this;
  }

  /**
   * add or update a node
   *
   * The label object is kept as is, and {@link dagre.layout} writes `x` and `y` onto it.
   */
  setNode(id: string, label?: NodeLabel): this {
    if (label !== undefined && !isLabel(label)) {
      throw err`node labels must be objects: ${label}`;
    } else {
      return this.#setNode(id, label);
    }
  }

  #setNode(id: string, data: StoredNode | undefined): this {
    const existing = this.#graphNodes.get(id);
    if (existing) {
      if (data !== undefined) existing.data = data;
    } else {
      const label = data ?? this.#defaultNodeLabel();
      if (!isLabel(label)) {
        throw err`node labels must be objects: ${label}`;
      }
      const node = this.#mutGraph.node(label);
      this.#graphNodes.set(id, node);
      this.#ids.set(node, id);
    }
    return this;
  }

  /** add or update multiple nodes */
  setNodes(ids: string[], label?: NodeLabel): this {
    for (const id of ids) this.setNode(id, label);
    return this;
  }

  /**
   * add or update an edge
   *
   * The label object is kept as is, and {@link dagre.layout} writes `points` onto it.
   * Fields such as `minlen` or `weight` are kept but don't affect layout.
   */
  setEdge(v: string, w: string, label?: EdgeLabel): this {
    if (label !== undefined && !isLabel(label)) {
      throw err`edge labels must be objects: ${label}`;
    }
    return this.#setEdge(v, w, label);
  }

  #setEdge(v: string, w: string, data: StoredEdge | undefined): this {
    if (!this.#graphNodes.has(v)) this.setNode(v);
    if (!this.#graphNodes.has(w)) this.setNode(w);
    const src = this.#graphNodes.get(v)!;
    const tgt = this.#graphNodes.get(w)!;
    let existing: MutGraphLink<StoredNode, StoredEdge> | undefined;
    for (const link of src.childLinksTo(tgt)) {
      existing = link;
      break;
    }
    if (existing) {
      if (data !== undefined) existing.data = data;
    } else {
      this.#mutGraph.link(src, tgt, data ?? {});
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
      this.#ids.delete(graphNode);
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

  /** get the node label passed to {@link setNode} (includes `x` and `y` after layout) */
  node(id: string): NodeLabel & DagreNode {
    const graphNode = this.#graphNodes.get(id);
    if (!graphNode) throw err`unknown node: ${id}`;
    // x and y are unset until dagre.layout runs; typed as set to match dagre
    return graphNode.data as NodeLabel & DagreNode;
  }

  /** get the edge label passed to {@link setEdge} (includes `points` after layout) */
  edge(v: string, w: string): EdgeLabel & DagreEdge {
    const src = this.#graphNodes.get(v);
    const tgt = this.#graphNodes.get(w);
    if (!src || !tgt) throw err`unknown edge: ${v} -> ${w}`;
    for (const link of src.childLinksTo(tgt)) {
      // points is unset until dagre.layout runs; typed as set to match dagre
      return link.data as EdgeLabel & DagreEdge;
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
      v: this.#idOf(link.source),
      w: this.#idOf(link.target),
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
    return Array.from(node.parents(), (node) => this.#idOf(node));
  }

  /** get successor node ids */
  successors(id: string): string[] {
    const node = this.#graphNodes.get(id);
    if (!node) throw err`unknown node: ${id}`;
    return Array.from(node.children(), (node) => this.#idOf(node));
  }

  /** get all neighbor node ids (predecessors and successors, deduplicated) */
  neighbors(id: string): string[] {
    const node = this.#graphNodes.get(id);
    if (!node) throw err`unknown node: ${id}`;
    const seen = new Set<string>();
    for (const parent of node.parents()) seen.add(this.#idOf(parent));
    for (const child of node.children()) seen.add(this.#idOf(child));
    return [...seen];
  }

  #idOf(node: GraphNode<StoredNode, StoredEdge>): string {
    const id = this.#ids.get(node);
    if (id === undefined) {
      throw ierr`node has no id`;
    } else {
      return id;
    }
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
        v: this.#idOf(link.source),
        w: this.#idOf(link.target),
      }));
    }
    return Array.from(node[linksAll](), (link) => ({
      v: this.#idOf(link.source),
      w: this.#idOf(link.target),
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
    const toDesc = (
      link: MutGraphLink<StoredNode, StoredEdge>,
    ): DagreEdgeDescriptor => ({
      v: this.#idOf(link.source),
      w: this.#idOf(link.target),
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
    return Array.from(this.#mutGraph.sources(), (node) => this.#idOf(node));
  }

  /** get sink node ids (no children) */
  sinks(): string[] {
    return Array.from(this.#mutGraph.sinks(), (node) => this.#idOf(node));
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

  /** create a new graph containing only nodes that pass the filter, sharing the graph label */
  filterNodes(
    fn: (id: string) => boolean,
  ): DagreGraph<GraphLabel, NodeLabel, EdgeLabel> {
    const result = new DagreGraph<GraphLabel, NodeLabel, EdgeLabel>();
    result.#label = this.#label;
    result.#defaultNodeLabel = this.#defaultNodeLabel;
    for (const [id, graphNode] of this.#graphNodes) {
      if (fn(id)) result.#setNode(id, graphNode.data);
    }
    for (const link of this.#mutGraph.links()) {
      const v = this.#idOf(link.source);
      const w = this.#idOf(link.target);
      if (result.hasNode(v) && result.hasNode(w)) {
        result.#setEdge(v, w, link.data);
      }
    }
    return result;
  }

  /**
   * run layout — called by {@link dagre.layout}
   *
   * @internal
   */
  static layout<
    GraphLabel extends DagreGraphConfig,
    NodeLabel extends DagreNodeLabel,
    EdgeLabel extends DagreEdgeLabel,
  >(
    grf: DagreGraph<GraphLabel, NodeLabel, EdgeLabel>,
    operator?: DagreOperator,
  ): void {
    const label: DagreGraphConfig | undefined = grf.#label;
    if (label === undefined) {
      throw err`setGraph must be called before dagre.layout`;
    }
    const {
      rankdir = "TB",
      nodesep = 50,
      ranksep = 50,
      quality = "medium",
      ranker = "network-simplex",
      algorithm = "sugiyama",
    } = label;

    const mutGraph = grf.#mutGraph;
    if (mutGraph.nnodes() === 0) {
      label.width = 0;
      label.height = 0;
      return;
    }

    const isHorizontal = rankdir === "LR" || rankdir === "RL";

    const nodeSizeFn = (
      graphNode: GraphNode<DagreLayoutNode, DagreLayoutEdge>,
    ): readonly [number, number] => {
      const { width, height } = graphNode.data;
      return isHorizontal ? [height, width] : [width, height];
    };

    // the layout runs top to bottom and tweakDirection rotates it afterwards,
    // so only the node size is swapped for horizontal layouts, not the gap
    const gap: readonly [number, number] = [nodesep, ranksep];

    const extraTweaks: Tweak<DagreLayoutNode, DagreLayoutEdge>[] = [];

    let op: DagreOperator;
    if (operator) {
      // caller supplies the algorithm and its handle tweaks; graph config still
      // applies on top, with rankdir handled uniformly by tweakDirection below
      op = operator;
    } else {
      if (algorithm === "zherebko") {
        op = zherebko();
      } else if (algorithm === "grid") {
        op = grid();
        extraTweaks.push(tweakGridHandles(nodeSizeFn, gap));
      } else {
        op = presetSugiyama(quality, ranker);
        extraTweaks.push(tweakSugiyama(nodeSizeFn));
      }
    }
    extraTweaks.push(tweakDirection(rankdir));

    const existingTweaks = op.tweaks();
    const configured = op
      .nodeSize(nodeSizeFn)
      .gap(gap)
      .tweaks([...existingTweaks, ...extraTweaks]);

    fillSizes(mutGraph);
    const result = configured(mutGraph);

    // write results back
    label.width = result.width;
    label.height = result.height;

    for (const graphNode of mutGraph.nodes()) {
      graphNode.data.x = graphNode.x;
      graphNode.data.y = graphNode.y;
    }
    for (const link of mutGraph.links()) {
      link.data.points = link.points.map(([x, y]) => ({ x, y }));
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: dagre's own Graph defaults its label types to any
type AnyLabel = any;

const graphlibGraph: {
  /** create an empty graph */
  new <
    GraphLabel extends DagreGraphConfig = AnyLabel,
    NodeLabel extends DagreNodeLabel = AnyLabel,
    EdgeLabel extends DagreEdgeLabel = AnyLabel,
  >(): DagreGraph<GraphLabel, NodeLabel, EdgeLabel>;
} = DagreGraph;

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
    /** dagre-compatible graph class; label types default to `any`, as in dagre */
    Graph: graphlibGraph,
  },
  /**
   * run layout on a graph, mutating it in-place
   *
   * Sets `x` and `y` on node labels, `points` on edge labels, and `width` and
   * `height` on the graph label.
   *
   * @param grf - the graph to lay out
   * @param operator - optional {@link Operator}; graph config is applied on top
   */
  layout: DagreGraph.layout,
} as const;
