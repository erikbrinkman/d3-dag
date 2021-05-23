/**
 * Assigns every node a layer with the goal of minimizing the number of dummy
 * nodes (long edges) inserted. Computing this layering requires solving an
 * integer linear program, which may take a long time, although in practice is
 * often quite fast. This is often known as the network simplex layering from
 * [Gansner et al. [1993}]](https://www.graphviz.org/Documentation/TSE93.pdf).
 *
 * Create a new {@link SimplexOperator} with {@link simplex}.
 *
 * <img alt="simplex example" src="media://simplex.png" width="400">
 *
 * @module
 */

import { Constraint, Solve, SolverDict, Variable } from "javascript-lp-solver";
import { Dag, DagNode } from "../../dag/node";
import { GroupAccessor, LayeringOperator, RankAccessor } from ".";
import { Replace, bigrams, def } from "../../utils";

interface Operators<NodeDatum, LinkDatum> {
  rank: RankAccessor<NodeDatum, LinkDatum>;
  group: GroupAccessor<NodeDatum, LinkDatum>;
}

export interface SimplexOperator<
  NodeDatum = unknown,
  LinkDatum = unknown,
  Ops extends Operators<NodeDatum, LinkDatum> = Operators<NodeDatum, LinkDatum>
> extends LayeringOperator<NodeDatum, LinkDatum> {
  /**
   * Set the {@link RankAccessor}. Any node with a rank assigned will have a second
   * ordering enforcing ordering of the ranks. Note, this can cause the simplex
   * optimization to be ill-defined, and may result in an error during layout.
   */
  rank<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewRank extends RankAccessor<NewNodeDatum, NewLinkDatum>
  >(
    // NOTE this is necessary for type inference
    newRank: NewRank & RankAccessor<NewNodeDatum, NewLinkDatum>
  ): SimplexOperator<NewNodeDatum, NewLinkDatum, Replace<Ops, "rank", NewRank>>;
  /**
   * Get the current {@link RankAccessor}.
   */
  rank(): Ops["rank"];

  /**
   * Set the {@link GroupAccessor}. Any node with a group assigned will have a second
   * ordering enforcing all nodes with the same group have the same layer.
   * Note, this can cause the simplex optimization to be ill-defined, and may
   * result in an error during layout.
   */
  group<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewGroup extends GroupAccessor<NewNodeDatum, NewLinkDatum>
  >(
    newGroup: NewGroup & GroupAccessor<NewNodeDatum, NewLinkDatum>
  ): SimplexOperator<
    NewNodeDatum,
    NewLinkDatum,
    Replace<Ops, "group", NewGroup>
  >;
  /**
   * Get the current {@link GroupAccessor}.
   */
  group(): Ops["group"];
}

/** @internal */
function buildOperator<N, L, Ops extends Operators<N, L>>(
  options: Ops
): SimplexOperator<N, L, Ops> {
  function simplexCall(dag: Dag<N, L>): void {
    const variables: SolverDict<Variable> = {};
    const ints: SolverDict<number> = {};
    const constraints: SolverDict<Constraint> = {};

    const ids = new Map(
      dag
        .idescendants()
        .entries()
        .map(([i, node]) => [node, i.toString()] as const)
    );

    /** get node id */
    function n(node: DagNode<N, L>): string {
      return def(ids.get(node));
    }

    /** get variable associated with a node */
    function variable(node: DagNode<N, L>): Variable {
      return variables[n(node)];
    }

    /** enforce that first occurs before second
     *
     * @param prefix determines a unique prefix to describe constraint
     * @param strict strictly before or possibly equal
     */
    function before(
      prefix: string,
      first: DagNode<N, L>,
      second: DagNode<N, L>,
      strict: boolean = true
    ): void {
      const fvar = variable(first);
      const svar = variable(second);
      const cons = `${prefix}: ${def(n(first))} -> ${def(n(second))}`;

      constraints[cons] = { min: +strict };
      fvar[cons] = -1;
      svar[cons] = 1;
    }

    /** enforce that first and second occur on the same layer */
    function equal(
      prefix: string,
      first: DagNode<N, L>,
      second: DagNode<N, L>
    ): void {
      before(`${prefix} before`, first, second, false);
      before(`${prefix} after`, second, first, false);
    }

    const ranks: [number, DagNode<N, L>][] = [];
    const groups = new Map<string, DagNode<N, L>[]>();

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
    for (const link of dag.ilinks()) {
      before("link", link.source, link.target);
      ++variable(link.source).opt;
      --variable(link.target).opt;
    }

    // Add rank constraints
    const ranked = ranks.sort(([a], [b]) => a - b);
    for (const [[frank, fnode], [srank, snode]] of bigrams(ranked)) {
      if (frank < srank) {
        before("rank", fnode, snode);
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

    // NOTE bundling sets `this` to undefined, and we need it to be setable
    const { feasible, ...assignment } = Solve.call(
      {},
      {
        optimize: "opt",
        opType: "max",
        constraints: constraints,
        variables: variables,
        ints: ints
      }
    );
    if (!feasible) {
      /* istanbul ignore else */
      if (ranks.length || groups.size) {
        throw new Error(
          "could not find a feasbile simplex layout, check that rank or group accessors are not ill-defined"
        );
      } else {
        throw new Error(
          "could not find feasbile simplex layout, this should not happen"
        );
      }
    }

    // lp solver doesn't assign some zeros
    for (const node of dag) {
      node.value = assignment[n(node)] || 0;
    }
  }

  function rank<
    NN extends N,
    NL extends L,
    NewRank extends RankAccessor<NN, NL>
  >(newRank: NewRank): SimplexOperator<NN, NL, Replace<Ops, "rank", NewRank>>;
  function rank(): Ops["rank"];
  function rank<
    NN extends N,
    NL extends L,
    NewRank extends RankAccessor<NN, NL>
  >(
    newRank?: NewRank
  ): SimplexOperator<NN, NL, Replace<Ops, "rank", NewRank>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  simplexCall.rank = rank;

  function group<
    NN extends N,
    NL extends L,
    NewGroup extends GroupAccessor<NN, NL>
  >(
    newGroup: NewGroup
  ): SimplexOperator<NN, NL, Replace<Ops, "group", NewGroup>>;
  function group(): Ops["group"];
  function group<
    NN extends N,
    NL extends L,
    NewGroup extends GroupAccessor<NN, NL>
  >(
    newGroup?: NewGroup
  ): SimplexOperator<NN, NL, Replace<Ops, "group", NewGroup>> | Ops["group"] {
    if (newGroup === undefined) {
      return options.group;
    } else {
      const { group: _, ...rest } = options;
      return buildOperator({ ...rest, group: newGroup });
    }
  }
  simplexCall.group = group;

  return simplexCall;
}

/** @internal */
function defaultAccessor(): undefined {
  return undefined;
}

/** Create a default {@link SimplexOperator}. */
export function simplex(...args: never[]): SimplexOperator {
  if (args.length) {
    throw new Error(
      `got arguments to simplex(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ rank: defaultAccessor, group: defaultAccessor });
}
