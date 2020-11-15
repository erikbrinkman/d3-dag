/**
 * This accessor only works with a topological layering, and minimizes the
 * curve of edges such that all nodes are positioned vertically.
 *
 * <img alt="topological example" src="media://topological.png" width="400">
 *
 * @packageDocumentation
 */
import { HorizableNode, NodeSizeAccessor, Operator } from ".";
import { init, layout, minBend, solve } from "./utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { SafeMap } from "../../utils";

export type TopologicalOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a topological coordinate assignment operator. */
export function topological<NodeType extends DagNode>(
  ...args: never[]
): TopologicalOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to topological(${args}), but constructor takes no aruguments.`
    );
  }

  function topologicalCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    nodeSize: NodeSizeAccessor<NodeType>
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

    const inds = new SafeMap<string, number>();
    let i = 0;
    for (const layer of layers) {
      for (const node of layer) {
        if (node instanceof DummyNode) {
          inds.set(node.id, i++);
        }
      }
    }
    // we assign all real nodes the last index, knowing that the optimization
    // always assigns them the same coord: 0.
    for (const layer of layers) {
      for (const node of layer) {
        if (!(node instanceof DummyNode)) {
          inds.set(node.id, i);
        }
      }
    }
    const [Q, c, A, b] = init(layers, inds, nodeSize);

    for (const layer of layers) {
      for (const par of layer) {
        const pind = inds.getThrow(par.id);
        for (const node of par.ichildren()) {
          const nind = inds.getThrow(node.id);
          if (node instanceof DummyNode) {
            for (const child of node.ichildren()) {
              const cind = inds.getThrow(child.id);
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
