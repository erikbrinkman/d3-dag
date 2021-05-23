/**
 * This layering operator assigns every node a layer such that the longest path
 * (the height) is minimized.  This often results in very wide graphs, but is
 * also fast to compute.
 *
 * Create a new {@link LongestPathOperator} with {@link longestPath}.
 *
 * <img alt="longest path example" src="media://longest_path.png" width="400">
 *
 * @module
 */
import { Dag } from "../../dag/node";
import { LayeringOperator } from ".";
import { def } from "../../utils";

export interface LongestPathOperator extends LayeringOperator {
  /**
   * Set whether longest path should go top down or not. If set to true (the
   * default), longest path will start at the top, putting nodes as close to
   * the top as possible.
   */
  topDown(val: boolean): LongestPathOperator;
  /** Get whether or not this is using topDown. */
  topDown(): boolean;
}

/** @internal */
function buildOperator(options: { topDown: boolean }): LongestPathOperator {
  function longestPathCall(dag: Dag): void {
    if (options.topDown) {
      dag.depth();
    } else {
      dag.height();
      const maxHeight = Math.max(...dag.iroots().map((d) => def(d.value)));
      for (const node of dag) {
        node.value = maxHeight - def(node.value);
      }
    }
  }

  function topDown(): boolean;
  function topDown(val: boolean): LongestPathOperator;
  function topDown(val?: boolean): boolean | LongestPathOperator {
    if (val === undefined) {
      return options.topDown;
    } else {
      return buildOperator({ ...options, topDown: val });
    }
  }
  longestPathCall.topDown = topDown;

  return longestPathCall;
}

/** Create a default {@link LongestPathOperator}. */
export function longestPath(...args: never[]): LongestPathOperator {
  if (args.length) {
    throw new Error(
      `got arguments to longestPath(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ topDown: true });
}
