/**
 * A decrossing is any function that complies with the {@link Operator} interface.
 * This function must only rearrange the order of nodes within the passed in
 * layers, with the goal of minimizing the number of edge crossings. A no-op
 * decross is valid, but will produce much worse results than some of the very
 * efficient decrossing methods.
 *
 * There are two built in decrossing operators, which are all constructed in
 * a fluent fashion:
 * - {@link "sugiyama/decross/opt" | Optimal}
 * - {@link "sugiyama/decross/two-layer" | Two Layer}
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface DecrossOperator<NodeDatum = unknown, LinkDatum = unknown> {
  (layers: (DagNode<NodeDatum, LinkDatum> | DummyNode)[][]): void;
}
