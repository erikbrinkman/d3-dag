/**
 * A coordinate assignmnet operator is any function that complies with the
 * [[Operator]] interface, and assigns each node an x coordinate between zero
 * and one, respecting node order within in a layer, and the node separation
 * function.
 *
 * There are three built in coordinate assignment operators, which are all
 * constructed in a fluent fashion:
 * - [["sugiyama/twolayer/vert" | Vertical]]
 * - [["sugiyama/twolayer/min-curve" | Minimize Curves]]
 * - [["sugiyama/twolayer/greedy" | Greedy]]
 * - [["sugiyama/twolayer/center" | Center]]
 * - [["sugiyama/twolayer/topological" | Topological]]
 *
 * @packageDocumentation
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface HorizableNode {
  x?: number;
}

/**
 * The separation operator takes two adjacent nodes on the same layer and
 * indicates what their relative spacing should be to all other adjacent nodes.
 * All constant separations are identical.
 */
export interface Separation<NodeType extends DagNode> {
  (left: NodeType | DummyNode, right: NodeType | DummyNode): number;
}

/** The interface for coordinate assignment operators. */
export interface Operator<NodeType extends DagNode> {
  (
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    separation: Separation<NodeType>
  ): void;
}
