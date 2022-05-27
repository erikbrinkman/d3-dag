/**
 * A {@link Lane} for assigning nodes in a dag a non-negative
 * lane.
 *
 * @packageDocumentation
 */
import { GraphNode } from "../../graph";

/**
 * An operator for assigning nodes to a lane.
 *
 * Before calling the Lane, all nodes will have their y set to their
 * topological order. After, each node should also have an x set to its
 * non-negative lane assignment.
 *
 * There are two built in lane operators:
 * - {@link grid/lane/greedy!LaneGreedy} - a greedy lane assignment operator
 * - {@link grid/lane/opt!LaneOpt} - a lane assignment operator that tries to optimally minimize crossings
 *
 * @example
 *
 * It's probably not necessary to implement your own lane operator as the
 * defaults should cover most circumstances. To illustrate how you would
 * though, the mos trivial lane assignment just assigns each node to a unique
 * lane:
 *
 * ```ts
 * function trivialLane(ordered: readonly GraphNode<unknown, unknown>[]): void {
 *     for (const [i, node] in ordered.entries()) {
 *         node.x = i;
 *     }
 * }
 * ```
 */
export interface Lane<in NodeDatum = never, in LinkDatum = never> {
  (ordered: readonly GraphNode<NodeDatum, LinkDatum>[]): void;
}
