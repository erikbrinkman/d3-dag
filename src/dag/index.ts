/**
 *
 * @module
 */

import { FluentIterable } from "../iters";

/** All available styles of node iteration. */
export type IterStyle = "depth" | "breadth" | "before" | "after";

/** The public facing interface backed by the {@link LayoutLink} implementation. */
export interface DagLink<NodeDatum = unknown, LinkDatum = unknown> {
  readonly source: DagNode<NodeDatum, LinkDatum>;
  readonly target: DagNode<NodeDatum, LinkDatum>;
  readonly data: LinkDatum;
  readonly points: { readonly x: number; readonly y: number }[];
}

/** */
export interface Dag<NodeDatum = unknown, LinkDatum = unknown>
  extends Iterable<DagNode<NodeDatum, LinkDatum>> {
  /** */
  iroots(): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /** Returns an array of roots. */
  roots(): DagNode<NodeDatum, LinkDatum>[];

  /**
   * Returns an iterator over all descendants of this node, e.g. every node in
   * the {@link Dag}. An {@link IterStyle} can be passed in to influence the iteration
   * order, the default (`'depth'`) should generally be the fastest, but note
   * that in general, traversal in a DAG takes linear space as we need to track
   * what nodes we've already visited.
   *
   * - 'depth' - starting from the left most root, visit a nodes left most
   *   child, progressing down to children before yielding any other node.
   * - 'breadth' - starting from the left most root, yield each of it's
   *   children, before yielding the children of its left most child.
   * - 'before' - yield all of the roots, progressing downward, never yielding
   *   a node before all of its parents have been yielded.
   * - 'after' - yield all leaf nodes, progressing upward, never yielding a
   *   node before all of its parents have been yielded.
   */
  idescendants(
    style?: IterStyle
  ): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /** Returns an array of {@link idescendants}. */
  descendants(style?: IterStyle): DagNode<NodeDatum, LinkDatum>[];

  /** Returns an iterator over every {@link Link} in the DAG. */
  ilinks(): FluentIterable<DagLink<NodeDatum, LinkDatum>>;

  /** Returns an array of {@link ilinks}. */
  links(): DagLink<NodeDatum, LinkDatum>[];

  /** Counts the number of nodes in the DAG. */
  size(): number;

  /**
   * Provide a callback that computes a number for each node, then set a node's
   * value to the sum of this number for this node and all of its descendants.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  sum(
    callback: (node: DagNode<NodeDatum, LinkDatum>, index: number) => number
  ): this;

  /**
   * Set the value of each node to be the number of leaves beneath the node.
   * If this node is a leaf, its value is one.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  count(): this;

  /**
   * Assign each node a value equal to its longest distance from a root.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  height(): this;

  /**
   * Assign each node a value equal to its longest distance to a leaf.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  depth(): this;

  /** split but iterable */
  isplit(): FluentIterable<Dag<NodeDatum, LinkDatum>>;

  /**
   * Returns an array of connected DAGs, splitting the DAG into several
   * components if its dosconnected.
   */
  split(): Dag<NodeDatum, LinkDatum>[];

  /**
   * Return true if every node in the dag is reachable from every other.
   */
  connected(): boolean;
}

export interface DagNode<NodeDatum = unknown, LinkDatum = unknown>
  extends Dag<NodeDatum, LinkDatum> {
  readonly data: NodeDatum;
  value?: number;
  x?: number;
  y?: number;

  /** */
  ichildren(): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /** An array of this node's children. */
  children(): DagNode<NodeDatum, LinkDatum>[];

  /** An iterator of links between this node and its children. */
  ichildLinks(): FluentIterable<DagLink<NodeDatum, LinkDatum>>;

  /** An array of links between this node and its children. */
  childLinks(): DagLink<NodeDatum, LinkDatum>[];
}
