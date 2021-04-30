/**
 * A column assignment is any function that complies with the {@link Operator}
 * interface. A column accessor takes a dag as an array of layers where each
 * layer is an array of nodes, and sets *node*.columnIndex to the index of the
 * column in which it should appear.
 *
 * {@link "arquint/column/left" | Left} and {@link "arquint/column/center" | center}
 * determine the column index just by considering a layer. On the contrary,
 * {@link "arquint/column/complex" | complex} follows a global approach in
 * assigning column indices and tries to place a node in a column as close as
 * possible to the column in which its successors are placed in.
 *
 * There are several built in column assignment operators, which are all
 * constructed in a fluent fashion:
 * - {@link "arquint/column/left" | Left}
 * - {@link "arquint/column/center" | Center}
 * - {@link "arquint/column/adjacent" | Adjacent}
 * - {@link "arquint/column/complex" | Complex}
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface IndexableNode {
  columnIndex?: number;
}

export interface Operator<NodeType extends DagNode> {
  (layers: ((NodeType & IndexableNode) | DummyNode)[][]): void;
}
