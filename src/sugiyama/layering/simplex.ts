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
 * @packageDocumentation
 */
import { Constraint, Solve, SolverDict, Variable } from "javascript-lp-solver";
import { Dag, DagNode } from "../../dag/node";
import { LayerableNode, Operator } from ".";

export interface SimplexOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Setting *debug* to true will cause the simplex solver to use more human
   * readable names, which can help debug optimizer errors. These names will
   * cause other types of failures for poorly constructed node ids, and is
   * therefore disabled by default.
   */
  debug(val: boolean): SimplexOperator<NodeType>;
  /** Get the current debug value. */
  debug(): boolean;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  debugVal: boolean
): SimplexOperator<NodeType> {
  function simplexCall<N extends NodeType & LayerableNode>(dag: Dag<N>): void {
    if (!dag.connected()) {
      throw new Error(`simplex() doesn't work with disconnected dags`);
      // TODO this could be fixed by first splitting the dag and running each
      // separately, and then merging
    }

    // use null prefixes to prevent clash
    const prefix = debugVal ? "" : "\0";
    const delim = debugVal ? " -> " : "\0";

    const variables: SolverDict<Variable> = Object.create(null);
    const ints: SolverDict<number> = Object.create(null);
    const constraints: SolverDict<Constraint> = Object.create(null);

    for (const node of dag) {
      const nid = `${prefix}${node.id}`;
      ints[nid] = 1;
      variables[nid] = {
        opt: node.children.length
      };
    }

    for (const link of dag.ilinks()) {
      const source = variables[`${prefix}${link.source.id}`];
      const target = variables[`${prefix}${link.target.id}`];
      const edge = `${link.source.id}${delim}${link.target.id}`;

      constraints[edge] = { min: 1 };
      source[edge] = -1;
      source.opt++;
      target[edge] = 1;
      target.opt--;
    }

    const assignment = Solve({
      optimize: "opt",
      opType: "max",
      constraints: constraints,
      variables: variables,
      ints: ints
    });

    // lp solver doesn't assign some zeros
    for (const node of dag) {
      node.layer = assignment[`${prefix}${node.id}`] || 0;
    }
  }

  function debug(): boolean;
  function debug(val: boolean): SimplexOperator<NodeType>;
  function debug(val?: boolean): boolean | SimplexOperator<NodeType> {
    if (val === undefined) {
      return debugVal;
    } else {
      return buildOperator(val);
    }
  }
  simplexCall.debug = debug;

  return simplexCall;
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
  return buildOperator(false);
}
