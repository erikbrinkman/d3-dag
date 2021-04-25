/**
 * A coordinate assignmnet operator is any function that complies with the
 * [[Operator]] interface, and assigns each node an x coordinate between zero
 * and one, respecting node order within in a layer, and the node separation
 * function.
 *
 * There are three built in coordinate assignment operators, which are all
 * constructed in a fluent fashion:
 * - [["sugiyama/twolayer/quad" | Quadratic Optimization ]] (formerly *Vert*)
 * - [["sugiyama/twolayer/greedy" | Greedy]]
 * - [["sugiyama/twolayer/center" | Center]]
 * - [["sugiyama/twolayer/topological" | Topological]]
 *
 * The operator [["sugiyama/twolayer/min-curve" | minimize curves]] is
 * deprecated as it is identical to quad with equal weights for *vertical* and
 * *curve*.
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface HorizableNode {
  x?: number;
}

/**
 * The node size accessor takes a node and returns its size as a tuple of
 * [`width`, `height`]. In the layout, the nodes will positioned such that they
 * have at least width and height clearance around each of them. Due to the
 * limitations of layered layouts, that means that layers will be separated by
 * the maximum height nodes in each layer.
 */
export interface NodeSizeAccessor<NodeType extends DagNode> {
  (node: NodeType | DummyNode): [number, number];
}

/**
 * The interface for coordinate assignment operators. This function must assign
 * each node an x coordinate, and return the width of the layout. The x
 * coordinates should satisfy the node size accessor, and all be between zero
 * and the returned width.
 */
export interface Operator<NodeType extends DagNode> {
  (
    layers: ((NodeType & HorizableNode) | DummyNode)[][],
    nodeSize: NodeSizeAccessor<NodeType>
  ): number;
}
