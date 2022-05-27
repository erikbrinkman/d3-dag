/**
 * The {@link CoordGreedy} assigns nodes close to the mean of their parents,
 * then spreads them out.
 *
 * @packageDocumentation
 */
// TODO add assignment like mean that skips dummy nodes as that seems like
// better behavior
import { Coord } from ".";
import { slice } from "../../iters";
import { err } from "../../utils";
import { SugiNode, SugiSeparation } from "../sugify";

/**
 * A {@link sugiyama/coord!Coord} that tries to place nodes close to their parents
 *
 * Nodes that can't be placed at the mean of their parents' location, will be
 * spaced out with their priority equal to their degree.
 *
 * This is generally slower than {@link sugiyama/coord/center!CoordCenter} but still reasonably
 * fast.
 *
 * Create with {@link coordGreedy}.
 *
 * <img alt="greedy example" src="media://sugi-simplex-opt-greedy.png" width="400">
 */
export interface CoordGreedy extends Coord<unknown, unknown> {
  /** flag indicating that this is built in to d3dag and shouldn't error in specific instances */
  readonly d3dagBuiltin: true;
}

/**
 * Create a new {@link CoordGreedy}
 */
export function coordGreedy(...args: never[]): CoordGreedy {
  if (args.length) {
    throw err`got arguments to coordGreedy(${args}); you probably forgot to construct coordGreedy before passing to coord: \`sugiyama().coord(coordGreedy())\`, note the trailing "()"`;
  }

  function coordGreedy<N, L>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number {
    // TODO other initial assignments
    const assignment = meanAssignment;

    // assign degrees
    const degrees = new Map<SugiNode<N, L>, number>();
    for (const layer of layers) {
      for (const node of layer) {
        // the -3 at the end ensures that dummy nodes have the lowest priority,
        // as dummy nodes always have degree 2, degree -1 ensures they are
        // below any other valid node
        degrees.set(node, node.nchildren() + ("node" in node.data ? 0 : -3));
      }
    }
    for (const layer of layers) {
      for (const node of layer) {
        for (const child of node.children()) {
          degrees.set(child, degrees.get(child)! + 1);
        }
      }
    }

    // set first layer
    let [lastLayer, ...restLayers] = layers;
    let start = 0;
    let finish = 0;
    let last;
    for (const node of lastLayer) {
      finish += sep(last, node);
      node.x = finish;
      last = node;
    }
    finish += sep(last, undefined);

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
        let last;

        // first push nodes over to left
        // TODO we do left than right, but really we should do both and average
        let end = node.x;
        last = node;
        for (const next of slice(layer, j + 1)) {
          end = next.x = Math.max(next.x, end + sep(last, next));
          last = next;
        }
        finish = Math.max(finish, end + sep(last, undefined));

        // then push from the right
        let begin = node.x;
        last = node;
        for (const next of slice(layer, j - 1, -1, -1)) {
          begin = next.x = Math.min(next.x, begin - sep(next, last));
          last = next;
        }
        start = Math.min(start, begin - sep(undefined, last));
      }

      lastLayer = layer;
    }

    // separate for zero based
    for (const layer of layers) {
      for (const node of layer) {
        node.x -= start;
      }
    }
    const width = finish - start;
    if (width <= 0) {
      throw err`must assign nonzero width to at least one node; double check the callback passed to \`sugiyama().nodeSize(...)\``;
    }
    return width;
  }

  coordGreedy.d3dagBuiltin = true as const;

  return coordGreedy;
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
    for (const child of node.children()) {
      const newCount = (counts.get(child) ?? 0) + 1;
      counts.set(child, newCount);
      child.x += (node.x - child.x) / newCount;
    }
  }
}
