/**
 * A topological layout using {@link Grid}.
 *
 * @packageDocumentation
 */
import type { Graph, GraphNode, Rank } from "../graph/index.js";
import { chain, entries } from "../iters.js";
import { cachedNodeSize, type LayoutResult, type NodeSize } from "../layout.js";
import { drawLoop, fitLoops } from "../loops.js";
import type { Tweak } from "../tweaks.js";
import { err, type U } from "../utils.js";
import { type LaneGreedy, laneGreedy } from "./lane/greedy.js";
import type { Lane } from "./lane/index.js";
import { verifyLanes } from "./lane/utils.js";

/** all operators for the grid layout */
export interface GridOps<in N = never, in L = never> {
  /** the operator for assigning nodes to a lane */
  lane: Lane<N, L>;
  /** the operator for assigning nodes a rank */
  rank: Rank<N, L>;
  /** node size operator */
  nodeSize: NodeSize<N, L>;
  /** tweaks */
  tweaks: readonly Tweak<N, L>[];
}

/**
 * A simple grid based topological layout operator.
 *
 * This layout algorithm constructs a topological representation of the dag
 * meant for visualization. The nodes are topologically ordered and then nodes
 * are put into lanes such that an edge can travel horizontally to the lane of
 * a child node, and then down without intersecting to that child.
 *
 * Create with {@link grid}.
 */
export interface Grid<Ops extends GridOps = GridOps> {
  /**
   * layout a graph with the grid layout
   *
   * @param grf - the graph to layout
   * @returns dimensions - the width and height of the final layout
   */
  (
    grf: Ops extends GridOps<infer N, infer L> ? Graph<N, L> : never,
  ): LayoutResult;

  /**
   * set a custom {@link Lane} operator
   *
   * The lane operator controls how nodes are assigned to horizontal lanes.
   * This is the core piece of the layout. There are two builtin lane operators:
   * - {@link laneGreedy} - This is a fast reasonably effective lane operator.
   *   It supports a number of further tweaks to alter the layout.
   * - {@link laneOpt} - This assigns lanes to optimally minimize the number of
   *   edge crossings. This optimization is NP Hard, so outside of very small
   *   graphs, it will likely take too long to execute.
   *
   * You can also supply any function that satisfies the {@link Lane}
   * interface. See that documentation for more information about implementing
   * your own lane assignment.
   *
   * (default: {@link laneGreedy})
   *
   * @example
   *
   * ```ts
   * const layout = grid().lane(laneOpt());
   * ```
   *
   */
  lane<NewLane extends Lane>(val: NewLane): Grid<U<Ops, "lane", NewLane>>;
  /** get the current lane operator */
  lane(): Ops["lane"];

  /**
   * set the rank operator for the topological ordering
   *
   * Set the rank operator to the given {@link Rank} and returns a new
   * version of this operator.
   *
   * (default: noop)
   */
  rank<NewRank extends Rank>(val: NewRank): Grid<U<Ops, "rank", NewRank>>;
  /** get the current rank operator */
  rank(): Ops["rank"];

  /**
   * set the {@link Tweak}s to apply after layout
   */
  tweaks<const NewTweaks extends readonly Tweak[]>(
    val: NewTweaks,
  ): Grid<U<Ops, "tweaks", NewTweaks>>;
  /**
   * get the current {@link Tweak}s.
   */
  tweaks(): Ops["tweaks"];

  /**
   * Sets this grid layout's node size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns a new operator. These sizes are
   * effectively the grid size, e.g. the spacing between adjacent lanes or rows
   * in the grid.
   *
   * (default: `[1, 1]`)
   */
  nodeSize<NewNodeSize extends NodeSize>(
    val: NewNodeSize,
  ): Grid<U<Ops, "nodeSize", NewNodeSize>>;
  /** Get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * Set the gap size between nodes
   *
   * (default: `[1, 1]`)
   */
  gap(val: readonly [number, number]): Grid<Ops>;
  /** Get the current gap size */
  gap(): readonly [number, number];
}

/** @internal */
function buildOperator<ND, LD, Ops extends GridOps<ND, LD>>(
  options: Ops & GridOps<ND, LD>,
  sizes: {
    xgap: number;
    ygap: number;
  },
): Grid<Ops> {
  function grid<N extends ND, L extends LD>(grf: Graph<N, L>): LayoutResult {
    // NOTE this doesn't render multi-link any differently (i.e. they'll
    // overlap). We could try to check, but we'd have to check for multi-links
    // after we topologically order, which would be a pain, so we just allow
    // it.

    let res: LayoutResult;
    // short-circuit empty graph
    if (!grf.nnodes()) {
      res = { width: 0, height: 0 };
    } else {
      // topological sort
      const ordered = grf.topological(options.rank);
      for (const [y, node] of ordered.entries()) {
        node.y = y;
      }

      // get lanes
      options.lane(ordered);
      const numLanes = verifyLanes(ordered, options.lane);

      // self loops go on the side of their node fewer other links leave from,
      // since each of those crosses them, or the right when tied
      const loopsOnRight = new Map<GraphNode<N, L>, boolean>();
      for (const node of ordered) {
        if (node.nchildLinksTo(node)) {
          let balance = 0;
          for (const { source, target } of chain(
            node.parentLinks(),
            node.childLinks(),
          )) {
            const other = source === node ? target : source;
            if (other.y > node.y) {
              balance += Math.sign(other.x - node.x);
            }
          }
          loopsOnRight.set(node, balance <= 0);
        }
      }

      // adjust x and y by nodeSize
      const { xgap, ygap } = sizes;
      const nodeSize = cachedNodeSize(options.nodeSize);
      const loopStep = xgap / 2;
      const lefts = Array<number>(numLanes).fill(0);
      const rights = Array<number>(numLanes).fill(0);
      let height = -ygap;
      for (const node of ordered) {
        const [nodeWidth, nodeHeight] = nodeSize(node);
        const loopRoom = node.nchildLinksTo(node) * loopStep;
        const onRight = loopsOnRight.get(node);
        const lane = node.x;
        lefts[lane] = Math.max(
          lefts[lane],
          nodeWidth / 2 + (onRight ? 0 : loopRoom),
        );
        rights[lane] = Math.max(
          rights[lane],
          nodeWidth / 2 + (onRight ? loopRoom : 0),
        );
        height += ygap;
        node.y = height + nodeHeight / 2;
        height += nodeHeight;
      }
      // compute width and xs
      const centers = Array<number>(numLanes).fill(0);
      let width = -xgap;
      for (const [lane, left] of lefts.entries()) {
        width += xgap;
        centers[lane] = width + left;
        width += left + rights[lane];
      }
      for (const node of ordered) {
        node.x = centers[node.x];
      }

      for (const [node, onRight] of loopsOnRight) {
        const size = nodeSize(node);
        const num = node.nchildLinksTo(node);
        for (const [ind, link] of entries(node.childLinksTo(node))) {
          drawLoop(link, onRight, ind + 1, num, size, loopStep, ygap);
        }
      }

      // assign link points
      for (const link of grf.links()) {
        const { source, target, points } = link;
        if (source === target) continue;
        points.splice(0);
        if (source.x === target.x) {
          points.push([source.x, source.y], [target.x, target.y]);
        } else {
          points.push([source.x, source.y]);
          if (source.y < target.y) {
            points.push([target.x, source.y]);
          } else {
            // effectively reverse edge
            points.push([source.x, target.y]);
          }
          points.push([target.x, target.y]);
        }
      }

      res = { width, height: fitLoops(grf, height) };
    }

    // apply tweaks
    for (const tweak of options.tweaks) {
      res = tweak(grf, res);
    }
    return res;
  }

  function lane(): Ops["lane"];
  function lane<NL extends Lane>(val: NL): Grid<U<Ops, "lane", NL>>;
  function lane<NL extends Lane>(
    val?: NL,
  ): Grid<U<Ops, "lane", NL>> | Ops["lane"] {
    if (val === undefined) {
      return options.lane;
    } else {
      const { lane: _, ...rest } = options;
      return buildOperator({ ...rest, lane: val }, sizes);
    }
  }
  grid.lane = lane;

  function rank(): Ops["rank"];
  function rank<NR extends Rank>(val: NR): Grid<U<Ops, "rank", NR>>;
  function rank<NR extends Rank>(
    val?: NR,
  ): Grid<U<Ops, "rank", NR>> | Ops["rank"] {
    if (val === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: val }, sizes);
    }
  }
  grid.rank = rank;

  function tweaks(): Ops["tweaks"];
  function tweaks<NT extends readonly Tweak[]>(
    val: NT,
  ): Grid<U<Ops, "tweaks", NT>>;
  function tweaks<NT extends readonly Tweak[]>(
    val?: NT,
  ): Ops["tweaks"] | Grid<U<Ops, "tweaks", NT>> {
    if (val === undefined) {
      return options.tweaks;
    } else {
      const { tweaks: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          tweaks: val,
        },
        sizes,
      );
    }
  }
  grid.tweaks = tweaks;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<NNS extends NodeSize>(
    val: NNS,
  ): Grid<U<Ops, "nodeSize", NNS>>;
  function nodeSize<NNS extends NodeSize>(
    val?: NNS,
  ): Grid<U<Ops, "nodeSize", NNS>> | Ops["nodeSize"] {
    if (val === undefined) {
      return options.nodeSize;
    } else if (typeof val !== "function" && !(val[0] >= 0 && val[1] >= 0)) {
      const [x, y] = val;
      throw err`constant nodeSize can't be negative, but got: [${x}, ${y}]`;
    } else {
      const { nodeSize: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          nodeSize: val,
        },
        sizes,
      );
    }
  }
  grid.nodeSize = nodeSize;

  function gap(): readonly [number, number];
  function gap(val: readonly [number, number]): Grid<Ops>;
  function gap(
    val?: readonly [number, number],
  ): Grid<Ops> | readonly [number, number] {
    if (val !== undefined) {
      const [xgap, ygap] = val;
      if (xgap < 0 || ygap < 0) {
        throw err`gaps must be non-negative, but got [${xgap}, ${ygap}]`;
      }
      return buildOperator(options, { xgap, ygap });
    } else {
      const { xgap, ygap } = sizes;
      return [xgap, ygap];
    }
  }
  grid.gap = gap;

  return grid;
}

/** the default grid operator */
export type DefaultGrid = Grid<{
  /** default lane: greedy */
  lane: LaneGreedy;
  /** default rank: none */
  rank: Rank<unknown, unknown>;
  /** default size */
  nodeSize: readonly [1, 1];
  /** default tweaks: none */
  tweaks: readonly [];
}>;

/**
 * create a new {@link Grid} with default settings.
 *
 * The grid layout algorithm constructs a horizontally compact topological
 * representation of the dag. The nodes are topologically ordered and then
 * put into lanes such that an edge can travel horizontally to the lane of a
 * child node, and then down without intersecting to that child.
 *
 * This layout produces good representations when you want a compressed layout
 * where each node is on an independent horizontal line.
 *
 * <img alt="grid example" src="../../resources/grid-greedy-topdown.png" width="200">
 *
 * @remarks
 *
 * The current implementation doesn't render multi-dags any differently, so
 * multiple edges going to the same node will be rendered as a single edge.
 * Self loops are the exception: each leaves below its node's center, runs up
 * one side, and comes back in above, nested one inside the next. Loops go on
 * whichever side fewer other links leave the node from, or on the right when
 * tied.
 *
 * @example
 *
 * using the default layout
 *
 * ```ts
 * const grf = ...
 * const layout = grid();
 * const { width, height } = layout(grf);
 * for (const node of grf.nodes()) {
 *   console.log(node.x, node.y);
 * }
 * ```
 *
 * @example
 *
 * In addition to the standard modifications of {@link Grid#rank},
 * {@link Grid#nodeSize}, {@link Grid#gap}, and {@link Grid#tweaks},
 * {@link Grid} also supports altering the lane assignment {@link Grid#lane}:
 *
 * ```ts
 * const grf = ...
 * const layout = grid().lane(laneOpt());
 * const { width, height } = layout(grf);
 * for (const node of grf.nodes()) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export function grid(...args: never[]): DefaultGrid {
  if (args.length) {
    throw err`got arguments to grid(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`grid()(...)\``;
  }
  return buildOperator(
    {
      lane: laneGreedy(),
      rank: () => undefined,
      nodeSize: [1, 1] as const,
      tweaks: [] as const,
    },
    {
      xgap: 1,
      ygap: 1,
    },
  );
}
