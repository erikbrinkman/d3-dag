/**
 * A {@link DecrossOperator} rearranges nodes within a layer to minimize
 * decrossings.
 *
 * @module
 */
import { SugiNode } from "../utils";

/**
 * A decross operator rearranges the nodes in a layer to minimize decrossings.
 *
 * Minimizing the number of decrossings is an NP-Complete problem, so fully
 * minimizing decrossings {@link OptOperator | optimally} can be prohibitively
 * expensive, causing javascript to crash or run forever on large dags. In
 * these instances it may be necessary to use an {@link TwoLayerOperator |
 * approximate decrossing minimization}.
 *
 * There are two built-in decrossing operators:
 * - {@link OptOperator} - fully minimizes decrossings, but may crash or run forever
 * - {@link TwoLayerOperator} - a base heuristic decrossing method considering adjacent pairs of layers at a time that can be further customized by specifying bottom up vs. top down and the specific algorithm used for the pairwise decrossing.
 */
export interface DecrossOperator<NodeDatum = never, LinkDatum = never> {
  (layers: SugiNode<NodeDatum, LinkDatum>[][]): void;
}
