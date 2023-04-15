import { graph, Graph, GraphNode, MutGraph } from ".";
import { entries } from "../iters";
import { err, U } from "../utils";

/** an interface for hydrating serialized graph data */
export interface Hydrator<T = unknown> {
  (parsed: unknown): T;
}

interface SerializedNode {
  readonly x?: number | undefined;
  readonly y?: number | undefined;
  readonly data?: unknown;
}

function isSerializedNode(val: unknown): val is SerializedNode {
  if (typeof val !== "object" || val === null) {
    return false;
  }
  const x = "x" in val ? val.x : undefined;
  const y = "y" in val ? val.y : undefined;
  const data = "data" in val ? val.data : undefined;
  if (
    (typeof x !== "number" && x !== undefined) ||
    (typeof y !== "number" && y !== undefined)
  ) {
    return false;
  }
  const _: SerializedNode = { x, y, data };
  return true;
}

interface SerializedLink {
  readonly source: number;
  readonly target: number;
  readonly points: readonly (readonly [number, number])[];
  readonly data?: unknown;
}

function isPoint(val: unknown): val is [number, number] {
  if (!Array.isArray(val) || val.length !== 2) {
    return false;
  }
  const unk: unknown[] = val;
  const [zero, one] = unk;
  return typeof zero === "number" && typeof one === "number";
}

function isSerializedLink(val: unknown): val is SerializedLink {
  if (
    typeof val !== "object" ||
    val === null ||
    !("source" in val) ||
    !("target" in val) ||
    !("points" in val)
  ) {
    return false;
  }
  const { source, target, points } = val;
  const data = "data" in val ? val.data : undefined;
  if (
    typeof source !== "number" ||
    typeof target !== "number" ||
    !Array.isArray(points) ||
    !points.every(isPoint)
  ) {
    return false;
  }
  const _: SerializedLink = { source, target, points, data };
  return true;
}

interface Serialized {
  readonly nodes: readonly SerializedNode[];
  readonly links: readonly SerializedLink[];
  readonly index?: number | undefined;
  readonly v: number;
}

/** convert graph to json */
export function toJson(grf: Graph): unknown {
  // serialize nodes
  const nodes: SerializedNode[] = [];
  let index;
  const inds = new Map<GraphNode, number>();
  for (const [ind, node] of entries(grf.nodes())) {
    inds.set(node, ind);
    nodes.push({ x: node.ux, y: node.uy, data: node.data });
    if (node === grf) {
      index = ind;
    }
  }

  // serialize links
  const links: SerializedLink[] = [];
  for (const { source, target, data, points } of grf.links()) {
    links.push({
      source: inds.get(source)!,
      target: inds.get(target)!,
      points,
      data,
    });
  }
  const result: Serialized = { nodes, links, index, v: 1 };
  return result;
}

function deserialize<N, L>(
  nodes: readonly SerializedNode[],
  links: readonly SerializedLink[],
  index: number | undefined,
  hnode: Hydrator<N>,
  hlink: Hydrator<L>
): MutGraph<N, L> {
  const res = graph<N, L>();
  // deserialize nodes
  const hydrated = nodes.map(({ x, y, data }) => {
    const node = res.node(hnode(data));
    node.ux = x;
    node.uy = y;
    return node;
  });
  // deserialize links
  for (const { source, target, points, data } of links) {
    const link = res.link(hydrated[source], hydrated[target], hlink(data));
    link.points = points.map(([x, y]) => [x, y]);
  }
  if (index === undefined) {
    return res;
  } else {
    return hydrated[index];
  }
}

/** extra options for deserializing a a graph */
export interface GraphJsonOptions<NodeDatum, LinkDatum> {
  /** a hydration option for node data */
  nodeDatum?: Hydrator<NodeDatum>;
  /** a hydration option for link data */
  linkDatum?: Hydrator<LinkDatum>;
}

/** the operator that define hydration */
export interface HydrateOps<out N = unknown, out L = unknown> {
  /** the node datum operator */
  nodeDatum: Hydrator<N>;
  /** the link datum operator */
  linkDatum: Hydrator<L>;
}

/** An operator that hydrates serialized json into a graph */
export interface Hydrate<
  NodeDatum,
  LinkDatum,
  Ops extends HydrateOps<NodeDatum, LinkDatum>
> {
  (json: unknown): MutGraph<NodeDatum, LinkDatum>;

  /** set custom hydration for node data */
  nodeDatum<NN, NewNode extends Hydrator<NN>>(
    val: NewNode & Hydrator<NN>
  ): Hydrate<NN, LinkDatum, U<Ops, "nodeDatum", NewNode>>;
  /** get the node data hydrator */
  nodeDatum(): Ops["nodeDatum"];

  /** set custom hydration for link data */
  linkDatum<NL, NewLink extends Hydrator<NL>>(
    val: NewLink & Hydrator<NL>
  ): Hydrate<NodeDatum, NL, U<Ops, "linkDatum", NewLink>>;
  /** get the link data hydrator */
  linkDatum(): Ops["linkDatum"];

  // TODO there's no way to force this to deserialize to a node, but maybe we
  // should have an option that does the assert or raises an error
}

function buildOperator<N, L, O extends HydrateOps<N, L>>(
  ops: O & HydrateOps<N, L>
): Hydrate<N, L, O> {
  function graphJson(parsedJson: unknown): MutGraph<N, L> {
    if (typeof parsedJson !== "object" || parsedJson === null) {
      throw err`parsedJson was null or wasn't an object: ${parsedJson}`;
    } else if (!("nodes" in parsedJson) || !("links" in parsedJson)) {
      throw err`parsedJson didn't have 'nodes' and 'links' properties: ${parsedJson}`;
    }
    const { nodes, links } = parsedJson;
    const index = "index" in parsedJson ? parsedJson.index : undefined;
    if (!Array.isArray(nodes) || !Array.isArray(links)) {
      throw err`'nodes' and 'links' weren't arrays: ${parsedJson}`;
    } else if (
      !nodes.every(isSerializedNode) ||
      !links.every(isSerializedLink) ||
      (index !== undefined && typeof index !== "number")
    ) {
      throw err`'nodes' and 'links' didn't have the appropriate structure: ${parsedJson}`;
    }
    return deserialize(nodes, links, index, ops.nodeDatum, ops.linkDatum);
  }

  function nodeDatum(): O["nodeDatum"];
  function nodeDatum<NN, NH extends Hydrator<NN>>(
    val: NH
  ): Hydrate<NN, L, U<O, "nodeDatum", NH>>;
  function nodeDatum<NN, NH extends Hydrator<NN>>(
    val?: NH
  ): O["nodeDatum"] | Hydrate<NN, L, U<O, "nodeDatum", NH>> {
    if (val === undefined) {
      return ops.nodeDatum;
    } else {
      const { nodeDatum: _, ...rest } = ops;
      return buildOperator({ nodeDatum: val, ...rest });
    }
  }
  graphJson.nodeDatum = nodeDatum;

  function linkDatum(): O["linkDatum"];
  function linkDatum<NL, NH extends Hydrator<NL>>(
    val: NH
  ): Hydrate<N, NL, U<O, "linkDatum", NH>>;
  function linkDatum<NL, NH extends Hydrator<NL>>(
    val?: NH
  ): O["linkDatum"] | Hydrate<N, NL, U<O, "linkDatum", NH>> {
    if (val === undefined) {
      return ops.linkDatum;
    } else {
      const { linkDatum: _, ...rest } = ops;
      return buildOperator({ linkDatum: val, ...rest });
    }
  }
  graphJson.linkDatum = linkDatum;

  return graphJson;
}

/** The default operator created by {@link graphJson} */
export type DefaultHydrate = Hydrate<unknown, unknown, HydrateOps>;

/** create a graph constructor from deserialized json */
export function graphJson(...args: readonly never[]): DefaultHydrate {
  if (args.length) {
    throw err`got arguments to graphJson(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphJson()(...)\``;
  } else {
    return buildOperator({
      nodeDatum: (n) => n,
      linkDatum: (l) => l,
    });
  }
}
