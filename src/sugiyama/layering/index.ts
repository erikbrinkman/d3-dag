/**
 * A {@link Layering} for assigning nodes in a dag a non-negative
 * layer. {@link graph!Rank} and {@link Group} allow specifying extra
 * constraints on the layout.
 *
 * @packageDocumentation
 */
import { Graph, GraphNode } from "../../graph";
import { Separation } from "../utils";

/**
 * A group accessor assigns a group string to specific nodes. Layering
 * operators that take a group accessor should respect the convention that
 * nodes with the same group should have the same layer.
 */
export interface Group<in NodeDatum = never, in LinkDatum = never> {
  (node: GraphNode<NodeDatum, LinkDatum>): string | undefined;
}

/**
 * default separation for layering
 *
 * This separation returns 1 for most nodes, but 2 for nodes that have multiple
 * edges between them to ensure that the augmented sugiyama graph is not a
 * multi-graph.
 */
export function layerSeparation(
  upper?: GraphNode | undefined,
  lower?: GraphNode | undefined
): number {
  if (!upper || !lower) {
    return 0;
  } else {
    // NOTE we want this to return 1 if lower is not a child (indicating some
    // other criterion for separation
    const links = upper.nchildLinksTo(lower) + lower.nchildLinksTo(upper);
    return Math.min(Math.max(1, links), 2);
  }
}

/**
 * An operator for layering a graph.
 *
 * Layering operators take a graph and a separation function `sep`, and must
 * assign every node in the graph a y-coordinate that respects `sep` along edges
 * in the graph. In general the coordinates should try to respect
 * the same order as returned by
 * {@link graph!Graph.topological | `graph.topological()`} but it's not required.
 * This should also return the total "height" of the layout, such that all
 * nodes coordinates + `sep(node, undefined)` is less than height.
 *
 * There are several built in layering operators:
 * - {@link sugiyama/layering/longest-path!LayeringLongestPath} - minimum height layout
 * - {@link sugiyama/layering/simplex!LayeringSimplex} - minimize the length of edges
 * - {@link sugiyama/layering/topological!LayeringTopological} - topological layering (one node per layer)
 *
 * @example
 *
 * The builtin layering oerators should cover the majority of use cases, but
 * you may need to implement your own for custom layouts.
 *
 * We illistrate implementing a custom layering operator where the nodes are
 * already assigned their y-coordinate in their data. Note that this doesn't
 * respect `sep` and an appropriate layering should, so this won't work as is.
 *
 * ```ts
 * function exampleLayering<N extends { y: number }, L>(dag: Graph<N, L>, sep: Separation<N, L>): number {
 *     // determine span of ys
 *     let min = Infinity;
 *     let max = -Infinity;
 *     for (const node of dag) {
 *         const y = node.y = node.data.y;
 *         min = Math.min(min, y - sep(undefined, node));
 *         max = Math.max(max, y + sep(node, undefined));
 *     }
 *     // assign ys
 *     for (const node of dag) {
 *         node.y = -= min;
 *     }
 *     return max - min;
 * }
 * ```
 */
export interface Layering<in NodeDatum = never, in LinkDatum = never> {
  <N extends NodeDatum, L extends LinkDatum>(
    dag: Graph<N, L>,
    sep: Separation<N, L>
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
