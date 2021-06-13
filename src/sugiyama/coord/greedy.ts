/**
 * This accessor assigns coordinates as the mean of their parents and then
 * spaces them out to respect their separation. Nodes with higher degree that
 * aren't dummy nodes are given higher priority for shifting order, i.e. are
 * less likely to be moved from the mean of their parents. This solution
 * results in a layout that is more pleaseing than center, but much faster to
 * compute than vert or minCurve.
 *
 * <img alt="greedy example" src="media://greedy_coordinate.png" width="400">
 *
 * @module
 */

// TODO add assignment like mean that skips dummy nodes as that seems like
// better behavior

import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { assert, def } from "../../utils";

import { SugiNode } from "../utils";

export type GreedyOperator = CoordOperator<unknown, unknown>;

/** Create a greedy coordinate assignment operator. */
export function greedy(...args: never[]): GreedyOperator {
  if (args.length) {
    throw new Error(
      `got arguments to greedy(${args}), but constructor takes no aruguments.`
    );
  }

  function greedyCall<N, L>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number {
    // TODO other initial assignments
    const assignment = meanAssignment;

    // assign degrees
    const degrees = new Map<SugiNode, number>();
    for (const layer of layers) {
      for (const node of layer) {
        // the -3 at the end ensures that dummy nodes have the lowest priority,
        // as dummy nodes always have degree 2, degree -1 ensures they are
        // below any other valid node
        degrees.set(
          node,
          node.ichildren().length + ("node" in node.data ? 0 : -3)
        );
      }
    }
    for (const layer of layers) {
      for (const node of layer) {
        for (const child of node.ichildren()) {
          degrees.set(child, def(degrees.get(child)) + 1);
        }
      }
    }

    // set first layer
    let [lastLayer, ...restLayers] = layers;
    let start = 0;
    let finish = 0;
    for (const node of lastLayer) {
      const size = nodeSize(node);
      node.x = finish + size / 2;
      finish += size;
    }

    // assign the rest of nodes
    for (const layer of restLayers) {
      // initial greedy assignment
      assignment(lastLayer, layer);

      // order nodes nodes by degree and start with highest degree
      const ordered = layer
        .map((node, j) => [j, node] as const)
        .sort(([aj, anode], [bj, bnode]) => {
          const adeg = def(degrees.get(anode));
          const bdeg = def(degrees.get(bnode));
          return adeg === bdeg ? aj - bj : bdeg - adeg;
        });
      // Iterate over nodes in degree order
      for (const [j, node] of ordered) {
        // first push nodes over to left
        // TODO we do left than right, but really we should do both and average
        const nwidth = nodeSize(node);

        let end = def(node.x) + nwidth / 2;
        for (const next of layer.slice(j + 1)) {
          const hsize = nodeSize(next) / 2;
          const nx = (next.x = Math.max(def(next.x), end + hsize));
          end = nx + hsize;
        }
        finish = Math.max(finish, end);

        // then push from the right
        let begin = def(node.x) - nwidth / 2;
        for (const next of layer.slice(0, j).reverse()) {
          const hsize = nodeSize(next) / 2;
          const nx = (next.x = Math.min(def(next.x), begin - hsize));
          begin = nx - hsize;
        }
        start = Math.min(start, begin);
      }

      lastLayer = layer;
    }

    // separate for zero based
    for (const layer of layers) {
      for (const node of layer) {
        node.x = def(node.x) - start;
      }
    }
    const width = finish - start;
    if (width <= 0) {
      throw new Error("must assign nonzero width to at least one node");
    }
    return width;
  }

  return greedyCall;
}

// TODO this is very similar to the twolayerMean method, there might be a
// clever way to combine then, but it's not immediately obvious since twolayer
// uses the index of toplayer, and this uses the x value
/** @internal */
function meanAssignment(topLayer: SugiNode[], bottomLayer: SugiNode[]): void {
  for (const node of bottomLayer) {
    node.x = 0.0;
  }
  const counts = new Map<SugiNode, number>();
  for (const node of topLayer) {
    assert(node.x !== undefined);
    for (const child of node.ichildren()) {
      assert(child.x !== undefined);
      const newCount = (counts.get(child) || 0) + 1;
      counts.set(child, newCount);
      child.x += (node.x - child.x) / newCount;
    }
  }
}
