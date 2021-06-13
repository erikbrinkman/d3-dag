/**
 * A {@link CoffmanGrahamOperator} that prevents the width of the dag from
 * being too large.
 *
 * @module
 */

import { Dag, DagNode } from "../../dag";

import FastPriorityQueue from "fastpriorityqueue";
import { LayeringOperator } from ".";
import { def } from "../../utils";

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
 * <img alt="Coffman-Graham example" src="media://coffman_graham.png" width="400">
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

    // initialize node data
    const data = new Map(
      dag
        .idescendants()
        .map(
          (node) =>
            [
              node,
              { before: [] as number[], parents: [] as DagNode[] }
            ] as const
        )
    );
    for (const node of dag) {
      for (const child of node.ichildren()) {
        def(data.get(child)).parents.push(node);
      }
    }

    // create queue
    function comp(left: DagNode, right: DagNode): boolean {
      const leftBefore = def(data.get(left)).before;
      const rightBefore = def(data.get(right)).before;
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

    // start with root nodes
    for (const root of dag.iroots()) {
      queue.add(root);
    }
    let i = 0; // node index
    let layer = 0; // layer assigning
    let width = 0; // current width
    let node;
    while ((node = queue.poll())) {
      if (
        width < maxWidth &&
        def(data.get(node)).parents.every((p) => def(p.value) < layer)
      ) {
        node.value = layer;
        width++;
      } else {
        node.value = ++layer;
        width = 1;
      }
      for (const child of node.ichildren()) {
        const { before, parents } = def(data.get(child));
        before.push(i);
        if (before.length === parents.length) {
          before.sort((a, b) => b - a);
          queue.add(child);
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
      `got arguments to coffmanGraham(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ width: 0 });
}
