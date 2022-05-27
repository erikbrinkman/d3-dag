/**
 * A {@link Decross} rearranges nodes within a layer to minimize
 * decrossings.
 *
 * @packageDocumentation
 */
import { SugiNode } from "../sugify";

/**
 * A decross operator rearranges the nodes in a layer to minimize decrossings.
 *
 * Minimizing the number of decrossings is an NP-Complete problem, so fully
 * minimizing decrossings {@link sugiyama/decross/opt!DecrossOpt | optimally} can be prohibitively
 * expensive, causing javascript to crash or run forever on large dags. In
 * these instances it may be necessary to use an {@link sugiyama/decross/two-layer!DecrossTwoLayer |
 * approximate decrossing minimization}.
 *
 * There are three built-in decrossing operators:
 * - {@link sugiyama/decross/opt!DecrossOpt} - fully minimizes decrossings, but may crash or run forever
 * - {@link sugiyama/decross/two-layer!DecrossTwoLayer} - a base heuristic decrossing method considering adjacent pairs of layers at a time that can be further customized by specifying bottom up vs. top down and the specific algorithm used for the pairwise decrossing.
 * - {@link sugiyama/decross/dfs!DecrossDfs} - a very fast heuristic that greedily assigns the order based on appearance during a depth-first-search. This isn't usually great on its own, but is a good place to start other methods from.
 *
 * @example
 *
 * You may have special constraints that dictate how to decross nodes. We
 * illustrate a custom decrossing operator by assuming each node is ordered by
 * an ord value. For dummy nodes (points on linger edges between nodes) we use
 * the average value between the nodes on each end.
 *
 * ```ts
 * function customDecross(layers: SugiNode<{ ord: number }, unknown>[][]): void {
 *     const vals = new Map<SugiNode, number>();
 *     for (const layer of layers) {
 *         for (const node of layer) {
 *             const { data } = node;
 *             const val = "node" in data ? data.node.data.ord ? (data.link.source.data.ord + data.link.target.data.ord) / 2;
 *             vals.set(node, val);
 *         }
 *     }
 *     for (const layer of layers) {
 *         layer.sort((a, b) => vals.get(a)! - vals.get(b)!);
 *     }
 * }
 * ```
 */
export interface Decross<in NodeDatum = never, in LinkDatum = never> {
  (layers: SugiNode<NodeDatum, LinkDatum>[][]): void;
}
