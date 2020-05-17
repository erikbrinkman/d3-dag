/**
 * This layering operator assigns every node a layer such that the longest path
 * (the height) is minimized.  This often results in very wide graphs, but is
 * also fast to compute.
 *
 * Create a new [[LongestPathOperator]] with [[longestPath]].
 *
 * <img alt="longest path example" src="media://longest_path.png" width="400">
 *
 * @packageDocumentation
 */
import { Dag, DagNode, ValuedNode } from "../../dag/node";
import { LayerableNode, Operator } from ".";

export interface LongestPathOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set whether longest path should go top down or not. If set to true (the
   * default), longest path will start at the top, putting nodes as close to
   * the top as possible.
   */
  topDown(val: boolean): LongestPathOperator<NodeType>;
  /** Get whether or not this is using topDown. */
  topDown(): boolean;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  topDownVal: boolean
): LongestPathOperator<NodeType> {
  function bottomUp<N extends NodeType & ValuedNode & LayerableNode>(
    dag: Dag<N>
  ): void {
    const maxHeight = Math.max(...dag.iroots().map((d) => d.value));
    for (const node of dag) {
      node.layer = maxHeight - node.value;
    }
  }

  function longestPathCall<N extends NodeType & LayerableNode>(
    dag: Dag<N>
  ): void {
    if (topDownVal) {
      for (const node of dag.depth()) {
        node.layer = node.value;
      }
    } else {
      bottomUp(dag.height());
    }
  }

  function topDown(): boolean;
  function topDown(val: boolean): LongestPathOperator<NodeType>;
  function topDown(val?: boolean): boolean | LongestPathOperator<NodeType> {
    if (val === undefined) {
      return topDownVal;
    } else {
      return buildOperator(val);
    }
  }
  longestPathCall.topDown = topDown;

  return longestPathCall;
}

/** Create a default [[LongestPathOperator]]. */
export function longestPath<NodeType extends DagNode>(
  ...args: never[]
): LongestPathOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to longestPath(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(true);
}
