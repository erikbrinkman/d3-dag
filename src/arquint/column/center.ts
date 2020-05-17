/**
 * For each layer, this accessor assigns each node to a column while centering
 * them (per-layer). Due to the layer local decision process, nodes can overlap
 * if nodes in different layers have different heights. Therefore, the
 * following example sets *node*.heightRatio to 1 for all nodes
 *
 * <img alt="arquint simple center example" src="media://arquint_simple_center.png" width="400">
 *
 * @packageDocumentation
 */
import { IndexableNode, Operator } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export type CenterOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a center column operator. */
export function center<NodeType extends DagNode>(
  ...args: never[]
): CenterOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to center(${args}), but constructor takes no aruguments.`
    );
  }

  function centerCall(
    layers: ((NodeType & IndexableNode) | DummyNode)[][]
  ): void {
    const maxNodesPerLayer = Math.max(...layers.map((layer) => layer.length));
    for (const layer of layers) {
      const startColumnIndex = Math.floor(
        (maxNodesPerLayer - layer.length) / 2
      );
      for (const [index, node] of layer.entries()) {
        node.columnIndex = startColumnIndex + index;
      }
    }
  }

  return centerCall;
}
