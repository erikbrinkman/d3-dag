/**
 * A {@link LayeringSimplex} that assigns layers to minimize the number of
 * dummy nodes.
 *
 * @packageDocumentation
 */
import { Group, Layering } from ".";
import { Graph, GraphNode, Rank } from "../../graph";
import { bigrams, map } from "../../iters";
import { Constraint, Variable, solve } from "../../simplex";
import { U, err, ierr } from "../../utils";
import { Separation } from "../utils";

/** simplex operator operators */
export interface LayeringSimplexOps<in N = never, in L = never> {
  /** rank operator */
  rank: Rank<N, L>;
  /** group operator */
  group: Group<N, L>;
}

/** the node datum of a set of operators */
export type OpsNodeDatum<Ops extends LayeringSimplexOps> =
  Ops extends LayeringSimplexOps<infer N, never> ? N : never;
/** the link datum of a set of operators */
export type OpsLinkDatum<Ops extends LayeringSimplexOps> =
  Ops extends LayeringSimplexOps<never, infer L> ? L : never;

/**
 * A layering operator that assigns layers to minimize the number of dummy
 * nodes (long edges) added to the layout.
 *
 * Computing this layering requires solving an integer linear program, which
 * may take a long time, although in practice is often quite fast. This is
 * often known as the network simplex layering from
 * {@link https://www.graphviz.org/Documentation/TSE93.pdf | Gansner et al.
 * [1993]}.
 *
 * Because this is solving a linear program, it is relatively easy to add new
 * constraints. The current implementation allows specifying {@link rank}
 * constraints that indicate which nodes should be above other nodes, or
 * {@link group} constraints that say which nodes should be on the same layer.
 * Note that adding these constraints can cause the optimization to become
 * ill-defined.
 *
 * Create with {@link layeringSimplex}.
 */
export interface LayeringSimplex<
  Ops extends LayeringSimplexOps = LayeringSimplexOps
> extends Layering<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>> {
  /**
   * set the {@link Rank}
   *
   * Any node with a rank assigned will have a second ordering enforcing
   * ordering of the ranks. Note, this can cause the simplex optimization to be
   * ill-defined, and may result in an error during layout.
   */
  rank<NewRank extends Rank>(
    newRank: NewRank
  ): LayeringSimplex<U<Ops, "rank", NewRank>>;
  /**
   * get the current {@link Rank}
   */
  rank(): Ops["rank"];

  /**
   * set the {@link Group}
   *
   * Any node with a group assigned will have a second ordering enforcing all
   * nodes with the same group have the same layer.  Note, this can cause the
   * simplex optimization to be ill-defined, and may result in an error during
   * layout.
   */
  group<NewGroup extends Group>(
    newGroup: NewGroup
  ): LayeringSimplex<U<Ops, "group", NewGroup>>;
  /**
   * get the current {@link Group}
   */
  group(): Ops["group"];

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function buildOperator<ND, LD, Ops extends LayeringSimplexOps<ND, LD>>(
  options: Ops & LayeringSimplexOps<ND, LD>
): LayeringSimplex<Ops> {
  function layeringSimplex<N extends ND, L extends LD>(
    dag: Graph<N, L>,
    sep: Separation<N, L>
  ): number {
    const variables: Record<string, Variable> = {};
    const constraints: Record<string, Constraint> = {};

    const ids = new Map(
      map(dag.nodes(), (node, i) => [node, i.toString()] as const)
    );

    /** get node id */
    function n(node: GraphNode<N, L>): string {
      return ids.get(node)!;
    }

    /** get variable associated with a node */
    function variable(node: GraphNode<N, L>): Variable {
      return variables[n(node)];
    }

    /** enforce that first occurs before second
     *
     * @param prefix - determines a unique prefix to describe constraint
     * @param strict - strictly before or possibly equal
     */
    function before(
      prefix: string,
      first: GraphNode<N, L>,
      second: GraphNode<N, L>,
      diff: number,
      opt: number = 0
    ): void {
      const fvar = variable(first);
      const svar = variable(second);
      const cons = `${prefix}: ${n(first)} -> ${n(second)}`;

      constraints[cons] = { min: diff };
      fvar[cons] = -1;
      svar[cons] = 1;

      fvar.opt += opt;
      svar.opt -= opt;
    }

    /** enforce that first and second occur on the same layer */
    function equal(
      prefix: string,
      first: GraphNode<N, L>,
      second: GraphNode<N, L>
    ): void {
      before(`${prefix} before`, first, second, 0);
      before(`${prefix} after`, second, first, 0);
    }

    const ranks: [number, GraphNode<N, L>][] = [];
    const groups = new Map<string, GraphNode<N, L>[]>();

    // Add node variables and fetch ranks
    for (const node of dag.nodes()) {
      const nid = n(node);
      variables[nid] = { opt: 0 };

      const rank = options.rank(node);
      if (rank !== undefined) {
        ranks.push([rank, node]);
      }
      const group = options.group(node);
      if (group !== undefined) {
        const existing = groups.get(group);
        if (existing) {
          existing.push(node);
        } else {
          groups.set(group, [node]);
        }
      }
    }

    // Add link constraints
    const seen = new Set();
    for (const node of dag.topological(options.rank)) {
      for (const [child, count] of node.childCounts()) {
        if (seen.has(child)) {
          before("link", child, node, sep(child, node), count);
        } else {
          before("link", node, child, sep(node, child), count);
        }
      }
      seen.add(node);
    }

    // Add rank constraints
    const ranked = ranks.sort(([a], [b]) => a - b);
    for (const [[frank, fnode], [srank, snode]] of bigrams(ranked)) {
      if (frank < srank) {
        before("rank", fnode, snode, sep(fnode, snode));
      } else {
        equal("rank", fnode, snode);
      }
    }

    // group constraints
    for (const group of groups.values()) {
      for (const [first, second] of bigrams(group)) {
        equal("group", first, second);
      }
    }

    try {
      const assignment = solve("opt", "max", variables, constraints, {});

      let min = 0;
      let max = 0;
      for (const node of dag.nodes()) {
        // lp solver doesn't assign some zeros
        const val = assignment[n(node)] ?? 0;
        node.y = val;
        min = Math.min(min, val - sep(undefined, node));
        max = Math.max(max, val + sep(node, undefined));
      }
      for (const node of dag.nodes()) {
        node.y -= min;
      }
      return max - min;
    } catch {
      /* istanbul ignore else */
      if (groups.size) {
        throw err`could not find a feasible simplex layout; this is likely due to group constraints producing an infeasible layout, try relaxing the functions you're passing to \`layeringSimplex().group(...)\``;
      } else {
        throw ierr`could not find a feasible simplex solution`;
      }
    }
  }

  function rank<NR extends Rank>(
    newRank: NR
  ): LayeringSimplex<U<Ops, "rank", NR>>;
  function rank(): Ops["rank"];
  function rank<NR extends Rank>(
    newRank?: NR
  ): LayeringSimplex<U<Ops, "rank", NR>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  layeringSimplex.rank = rank;

  function group<NG extends Group>(
    newGroup: NG
  ): LayeringSimplex<U<Ops, "group", NG>>;
  function group(): Ops["group"];
  function group<NG extends Group>(
    newGroup?: NG
  ): LayeringSimplex<U<Ops, "group", NG>> | Ops["group"] {
    if (newGroup === undefined) {
      return options.group;
    } else {
      const { group: _, ...rest } = options;
      return buildOperator({ ...rest, group: newGroup });
    }
  }
  layeringSimplex.group = group;

  layeringSimplex.d3dagBuiltin = true as const;

  return layeringSimplex;
}

/** @internal */
function defaultAccessor(): undefined {
  return undefined;
}

/** default simplex operator */
export type DefaultLayeringSimplex = LayeringSimplex<{
  /** unconstrained rank */
  rank: Rank<unknown, unknown>;
  /** unconstrained group */
  group: Group<unknown, unknown>;
}>;

/**
 * create a default {@link LayeringSimplex}
 *
 * This layering operator assigns layers to minimize the overall lengths of
 * edges. In most cases this strikes a good balance between compactness and
 * time to compute.
 *
 * The current implementation allows specifying {@link LayeringSimplex#rank}
 * constraints that indicate which nodes should be above other nodes, and
 * {@link LayeringSimplex#group} constraints that say which nodes should be on
 * the same layer.  Note that adding these constraints can cause the
 * optimization to become ill-defined.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().layering(layeringSimplex());
 * ```
 */
export function layeringSimplex(...args: never[]): DefaultLayeringSimplex {
  if (args.length) {
    throw err`got arguments to layeringSimplex(${args}); you probably forgot to construct layeringSimplex before passing to layering: \`sugiyama().layering(layeringSimplex())\`, note the trailing "()"`;
  }
  return buildOperator({ rank: defaultAccessor, group: defaultAccessor });
}
