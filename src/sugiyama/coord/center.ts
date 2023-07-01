/**
 * The {@link CoordCenter} centers all of the nodes as compactly as
 * possible. It produces generally poor layouts, but is very fast.
 *
 * @packageDocumentation
 */
import { Coord } from ".";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";

/**
 * A {@link Coord} that spaces every node out by node size, and then centers
 * them.
 *
 * This is a very fast operator, but doesn't produce very pleasing layouts.
 *
 * Create with {@link coordCenter}.
 */
export interface CoordCenter extends Coord<unknown, unknown> {
  /** @internal flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * Create a {@link CoordCenter}
 */
export function coordCenter(...args: never[]): CoordCenter {
  if (args.length) {
    throw err`got arguments to coordCenter(${args}); you probably forgot to construct coordCenter before passing to coord: \`sugiyama().coord(coordCenter())\`, note the trailing "()"`;
  }

  function coordCenter<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    const widths = layers.map((layer) => {
      let width = 0;
      let last;
      for (const node of layer) {
        width += sep(last, node);
        node.x = width;
        last = node;
      }
      width += sep(last, undefined);
      return width;
    });
    const maxWidth = Math.max(...widths);
    if (maxWidth <= 0) {
      throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
    }
    for (const [i, layer] of layers.entries()) {
      const width = widths[i];
      const offset = (maxWidth - width) / 2;
      for (const node of layer) {
        node.x += offset;
      }
    }

    return maxWidth;
  }

  coordCenter.d3dagBuiltin = true as const;

  return coordCenter;
}
