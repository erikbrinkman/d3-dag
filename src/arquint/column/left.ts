/**
 * For each layer, this accessor assigns each node to a column starting from
 * the left side. Due to the layer local decision process, nodes can overlap if
 * nodes in different layers have different heights. Therefore, the following
 * example sets *node*.heightRatio to 1 for all nodes.
 *
 * <img alt="arquint simple left example" src="media://arquint_simple_left.png" width="400">
 *
 * @packageDocumentation
 */
import { IndexableNode, Operator } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export type LeftOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Construct a left operator. */
export function left<NodeType extends DagNode>(
  ...args: never[]
): LeftOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to left(${args}), but constructor takes no aruguments.`
    );
  }

  function leftCall(
    layers: ((NodeType & IndexableNode) | DummyNode)[][]
  ): void {
    for (const layer of layers) {
      for (const [index, node] of layer.entries()) {
        node.columnIndex = index;
      }
    }
  }

  return leftCall;
}
