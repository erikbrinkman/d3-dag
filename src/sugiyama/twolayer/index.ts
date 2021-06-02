/**
 * A two layer (order) operator is any function that complies with the
 * {@link TwolayerOperator} interface.  This function must rearrange the oder of the bottom
 * layer to minimize the number of crossings.
 *
 * There are three built in decrossing operators, which are all constructed in
 * a fluent fashion:
 * - {@link "sugiyama/twolayer/opt" | Optimal}
 * - {@link "sugiyama/twolayer/median" | Median}
 * - {@link "sugiyama/twolayer/mean" | Mean}
 *
 * @module
 */
import { SugiNode } from "../utils";

/** twolayer operator */
export interface TwolayerOperator<NodeDatum = never, LinkDatum = never> {
  (
    topLayer: SugiNode<NodeDatum, LinkDatum>[],
    bottomLayer: SugiNode<NodeDatum, LinkDatum>[],
    topDown: boolean
  ): void;
}
