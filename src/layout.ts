/**
 * Utilities and types common to all layouts
 *
 * @packageDocumentation
 */
import { GraphNode } from "./graph";

/**
 * A strictly callable {@link NodeSize}
 */
export interface CallableNodeSize<NodeDatum = never, LinkDatum = never> {
  (node: GraphNode<NodeDatum, LinkDatum>): readonly [number, number];
}
/** An accessor for computing the size of a node in the layout */
export type NodeSize<NodeDatum = never, LinkDatum = never> =
  | readonly [number, number]
  | CallableNodeSize<NodeDatum, LinkDatum>;

/** the height and width returned after laying out a graph */
export interface LayoutResult {
  /** the total weight after layout */
  width: number;
  /** the total height after layout */
  height: number;
}

/**
 * how to handle optimally solving certain layouts
 *
 * - `"fast"` - raise an exception if the layout can't be done quickly
 * - `"slow"` - raise an exception if the layout might oom
 * - `"oom"` - never raise an exception, use at your own risk
 */
export type OptChecking = "fast" | "slow" | "oom";
