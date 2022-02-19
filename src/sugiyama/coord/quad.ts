/**
 * The {@link QuadOperator} positions nodes to minimize a quadratic
 * optimization.
 *
 * @module
 */
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { DagLink, DagNode } from "../../dag";
import { map } from "../../iters";
import { bigrams, dfs, setIntersect, Up } from "../../utils";
import { SugiNode } from "../utils";
import { indices, init, layout, minBend, minDist, solve } from "./utils";

/**
 * Compute a map from node ids to a connected component index. This is useful
 * to quickly compare if two nodes are in the same connected component.
 *
 * @internal
 */
function componentMap(layers: SugiNode[][]): Map<SugiNode, number> {
  // create parent map to allow accessing parents
  const parents = new Map<SugiNode, SugiNode[]>();
  for (const layer of layers) {
    for (const node of layer) {
      for (const child of node.ichildren()) {
        const pars = parents.get(child);
        if (pars) {
          pars.push(node);
        } else {
          parents.set(child, [node]);
        }
      }
    }
  }

  // "children" function that returns children and parents
  function* graph(node: SugiNode): Generator<SugiNode, void, undefined> {
    yield* node.ichildren();
    yield* parents.get(node) || [];
  }

  // depth first search over all nodes
  let component = 0;
  const compMap = new Map<SugiNode, number>();
  for (const layer of layers) {
    for (const node of layer) {
      if (compMap.has(node)) continue;
      for (const comp of dfs(graph, node)) {
        compMap.set(comp, component);
      }
      component++;
    }
  }

  return compMap;
}

/**
 * If disconnected components exist in the same layer, then we can minimize the
 * distance between them to make a reasonable objective. If, however, layers
 * share no common components then they are truly independent in assignment of
 * x coordinates and should be solved separately.
 *
 * @internal
 */
function splitComponentLayers<N, L>(
  layers: SugiNode<N, L>[][],
  compMap: Map<SugiNode, number>
): SugiNode<N, L>[][][] {
  // Because of dummy nodes, there's no way for a component to skip a layer,
  // thus for layers to share no common components, there must be a clear
  // boundary between any two.
  const split = [];
  let newLayers = [];
  let lastComponents = new Set<number>();
  for (const layer of layers) {
    const currentComponents = new Set(layer.map((n) => compMap.get(n)!));
    if (!setIntersect(lastComponents, currentComponents)) {
      split.push((newLayers = []));
    }
    newLayers.push(layer);
    lastComponents = currentComponents;
  }
  return split;
}

/**
 * an accessor to get the optimization of the weight for a node
 *
 * Currently this is only used to set the {@link QuadOperator.nodeCurve}.
 */
export interface NodeWeightAccessor<NodeDatum = never, LinkDatum = never> {
  (node: DagNode<NodeDatum, LinkDatum>): number;
}

/**
 * an accessor to get the optimization of the weight for a link
 *
 * Currently this is only used to set the following accessors: {@link
 * QuadOperator.linkCurve}, {@link QuadOperator.vertWeak}, {@link
 * QuadOperator.vertStrong}.
 */
export interface LinkWeightAccessor<NodeDatum = never, LinkDatum = never> {
  (link: DagLink<NodeDatum, LinkDatum>): number;
}

/**
 * a {@link NodeWeightAccessor} or {@link LinkWeightAccessor} that returns a constant value
 *
 * If using a constant value, this provides some small memory and time savings
 * over a regular accessor.
 */
export interface ConstAccessor<T extends number = number>
  extends NodeWeightAccessor<unknown, unknown>,
    LinkWeightAccessor<unknown, unknown> {
  value: T;
  (): T;
}

/**
 * a function for creating a {@link ConstAccessor}
 */
export function createConstAccessor<T extends number>(
  value: T
): ConstAccessor<T> {
  if (value < 0) {
    throw new Error("const accessors should return non-negative values");
  }
  const accessor = () => value;
  accessor.value = value;
  return accessor;
}

/**
 * If an accessor is a const accessor
 */
function isConstAccessor(
  acc: LinkWeightAccessor | NodeWeightAccessor | ConstAccessor
): acc is ConstAccessor {
  return "value" in acc && typeof acc.value === "number";
}

interface Operators<N = never, L = never> {
  vertWeak: LinkWeightAccessor<N, L>;
  vertStrong: LinkWeightAccessor<N, L>;
  linkCurve: LinkWeightAccessor<N, L>;
  nodeCurve: NodeWeightAccessor<N, L>;
}

type OpNodeDatum<O extends Operators> = O extends Operators<infer N, never>
  ? N
  : never;
type OpLinkDatum<O extends Operators> = O extends Operators<never, infer L>
  ? L
  : never;

/**
 * A {@link CoordOperator} that places nodes to minimize a quadratic function
 *
 * The minimization involves minimizing the distance between {@link vertical |
 * connected nodes}, the {@link curve | curvature of edges}, and the distance
 * between {@link component | disconnected components}.
 *
 * This operators generally takes the longest of all built-in operators but
 * produces the most pleasing layout.
 *
 * Create with {@link quad}.
 *
 * <img alt="quad example" src="media://sugi-simplex-opt-quad.png" width="400">
 */
export interface QuadOperator<Ops extends Operators>
  extends CoordOperator<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * Set the weight for verticality. Higher weights mean connected nodes should
   * be closer together, or corollarily edges should be closer to vertical
   * lines. There are two different weights, [ *regular nodes*, *dummy nodes*
   * ], the weight for a pair of connected nodes the sum of the weight value
   * for each node depending on whether not that node is a dummy node. Setting
   * them both to positive means all lines should be roughly vertical, while
   * setting a weight to zero doesn't peanalize edges between those types of
   * nodes. (default: [1, 0])
   *
   * @remarks
   * `.vertical([a, b])` is the same as `.vertWeak(() => a).vertStrong(() => b)`
   */
  vertical(val: readonly [number, number]): QuadOperator<
    Up<
      Ops,
      {
        vertWeak: ConstAccessor;
        vertStrong: ConstAccessor;
      }
    >
  >;
  /**
   * Get the current vertical weights if they're constant. If {@link
   * QuadOperator.vertWeak} or {@link QuadOperator.vertStrong} is not constant,
   * then null is returned. By setting the weight of dummy nodes to zero,
   * longer edges aren't penalized to be straighter than short edges.
   */
  vertical(): Ops extends { vertWeak: ConstAccessor; vertStrong: ConstAccessor }
    ? [number, number]
    : null;

  /**
   * Set the weak vertical accessor.
   *
   * The weak vertical accessor adds a penalty to make edges vertical. It's
   * weak in that it applies to all edges equally regardless of length, and
   * while it penalized non vertical edges, it allows curving in the middle of
   * long edges. (default: () => 1)
   */
  vertWeak<NewVertWeak extends LinkWeightAccessor>(
    val: NewVertWeak
  ): QuadOperator<
    Up<
      Ops,
      {
        vertWeak: NewVertWeak;
      }
    >
  >;
  /**
   * Get the current vertWeak accessor
   */
  vertWeak(): Ops["vertWeak"];

  /**
   * Set the strong vertical accessor.
   *
   * The strong vertical accessor adds a penalty to make edges vertical. It
   * penealizes any section of an edge that isn't vertical, making longer edges
   * contribute more to the overall impact on the objective. (default: () => 0)
   */
  vertStrong<NewVertStrong extends LinkWeightAccessor>(
    val: NewVertStrong
  ): QuadOperator<
    Up<
      Ops,
      {
        vertStrong: NewVertStrong;
      }
    >
  >;
  /**
   * Get the current vertStrong accessor
   */
  vertStrong(): Ops["vertStrong"];

  /**
   * Set the weight for curviness. Higher weights mean an edge going through a
   * node type should be roughly straight.  There are two different weights, [
   * *regular nodes*, *dummy nodes* ], that impact the curvature through those
   * node types. Setting regular nodes to positive will create a type of flow
   * of edges going through a node, while setting dummy nodes will enforce the
   * longer edges should try to be straight. (default: [0, 1])
   *
   * @remarks
   * `.curve([a, b])` is the same as `.nodeCurve(() => a).linkCurve(() => b)`
   */
  curve(val: readonly [number, number]): QuadOperator<
    Up<
      Ops,
      {
        linkCurve: ConstAccessor;
        nodeCurve: ConstAccessor;
      }
    >
  >;
  /**
   * Get the current curve weights if they're constant, otherwise return null.
   * By setting the weight of non-dummy nodes to zero, we only care about the
   * curvature of edges, not lines that pass through nodes.
   */
  curve(): Ops extends { linkCurve: ConstAccessor; nodeCurve: ConstAccessor }
    ? [number, number]
    : null;

  /**
   * Set the link curve weight accessor
   *
   * The link curve weight penalizes links to reduce their curving, in
   * dependent of their verticality. If using strongVert for an edge, it
   * probably won't need a strong link curve weight. (default: () => 1)
   */
  linkCurve<NewLinkCurve extends LinkWeightAccessor>(
    val: NewLinkCurve
  ): QuadOperator<
    Up<
      Ops,
      {
        linkCurve: NewLinkCurve;
      }
    >
  >;
  /**
   * Get the current link curve weight accessor
   */
  linkCurve(): Ops["linkCurve"];

  /**
   * Set the node curve weight accessor
   *
   * The node curve weight penalizes curves through nodes. If a node only has
   * one incoming and one outgoing edge, it will try to make them match in
   * angle. Note that it does it for all possible "through edges" so multiple
   * incoming and multiple outgoing will get counted several times. It's not
   * clear why this would ever be desirable, but it's possible to specify.
   * (default: () => 0)
   */
  nodeCurve<NewNodeCurve extends NodeWeightAccessor>(
    val: NewNodeCurve
  ): QuadOperator<
    Up<
      Ops,
      {
        nodeCurve: NewNodeCurve;
      }
    >
  >;
  /**
   * Get the current node curve accessor
   */
  nodeCurve(): Ops["nodeCurve"];

  /**
   * Set the weight for how close different disconnected components should be.
   * The higher the weight, the more different components will be close to each
   * other at the expense of other objectives. This needs to be greater than
   * zero to make the objective sound when there are disconnected components,
   * but otherwise should probably be very small. (default: 1)
   */
  component(val: number): QuadOperator<Ops>;
  /** Get the current component weight. */
  component(): number;
}

/**
 * cache the vert weak function to avoid duplicate calls
 *
 * Due to the nature of how it's called, this is easier to implement as a
 * function of source and target, rather then links, but to build up the index,
 * we then have to iterate over the links in advance.
 */
function cacheVertWeak<N, L>(
  vertWeak: LinkWeightAccessor<N, L>,
  layers: SugiNode<N, L>[][]
): (src: DagNode<N, L>, targ: DagNode<N, L>) => number {
  if (isConstAccessor(vertWeak)) {
    // verify that it's actually const since we'll never actually call it normally
    const val = vertWeak.value;
    for (const layer of layers) {
      for (const node of layer) {
        if ("node" in node.data) {
          const source = node.data.node;
          for (const link of source.ichildLinks()) {
            if (vertWeak(link) !== val) {
              throw new Error(
                "passed in a vertWeak accessor with a `value` property that wasn't a const accessor"
              );
            }
          }
        }
      }
    }
    return () => val;
  } else {
    const vertWeakMap = new Map<DagNode<N, L>, Map<DagNode<N, L>, number>>();
    for (const layer of layers) {
      for (const node of layer) {
        if ("node" in node.data) {
          // regular node
          const source = node.data.node;
          const targetLinks = new Map(
            map(
              source.ichildLinks(),
              (link) => [link.target, vertWeak(link)] as const
            )
          );
          vertWeakMap.set(source, targetLinks);
        }
      }
    }
    return (src: DagNode<N, L>, targ: DagNode<N, L>): number =>
      vertWeakMap.get(src)!.get(targ)!;
  }
}

/**
 * cache an arbitrary link weight accessor
 */
function cacheLinkWeightAccessor<N, L>(
  accessor: LinkWeightAccessor<N, L>
): LinkWeightAccessor<N, L> {
  if (isConstAccessor(accessor)) {
    // don't need to cache constant accessors
    return accessor;
  } else {
    const cache = new Map<DagNode<N, L>, Map<DagNode<N, L>, number>>();
    return (link: DagLink<N, L>) => {
      const { source, target } = link;
      let targets = cache.get(source);
      if (targets === undefined) {
        targets = new Map<DagNode<N, L>, number>();
        cache.set(source, targets);
      }
      const cached = targets.get(target);
      if (cached === undefined) {
        const val = accessor(link);
        if (val < 0) {
          throw new Error("link weights must be non-negative");
        }
        targets.set(target, val);
        return val;
      } else {
        return cached;
      }
    };
  }
}

/**
 * cache an arbitrary node weight accessor
 */
function cacheNodeWeightAccessor<N, L>(
  accessor: NodeWeightAccessor<N, L>
): NodeWeightAccessor<N, L> {
  if (isConstAccessor(accessor)) {
    return accessor;
  } else {
    const cache = new Map<DagNode<N, L>, number>();
    return (node: DagNode<N, L>) => {
      const cached = cache.get(node);
      if (cached === undefined) {
        const val = accessor(node);
        if (val < 0) {
          throw new Error("node weights must be non-negative");
        }
        cache.set(node, val);
        return val;
      } else {
        return cached;
      }
    };
  }
}

function buildOperator<
  NodeDatum,
  LinkDatum,
  Ops extends Operators<NodeDatum, LinkDatum>
>(
  opts: Ops &
    Operators<NodeDatum, LinkDatum> & {
      comp: number;
    }
): QuadOperator<Ops> {
  function quadComponent<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>,
    compMap: Map<SugiNode, number>
  ): number {
    const { comp } = opts;
    const inds = indices(layers);
    const [Q, c, A, b] = init(layers, inds, nodeSize);

    const cachedVertWeak = cacheVertWeak(opts.vertWeak, layers);
    const cachedVertStrong = cacheLinkWeightAccessor(opts.vertStrong);
    const cachedLinkCurve = cacheLinkWeightAccessor(opts.linkCurve);
    const cachedNodeCurve = cacheNodeWeightAccessor(opts.nodeCurve);
    // add loss for nearby nodes and for curve of nodes
    for (const layer of layers) {
      for (const par of layer) {
        const pind = inds.get(par)!;
        const pdata = par.data;
        const source = "node" in pdata ? pdata.node : pdata.link.source;
        for (const node of par.ichildren()) {
          const nind = inds.get(node)!;
          const ndata = node.data;
          const target = "node" in ndata ? ndata.node : ndata.link.target;

          const wpdist =
            "node" in pdata
              ? cachedVertWeak(source, target)
              : cachedVertStrong(pdata.link);
          const wndist =
            "node" in ndata
              ? cachedVertWeak(source, target)
              : cachedVertStrong(ndata.link);
          const wcurve =
            "node" in ndata
              ? cachedNodeCurve(ndata.node)
              : cachedLinkCurve(ndata.link);
          minDist(Q, pind, nind, wpdist + wndist);
          for (const child of node.ichildren()) {
            const cind = inds.get(child)!;
            minBend(Q, pind, nind, cind, wcurve);
          }
        }
      }
    }

    // for disconnected dags, add loss for being too far apart
    for (const layer of layers) {
      for (const [first, second] of bigrams(layer)) {
        if (compMap.get(first) !== compMap.get(second)) {
          minDist(Q, inds.get(first)!, inds.get(second)!, comp);
        }
      }
    }

    try {
      const solution = solve(Q, c, A, b);
      return layout(layers, nodeSize, inds, solution);
    } catch (ex) {
      /* istanbul ignore else */
      if (
        ex instanceof Error &&
        ex.message ===
          "quadratic program failed: matrix D in quadratic function is not positive definite!"
      ) {
        throw new Error(
          "quad objective wasn't well defined, this happens when too many of the weights were set to zero (or really small). Try changing the weight accessors to return nonzero values in more instances."
        );
      } else {
        throw ex;
      }
    }
  }

  function quadCall<N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    // split components
    const compMap = componentMap(layers);
    const components = splitComponentLayers(layers, compMap);

    // layout each component and get width
    const widths = components.map((compon) =>
      quadComponent(compon, nodeSize, compMap)
    );

    // center components
    const maxWidth = Math.max(...widths);
    if (maxWidth <= 0) {
      throw new Error("must assign nonzero width to at least one node");
    }
    for (const [i, compon] of components.entries()) {
      const offset = (maxWidth - widths[i]) / 2;
      for (const layer of compon) {
        for (const node of layer) {
          node.x! += offset;
        }
      }
    }

    return maxWidth;
  }

  function vertical(): Ops extends {
    vertWeak: ConstAccessor;
    vertStrong: ConstAccessor;
  }
    ? [number, number]
    : null;
  function vertical(val: readonly [number, number]): QuadOperator<
    Up<
      Ops,
      {
        vertWeak: ConstAccessor;
        vertStrong: ConstAccessor;
      }
    >
  >;
  function vertical(val?: readonly [number, number]):
    | QuadOperator<
        Up<
          Ops,
          {
            vertWeak: ConstAccessor;
            vertStrong: ConstAccessor;
          }
        >
      >
    | [number, number]
    | null {
    if (val === undefined) {
      const { vertWeak, vertStrong } = opts;
      if (isConstAccessor(vertWeak) && isConstAccessor(vertStrong)) {
        return [vertWeak.value, vertStrong.value];
      } else {
        return null;
      }
    } else {
      const [vertNode, vertDummy] = val;
      if (vertNode < 0 || vertDummy < 0) {
        throw new Error(
          `weights must be non-negative, but were ${vertNode} and ${vertDummy}`
        );
      } else {
        const { vertWeak: _, vertStrong: __, ...rest } = opts;
        return buildOperator({
          ...rest,
          vertWeak: createConstAccessor(vertNode),
          vertStrong: createConstAccessor(vertDummy)
        });
      }
    }
  }
  quadCall.vertical = vertical;

  function vertWeak<NewVertWeak extends LinkWeightAccessor>(
    val: NewVertWeak
  ): QuadOperator<
    Up<
      Ops,
      {
        vertWeak: NewVertWeak;
      }
    >
  >;
  function vertWeak(): Ops["vertWeak"];
  function vertWeak<NewVertWeak extends LinkWeightAccessor>(
    val?: NewVertWeak
  ):
    | QuadOperator<
        Up<
          Ops,
          {
            vertWeak: NewVertWeak;
          }
        >
      >
    | Ops["vertWeak"] {
    if (val === undefined) {
      return opts.vertWeak;
    } else {
      const { vertWeak: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        vertWeak: val
      });
    }
  }
  quadCall.vertWeak = vertWeak;

  function vertStrong<NewVertStrong extends LinkWeightAccessor>(
    val: NewVertStrong
  ): QuadOperator<
    Up<
      Ops,
      {
        vertStrong: NewVertStrong;
      }
    >
  >;
  function vertStrong(): Ops["vertStrong"];
  function vertStrong<NewVertStrong extends LinkWeightAccessor>(
    val?: NewVertStrong
  ):
    | QuadOperator<
        Up<
          Ops,
          {
            vertStrong: NewVertStrong;
          }
        >
      >
    | Ops["vertStrong"] {
    if (val === undefined) {
      return opts.vertStrong;
    } else {
      const { vertStrong: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        vertStrong: val
      });
    }
  }
  quadCall.vertStrong = vertStrong;

  function curve(): Ops extends {
    linkCurve: ConstAccessor;
    nodeCurve: ConstAccessor;
  }
    ? [number, number]
    : null;
  function curve(val: readonly [number, number]): QuadOperator<
    Up<
      Ops,
      {
        linkCurve: ConstAccessor;
        nodeCurve: ConstAccessor;
      }
    >
  >;
  function curve(val?: readonly [number, number]):
    | QuadOperator<
        Up<
          Ops,
          {
            linkCurve: ConstAccessor;
            nodeCurve: ConstAccessor;
          }
        >
      >
    | [number, number]
    | null {
    if (val === undefined) {
      const { linkCurve, nodeCurve } = opts;
      if (isConstAccessor(linkCurve) && isConstAccessor(nodeCurve)) {
        return [nodeCurve.value, linkCurve.value];
      } else {
        return null;
      }
    } else {
      const [curveNode, curveDummy] = val;
      if (curveNode < 0 || curveDummy < 0) {
        throw new Error(
          `weights must be non-negative, but were ${curveNode} and ${curveDummy}`
        );
      } else {
        const { linkCurve: _, nodeCurve: __, ...rest } = opts;
        return buildOperator({
          ...rest,
          linkCurve: createConstAccessor(curveDummy),
          nodeCurve: createConstAccessor(curveNode)
        });
      }
    }
  }
  quadCall.curve = curve;

  function linkCurve<NewLinkCurve extends LinkWeightAccessor>(
    val: NewLinkCurve
  ): QuadOperator<
    Up<
      Ops,
      {
        linkCurve: NewLinkCurve;
      }
    >
  >;
  function linkCurve(): Ops["linkCurve"];
  function linkCurve<NewLinkCurve extends LinkWeightAccessor>(
    val?: NewLinkCurve
  ):
    | QuadOperator<
        Up<
          Ops,
          {
            linkCurve: NewLinkCurve;
          }
        >
      >
    | Ops["linkCurve"] {
    if (val === undefined) {
      return opts.linkCurve;
    } else {
      const { linkCurve: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        linkCurve: val
      });
    }
  }
  quadCall.linkCurve = linkCurve;

  function nodeCurve<NewNodeCurve extends NodeWeightAccessor>(
    val: NewNodeCurve
  ): QuadOperator<
    Up<
      Ops,
      {
        nodeCurve: NewNodeCurve;
      }
    >
  >;
  function nodeCurve(): Ops["nodeCurve"];
  function nodeCurve<NewNodeCurve extends NodeWeightAccessor>(
    val?: NewNodeCurve
  ):
    | QuadOperator<
        Up<
          Ops,
          {
            nodeCurve: NewNodeCurve;
          }
        >
      >
    | Ops["nodeCurve"] {
    if (val === undefined) {
      return opts.nodeCurve;
    } else {
      const { nodeCurve: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        nodeCurve: val
      });
    }
  }
  quadCall.nodeCurve = nodeCurve;

  function component(): number;
  function component(val: number): QuadOperator<Ops>;
  function component(val?: number): number | QuadOperator<Ops> {
    if (val === undefined) {
      return opts.comp;
    } else if (val <= 0) {
      throw new Error(`weight must be positive, but was ${val}`);
    } else {
      return buildOperator({ ...opts, comp: val });
    }
  }
  quadCall.component = component;

  return quadCall;
}

export type DefaultQuadOperator = QuadOperator<{
  vertWeak: ConstAccessor<1>;
  vertStrong: ConstAccessor<0>;
  linkCurve: ConstAccessor<1>;
  nodeCurve: ConstAccessor<0>;
}>;

/**
 * Create a default {@link QuadOperator}, bundled as {@link coordQuad}.
 */
export function quad(...args: never[]): DefaultQuadOperator {
  if (args.length) {
    throw new Error(
      `got arguments to quad(${args}), but constructor takes no arguments.`
    );
  }

  return buildOperator({
    vertWeak: createConstAccessor(1),
    vertStrong: createConstAccessor(0),
    linkCurve: createConstAccessor(1),
    nodeCurve: createConstAccessor(0),
    comp: 1
  });
}
