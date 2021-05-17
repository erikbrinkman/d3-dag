/**
 * This accessor only works with a topological layering, and minimizes the
 * curve of edges such that all nodes are positioned vertically.
 *
 * <img alt="topological example" src="media://topological.png" width="400">
 *
 * @module
 */
import { CoordOperator, HorizableNode, NodeSizeAccessor } from ".";
import { init, layout, minBend, solve } from "./utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { def } from "../../utils";

export type TopologicalOperator = CoordOperator<DagNode>;

/** Create a topological coordinate assignment operator. */
export function topological(...args: never[]): TopologicalOperator {
  if (args.length) {
    throw new Error(
      `got arguments to topological(${args}), but constructor takes no aruguments.`
    );
  }

  function topologicalCall<N extends DagNode>(
    layers: ((N & HorizableNode) | DummyNode)[][],
    nodeSize: NodeSizeAccessor<N>
  ): number {
    for (const layer of layers) {
      const numNodes = layer.reduce(
        (count, node) => count + +!(node instanceof DummyNode),
        0
      );
      if (numNodes !== 1) {
        throw new Error("topological() only works with a topological layering");
      }
    }

    const inds = new Map<N | DummyNode, number>();
    let i = 0;
    for (const layer of layers) {
      for (const node of layer) {
        if (node instanceof DummyNode) {
          inds.set(node, i++);
        }
      }
    }
    // we assign all real nodes the last index, knowing that the optimization
    // always assigns them the same coord: 0.
    for (const layer of layers) {
      for (const node of layer) {
        if (!(node instanceof DummyNode)) {
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
          if (node instanceof DummyNode) {
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
