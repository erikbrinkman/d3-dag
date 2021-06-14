/**
 * A {@link TopologicalOperator} for assigning coordinates to a topological
 * layering.
 *
 * @module
 */
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { init, layout, minBend, solve } from "./utils";

import { SugiNode } from "../utils";
import { def } from "../../utils";

/**
 * A {@link CoordOperator} for positioning edges of a topological layout.
 *
 * This operators also minimized a quadratic objective function (similar to
 * {@link QuadOperator}), but is tailored to topological layouts.
 *
 * Create with {@link topological}.
 *
 * <img alt="topological example" src="media://sugi-topological-opt-topological.png" width="1000">
 */
export type TopologicalOperator = CoordOperator<unknown, unknown>;

/**
 * Create a new {@link TopologicalOperator}, bundled as {@link coordTopological}.
 */
export function topological(...args: never[]): TopologicalOperator {
  if (args.length) {
    throw new Error(
      `got arguments to topological(${args}), but constructor takes no aruguments.`
    );
  }

  function topologicalCall<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    for (const layer of layers) {
      const numNodes = layer.reduce(
        (count, node) => count + +("node" in node.data),
        0
      );
      if (numNodes !== 1) {
        throw new Error("topological() only works with a topological layering");
      }
    }

    const inds = new Map<SugiNode, number>();
    let i = 0;
    for (const layer of layers) {
      for (const node of layer) {
        if ("target" in node.data) {
          inds.set(node, i++);
        }
      }
    }
    // we assign all real nodes the last index, knowing that the optimization
    // always assigns them the same coord: 0.
    for (const layer of layers) {
      for (const node of layer) {
        if ("node" in node.data) {
          inds.set(node, i);
        }
      }
    }
    const [Q, c, A, b] = init(layers, inds, nodeSize);

    for (const layer of layers) {
      for (const par of layer) {
        const pind = def(inds.get(par));
        for (const node of par.ichildren()) {
          const nind = def(inds.get(node));
          if ("target" in node.data) {
            for (const child of node.ichildren()) {
              const cind = def(inds.get(child));
              minBend(Q, pind, nind, cind, 1);
            }
          }
        }
      }
    }

    const solution = solve(Q, c, A, b);
    const width = layout(layers, nodeSize, inds, solution);
    if (width <= 0) {
      throw new Error("must assign nonzero width to at least one node");
    }
    return width;
  }

  return topologicalCall;
}
