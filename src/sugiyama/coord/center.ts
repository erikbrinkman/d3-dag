/**
 * The center coordinate assignment operator centers all of the nodes as
 * compatly as possible. It produces generally ppor layouts, but is very fast.
 *
 * <img alt="center example" src="media://center_coordinate.png" width="400">
 *
 * @module
 */

import { CoordOperator, SugiNodeSizeAccessor } from ".";

import { SugiNode } from "../utils";
import { def } from "../../utils";

export type CenterOperator = CoordOperator;

/** Create a new center assignment operator. */
export function center(...args: never[]): CenterOperator {
  if (args.length) {
    throw new Error(
      `got arguments to center(${args}), but constructor takes no aruguments.`
    );
  }

  function centerCall<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: SugiNodeSizeAccessor<N, L>
  ): number {
    const widths = layers.map((layer) => {
      let width = 0;
      for (const node of layer) {
        const nodeWidth = nodeSize(node)[0];
        node.x = width + nodeWidth / 2;
        width += nodeWidth;
      }
      return width;
    });
    const maxWidth = Math.max(...widths);
    if (maxWidth <= 0) {
      throw new Error("must assign nonzero width to at least one node");
    }
    for (const [i, layer] of layers.entries()) {
      const width = widths[i];
      const offset = (maxWidth - width) / 2;
      for (const node of layer) {
        node.x = def(node.x) + offset;
      }
    }

    return maxWidth;
  }

  return centerCall;
}
