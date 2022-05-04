/**
 * A {@link LaneOperator} for assigning nodes in a dag a non-negative
 * lane.
 *
 * @packageDocumentation
 */
import { DagNode } from "../../dag";

/**
 * An operator for assigning nodes to a lane.
 *
 * Before calling the LaneOperator, all nodes will have their y set to their
 * topological order. After, each node should also have an x set to its
 * non-negative lane assignment.
 *
 * There are two built in lane operators:
 * - {@link GreedyOperator} - a greedy lane assignment operator
 * - {@link OptOperator} - a lane assignment operator that tries to optimally minimize crossings
 */
export interface LaneOperator<NodeDatum = never, LinkDatum = never> {
  (ordered: readonly DagNode<NodeDatum, LinkDatum>[]): void;
}
