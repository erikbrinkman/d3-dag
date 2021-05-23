/**
 * This layout algorithm constructs a topological representation of the DAG
 * meant for visualization. The algorithm is based off a PR by D. Zherebko. The
 * nodes are topologically ordered, and edges are then positioned into "lanes"
 * to the left and right of the nodes.
 *
 * <img alt="zherebko example" src="media://zherebko.png" width="1000">
 *
 * @module
 */
import { Dag } from "../dag/node";
import { assert } from "../utils";
import { greedy } from "./greedy";

export interface ZherebkoOperator {
  /** Layout the input DAG. */
  (dag: Dag): void;

  /**
   * Sets this zherebko layout's size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns this {@link ZherebkoOperator}..
   */
  size(sz: readonly [number, number]): ZherebkoOperator;
  /** Get the current size, which defaults to [1, 1]. */
  size(): [number, number];
}

/** @internal */
function buildOperator(width: number, height: number): ZherebkoOperator {
  function zherebkoCall(dag: Dag): void {
    // topological sort
    const ordered = [...dag.idescendants("before")];

    const maxLayer = ordered.length - 1;
    if (maxLayer === 0) {
      // center if only one node
      const [node] = ordered;
      node.x = width / 2;
      node.y = height / 2;
      return;
    }
    // get link indices
    const indices = greedy(ordered);

    // map to coordinates
    // include at least one "gap" in each side even if graph is as line
    let minIndex = -1;
    let maxIndex = 1;
    for (const { source, target } of dag.ilinks()) {
      const index = indices.get(source)?.get(target);
      if (index === undefined) continue; // assumed short link
      minIndex = Math.min(minIndex, index);
      maxIndex = Math.max(maxIndex, index);
    }

    // assign node positions
    const layerSize = height / maxLayer;
    for (const [layer, node] of ordered.entries()) {
      node.x = (-minIndex * width) / (maxIndex - minIndex);
      node.y = layer * layerSize;
    }

    // assign link points
    for (const { source, target, points } of dag.ilinks()) {
      points.length = 0;
      assert(source.x !== undefined && source.y !== undefined);
      assert(target.x !== undefined && target.y !== undefined);
      points.push({ x: source.x, y: source.y });
      const index = indices.get(source)?.get(target);

      if (index !== undefined) {
        // assumed long link
        const x = ((index - minIndex) / (maxIndex - minIndex)) * width;
        const y1 = source.y + layerSize;
        const y2 = target.y - layerSize;
        if (y2 - y1 > layerSize / 2) {
          points.push({ x: x, y: y1 }, { x: x, y: y2 });
        } else {
          points.push({ x: x, y: y1 });
        }
      }

      points.push({ x: target.x, y: target.y });
    }
  }

  function size(): [number, number];
  function size(sz: readonly [number, number]): ZherebkoOperator;
  function size(
    sz?: readonly [number, number]
  ): [number, number] | ZherebkoOperator {
    if (sz === undefined) {
      return [width, height];
    } else {
      const [newWidth, newHeight] = sz;
      return buildOperator(newWidth, newHeight);
    }
  }
  zherebkoCall.size = size;

  // TODO add nodeSized

  return zherebkoCall;
}

/** Create a new {@link ZherebkoOperator} with default settings. */
export function zherebko(...args: never[]): ZherebkoOperator {
  if (args.length) {
    throw new Error(
      `got arguments to zherebko(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(1, 1);
}
