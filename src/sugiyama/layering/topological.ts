/**
 * A {@link LayeringTopological} that assigns each node a unique layer.
 *
 * @packageDocumentation
 */
import { Layering } from ".";
import { Graph, Rank } from "../../graph";
import { err, U } from "../../utils";
import { Separation } from "../utils";

/** topological operator operators */
export interface LayeringTopologicalOps<in N = never, in L = never> {
  /** rank operator */
  rank: Rank<N, L>;
}

/** the node datum of a set of operators */
export type OpsNodeDatum<Ops extends LayeringTopologicalOps> =
  Ops extends LayeringTopologicalOps<infer N, never> ? N : never;

/** the link datum of a set of operators */
export type OpsLinkDatum<Ops extends LayeringTopologicalOps> =
  Ops extends LayeringTopologicalOps<never, infer L> ? L : never;

/**
 * A layering that assigns every node a distinct layer, creating a topological
 * layout.
 *
 * This combined with topological coordinate assignment can be thought of as an
 * alternative to {@link zherebko!Zherebko}. The latter generally produces more
 * pleasing layouts, but both are options. This operator is
 *
 * Assigns every node a distinct layer. This layering operator is often only
 * useful in conjunction with topological coordinate assignment. This layering
 * is very fast, but it may make other steps take longer due to the many
 * created dummy nodes.
 *
 * Create with {@link layeringTopological}.
 *
 * <img alt="topological example" src="media://sugi-topological-opt-topological.png" width="1000">
 */
export interface LayeringTopological<
  Ops extends LayeringTopologicalOps = LayeringTopologicalOps
> extends Layering<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>> {
  /**
   * Set the {@link graph!Rank}. Nodes will first be in rank order, and then
   * in topological order attempting to minimize edge inversions.
   */
  rank<NewRank extends Rank>(
    newRank: NewRank
  ): LayeringTopological<U<Ops, "rank", NewRank>>;
  /**
   * Get the current {@link graph!Rank}.
   */
  rank(): Ops["rank"];

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
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

/** default simplex operator */
export type DefaultLayeringTopological = LayeringTopological<{
  /** unconstrained rank */
  rank: Rank<unknown, unknown>;
}>;

/**
 * Create a default {@link LayeringTopological}
 */
export function layeringTopological(
  ...args: never[]
): DefaultLayeringTopological {
  if (args.length) {
    throw err`got arguments to layeringTopological(${args}); you probably forgot to construct layeringTopological before passing to layering: \`sugiyama().layering(layeringTopological())\`, note the trailing "()"`;
  }
  return buildOperator({ rank: defaultAccessor });
}
