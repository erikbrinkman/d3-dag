/**
 * A {@link LayeringOperator} for assigning nodes in a dag a non-negative
 * layer. {@link RankAccessor} and {@link GroupAccessor} allow specifying extra
 * constraints on the layout.
 *
 * @module
 */
import { Dag, DagNode } from "../../dag";

/**
 * A rank accessor assigns a numeric rank to specific nodes. Layering operators
 * that take a rank accessor should respect the convention that nodes with
 * higher rank should be pushed farther down, and nodes with the same rank
 * should have the same layer.
 */
export interface RankAccessor<NodeDatum = never, LinkDatum = never> {
  (node: DagNode<NodeDatum, LinkDatum>): number | undefined;
}

/**
 * A group accessor assigns a group string to specific nodes. Layering
 * operators that take a group accessor should respect the convention that
 * nodes with the same group should have the same layer.
 */
export interface GroupAccessor<NodeDatum = never, LinkDatum = never> {
  (node: DagNode<NodeDatum, LinkDatum>): string | undefined;
}

/**
 * An operator for layering a dag.
 *
 * After calling a layering operator on a dag, every node's value should be set
 * to a non-negative integer layer, starting at 0. Additionally children should
 * have a strictly larger layer than their parents, and if a node has multiple
 * links to the same child, it's layer should be at least two greater than its
 * parent.
 *
 * There are several built in layering operators:
 * - {@link LongestPathOperator} - minimum height layout
 * - {@link CoffmanGrahamOperator} - fixed node with layout
 * - {@link SimplexOperator} - minimize the length of edges
 * - {@link TopologicalOperator} - topological layering (one node per layer)
 */
export interface LayeringOperator<NodeDatum = never, LinkDatum = never> {
  (dag: Dag<NodeDatum, LinkDatum>): void;
}
