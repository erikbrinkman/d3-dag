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
import {
  GroupAccessor,
  LayerableNode,
  LayeringOperator,
  RankAccessor
} from ".";
import { Replace, def } from "../../utils";

interface Operators<NodeType extends DagNode> {
  rank: RankAccessor<NodeType>;
  group: GroupAccessor<NodeType>;
}

export interface SimplexOperator<
  NodeType extends DagNode = DagNode,
  Ops extends Operators<NodeType> = Operators<NodeType>
> extends LayeringOperator<NodeType> {
  /**
   * Set the {@link RankAccessor}. Any node with a rank assigned will have a second
   * ordering enforcing ordering of the ranks. Note, this can cause the simplex
   * optimization to be ill-defined, and may result in an error during layout.
   */
  rank<NewNode extends NodeType, NewRank extends RankAccessor<NewNode>>(
    // NOTE this is necessary for type inference
    newRank: NewRank & ((node: NewNode) => number | undefined)
  ): SimplexOperator<NewNode, Replace<Ops, "rank", NewRank>>;
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
  group<NewNode extends NodeType, NewGroup extends GroupAccessor<NewNode>>(
    newGroup: NewGroup & ((node: NewNode) => string | undefined)
  ): SimplexOperator<NewNode, Replace<Ops, "group", NewGroup>>;
  /**
   * Get the current {@link GroupAccessor}.
   */
  group(): Ops["group"];
}

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType>
>(options: Ops): SimplexOperator<NodeType, Ops> {
  function simplexCall<N extends NodeType & LayerableNode>(dag: Dag<N>): void {
    const variables: SolverDict<Variable> = Object.create(null);
    const ints: SolverDict<number> = Object.create(null);
    const constraints: SolverDict<Constraint> = Object.create(null);

    const ids = new Map<NodeType, string>(
      dag
        .idescendants()
        .entries()
        .map(([i, node]) => [node, i.toString()])
    );

    /** get node id */
    function n(node: NodeType): string {
      return def(ids.get(node));
    }

    /** get variable associated with a node */
    function variable(node: NodeType): Variable {
      return variables[n(node)];
    }

    /** enforce that first occurs before second
     *
     * @param prefix determines a unique prefix to describe constraint
     * @param strict strictly before or possibly equal
     */
    function before(
      prefix: string,
      first: NodeType,
      second: NodeType,
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
    function equal(prefix: string, first: NodeType, second: NodeType): void {
      before(`${prefix} before`, first, second, false);
      before(`${prefix} after`, second, first, false);
    }

    const ranks: [number, N][] = [];
    const groups = new Map<string, N[]>();

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
    let [first, ...rest] = ranks.sort(([a], [b]) => a - b);
    for (const second of rest) {
      const [frank, fnode] = first;
      const [srank, snode] = second;
      if (frank < srank) {
        before("rank", fnode, snode);
      } else {
        equal("rank", fnode, snode);
      }
      first = second;
    }

    // group constraints
    for (const group of groups.values()) {
      let [first, ...rest] = group;
      for (const second of rest) {
        equal("group", first, second);
        first = second;
      }
    }

    // NOTE bundling sets this to undefined, and we need it to be setable
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
      node.layer = assignment[n(node)] || 0;
    }
  }

  function rank<
    NewNode extends NodeType,
    NewRank extends RankAccessor<NewNode>
  >(newRank: NewRank): SimplexOperator<NewNode, Replace<Ops, "rank", NewRank>>;
  function rank(): Ops["rank"];
  function rank<
    NewNode extends NodeType,
    NewRank extends RankAccessor<NewNode>
  >(
    newRank?: NewRank
  ): SimplexOperator<NewNode, Replace<Ops, "rank", NewRank>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  simplexCall.rank = rank;

  function group<
    NewNode extends NodeType,
    NewGroup extends GroupAccessor<NewNode>
  >(
    newGroup: NewGroup
  ): SimplexOperator<NewNode, Replace<Ops, "group", NewGroup>>;
  function group(): Ops["group"];
  function group<
    NewNode extends NodeType,
    NewGroup extends GroupAccessor<NewNode>
  >(
    newGroup?: NewGroup
  ): SimplexOperator<NewNode, Replace<Ops, "group", NewGroup>> | Ops["group"] {
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
export function simplex(...args: never[]): SimplexOperator<DagNode> {
  if (args.length) {
    throw new Error(
      `got arguments to simplex(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ rank: defaultAccessor, group: defaultAccessor });
}
