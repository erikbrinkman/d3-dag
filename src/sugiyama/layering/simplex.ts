/**
 * Assigns every node a layer with the goal of minimizing the number of dummy
 * nodes (long edges) inserted. Computing this layering requires solving an
 * integer linear program, which may take a long time, although in practice is
 * often quite fast. This is often known as the network simplex layering from
 * [Gansner et al. [1993]](https://www.graphviz.org/Documentation/TSE93.pdf).
 *
 * Create a new [[SimplexOperator]] with [[simplex]].
 *
 * <img alt="simplex example" src="media://simplex.png" width="400">
 *
 * @module
 */

import { Constraint, Solve, SolverDict, Variable } from "javascript-lp-solver";
import { Dag, DagNode, Link } from "../../dag/node";
import { LayerableNode, Operator, RankAccessor } from ".";

import { Replace } from "../../utils";

interface Operators<NodeType extends DagNode> {
  rank: RankAccessor<NodeType>;
}

export interface SimplexOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType> = Operators<NodeType>
> extends Operator<NodeType> {
  /**
   * Set the [[RankAccessor]]. Any node with a rank assigned will have a second
   * ordering enforcing ordering of the ranks. Note, this can cause the simplex
   * optimization to be ildefined, and may result in an error during layout.
   */
  rank<NewRank extends RankAccessor<NodeType>>(
    newRank: NewRank
  ): SimplexOperator<NodeType, Replace<Ops, "rank", NewRank>>;
  /**
   * Get the current [[RankAccessor]].
   */
  rank(): Ops["rank"];

  /**
   * Setting *debug* to true will cause the simplex solver to use more human
   * readable names, which can help debug optimizer errors. These names will
   * cause other types of failures for poorly constructed node ids, and is
   * therefore disabled by default.
   */
  debug(val: boolean): SimplexOperator<NodeType, Ops>;
  /** Get the current debug value. */
  debug(): boolean;
}

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType>
>(options: Ops & { debug: boolean }): SimplexOperator<NodeType, Ops> {
  // use null prefixes to prevent clash
  const prefix = options.debug ? "" : "\0";
  const rankPrefix = options.debug ? "rank: " : "\0";
  const delim = options.debug ? " -> " : "\0";

  /** node id */
  function n(node: NodeType): string {
    return `${prefix}${node.id}`;
  }

  /** link id */
  function l(link: Link<NodeType>): string {
    return `${link.source.id}${delim}${link.target.id}`;
  }

  /** rank constraint */
  function r(low: NodeType, high: NodeType): string {
    return `${rankPrefix}${low.id}${delim}${high.id}`;
  }

  function simplexCall<N extends NodeType & LayerableNode>(dag: Dag<N>): void {
    const variables: SolverDict<Variable> = Object.create(null);
    const ints: SolverDict<number> = Object.create(null);
    const constraints: SolverDict<Constraint> = Object.create(null);

    const ranks: [number, N][] = [];

    // Add node variables and fetch ranks
    for (const node of dag) {
      const nid = n(node);
      ints[nid] = 1;
      variables[nid] = {
        opt: node.children.length
      };

      const rank = options.rank(node);
      if (rank !== undefined) {
        ranks.push([rank, node]);
      }
    }

    // Add link constraints
    for (const link of dag.ilinks()) {
      const source = variables[n(link.source)];
      const target = variables[n(link.target)];
      const edge = l(link);

      constraints[edge] = { min: 1 };
      source[edge] = -1;
      source.opt++;
      target[edge] = 1;
      target.opt--;
    }

    // Add rank constraints
    let [first, ...rest] = ranks.sort(([a], [b]) => a - b);
    for (const second of rest) {
      const [frank, fnode] = first;
      const [srank, snode] = second;

      const low = variables[n(fnode)];
      const high = variables[n(snode)];
      const cons = r(fnode, snode);

      if (frank < srank) {
        // inequality constraint
        constraints[cons] = { min: 1 };
        low[cons] = -1;
        high[cons] = 1;
      } else {
        // equality constraint
        const rcons = r(snode, fnode);
        constraints[cons] = { min: 0 };
        constraints[rcons] = { min: 0 };
        low[cons] = -1;
        low[rcons] = 1;
        high[cons] = 1;
        high[rcons] = -1;
      }

      first = second;
    }

    const { feasible, ...assignment } = Solve({
      optimize: "opt",
      opType: "max",
      constraints: constraints,
      variables: variables,
      ints: ints
    });
    if (!feasible) {
      /* istanbul ignore else */
      if (ranks.length) {
        throw new Error(
          "could not find a feasbile simplex layout, check that rank accessors are not ill-defined"
        );
      } else {
        throw new Error(
          "could not find feasbile simplex layout, this should not happen"
        );
      }
    }

    // lp solver doesn't assign some zeros
    for (const node of dag) {
      node.layer = assignment[n(node)] || 0;
    }
  }

  function rank<NewRank extends RankAccessor<NodeType>>(
    newRank: NewRank
  ): SimplexOperator<NodeType, Replace<Ops, "rank", NewRank>>;
  function rank(): Ops["rank"];
  function rank<NewRank extends RankAccessor<NodeType>>(
    newRank?: NewRank
  ): SimplexOperator<NodeType, Replace<Ops, "rank", NewRank>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  simplexCall.rank = rank;

  function debug(): boolean;
  function debug(val: boolean): SimplexOperator<NodeType, Ops>;
  function debug(val?: boolean): boolean | SimplexOperator<NodeType, Ops> {
    if (val === undefined) {
      return options.debug;
    } else {
      return buildOperator({ ...options, debug: val });
    }
  }
  simplexCall.debug = debug;

  return simplexCall;
}

/** @internal */
function defaultRank(): undefined {
  return undefined;
}

/** Create a default [[SimplexOperator]]. */
export function simplex<NodeType extends DagNode>(
  ...args: never[]
): SimplexOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to simplex(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ rank: defaultRank, debug: false });
}
