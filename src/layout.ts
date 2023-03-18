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

/**
 * an accessor for computing the size of a node in the layout
 *
 * A node size can either be a constant tuple of `[width, height]`, or a
 * callable, that takes a node and returns the width and height for that node.
 *
 * @remarks
 *
 * Due to the way that d3-dag (and typescript) infers types, a constant
 * function (e.g. `() => [1, 1]`) may infer data types as `never` producing
 * errors down the line. In these cases, you'll want to use a constant tuple.
 *
 * @example
 *
 * This example sets the node width to the length of the name. In most cases
 * you'd probably want to actually render the text and measure the size, rather
 * than assume a fixed width, but this example is easier to understand.
 *
 * ```ts
 * function widthSize({ data }: GraphNode<{ name: string }>): [number, number] {
 *   return [data.name.length, 1];
 * }
 * ```
 */
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
