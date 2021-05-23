/**
 * The median order operator orders the bottom layer according to the median of
 * their parent's indices. In many cases this is optimal, and is very fast.
 *
 * <img alt="median example" src="media://two_layer_greedy.png" width="400">
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { TwolayerOperator } from ".";
import { median as arrayMedian } from "d3-array";
import { def } from "../../utils";
import { order } from "./utils";

export type MedianOperator = TwolayerOperator;

/** Create a median two layer ordering operator. */
export function median(...args: never[]): MedianOperator {
  if (args.length) {
    throw new Error(
      `got arguments to median(${args}), but constructor takes no aruguments.`
    );
  }
  function medianCall(
    topLayer: DagNode[],
    bottomLayer: DagNode[],
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
