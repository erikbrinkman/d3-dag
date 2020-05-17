/**
 * Assigns every node a distinct layer. This layering operator is often only
 * useful in conjunction with topological coordinate assignment. This layering
 * is very fast, but it may make other steps take longer due to the many
 * created dummy nodes.
 *
 * Create a new [[TopologicalOperator]] with [[topological]].
 *
 * <img alt="topological example" src="media://topological.png" width="400">
 *
 * @packageDocumentation
 */

import { Dag, DagNode } from "../../dag/node";
import { LayerableNode, Operator } from ".";

export type TopologicalOperator<NodeType extends DagNode> = Operator<NodeType>;

/**
 * Create a topological layering.
 */
export function topological<NodeType extends DagNode>(
  ...args: never[]
): TopologicalOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to topological(${args}), but constructor takes no aruguments.`
    );
  }

  function topologicalCall<N extends NodeType & LayerableNode>(
    dag: Dag<N>
  ): void {
    for (const [layer, node] of dag.idescendants("before").entries()) {
      node.layer = layer;
    }
  }

  return topologicalCall;
}
