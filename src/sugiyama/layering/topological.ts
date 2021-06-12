/**
 * Assigns every node a distinct layer. This layering operator is often only
 * useful in conjunction with topological coordinate assignment. This layering
 * is very fast, but it may make other steps take longer due to the many
 * created dummy nodes.
 *
 * Create a new {@link TopologicalOperator} with {@link topological}.
 *
 * <img alt="topological example" src="media://topological.png" width="400">
 *
 * @module
 */

import { Dag } from "../../dag";
import { LayeringOperator } from ".";

export type TopologicalOperator = LayeringOperator<unknown, unknown>;

/**
 * Create a topological layering.
 */
export function topological(...args: never[]): TopologicalOperator {
  if (args.length) {
    throw new Error(
      `got arguments to topological(${args}), but constructor takes no aruguments.`
    );
  }

  function topologicalCall(dag: Dag): void {
    for (const [layer, node] of dag.idescendants("before").entries()) {
      node.value = layer;
    }
  }

  return topologicalCall;
}
