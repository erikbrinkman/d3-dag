/**
 * A topological layout using {@link Zherebko}.
 *
 * @packageDocumentation
 */
import { Graph, Rank } from "../graph";
import { bigrams, map } from "../iters";
import { CallableNodeSize, LayoutResult, NodeSize } from "../layout";
import { Tweak } from "../tweaks";
import { err, U } from "../utils";
import { greedy } from "./greedy";

/** all operators for the zherebko layout */
export interface ZherebkoOps<in N = never, in L = never> {
  /** the operator for assigning nodes a rank */
  rank: Rank<N, L>;
  /** node size operator */
  nodeSize: NodeSize<N, L>;
  /** tweaks */
  tweaks: readonly Tweak<N, L>[];
}

/**
 * a simple topological layout operator.
 *
 * This layout algorithm constructs a topological representation of the graph
 * meant for visualization. The algorithm is based off a PR by D. Zherebko. The
 * nodes are topologically ordered, and edges are then positioned into "lanes"
 * to the left and right of the nodes.
 *
 * Create with {@link zherebko}.
 */
export interface Zherebko<Ops extends ZherebkoOps = ZherebkoOps> {
  /**
   * layout the graph using the current operator
   */
  (
    graph: Ops extends ZherebkoOps<infer N, infer L> ? Graph<N, L> : never,
  ): LayoutResult;

  /**
   * set the {@link Rank} operator for the topological ordering
   */
  rank<NewRank extends Rank>(val: NewRank): Zherebko<U<Ops, "rank", NewRank>>;
  /** get the current lane operator */
  rank(): Ops["rank"];

  /**
   * set the {@link Tweak}s to apply after layout
   */
  tweaks<NewTweaks extends readonly Tweak[]>(
    val: NewTweaks,
  ): Zherebko<U<Ops, "tweaks", NewTweaks>>;
  /**
   * get the current {@link Tweak}s.
   */
  tweaks(): Ops["tweaks"];

  /**
   * sets the {@link NodeSize}
   *
   * (default: `[1, 1]`)
   */
  nodeSize<NewNodeSize extends NodeSize>(
    val: NewNodeSize,
  ): Zherebko<U<Ops, "nodeSize", NewNodeSize>>;
  /** get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * set the gap size between nodes
   *
   * (default: `[1, 1]`)
   */
  gap(val: readonly [number, number]): Zherebko<Ops>;
  /** get the current gap size */
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
function buildOperator<ND, LD, O extends ZherebkoOps<ND, LD>>(
  ops: O & ZherebkoOps<ND, LD>,
  sizes: {
    xgap: number;
    ygap: number;
  },
): Zherebko<O> {
  function zherebko<N extends ND, L extends LD>(
    inp: Graph<N, L>,
  ): LayoutResult {
    let res;
    // short-circuit empty graph
    if (!inp.nnodes()) {
      res = { width: 0, height: 0 };
    } else {
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
            (s.y - f.y) /
            (f.nchildLinksTo(s) + f.nparentLinksTo(s) > 1 ? 2 : 1),
        ),
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

      res = {
        width: (maxIndex - minIndex) * xgap + maxWidth,
        height,
      };
    }

    // apply tweaks
    for (const tweak of ops.tweaks) {
      res = tweak(inp, res);
    }
    return res;
  }

  function rank(): O["rank"];
  function rank<NR extends Rank>(val: NR): Zherebko<U<O, "rank", NR>>;
  function rank<NR extends Rank>(
    val?: NR,
  ): Zherebko<U<O, "rank", NR>> | O["rank"] {
    if (val === undefined) {
      return ops.rank;
    } else {
      const { rank: _, ...rest } = ops;
      return buildOperator({ ...rest, rank: val }, sizes);
    }
  }
  zherebko.rank = rank;

  function tweaks(): O["tweaks"];
  function tweaks<NT extends readonly Tweak[]>(
    val: NT,
  ): Zherebko<U<O, "tweaks", NT>>;
  function tweaks<NT extends readonly Tweak[]>(
    val?: NT,
  ): O["tweaks"] | Zherebko<U<O, "tweaks", NT>> {
    if (val === undefined) {
      return ops.tweaks;
    } else {
      const { tweaks: _, ...rest } = ops;
      return buildOperator(
        {
          ...rest,
          tweaks: val,
        },
        sizes,
      );
    }
  }
  zherebko.tweaks = tweaks;

  function nodeSize(): O["nodeSize"];
  function nodeSize<NNS extends NodeSize>(
    val: NNS,
  ): Zherebko<U<O, "nodeSize", NNS>>;
  function nodeSize<NNS extends NodeSize>(
    val?: NNS,
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
        sizes,
      );
    }
  }
  zherebko.nodeSize = nodeSize;

  function gap(): readonly [number, number];
  function gap(val: readonly [number, number]): Zherebko<O>;
  function gap(
    val?: readonly [number, number],
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
  /** no tweaks */
  tweaks: readonly [];
}>;

/**
 * create a new {@link Zherebko} with default settings
 *
 * This layout creates a simple topological layout. It doesn't support behavior
 * beyond the layout defaults of {@link Zherebko#rank},
 * {@link Zherebko#nodeSize}, {@link Zherebko#gap}, and
 * {@link Zherebko#tweaks}.
 *
 * <img alt="zherebko example" src="media://zherebko.png" width="1000">
 *
 * @example
 *
 * ```ts
 * const graph: Graph = ...
 * const layout = zherebko();
 * const { width, height } = layout(graph);
 * for (const node of graph.nodes()) {
 *   console.log(node.x, node.y);
 * }
 * ```
 *
 */
export function zherebko(...args: never[]): DefaultZherebko {
  if (args.length) {
    throw err`got arguments to zherebko(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`zherebko()(...)\``;
  }
  return buildOperator(
    { rank: () => undefined, nodeSize: [1, 1] as const, tweaks: [] as const },
    {
      xgap: 1,
      ygap: 1,
    },
  );
}
