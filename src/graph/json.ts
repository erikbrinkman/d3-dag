import { entries } from "../iters";
import { err, type U } from "../utils";
import { type Graph, type GraphNode, graph, type MutGraph } from ".";

/** an interface for hydrating serialized graph data */
export type Hydrator<T = unknown> = (parsed: unknown) => T;

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
  let index: number | undefined;
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
  hlink: Hydrator<L>,
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

/** the operator that defines hydration */
export interface JsonOps<out N = unknown, out L = unknown> {
  /** the node datum operator */
  nodeDatum: Hydrator<N>;
  /** the link datum operator */
  linkDatum: Hydrator<L>;
}

/**
 * an operator that hydrates serialized json into a graph
 *
 * Since type information is inherently lost with serialization, use {@link
 * nodeDatum} and {@link linkDatum} to define node and link data type, and
 * optionally perform extra deserialization.
 *
 * @typeParam NodeDatum - the node data type of the deserialized graph
 * @typeParam LinkDatum - the link data type of the deserialized graph
 * @typeParam Ops - the operators associated with deserialization
 */
export interface Json<
  NodeDatum,
  LinkDatum,
  Ops extends JsonOps<NodeDatum, LinkDatum>,
> {
  /**
   * deserialize parsed json as a graph
   *
   * @param json - the parsed json, usually created from `JSON.parse`
   * @returns graph - the deserialized graph
   */
  (json: unknown): MutGraph<NodeDatum, LinkDatum>;

  /**
   * set custom hydration for node data
   *
   * @example
   *
   * In the simpliest case, this can be used to cast the data types
   * appropriately (or alternatively you could just cast the Graph itself.
   *
   * ```ts
   * const grf: Graph<number> = ...
   * const builder = graphJson().nodeDatum(data => data as number);
   * const deser: MutGraph<number> = builder(JSON.parse(JSON.serialize(grf)));
   * ```
   *
   * @example
   *
   * Ideally though, you'll use typescripts warnings to make serialization
   * error proof:
   *
   * ```ts
   * const grf: Graph<number> = ...
   * const builder = graphJson().nodeDatum(data => {
   *   if (typeof data === "number") {
   *     return data;
   *   } else {
   *     throw new Error("...");
   *   }
   * });
   * const deser: MutGraph<number> = builder(JSON.parse(JSON.serialize(grf)));
   * ```
   */
  nodeDatum<NN, NewNode extends Hydrator<NN>>(
    val: NewNode & Hydrator<NN>,
  ): Json<NN, LinkDatum, U<Ops, "nodeDatum", NewNode>>;
  /** get the node data hydrator */
  nodeDatum(): Ops["nodeDatum"];

  /**
   * set custom hydration for link data
   *
   * See {@link nodeDatum} for example of what {@link Hydrator}s should look
   * like.
   */
  linkDatum<NL, NewLink extends Hydrator<NL>>(
    val: NewLink & Hydrator<NL>,
  ): Json<NodeDatum, NL, U<Ops, "linkDatum", NewLink>>;
  /** get the link data hydrator */
  linkDatum(): Ops["linkDatum"];

  // TODO there's no way to force this to deserialize to a node, but maybe we
  // should have an option that does the assert or raises an error
}

function buildOperator<N, L, O extends JsonOps<N, L>>(
  ops: O & JsonOps<N, L>,
): Json<N, L, O> {
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
    val: NH,
  ): Json<NN, L, U<O, "nodeDatum", NH>>;
  function nodeDatum<NN, NH extends Hydrator<NN>>(
    val?: NH,
  ): O["nodeDatum"] | Json<NN, L, U<O, "nodeDatum", NH>> {
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
    val: NH,
  ): Json<N, NL, U<O, "linkDatum", NH>>;
  function linkDatum<NL, NH extends Hydrator<NL>>(
    val?: NH,
  ): O["linkDatum"] | Json<N, NL, U<O, "linkDatum", NH>> {
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

/**
 * the default {@link Json} operator created by {@link graphJson}
 *
 * This operator does no extra type conversion and so will result in unknown
 * data.
 */
export type DefaultJson = Json<unknown, unknown, JsonOps>;

/**
 * create a {@link Json} graph constructor with default settings
 *
 * If you serialize a graph or node using `JSON.stringify`, this operator can
 * be used to hydrate them back into a {@link MutGraph}. This is expecially
 * useful for serializing the graph to do layouts in a separate worker.
 *
 * If you serialize a {@link GraphNode} the deserialized graph will be the same
 * node that was serialized, but the rest of that node's connected component
 * will be deserialized as well, and still reachable via {@link Graph#nodes}.
 * The type information will inherently be lost, and will need to be cast.
 *
 * Since serialization doesn't inherently imply deserialization,
 * {@link Json#nodeDatum} and {@link Json#linkDatum} can be used to
 * provide custom hydration for node and linke data.
 *
 * @example
 *
 * This example shows how to deserialize a graph while losing type information.
 *
 * ```ts
 * const orig: Graph = ...
 * const serialized = JSON.stringify(orig);
 * const builder = graphJson();
 * const deserialized = builder(JSON.parse(serialized));
 * ```
 *
 * Note, that because no custom hydrators were given, `deserialized` will have
 * type `MutGraph<unknown, unknown>` which probably isn't desired.
 *
 * @example
 *
 * This example demonstrates using a simple data hydrator.
 *
 * ```ts
 * const orig: Graph<number, string> = ...
 * const serialized = JSON.stringify(orig);
 * const builder = graphJson()
 *     .nodeDatum(data => data as number)
 *     .linkDatum(data => data as string);
 * const deserialized = builder(JSON.parse(serialized));
 * ```
 *
 * Now `deserialized` has the same type as the original grah. In real use,
 * you'll probably want to use type guards to guarantee the data was
 * deserialized correctly.
 */
export function graphJson(...args: readonly never[]): DefaultJson {
  if (args.length) {
    throw err`got arguments to graphJson(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphJson()(...)\``;
  } else {
    return buildOperator({
      nodeDatum: (n) => n,
      linkDatum: (l) => l,
    });
  }
}
