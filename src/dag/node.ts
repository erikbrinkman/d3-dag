/**
 * A [[Dag]] is simply a collection of [[DagNode]]s, defined by every reachable
 * child node from the current returned node.  If a DAG contains multiple
 * roots, then the returned node will be a [[DagRoot]] that links to all nodes.
 * Each child node on its own will function as a valid DAG with a single root.
 * All DAGs are also iterators over all of their nodes.
 *
 * Three methods exist to turn existing data into [[Dag]]s:
 * 1. [["dag/hierarchy" | dagHierarchy]] - when the data already has a dag structure.
 * 2. [["dag/stratify" | dagStratify ]] - when the dag has a tabular structure, referencing parents by id.
 * 3. [["dag/connect" | dagConnect ]] - when the dag has a link structure and is specified as pairs of nodes.
 *
 * Methods names preceeded by an `i` will return a [[FluentIterable]] which is
 * a wrapper around native EMCA iterators that also adds most methods found in
 * the `Array` prototype making them much more useful for fluent functional
 * programming.
 *
 * @packageDocumentation
 */

import { FluentIterable, fluent } from "../iters";
import { SafeMap, setIntersect } from "../utils";

/** @internal */
export class LayoutChildLink<
  LinkDatum,
  NodeType extends DagNode<unknown, LinkDatum>
> {
  constructor(
    readonly child: NodeType,
    public data: LinkDatum,
    public points: { x: number; y: number }[] = []
  ) {}
}

/**
 * The concrete class backing the [[Link]] interface.
 */
export class LayoutLink<NodeType extends DagNode> {
  constructor(
    readonly source: NodeType,
    readonly target: NodeType,
    // NOTE this is a trick to not have to parametrize Links, and therefore
    // DagRoot, and therefore Dag by LinkDatum, when the NodeType implcitely
    // defines it
    readonly data: NodeType["dataChildren"][0]["data"],
    readonly points: { x: number; y: number }[]
  ) {}
}

/**
 * The concreate implementation of [[DagNode]], this forwards most calls to a
 * singleton [[LayoutDagRoot]] with the exception of children methods, as
 * [[DagRoot]]s don't have children.
 */
export class LayoutDagNode<NodeDatum, LinkDatum> {
  dataChildren: ChildLink<LinkDatum, this>[] = [];
  value?: number;

  constructor(readonly id: string, public data: NodeDatum) {}

  /** An iterator of this node. */
  iroots(): FluentIterable<this> {
    return fluent([this]);
  }

  /** An array of this node. */
  roots(): this[] {
    return [this];
  }

  private *iterChildren(): Iterator<this> {
    for (const { child } of this.dataChildren) {
      yield child;
    }
  }

  /** An iterator of this node's children. */
  ichildren(): FluentIterable<this> {
    return fluent(this.iterChildren());
  }

  /** An array of this node's children. */
  children(): this[] {
    return [...this.ichildren()];
  }

  private *iterChildLinks(): Iterator<Link<this>> {
    for (const { child, data, points } of this.dataChildren) {
      yield new LayoutLink(this, child, data, points);
    }
  }

  /** An iterator of links between this node and its children. */
  ichildLinks(): FluentIterable<Link<this>> {
    return fluent(this.iterChildLinks());
  }

  /** An array of links between this node and its children. */
  childLinks(): Link<this>[] {
    return [...this.ichildLinks()];
  }

  [Symbol.iterator](): Iterator<this> {
    return new LayoutDagRoot([this])[Symbol.iterator]();
  }

  idescendants(style: IterStyle = "depth"): FluentIterable<this> {
    return new LayoutDagRoot([this]).idescendants(style);
  }

  descendants(style: IterStyle = "depth"): this[] {
    return [...this.idescendants(style)];
  }

  ilinks(): FluentIterable<Link<this>> {
    return new LayoutDagRoot([this]).ilinks();
  }

  links(): Link<this>[] {
    return [...this.ilinks()];
  }

  size(): number {
    return new LayoutDagRoot([this]).size();
  }

  sum(callback: (node: this, index: number) => number): this & ValuedNode {
    new LayoutDagRoot([this]).sum(callback);
    return this as this & ValuedNode;
  }

  count(): this & ValuedNode {
    new LayoutDagRoot([this]).count();
    return this as this & ValuedNode;
  }

  height(): this & ValuedNode {
    new LayoutDagRoot([this]).height();
    return this as this & ValuedNode;
  }

  depth(): this & ValuedNode {
    new LayoutDagRoot([this]).depth();
    return this as this & ValuedNode;
  }

  split(): this[] {
    return [this];
  }

  connected(): true {
    return true;
  }
}

/**
 * The concrete implementation backing [[DagRoot]] which also contains the
 * implementation of most methods in [[DagNode]].
 */
export class LayoutDagRoot<NodeType extends DagNode>
  implements Iterable<NodeType> {
  constructor(public dagRoots: NodeType[]) {}

  [Symbol.iterator](): Iterator<NodeType> {
    return this.idepth();
  }

  /**
   * This returns an iterator over every root in the [[Dag]]. Since
   * [[DagNode]]s return themselves for this call, this can be an easy way to
   * turn a [[Dag]] into an array of [[DagNode]]s.
   */
  iroots(): FluentIterable<NodeType> {
    return fluent(this.dagRoots);
  }

  /** Returns an array of roots. */
  roots(): NodeType[] {
    return this.dagRoots.slice();
  }

  private *idepth(): Generator<NodeType> {
    const queue = this.roots();
    const seen = new Set<string>();
    let node;
    while ((node = queue.pop())) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        yield node;
        queue.push(...node.ichildren());
      }
    }
  }

  private *ibreadth(): Generator<NodeType> {
    const seen = new Set<string>();
    let next = this.roots();
    let current: NodeType[] = [];
    do {
      current = next.reverse();
      next = [];
      let node;
      while ((node = current.pop())) {
        if (!seen.has(node.id)) {
          seen.add(node.id);
          yield node;
          next.push(...node.ichildren());
        }
      }
    } while (next.length);
  }

  private *ibefore(): Generator<NodeType> {
    const numBefore = new SafeMap<string, number>();
    for (const node of this) {
      for (const child of node.ichildren()) {
        numBefore.set(child.id, numBefore.getDefault(child.id, 0) + 1);
      }
    }

    const queue = this.roots();
    let node;
    while ((node = queue.pop())) {
      yield node;
      for (const child of node.ichildren()) {
        const before = numBefore.getThrow(child.id);
        if (before > 1) {
          numBefore.set(child.id, before - 1);
        } else {
          queue.push(child);
        }
      }
    }
  }

  private *iafter(): Generator<NodeType> {
    const queue = this.roots();
    const seen = new Set<string>();
    let node;
    while ((node = queue.pop())) {
      if (seen.has(node.id)) {
        // noop
      } else if (node.ichildren().every((c) => seen.has(c.id))) {
        seen.add(node.id);
        yield node;
      } else {
        queue.push(node); // need to revisit after children
        queue.push(...node.ichildren());
      }
    }
  }

  /**
   * Returns an iterator over all descendants of this node, e.g. every node in
   * the [[Dag]]. An [[IterStyle]] can be passed in to influence the iteration
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
  idescendants(style: IterStyle = "depth"): FluentIterable<NodeType> {
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

  /** Returns an array of [[idescendants]]. */
  descendants(style: IterStyle = "depth"): NodeType[] {
    return [...this.idescendants(style)];
  }

  /** Returns an iterator over every [[Link]] in the DAG. */
  ilinks(): FluentIterable<Link<NodeType>> {
    return this.idescendants().flatMap((node) => node.ichildLinks());
  }

  /** Returns an array of [[ilinks]]. */
  links(): Link<NodeType>[] {
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
   * This method returns [[ValuedNode]]s that also have a value property.
   */
  sum(
    callback: (node: NodeType, index: number) => number
  ): DagRoot<NodeType & ValuedNode> {
    const descendantVals = new SafeMap<string, SafeMap<string, number>>();
    for (const [index, node] of this.idescendants("after").entries()) {
      const val = callback(node, index);
      const nodeVals = new SafeMap<string, number>();
      nodeVals.set(node.id, val);
      for (const child of node.ichildren()) {
        const childMap = descendantVals.getThrow(child.id);
        for (const [nid, v] of childMap.entries()) {
          nodeVals.set(nid, v);
        }
      }
      node.value = fluent(nodeVals.entries())
        .map(([, v]) => v)
        .reduce((a, b) => a + b);
      descendantVals.set(node.id, nodeVals);
    }
    return this as DagRoot<NodeType & ValuedNode>;
  }

  /**
   * Set the value of each node to be the number of leaves beneath the node.
   * If this node is a leaf, its value is one.
   *
   * This method returns [[ValuedNode]]s that also have a value property.
   */
  count(): DagRoot<NodeType & ValuedNode> {
    const leaves = new SafeMap<string, Set<string>>();
    for (const node of this.idescendants("after")) {
      if (node.ichildren()[Symbol.iterator]().next().done) {
        leaves.set(node.id, new Set([node.id]));
        node.value = 1;
      } else {
        const nodeLeaves = new Set<string>();
        for (const child of node.ichildren()) {
          const childLeaves = leaves.getThrow(child.id);
          for (const leaf of childLeaves) {
            nodeLeaves.add(leaf);
          }
        }
        leaves.set(node.id, nodeLeaves);
        node.value = nodeLeaves.size;
      }
    }
    return this as DagRoot<NodeType & ValuedNode>;
  }

  /**
   * Assign each node a value equal to its longest distance from a root.
   *
   * This method returns [[ValuedNode]]s that also have a value property.
   */
  height(): DagRoot<NodeType & ValuedNode> {
    for (const node of this.idescendants("after")) {
      node.value = Math.max(
        0,
        ...node.ichildren().map((child) => {
          /* istanbul ignore next */
          if (child.value === undefined) {
            throw new Error("`after` iteration didn't iterate in after order");
          } else {
            return child.value + 1;
          }
        })
      );
    }
    return this as DagRoot<NodeType & ValuedNode>;
  }

  /**
   * Assign each node a value equal to its longest distance to a leaf.
   *
   * This method returns [[ValuedNode]]s that also have a value property.
   */
  depth(): DagRoot<NodeType & ValuedNode> {
    const parents = new SafeMap<string, NodeType[]>();
    for (const node of this) {
      for (const child of node.ichildren()) {
        parents.setIfAbsent(child.id, []).push(node);
      }
    }
    for (const node of this.idescendants("before")) {
      node.value = Math.max(
        0,
        ...parents.getDefault(node.id, []).map((par) => {
          /* istanbul ignore next */
          if (par.value === undefined) {
            throw new Error(
              "`before` iteration didn't iterate in before order"
            );
          } else {
            return par.value + 1;
          }
        })
      );
    }
    return this as DagRoot<NodeType & ValuedNode>;
  }

  /**
   * Returns an array of connected DAGs, splitting the DAG into several
   * components if its dosconnected.
   */
  split(): Dag<NodeType>[] {
    // construct a graph between root nodes with edges if they share
    // descendants
    const children = new SafeMap<string, NodeType[]>();
    const descendants = new SafeMap<string, Set<string>>();
    for (const root of this.iroots()) {
      children.set(root.id, []);
      descendants.set(
        root.id,
        new Set<string>(root.idescendants().map((n) => n.id))
      );
    }
    for (const [i, source] of this.iroots().entries()) {
      const sourceCov = descendants.getThrow(source.id);
      for (const target of this.iroots().slice(i + 1)) {
        const targetCov = descendants.getThrow(target.id);
        if (setIntersect(sourceCov, targetCov)) {
          children.getThrow(source.id).push(target);
          children.getThrow(target.id).push(source);
        }
      }
    }

    // now run dfs to collect connected components
    const splitRoots: NodeType[][] = [];
    const seen = new Set<string>();
    for (const root of this.iroots()) {
      if (!seen.has(root.id)) {
        seen.add(root.id);
        const connected = [root];
        splitRoots.push(connected);
        const queue = children.getThrow(root.id).slice();
        let node;
        while ((node = queue.pop())) {
          if (!seen.has(node.id)) {
            seen.add(node.id);
            connected.push(node);
            queue.push(...children.getThrow(node.id));
          }
        }
      }
    }
    return splitRoots.map((sroots) =>
      sroots.length > 1 ? new LayoutDagRoot(sroots) : sroots[0]
    );
  }

  /**
   * Return true if every node in the dag is reachable from every other.
   */
  connected(): boolean {
    return this.split().length === 1;
  }
}

/** All available styles of node iteration. */
type IterStyle = "depth" | "breadth" | "before" | "after";

/** A mixin for when a node is assigned a value property by a method. */
export interface ValuedNode {
  value: number;
}

/** @internal */
export type ChildLink<
  LinkDatum,
  NodeType extends DagNode<unknown, LinkDatum> = DagNode<unknown, LinkDatum>
> = LayoutChildLink<LinkDatum, NodeType>;

/** The public facing interface backed by the [[LayoutLink]] implementation. */
export type Link<NodeType extends DagNode = DagNode> = LayoutLink<NodeType>;

/** The public facing interface backed by the [[LayoutDagNode]] implementation. */
export type DagNode<NodeDatum = unknown, LinkDatum = unknown> = LayoutDagNode<
  NodeDatum,
  LinkDatum
>;

/** The public facing interface backed by the [[LayoutDagRoot]] implementation. */
export type DagRoot<
  NodeType extends DagNode = DagNode
> = LayoutDagRoot<NodeType>;

/**
 * The union of a [[DagNode]] and [[DagRoot]], representing the return value of
 * a Dag constructor. Since the interface between [[DagNode]]s and [[DagRoot]]s
 * is almost identical, this union is mostly inconsequential, and all methods
 * can be fond within [[LayoutDagRoot]].
 */
export type Dag<NodeType extends DagNode = DagNode> =
  | NodeType
  | DagRoot<NodeType>;
