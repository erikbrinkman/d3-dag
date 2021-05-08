/**
 * A layering is any function that complies with the {@link Operator} interface.
 * This function must assign each node a non-negative integer `layer` such that
 * children have larger layers than their parents.
 *
 * There are several built in layering operators, which are all constructed in
 * a fluent fashion:
 * - {@link "sugiyama/layering/longest-path" | Longest path}
 * - {@link "sugiyama/layering/coffman-graham" | Coffman-Graham}
 * - {@link "sugiyama/layering/simplex" | Simplex}
 * - {@link "sugiyama/layering/topological" | Topological}
 *
 * @module
 */
import { Dag, DagNode } from "../../dag/node";

/**
 * A rank accessor assigns a rank to specific nodes. Layering operators that
 * take a rank accessor should respect the convention that nodes with higher
 * rank should be pushed farther down, and nodes with the same rank should have
 * the same layer.
 */
export interface RankAccessor<NodeType extends DagNode> {
  (node: NodeType): number | undefined;
}

/**
 * A group accessor assigns a group to specific nodes. Layering operators that
 * take a group accessor should respect the convention that nodes with the same
 * group should have the same layer.
 */
export interface GroupAccessor<NodeType extends DagNode> {
  (node: NodeType): string | undefined;
}

export interface LayerableNode {
  layer?: number;
}

export interface Operator<NodeType extends DagNode> {
  (dag: Dag<NodeType & LayerableNode>): void;
}
