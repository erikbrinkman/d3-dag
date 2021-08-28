/**
 * A {@link TopologicalOperator} that assigns each node a unique layer.
 *
 * @module
 */
import { LayeringOperator } from ".";
import { Dag } from "../../dag";
import { entries } from "../../iters";

/**
 * A layering that assigns every node a distinct layer, creating a topological
 * layout.
 *
 * This combined with topological coordinate assignment can be thought of as an
 * alternative to {@link ZherebkoOperator}. The latter generally produces more
 * pleasing layouts, but both are options. This operator is
 *
 * Assigns every node a distinct layer. This layering operator is often only
 * useful in conjunction with topological coordinate assignment. This layering
 * is very fast, but it may make other steps take longer due to the many
 * created dummy nodes.
 *
 * Create with {@link topological}.
 *
 * <img alt="topological example" src="media://sugi-topological-opt-topological.png" width="1000">
 */
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

  // TODO simplex optimizes number of dummy nodes, we could do simplex first,
  // then grow each layer to minimize dummy nodes. Its unclear how hard that
  // permutation is to optimize
  function topologicalCall(dag: Dag): void {
    for (const [layer, node] of entries(dag.idescendants("before"))) {
      node.value = layer;
    }
  }

  return topologicalCall;
}
