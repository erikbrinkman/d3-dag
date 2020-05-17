/**
 * A two layer (order) operator is any function that complies with the
 * [[Operator]] interface.  This function must rearrange the oder of the bottom
 * layer to minimize the number of crossings.
 *
 * There are three built in decrossing operators, which are all constructed in
 * a fluent fashion:
 * - [["sugiyama/twolayer/opt" | Optimal]]
 * - [["sugiyama/twolayer/median" | Median]]
 * - [["sugiyama/twolayer/mean" | Mean]]
 *
 * @packageDocumentation
 */
import { DagNode } from "../../dag/node";
import { DummyNode } from "../dummy";

export interface Operator<NodeType extends DagNode> {
  (
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[]
  ): void;
}
