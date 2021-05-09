/**
 * Assigns every node a layer such that the width, not counting dummy nodes, is
 * always less than some constant. This can result in tall graphs, but is also
 * reasonably fast. If the max width is set to zero (the default), the width
 * will instead be set to the square root of the number of nodes.
 *
 * Create a new {@link CoffmanGrahamOperator} with {@link coffmanGraham}.
 *
 * <img alt="Coffman-Graham example" src="media://coffman_graham.png" width="400">
 *
 * @module
 */

import { Dag, DagNode } from "../../dag/node";
import { LayerableNode, Operator } from ".";

import FastPriorityQueue from "fastpriorityqueue";
import { def } from "../../utils";

export interface CoffmanGrahamOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set the maximum width of any layer. If set to 0 (the default), the width
   * is set to the rounded square root of the number of nodes.
   */
  width(maxWidth: number): CoffmanGrahamOperator<NodeType>;
  /** Get the operators maximum width. */
  width(): number;
}

/** @internal */
class Data<NodeType> {
  before: number[] = [];
  parents: NodeType[] = [];
}

/** @internal */
function buildOperator<NodeType extends DagNode>(options: {
  width: number;
}): CoffmanGrahamOperator<NodeType> {
  function coffmanGrahamCall<N extends NodeType & LayerableNode>(
    dag: Dag<N>
  ): void {
    const maxWidth = options.width || Math.floor(Math.sqrt(dag.size() + 0.5));

    // initialize node data
    const data = new Map<NodeType, Data<N>>(
      dag.idescendants().map((node) => [node, new Data<N>()])
    );
    for (const node of dag) {
      for (const child of node.ichildren()) {
        def(data.get(child)).parents.push(node);
      }
    }

    // create queue
    function comp(left: N, right: N): boolean {
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

    const queue = new FastPriorityQueue<N>(comp);

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
        def(data.get(node)).parents.every((p) => def(p.layer) < layer)
      ) {
        node.layer = layer;
        width++;
      } else {
        node.layer = ++layer;
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
  function width(maxWidth: number): CoffmanGrahamOperator<NodeType>;
  function width(maxWidth?: number): number | CoffmanGrahamOperator<NodeType> {
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

/** Create a default {@link CoffmanGrahamOperator}. */
export function coffmanGraham<NodeType extends DagNode>(
  ...args: never[]
): CoffmanGrahamOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to coffmanGraham(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({ width: 0 });
}
