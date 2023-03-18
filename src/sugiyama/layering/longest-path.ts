/**
 * A {@link LayeringLongestPath} that minimizes the height of the final layout
 *
 * @packageDocumentation
 */
import { Layering } from ".";
import { Graph } from "../../graph";
import { map } from "../../iters";
import { err } from "../../utils";
import { Separation } from "../utils";

/**
 * a {@link Layering} that minimizes the height of the final layout.
 *
 * This often results in very wide and unpleasing graphs, but is very fast. The
 * layout can go {@link topDown | top-down} or bottom-up, either assigning all roots to layer 0
 * or all leaves to the last layer.
 *
 * Create with {@link layeringLongestPath}.
 */
export interface LayeringLongestPath extends Layering<unknown, unknown> {
  // FIXME this should also take a rank operator

  /**
   * set whether longest path should go top down
   *
   * If set to true, the longest path will start at the top, putting nodes as
   * close to the top as possible.
   *
   * (default: `true`)
   */
  topDown(val: boolean): LayeringLongestPath;
  /** get whether or not this is using topDown. */
  topDown(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

function buildOperator(options: { topDown: boolean }): LayeringLongestPath {
  function layeringLongestPath<N, L>(
    dag: Graph<N, L>,
    sep: Separation<N, L>
  ): number {
    let height = 0;
    const nodes = dag.topological();

    // clear ys to indicate previously assigned nodes
    for (const node of nodes) {
      node.uy = undefined;
    }

    // flip if we're not top down
    if (!options.topDown) {
      nodes.reverse();
    }

    // progressively update y
    for (const node of nodes) {
      const val = Math.max(
        sep(undefined, node),
        ...map(node.parents(), (par) => (par.uy ?? -Infinity) + sep(par, node)),
        ...map(
          node.children(),
          (child) => (child.uy ?? -Infinity) + sep(node, child)
        )
      );
      height = Math.max(height, val + sep(node, undefined));
      node.y = val;
    }

    // FIXME go both way to condense

    // flip again if we're not top down
    if (!options.topDown) {
      for (const node of dag.nodes()) {
        node.y = height - node.y;
      }
    }

    return height;
  }

  function topDown(): boolean;
  function topDown(val: boolean): LayeringLongestPath;
  function topDown(val?: boolean): boolean | LayeringLongestPath {
    if (val === undefined) {
      return options.topDown;
    } else {
      return buildOperator({ ...options, topDown: val });
    }
  }
  layeringLongestPath.topDown = topDown;

  layeringLongestPath.d3dagBuiltin = true as const;

  return layeringLongestPath;
}

/**
 * create a default {@link LayeringLongestPath}
 *
 * This {@link Layering} operator minimizes the height of the final layout.
 * This often results in very wide and unpleasing graphs, but is very fast. You
 * can set if it goes {@link LayeringLongestPath#topDown}.
 *
 * @example
 *
 * ```ts
 * const layout = sugiyama().layering(layeringLongestPath().topDown(false));
 * ```
 */
export function layeringLongestPath(...args: never[]): LayeringLongestPath {
  if (args.length) {
    throw err`got arguments to layeringLongestPath(${args}); you probably forgot to construct layeringLongestPath before passing to layering: \`sugiyama().layering(layeringLongestPath())\`, note the trailing "()"`;
  }
  return buildOperator({ topDown: true });
}
