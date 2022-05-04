/**
 * Three built-in methods exist to turn existing raw data into {@link Dag}s:
 * 1. {@link HierarchyOperator} - when the data already has a dag structure.
 * 2. {@link StratifyOperator} - when the dag has a tabular structure, referencing parents by id.
 * 3. {@link ConnectOperator} - when the dag has a link structure and is specified as pairs of nodes.
 *
 * @packageDocumentation
 */
import { Dag, DagLink, DagNode, IterStyle } from ".";
import { entries, every, filter, flatMap, map, reduce, some } from "../iters";
import {
  dfs,
  js,
  listMultimapPush,
  setMultimapAdd,
  setPop,
  Up,
} from "../utils";
import { getParents } from "./utils";

/**********************
 * Dag Implementation *
 **********************/

class LayoutChildLink<N, L> {
  constructor(
    readonly child: DagNode<N, L>,
    public data: L,
    public points: { x: number; y: number }[] = [],
    readonly reversed: boolean = false
  ) {}
}

/**
 * The concrete class backing the {@link Link} interface.
 */
class LayoutLink<N, L> implements DagLink<N, L> {
  constructor(
    readonly source: DagNode<N, L>,
    readonly target: DagNode<N, L>,
    readonly data: L,
    readonly points: { x: number; y: number }[],
    readonly reversed: boolean
  ) {}
}

/**
 * The concrete implementation backing {@link Dag}.
 */
class LayoutDag<N, L> implements Dag<N, L> {
  // NOTE proots is undefined for normal nodes because we can't call super([this]);
  private readonly proots?: DagNode<N, L>[];
  protected pmultidag?: boolean;

  constructor(roots?: DagNode<N, L>[]) {
    if (roots) {
      this.proots = roots;
    }
  }

  [Symbol.iterator](): Iterator<DagNode<N, L>> {
    return this.idescendants()[Symbol.iterator]();
  }

  iroots(): Iterable<DagNode<N, L>> {
    return { [Symbol.iterator]: () => this.proots![Symbol.iterator]() };
  }

  roots(): DagNode<N, L>[] {
    return [...this.iroots()];
  }

  private *idepth(): Iterable<DagNode<N, L>> {
    const ch = (node: DagNode<N, L>) => node.ichildren();
    yield* dfs(ch, ...this.iroots());
  }

  private *ibreadth(): Iterable<DagNode<N, L>> {
    const seen = new Set<DagNode>();
    let next = this.roots();
    let current: DagNode<N, L>[] = [];
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

  private *ibefore(): Iterable<DagNode<N, L>> {
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
        const before = numBefore.get(child)!;
        if (before > 1) {
          numBefore.set(child, before - 1);
        } else {
          queue.push(child);
        }
      }
    }
  }

  private *iafter(): Iterable<DagNode<N, L>> {
    const queue = this.roots();
    const seen = new Set<DagNode>();
    let node;
    while ((node = queue.pop())) {
      if (seen.has(node)) {
        // noop
      } else if (every(node.ichildren(), (c) => seen.has(c))) {
        seen.add(node);
        yield node;
      } else {
        // need to revisit after children
        queue.push(node, ...node.ichildren());
      }
    }
  }

  idescendants(style: IterStyle = "depth"): Iterable<DagNode<N, L>> {
    if (style === "depth") {
      return this.idepth();
    } else if (style === "breadth") {
      return this.ibreadth();
    } else if (style === "before") {
      return this.ibefore();
    } else if (style === "after") {
      return this.iafter();
    } else {
      throw new Error(`unknown iteration style: ${style}`);
    }
  }

  descendants(style: IterStyle = "depth"): DagNode<N, L>[] {
    return [...this.idescendants(style)];
  }

  ilinks(): Iterable<DagLink<N, L>> {
    return flatMap(this, (node) => node.ichildLinks());
  }

  links(): DagLink<N, L>[] {
    return [...this.ilinks()];
  }

  size(): number {
    return reduce(this, (s) => s + 1, 0);
  }

  sum(callback: (node: DagNode<N, L>, index: number) => number): this {
    const descendantVals = new Map<DagNode, Map<DagNode, number>>();
    for (const [index, node] of entries(this.idescendants("after"))) {
      const val = callback(node, index);
      const nodeVals = new Map<DagNode, number>();
      nodeVals.set(node, val);
      for (const child of node.ichildren()) {
        const childMap = descendantVals.get(child)!;
        for (const [child, v] of childMap.entries()) {
          nodeVals.set(child, v);
        }
      }
      node.value = reduce(nodeVals.values(), (a, b) => a + b, 0);
      descendantVals.set(node, nodeVals);
    }
    return this;
  }

  count(): this {
    const leaves = new Map<DagNode, Set<DagNode>>();
    for (const node of this.idescendants("after")) {
      if (node.ichildren()[Symbol.iterator]().next().done) {
        leaves.set(node, new Set([node]));
        node.value = 1;
      } else {
        const nodeLeaves = new Set<DagNode>();
        for (const child of node.ichildren()) {
          const childLeaves = leaves.get(child)!;
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

  height(): this {
    for (const node of this.idescendants("after")) {
      node.value = Math.max(
        0,
        ...map(node.ichildren(), (child) => child.value! + 1)
      );
    }
    return this;
  }

  depth(): this {
    const parents = getParents(this);
    for (const node of this.idescendants("before")) {
      node.value = Math.max(
        0,
        ...map(parents.get(node) ?? [], (par) => par.value! + 1)
      );
    }
    return this;
  }

  *isplit(): Iterable<Dag<N, L>> {
    // create parents
    const parents = getParents(this);

    // "children" function that returns children and parents
    function* graph(node: DagNode<N, L>): IterableIterator<DagNode<N, L>> {
      yield* node.ichildren();
      yield* parents.get(node) ?? [];
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
      yield connected.length > 1 ? new LayoutDag(connected) : connected[0];
    }
  }

  split(): Dag<N, L>[] {
    return [...this.isplit()];
  }

  connected(): boolean {
    const iter = this.isplit()[Symbol.iterator]();
    iter.next();
    const { done } = iter.next();
    return !!done;
  }

  multidag(): boolean {
    if (this.pmultidag === undefined) {
      return (this.pmultidag = some(this.iroots(), (n) => n.multidag()));
    } else {
      return this.pmultidag;
    }
  }
}

/**
 * Concrete implementation of {@link DagNode}.
 */
class LayoutDagNode<N, L> extends LayoutDag<N, L> implements DagNode<N, L> {
  dataChildren: LayoutChildLink<N, L>[] = [];
  // NOTE we set to null when caching is not necessary
  cachedChildrenCounts?: Map<DagNode<N, L>, number> | null;

  constructor(public data: N) {
    super();
  }

  private childrenCountsMap(): Map<DagNode<N, L>, number> | null {
    if (this.cachedChildrenCounts === undefined) {
      const cache = new Map();
      for (const { child } of this.dataChildren) {
        cache.set(child, (cache.get(child) ?? 0) + 1);
      }
      return (this.cachedChildrenCounts =
        cache.size === this.dataChildren.length ? null : cache);
    } else {
      return this.cachedChildrenCounts;
    }
  }

  // NOTE everything extends from iroots, so by overriding this, we allow
  // dag nodes to work effectively
  iroots(): Iterable<DagNode<N, L>> {
    const singleton = [this];
    return { [Symbol.iterator]: () => singleton[Symbol.iterator]() };
  }

  nchildren(): number {
    return this.childrenCountsMap()?.size ?? this.dataChildren.length;
  }

  nchildLinks(): number {
    return this.dataChildren.length;
  }

  nchildLinksTo(node: DagNode<N, L>): number {
    return this.childrenCountsMap()?.get(node) ?? 1;
  }

  *ichildren(): Iterable<DagNode<N, L>> {
    const cache = this.childrenCountsMap();
    if (cache === null) {
      for (const { child } of this.dataChildren) {
        yield child;
      }
    } else {
      yield* cache.keys();
    }
  }

  children(): DagNode<N, L>[] {
    return [...this.ichildren()];
  }

  *ichildrenCounts(): Iterable<[DagNode<N, L>, number]> {
    const cache = this.childrenCountsMap();
    if (cache === null) {
      for (const { child } of this.dataChildren) {
        yield [child, 1];
      }
    } else {
      yield* cache;
    }
  }

  childrenCounts(): [DagNode<N, L>, number][] {
    return [...this.ichildrenCounts()];
  }

  *ichildLinks(): Iterable<DagLink<N, L>> {
    for (const { child, data, points, reversed } of this.dataChildren) {
      yield new LayoutLink(this, child, data, points, reversed);
    }
  }

  childLinks(): DagLink<N, L>[] {
    return [...this.ichildLinks()];
  }

  // NOTE these are simpler for a single node, so we override
  isplit(): Iterable<Dag<N, L>> {
    return this.iroots();
  }

  split(): DagNode<N, L>[] {
    return this.roots();
  }

  connected(): true {
    return true;
  }

  // NOTE we need to override this, or we get an infinity loop
  multidag(): boolean {
    if (this.pmultidag === undefined) {
      return (this.pmultidag =
        this.childrenCountsMap() !== null ||
        some(this.ichildren(), (child) => child.multidag()));
    } else {
      return this.pmultidag;
    }
  }
}

/**
 * Verify an ID is a valid ID.
 */
function verifyId(id: string): string {
  if (typeof id !== "string") {
    throw new Error(`id is supposed to be string but got type ${typeof id}`);
  }
  return id;
}

/**
 * Verify a DAG is valid.
 *
 * @param checkForCycles - if true will check for all cycles, if false, will only
 * check for trivial self-loops
 */
function verifyDag(roots: DagNode[], checkForCycles: boolean): void {
  if (!roots.length) {
    throw new Error("dag contained no roots; this often indicates a cycle");
  }

  // make sure there's no self loops
  for (const node of new LayoutDag(roots)) {
    for (const child of node.ichildren()) {
      if (child === node) {
        throw new Error(js`node '${node.data}' contained a self loop`);
      }
    }
  }

  // return early if no loops
  if (!checkForCycles) return;

  // test that dag is free of cycles
  // we attempt to take every unique path from each root and see if we ever see
  // a node again
  const seen = new Set<DagNode>(); // already processed
  const past = new Set<DagNode>(); // seen down this path
  let rec: DagNode | null = null;

  /** visit nodes returning cycle if found */
  function visit(node: DagNode): DagNode[] {
    if (seen.has(node)) {
      return [];
    } else if (past.has(node)) {
      rec = node;
      return [node];
    } else {
      past.add(node);
      let result: DagNode[] = [];
      for (const child of node.ichildren()) {
        result = visit(child);
        if (result.length) break;
      }
      past.delete(node);
      seen.add(node);
      if (result.length && rec !== null) result.push(node);
      if (rec === node) rec = null;
      return result;
    }
  }

  for (const root of roots) {
    const msg = visit(root);
    if (msg.length) {
      const cycle = msg
        .reverse()
        .map(({ data }) => js`'${data}'`)
        .join(" -> ");
      throw new Error(`dag contained a cycle: ${cycle}`);
    }
  }
}

interface AugmentedNode<N, L> {
  indeg: number;
  outdeg: number;
  node: LayoutDagNode<N, L>;
  rank?: number;
}

function setPopUndef<T>(elems: Set<T> | undefined): T | undefined {
  return elems && setPop(elems);
}

/**
 * Remove cycles from a constrcuted dag by reversing some edges
 *
 * This uses the algorithm from [P Eades, X Lin, WF Smyth - Information
 * Processing Letters
 * [1993]](https://www.sciencedirect.com/science/article/pii/002001909390079O)
 */
function removeCycles<N, L>(nodes: LayoutDagNode<N, L>[]): DagNode<N, L>[] {
  // NOTE this doesn't use getParents, because we're still modifying the dag,
  // we want to make sure not to cache children set
  const parents = new Map<DagNode, LayoutDagNode<N, L>[]>();
  for (const node of nodes) {
    for (const { child } of node.dataChildren) {
      listMultimapPush(parents, child, node);
    }
  }

  const augmented = new Map<DagNode, AugmentedNode<N, L>>(
    map(nodes, (node) => [
      node,
      {
        indeg: parents.get(node)?.length ?? 0,
        outdeg: node.nchildLinks(),
        node,
      },
    ])
  );
  const maxDelta = Math.max(
    ...map(
      filter(
        augmented.values(),
        ({ indeg, outdeg }) => indeg > 0 && outdeg > 0
      ),
      ({ indeg, outdeg }) => outdeg - indeg
    )
  );

  if (maxDelta === -Infinity) {
    // all nodes were sources or sinks, so roots are just all sources, and there are no cycles
    const roots: DagNode<N, L>[] = [];
    for (const { indeg, node } of augmented.values()) {
      if (indeg === 0) {
        roots.push(node);
      }
    }
    return roots;
  }

  const sources = new Set<AugmentedNode<N, L>>();
  const sinks = new Set<AugmentedNode<N, L>>();
  const buckets = new Map<number, Set<AugmentedNode<N, L>>>();

  for (const aug of augmented.values()) {
    const { outdeg, indeg } = aug;
    if (indeg === 0) {
      sources.add(aug);
    } else if (outdeg === 0) {
      sinks.add(aug);
    } else {
      const delta = outdeg - indeg;
      setMultimapAdd(buckets, delta, aug);
    }
  }

  let minRank = 0;
  let maxRank = nodes.length;
  let delta = maxDelta;

  // nodes in topological order after removing cycles
  const ordered: Array<LayoutDagNode<N, L>> = new Array(nodes.length);

  while (minRank < maxRank) {
    const aug =
      setPop(sources) ?? setPop(sinks) ?? setPopUndef(buckets.get(delta));
    if (aug === undefined) {
      --delta;
    } else {
      const { node, indeg, outdeg } = aug;
      const rank = (aug.rank =
        indeg > 0 && outdeg === 0 ? --maxRank : minRank++);
      ordered[rank] = node;

      // process parents
      for (const par of parents.get(node) ?? []) {
        const paug = augmented.get(par)!;
        if (paug.rank === undefined && paug.indeg > 0 && paug.outdeg > 0) {
          // rank: not already ranked already ranked
          // indeg: once a source always a source
          // outdeg: unranked parents can't have 0 outdeg
          const pdelta = paug.outdeg - paug.indeg;
          buckets.get(pdelta)!.delete(paug);
          --paug.outdeg;
          if (paug.outdeg > 0) {
            setMultimapAdd(buckets, pdelta - 1, paug);
          } else {
            sinks.add(paug);
          }
        }
      }

      // process children
      for (const { child } of node.dataChildren) {
        const caug = augmented.get(child)!;
        if (caug.rank !== undefined || caug.indeg === 0) {
          // no op, already ranked or impossible for unranked children to have 0 in degree
        } else if (caug.outdeg === 0) {
          // already a sink, removing could turn into a source
          --caug.indeg;
          if (caug.indeg === 0) {
            // moved from sink to a source
            sinks.delete(caug);
            sources.add(caug);
          }
        } else {
          const cdelta = caug.outdeg - caug.indeg;
          if (cdelta === delta) {
            // added a new node at a higher delta, need to step back
            ++delta;
          }
          buckets.get(cdelta)!.delete(caug);
          --caug.indeg;
          if (caug.indeg === 0) {
            sources.add(caug);
          } else {
            setMultimapAdd(buckets, cdelta + 1, caug);
          }
        }
      }
    }
  }

  const roots: DagNode<N, L>[] = [];
  const hasParents = new Set<DagNode>();
  for (const [rank, node] of ordered.entries()) {
    // compute new children by reversing children with higher rank
    const newDataChildren: LayoutChildLink<N, L>[] = [];
    for (const link of node.dataChildren) {
      const caug = augmented.get(link.child)!;
      if (caug.rank! < rank) {
        // reversing edge
        caug.node.dataChildren.push(
          new LayoutChildLink<N, L>(node, link.data, link.points, true)
        );
      } else {
        newDataChildren.push(link);
      }
    }

    // add node to roots if it hasn't been a child yet
    if (
      newDataChildren.length === node.nchildLinks() &&
      !hasParents.has(node)
    ) {
      roots.push(node);
    }

    // update has parents for all true children
    for (const { child } of newDataChildren) {
      hasParents.add(child);
    }

    // actually update children
    node.dataChildren = newDataChildren;
  }

  return roots;
}

/***********
 * General *
 ***********/

/**
 * The interface for getting a node id from data. The function must return an
 * appropriate unique string id for given datum. This operator will only be
 * called once for each input.
 *
 * `i` will increment in the order data are processed.
 *
 * This is used in {@link StratifyOperator.id}, {@link
 * ConnectOperator.sourceId}, and {@link ConnectOperator.targetId}.
 */
export interface IdOperator<Datum = never> {
  (d: Datum, i: number): string;
}

/***********
 * Connect *
 ***********/

/**
 * An operator that creates node data from an id
 *
 * The index passed in is the edge index where the id is first seen.
 */
export interface IdNodeDatumOperator<D = unknown> {
  (id: string, index: number): D;
}

/**
 * The default node data on dags built using {@link ConnectOperator}
 */
export interface ConnectDatum {
  /** the id */
  id: string;
}

/**
 * The operators that parametrize {@link ConnectOperator}
 */
export interface ConnectOperators<N = unknown, L = never> {
  /** the source id operator */
  sourceId: IdOperator<L>;
  /** the target id operator */
  targetId: IdOperator<L>;
  /** the node datum operator */
  nodeDatum: IdNodeDatumOperator<N>;
}

/**
 * The constraint applied to data passed into {@link ConnectOperator}
 * conditioned on its operators.
 */
type ConnectLinkDatum<Ops extends ConnectOperators> =
  Ops extends ConnectOperators<unknown, infer L> ? L : never;

export interface ConnectOperator<
  NodeDatum,
  Ops extends ConnectOperators<NodeDatum>
> {
  /**
   * An operator that constructs a {@link Dag} from link data.
   *
   * Create a default connect operator with {@link connect}. The accessor for the
   * {@link sourceId | source id string}, {@link targetId | target id string},
   * and whether to allow {@link single} nodes can all be modified.
   *
   * Links in the dag will have the same data as the objects passed in, and nodes
   * will have the ids referenced as either the source or the target.
   *
   * @example
   * ```typescript
   * const data = [ ["parent", "child"] ];
   * const create = connect();
   * const dag = create(data);
   * ```
   *
   * @example
   * ```json
   * [
   *   ["Eve", "Cain"],
   *   ["Eve", "Seth"],
   *   ["Seth", "Enos"],
   *   ["Seth", "Noam"],
   *   ["Eve", "Abel"],
   *   ["Eve", "Awan"]
   * ]
   * ```
   */
  <L extends ConnectLinkDatum<Ops>>(data: readonly L[]): Dag<NodeDatum, L>;

  /**
   * Sets the source accessor to the given {@link IdOperator} and returns this
   * ConnectOperator. This should return the source id of the link
   * data. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[0];
   * }
   * ```
   */
  sourceId<NewId extends IdOperator>(
    id: NewId
  ): ConnectOperator<
    NodeDatum,
    Up<
      Ops,
      {
        /** the new source id */
        sourceId: NewId;
      }
    >
  >;
  /** Gets the current sourceId accessor. */
  sourceId(): Ops["sourceId"];

  /**
   * Sets the target accessor to the given {@link IdOperator} and returns this
   * ConnectOperator. This should return the target id of the link
   * data. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[1];
   * }
   * ```
   */
  targetId<NewId extends IdOperator>(
    id: NewId
  ): ConnectOperator<
    NodeDatum,
    Up<
      Ops,
      {
        /** the new target id */
        targetId: NewId;
      }
    >
  >;
  /** Gets the current targetId accessor. */
  targetId(): Ops["targetId"];

  /**
   * Sets the id node datum  accessor to the given {@link IdNodeDatumOperator} and returns this
   * ConnectOperator. This function allows you to decide what data to attach to nodes created via the connect method. The default simple wraps it in an object with an `id` field.
   * data. The default accessor is:
   *
   * ```js
   * function nodeDatumAccessor(id) {
   *   return { id };
   * }
   * ```
   */
  nodeDatum<
    NewNodeDatum,
    NewNodeDatumOp extends IdNodeDatumOperator<NewNodeDatum>
  >(
    data: NewNodeDatumOp & IdNodeDatumOperator<NewNodeDatum>
  ): ConnectOperator<
    NewNodeDatum,
    Up<
      Ops,
      {
        /** the new node datum */
        nodeDatum: NewNodeDatumOp;
      }
    >
  >;
  /** Get the current id node datum operator */
  nodeDatum(): Ops["nodeDatum"];

  /**
   * Sets the allowance for single nodes. If enabled and the source id equals
   * the target id, then a single node with no parents will be created.
   * Otherwise a self loop will be created which will result in an error. Note
   * only single nodes without parents or children need to be specified this
   * way, otherwise any other connection to a node will create it. (default: false)
   */
  single(val: boolean): ConnectOperator<NodeDatum, Ops>;
  /** get the current single node setting. */
  single(): boolean;

  /**
   * Sets whether edges should be reversed to remove cycles
   *
   * If true, after creating the initial "graph" of nodes, an algorithm will
   * run to reverse enough edges to make the resulting data structure a valid
   * dag. It does this by reversing links in the original dag. Note that since
   * the structure is still a dag, old parents could now be positioned as
   * children, and instead the link will have `reversed` set to true. It is up
   * to the user to decide how to handle these links. (default: false)
   */
  decycle(val: boolean): ConnectOperator<NodeDatum, Ops>;
  /** get the current decycle setting */
  decycle(): boolean;
}

function getConnectRoots<N, L>(
  nodes: Map<string, LayoutDagNode<N, L>>,
  hasParents: Set<string>
): DagNode<N, L>[] {
  const roots: DagNode<N, L>[] = [];
  for (const [id, node] of nodes.entries()) {
    if (!hasParents.has(id)) {
      roots.push(node);
    }
  }
  return roots;
}

function buildConnect<N, LinkDatum, Ops extends ConnectOperators<N, LinkDatum>>(
  operators: Ops &
    ConnectOperators<N, LinkDatum> & { single: boolean; decycle: boolean }
): ConnectOperator<N, Ops> {
  function connect<L extends LinkDatum>(data: readonly L[]): Dag<N, L> {
    if (!data.length) {
      throw new Error("can't connect empty data");
    }
    const nodes = new Map<string, LayoutDagNode<N, L>>();
    const hasParents = new Set<string>();
    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(operators.sourceId(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = new LayoutDagNode<N, L>(operators.nodeDatum(source, i));
        nodes.set(source, sourceNode);
      }
      const target = verifyId(operators.targetId(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = new LayoutDagNode<N, L>(operators.nodeDatum(target, i));
        nodes.set(target, targetNode);
      }

      if (source !== target || !operators.single) {
        sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));
        hasParents.add(target);
      }
    }

    const roots = operators.decycle
      ? removeCycles([...nodes.values()])
      : getConnectRoots(nodes, hasParents);
    verifyDag(roots, !operators.decycle);
    return roots.length > 1 ? new LayoutDag(roots) : roots[0];
  }

  function sourceId(): Ops["sourceId"];
  function sourceId<NI extends IdOperator>(
    id: NI
  ): ConnectOperator<N, Up<Ops, { sourceId: NI }>>;
  function sourceId<NI extends IdOperator>(
    id?: NI
  ): Ops["sourceId"] | ConnectOperator<N, Up<Ops, { sourceId: NI }>> {
    if (id === undefined) {
      return operators.sourceId;
    } else {
      const { sourceId: _, ...rest } = operators;
      return buildConnect({ ...rest, sourceId: id });
    }
  }
  connect.sourceId = sourceId;

  function targetId(): Ops["targetId"];
  function targetId<NI extends IdOperator>(
    id: NI
  ): ConnectOperator<N, Up<Ops, { targetId: NI }>>;
  function targetId<NI extends IdOperator>(
    id?: NI
  ): Ops["targetId"] | ConnectOperator<N, Up<Ops, { targetId: NI }>> {
    if (id === undefined) {
      return operators.targetId;
    } else {
      const { targetId: _, ...rest } = operators;
      return buildConnect({ ...rest, targetId: id });
    }
  }
  connect.targetId = targetId;

  function nodeDatum(): Ops["nodeDatum"];
  function nodeDatum<NN, ND extends IdNodeDatumOperator<NN>>(
    id: ND
  ): ConnectOperator<NN, Up<Ops, { nodeDatum: ND }>>;
  function nodeDatum<NN, ND extends IdNodeDatumOperator<NN>>(
    id?: ND
  ): Ops["nodeDatum"] | ConnectOperator<NN, Up<Ops, { nodeDatum: ND }>> {
    if (id === undefined) {
      return operators.nodeDatum;
    } else {
      const { nodeDatum: _, ...rest } = operators;
      return buildConnect({ ...rest, nodeDatum: id });
    }
  }
  connect.nodeDatum = nodeDatum;

  function single(): boolean;
  function single(val: boolean): ConnectOperator<N, Ops>;
  function single(val?: boolean): boolean | ConnectOperator<N, Ops> {
    if (val === undefined) {
      return operators.single;
    } else {
      return buildConnect({ ...operators, single: val });
    }
  }
  connect.single = single;

  function decycle(): boolean;
  function decycle(val: boolean): ConnectOperator<N, Ops>;
  function decycle(val?: boolean): boolean | ConnectOperator<N, Ops> {
    if (val === undefined) {
      return operators.decycle;
    } else {
      return buildConnect({ ...operators, decycle: val });
    }
  }
  connect.decycle = decycle;

  return connect;
}

/** default interface for tuples that start with a string */
export interface ZeroString {
  /** the zero property */
  readonly 0: string;
}

function isZeroString(d: unknown): d is ZeroString {
  try {
    return typeof (d as ZeroString)[0] === "string";
  } catch {
    return false;
  }
}

function defaultSourceId(d: ZeroString): string {
  if (isZeroString(d)) {
    return d[0];
  } else {
    throw new Error(
      `default source id expected datum[0] to be a string but got datum: ${d}`
    );
  }
}

/** default interface for functions whose second element is a string */
export interface OneString {
  /** the one property */
  readonly 1: string;
}

function isOneString(d: unknown): d is OneString {
  try {
    return typeof (d as OneString)[1] === "string";
  } catch {
    return false;
  }
}

function defaultTargetId(d: OneString): string {
  if (isOneString(d)) {
    return d[1];
  } else {
    throw new Error(
      `default target id expected datum[1] to be a string but got datum: ${d}`
    );
  }
}

function defaultNodeDatum(id: string): ConnectDatum {
  return { id };
}

/** the default connect operator */
export type DefaultConnectOperator = ConnectOperator<
  ConnectDatum,
  {
    /** the default source id operator */
    sourceId: IdOperator<ZeroString>;
    /** the default target id operator */
    targetId: IdOperator<OneString>;
    /** the default node datum operator */
    nodeDatum: IdNodeDatumOperator<ConnectDatum>;
  }
>;

/**
 * Creates a new {@link ConnectOperator} with the default settings. This is
 * bundled as {@link dagConnect}
 */
export function connect(...args: never[]): DefaultConnectOperator {
  if (args.length) {
    throw new Error(
      `got arguments to connect(${args}), but constructor takes no arguments. ` +
        "These were probably meant as data which should be called as connect()(...)"
    );
  } else {
    // NOTE I think because source and target are both IdOperators, typescript
    // tries to cache the inference, but in so doing, gets it wrong.
    return buildConnect<
      ConnectDatum,
      ZeroString & OneString,
      {
        sourceId: IdOperator<ZeroString>;
        targetId: IdOperator<OneString>;
        nodeDatum: IdNodeDatumOperator<ConnectDatum>;
      }
    >({
      sourceId: defaultSourceId,
      targetId: defaultTargetId,
      nodeDatum: defaultNodeDatum,
      single: false,
      decycle: false,
    });
  }
}

/*************
 * Hierarchy *
 *************/

// NOTE this is typed differently than most operators, and that's because the
// operators are invariant due to them taking the same type as input and
// output, e.g. the intersection of covariant and contravariant. As a result,
// all of these are typed with the NodeDatum known.

/**
 * The interface for getting child data from node data. This function must
 * return data for every child given the data for the current node. `i` will
 * increment for each node processed.
 *
 * Can be modified with {@link children}.
 */
export interface ChildrenOperator<NodeDatum> {
  (d: NodeDatum, i: number): readonly NodeDatum[] | undefined;
}

/**
 * The interface for getting children data and associated link data from node
 * data. This function must return data for every child of the given node, and
 * data for link between the two. `i` will increment for each node processed.
 *
 * Can be modified with {@link childrenData}.
 */
export interface ChildrenDataOperator<NodeDatum, LinkDatum = unknown> {
  (d: NodeDatum, i: number):
    | readonly (readonly [NodeDatum, LinkDatum])[]
    | undefined;
}

/**
 * What gets returned by {@link childrenData}() when {@link children} is set.
 */
export interface WrappedChildrenOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> extends ChildrenDataOperator<NodeDatum, undefined> {
  /** the wrapped children operator */
  wrapped: Children;
}

/**
 * What gets returned by {@link children}() when {@link childrenData} is set.
 */
export interface WrappedChildrenDataOperator<
  NodeDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum>
> extends ChildrenOperator<NodeDatum> {
  /** the wrapped children data operator */
  wrapped: ChildrenData;
}

/** the hierarchy operator operators */
export interface HierarchyOperators<NodeDatum, LinkDatum = unknown> {
  /** the children operator */
  children: ChildrenOperator<NodeDatum>;
  /** the children data operator */
  childrenData: ChildrenDataOperator<NodeDatum, LinkDatum>;
}

/** a hierarchy operator with children */
export type ChildrenHierarchyOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> = HierarchyOperator<
  NodeDatum,
  undefined,
  {
    /** new children */
    children: Children;
    /** new children data */
    childrenData: WrappedChildrenOperator<NodeDatum, Children>;
  }
>;

/** a hierarchy operator with children data specified */
export type ChildrenDataHierarchyOperator<
  NodeDatum,
  LinkDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum, LinkDatum>
> = HierarchyOperator<
  NodeDatum,
  LinkDatum,
  {
    /** new children */
    children: WrappedChildrenDataOperator<NodeDatum, ChildrenData>;
    /** new children data */
    childrenData: ChildrenData;
  }
>;

export interface HierarchyOperator<
  NodeDatum,
  LinkDatum,
  Ops extends HierarchyOperators<NodeDatum, LinkDatum>
> {
  /**
   * An operator that constructs a {@link Dag} from hierarchy data.
   *
   * A default operator can be created with {@link hierarchy}. How to access a
   * piece of data's {@link children} or {@link childrenData | children with
   * associated link data} can be altered. Similarly you can disable whether to
   * check that all initial nodes are actually {@link roots}.
   *
   * Data passed in will become node data, if {@link childrenData} is specified,
   * then link data will also be included. This method uses object identity, so
   * for two nodes to point to the same object, they must both return the same
   * object in their children.
   *
   * @example
   * ```typescript
   * const data = { id: "parent", children: [{ id: "child" }] };
   * const create = hierarchy();
   * const dag = create(data);
   * ```
   *
   * @example
   * ```json
   * {
   *   "id": "Eve",
   *     "children": [
   *     {
   *       "id": "Cain"
   *     },
   *     {
   *       "id": "Seth",
   *       "children": [
   *       {
   *         "id": "Enos"
   *       },
   *       {
   *         "id": "Noam"
   *       }
   *       ]
   *     },
   *     {
   *       "id": "Abel"
   *     },
   *     {
   *       "id": "Awan",
   *       "children": [
   *       {
   *         "id": "Enoch"
   *       }
   *       ]
   *     },
   *     {
   *       "id": "Azura"
   *     }
   *   ]
   * }
   * ```
   *
   * The children of each node will be further traversed until the entire dag
   * is explored. Unless {@link roots} is set to false, all initial roots must
   * be roots, i.e. they cann't occur in an call to children.
   *
   */
  // NOTE we can't infer data type for hierarchy generator because the children
  // and children data method also has to be typed
  (...data: readonly NodeDatum[]): Dag<NodeDatum, LinkDatum>;

  /**
   * Sets the children accessor to the given {@link ChildrenOperator} and
   * returns a new hierarchy operator. The default operator is:
   *
   * ```js
   * function children(d) {
   *   return d.children;
   * }
   * ```
   */
  children<NewDatum, NewChildren extends ChildrenOperator<NewDatum>>(
    ids: NewChildren & ChildrenOperator<NewDatum>
  ): ChildrenHierarchyOperator<NewDatum, NewChildren>;
  /**
   * Gets the current {@link ChildrenOperator}, If {@link childrenData} was specified,
   * this will return a {@link WrappedChildrenOperator | wrapped version} that
   * returns only the children of that operator.
   */
  children(): Ops["children"];

  /**
   * Sets the childrenData accessor to the given {@link ChildrenDataOperator} and
   * returns a new hierarchy operator.
   */
  childrenData<
    NewDatum,
    NewLink,
    NewChildrenData extends ChildrenDataOperator<NewDatum, NewLink>
  >(
    data: NewChildrenData & ChildrenDataOperator<NewDatum, NewLink>
  ): ChildrenDataHierarchyOperator<NewDatum, NewLink, NewChildrenData>;
  /**
   * Get the current childrenData operator. If {@link children} was specified, this
   * will return a {@link WrappedChildrenDataOperator | wrapped version} that
   * returns undefined data.
   */
  childrenData(): Ops["childrenData"];

  /**
   * Specify if only roots should be passed in, if true, hierarchy will throw
   * an error if a non-root was passed initially. (default: true)
   */
  roots(val: boolean): HierarchyOperator<NodeDatum, LinkDatum, Ops>;
  /** get the current roots value. */
  roots(): boolean;

  /**
   * Sets whether edges should be reversed to remove cycles
   *
   * If true, after creating the initial "graph" of nodes, an algorithm will
   * run to reverse enough edges to make the resulting data structure a valid
   * dag. It does this by reversing links in the original dag. Note that since
   * the structure is still a dag, old parents could now be positioned as
   * children, and instead the link will have `reversed` set to true. It is up
   * to the user to decide how to handle these links.
   *
   * Also note that by default, all inputs still need to be roots, if a "root"
   * node is in a cycle then {@link HierarchyOperator.roots} must also be set
   * to `false`. (default: false)
   */
  decycle(val: boolean): HierarchyOperator<NodeDatum, LinkDatum, Ops>;
  /** get the current decycle setting */
  decycle(): boolean;
}

function buildHierarchy<N, L, Ops extends HierarchyOperators<N, L>>(
  operators: Ops &
    HierarchyOperators<N, L> & { roots: boolean; decycle: boolean }
): HierarchyOperator<N, L, Ops> {
  function hierarchy(...data: N[]): Dag<N, L> {
    if (!data.length) {
      throw new Error("must pass in at least one node");
    }

    const mapping = new Map<N, LayoutDagNode<N, L>>();
    const queue: LayoutDagNode<N, L>[] = [];

    function nodify(datum: N): DagNode<N, L> {
      let node = mapping.get(datum);
      if (node === undefined) {
        node = new LayoutDagNode(datum);
        mapping.set(datum, node);
        queue.push(node);
      }
      return node;
    }
    const roots = data.map(nodify);
    let node;
    let i = 0;
    while ((node = queue.pop())) {
      node.dataChildren = (operators.childrenData(node.data, i++) ?? []).map(
        ([childDatum, linkDatum]) =>
          new LayoutChildLink(nodify(childDatum), linkDatum)
      );
    }

    // verify roots are roots
    const rootSet = new Set(roots);
    for (const node of mapping.values()) {
      for (const { child } of node.dataChildren) {
        if (rootSet.delete(child) && operators.roots) {
          throw new Error(js`node '${node.data}' pointed to a root`);
        }
      }
    }

    // NOTE if rootSet is empty then we have a cycle, but we defer to verifyDag
    // to get better printing
    const trueRoots = operators.decycle
      ? removeCycles([...mapping.values()])
      : rootSet.size
      ? [...rootSet]
      : roots;

    // create dag
    verifyDag(trueRoots, !operators.decycle);
    return trueRoots.length > 1 ? new LayoutDag(trueRoots) : trueRoots[0];
  }

  function children(): Ops["children"];
  function children<NN, NC extends ChildrenOperator<NN>>(
    childs: NC
  ): ChildrenHierarchyOperator<NN, NC>;
  function children<NN, NC extends ChildrenOperator<NN>>(
    childs?: NC
  ): Ops["children"] | ChildrenHierarchyOperator<NN, NC> {
    if (childs === undefined) {
      return operators.children;
    } else {
      const { children: _, childrenData: __, ...rest } = operators;
      return buildHierarchy({
        ...rest,
        children: childs,
        childrenData: wrapChildren(childs),
      });
    }
  }
  hierarchy.children = children;

  function childrenData(): Ops["childrenData"];
  function childrenData<NN, NL, NCD extends ChildrenDataOperator<NN, NL>>(
    data: NCD
  ): ChildrenDataHierarchyOperator<NN, NL, NCD>;
  function childrenData<NN, NL, NCD extends ChildrenDataOperator<NN, NL>>(
    data?: NCD
  ): Ops["childrenData"] | ChildrenDataHierarchyOperator<NN, NL, NCD> {
    if (data === undefined) {
      return operators.childrenData;
    } else {
      const { children: _, childrenData: __, ...rest } = operators;
      return buildHierarchy({
        ...rest,
        children: wrapChildrenData(data),
        childrenData: data,
      });
    }
  }
  hierarchy.childrenData = childrenData;

  function roots(): boolean;
  function roots(val: boolean): HierarchyOperator<N, L, Ops>;
  function roots(val?: boolean): boolean | HierarchyOperator<N, L, Ops> {
    if (val === undefined) {
      return operators.roots;
    } else {
      return buildHierarchy({ ...operators, roots: val });
    }
  }
  hierarchy.roots = roots;

  function decycle(): boolean;
  function decycle(val: boolean): HierarchyOperator<N, L, Ops>;
  function decycle(val?: boolean): boolean | HierarchyOperator<N, L, Ops> {
    if (val === undefined) {
      return operators.decycle;
    } else {
      return buildHierarchy({ ...operators, decycle: val });
    }
  }
  hierarchy.decycle = decycle;

  return hierarchy;
}

function wrapChildren<N, C extends ChildrenOperator<N>>(
  children: C
): WrappedChildrenOperator<N, C> {
  function wrapped(d: N, i: number): [N, undefined][] {
    return (children(d, i) ?? []).map((d) => [d, undefined]);
  }
  wrapped.wrapped = children;
  return wrapped;
}

function wrapChildrenData<N, C extends ChildrenDataOperator<N>>(
  childrenData: C
): WrappedChildrenDataOperator<N, C> {
  function wrapped(d: N, i: number): N[] {
    return (childrenData(d, i) ?? []).map(([d]) => d);
  }
  wrapped.wrapped = childrenData;
  return wrapped;
}

/** an object with children */
export interface HasChildren {
  /** the children */
  readonly children?: readonly HasChildren[] | undefined;
}

function hasChildren(d: unknown): d is HasChildren {
  try {
    const children = (d as HasChildren).children;
    return children === undefined || children instanceof Array;
  } catch {
    return false;
  }
}

function defaultChildren(d: unknown): readonly HasChildren[] | undefined {
  if (hasChildren(d)) {
    return d.children;
  } else {
    throw new Error(
      js`default children function expected datum to have a children field but got: ${d}`
    );
  }
}

/** the default hierarchy operator */
export type DefaultHierarchyOperator = ChildrenHierarchyOperator<
  HasChildren,
  ChildrenOperator<HasChildren>
>;

/**
 * Constructs a new {@link HierarchyOperator} with default settings. This is
 * bundled as {@link dagHierarchy}.
 */
export function hierarchy(...args: never[]): DefaultHierarchyOperator {
  if (args.length) {
    throw new Error(
      `got arguments to hierarchy(${args}), but constructor takes no arguments. ` +
        "These were probably meant as data which should be called as hierarchy()(...)"
    );
  } else {
    return buildHierarchy({
      children: defaultChildren,
      childrenData: wrapChildren(defaultChildren),
      roots: true,
      decycle: false,
    });
  }
}

/************
 * Stratify *
 ************/

/**
 * The interface for getting the parent ids from data. This must return an
 * array of the ids of every parent of this node. `i` will increment in the
 * order nodes are processed.
 *
 * This can be modified with the {@link StratifyOperator.parentIds} method.
 */
export interface ParentIdsOperator<NodeDatum = never> {
  (d: NodeDatum, i: number): readonly string[] | undefined;
}

/** the node datum of a parent ids operator */
export type ParIdsNodeDatum<P extends ParentIdsOperator> =
  P extends ParentIdsOperator<infer N> ? N : never;

/**
 * The interface for getting the parent ids and link data from the current node
 * data. This must return an array of parent ids coupled with data (i.e. an
 * array of two element arrays of the form ["Parent Id", data]) for the link
 * between this node and the parent id.
 *
 * This can be modified with the {@link StratifyOperator.parentData} method.
 */
export interface ParentDataOperator<NodeDatum = never, LinkDatum = unknown> {
  (d: NodeDatum, i: number):
    | readonly (readonly [string, LinkDatum])[]
    | undefined;
}

/** the node datum of a parent data operator */
export type ParDataNodeDatum<P extends ParentDataOperator> =
  P extends ParentDataOperator<infer N> ? N : never;

type StratifyNodeDatum<Ops extends StratifyOperators> =
  Ops extends StratifyOperators<infer N> ? N : never;

/**
 * What gets returned by {@link StratifyOperator.parentData}() when {@link StratifyOperator.parentIds} is set.
 */
export interface WrappedParentIdsOperator<ParentIds extends ParentIdsOperator>
  extends ParentDataOperator<ParIdsNodeDatum<ParentIds>, undefined> {
  /** the wrapped parent ids operator */
  wrapped: ParentIds;
}

/**
 * What gets returned by {@link StratifyOperator.parentIds}() when {@link StratifyOperator.parentData} is set.
 */
export interface WrappedParentDataOperator<
  ParentData extends ParentDataOperator
> extends ParentIdsOperator<ParDataNodeDatum<ParentData>> {
  /** the wrapped parent data operator */
  wrapped: ParentData;
}

/** the operators for the stratify operator */
export interface StratifyOperators<NodeDatum = never, LinkDatum = unknown> {
  /** the id operator */
  id: IdOperator<NodeDatum>;
  /** the parent ids operator */
  parentIds: ParentIdsOperator<NodeDatum>;
  /** the parent data operator */
  parentData: ParentDataOperator<NodeDatum, LinkDatum>;
}

/** the id stratify operator */
export type IdsStratifyOperator<
  Ops extends StratifyOperators,
  ParentIds extends ParentIdsOperator
> = StratifyOperator<
  undefined,
  Up<
    Ops,
    {
      /** new parent ids */
      parentIds: ParentIds;
      /** new parent data */
      parentData: WrappedParentIdsOperator<ParentIds>;
    }
  >
>;

/** a stratify operator with parent data specified */
export type DataStratifyOperator<
  LinkDatum,
  Ops extends StratifyOperators,
  ParentData extends ParentDataOperator<never, LinkDatum>
> = StratifyOperator<
  LinkDatum,
  Up<
    Ops,
    {
      /** new parent data */
      parentData: ParentData;
      /** new parent ids */
      parentIds: WrappedParentDataOperator<ParentData>;
    }
  >
>;

export interface StratifyOperator<
  LinkDatum,
  Ops extends StratifyOperators<never, LinkDatum>
> {
  /**
   * The operator that constructs a {@link Dag} from stratified tabularesque
   * data.
   *
   * Create a default operator with {@link stratify}. The accessors for a node's
   * {@link id} or {@link parentIds | parents' ids} can be altered, or {@link
   * parentData} can be specified to specify parent ids and attach data to the
   * edge for that parent.
   *
   * @example
   * ```typescript
   * const data = [{ id: "parent" }, { id: "child", parents: ["parent"] }];
   * const create = stratify().parentIds(({ parents }) => parents);
   * const dag = create(data);
   * ```
   *
   * @example
   * ```json
   * [
   *   {
   *     "id": "Eve"
   *   },
   *   {
   *     "id": "Cain",
   *     "parentIds": ["Eve"]
   *   },
   *   {
   *     "id": "Seth",
   *     "parentIds": ["Eve"]
   *   },
   *   {
   *     "id": "Enos",
   *     "parentIds": ["Seth"]
   *   },
   *   {
   *     "id": "Noam",
   *     "parentIds": ["Seth"]
   *   },
   *   {
   *     "id": "Abel",
   *     "parentIds": ["Eve"]
   *   },
   *   {
   *     "id": "Awan",
   *     "parentIds": ["Eve"]
   *   },
   *   {
   *     "id": "Enoch",
   *     "parentIds": ["Eve"]
   *   },
   *   {
   *     "id": "Azura",
   *     "parentIds": ["Eve"]
   *   }
   * ]
   * ```
   */
  <N extends StratifyNodeDatum<Ops>>(data: readonly N[]): Dag<N, LinkDatum>;

  /**
   * Sets the id accessor to the given {@link IdOperator} and returns a
   * StratifyOperator. The default operator is:
   *
   * ```js
   * function id(d) {
   *   return d.id;
   * }
   * ```
   */
  id<NewId extends IdOperator>(
    id: NewId
  ): StratifyOperator<
    LinkDatum,
    Up<
      Ops,
      {
        /** the new id */
        id: NewId;
      }
    >
  >;
  /**
   * Gets the current id accessor.
   */
  id(): Ops["id"];

  /**
   * Sets the parentIds accessor to the given {@link ParentIdsOperator}
   * and returns an update operator. The default operator is:
   *
   * ```js
   * function parentIds(d) {
   *   return d.parentIds;
   * }
   * ```
   */
  parentIds<NewParentIds extends ParentIdsOperator>(
    ids: NewParentIds
  ): IdsStratifyOperator<Ops, NewParentIds>;
  /**
   * Gets the current parent ids accessor.  If {@link parentData} was passed, the
   * returned function will {@link WrappedParentDataOperator | wrap} that to
   * just return the ids.
   */
  parentIds(): Ops["parentIds"];

  /**
   * Sets the parentData accessor to the given {@link ParentDataOperator} and
   * returns an updated operator.
   */
  parentData<
    NewLinkDatum,
    NewParentData extends ParentDataOperator<never, NewLinkDatum>
  >(
    data: NewParentData & ParentDataOperator<never, NewLinkDatum>
  ): DataStratifyOperator<NewLinkDatum, Ops, NewParentData>;
  /**
   * Gets the current parentData accessor. If {@link parentIds} was passed, this
   * will {@link WrappedParentIdsOperator | wrap} that to just return the ids
   * with `undefined` data.
   */
  parentData(): Ops["parentData"];

  /**
   * Sets whether edges should be reversed to remove cycles
   *
   * If true, after creating the initial "graph" of nodes, an algorithm will
   * run to reverse enough edges to make the resulting data structure a valid
   * dag. It does this by reversing links in the original dag. Note that since
   * the structure is still a dag, old parents could now be positioned as
   * children, and instead the link will have `reversed` set to true. It is up
   * to the user to decide how to handle these links. (default: false)
   */
  decycle(val: boolean): StratifyOperator<LinkDatum, Ops>;
  /** get the current decycle setting */
  decycle(): boolean;
}

function buildStratify<
  NodeDatum,
  L,
  Ops extends StratifyOperators<NodeDatum, L>
>(
  operators: Ops & StratifyOperators<NodeDatum, L> & { decycle: boolean }
): StratifyOperator<L, Ops> {
  function stratify<N extends StratifyNodeDatum<Ops>>(
    data: readonly N[]
  ): Dag<N, L> {
    if (!data.length) throw new Error("can't stratify empty data");

    const mapping = new Map<
      string,
      [LayoutDagNode<N, L>, readonly (readonly [string, L])[]]
    >();
    for (const [i, datum] of data.entries()) {
      const nid = verifyId(operators.id(datum, i));
      const pdata = operators.parentData(datum, i) ?? [];
      const node = new LayoutDagNode<N, L>(datum);
      if (mapping.has(nid)) {
        throw new Error(`found a duplicate id: ${id}`);
      } else {
        mapping.set(nid, [node, pdata]);
      }
    }

    const baseRoots: DagNode<N, L>[] = [];
    for (const [node, pdata] of mapping.values()) {
      for (const [pid, linkData] of pdata) {
        const info = mapping.get(pid);
        if (!info) throw new Error(`missing id: ${pid}`);
        const [par] = info;
        par.dataChildren.push(new LayoutChildLink(node, linkData));
      }
      if (!pdata.length) {
        baseRoots.push(node);
      }
    }

    const roots = operators.decycle
      ? removeCycles([...map(mapping.values(), ([node]) => node)])
      : baseRoots;
    verifyDag(roots, !operators.decycle);
    return roots.length > 1 ? new LayoutDag(roots) : roots[0];
  }

  function id(): Ops["id"];
  function id<I extends IdOperator>(
    op: I
  ): StratifyOperator<L, Up<Ops, { id: I }>>;
  function id<I extends IdOperator>(
    op?: I
  ): Ops["id"] | StratifyOperator<L, Up<Ops, { id: I }>> {
    if (op === undefined) {
      return operators.id;
    } else {
      const { id: _, ...rest } = operators;
      return buildStratify({ ...rest, id: op });
    }
  }
  stratify.id = id;

  function parentData(): Ops["parentData"];
  function parentData<NL, D extends ParentDataOperator<never, NL>>(
    data: D
  ): DataStratifyOperator<NL, Ops, D>;
  function parentData<NL, D extends ParentDataOperator<never, NL>>(
    data?: D
  ): Ops["parentData"] | DataStratifyOperator<NL, Ops, D> {
    if (data === undefined) {
      return operators.parentData;
    } else {
      const { parentIds: _, parentData: __, ...rest } = operators;
      return buildStratify({
        ...rest,
        parentIds: wrapParentData(data),
        parentData: data,
      });
    }
  }
  stratify.parentData = parentData;

  function parentIds(): Ops["parentIds"];
  function parentIds<P extends ParentIdsOperator>(
    ids: P
  ): IdsStratifyOperator<Ops, P>;
  function parentIds<P extends ParentIdsOperator>(
    ids?: P
  ): Ops["parentIds"] | IdsStratifyOperator<Ops, P> {
    if (ids === undefined) {
      return operators.parentIds;
    } else {
      const { parentIds: _, parentData: __, ...rest } = operators;
      return buildStratify({
        ...rest,
        parentIds: ids,
        parentData: wrapParentIds(ids),
      });
    }
  }
  stratify.parentIds = parentIds;

  function decycle(): boolean;
  function decycle(val: boolean): StratifyOperator<L, Ops>;
  function decycle(val?: boolean): StratifyOperator<L, Ops> | boolean {
    if (val === undefined) {
      return operators.decycle;
    } else {
      return buildStratify({ ...operators, decycle: val });
    }
  }
  stratify.decycle = decycle;

  return stratify;
}

function wrapParentIds<N, P extends ParentIdsOperator<N>>(
  parentIds: P & ParentIdsOperator<N>
): WrappedParentIdsOperator<P> {
  function wrapper(d: N, i: number): [string, undefined][] {
    return (parentIds(d, i) ?? []).map((id) => [id, undefined]);
  }
  wrapper.wrapped = parentIds;
  return wrapper;
}

function wrapParentData<N, D extends ParentDataOperator<N>>(
  parentData: D & ParentDataOperator<N>
): WrappedParentDataOperator<D> {
  function wrapper(d: N, i: number): string[] {
    return (parentData(d, i) ?? []).map(([id]) => id);
  }
  wrapper.wrapped = parentData;
  return wrapper;
}

/** default interface for types with an id */
export interface HasId {
  /** the id */
  readonly id: string;
}

function hasId(d: unknown): d is HasId {
  try {
    return typeof (d as HasId).id === "string";
  } catch {
    return false;
  }
}

function defaultId(data: unknown): string {
  if (hasId(data)) {
    return data.id;
  } else {
    throw new Error(
      js`default id function expected datum to have an id field but got '${data}'`
    );
  }
}

/** default interface for data types with parent ids */
export interface HasParentIds {
  /** the parent ids */
  readonly parentIds?: readonly string[] | undefined;
}

function hasParentIds(d: unknown): d is HasParentIds {
  try {
    const parentIds = (d as HasParentIds).parentIds;
    return (
      parentIds === undefined ||
      (parentIds instanceof Array &&
        parentIds.every((id) => typeof id === "string"))
    );
  } catch {
    return false;
  }
}

function defaultParentIds(d: unknown): readonly string[] | undefined {
  if (hasParentIds(d)) {
    return d.parentIds;
  } else {
    throw new Error(
      `default parentIds function expected datum to have a parentIds field but got: ${d}`
    );
  }
}

/** the default stratify operator */
export type DefaultStratifyOperator = IdsStratifyOperator<
  {
    /** the id operator */
    id: IdOperator<HasId>;
    /** the parent id operator */
    parentIds: ParentIdsOperator;
    /** the parent data operator */
    parentData: ParentDataOperator;
  },
  ParentIdsOperator<HasParentIds>
>;

/**
 * Constructs a new {@link StratifyOperator} with the default settings. This is
 * bundled as {@link dagStratify}.
 */
export function stratify(...args: never[]): DefaultStratifyOperator {
  if (args.length) {
    throw new Error(
      `got arguments to stratify(${args}), but constructor takes no arguments. ` +
        "These were probably meant as data which should be called as stratify()(...)"
    );
  } else {
    return buildStratify({
      id: defaultId,
      parentIds: defaultParentIds,
      parentData: wrapParentIds(defaultParentIds),
      decycle: false,
    });
  }
}
