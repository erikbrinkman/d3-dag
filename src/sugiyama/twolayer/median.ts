/**
 * The median order operator orders the bottom layer according to the median of
 * their parent's indices. In many cases this is optimal, and is very fast.
 *
 * <img alt="median example" src="media://two_layer_greedy.png" width="400">
 *
 * @packageDocumentation
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { Operator } from ".";
import { SafeMap } from "../../utils";
import { median as arrayMedian } from "d3-array";

export type MedianOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a median two layer ordering operator. */
export function median<NodeType extends DagNode>(
  ...args: never[]
): MedianOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to median(${args}), but constructor takes no aruguments.`
    );
  }
  function medianCall(
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[]
  ): void {
    const positions = new SafeMap<string, number[]>();
    for (const [i, node] of topLayer.entries()) {
      for (const child of node.ichildren()) {
        positions.setIfAbsent(child.id, []).push(i);
      }
    }
    const medians = new SafeMap<string, number>();
    let otherwise = -1;
    for (const node of bottomLayer) {
      const med = arrayMedian(positions.getDefault(node.id, []));
      if (med === undefined) {
        medians.set(node.id, otherwise);
        otherwise =
          +!((otherwise + 1) / (topLayer.length + 1)) * (topLayer.length + 1) -
          1;
      } else {
        medians.set(node.id, med);
      }
    }
    bottomLayer.sort((a, b) => medians.getThrow(a.id) - medians.getThrow(b.id));
  }

  return medianCall;
}
