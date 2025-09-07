/**
 * A {@link Decross} rearranges nodes within a layer to minimize
 * decrossings.
 *
 * @packageDocumentation
 */
import type { SugiNode } from "../sugify";

/**
 * a decrossing operator rearranges the nodes in a layer to minimize decrossings.
 *
 * A decrossing operator takes a array of layered nodes and reorders them.
 * There is no specific requirement on what the final order should be, but for
 * layouts to look good, most decrossing operators should seek to minimize the
 * number of link crossings, among other constraints.
 *
 * Minimizing the number of link crossings is an NP-Complete problem, so fully
 * minimizing decrossings {@link decrossOpt | optimally} can be prohibitively
 * expensive, causing javascript to crash or run forever on large dags. In
 * these instances it may be necessary to use an
 * {@link decrossTwoLayer | approximate decrossing minimization}. You may also
 * have special constraints around the order of nodes that can be expressed
 * with this operator.
 *
 * @example
 *
 * A common case might be that you want to use an optimal decrossing method if
 * the layout is small, but use a heuristic if the graph is too large. This can
 * be easily accomplished with a custom decrossing operator.
 *
 * ```ts
 * const opt = decrossOpt();
 * const heuristic = decrossTwoLayer();
 *
 * function decrossFallback(layers: SugiNode[][]): void {
 *   try {
 *     opt(layers);
 *   } catch {
 *     heuristic(layers);
 *   }
 * }
 * ```
 *
 * @example
 *
 * We illustrate a custom decrossing operator by assuming each node is ordered
 * by an `ord` value. For dummy nodes (points on longer edges between nodes) we
 * use the average value between the nodes on each end.
 *
 * ```ts
 * function customDecross(layers: SugiNode<{ ord: number }, unknown>[][]): void {
 *     const vals = new Map<SugiNode, number>();
 *     for (const layer of layers) {
 *         for (const node of layer) {
 *             const { data } = node;
 *             const val = data.role === "node" ? data.node.data.ord ? (data.link.source.data.ord + data.link.target.data.ord) / 2;
 *             vals.set(node, val);
 *         }
 *     }
 *     for (const layer of layers) {
 *         layer.sort((a, b) => vals.get(a)! - vals.get(b)!);
 *     }
 * }
 * ```
 */
export type Decross<in NodeDatum = never, in LinkDatum = never> = (
  layers: SugiNode<NodeDatum, LinkDatum>[][],
) => void;
