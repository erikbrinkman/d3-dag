/**
 * A coord assignment is any function that complies with the {@link Operator}
 * interface. The column to coord accessor assigns every node an x0 and x1
 * property in [0, 1] to specify the actual layout.
 *
 * There is one built in coord assignment operators, which are all constructed
 * in a fluent fashion:
 * - {@link "arquint/coord/spread" | Spread}
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

/** A node with a columnIndex. */
export interface IndexedNode {
  columnIndex: number;
}

/** A node that can have it's horizontal coordinates set. */
export interface RectHorizableNode {
  x0?: number;
  x1?: number;
}

/**
 * A column width accessor takes a column index and returns the relative width
 * of the column.
 */
export interface ColumnWidth {
  (index: number): number;
}

/**
 * A column separation accessor takes a column index and returns the relative
 * distance to the next column.
 */
export interface ColumnSeparation {
  (index: number): number;
}

export interface Operator<NodeType extends DagNode> {
  (
    layers: (
      | (NodeType & RectHorizableNode & IndexedNode)
      | (DummyNode & IndexedNode)
    )[][],
    columnWidthFunction: ColumnWidth,
    columnSeparationFunction: ColumnSeparation
  ): void;
}
