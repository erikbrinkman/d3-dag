/**
 * Utilities and types common to all layouts
 *
 * @packageDocumentation
 */
import { GraphNode } from "./graph";
import { err } from "./utils";

/**
 * A strictly callable {@link NodeSize}
 */
export interface CallableNodeSize<NodeDatum = never, LinkDatum = never> {
  /**
   * compute the node size of a graph node
   *
   * @param node - the node to get the size of
   * @returns dimensions - the width and height of `node`
   */
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

/** An accessor for computing the length of a node */
export interface NodeLength<in NodeDatum = never, in LinkDatum = never> {
  /**
   * compute the length (width or height) of a graph node
   *
   * @param node - the node to get the length of
   * @returns length - the width or height of `node`
   */
  (node: GraphNode<NodeDatum, LinkDatum>): number;
}

/**
 * cache a {@link NodeSize} so it is called at most once for every node
 */
export function cachedNodeSize<N, L>(
  nodeSize: NodeSize<N, L>,
): CallableNodeSize<N, L> {
  if (typeof nodeSize !== "function") {
    const [x, y] = nodeSize;
    if (x <= 0 || y <= 0) {
      throw err`all node sizes must be positive, but got width ${x} and height ${y}`;
    }
    return () => [x, y];
  } else {
    const cache = new Map<GraphNode<N, L>, readonly [number, number]>();

    const cached = (node: GraphNode<N, L>): readonly [number, number] => {
      let val = cache.get(node);
      if (val === undefined) {
        val = nodeSize(node);
        const [width, height] = val;
        if (width <= 0 || height <= 0) {
          throw err`all node sizes must be positive, but got width ${width} and height ${height} for node with data: ${node.data}; make sure the callback passed to \`sugiyama().nodeSize(...)\` is doing that`;
        }
        cache.set(node, val);
      }
      return val;
    };

    return cached;
  }
}

/**
 * split a {@link NodeSize} into x and y {@link NodeLength}s
 *
 * This allows you to split a NodeSize into independent x and y accessors.
 *
 * The only real reason to use this would be to run the steps of
 * {@link sugiyama} independently.
 */
export function splitNodeSize<N, L>(
  nodeSize: NodeSize<N, L>,
): readonly [NodeLength<N, L>, NodeLength<N, L>] {
  if (typeof nodeSize !== "function") {
    const [x, y] = nodeSize;
    return [() => x, () => y];
  } else {
    const callable = nodeSize;
    return [(node) => callable(node)[0], (node) => callable(node)[1]];
  }
}

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
