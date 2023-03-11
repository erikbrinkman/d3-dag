/**
 * A {@link DecrossDfs} heuristic for quickly producing reasonable crossings.
 * This is intended for use as an initialization step.
 *
 * @packageDocumentation
 */
import { Decross } from ".";
import { flatMap, slice } from "../../iters";
import { dfs as depthFirstSearch, err } from "../../utils";
import { SugiNode } from "../sugify";

/**
 * Depth first search operator
 *
 * This is a fast heuristic that runs a depth first search, incrementally
 * adding nodes to their appropriate layer.
 */
export interface DecrossDfs extends Decross<unknown, unknown> {
  /**
   * Sets whether the dfs should be top down or bottom up. (default: true)
   */
  topDown(val: boolean): DecrossDfs;
  /**
   * Get the current number of passes
   */
  topDown(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** @internal */
function buildOperator(options: { topDown: boolean }): DecrossDfs {
  function decrossDfs(layers: SugiNode[][]): void {
    // get iteration over nodes in dfs order
    let iter: Iterable<SugiNode>;
    if (options.topDown) {
      iter = depthFirstSearch(
        (n) => n.children(),
        ...flatMap(slice(layers, layers.length - 1, -1, -1), (l) => l)
      );
    } else {
      iter = depthFirstSearch((n) => n.parents(), ...flatMap(layers, (l) => l));
    }

    // since we know we'll hit every node in iteration, we can clear the layers
    for (const layer of layers) {
      layer.splice(0);
    }

    // re-add in the order seen
    for (const node of iter) {
      const { data } = node;
      if (data.role === "node") {
        for (let layer = data.topLayer; layer <= data.bottomLayer; ++layer) {
          layers[layer].push(node);
        }
      } else {
        layers[data.layer].push(node);
      }
    }
  }

  function topDown(val: boolean): DecrossDfs;
  function topDown(): boolean;
  function topDown(val?: boolean): boolean | DecrossDfs {
    if (val === undefined) {
      return options.topDown;
    } else {
      return buildOperator({ topDown: val });
    }
  }
  decrossDfs.topDown = topDown;

  decrossDfs.d3dagBuiltin = true as const;

  return decrossDfs;
}

/**
 * Create a default {@link DecrossDfs}
 *
 * - {@link DecrossDfs#topDown | `topDown()`}: `true`
 */
export function decrossDfs(...args: never[]): DecrossDfs {
  if (args.length) {
    throw err`got arguments to decrossDfs(${args}); you probably forgot to construct decrossDfs before passing to decross: \`sugiyama().decross(decrossDfs())\`, note the trailing "()"`;
  }
  return buildOperator({ topDown: true });
}
