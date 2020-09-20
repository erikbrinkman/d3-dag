/**
 * The center coordinate assignment operator centers all of the nodes as
 * compatly as possible. It produces generally ppor layouts, but is very fast.
 *
 * <img alt="center example" src="media://center_coordinate.png" width="400">
 *
 * @packageDocumentation
 */

import { HorizableNode, Operator, Separation } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { def } from "../../utils";

export type CenterOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a new center assignment operator. */
export function center<NodeType extends DagNode>(
  ...args: never[]
): CenterOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to center(${args}), but constructor takes no aruguments.`
    );
  }

  function centerCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    separation: Separation<NodeType>
  ): void {
    const maxWidth = Math.max(
      ...layers.map((layer) => {
        let [prev, ...rest] = layer;
        let prevx = (prev.x = 0);
        for (const node of rest) {
          prevx = node.x = prevx + separation(prev, node);
          prev = node;
        }
        return prevx;
      })
    );
    if (maxWidth > 0) {
      for (const layer of layers) {
        const halfWidth = def(layer[layer.length - 1].x) / 2;
        for (const node of layer) {
          node.x = (def(node.x) - halfWidth) / maxWidth + 0.5;
        }
      }
    } else {
      for (const layer of layers) {
        for (const node of layer) {
          node.x = 0.5;
        }
      }
    }
  }

  return centerCall;
}
