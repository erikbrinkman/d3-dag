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
 * a depth first search operator
 *
 * This is a fast heuristic that runs a depth first search, incrementally
 * adding nodes to their appropriate layer. It creates a reasonable ordering to
 * potentially be further optimized by other operators.
 */
export interface DecrossDfs extends Decross<unknown, unknown> {
  /**
   * sets whether the dfs should be top down or bottom up
   *
   * This has a small tweak in effect and can be useful for multiple initial
   * configurations.
   *
   * (default: `true`)
   */
  topDown(val: boolean): DecrossDfs;
  /**
   * get whether the current operator is topDown
   */
  topDown(): boolean;

  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/** @internal */
function buildOperator(options: { topDown: boolean }): DecrossDfs {
  function decrossDfs(layers: SugiNode[][]): void {
    // FIXME we should look into some other heuristic like ordering by degree
    // (in the appropriate direction?)

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
 * create a default {@link DecrossDfs}
 *
 * This is a fast heuristic decrossings operator that runs a depth first
 * search, incrementally adding nodes to their appropriate layer. It creates a
 * reasonable ordering to potentially be further optimized by other operators.
 *
 * @example
 * ```ts
 * const layout = sugiyama().decross(decrossDfs());
 * ```
 */
export function decrossDfs(...args: never[]): DecrossDfs {
  if (args.length) {
    throw err`got arguments to decrossDfs(${args}); you probably forgot to construct decrossDfs before passing to decross: \`sugiyama().decross(decrossDfs())\`, note the trailing "()"`;
  }
  return buildOperator({ topDown: true });
}
