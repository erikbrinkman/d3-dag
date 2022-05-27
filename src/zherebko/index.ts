/**
 * A topological layout using {@link Zherebko}.
 *
 * @packageDocumentation
 */
import { Graph, Rank } from "../graph";
import { bigrams, map } from "../iters";
import { CallableNodeSize, LayoutResult, NodeSize } from "../layout";
import { err, U } from "../utils";
import { greedy } from "./greedy";

// TODO Add node size

/** all operators for the zherebko layout */
export interface Operators<in N = never, in L = never> {
  /** the operator for assigning nodes a rank */
  rank: Rank<N, L>;
  /** node size operator */
  nodeSize: NodeSize<N, L>;
}

/** the typed graph input of a set of operators */
export type OpGraph<Ops extends Operators> = Ops extends Operators<
  infer N,
  infer L
>
  ? Graph<N, L>
  : never;

/**
 * A simple topological layout operator.
 *
 * This layout algorithm constructs a topological representation of the graph
 * meant for visualization. The algorithm is based off a PR by D. Zherebko. The
 * nodes are topologically ordered, and edges are then positioned into "lanes"
 * to the left and right of the nodes.
 *
 * Create with {@link zherebko}.
 *
 * <img alt="zherebko example" src="media://zherebko.png" width="1000">
 *
 * @example
 * ```typescript
 * const data = [["parent", "child"], ...];
 * const create = connect();
 * const graph = create(data);
 * const layout = zherebko();
 * const { width, height } = layout(graph);
 * for (const node of graph) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export interface Zherebko<Ops extends Operators = Operators> {
  (graph: OpGraph<Ops>): LayoutResult;

  /**
   * Set the rank operator to the given {@link graph.Rank} and returns a new
   * version of this operator. (default: () =\> undefined)
   */
  rank<NewRank extends Rank>(val: NewRank): Zherebko<U<Ops, "rank", NewRank>>;
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
  ): Zherebko<U<Ops, "nodeSize", NewNodeSize>>;
  /** Get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * Set the gap size between nodes
   *
   * (default: [0, 0])
   */
  gap(val: readonly [number, number]): Zherebko<Ops>;
  /** Get the current gap size */
  gap(): readonly [number, number];
}

function normalize<N, L>(inp: NodeSize<N, L>): CallableNodeSize<N, L> {
  if (typeof inp === "function") {
    return inp;
  } else {
    return () => inp;
  }
}

/** @internal */
function buildOperator<ND, LD, O extends Operators<ND, LD>>(
  ops: O & Operators<ND, LD>,
  sizes: {
    xgap: number;
    ygap: number;
  }
): Zherebko<O> {
  function zherebko<N extends ND, L extends LD>(
    inp: Graph<N, L>
  ): LayoutResult {
    const { xgap, ygap } = sizes;
    const nodeSize = normalize(ops.nodeSize);

    // topological-ish sort
    const ordered = [...inp.topological(ops.rank)];
    let y = -ygap;
    let maxWidth = 0;
    for (const node of ordered) {
      const [width, height] = nodeSize(node);
      if (width <= 0 || height <= 0) {
        throw err`constant nodeSize must be positive, but got: [${width}, ${height}]`;
      }
      maxWidth = Math.max(maxWidth, width);
      y += ygap;
      node.y = y + height / 2;
      y += height;
    }
    const height = y;

    // determine edge curve
    const gap = Math.min(
      // space between adjacent nodes or half for multi links
      ...map(
        bigrams(ordered),
        ([f, s]) =>
          (s.y - f.y) / (f.nchildLinksTo(s) + f.nparentLinksTo(s) > 1 ? 2 : 1)
      )
    );

    // get link indices
    const indices = greedy(ordered, gap * 1.5);

    // map to coordinates
    let minIndex = 0;
    let maxIndex = 0;
    for (const index of indices.values()) {
      minIndex = Math.min(minIndex, index);
      maxIndex = Math.max(maxIndex, index);
    }

    // assign node positions
    const nodex = -minIndex * xgap + maxWidth / 2;
    for (const node of ordered) {
      node.x = nodex;
    }

    // assign link points
    for (const link of inp.links()) {
      const index = indices.get(link) ?? 0;
      const { source, target, points } = link;
      points.splice(0);

      points.push([source.x, source.y]);
      if (index !== 0) {
        // assumed long link
        const x = (index - minIndex) * xgap + (index > 0 ? maxWidth : 0);
        const y1 = source.y + gap;
        const y2 = target.y - gap;
        if (y2 - y1 > 1e-3 * gap) {
          points.push([x, y1], [x, y2]);
        } else {
          points.push([x, y1]);
        }
      }
      points.push([target.x, target.y]);
    }

    return {
      width: (maxIndex - minIndex) * xgap + maxWidth,
      height,
    };
  }

  function rank(): O["rank"];
  function rank<NR extends Rank>(val: NR): Zherebko<U<O, "rank", NR>>;
  function rank<NR extends Rank>(
    val?: NR
  ): Zherebko<U<O, "rank", NR>> | O["rank"] {
    if (val === undefined) {
      return ops.rank;
    } else {
      const { rank: _, ...rest } = ops;
      return buildOperator({ ...rest, rank: val }, sizes);
    }
  }
  zherebko.rank = rank;

  function nodeSize(): O["nodeSize"];
  function nodeSize<NNS extends NodeSize>(
    val: NNS
  ): Zherebko<U<O, "nodeSize", NNS>>;
  function nodeSize<NNS extends NodeSize>(
    val?: NNS
  ): Zherebko<U<O, "nodeSize", NNS>> | O["nodeSize"] {
    if (val === undefined) {
      return ops.nodeSize;
    } else if (typeof val !== "function" && (val[0] <= 0 || val[1] <= 0)) {
      const [x, y] = val;
      throw err`constant nodeSize must be positive, but got: [${x}, ${y}]`;
    } else {
      const { nodeSize: _, ...rest } = ops;
      return buildOperator(
        {
          ...rest,
          nodeSize: val,
        },
        sizes
      );
    }
  }
  zherebko.nodeSize = nodeSize;

  function gap(): readonly [number, number];
  function gap(val: readonly [number, number]): Zherebko<O>;
  function gap(
    val?: readonly [number, number]
  ): Zherebko<O> | readonly [number, number] {
    if (val !== undefined) {
      const [xgap, ygap] = val;
      if (xgap < 0 || ygap < 0) {
        throw err`gap width (${xgap}) and height (${ygap}) must be non-negative`;
      }
      return buildOperator(ops, { ...sizes, xgap, ygap });
    } else {
      const { xgap, ygap } = sizes;
      return [xgap, ygap];
    }
  }
  zherebko.gap = gap;

  return zherebko;
}

/** the default zherebko operator */
export type DefaultZherebko = Zherebko<{
  /** no specified ranks */
  rank: Rank<unknown, unknown>;
  /** default node size */
  nodeSize: readonly [1, 1];
}>;

/**
 * Create a new {@link Zherebko} with default settings.
 *
 * - rank: none
 * - nodeSize: [1, 1]
 * - gap: 1
 */
export function zherebko(...args: never[]): DefaultZherebko {
  if (args.length) {
    throw err`got arguments to zherebko(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`zherebko()(...)\``;
  }
  return buildOperator(
    { rank: () => undefined, nodeSize: [1, 1] as const },
    {
      xgap: 1,
      ygap: 1,
    }
  );
}
