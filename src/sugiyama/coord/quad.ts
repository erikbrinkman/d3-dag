/**
 * The {@link CoordQuad} positions nodes to minimize a quadratic
 * optimization.
 *
 * @packageDocumentation
 */

import type { GraphLink, GraphNode } from "../../graph";
import { flatMap } from "../../iters";
import { err, ierr, type U } from "../../utils";
import type { SugiNode, SugiSeparation } from "../sugify";
import type { Coord } from ".";
import {
  avgHeight,
  indices,
  init,
  layout,
  minBend,
  minDist,
  solve,
} from "./utils";

/**
 * a strictly callable {@link NodeWeight}
 */
export type CallableNodeWeight<NodeDatum = never, LinkDatum = never> = (
  node: GraphNode<NodeDatum, LinkDatum>,
) => number;

/**
 * an accessor to get the optimization of the weight for a node
 *
 * Currently this is only used to set the {@link CoordQuad#nodeCurve}.
 */
export type NodeWeight<NodeDatum = never, LinkDatum = never> =
  | number
  | CallableNodeWeight<NodeDatum, LinkDatum>;

/**
 * a strictly callable {@link LinkWeight}
 */
export type CallableLinkWeight<NodeDatum = never, LinkDatum = never> = (
  link: GraphLink<NodeDatum, LinkDatum>,
) => number;

/**
 * an accessor to get the optimization of the weight for a link
 *
 * Currently this is used to set the following accessors:
 * {@link CoordQuad#linkCurve}, {@link CoordQuad#vertWeak},
 * {@link CoordQuad#vertStrong}.
 */
export type LinkWeight<NodeDatum = never, LinkDatum = never> =
  | number
  | CallableLinkWeight<NodeDatum, LinkDatum>;

/** the operators for the quad operator */
export interface CoordQuadOps<N = never, L = never> {
  /** the vert weak accessor */
  vertWeak: LinkWeight<N, L>;
  /** the vert strong accessor */
  vertStrong: LinkWeight<N, L>;
  /** the link weight accessor */
  linkCurve: LinkWeight<N, L>;
  /** the node weight accessor */
  nodeCurve: NodeWeight<N, L>;
}

/** node datum for operators */
export type OpNodeDatum<O extends CoordQuadOps> = O extends CoordQuadOps<
  infer N,
  never
>
  ? N
  : never;
/** link datum for operators */
export type OpLinkDatum<O extends CoordQuadOps> = O extends CoordQuadOps<
  never,
  infer L
>
  ? L
  : never;

/**
 * a {@link Coord} that places nodes to minimize a quadratic function
 *
 * This operators generally takes the longest of all built-in operators but
 * produces a pleasing layout.
 *
 * Create with {@link coordQuad}.
 */
export interface CoordQuad<Ops extends CoordQuadOps>
  extends Coord<OpNodeDatum<Ops>, OpLinkDatum<Ops>> {
  /**
   * set the weak vertical accessor.
   *
   * The weak vertical accessor adds a penalty to make edges vertical. It's
   * weak in that it applies to all edges equally regardless of length, and
   * while it penalized non vertical edges, it allows curving in the middle of
   * long edges.
   *
   * (default: `1`)
   */
  vertWeak<NewVertWeak extends LinkWeight>(
    val: NewVertWeak,
  ): CoordQuad<U<Ops, "vertWeak", NewVertWeak>>;
  /**
   * get the current vertWeak accessor
   */
  vertWeak(): Ops["vertWeak"];

  /**
   * set the strong vertical accessor.
   *
   * The strong vertical accessor adds a penalty to make edges vertical. It
   * penealizes any section of an edge that isn't vertical, making longer edges
   * contribute more to the overall impact on the objective.
   *
   * (default: `0`)
   */
  vertStrong<NewVertStrong extends LinkWeight>(
    val: NewVertStrong,
  ): CoordQuad<U<Ops, "vertStrong", NewVertStrong>>;
  /**
   * get the current vertStrong accessor
   */
  vertStrong(): Ops["vertStrong"];

  /**
   * set the link curve weight accessor
   *
   * The link curve weight penalizes links to reduce their curving, in
   * dependent of their verticality. If using strongVert for an edge, it
   * probably won't need a strong link curve weight.
   *
   * (default: `1`)
   */
  linkCurve<NewLinkCurve extends LinkWeight>(
    val: NewLinkCurve,
  ): CoordQuad<U<Ops, "linkCurve", NewLinkCurve>>;
  /**
   * get the current link curve weight accessor
   */
  linkCurve(): Ops["linkCurve"];

  /**
   * set the node curve weight accessor
   *
   * The node curve weight penalizes curves through nodes. If a node only has
   * one incoming and one outgoing edge, it will try to make them match in
   * angle. Note that it does it for all possible "through edges" so multiple
   * incoming and multiple outgoing will get counted several times. It's not
   * clear why this would ever be desirable, but it's possible to specify.
   *
   * (default: `0`)
   */
  nodeCurve<NewNodeCurve extends NodeWeight>(
    val: NewNodeCurve,
  ): CoordQuad<U<Ops, "nodeCurve", NewNodeCurve>>;
  /**
   * get the current node curve accessor
   */
  nodeCurve(): Ops["nodeCurve"];

  /**
   * set the weight for how close nodes should be to zero.
   *
   * This ensures the optimization is sound, and is necessary if there are
   * certain types of disconnected components or zero weights for different
   * curvature constraints. If the graph is connected and the weights are
   * positive this can be set to zero, otherwise it should be positive, but
   * small.
   *
   * (default: `1e-6`)
   */
  compress(val: number): CoordQuad<Ops>;
  /** get the current compress weight. */
  compress(): number;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * cache the vert weak function to avoid duplicate calls
 *
 * Due to the nature of how it's called, this is easier to implement as a
 * function of source and target, rather then links, but to build up the index,
 * we then have to iterate over the links in advance.
 */
function cacheVertWeak<N, L>(
  vertWeak: LinkWeight<N, L>,
  layers: SugiNode<N, L>[][],
): (src: GraphNode<N, L>, targ: GraphNode<N, L>) => number {
  if (typeof vertWeak !== "function") {
    return () => vertWeak;
  } else {
    const vertWeakMap = new Map<
      GraphNode<N, L>,
      Map<GraphNode<N, L>, number>
    >();
    for (const node of flatMap(layers, (l) => l)) {
      if (node.data.role === "node") {
        // regular node
        const source = node.data.node;
        const targetLinks = new Map<GraphNode<N, L>, number>();
        for (const link of source.childLinks()) {
          const val = vertWeak(link);
          if (val < 0) {
            throw err`link weights must be non-negative; double check the accessor passed into \`coordQuad().vertWeak(...)\``;
          } else {
            targetLinks.set(link.target, val);
          }
        }
        vertWeakMap.set(source, targetLinks);
      }
    }
    return (src: GraphNode<N, L>, targ: GraphNode<N, L>): number =>
      vertWeakMap.get(src)!.get(targ)!;
  }
}

function normalizeAccessor<T>(
  accessor: number | ((inp: T) => number),
  typ: "node" | "link",
  func: "nodeCurve" | "linkCurve" | "vertStrong",
): (inp: T) => number {
  if (typeof accessor !== "function") {
    return () => accessor;
  } else {
    const cache = new Map<T, number>();
    return (inp: T) => {
      const cached = cache.get(inp);
      if (cached === undefined) {
        const val = accessor(inp);
        if (val < 0) {
          throw new Error(
            `${typ} weights must be non-negative; double check the accessor passed into \`coordQuad().${func}(...)\``,
          );
        } else {
          cache.set(inp, val);
          return val;
        }
      } else {
        return cached;
      }
    };
  }
}

// TODO why extends never? Seems wrong, but the types seem to work...
function buildOperator<
  ND extends never,
  LD extends never,
  Ops extends CoordQuadOps<ND, LD>,
>(
  opts: Ops &
    CoordQuadOps<ND, LD> & {
      comp: number;
    },
): CoordQuad<Ops> {
  function coordQuad<N extends ND, L extends LD>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>,
  ): number {
    const inds = indices(layers);
    const [Q, c, A, b] = init(layers, inds, sep, opts.comp);

    const cachedVertWeak = cacheVertWeak(opts.vertWeak, layers);
    const cachedVertStrong = normalizeAccessor(
      opts.vertStrong,
      "link",
      "vertStrong",
    );
    const cachedLinkCurve = normalizeAccessor(
      opts.linkCurve,
      "link",
      "linkCurve",
    );
    const cachedNodeCurve = normalizeAccessor(
      opts.nodeCurve,
      "node",
      "nodeCurve",
    );

    // normalization factor for height difference
    const heightNorm = avgHeight(inds.keys());

    // add loss for nearby nodes and for curve of nodes
    for (const [par, pind] of inds) {
      const pdata = par.data;
      const source = pdata.role === "node" ? pdata.node : pdata.link.source;
      for (const node of par.children()) {
        const nind = inds.get(node)!;
        const ndata = node.data;
        const target = ndata.role === "node" ? ndata.node : ndata.link.target;

        const wpdist =
          pdata.role === "node"
            ? cachedVertWeak(source, target)
            : cachedVertStrong(pdata.link);
        const wndist =
          ndata.role === "node"
            ? cachedVertWeak(source, target)
            : cachedVertStrong(ndata.link);
        const wcurve =
          ndata.role === "node"
            ? cachedNodeCurve(ndata.node)
            : cachedLinkCurve(ndata.link);
        const parh = (node.y - par.y) / heightNorm;
        minDist(Q, pind, nind, (wpdist + wndist) / parh);
        for (const child of node.children()) {
          const cind = inds.get(child)!;
          const chih = (child.y - node.y) / heightNorm;
          minBend(Q, pind, nind, cind, wcurve / parh, wcurve / chih);
        }
      }
    }

    // get actual solution
    let width: number;
    try {
      const solution = solve(Q, c, A, b);
      width = layout(layers, sep, inds, solution);
    } catch (ex) {
      if (typeof ex === "string") {
        throw ierr`${ex}`;
      } else {
        throw ierr`undefined quadprog exception`;
      }
    }
    if (width <= 0) {
      throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
    } else {
      return width;
    }
  }

  function vertWeak<NewVertWeak extends LinkWeight>(
    val: NewVertWeak,
  ): CoordQuad<U<Ops, "vertWeak", NewVertWeak>>;
  function vertWeak(): Ops["vertWeak"];
  function vertWeak<NewVertWeak extends LinkWeight>(
    val?: NewVertWeak,
  ): CoordQuad<U<Ops, "vertWeak", NewVertWeak>> | Ops["vertWeak"] {
    if (val === undefined) {
      return opts.vertWeak;
    } else if (typeof val === "number" && val < 0) {
      throw err`vertWeak must be non-negative but was: ${val}`;
    } else {
      const { vertWeak: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        vertWeak: val,
      });
    }
  }
  coordQuad.vertWeak = vertWeak;

  function vertStrong<NewVertStrong extends LinkWeight>(
    val: NewVertStrong,
  ): CoordQuad<U<Ops, "vertStrong", NewVertStrong>>;
  function vertStrong(): Ops["vertStrong"];
  function vertStrong<NewVertStrong extends LinkWeight>(
    val?: NewVertStrong,
  ): CoordQuad<U<Ops, "vertStrong", NewVertStrong>> | Ops["vertStrong"] {
    if (val === undefined) {
      return opts.vertStrong;
    } else if (typeof val === "number" && val < 0) {
      throw err`vertStrong must be non-negative but was: ${val}`;
    } else {
      const { vertStrong: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        vertStrong: val,
      });
    }
  }
  coordQuad.vertStrong = vertStrong;

  function linkCurve<NewLinkCurve extends LinkWeight>(
    val: NewLinkCurve,
  ): CoordQuad<U<Ops, "linkCurve", NewLinkCurve>>;
  function linkCurve(): Ops["linkCurve"];
  function linkCurve<NewLinkCurve extends LinkWeight>(
    val?: NewLinkCurve,
  ): CoordQuad<U<Ops, "linkCurve", NewLinkCurve>> | Ops["linkCurve"] {
    if (val === undefined) {
      return opts.linkCurve;
    } else if (typeof val === "number" && val < 0) {
      throw err`linkCurve must be non-negative but was: ${val}`;
    } else {
      const { linkCurve: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        linkCurve: val,
      });
    }
  }
  coordQuad.linkCurve = linkCurve;

  function nodeCurve<NewNodeCurve extends NodeWeight>(
    val: NewNodeCurve,
  ): CoordQuad<U<Ops, "nodeCurve", NewNodeCurve>>;
  function nodeCurve(): Ops["nodeCurve"];
  function nodeCurve<NewNodeCurve extends NodeWeight>(
    val?: NewNodeCurve,
  ): CoordQuad<U<Ops, "nodeCurve", NewNodeCurve>> | Ops["nodeCurve"] {
    if (val === undefined) {
      return opts.nodeCurve;
    } else if (typeof val === "number" && val < 0) {
      throw err`nodeCurve must be non-negative but was: ${val}`;
    } else {
      const { nodeCurve: _, ...rest } = opts;
      return buildOperator({
        ...rest,
        nodeCurve: val,
      });
    }
  }
  coordQuad.nodeCurve = nodeCurve;

  function compress(): number;
  function compress(val: number): CoordQuad<Ops>;
  function compress(val?: number): number | CoordQuad<Ops> {
    if (val === undefined) {
      return opts.comp;
    } else if (val <= 0) {
      throw err`compress weight must be positive, but was: ${val}`;
    } else {
      return buildOperator({ ...opts, comp: val });
    }
  }
  coordQuad.compress = compress;

  coordQuad.d3dagBuiltin = true as const;

  return coordQuad;
}

/** default quad operator */
export type DefaultCoordQuad = CoordQuad<{
  /** default vert weak */
  vertWeak: 1;
  /** default vert strong */
  vertStrong: 0;
  /** default link curve */
  linkCurve: 1;
  /** default node curve */
  nodeCurve: 0;
}>;

/**
 * create a default {@link CoordQuad}
 *
 * This coordinate assignment operator tries to minimize the curve of links.
 * Unlike {@link coordSimplex} it produces layouts with less verticality, which
 * often look a little worse.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().coord(coordQuad().vertStrong(1));
 * ```
 */
export function coordQuad(...args: never[]): DefaultCoordQuad {
  if (args.length) {
    throw err`got arguments to coordQuad(${args}); you probably forgot to construct coordQuad before passing to coord: \`sugiyama().coord(coordQuad())\`, note the trailing "()"`;
  } else {
    return buildOperator({
      vertWeak: 1,
      vertStrong: 0,
      linkCurve: 1,
      nodeCurve: 0,
      comp: 1e-6,
    });
  }
}
