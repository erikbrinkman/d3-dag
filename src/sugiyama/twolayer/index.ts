/**
 * The definition of the {@link TwolayerOperator} interface, which is used to
 * customize {@link TwoLayerOperator}.
 *
 * @module
 */
import { SugiNode } from "../utils";

/**
 * An operator for optimizing decrossings one layer at a time.
 *
 * When called with `topDown = true` `topLayer` should be untouched, and
 * `bottomLayer` should be rearranged to minimize crossings. When `topDown =
 * false` then `topLayer` should be rearranged, and `bottomLayer` should remain
 * fixed.
 *
 * There are three built in two-layer operators:
 * - {@link OptOperator} - optimal corssing minimization for the layer in question
 * - {@link MedianOperator} - order according to median of parent indices
 * - {@link MeanOperator} - order according to mean of parent indices
 */
export interface TwolayerOperator<NodeDatum = never, LinkDatum = never> {
  (
    topLayer: SugiNode<NodeDatum, LinkDatum>[],
    bottomLayer: SugiNode<NodeDatum, LinkDatum>[],
    topDown: boolean
  ): void;
}
