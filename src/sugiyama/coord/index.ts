/**
 * {@link CoordOperator}s assign `x` coordinates to every node, while
 * respecting the {@link CoordNodeSizeAccessor}.
 *
 * @module
 */
import { SugiNode } from "../utils";

/**
 * An accessor that defines the horizontal size of a node.
 *
 * The node size accessor takes a node and returns its `width` in units. In the
 * layout, the nodes will positioned such that they have at least width
 * clearance around the center of the node.
 *
 * This interface is passed into {@link CoordOperator}s, but most users will
 * interact with {@link NodeSizeAccessor} or for advanced users
 * {@link SugiNodeSizeAccessor}.
 */
export interface CoordNodeSizeAccessor<NodeDatum = never, LinkDatum = never> {
  (node: SugiNode<NodeDatum, LinkDatum>): number;
}

/**
 * An operator that assigns coordinates to layered {@link SugiNode}s
 *
 * This function must assign each node an `x` coordinate, and return the width
 * of the layout. The `x` coordinates should satisfy the
 * {@link CoordNodeSizeAccessor}, and all be between zero and the returned
 * width.
 *
 * There are four built-in coordinate assignment operators:
 * - {@link QuadOperator} - positions nodes according to quadratic optimization
 * - {@link GreedyOperator} - positions nodes greedily according to their parent's positions
 * - {@link CenterOperator} - positions nodes close together centering each layer
 * - {@link TopologicalOperator} - positions nodes using quadratic optimization if they were layered using topological layering
 */
export interface CoordOperator<NodeDatum = never, LinkDatum = never> {
  <N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    nodeSize: CoordNodeSizeAccessor<N, L>
  ): number;
}
