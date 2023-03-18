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
 * Before calling this operator, all nodes will have their y set to their
 * topological order. After, each node should also have an x set to its
 * non-negative lane assignment.
 *
 * @example
 *
 * It's probably not necessary to implement your own lane operator as the
 * defaults should cover most circumstances. To illustrate how you would
 * though, the most trivial lane assignment just assigns each node to a unique
 * lane:
 *
 * ```ts
 * function trivialLane(ordered: readonly GraphNode[]): void {
 *     for (const [i, node] in ordered.entries()) {
 *         node.x = i;
 *     }
 * }
 * ```
 */
export interface Lane<in NodeDatum = never, in LinkDatum = never> {
  (ordered: readonly GraphNode<NodeDatum, LinkDatum>[]): void;
}
