/**
 * A {@link Dag} is simply a collection of {@link DagNode}s, defined by every reachable
 * child node from the current returned node.  If a DAG contains multiple
 * roots, then the returned object will not have accessable children or data,
 * e.g. it will be a {@link Dag} but not a {@link DagNode}. It will still
 * support gettings the roots or iteration over all nodes.
 *
 * There are three built-in methods for creating dags from data:
 * {@link HierarchyOperator}, {@link StratifyOperator}, and
 * {@link ConnectOperator}.
 *
 * @module
 */
import { FluentIterable } from "../iters";

/**
 * All available styles of node iteration.
 */
export type IterStyle = "depth" | "breadth" | "before" | "after";

/**
 * A link between nodes, with attached data, and `points` for how to render the
 * link if the {@link Dag} has been laidout.
 */
export interface DagLink<NodeDatum = unknown, LinkDatum = unknown> {
  readonly source: DagNode<NodeDatum, LinkDatum>;
  readonly target: DagNode<NodeDatum, LinkDatum>;
  readonly data: LinkDatum;
  readonly points: { readonly x: number; readonly y: number }[];
}

/**
 * A Directed Acyclic Graph representation.
 *
 * Dags support gettings their {@link roots}, iterating over {@link
 * descendants}, or performing computations. Similar to
 * {@link https://github.com/d3/d3-hierarchy | `d3-hierarchy`}, a dag is
 * defined only as all nodes reachable from the current node, so roots will not
 * return parents of the current just just the current node during iteration.
 * The same principle holds true for all methods.
 *
 * Methods names preceeded by an `i` will return a {@link FluentIterable} which
 * is a wrapper around native EMCA iterators that also adds most methods found
 * in the `Array` prototype making them much more useful for fluent functional
 * programming.
 *
 */
export interface Dag<NodeDatum = unknown, LinkDatum = unknown>
  extends Iterable<DagNode<NodeDatum, LinkDatum>> {
  /** @internal this is unused, but necessary for typescript to typecheck */
  __sentinel__?: NodeDatum;

  /**
   * Return an iterator over the dag's roots
   *
   * A root is a node without parents. If a dag has multiple roots, this will
   * return more than one object, if this represents a single node, then only
   * that node will be returned.
   */
  iroots(): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /**
   * Returns an array of roots
   *
   * See {@link iroots}.
   */
  roots(): DagNode<NodeDatum, LinkDatum>[];

  /**
   * Returns an iterator over all descendants of this node, e.g. every node in
   * the {@link Dag}. An {@link IterStyle} can be passed in to influence the
   * iteration order, the default (`'depth'`) should generally be the fastest,
   * but note that in general, traversal in a dag takes linear time and linear
   * space as we need to track what nodes we've already visited.
   *
   * - `'depth'` - starting from the left most root, visit a nodes left most
   *   child, progressing down to children before yielding any other node.
   * - `'breadth'` - starting from the left most root, yield each of it's
   *   children, before yielding the children of its left most child.
   * - `'before'` - yield all of the roots, progressing downward, never
   *   yielding a node before all of its parents have been yielded.
   * - `'after'` - yield all leaf nodes, progressing upward, never yielding a
   *   node before all of its children have been yielded.
   */
  idescendants(
    style?: IterStyle
  ): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /**
   * Returns an array of all descendants of this node
   *
   * See {@link idescendants}.
   */
  descendants(style?: IterStyle): DagNode<NodeDatum, LinkDatum>[];

  /**
   * Returns an iterator over every {@link DagLink}
   */
  ilinks(): FluentIterable<DagLink<NodeDatum, LinkDatum>>;

  /**
   * Returns an array of every {@link DagLink}
   *
   * See {@link ilinks}.
   */
  links(): DagLink<NodeDatum, LinkDatum>[];

  /** Count the number of nodes in the dag */
  size(): number;

  /**
   * Compute values over the dag
   *
   * Provide a callback that computes a number for each node, then set a node's
   * `value` to the sum of this number for this node and all of its
   * descendants. Note, if another node is a child via two separate paths, that
   * child's value will only factor into this node's value once.
   */
  sum(
    callback: (node: DagNode<NodeDatum, LinkDatum>, index: number) => number
  ): this;

  /**
   * Set the value of each node to be the number of leaves beneath the node.
   * If this node is a leaf, its value is one.
   */
  count(): this;

  /**
   * Assign each node a value equal to its longest distance from a root.
   */
  height(): this;

  /**
   * Assign each node a value equal to its longest distance to a leaf.
   */
  depth(): this;

  /**
   * Split a dag into connected components
   *
   * Returns an iterable over each connected component as a new dag.
   */
  isplit(): FluentIterable<Dag<NodeDatum, LinkDatum>>;

  /**
   * Split a dag into connected components
   *
   * See {@link isplit}.
   */
  split(): Dag<NodeDatum, LinkDatum>[];

  /**
   * Return true if every node in the dag is reachable from every other.
   */
  connected(): boolean;
}

/**
 * A node in a dag
 *
 * All methods inherented from dag apply as if this node were the sole root of
 * the dag. In adition, nodes have several properties that can be set and read.
 * There are also methods to access this nodes children and links.
 */
export interface DagNode<NodeDatum = unknown, LinkDatum = unknown>
  extends Dag<NodeDatum, LinkDatum> {
  readonly data: NodeDatum;
  value?: number;
  x?: number;
  y?: number;

  /**
   * Return an iterable over this node's child nodes
   */
  ichildren(): FluentIterable<DagNode<NodeDatum, LinkDatum>>;

  /**
   * Return an array of this node's child nodes
   */
  children(): DagNode<NodeDatum, LinkDatum>[];

  /**
   * Return an iterator of links between this node and its children
   */
  ichildLinks(): FluentIterable<DagLink<NodeDatum, LinkDatum>>;

  /**
   * Returns an array of links between this node and its children
   */
  childLinks(): DagLink<NodeDatum, LinkDatum>[];
}
