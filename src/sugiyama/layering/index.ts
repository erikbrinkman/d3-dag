/**
 * A layering is any function that complies with the [[Operator]] interface.
 * This function must assign each node a non-negative integer `layer` such that
 * children have larger layers than their parents.
 *
 * There are several built in layering operators, which are all constructed in
 * a fluent fashion:
 * - [["sugiyama/layering/longest-path" | Longest path]]
 * - [["sugiyama/layering/coffman-graham" | Coffman-Graham]]
 * - [["sugiyama/layering/simplex" | Simplex]]
 * - [["sugiyama/layering/topological" | Topological]]
 *
 * @packageDocumentation
 */
import { Dag, DagNode } from "../../dag/node";

export interface LayerableNode {
  layer?: number;
}

export interface Operator<NodeType extends DagNode> {
  (dag: Dag<NodeType & LayerableNode>): void;
}
