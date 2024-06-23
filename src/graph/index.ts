import {
  setMultimapAdd,
  setMultimapDelete,
  setNext,
  setPop,
} from "../collections";
import { chain, filter, map } from "../iters";
import { dfs, err, ierr } from "../utils";
import { toJson } from "./json";

// ---------- //
// Interfaces //
// ---------- //

/**
 * a way to enforce specific rankings of nodes
 *
 * A rank accessor assigns a numeric rank to some nodes. In general, nodes with
 * a lower rank come *before* nodes with a higher rank. Layering operators that
 * take a rank accessor additionally guarantee that nodes with the same rank
 * will share the same layer (if possible).
 *
 * @example
 *
 * This example demonstrates passing through a rank value that might exist on a
 * node.
 *
 * ```ts
 * function memberRank({ data }: GraphNode<{ rank?: number }>): number | undefined {
 *   return data.rank;
 * }
 * ```
 */
export interface Rank<in NodeDatum = never, in LinkDatum = never> {
  /**
   * compute the rank of a node
   *
   * @param node - the node to compute the rank of
   * @returns rank - the rank of the node; if defined lower ranks indicate
   *   nodes that come earlier (lower y's)
   */
  (node: GraphNode<NodeDatum, LinkDatum>): number | undefined;
}

/**
 * a link between nodes, with attached information
 *
 * The immutable version of {@link MutGraphLink}.
 */
export interface GraphLink<out NodeDatum = unknown, out LinkDatum = unknown> {
  /** The dag node this link comes from */
  readonly source: GraphNode<NodeDatum, LinkDatum>;

  /** The dag node this link goes to */
  readonly target: GraphNode<NodeDatum, LinkDatum>;

  /** layout control points assigned to the link */
  points: [number, number][];

  /** user data attached to this link */
  data: LinkDatum;
}

/**
 * a mutable link between nodes
 *
 * The mutable version of {@link GraphLink}.
 */
export interface MutGraphLink<in out NodeDatum, in out LinkDatum>
  extends GraphLink<NodeDatum, LinkDatum> {
  // NOTE redefined to specify mutability
  readonly source: MutGraphNode<NodeDatum, LinkDatum>;
  readonly target: MutGraphNode<NodeDatum, LinkDatum>;

  /** remove this link from the graph */
  delete(): void;
}

/**
 * A graph representation
 *
 * Graphs are collections of {@link GraphNode}s, held together by
 * {@link GraphLink}s, although there's no requirement that they're connected.
 * Graphs support iterating over their {@link nodes} and {@link links} as well
 * as checking if certain properties hold. Each node is also defined as a graph
 * of just its connected component, so all methods of a graph also apply to any
 * individual node, treated as all nodes reachable from the current node.
 *
 * The structure of a Graph is immutable, allowing for appropriate variance
 * with readonly methods. For a graph whos structure can be modified, see
 * {@link MutGraph}.
 *
 * Methods names preceeded by an `n` will return a number, often the length of
 * the iterable produces by the method sans-prefix.
 */
export interface Graph<out NodeDatum = unknown, out LinkDatum = unknown> {
  /**
   * an iterator over every {@link GraphNode | node} in the graph
   *
   * @remarks
   * Be careful not to modify the graph structure while iterating as any
   * modification, including adding or removing links, can change the behavior
   * of iteration giving unexpected results. If you want to guarantee
   * consistent iteration, allocating an array first with `[...graph.nodes()]` will
   * ensure consistent iteration.
   */
  nodes(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /**
   * compute a topological order of the graph
   *
   * If the graph can't be represented in topological order, this will try to
   * minimize the number of edge inversions. Optimally minimizing inversions is
   * np-complete, so this will only be approximate.
   *
   * You can optionally specify a {@link Rank} accessor that defines a
   * numerical rank for every node. Nodes with a lower rank will come before
   * nodes of a higher rank even if that requires more edge inversions. Nodes
   * without a rank are unconstrained.
   */
  topological(
    rank?: Rank<NodeDatum, LinkDatum>,
  ): GraphNode<NodeDatum, LinkDatum>[];

  /**
   * an iterator over every {@link GraphLink | link} in the graph
   */
  links(): IterableIterator<GraphLink<NodeDatum, LinkDatum>>;

  /** the number of nodes in the graph */
  nnodes(): number;

  /** the number of links in the graph */
  nlinks(): number;

  /**
   * an iterator over the roots of the graph
   *
   * The roots are defined as a set of nodes such that every node in the graph
   * is a descendant of one of the roots, an no root is a descendant of any
   * other root. It is guaranteed to include every node with no parents, but
   * one node in a cycle may be chosen if there is no unique root for that
   * cycle.
   *
   * @remarks the current implementation will return a minimal root set as long
   * as source cycles contain a node with a single parent.
   */
  roots(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /**
   * an iterator over the leaves of the graph
   *
   * The leaves are defined as a set of nodes such that every node in the graph
   * is an ancestor of one of the leaves, an no leaf is an ancestor of any
   * other leaf. It is guaranteed to include every node with no children, but
   * one node in a cycle may be chosen if there is no unique leaf for that
   * cycle.
   *
   * @remarks the current implementation will return a minimal leaf set as long
   * as target cycles contain a node with a single child.
   */
  leaves(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /**
   * split a graph into connected components
   *
   * @remarks
   * Since each node behaves like a graph of its connected component,
   * this is equivalent with returning a graph of each connected component.
   *
   * @returns splits an iterable over a single node in each connected
   * component
   */
  split(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /**
   * true if every node in the graph is reachable from every other
   */
  connected(): boolean;

  /**
   * true if at least one node in this graph has multiple links to the same child
   */
  multi(): boolean;

  /**
   * true if there no cycles in the graph
   */
  acyclic(): boolean;

  /**
   * serialize the graph
   *
   * @remarks this is intended to be called automatically by `JSON.stringify`.
   */
  toJSON(): unknown;
}

/**
 * a mutable graph representation
 *
 * In addition to all of the methods inherent to {@link Graph}s, this also
 * allows structure graph modification with the {@link node} and {@link link}
 * methods to either create an empty node or create a link between two nodes.
 * Nodes and links can be removed with the delete method on
 * {@link MutGraphNode#delete | nodes} and {@link MutGraphLink#delete | links}.
 *
 * ## Performance
 *
 * In order to keep track of caches, internally adding links runs union-find
 * which has near, but not quite, constant complexity. However, various methods
 * can run in linear time making some access patterns run in worst case
 * quadratic if they're called in between modifications. This was ultimately
 * deemed acceptable as all modification will likely come before a layout, and
 * that will always take linear time.
 */
export interface MutGraph<in out NodeDatum, in out LinkDatum>
  extends Graph<NodeDatum, LinkDatum> {
  // NOTE redefined to specify mutability
  nodes(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;
  links(): IterableIterator<MutGraphLink<NodeDatum, LinkDatum>>;
  split(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;
  roots(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;
  leaves(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;

  /**
   * add a new node with datum
   *
   * If `undefined` extends NodeDatum, datum can be elided and simply called as
   * ```ts
   * grf.node();
   * ```
   */
  node(
    ...datum: undefined extends NodeDatum
      ? [datum?: NodeDatum]
      : [datum: NodeDatum]
  ): MutGraphNode<NodeDatum, LinkDatum>;

  /**
   * add a new link from source to target
   *
   * If `undefined` extends LinkDatum, datum can be elided and simply called as
   * ```ts
   * grf.link(source, target);
   * ```
   */
  link(
    source: MutGraphNode<NodeDatum, LinkDatum>,
    target: MutGraphNode<NodeDatum, LinkDatum>,
    ...datum: undefined extends LinkDatum
      ? [datum?: LinkDatum]
      : [datum: LinkDatum]
  ): MutGraphLink<NodeDatum, LinkDatum>;
}

export interface GraphNodeMixin<out NodeDatum, out LinkDatum> {
  /** user data for this node */
  data: NodeDatum;

  /** raw (possibly undefined) x coordinate for a node */
  ux?: number | undefined;

  /** raw (possibly undefined) y coordinate for a node */
  uy?: number | undefined;

  /**
   * view of {@link ux} that throws if ux is undefined
   */
  x: number;

  /**
   * view of {@link uy} that throws if uy is undefined
   */
  y: number;

  /** the number of unique parent nodes */
  nparents(): number;

  /** the number of unique child nodes */
  nchildren(): number;

  /** the number of parent links */
  nparentLinks(): number;

  /** the number of child links */
  nchildLinks(): number;

  /** the number of links from a specific node */
  nparentLinksTo(node: GraphNode<NodeDatum, LinkDatum>): number;

  /** iterator over every link from a specific node */
  parentLinksTo(
    node: GraphNode<NodeDatum, LinkDatum>,
  ): IterableIterator<GraphLink<NodeDatum, LinkDatum>>;

  /** the number of links to a specific node */
  nchildLinksTo(node: GraphNode<NodeDatum, LinkDatum>): number;

  /** iterator over every link to a specific node */
  childLinksTo(
    node: GraphNode<NodeDatum, LinkDatum>,
  ): IterableIterator<GraphLink<NodeDatum, LinkDatum>>;

  /** iterator over this node's unique parent nodes */
  parents(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /** iterator over this node's unique child nodes */
  children(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /** iterator over this node's unique parent nodes and the number of links from them */
  parentCounts(): IterableIterator<[GraphNode<NodeDatum, LinkDatum>, number]>;

  /** iterator over this node's unique child nodes and the number of links to them */
  childCounts(): IterableIterator<[GraphNode<NodeDatum, LinkDatum>, number]>;

  /**
   * iterator of links to this node from its parents
   *
   * The order of links is guaranteed to not change between iterations.
   */
  parentLinks(): IterableIterator<GraphLink<NodeDatum, LinkDatum>>;

  /**
   * iterator of links from this node to its children
   *
   * The order of links is guaranteed to not change between iterations.
   */
  childLinks(): IterableIterator<GraphLink<NodeDatum, LinkDatum>>;

  /**
   * iterator of all nodes reachable though parents
   *
   * The iterator includes this node.
   */
  ancestors(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;

  /**
   * iterator of all nodes reachable though children
   *
   * The iterator includes this node.
   */
  descendants(): IterableIterator<GraphNode<NodeDatum, LinkDatum>>;
}

/**
 * a node in a graph
 *
 * Nodes provide all the same interfaces that {@link Graph}s do in terms of
 * node properties and iteration. When called on a node, the nodes behaves as a
 * graph of just its connected component. Therefore new nodes will always be
 * {@link acyclic}, {@link connected}, and not {@link multi}.
 *
 * In addition, nodes also expose properties of their immediate neighborhoods,
 * iterators and counts of nodes they directly touch.
 *
 * This is the immutable version of {@link MutGraphNode}.
 */
export interface GraphNode<out NodeDatum = unknown, out LinkDatum = unknown>
  extends Graph<NodeDatum, LinkDatum>,
    GraphNodeMixin<NodeDatum, LinkDatum> {}

/**
 * a mutable node in a graph
 *
 * This possesses all of the methods of both {@link MutGraph} and {@link
 * GraphNode}, while also adding the ability to directly add {@link parent}s or
 * {@link child}ren and to {@link delete | remove} the node and all links from
 * the graph.
 */
export interface MutGraphNode<in out NodeDatum, in out LinkDatum>
  extends MutGraph<NodeDatum, LinkDatum>,
    GraphNodeMixin<NodeDatum, LinkDatum> {
  // NOTE the below functions are redefined to add mutability

  /** {@inheritDoc GraphNode#parentLinksTo} */
  parentLinksTo(
    node: GraphNode<NodeDatum, LinkDatum>,
  ): IterableIterator<MutGraphLink<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#childLinksTo} */
  childLinksTo(
    node: GraphNode<NodeDatum, LinkDatum>,
  ): IterableIterator<MutGraphLink<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#parents} */
  parents(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#children} */
  children(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#parentCounts} */
  parentCounts(): IterableIterator<
    [MutGraphNode<NodeDatum, LinkDatum>, number]
  >;

  /** {@inheritDoc GraphNode#childCounts} */
  childCounts(): IterableIterator<[MutGraphNode<NodeDatum, LinkDatum>, number]>;

  /** {@inheritDoc GraphNode#parentLinks} */
  parentLinks(): IterableIterator<MutGraphLink<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#childLinks} */
  childLinks(): IterableIterator<MutGraphLink<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#ancestors} */
  ancestors(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;

  /** {@inheritDoc GraphNode#descendants} */
  descendants(): IterableIterator<MutGraphNode<NodeDatum, LinkDatum>>;

  /** add a new link from a parent node */
  parent(
    par: MutGraphNode<NodeDatum, LinkDatum>,
    ...datum: undefined extends LinkDatum
      ? [datum?: LinkDatum]
      : [datum: LinkDatum]
  ): MutGraphLink<NodeDatum, LinkDatum>;

  /** add a new link to a child node */
  child(
    chi: MutGraphNode<NodeDatum, LinkDatum>,
    ...datum: undefined extends LinkDatum
      ? [datum?: LinkDatum]
      : [datum: LinkDatum]
  ): MutGraphLink<NodeDatum, LinkDatum>;

  /**
   * remove this node and all of its links from the graph
   *
   * Once a node is deleted, none of its methods are valid or guaranteed to do
   * the correct thing.
   */
  delete(): void;
}

// -------------- //
// Implementation //
// -------------- //

class AugmentedNode<out N, out L> {
  constructor(
    readonly node: GraphNode<N, L>,
    public indeg: number,
    public outdeg: number,
    public stat:
      | "ranked"
      | "active"
      | "top"
      | "bottom"
      | "inactive" = "inactive",
  ) {}

  bucket(): number {
    const diff =
      this.indeg === 0
        ? -Infinity
        : this.outdeg === 0
          ? Infinity
          : this.indeg - this.outdeg;
    return this.stat === "top"
      ? Math.min(diff, 0)
      : this.stat === "bottom"
        ? Math.max(diff, 0)
        : diff;
  }

  isTop(): boolean {
    return (
      (this.indeg <= this.outdeg && this.stat !== "bottom") ||
      this.stat === "top"
    );
  }
}

function getSetArray<T>(arr: Set<T>[], ind: number): Set<T> {
  const res = arr[ind];
  if (res === undefined) {
    const ret = new Set<T>();
    arr[ind] = ret;
    return ret;
  } else {
    return res;
  }
}

function getTail<T>(arr: Set<T>[]): Set<T> | undefined {
  let last;
  while (arr.length && !(last = arr[arr.length - 1])?.size) {
    arr.pop();
  }
  return last || undefined; // in case of empty set
}

/**
 * Remove cycles from a constrcuted dag by reversing some edges
 *
 * This uses a modified version of the algorithm from [P Eades, X Lin, WF Smyth
 * - Information Processing Letters
 * [1993]](https://www.sciencedirect.com/science/article/pii/002001909390079O)
 */
// NOTE this was coded to be as simple as possible, but there's some wasted
// computation. This shouldn't affect order complexity, but could be further
// optimized.
function topological<N, L>(
  nodes: Iterable<GraphNode<N, L>>,
  ranker: Rank<N, L> = () => undefined,
): GraphNode<N, L>[] {
  // initial setup
  const augmented = new Map<GraphNode<N, L>, AugmentedNode<N, L>>();
  const rankMap = new Map<number, Set<AugmentedNode<N, L>>>();
  // NOTE this implementation is probably fastest in most circumstances, but
  // slower in pathological ones. It may be worth adding an implementation
  // based off of two priority-queues (since we already use one) or a good
  // binary tree library.
  const topBucket = new Set<AugmentedNode<N, L>>();
  const bottomBucket = new Set<AugmentedNode<N, L>>();
  const topBuckets: Set<AugmentedNode<N, L>>[] = [];
  const bottomBuckets: Set<AugmentedNode<N, L>>[] = [];

  function getBucket(bucket: number): Set<AugmentedNode<N, L>> {
    if (bucket === -Infinity) {
      return topBucket;
    } else if (bucket === Infinity) {
      return bottomBucket;
    } else if (bucket <= 0) {
      return getSetArray(topBuckets, -bucket);
    } else {
      return getSetArray(bottomBuckets, bucket - 1);
    }
  }

  for (const node of nodes) {
    const indeg = node.nparentLinks();
    const outdeg = node.nchildLinks();
    const aug = new AugmentedNode(node, indeg, outdeg);
    const rank = ranker(node);
    augmented.set(node, aug);
    if (rank === undefined) {
      aug.stat = "active";
      getBucket(aug.bucket()).add(aug);
    } else {
      setMultimapAdd(rankMap, rank, aug);
    }
  }

  const ranks = [...rankMap].sort(([a], [b]) => a - b).map(([, augs]) => augs);
  let topInd = 0;
  let bottomInd = ranks.length;
  let topRank = ranks.length ? ranks[topInd++] : new Set<AugmentedNode<N, L>>();
  let bottomRank =
    ranks.length > 1 ? ranks[--bottomInd] : new Set<AugmentedNode<N, L>>();

  for (const taug of topRank) {
    taug.stat = "top";
    getBucket(taug.bucket()).add(taug);
  }
  for (const baug of bottomRank) {
    baug.stat = "bottom";
    getBucket(baug.bucket()).add(baug);
  }

  function popBuckets(): AugmentedNode<N, L> | undefined {
    let node;
    if ((node = setPop(topBucket) ?? setPop(bottomBucket))) {
      return node;
    }
    const topNodes = getTail(topBuckets);
    const bottomNodes = getTail(bottomBuckets);
    if (bottomNodes) {
      // NOTE bottomNodes implies topNodes: either there are ranks, in which
      // case something must have a topRank guaranteeing a non-negative bucket,
      // or nothing has a rank, in which indeg = outdeg guaranteeing something
      // non-negative
      return setPop(
        topBuckets.length > bottomBuckets.length ? topNodes! : bottomNodes,
      );
    } else if (topNodes) {
      return setPop(topNodes);
    }
  }

  // nodes in topological order after removing cycles
  const ordered: GraphNode<N, L>[] = Array<GraphNode<N, L>>(augmented.size);
  let minRank = 0;
  let maxRank = augmented.size;

  let aug;
  while ((aug = popBuckets())) {
    const { node } = aug;
    const rank = aug.isTop() ? minRank++ : --maxRank;
    aug.stat = "ranked";
    ordered[rank] = node;

    // process parents
    for (const [par, num] of node.parentCounts()) {
      const paug = augmented.get(par)!;
      getBucket(paug.bucket()).delete(paug);
      paug.outdeg -= num;
      if (paug.stat !== "ranked" && paug.stat !== "inactive") {
        getBucket(paug.bucket()).add(paug);
      }
    }

    // process children
    for (const [child, num] of node.childCounts()) {
      const caug = augmented.get(child)!;
      getBucket(caug.bucket()).delete(caug);
      caug.indeg -= num;
      if (caug.stat !== "ranked" && caug.stat !== "inactive") {
        getBucket(caug.bucket()).add(caug);
      }
    }

    // update ranks
    topRank.delete(aug);
    if (!topRank.size && topInd < bottomInd) {
      topRank = ranks[topInd++];
      for (const taug of topRank) {
        taug.stat = "top";
        getBucket(taug.bucket()).add(taug);
      }
    }

    bottomRank.delete(aug);
    if (!bottomRank.size && topInd < bottomInd) {
      bottomRank = ranks[--bottomInd];
      for (const baug of bottomRank) {
        baug.stat = "bottom";
        getBucket(baug.bucket()).add(baug);
      }
    }
  }

  return ordered;
}

function roots<N, L>(
  nodes: Iterable<MutGraphNode<N, L>>,
  children: (node: MutGraphNode<N, L>) => Iterable<MutGraphNode<N, L>>,
): Set<MutGraphNode<N, L>> {
  const roots = new Set<MutGraphNode<N, L>>();
  const seen = new Set<MutGraphNode<N, L>>();
  const queue: MutGraphNode<N, L>[] = [];
  let next;
  for (const node of nodes) {
    if (seen.has(node)) continue;
    queue.push(node);
    while ((next = queue.pop())) {
      roots.delete(next);
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(...children(next));
    }
    roots.add(node);
  }
  return roots;
}

function acyclic<N, L>(nodes: Iterable<GraphNode<N, L>>): boolean {
  const counts = new Map(
    map(nodes, (node) => [node, node.nparents()] as const),
  );
  const queue = [
    ...map(
      filter(counts, ([, pars]) => pars === 0),
      ([node]) => node,
    ),
  ];
  for (const node of queue) {
    counts.delete(node);
  }
  let node;
  while ((node = queue.pop())) {
    for (const child of node.children()) {
      const newParents = counts.get(child)! - 1;
      if (newParents) {
        counts.set(child, newParents);
      } else {
        counts.delete(child);
        queue.push(child);
      }
    }
  }
  return !counts.size;
}

// TODO att a private bigint for concurrent modification tests
class DirectedGraph<N, L> implements MutGraph<N, L> {
  /** number of nodes */
  #nnodes: number = 0;
  /** number of links */
  #nlinks: number = 0;
  /** number of multi edges */
  #multis: number = 0;
  /** cached acyclic if null unknown */
  #acyclic: boolean | null = true;
  /** representative nodes for known connected components */
  readonly #components: Set<DirectedNode<N, L>> = new Set();
  /** nodes for possible connected components that need to be recomputed */
  readonly #extra: Set<DirectedNode<N, L>> = new Set();

  *nodes(): IterableIterator<MutGraphNode<N, L>> {
    for (const comp of this.split()) {
      yield* comp.nodes();
    }
  }

  topological(rank?: Rank<N, L>): GraphNode<N, L>[] {
    return topological(this.nodes(), rank);
  }

  *links(): IterableIterator<MutGraphLink<N, L>> {
    for (const node of this.nodes()) {
      yield* node.childLinks();
    }
  }

  nnodes(): number {
    return this.#nnodes;
  }

  nlinks(): number {
    return this.#nlinks;
  }

  *roots(): IterableIterator<MutGraphNode<N, L>> {
    for (const node of this.split()) {
      yield* node.roots();
    }
  }

  *leaves(): IterableIterator<MutGraphNode<N, L>> {
    for (const node of this.split()) {
      yield* node.leaves();
    }
  }

  *split(): IterableIterator<MutGraphNode<N, L>> {
    yield* this.#components;
    let node;
    while ((node = setNext(this.#extra))) {
      yield node;
      node.nnodes(); // NOTE causes a full sweep of component
    }
  }

  connected(): boolean {
    let one = false;
    for (const _ of this.split()) {
      if (one) {
        return false;
      } else {
        one = true;
      }
    }
    return true;
  }

  multi(): boolean {
    return !!this.#multis;
  }

  acyclic(): boolean {
    if (this.#acyclic === null) {
      // TODO we could make this faster by first trying acyclic where it's null
      // if unknown, or alternatively having something like maybeAcyclic, but
      // that also exposes an api that I don't want
      for (const comp of this.split()) {
        if (!comp.acyclic()) {
          this.#acyclic = false;
          return false;
        }
      }
      this.#acyclic = true;
      return true;
    } else {
      return this.#acyclic;
    }
  }

  node(datum?: N): DirectedNode<N, L> {
    this.#nnodes += 1;
    return new DirectedNode(
      this,
      this.#components,
      this.#extra,
      this.#deleteNode,
      this.#addLink,
      this.#deleteLink,
      datum!, // NOTE hack that allows us to call with missing undefined data
    );
  }

  link(
    source: MutGraphNode<N, L>,
    target: MutGraphNode<N, L>,
    datum?: L,
  ): MutGraphLink<N, L> {
    return source.link(source, target, datum!);
  }

  #deleteNode = () => {
    this.#nnodes -= 1;
  };

  #addLink = (multi: boolean, connecting: boolean) => {
    this.#nlinks += 1;
    if (multi) {
      this.#multis += 1;
    } else if (!connecting && this.#acyclic === true) {
      this.#acyclic = null;
    }
  };

  #deleteLink = (multi: boolean) => {
    this.#nlinks -= 1;
    if (multi) {
      this.#multis -= 1;
    } else {
      if (this.#acyclic === false) this.#acyclic = null;
    }
  };

  toJSON(): unknown {
    return toJson(this);
  }
}

function multimapValuesNext<V>(
  multimap: Map<unknown, Iterable<V>>,
): V | undefined {
  for (const iters of multimap.values()) {
    for (const ret of iters) {
      return ret;
    }
  }
}

function isDirectedNode<N, L>(
  node: GraphNode<N, L>,
): node is DirectedNode<N, L> {
  return node instanceof DirectedNode;
}

interface NodeInfo<N, L> {
  nnodes: number;
  nlinks: number;
  multis: number;
  acyclic: boolean | null;
  roots: MutGraphNode<N, L>[] | null;
  leaves: MutGraphNode<N, L>[] | null;
}

// TODO implement dynamic connectivity to make most of these more efficient
// look at this https://arxiv.org/pdf/1209.5608.pdf and related papers as a
// route to caching some of this, or dynamic-forest
class DirectedNode<N, L> implements MutGraphNode<N, L> {
  #graph: DirectedGraph<N, L> | null;
  #graphDeleteNode: () => void;
  #graphAddLink: (multi: boolean, connecting: boolean) => void;
  #graphDeleteLink: (multi: boolean) => void;

  readonly #components: Set<DirectedNode<N, L>>;
  readonly #extra: Set<DirectedNode<N, L>>;
  #cmultis: number = 0;

  #nplinks: number = 0;
  readonly #pmap: Map<DirectedNode<N, L>, Set<DirectedLink<N, L>>> = new Map();
  #nclinks: number = 0;
  readonly #cmap: Map<DirectedNode<N, L>, Set<DirectedLink<N, L>>> = new Map();

  /** link to representative node for component */
  #par: DirectedNode<N, L>;
  /** connected component info */
  #cinfo: NodeInfo<N, L> | null | undefined;

  ux?: number | undefined;
  uy?: number | undefined;

  get x(): number {
    if (this.ux === undefined) {
      throw err`can't get \`x\` when \`ux\` is undefined`;
    } else {
      return this.ux;
    }
  }

  set x(val: number) {
    this.ux = val;
  }

  get y(): number {
    if (this.uy === undefined) {
      throw err`can't get \`y\` when \`uy\` is undefined`;
    } else {
      return this.uy;
    }
  }

  set y(val: number) {
    this.uy = val;
  }

  constructor(
    graph: DirectedGraph<N, L>,
    components: Set<DirectedNode<N, L>>,
    extra: Set<DirectedNode<N, L>>,
    deleteNode: () => void,
    addLink: (multi: boolean, connecting: boolean) => void,
    deleteLink: (multi: boolean) => void,
    public data: N,
  ) {
    this.#graph = graph;
    this.#components = components;
    this.#extra = extra;

    this.#graphDeleteNode = deleteNode;
    this.#graphAddLink = addLink;
    this.#graphDeleteLink = deleteLink;

    this.#par = this;
    this.#cinfo = {
      nnodes: 1,
      nlinks: 0,
      multis: 0,
      acyclic: true,
      roots: [this],
      leaves: [this],
    };
    this.#components.add(this);
  }

  #repr(): DirectedNode<N, L> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let repr: DirectedNode<N, L> = this;
    while (repr.#par !== repr) {
      repr.#par = repr.#par.#par;
      repr = repr.#par;
    }
    return repr;
  }

  #info(): NodeInfo<N, L> {
    const repr = this.#repr();
    /* istanbul ignore if */
    if (repr.#cinfo === undefined) {
      throw ierr`undefined cached info`;
    } else if (repr.#cinfo !== null) {
      return repr.#cinfo;
    } else {
      let nnodes = 0;
      let nlinks = 0;
      let multis = 0;
      for (const node of this.nodes()) {
        nnodes += 1;
        nlinks += node.nchildLinks();
        multis += node.#cmultis;
        node.#par = this;
        node.#cinfo = undefined;
        this.#extra.delete(node);
      }

      this.#components.add(this);
      return (this.#cinfo = {
        nnodes,
        nlinks,
        multis,
        acyclic: null,
        roots: null,
        leaves: null,
      });
    }
  }

  #deleteLink = (link: DirectedLink<N, L>) => {
    const { source, target } = link;
    const multi = source.nchildLinksTo(target) > 1;

    if (multi) {
      source.#cmultis -= 1;
      const info = source.#info();
      info.nlinks -= 1;
      info.multis -= 1;
    } else {
      // NOTE if we had a way, we could technically preserve a cache of
      // acyclic = true for both components
      const repr = source.#repr();
      repr.#cinfo = null;
      this.#components.delete(repr);

      this.#extra.add(source);
      source.#par = source;
      source.#cinfo = null;

      this.#extra.add(target);
      target.#par = target;
      target.#cinfo = null;
    }

    this.#graphDeleteLink(multi);

    setMultimapDelete(source.#cmap, target, link);
    source.#nclinks -= 1;

    setMultimapDelete(target.#pmap, source, link);
    target.#nplinks -= 1;
  };

  *nodes(): IterableIterator<DirectedNode<N, L>> {
    yield* dfs<DirectedNode<N, L>>(
      (n) => chain(n.children(), n.parents()),
      this,
    );
  }

  topological(rank?: Rank<N, L>): GraphNode<N, L>[] {
    return topological(this.nodes(), rank);
  }

  *links(): IterableIterator<MutGraphLink<N, L>> {
    for (const node of this.nodes()) {
      yield* node.childLinks();
    }
  }

  nnodes(): number {
    return this.#info().nnodes;
  }

  nlinks(): number {
    return this.#info().nlinks;
  }

  /**
   * Split a graph into connected components
   *
   * Returns an iterable over a single node in each connected component.
   */
  *split(): IterableIterator<MutGraphNode<N, L>> {
    yield this;
  }

  connected(): boolean {
    return true;
  }

  multi(): boolean {
    return this.#info().multis > 0;
  }

  acyclic(): boolean {
    const info = this.#info();
    return info.acyclic === null
      ? (info.acyclic = acyclic(this.nodes()))
      : info.acyclic;
  }

  node(datum?: N): MutGraphNode<N, L> {
    if (this.#graph) {
      return this.#graph.node(datum);
    } else {
      throw err`can't add a node from a deleted node`;
    }
  }

  link(
    source: MutGraphNode<N, L>,
    target: MutGraphNode<N, L>,
    datum?: L,
  ): MutGraphLink<N, L> {
    if (!this.#graph) {
      throw err`can't add a link from a deleted node`;
    } else if (source === target) {
      throw err`tried to create a link between the same node, but self loops are not supported`;
    } else if (
      isDirectedNode(source) &&
      isDirectedNode(target) &&
      source.#graph === target.#graph &&
      this.#graph === source.#graph
    ) {
      const link = new DirectedLink(
        this.#graph,
        source,
        target,
        this.#deleteLink,
        datum!, // NOTE hack for missing undefined
      );
      const multi = source.nchildLinksTo(target) > 0;
      const srepr = source.#repr();
      const info = srepr.#cinfo;
      const trepr = target.#repr();
      const tinfo = trepr.#cinfo;
      if (multi && info) {
        source.#cmultis += 1;
        info.nlinks += 1;
        info.multis += 1;
      } else if (multi) {
        source.#cmultis += 1;
      } else if (srepr === trepr && info) {
        info.nlinks += 1;
        if (info.acyclic === true) info.acyclic = null;
      } else if (srepr !== trepr && info && tinfo) {
        const [drepr, dinfo, orepr, oinfo] =
          info.nnodes > tinfo.nnodes
            ? [srepr, info, trepr, tinfo]
            : [trepr, tinfo, srepr, info];

        this.#components.delete(orepr);
        orepr.#par = drepr;
        orepr.#cinfo = undefined;
        dinfo.nnodes += oinfo.nnodes;
        dinfo.nlinks += oinfo.nlinks + 1;
        dinfo.multis += oinfo.multis;
        dinfo.acyclic =
          dinfo.acyclic === false || oinfo.acyclic === false
            ? false
            : dinfo.acyclic === true && oinfo.acyclic === true
              ? true
              : null;
        dinfo.roots = null;
        dinfo.leaves = null;
      } else if (srepr !== trepr) {
        srepr.#cinfo = null;
        trepr.#cinfo = null;
      }

      this.#graphAddLink(multi, srepr !== trepr);

      source.#nclinks += 1;
      setMultimapAdd(source.#cmap, target, link);

      target.#nplinks += 1;
      setMultimapAdd(target.#pmap, source, link);

      return link;
    } else {
      throw err`when creating a link, both source and target must be current members of the same graph, and can't have been deleted`;
    }
  }

  nparents(): number {
    return this.#pmap.size;
  }

  nchildren(): number {
    return this.#cmap.size;
  }

  nparentLinks(): number {
    return this.#nplinks;
  }

  nchildLinks(): number {
    return this.#nclinks;
  }

  nparentLinksTo(node: GraphNode<N, L>): number {
    return isDirectedNode(node) ? (this.#pmap.get(node)?.size ?? 0) : 0;
  }

  *parentLinksTo(node: GraphNode<N, L>): IterableIterator<DirectedLink<N, L>> {
    if (isDirectedNode(node)) {
      const nodes = this.#pmap.get(node);
      if (nodes) {
        yield* nodes;
      }
    }
  }

  nchildLinksTo(node: GraphNode<N, L>): number {
    return isDirectedNode(node) ? (this.#cmap.get(node)?.size ?? 0) : 0;
  }

  *childLinksTo(node: GraphNode<N, L>): IterableIterator<DirectedLink<N, L>> {
    if (isDirectedNode(node)) {
      const nodes = this.#cmap.get(node);
      if (nodes) {
        yield* nodes;
      }
    }
  }

  *parents(): IterableIterator<DirectedNode<N, L>> {
    yield* this.#pmap.keys();
  }

  *children(): IterableIterator<DirectedNode<N, L>> {
    yield* this.#cmap.keys();
  }

  *parentCounts(): IterableIterator<[DirectedNode<N, L>, number]> {
    for (const [node, links] of this.#pmap) {
      yield [node, links.size];
    }
  }

  *childCounts(): IterableIterator<[DirectedNode<N, L>, number]> {
    for (const [node, links] of this.#cmap) {
      yield [node, links.size];
    }
  }

  *parentLinks(): IterableIterator<MutGraphLink<N, L>> {
    for (const links of this.#pmap.values()) {
      yield* links;
    }
  }

  *childLinks(): IterableIterator<MutGraphLink<N, L>> {
    for (const links of this.#cmap.values()) {
      yield* links;
    }
  }

  *ancestors(): IterableIterator<MutGraphNode<N, L>> {
    yield* dfs<MutGraphNode<N, L>>((node) => node.parents(), this);
  }

  *descendants(): IterableIterator<MutGraphNode<N, L>> {
    yield* dfs<MutGraphNode<N, L>>((node) => node.children(), this);
  }

  *roots(): IterableIterator<MutGraphNode<N, L>> {
    const info = this.#info();
    if (!info.roots) {
      info.roots = [...roots(this.nodes(), (n) => n.children())];
    }
    yield* info.roots;
  }

  *leaves(): IterableIterator<MutGraphNode<N, L>> {
    const info = this.#info();
    if (!info.leaves) {
      info.leaves = [...roots(this.nodes(), (n) => n.parents())];
    }
    yield* info.leaves;
  }

  parent(source: MutGraphNode<N, L>, datum?: L): MutGraphLink<N, L> {
    return this.link(source, this, datum);
  }

  child(target: MutGraphNode<N, L>, datum?: L): MutGraphLink<N, L> {
    return this.link(this, target, datum);
  }

  delete(): void {
    if (this.#graph) {
      let link;
      while ((link = multimapValuesNext(this.#cmap))) {
        link.delete();
      }
      while ((link = multimapValuesNext(this.#pmap))) {
        link.delete();
      }
      this.#components.delete(this);
      this.#extra.delete(this);
      this.#graphDeleteNode();
      this.#graph = null;
      this.#cinfo = null;
    }
  }

  toJSON(): unknown {
    return toJson(this);
  }
}

class DirectedLink<N, L> implements MutGraphLink<N, L> {
  #graph: DirectedGraph<N, L> | null;
  #deleteLink: (link: DirectedLink<N, L>) => void;

  points: [number, number][] = [];

  constructor(
    graph: DirectedGraph<N, L>,
    readonly source: DirectedNode<N, L>,
    readonly target: DirectedNode<N, L>,
    deleteLink: (link: DirectedLink<N, L>) => void,
    public data: L,
  ) {
    this.#graph = graph;
    this.#deleteLink = deleteLink;
  }

  delete() {
    if (this.#graph) {
      this.#deleteLink(this);
      this.#graph = null;
    }
  }
}

/**
 * create a new mutable empty {@link MutGraph}
 *
 * When creating a new mutable graph via typescript, you must specify the type
 * of the node data and link data you intend on using, since these types are
 * invariant for mutable graphs.
 *
 * @example
 * Creating a graph with node and link data:
 *
 * ```ts
 * // create a new graph
 * const grf = graph<string, number>();
 * // add two nodes with some data
 * const a = grf.node("a");
 * const b = grf.node("b");
 * // add a new link with the data `1`
 * const link = grf.link(a, b, 1);
 * grf.connected(); // true
 * ```
 *
 * @example
 * If `undefined` extends the data types then they can be omitted:
 * ```
 * // create a new graph
 * const grf = graph<undefined | string, undefined | number>();
 * const a = grf.node();
 * const b = grf.node();
 * const link = grf.link(a, b);
 * grf.connected(); // true
 * ```
 *
 * @typeParam NodeDatum - the extra user data attached to each node
 * @typeParam LinkDatum - the extra data attached to each link
 */
export function graph<NodeDatum, LinkDatum>(): MutGraph<NodeDatum, LinkDatum> {
  return new DirectedGraph<NodeDatum, LinkDatum>();
}
