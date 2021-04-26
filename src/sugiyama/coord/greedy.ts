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

import { HorizableNode, NodeSizeAccessor, Operator } from ".";
import { SafeMap, def, js } from "../../utils";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export type GreedyOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a greedy coordinate assignment operator. */
export function greedy<NodeType extends DagNode>(
  ...args: never[]
): GreedyOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to greedy(${args}), but constructor takes no aruguments.`
    );
  }

  function greedyCall(
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    nodeSize: NodeSizeAccessor<NodeType>
  ): number {
    // TODO other initial assignments
    const assignment = meanAssignment;

    // assign degrees
    const degrees = new SafeMap<NodeType | DummyNode, number>();
    for (const layer of layers) {
      for (const node of layer) {
        // the -3 at the end ensures that dummy nodes have the lowest priority,
        // as dummy nodes always have degree 2, degree -1 ensures they are
        // below any other valid node
        degrees.set(
          node,
          node.ichildren().length + (node instanceof DummyNode ? -3 : 0)
        );
      }
    }
    for (const layer of layers) {
      for (const node of layer) {
        for (const child of node.ichildren()) {
          degrees.set(child, degrees.getThrow(child) + 1);
        }
      }
    }

    // set first layer
    let [lastLayer, ...restLayers] = layers;
    let start = 0;
    let finish = 0;
    for (const node of lastLayer) {
      const size = nodeSize(node)[0];
      node.x = finish + size / 2;
      finish += size;
    }

    // assign the rest of nodes
    for (const layer of restLayers) {
      // initial greedy assignment
      assignment(lastLayer, layer);

      // order nodes nodes by degree and start with highest degree
      const ordered = layer
        .map(
          (node, j) =>
            [j, node] as [number, (NodeType & HorizableNode) | DummyNode]
        )
        .sort(([aj, anode], [bj, bnode]) => {
          const adeg = degrees.getThrow(anode);
          const bdeg = degrees.getThrow(bnode);
          return adeg === bdeg ? aj - bj : bdeg - adeg;
        });
      // Iterate over nodes in degree order
      for (const [j, node] of ordered) {
        // first push nodes over to left
        // TODO we do left than right, but really we should do both and average
        const nwidth = nodeSize(node)[0];

        let end = def(node.x) + nwidth / 2;
        for (const next of layer.slice(j + 1)) {
          const hsize = nodeSize(next)[0] / 2;
          const nx = (next.x = Math.max(def(next.x), end + hsize));
          end = nx + hsize;
        }
        finish = Math.max(finish, end);

        // then push from the right
        let begin = def(node.x) - nwidth / 2;
        for (const next of layer.slice(0, j).reverse()) {
          const hsize = nodeSize(next)[0] / 2;
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
function meanAssignment<NodeType extends (DagNode & HorizableNode) | DummyNode>(
  topLayer: NodeType[],
  bottomLayer: NodeType[]
): void {
  for (const node of bottomLayer) {
    node.x = 0.0;
  }
  const counts = new SafeMap<DagNode | DummyNode, number>();
  for (const node of topLayer) {
    for (const child of node.ichildren()) {
      /* istanbul ignore if */
      if (child.x === undefined) {
        throw new Error(
          js`internal error: unexpected undefined x for '${child}'`
        );
      }
      const newCount = counts.getDefault(child, 0) + 1;
      counts.set(child, newCount);
      child.x += (def(node.x) - child.x) / newCount;
    }
  }
}
