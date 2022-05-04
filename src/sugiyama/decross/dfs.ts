/**
 * A {@link DfsOperator} heuristic for quickly producing reasonable crossings.
 * This is intended for use as an initialization step.
 *
 * @packageDocumentation
 */
import { DecrossOperator } from ".";
import { getParents } from "../../dag/utils";
import { flatMap, reverse } from "../../iters";
import { dfs as depthFirstSearch } from "../../utils";
import { SugiNode } from "../utils";

/**
 * Depth first search operator
 *
 * This is a fast heuristic that runs a depth first search, incrementally
 * adding nodes to their appropriate layer.
 */
export interface DfsOperator extends DecrossOperator<unknown, unknown> {
  /**
   * Sets whether the dfs should be top down or bottom up. (default: true)
   */
  topDown(val: boolean): DfsOperator;
  /**
   * Get the current number of passes
   */
  topDown(): boolean;
}

/** @internal */
function buildOperator(options: { topDown: boolean }): DfsOperator {
  function dfsCall(layers: SugiNode[][]): void {
    // get iteration over nodes in dfs order
    let iter: Iterable<SugiNode>;
    if (options.topDown) {
      iter = depthFirstSearch(
        (n) => n.ichildren(),
        ...flatMap(reverse(layers), (l) => l)
      );
    } else {
      const parents = getParents(flatMap(layers, (l) => l));
      iter = depthFirstSearch(
        (n) => parents.get(n) ?? [],
        ...flatMap(layers, (l) => l)
      );
    }

    // since we know we'll hit every node in iteration, we can clear the layers
    for (const layer of layers) {
      layer.splice(0);
    }

    // re-add in the order seen
    for (const node of iter) {
      layers[node.data.layer].push(node);
    }
  }

  function topDown(val: boolean): DfsOperator;
  function topDown(): boolean;
  function topDown(val?: boolean): boolean | DfsOperator {
    if (val === undefined) {
      return options.topDown;
    } else {
      return buildOperator({ topDown: val });
    }
  }
  dfsCall.topDown = topDown;

  return dfsCall;
}

/**
 * Create a default {@link DfsOperator}, bundled as
 * {@link decrossDfs}.
 */
export function dfs(...args: never[]): DfsOperator {
  if (args.length) {
    throw new Error(
      `got arguments to dfs(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({ topDown: true });
}
