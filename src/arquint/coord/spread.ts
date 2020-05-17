/**
 * Compute x0 and x1 coordinates for nodes that maximizes the spread of nodes
 * in [0, 1].  It uses columnIndex that has to be present in each node. Due to
 * the varying height of the nodes, nodes from different layers might be
 * present at the same y coordinate therefore, nodes should not be centered in
 * their layer but centering should be considered over all layers.
 *
 * @packageDocumentation
 */

import {
  ColumnSeparation,
  ColumnWidth,
  IndexedNode,
  Operator,
  RectHorizableNode
} from ".";

import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export type SpreadOperator<NodeType extends DagNode> = Operator<NodeType>;

/** Create a spread coord operator. */
export function spread<NodeType extends DagNode>(
  ...args: never[]
): SpreadOperator<NodeType> {
  if (args.length) {
    throw new Error(
      `got arguments to spread(${args}), but constructor takes no aruguments.`
    );
  }

  function spreadCall(
    layers: (
      | (NodeType & RectHorizableNode & IndexedNode)
      | (DummyNode & IndexedNode)
    )[][],
    columnWidthFunction: ColumnWidth,
    columnSeparationFunction: ColumnSeparation
  ): void {
    // calculate the number of columns
    const maxColumns =
      Math.max(
        ...layers.map((layer) =>
          Math.max(...layer.map((node) => node.columnIndex))
        )
      ) + 1;

    // call columnWidthFunction for each column index to get an array with the width of each column index:
    const columnWidths: number[] = [];
    for (let i = 0; i < maxColumns; ++i) {
      columnWidths.push(columnWidthFunction(i));
    }

    // similarly for the separation of the columns, where columnSeparation[0] is the separation between column 0 and 1:
    const columnStarts: number[] = [0];
    for (let i = 0; i < maxColumns - 1; ++i) {
      const start =
        columnStarts[i] + columnWidths[i] + columnSeparationFunction(i);
      columnStarts.push(start);
    }
    const maxWidth =
      columnStarts[maxColumns - 1] + columnWidths[maxColumns - 1];

    for (const layer of layers) {
      for (const node of layer) {
        const start = columnStarts[node.columnIndex];
        const width = columnWidths[node.columnIndex];
        node.x0 = start / maxWidth;
        node.x1 = (start + width) / maxWidth;
      }
    }
  }

  return spreadCall;
}
