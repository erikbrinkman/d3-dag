/**
 * A {@link LongestPathOperator} that minimizes the height of the final layout
 *
 * @module
 */
import { LayeringOperator } from ".";
import { Dag } from "../../dag";
import { map } from "../../iters";
import { def } from "../../utils";

/**
 * A {@link LayeringOperator} that minimizes the height of the final layout.
 *
 * This often results in very wide and unpleasing graphs, but is very fast. The
 * layout can go {@link topDown | top-down} or bottom-up, either assigning all roots to layer 0
 * or all leaves to the last layer.
 *
 * Create with {@link longestPath}.
 *
 * <img alt="longest path example" src="media://sugi-longestpath-opt-quad.png" width="400">
 */
export interface LongestPathOperator
  extends LayeringOperator<unknown, unknown> {
  /**
   * Set whether longest path should go top down or not. If set to true, the
   * longest path will start at the top, putting nodes as close to the top as
   * possible. (default: true)
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
      const maxHeight = Math.max(...map(dag.iroots(), (d) => def(d.value)));
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

/**
 * Create a default {@link LongestPathOperator}, bundled as
 * {@link layeringLongestPath}.
 */
export function longestPath(...args: never[]): LongestPathOperator {
  if (args.length) {
    throw new Error(
      `got arguments to longestPath(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({ topDown: true });
}
