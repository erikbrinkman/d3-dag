/**
 * A column assignment is any function that complies with the [[Operator]]
 * interface. A column accessor takes a dag as an array of layers where each
 * layer is an array of nodes, and sets *node*.columnIndex to the index of the
 * column in which it should appear.
 *
 * [["arquint/column/left" | Left]] and [["arquint/column/center" | center]]
 * determine the column index just by considering a layer. On the contrary,
 * [["arquint/column/complex" | complex]] follows a global approach in
 * assigning column indices and tries to place a node in a column as close as
 * possible to the column in which its successors are placed in.
 *
 * There are several built in column assignment operators, which are all
 * constructed in a fluent fashion:
 * - [["arquint/column/left" | Left]]
 * - [["arquint/column/center" | Center]]
 * - [["arquint/column/adjacent" | Adjacent]]
 * - [["arquint/column/complex" | Complex]]
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
