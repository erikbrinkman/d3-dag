/**
 * {@link Coord}s assign `x` coordinates to every node, while
 * respecting the {@link sugiyama/sugify!SugiSeparation}.
 *
 * @packageDocumentation
 */
import { SugiNode, SugiSeparation } from "../sugify";

/**
 * An operator that assigns coordinates to layered {@link sugiyama/sugify!SugiNode}s
 *
 * This function must assign each node an `x` coordinate, and return the width
 * of the layout. The `x` coordinates should satisfy the
 * {@link sugiyama/sugify!SugiSeparation}, and all be between zero and the returned
 * width.
 *
 * There are five built-in coordinate assignment operators:
 * - {@link sugiyama/coord/simplex!CoordSimplex} - positions nodes according to a simplex optimization, striving for vertical edges
 * - {@link sugiyama/coord/quad!CoordQuad} - positions nodes according to quadratic optimization, striving for minimum overall curvature
 * - {@link sugiyama/coord/greedy!CoordGreedy} - positions nodes greedily according to their parent's positions
 * - {@link sugiyama/coord/topological!CoordTopological} - positions nodes using quadratic optimization if they were layered using topological layering
 *
 * @example
 *
 * In order to illustrate what it might look like, below we demonstrate a
 * coordinate operator that assigns an x attached to the nodes themselves. If
 * the node is a dummy node (e.g. a point on an edge between two nodes), then
 * instead we average the coordinate. Note that this isn't compliant since it
 * might not respect `sep`, and is therefore only an illustration.
 *
 * ```ts
 * customCoord<N extends { x: number }, L>(layers: SugiNode<N, L>[][], sep: SugiSeparation<N, L>): number {
 *     // determine span of xs
 *     let min = Infinity;
 *     let max = -Infinity;
 *     for (const layer of layers) {
 *         for (const node of layer) {
 *             const { data } = node;
 *             const x = node.x = data.role === "node" ? data.node.data.x : (data.link.source.data.x + data.link.target.data.x) / 2;
 *             min = Math.min(min, x - sep(undefined, node));
 *             max = Math.max(max, x + sep(node, undefined));
 *         }
 *     }
 *     // assign xs
 *     for (const node of dag) {
 *         node.x = -= min;
 *     }
 *     return max - min;
 * }
 */
export interface Coord<in NodeDatum = never, in LinkDatum = never> {
  <N extends NodeDatum, L extends LinkDatum>(
    layers: SugiNode<N, L>[][],
    sep: SugiSeparation<N, L>
  ): number;

  /**
   * This sentinel field is so that typescript can infer the types of NodeDatum
   * and LinkDatum, because the extra generics make it otherwise hard to infer.
   * It's a function to keep the same variance.
   *
   * @ignore
   */
  __sentinel__?: (_: NodeDatum, __: LinkDatum) => void;
}
