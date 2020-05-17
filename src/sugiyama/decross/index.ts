/**
 * A decrossing is any function that complies with the [[Operator]] interface.
 * This function must only rearrange the order of nodes within the passed in
 * layers, with the goal of minimizing the number of edge crossings. A no-op
 * decross is valid, but will produce much worse results than some of the very
 * efficient decrossing methods.
 *
 * There are two built in decrossing operators, which are all constructed in
 * a fluent fashion:
 * - [["sugiyama/decross/opt" | Optimal]]
 * - [["sugiyama/decross/two-layer" | Two Layer]]
 *
 * @packageDocumentation
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface Operator<NodeType extends DagNode> {
  (layers: (NodeType | DummyNode)[][]): void;
}
