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
 * There are two built in two-layer operators:
 * - {@link OptOperator} - optimal corssing minimization for the layer in question
 * - {@link AggOperator} - order according to the aggregate of parent indices, fast
 */
export interface TwolayerOperator<NodeDatum = never, LinkDatum = never> {
  (
    topLayer: SugiNode<NodeDatum, LinkDatum>[],
    bottomLayer: SugiNode<NodeDatum, LinkDatum>[],
    topDown: boolean
  ): void;
}
