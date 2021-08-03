/**
 * A {@link SimplexOperator} that assigns layers to minimize the number of
 * dummy nodes.
 *
 * @module
 */
import { Constraint, Solve, SolverDict, Variable } from "javascript-lp-solver";
import { GroupAccessor, LayeringOperator, RankAccessor } from ".";
import { Dag, DagNode } from "../../dag";
import { assert, bigrams, def, Up } from "../../utils";
import { LinkDatum, NodeDatum } from "../utils";

interface Operators {
  rank: RankAccessor;
  group: GroupAccessor;
}

type OpDagNode<O extends RankAccessor | GroupAccessor> = Parameters<O>[0];
type OpNodeDatum<O extends RankAccessor | GroupAccessor> = NodeDatum<
  OpDagNode<O>
>;
type OpLinkDatum<O extends RankAccessor | GroupAccessor> = LinkDatum<
  OpDagNode<O>
>;
type OpsNodeDatum<Ops extends Operators> = OpNodeDatum<Ops["rank"]> &
  OpNodeDatum<Ops["group"]>;
type OpsLinkDatum<Ops extends Operators> = OpLinkDatum<Ops["rank"]> &
  OpLinkDatum<Ops["group"]>;
type OpsDagNode<Ops extends Operators> = DagNode<
  OpsNodeDatum<Ops>,
  OpsLinkDatum<Ops>
>;

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
 * constriants that indicate which nodes should be above other nodes, or
 * {@link group} constraints that say which nodes should be on the same layer.
 * Note that adding these constraints can cause the optimization to become
 * ill-defined.
 *
 * Create with {@link simplex}.
 *
 * <img alt="simplex example" src="media://sugi-simplex-opt-quad.png" width="400">
 */
export interface SimplexOperator<Ops extends Operators = Operators>
  extends LayeringOperator<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>> {
  /**
   * Set the {@link RankAccessor}. Any node with a rank assigned will have a second
   * ordering enforcing ordering of the ranks. Note, this can cause the simplex
   * optimization to be ill-defined, and may result in an error during layout.
   */
  rank<NewRank extends RankAccessor>(
    newRank: NewRank
  ): SimplexOperator<Up<Ops, { rank: NewRank }>>;
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
  group<NewGroup extends GroupAccessor>(
    newGroup: NewGroup
  ): SimplexOperator<Up<Ops, { group: NewGroup }>>;
  /**
   * Get the current {@link GroupAccessor}.
   */
  group(): Ops["group"];
}

/** @internal */
function buildOperator<Ops extends Operators>(
  options: Ops
): SimplexOperator<Ops> {
  function simplexCall(dag: Dag<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>>): void {
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
    function n(node: OpsDagNode<Ops>): string {
      return def(ids.get(node));
    }

    /** get variable associated with a node */
    function variable(node: OpsDagNode<Ops>): Variable {
      return variables[n(node)];
    }

    /** enforce that first occurs before second
     *
     * @param prefix determines a unique prefix to describe constraint
     * @param strict strictly before or possibly equal
     */
    function before(
      prefix: string,
      first: OpsDagNode<Ops>,
      second: OpsDagNode<Ops>,
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
      first: OpsDagNode<Ops>,
      second: OpsDagNode<Ops>
    ): void {
      before(`${prefix} before`, first, second, false);
      before(`${prefix} after`, second, first, false);
    }

    const ranks: [number, OpsDagNode<Ops>][] = [];
    const groups = new Map<string, OpsDagNode<Ops>[]>();

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
      assert(ranks.length || groups.size);
      throw new Error(
        "could not find a feasbile simplex layout, check that rank or group accessors are not ill-defined"
      );
    }

    // lp solver doesn't assign some zeros
    for (const node of dag) {
      node.value = assignment[n(node)] || 0;
    }
  }

  function rank<NR extends RankAccessor>(
    newRank: NR
  ): SimplexOperator<Up<Ops, { rank: NR }>>;
  function rank(): Ops["rank"];
  function rank<NR extends RankAccessor>(
    newRank?: NR
  ): SimplexOperator<Up<Ops, { rank: NR }>> | Ops["rank"] {
    if (newRank === undefined) {
      return options.rank;
    } else {
      const { rank: _, ...rest } = options;
      return buildOperator({ ...rest, rank: newRank });
    }
  }
  simplexCall.rank = rank;

  function group<NG extends GroupAccessor>(
    newGroup: NG
  ): SimplexOperator<Up<Ops, { group: NG }>>;
  function group(): Ops["group"];
  function group<NG extends GroupAccessor>(
    newGroup?: NG
  ): SimplexOperator<Up<Ops, { group: NG }>> | Ops["group"] {
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

/**
 * Create a default {@link SimplexOperator}, bundled as {@link layeringSimplex}.
 */
export function simplex(...args: never[]): SimplexOperator<{
  rank: RankAccessor<unknown, unknown>;
  group: GroupAccessor<unknown, unknown>;
}> {
  if (args.length) {
    throw new Error(
      `got arguments to simplex(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ rank: defaultAccessor, group: defaultAccessor });
}
