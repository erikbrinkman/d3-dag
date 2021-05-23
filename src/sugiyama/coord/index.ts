/**
 * A coordinate assignmnet operator is any function that complies with the
 * {@link Operator} interface, and assigns each node an x coordinate between zero
 * and one, respecting node order within in a layer, and the node separation
 * function.
 *
 * There are three built in coordinate assignment operators, which are all
 * constructed in a fluent fashion:
 * - {@link "sugiyama/twolayer/quad" | Quadratic Optimization } (formerly *Vert*)
 * - {@link "sugiyama/twolayer/greedy" | Greedy}
 * - {@link "sugiyama/twolayer/center" | Center}
 * - {@link "sugiyama/twolayer/topological" | Topological}
 *
 * The operator {@link "sugiyama/twolayer/min-curve" | minimize curves} is
 * deprecated as it is identical to quad with equal weights for *vertical* and
 * *curve*.
 *
 * @module
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

/**
 * The node size accessor takes a node and returns its size as a tuple of
 * [`width`, `height`]. In the layout, the nodes will positioned such that they
 * have at least width and height clearance around each of them. Due to the
 * limitations of layered layouts, that means that layers will be separated by
 * the maximum height nodes in each layer.
 */
export interface NodeSizeAccessor<NodeDatum = unknown, LinkDatum = unknown> {
  (node: DagNode<NodeDatum, LinkDatum> | DummyNode): readonly [number, number];
}

/**
 * The interface for coordinate assignment operators. This function must assign
 * each node an x coordinate, and return the width of the layout. The x
 * coordinates should satisfy the node size accessor, and all be between zero
 * and the returned width.
 */
export interface CoordOperator<NodeDatum = unknown, LinkDatum = unknown> {
  <N extends NodeDatum, L extends LinkDatum>(
    layers: (DagNode<N, L> | DummyNode)[][],
    nodeSize: NodeSizeAccessor<N, L> &
      ((node: DagNode<N, L> | DummyNode) => readonly [number, number])
  ): number;
}
