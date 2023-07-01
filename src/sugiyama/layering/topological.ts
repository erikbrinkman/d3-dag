/**
 * A {@link LayeringTopological} that assigns each node a unique layer.
 *
 * @packageDocumentation
 */
import { Layering } from ".";
import { Graph, Rank } from "../../graph";
import { U, err } from "../../utils";
import { Separation } from "../utils";

/** topological operators */
export interface LayeringTopologicalOps<in N = never, in L = never> {
  /** rank operator */
  rank: Rank<N, L>;
}

/** the node datum of a set of operators */
type OpsNodeDatum<Ops extends LayeringTopologicalOps> =
  Ops extends LayeringTopologicalOps<infer N, never> ? N : never;

/** the link datum of a set of operators */
type OpsLinkDatum<Ops extends LayeringTopologicalOps> =
  Ops extends LayeringTopologicalOps<never, infer L> ? L : never;

/**
 * a layering that assigns every node a distinct layer
 *
 * This combined with topological coordinate assignment can be thought of as an
 * alternative to {@link zherebko}. The latter generally produces more pleasing
 * layouts, but both are options.  This layering is very fast, but it may make
 * other steps take longer due to the many created dummy nodes.
 *
 * Create with {@link layeringTopological}.
 */
export interface LayeringTopological<
  Ops extends LayeringTopologicalOps = LayeringTopologicalOps
> extends Layering<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>> {
  /**
   * set the {@link Rank}
   *
   * Nodes will first be in rank order, and then in topological order
   * attempting to minimize edge inversions.
   */
  rank<NewRank extends Rank>(
    newRank: NewRank
  ): LayeringTopological<U<Ops, "rank", NewRank>>;
  /**
   * get the current {@link Rank}.
   */
  rank(): Ops["rank"];

  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * Create a topological layering.
 */
function buildOperator<ND, LD, Ops extends LayeringTopologicalOps<ND, LD>>(
  options: Ops & LayeringTopologicalOps<ND, LD>
): LayeringTopological<Ops> {
  function layeringTopological<N extends ND, L extends LD>(
    dag: Graph<N, L>,
    sep: Separation<N, L>
  ): number {
    let height = 0;
    let last;
    for (const node of dag.topological(options.rank)) {
      height += sep(last, node);
      node.y = height;
      last = node;
    }
    height += sep(last, undefined);
    return height;
  }

  function rank<NR extends Rank>(
    newRank: NR
  ): LayeringTopological<U<Ops, "rank", NR>>;
  function rank(): Ops["rank"];
  function rank<NR extends Rank>(
    newRank?: NR
  ): LayeringTopological<U<Ops, "rank", NR>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  layeringTopological.rank = rank;

  layeringTopological.d3dagBuiltin = true as const;

  return layeringTopological;
}

function defaultAccessor(): undefined {
  return undefined;
}

/** default topological operator */
export type DefaultLayeringTopological = LayeringTopological<{
  /** unconstrained rank */
  rank: Rank<unknown, unknown>;
}>;

/**
 * create a default {@link LayeringTopological}
 *
 * This is a layering that assigns every node to a distinct layer.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().layering(layeringTopological());
 * ```
 */
export function layeringTopological(
  ...args: never[]
): DefaultLayeringTopological {
  if (args.length) {
    throw err`got arguments to layeringTopological(${args}); you probably forgot to construct layeringTopological before passing to layering: \`sugiyama().layering(layeringTopological())\`, note the trailing "()"`;
  }
  return buildOperator({ rank: defaultAccessor });
}
