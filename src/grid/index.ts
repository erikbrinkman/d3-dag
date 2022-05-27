/**
 * A topological layout using {@link Grid}.
 *
 * @packageDocumentation
 */
import { Graph, Rank } from "../graph";
import { LayoutResult, NodeSize } from "../layout";
import { err, U } from "../utils";
import { Lane } from "./lane";
import { LaneGreedy, laneGreedy } from "./lane/greedy";
import { verifyLanes } from "./lane/utils";

/** all operators for the grid layout */
export interface GridOps<in N = never, in L = never> {
  /** the operator for assigning nodes to a lane */
  lane: Lane<N, L>;
  /** the operator for assigning nodes a rank */
  rank: Rank<N, L>;
  /** node size operator */
  nodeSize: NodeSize<N, L>;
}

/** the typed graph input of a set of operators */
export type OpGraph<Op extends GridOps> = Op extends GridOps<infer N, infer L>
  ? Graph<N, L>
  : never;

/**
 * A simple grid based topological layout operator.
 *
 * This layout algorithm constructs a topological representation of the dag
 * meant for visualization. The nodes are topologically ordered and then nodes
 * are put into lanes such that an edge can travel horizontally to the lane of
 * a child node, and then down without intersecting to that child.
 *
 * This layout produces good representations when you want a compressed layout
 * where each node gets its only line formation.
 *
 * Create with {@link grid}.
 *
 * <img alt="grid example" src="media://grid-greedy-topdown.png" width="200">
 *
 * @remarks
 *
 * The current implementation doesn't multi-dags any differently, so multiple
 * edges going to the same node will be rendered as a single edge. If the
 * layout is a dag, and rank is consistent with the dag ordering than this
 * won't be an issue, but there are no internal checks that the layout fits
 * these criteria.
 *
 * @example
 * ```typescript
 * const data = [["parent", "child"], ...];
 * const create = connect();
 * const dag = create(data);
 * const layout = grid();
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export interface Grid<Ops extends GridOps = GridOps> {
  (grf: OpGraph<Ops>): LayoutResult;

  /**
   * Set the lane operator to the given {@link grid/lane!Lane} and returns a new
   * version of this operator. (default: {@link grid/lane/greedy!LaneGreedy})
   */
  lane<NewLane extends Lane>(val: NewLane): Grid<U<Ops, "lane", NewLane>>;
  /** Get the current lane operator */
  lane(): Ops["lane"];

  /**
   * Set the rank operator to the given {@link graph!Rank} and returns a new
   * version of this operator. (default: () =\> undefined)
   */
  rank<NewRank extends Rank>(val: NewRank): Grid<U<Ops, "rank", NewRank>>;
  /** Get the current lane operator */
  rank(): Ops["rank"];

  /**
   * Sets the {@link layout!NodeSize}, which assigns how much space is
   * necessary between nodes.
   *
   * (default: [1, 1])
   */
  nodeSize<NewNodeSize extends NodeSize>(
    val: NewNodeSize
  ): Grid<U<Ops, "nodeSize", NewNodeSize>>;
  /** Get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * Set the gap size between nodes
   *
   * (default: [0, 0])
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
  }
): Grid<Ops> {
  function grid<N extends ND, L extends LD>(grf: Graph<N, L>): LayoutResult {
    // NOTE this doesn't render multi-link any differently (i.e. they'll
    // overlap). We could try to check, but we'd have to check for multi-links
    // after we topologically order, which would be a pain, so we just allow
    // it.

    // topological sort
    const ordered = grf.topological(options.rank);
    for (const [y, node] of ordered.entries()) {
      node.y = y;
    }

    // get lanes
    options.lane(ordered);
    const numLanes = verifyLanes(ordered, options.lane);

    // adjust x and y by nodeSize
    const { xgap, ygap } = sizes;
    let width, height;
    if (typeof options.nodeSize === "function") {
      // assign ys and compute widths
      const laneWidths = Array<number>(numLanes).fill(0);
      height = -ygap;
      for (const node of ordered) {
        const [nodeWidth, nodeHeight] = options.nodeSize(node);
        if (nodeWidth <= 0 || nodeHeight <= 0) {
          throw err`nodeSize must be positive, but got: [${nodeWidth}, ${nodeHeight}]`;
        }
        laneWidths[node.x] = Math.max(laneWidths[node.x], nodeWidth);
        height += ygap;
        node.y = height + nodeHeight / 2;
        height += nodeHeight;
      }
      // compute width and xs
      width = -xgap;
      for (const [i, laneWidth] of laneWidths.entries()) {
        width += xgap;
        laneWidths[i] = width + laneWidth / 2;
        width += laneWidth;
      }
      // assign xs
      for (const node of ordered) {
        node.x = laneWidths[node.x];
      }
    } else {
      // constant, so assign simply
      const [nodeWidth, nodeHeight] = options.nodeSize;
      for (const node of ordered) {
        node.x = (node.x + 0.5) * nodeWidth + node.x * xgap;
        node.y = (node.y + 0.5) * nodeHeight + node.y * ygap;
      }
      width = numLanes * (nodeWidth + xgap) - xgap;
      height = ordered.length * (nodeHeight + ygap) - ygap;
    }

    // assign link points
    for (const link of grf.links()) {
      const { source, target, points } = link;
      points.splice(0);
      if (source.x === target.x) {
        points.push([source.x, source.y], [target.x, target.y]);
      } else {
        points.push([source.x, source.y]);
        if (source.y < target.y) {
          // effectively reverse edge
          points.push([target.x, source.y]);
        } else {
          points.push([source.x, target.y]);
        }
        points.push([target.x, target.y]);
      }
    }

    return { width, height };
  }

  function lane(): Ops["lane"];
  function lane<NL extends Lane>(val: NL): Grid<U<Ops, "lane", NL>>;
  function lane<NL extends Lane>(
    val?: NL
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
    val?: NR
  ): Grid<U<Ops, "rank", NR>> | Ops["rank"] {
    if (val === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: val }, sizes);
    }
  }
  grid.rank = rank;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<NNS extends NodeSize>(
    val: NNS
  ): Grid<U<Ops, "nodeSize", NNS>>;
  function nodeSize<NNS extends NodeSize>(
    val?: NNS
  ): Grid<U<Ops, "nodeSize", NNS>> | Ops["nodeSize"] {
    if (val === undefined) {
      return options.nodeSize;
    } else if (typeof val !== "function" && (val[0] <= 0 || val[1] <= 0)) {
      const [x, y] = val;
      throw err`constant nodeSize must be positive, but got: [${x}, ${y}]`;
    } else {
      const { nodeSize: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          nodeSize: val,
        },
        sizes
      );
    }
  }
  grid.nodeSize = nodeSize;

  function gap(): readonly [number, number];
  function gap(val: readonly [number, number]): Grid<Ops>;
  function gap(
    val?: readonly [number, number]
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
}>;

/**
 * Create a new {@link Grid} with default settings.
 *
 * - {@link Grid#lane | `lane()`}: {@link grid/lane/greedy!LaneGreedy}
 * - {@link Grid#rank | `rank()`}: no ranks
 * - {@link Grid#nodeSize | `nodeSize()`}: [1, 1]
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
    },
    {
      xgap: 1,
      ygap: 1,
    }
  );
}
