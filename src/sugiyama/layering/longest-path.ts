/**
 * A {@link LayeringLongestPath} that minimizes the height of the final layout
 *
 * @packageDocumentation
 */
import { Layering } from ".";
import { Graph, Rank } from "../../graph";
import { chain, filter, map } from "../../iters";
import { U, err } from "../../utils";
import { Separation } from "../utils";

/** longest path operators */
export interface LayeringLongestPathOps<in N = never, in L = never> {
  /** rank operator */
  rank: Rank<N, L>;
}

/** the node datum of a set of operators */
type OpsNodeDatum<Ops extends LayeringLongestPathOps> =
  Ops extends LayeringLongestPathOps<infer N, never> ? N : never;

/** the link datum of a set of operators */
type OpsLinkDatum<Ops extends LayeringLongestPathOps> =
  Ops extends LayeringLongestPathOps<never, infer L> ? L : never;

/**
 * a {@link Layering} that minimizes the height of the final layout.
 *
 * This often results in very wide and unpleasing graphs, but is very fast. The
 * layout can go {@link topDown | top-down} or bottom-up, either assigning all roots to layer 0
 * or all leaves to the last layer.
 *
 * Create with {@link layeringLongestPath}.
 */
export interface LayeringLongestPath<
  Ops extends LayeringLongestPathOps = LayeringLongestPathOps
> extends Layering<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>> {
  /**
   * set the {@link Rank}
   *
   * The rank will override the default ordering of nodes for rending top to
   * bottom. Note that unlike {@link layeringSimplex} nodes with the same rank
   * are *not* guaranteed to be on the same layer.
   */
  rank<NewRank extends Rank>(
    newRank: NewRank
  ): LayeringLongestPath<U<Ops, "rank", NewRank>>;
  /**
   * get the current {@link Rank}.
   */
  rank(): Ops["rank"];

  /**
   * set whether longest path should go top down
   *
   * If set to true, the longest path will start at the top, putting nodes as
   * close to the top as possible.
   *
   * (default: `true`)
   */
  topDown(val: boolean): LayeringLongestPath<Ops>;
  /** get whether or not this is using topDown. */
  topDown(): boolean;

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function buildOperator<ND, LD, O extends LayeringLongestPathOps<ND, LD>>(
  ops: O & LayeringLongestPathOps<ND, LD>,
  options: { topDown: boolean }
): LayeringLongestPath<O> {
  function layeringLongestPath<N extends ND, L extends LD>(
    dag: Graph<N, L>,
    sep: Separation<N, L>
  ): number {
    let height = 0;
    const nodes = dag.topological(ops.rank);

    // clear ys to indicate previously assigned nodes
    for (const node of nodes) {
      node.uy = undefined;
    }

    // flip if we're top down
    if (options.topDown) {
      nodes.reverse();
    }

    // progressively update y
    for (const node of nodes) {
      const val = Math.max(
        sep(undefined, node),
        ...map(
          chain(node.parents(), node.children()),
          (c) => (c.uy ?? -Infinity) + sep(c, node)
        )
      );
      height = Math.max(height, val + sep(node, undefined));
      node.y = val;
    }

    // go in reverse an update y in case we can shrink long edges
    for (const node of nodes.reverse()) {
      const val = Math.min(
        ...map(
          filter(chain(node.parents(), node.children()), (c) => node.y < c.y),
          (c) => c.y - sep(c, node)
        )
      );

      // don't update position if node has no "children" on this pass
      if (val !== Infinity) {
        node.y = val;
      }
    }

    // flip again if we're top down
    if (options.topDown) {
      for (const node of nodes) {
        node.y = height - node.y;
      }
    }

    return height;
  }

  function rank<NR extends Rank>(
    newRank: NR
  ): LayeringLongestPath<U<O, "rank", NR>>;
  function rank(): O["rank"];
  function rank<NR extends Rank>(
    newRank?: NR
  ): LayeringLongestPath<U<O, "rank", NR>> | O["rank"] {
    if (newRank === undefined) {
      return ops.rank;
    } else {
      const { rank: _, ...rest } = ops;
      return buildOperator({ ...rest, rank: newRank }, options);
    }
  }
  layeringLongestPath.rank = rank;

  function topDown(): boolean;
  function topDown(val: boolean): LayeringLongestPath<O>;
  function topDown(val?: boolean): boolean | LayeringLongestPath<O> {
    if (val === undefined) {
      return options.topDown;
    } else {
      return buildOperator(ops, {
        ...options,
        topDown: val,
      });
    }
  }
  layeringLongestPath.topDown = topDown;

  layeringLongestPath.d3dagBuiltin = true as const;

  return layeringLongestPath;
}

function defaultAccessor(): undefined {
  return undefined;
}

/** default longest path operator */
export type DefaultLayeringLongestPath = LayeringLongestPath<{
  /** unconstrained rank */
  rank: Rank<unknown, unknown>;
}>;

/**
 * create a default {@link LayeringLongestPath}
 *
 * This {@link Layering} operator minimizes the height of the final layout.
 * This often results in very wide and unpleasing graphs, but is very fast. You
 * can set if it goes {@link LayeringLongestPath#topDown}.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().layering(layeringLongestPath().topDown(false));
 * ```
 */
export function layeringLongestPath(
  ...args: never[]
): DefaultLayeringLongestPath {
  if (args.length) {
    throw err`got arguments to layeringLongestPath(${args}); you probably forgot to construct layeringLongestPath before passing to layering: \`sugiyama().layering(layeringLongestPath())\`, note the trailing "()"`;
  }
  return buildOperator({ rank: defaultAccessor }, { topDown: true });
}
