/**
 * Instead of doing the assignment of nodes to columns per-layer, this accessor
 * considers the entire subtree per node. Therefore, the assignment happens
 * depth-first.
 *
 * Left:
 * <img alt="arquint complex left example" src="media://arquint.png" width="400">
 * Center:
 * <img alt="arquint complex center example" src="media://arquint_complex_center.png" width="400">
 *
 * @packageDocumentation
 */
import { IndexableNode, Operator } from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";
import { SafeMap } from "../../utils";

export interface ComplexOperator<NodeType extends DagNode>
  extends Operator<NodeType> {
  /**
   * Set whether the column complex accessor should center the parent node for
   * each subtree.
   */
  center(val: boolean): ComplexOperator<NodeType>;
  /** Get the current center value. */
  center(): boolean;
}

/** @internal */
function buildOperator<NodeType extends DagNode>(
  centerVal: boolean
): ComplexOperator<NodeType> {
  function complexCall(
    layers: ((NodeType & IndexableNode) | DummyNode)[][]
  ): void {
    // find all root nodes and subtree widths
    const rootMap = new SafeMap<
      string,
      (NodeType & IndexableNode) | DummyNode
    >();
    const subtreeWidths = new SafeMap<string, number>();
    for (const layer of layers.slice().reverse()) {
      for (const node of layer) {
        rootMap.set(node.id, node);
        let subtreeWidth = 0;
        for (const child of node.ichildren()) {
          rootMap.delete(child.id);
          subtreeWidth += subtreeWidths.getThrow(child.id);
        }
        subtreeWidths.set(node.id, Math.max(subtreeWidth, 1));
      }
    }

    // iterate over each root and assign column indices to each node in its
    // subtree.  if a node already has a columnIndex, do not change it, this
    // case can occur if the node has more than one predecessor
    // TODO I think this would be more elegant with simple iteration, but it's
    // not clear how that would look
    let startColumnIndex = 0;
    for (const node of rootMap.values()) {
      const subtreeWidth = subtreeWidths.getThrow(node.id);
      node.columnIndex =
        startColumnIndex + (centerVal ? Math.floor((subtreeWidth - 1) / 2) : 0);
      assignColumnIndexToChildren(node, startColumnIndex);
      startColumnIndex += subtreeWidth;
    }

    function assignColumnIndexToChildren<N extends NodeType & IndexableNode>(
      node: N | DummyNode,
      startColumnIndex: number
    ): void {
      let childColumnIndex = startColumnIndex;
      for (const child of node.ichildren()) {
        if (child.columnIndex !== undefined) {
          // stop recursion, this child was already visited
          return;
        }
        const width = subtreeWidths.getThrow(child.id);
        child.columnIndex =
          childColumnIndex + (centerVal ? Math.floor((width - 1) / 2) : 0);
        assignColumnIndexToChildren<N>(child, childColumnIndex);
        childColumnIndex += width;
      }
    }
  }

  function center(): boolean;
  function center(val: boolean): ComplexOperator<NodeType>;
  function center(val?: boolean): boolean | ComplexOperator<NodeType> {
    if (val === undefined) {
      return centerVal;
    } else {
      return buildOperator(val);
    }
  }
  complexCall.center = center;

  return complexCall;
}

/** Create a complex operator with default settings. */
export function complex<NodeType extends DagNode>(
  ...args: never[]
): ComplexOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to center(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(false);
}
