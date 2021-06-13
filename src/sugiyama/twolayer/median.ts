/**
 * A {@link MedianOperator} that positions the layer in question as the median
 * of the indices of its parents or children respectively.
 *
 * @module
 */
import { SugiNode } from "../utils";
import { TwolayerOperator } from ".";
import { median as arrayMedian } from "d3-array";
import { def } from "../../utils";
import { order } from "./utils";

/**
 * A {@link TwolayerOperator} that positions nodes according to the median of
 * their parent's indices.
 *
 * In many cases this is optimal, and is very fast. It takes as long as
 * {@link MeanOperator}, with a little more memory. Nodes without parents or
 * children respectively will be placed first to minimize the distance between
 * nodes with common parents, and then to minimize rank inversions with respect
 * to the initial ordering.
 *
 * Create with {@link median}.
 *
 * <img alt="median example" src="media://two_layer_greedy.png" width="400">
 */
export type MedianOperator = TwolayerOperator<unknown, unknown>;

/**
 * Create a default {@link MedianOperator}, bundled as {@link twolayerMedian}.
 */
export function median(...args: never[]): MedianOperator {
  if (args.length) {
    throw new Error(
      `got arguments to median(${args}), but constructor takes no aruguments.`
    );
  }
  function medianCall(
    topLayer: SugiNode[],
    bottomLayer: SugiNode[],
    topDown: boolean
  ): void {
    if (topDown) {
      const positions = new Map(
        bottomLayer.map((node) => [node, [] as number[]] as const)
      );
      for (const [i, node] of topLayer.entries()) {
        for (const child of node.ichildren()) {
          def(positions.get(child)).push(i);
        }
      }
      const medians = new Map(
        [...positions.entries()].map(
          ([node, poses]) => [node, arrayMedian(poses)] as const
        )
      );
      order(bottomLayer, medians);
    } else {
      const inds = new Map(bottomLayer.map((node, i) => [node, i] as const));
      const medians = new Map(
        topLayer.map((node) => {
          const median = arrayMedian([
            ...node.ichildren().map((child) => def(inds.get(child)))
          ]);
          return [node, median] as const;
        })
      );
      order(topLayer, medians);
    }
  }

  return medianCall;
}
