/**
 * The {@link GreedyOperator} assigns nodes close to the mean of their parents,
 * then spreads them out.
 *
 * @module
 */
// TODO add assignment like mean that skips dummy nodes as that seems like
// better behavior
import { CoordNodeSizeAccessor, CoordOperator } from ".";
import { length } from "../../iters";
import { SugiNode } from "../utils";

/**
 * A {@link CoordOperator} that tries to place nodes close to their parents
 *
 * Nodes that can't be placed at the mean of their parents' location, will be
 * spaced out with their priority equal to their degree.
 *
 * This is generally slower than {@link CenterOperator} but still reasonably
 * fast.
 *
 * Create with {@link greedy}.
 *
 * <img alt="greedy example" src="media://sugi-simplex-opt-greedy.png" width="400">
 */
export type GreedyOperator = CoordOperator<unknown, unknown>;

/**
 * Create a new {@link GreedyOperator}, bundled as {@link coordGreedy}.
 */
export function greedy(...args: never[]): GreedyOperator {
  if (args.length) {
    throw new Error(
      `got arguments to greedy(${args}), but constructor takes no arguments.`
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
          length(node.ichildren()) + ("node" in node.data ? 0 : -3)
        );
      }
    }
    for (const layer of layers) {
      for (const node of layer) {
        for (const child of node.ichildren()) {
          degrees.set(child, degrees.get(child)! + 1);
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
          const adeg = degrees.get(anode)!;
          const bdeg = degrees.get(bnode)!;
          return adeg === bdeg ? aj - bj : bdeg - adeg;
        });
      // Iterate over nodes in degree order
      for (const [j, node] of ordered) {
        // first push nodes over to left
        // TODO we do left than right, but really we should do both and average
        const nwidth = nodeSize(node);

        let end = node.x! + nwidth / 2;
        for (const next of layer.slice(j + 1)) {
          const hsize = nodeSize(next) / 2;
          const nx = (next.x = Math.max(next.x!, end + hsize));
          end = nx + hsize;
        }
        finish = Math.max(finish, end);

        // then push from the right
        let begin = node.x! - nwidth / 2;
        for (const next of layer.slice(0, j).reverse()) {
          const hsize = nodeSize(next) / 2;
          const nx = (next.x = Math.min(next.x!, begin - hsize));
          begin = nx - hsize;
        }
        start = Math.min(start, begin);
      }

      lastLayer = layer;
    }

    // separate for zero based
    for (const layer of layers) {
      for (const node of layer) {
        node.x! -= start;
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
// uses the index of top layer, and this uses the x value
/** @internal */
function meanAssignment(topLayer: SugiNode[], bottomLayer: SugiNode[]): void {
  for (const node of bottomLayer) {
    node.x = 0.0;
  }
  const counts = new Map<SugiNode, number>();
  for (const node of topLayer) {
    for (const child of node.ichildren()) {
      const newCount = (counts.get(child) || 0) + 1;
      counts.set(child, newCount);
      child.x! += (node.x! - child.x!) / newCount;
    }
  }
}
