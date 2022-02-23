/**
 * A {@link CoffmanGrahamOperator} that prevents the width of the dag from
 * being too large.
 *
 * @module
 */
import FastPriorityQueue from "fastpriorityqueue";
import { LayeringOperator } from ".";
import { Dag, DagNode } from "../../dag";
import { getParentCounts } from "../../dag/utils";
import { map } from "../../iters";

/**
 * A {@link LayeringOperator} that restricts the layout to have a maximum
 * width.
 *
 * Assigns every node a layer such that the width, not counting dummy nodes, is
 * always less than some constant. This can result in tall graphs, but is also
 * reasonably fast. If the max width is set to zero (the default), the width
 * will instead be set to the square root of the number of nodes.
 *
 * This method is reasonably fast, but can results in long edges which make the
 * decrossing phase more difficult. Also note that setting {@link width |
 * `width`} to 1 is roughly equivalent to topological layering.
 *
 * Create with {@link coffmanGraham}.
 *
 * <img alt="Coffman-Graham example" src="media://sugi-coffmangraham-opt-quad.png" width="400">
 */
export interface CoffmanGrahamOperator
  extends LayeringOperator<unknown, unknown> {
  /**
   * Set the maximum width of any layer. If set to 0, the width is set to the
   * rounded square root of the number of nodes. (default: 0)
   */
  width(maxWidth: number): CoffmanGrahamOperator;
  /** Get the operators maximum width. */
  width(): number;
}

/** @internal */
function buildOperator(options: { width: number }): CoffmanGrahamOperator {
  function coffmanGrahamCall(dag: Dag): void {
    const maxWidth = options.width || Math.floor(Math.sqrt(dag.size() + 0.5));

    // create queue
    function comp(
      [leftBefore]: [number[], DagNode],
      [rightBefore]: [number[], DagNode]
    ): boolean {
      for (const [i, leftb] of leftBefore.entries()) {
        const rightb = rightBefore[i];
        if (rightb === undefined) {
          return false;
        } else if (leftb < rightb) {
          return true;
        } else if (rightb < leftb) {
          return false;
        }
      }
      return true;
    }
    const queue = new FastPriorityQueue(comp);

    // initialize node data
    const beforeInds = new Map<DagNode, number[]>(
      map(dag, (node) => [node, []])
    );
    const parents = getParentCounts(dag);

    // start with root nodes
    for (const root of dag.iroots()) {
      queue.add([[], root]);
    }
    let i = 0; // node index
    let layer = 0; // layer assigning
    let width = 0; // current width
    let next;
    while ((next = queue.poll())) {
      const [, node] = next;
      // NOTE for clarity we compute this early, but we don't need to if width
      // >= maxWidth which is a little inefficient
      const limit = parents
        .get(node)
        ?.reduce((l, [p, c]) => Math.max(l, p.value! + +(c > 1)), 0);
      if (width < maxWidth && (limit === undefined || limit < layer)) {
        node.value = layer;
        width++;
      } else {
        console.log;
        node.value = layer = Math.max(limit ?? 0, layer) + 1;
        width = 1;
      }
      for (const child of node.ichildren()) {
        const before = beforeInds.get(child)!;
        before.push(i);
        if (before.length === parents.get(child)!.length) {
          queue.add([before.reverse(), child]);
        }
      }
      i++;
    }
  }

  function width(): number;
  function width(maxWidth: number): CoffmanGrahamOperator;
  function width(maxWidth?: number): number | CoffmanGrahamOperator {
    if (maxWidth === undefined) {
      return options.width;
    } else if (maxWidth < 0) {
      throw new Error(`width must be non-negative: ${maxWidth}`);
    } else {
      return buildOperator({ ...options, width: maxWidth });
    }
  }
  coffmanGrahamCall.width = width;

  return coffmanGrahamCall;
}

/**
 * Create a default {@link CoffmanGrahamOperator}, bundled as
 * {@link layeringCoffmanGraham}.
 */
export function coffmanGraham(...args: never[]): CoffmanGrahamOperator {
  if (args.length) {
    throw new Error(
      `got arguments to coffmanGraham(${args}), but constructor takes no arguments.`
    );
  }
  return buildOperator({ width: 0 });
}
