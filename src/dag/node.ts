/**
 * A {@link Dag} is simply a collection of {@link DagNode}s, defined by every reachable
 * child node from the current returned node.  If a DAG contains multiple
 * roots, then the returned node will be a {@link DagRoot} that links to all nodes.
 * Each child node on its own will function as a valid DAG with a single root.
 * All DAGs are also iterators over all of their nodes.
 *
 * Three methods exist to turn existing data into {@link Dag}s:
 * 1. {@link "dag/hierarchy" | dagHierarchy} - when the data already has a dag structure.
 * 2. {@link "dag/stratify" | dagStratify } - when the dag has a tabular structure, referencing parents by id.
 * 3. {@link "dag/connect" | dagConnect } - when the dag has a link structure and is specified as pairs of nodes.
 *
 * Methods names preceeded by an `i` will return a {@link FluentIterable} which is
 * a wrapper around native EMCA iterators that also adds most methods found in
 * the `Array` prototype making them much more useful for fluent functional
 * programming.
 *
 * @module
 */

import { FluentIterable, fluent } from "../iters";
import { assert, def, dfs } from "../utils";

/** @internal */
export class LayoutChildLink<NodeDatum, LinkDatum> {
  constructor(
    readonly child: DagNode<NodeDatum, LinkDatum>,
    public data: LinkDatum,
    public points: { x: number; y: number }[] = []
  ) {}
}

/**
 * The concrete class backing the {@link Link} interface.
 */
export class LayoutLink<NodeDatum, LinkDatum> {
  constructor(
    readonly source: DagNode<NodeDatum, LinkDatum>,
    readonly target: DagNode<NodeDatum, LinkDatum>,
    readonly data: LinkDatum,
    readonly points: { x: number; y: number }[]
  ) {}
}

/**
 * The concreate implementation of {@link DagNode}, this forwards most calls to a
 * singleton {@link LayoutDagRoot} with the exception of children methods, as
 * {@link DagRoot}s don't have children.
 */
export class LayoutDagNode<NodeDatum, LinkDatum> {
  dataChildren: ChildLink<NodeDatum, LinkDatum>[] = [];
  value?: number;
  x?: number;
  y?: number;

  constructor(public data: NodeDatum) {}

  /** An iterator of this node. */
  iroots(): FluentIterable<DagNode<NodeDatum, LinkDatum>> {
    return fluent([this]);
  }

  /** An array of this node. */
  roots(): DagNode<NodeDatum, LinkDatum>[] {
    return [this];
  }

  private *iterChildren(): Iterator<DagNode<NodeDatum, LinkDatum>> {
    for (const { child } of this.dataChildren) {
      yield child;
    }
  }

  /** An iterator of this node's children. */
  ichildren(): FluentIterable<DagNode<NodeDatum, LinkDatum>> {
    return fluent(this.iterChildren());
  }

  /** An array of this node's children. */
  children(): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.ichildren()];
  }

  private *iterChildLinks(): Iterator<Link<NodeDatum, LinkDatum>> {
    for (const { child, data, points } of this.dataChildren) {
      yield new LayoutLink(this, child, data, points);
    }
  }

  /** An iterator of links between this node and its children. */
  ichildLinks(): FluentIterable<Link<NodeDatum, LinkDatum>> {
    return fluent(this.iterChildLinks());
  }

  /** An array of links between this node and its children. */
  childLinks(): Link<NodeDatum, LinkDatum>[] {
    return [...this.ichildLinks()];
  }

  [Symbol.iterator](): Iterator<DagNode<NodeDatum, LinkDatum>> {
    return new LayoutDagRoot([this])[Symbol.iterator]();
  }

  idescendants(
    style: IterStyle = "depth"
  ): FluentIterable<DagNode<NodeDatum, LinkDatum>> {
    return new LayoutDagRoot([this]).idescendants(style);
  }

  descendants(style: IterStyle = "depth"): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.idescendants(style)];
  }

  ilinks(): FluentIterable<Link<NodeDatum, LinkDatum>> {
    return new LayoutDagRoot([this]).ilinks();
  }

  links(): Link<NodeDatum, LinkDatum>[] {
    return [...this.ilinks()];
  }

  size(): number {
    return new LayoutDagRoot([this]).size();
  }

  sum(
    callback: (node: DagNode<NodeDatum, LinkDatum>, index: number) => number
  ): this {
    new LayoutDagRoot([this]).sum(callback);
    return this;
  }

  count(): this {
    new LayoutDagRoot([this]).count();
    return this;
  }

  height(): this {
    new LayoutDagRoot([this]).height();
    return this;
  }

  depth(): this {
    new LayoutDagRoot([this]).depth();
    return this;
  }

  *isplit(): Generator<Dag<NodeDatum, LinkDatum>> {
    yield this;
  }

  split(): DagNode<NodeDatum, LinkDatum>[] {
    return [this];
  }

  connected(): true {
    return true;
  }
}

/**
 * The concrete implementation backing {@link DagRoot} which also contains the
 * implementation of most methods in {@link DagNode}.
 */
export class LayoutDagRoot<NodeDatum, LinkDatum>
  implements Iterable<DagNode<NodeDatum, LinkDatum>> {
  constructor(public dagRoots: DagNode<NodeDatum, LinkDatum>[]) {}

  [Symbol.iterator](): Iterator<DagNode<NodeDatum, LinkDatum>> {
    return this.idepth();
  }

  /**
   * This returns an iterator over every root in the {@link Dag}. Since
   * {@link DagNode}s return themselves for this call, this can be an easy way to
   * turn a {@link Dag} into an array of {@link DagNode}s.
   */
  iroots(): FluentIterable<DagNode<NodeDatum, LinkDatum>> {
    return fluent(this.dagRoots);
  }

  /** Returns an array of roots. */
  roots(): DagNode<NodeDatum, LinkDatum>[] {
    return this.dagRoots.slice();
  }

  private *idepth(): Generator<DagNode<NodeDatum, LinkDatum>> {
    const ch = (node: DagNode<NodeDatum, LinkDatum>) => node.ichildren();
    for (const node of dfs(ch, ...this.iroots())) {
      yield node;
    }
  }

  private *ibreadth(): Generator<DagNode<NodeDatum, LinkDatum>> {
    const seen = new Set<DagNode>();
    let next = this.roots();
    let current: DagNode<NodeDatum, LinkDatum>[] = [];
    do {
      current = next.reverse();
      next = [];
      let node;
      while ((node = current.pop())) {
        if (!seen.has(node)) {
          seen.add(node);
          yield node;
          next.push(...node.ichildren());
        }
      }
    } while (next.length);
  }

  private *ibefore(): Generator<DagNode<NodeDatum, LinkDatum>> {
    const numBefore = new Map<DagNode, number>();
    for (const node of this) {
      for (const child of node.ichildren()) {
        numBefore.set(child, (numBefore.get(child) || 0) + 1);
      }
    }

    const queue = this.roots();
    let node;
    while ((node = queue.pop())) {
      yield node;
      for (const child of node.ichildren()) {
        const before = def(numBefore.get(child));
        if (before > 1) {
          numBefore.set(child, before - 1);
        } else {
          queue.push(child);
        }
      }
    }
  }

  private *iafter(): Generator<DagNode<NodeDatum, LinkDatum>> {
    const queue = this.roots();
    const seen = new Set<DagNode>();
    let node;
    while ((node = queue.pop())) {
      if (seen.has(node)) {
        // noop
      } else if (node.ichildren().every((c) => seen.has(c))) {
        seen.add(node);
        yield node;
      } else {
        queue.push(node); // need to revisit after children
        queue.push(...node.ichildren());
      }
    }
  }

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
    style: IterStyle = "depth"
  ): FluentIterable<DagNode<NodeDatum, LinkDatum>> {
    if (style === "depth") {
      return fluent(this.idepth());
    } else if (style === "breadth") {
      return fluent(this.ibreadth());
    } else if (style === "before") {
      return fluent(this.ibefore());
    } else if (style === "after") {
      return fluent(this.iafter());
    } else {
      throw new Error(`unknown iteration style: ${style}`);
    }
  }

  /** Returns an array of {@link idescendants}. */
  descendants(style: IterStyle = "depth"): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.idescendants(style)];
  }

  /** Returns an iterator over every {@link Link} in the DAG. */
  ilinks(): FluentIterable<Link<NodeDatum, LinkDatum>> {
    return this.idescendants().flatMap((node) => node.ichildLinks());
  }

  /** Returns an array of {@link ilinks}. */
  links(): Link<NodeDatum, LinkDatum>[] {
    return [...this.ilinks()];
  }

  /** Counts the number of nodes in the DAG. */
  size(): number {
    return this.idescendants().reduce((s) => s + 1, 0);
  }

  /**
   * Provide a callback that computes a number for each node, then set a node's
   * value to the sum of this number for this node and all of its descendants.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  sum(
    callback: (node: DagNode<NodeDatum, LinkDatum>, index: number) => number
  ): this {
    const descendantVals = new Map<DagNode, Map<DagNode, number>>();
    for (const [index, node] of this.idescendants("after").entries()) {
      const val = callback(node, index);
      const nodeVals = new Map<DagNode, number>();
      nodeVals.set(node, val);
      for (const child of node.ichildren()) {
        const childMap = def(descendantVals.get(child));
        for (const [child, v] of childMap.entries()) {
          nodeVals.set(child, v);
        }
      }
      node.value = fluent(nodeVals.values()).reduce((a, b) => a + b);
      descendantVals.set(node, nodeVals);
    }
    return this;
  }

  /**
   * Set the value of each node to be the number of leaves beneath the node.
   * If this node is a leaf, its value is one.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  count(): this {
    const leaves = new Map<DagNode, Set<DagNode>>();
    for (const node of this.idescendants("after")) {
      if (node.ichildren()[Symbol.iterator]().next().done) {
        leaves.set(node, new Set([node]));
        node.value = 1;
      } else {
        const nodeLeaves = new Set<DagNode>();
        for (const child of node.ichildren()) {
          const childLeaves = def(leaves.get(child));
          for (const leaf of childLeaves) {
            nodeLeaves.add(leaf);
          }
        }
        leaves.set(node, nodeLeaves);
        node.value = nodeLeaves.size;
      }
    }
    return this;
  }

  /**
   * Assign each node a value equal to its longest distance from a root.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  height(): this {
    for (const node of this.idescendants("after")) {
      node.value = Math.max(
        0,
        ...node.ichildren().map((child) => def(child.value) + 1)
      );
    }
    return this;
  }

  /**
   * Assign each node a value equal to its longest distance to a leaf.
   *
   * This method returns {@link ValuedNode}s that also have a value property.
   */
  depth(): this {
    const parents = new Map<DagNode, DagNode[]>();
    for (const node of this) {
      for (const child of node.ichildren()) {
        const pars = parents.get(child);
        if (pars) {
          pars.push(node);
        } else {
          parents.set(child, [node]);
        }
      }
    }
    for (const node of this.idescendants("before")) {
      node.value = Math.max(
        0,
        ...(parents.get(node) || []).map((par) => def(par.value) + 1)
      );
    }
    return this;
  }

  /** split but iterable */
  *isplit(): Generator<Dag<NodeDatum, LinkDatum>> {
    // create parents
    const parents = new Map<DagNode, DagNode<NodeDatum, LinkDatum>[]>();
    for (const node of this) {
      for (const child of node.ichildren()) {
        const pars = parents.get(child);
        if (pars) {
          pars.push(node);
        } else {
          parents.set(child, [node]);
        }
      }
    }

    // "children" function that returns children and parents
    function* graph(
      node: DagNode<NodeDatum, LinkDatum>
    ): Generator<DagNode<NodeDatum, LinkDatum>> {
      for (const child of node.ichildren()) {
        yield child;
      }
      for (const par of parents.get(node) || []) {
        yield par;
      }
    }

    // dfs over roots, tracing parents too
    const available = new Set(this.iroots());
    for (const root of this.iroots()) {
      if (!available.delete(root)) continue;
      const connected = [root];
      for (const node of dfs(graph, root)) {
        if (available.delete(node)) {
          connected.push(node);
        }
      }

      // yield all connected roots
      yield connected.length > 1 ? new LayoutDagRoot(connected) : connected[0];
    }
  }

  /**
   * Returns an array of connected DAGs, splitting the DAG into several
   * components if its dosconnected.
   */
  split(): Dag<NodeDatum, LinkDatum>[] {
    return [...this.isplit()];
  }

  /**
   * Return true if every node in the dag is reachable from every other.
   */
  connected(): boolean {
    const iter = this.isplit();
    let { done } = iter.next();
    assert(!done, "internal error: dag was somehow empty");
    ({ done } = iter.next());
    return !!done;
  }
}

/** All available styles of node iteration. */
export type IterStyle = "depth" | "breadth" | "before" | "after";

/** @internal */
export type ChildLink<NodeDatum, LinkDatum> = LayoutChildLink<
  NodeDatum,
  LinkDatum
>;

/** The public facing interface backed by the {@link LayoutLink} implementation. */
export type Link<NodeDatum = unknown, LinkDatum = unknown> = LayoutLink<
  NodeDatum,
  LinkDatum
>;

/** The public facing interface backed by the {@link LayoutDagNode} implementation. */
export type DagNode<NodeDatum = unknown, LinkDatum = unknown> = LayoutDagNode<
  NodeDatum,
  LinkDatum
>;

/** The public facing interface backed by the {@link LayoutDagRoot} implementation. */
export type DagRoot<NodeDatum = unknown, LinkDatum = unknown> = LayoutDagRoot<
  NodeDatum,
  LinkDatum
>;

/**
 * The union of a {@link DagNode} and {@link DagRoot}, representing the return value of
 * a Dag constructor. Since the interface between {@link DagNode}s and {@link DagRoot}s
 * is almost identical, this union is mostly inconsequential, and all methods
 * can be fond within {@link LayoutDagRoot}.
 */
export type Dag<NodeDatum = unknown, LinkDatum = unknown> =
  | DagNode<NodeDatum, LinkDatum>
  | DagRoot<NodeDatum, LinkDatum>;
