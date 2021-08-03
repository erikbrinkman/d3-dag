/**
 * The {@link CenterOperator} centers all of the nodes as compactly as
 * possible. It produces generally poor layouts, but is very fast.
 *
 * @module
 */
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { def } from "../../utils";
import { SugiNode } from "../utils";

/**
 * A {@link CoordOperator} that spaces every node out by node size, and then
 * centers them.
 *
 * This is a very fast operator, but doesn't produce very pleasing layouts.
 *
 * Create with {@link center}.
 *
 * <img alt="center example" src="media://sugi-simplex-opt-center.png" width="400">
 */
export type CenterOperator = CoordOperator<unknown, unknown>;

/**
 * Create a {@link CenterOperator}. Bundled as {@link coordCenter}.
 */
export function center(...args: never[]): CenterOperator {
  if (args.length) {
    throw new Error(
      `got arguments to center(${args}), but constructor takes no aruguments.`
    );
  }

  function centerCall<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    const widths = layers.map((layer) => {
      let width = 0;
      for (const node of layer) {
        const nodeWidth = nodeSize(node);
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
