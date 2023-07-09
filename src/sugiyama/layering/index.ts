/**
 * A {@link Layering} for assigning nodes in a dag a non-negative layer.
 * {@link Rank} and {@link Group} allow specifying extra constraints on the
 * layout.
 *
 * @packageDocumentation
 */
import { Graph, GraphNode } from "../../graph";
import { Separation } from "../utils";

/**
 * a group assignment accessor
 *
 * A group accessor assigns specific nodes a group string. Layering
 * operators that take a group accessor should respect the convention that
 * nodes with the same group should have the same layer.
 */
export interface Group<in NodeDatum = never, in LinkDatum = never> {
  /**
   * assign a group to a node
   *
   * @param node - the node to assign a group to
   * @returns group - the node's group, `undefined` if the node doesn't have a
   *   group
   */
  (node: GraphNode<NodeDatum, LinkDatum>): string | undefined;
}

/**
 * default separation for layering
 *
 * This separation returns 1 between nodes, or zero if any is not a node.
 */
export function layerSeparation(
  upper?: GraphNode | undefined,
  lower?: GraphNode | undefined,
): number {
  return +!!(upper && lower);
}

/**
 * An operator for layering a graph.
 *
 * Layering operators take a graph and a {@link Separation} function `sep`, and
 * must assign every node in the graph a y-coordinate that respects `sep` along
 * edges in the graph. In general the coordinates should try to respect
 * the same order as returned by {@link Graph#topological} but it's not
 * required.  This should also return the total "height" of the layout, such
 * that all nodes coordinates + `sep(node, undefined)` is less than height.
 *
 * @example
 *
 * The built-in layering operators should cover the majority of use cases, but
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
  /**
   * layer a graph
   *
   * After calling this, every node should have a `y` coordinate that satisfies
   * `sep`.
   *
   * @param graph - the graph to layer
   * @param sep - the minimum separation between nodes
   * @returns height - the height after layering
   */
  <N extends NodeDatum, L extends LinkDatum>(
    graph: Graph<N, L>,
    sep: Separation<N, L>,
  ): number;

  /**
   * This sentinel field is so that typescript can infer the types of NodeDatum
   * and LinkDatum, because the extra generics make it otherwise hard to infer.
   * It's a function to keep the same variance.
   *
   * @internal
   */
  __sentinel__?: (_: NodeDatum, __: LinkDatum) => void;
}
