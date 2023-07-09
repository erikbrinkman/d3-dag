/**
 * The definition of the {@link Twolayer} interface, which is used to
 * customize {@link DecrossTwoLayer}.
 *
 * @packageDocumentation
 */
import { SugiNode } from "../sugify";

/**
 * an operator for optimizing decrossings one layer at a time.
 *
 * This is used to customize {@link DecrossTwoLayer}.
 *
 * When called with `topDown = true` `topLayer` should be untouched, and
 * `bottomLayer` should be rearranged to minimize crossings. When
 * `topDown = false` then `topLayer` should be rearranged, and `bottomLayer`
 * should remain fixed. There are no requirements for how these needs to order
 * nodes, but doing so in such a way to minimize edge crossings is usually
 * desired.
 *
 * @example
 *
 * It's unlikely that you'll need to implement a custom two-layer operator as
 * this is already a heuristic solution to decrossing. However, in the event
 * that you do, we illustrate how to implement one where the order is stored in
 * the original nodes. Here dummy nodes (nodes that exist on long edges between
 * "real" nodes) are ordered according to the average value of their source and
 * target nodes.
 *
 * ```ts
 * function myTwoLayer(topLayer: SugiNode<{ ord: number }, unknown>[], bottomLayer: SugiNode<{ ord: number }, unknown>[], topDown: boolean): void {
 *     let mutate = topDown ? bottomLayer : topLayer;
 *     const vals = new Map<SugiNode, number>();
 *     for (const node of mutate) {
 *         const { data } = node;
 *         const val = data.role === "node" ? data.node.data.ord ? (data.link.source.data.ord + data.link.target.data.ord) / 2;
 *         vals.set(node, val);
 *     }
 *     layer.sort((a, b) => vals.get(a)! - vals.get(b)!);
 * }
 * ```
 */
export interface Twolayer<in NodeDatum = never, in LinkDatum = never> {
  /**
   * rearrange one layer conditioned on another
   *
   * @param topLayer - the top layer
   * @param bottomLayer - the bottom layer
   * @param topDown - if true rearrange `bottomLayer`, else rearrange `topLayer`
   */
  (
    topLayer: SugiNode<NodeDatum, LinkDatum>[],
    bottomLayer: SugiNode<NodeDatum, LinkDatum>[],
    topDown: boolean,
  ): void;
}
