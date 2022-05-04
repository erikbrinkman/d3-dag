/**
 * A {@link TopologicalOperator} that assigns each node a unique layer.
 *
 * @packageDocumentation
 */
import { LayeringOperator } from ".";
import { Dag } from "../../dag";

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
      `got arguments to topological(${args}), but constructor takes no arguments.`
    );
  }

  function topologicalCall(dag: Dag): void {
    let layer = 0;
    let last;
    for (const node of dag.idescendants("before")) {
      if (last !== undefined && last.nchildLinksTo(node) > 1) {
        ++layer;
      }
      node.value = layer++;
      last = node;
    }
  }

  return topologicalCall;
}
