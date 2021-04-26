/**
 * The mean order operator orders the bottom layer according to the mean of
 * their parent's indices.
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { Operator } from ".";
import { SafeMap } from "../../utils";

export type MeanOperator<NodeType extends DagNode> = Operator<NodeType>;

/** @internal */
class Mean {
  mean: number = 0.0;
  count: number = 0;

  add(val: number): void {
    this.mean += (val - this.mean) / ++this.count;
  }
}

/** Create a mean two layer ordering operator. */
export function mean<NodeType extends DagNode>(
  ...args: never[]
): MeanOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to mean(${args}), but constructor takes no aruguments.`
    );
  }
  function meanCall(
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[]
  ): void {
    const means = new SafeMap<NodeType | DummyNode, Mean>(
      bottomLayer.map((node) => [node, new Mean()])
    );
    for (const [i, node] of topLayer.entries()) {
      for (const child of node.ichildren()) {
        means.getThrow(child).add(i);
      }
    }
    bottomLayer.sort((a, b) => means.getThrow(a).mean - means.getThrow(b).mean);
  }

  return meanCall;
}
