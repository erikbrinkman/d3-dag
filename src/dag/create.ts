/**
 * Three built-in methods exist to turn existing raw data into {@link Dag}s:
 * 1. {@link HierarchyOperator} - when the data already has a dag structure.
 * 2. {@link StratifyOperator} - when the dag has a tabular structure, referencing parents by id.
 * 3. {@link ConnectOperator} - when the dag has a link structure and is specified as pairs of nodes.
 *
 * @module
 */
import { Dag, DagLink, DagNode, IterStyle } from ".";
import { entries, every, flatMap, length, map, reduce } from "../iters";
import { assert, def, dfs, js, Up } from "../utils";

/**********************
 * Dag Implementation *
 **********************/

class LayoutChildLink<NodeDatum, LinkDatum> {
  constructor(
    readonly child: DagNode<NodeDatum, LinkDatum>,
    public data: LinkDatum,
    public points: { x: number; y: number }[] = []
  ) {}
}

/**
 * The concrete class backing the {@link Link} interface.
 */
class LayoutLink<NodeDatum, LinkDatum>
  implements DagLink<NodeDatum, LinkDatum>
{
  constructor(
    readonly source: DagNode<NodeDatum, LinkDatum>,
    readonly target: DagNode<NodeDatum, LinkDatum>,
    readonly data: LinkDatum,
    readonly points: { x: number; y: number }[]
  ) {}
}

/**
 * The concrete implementation backing {@link Dag}.
 */
class LayoutDag<NodeDatum, LinkDatum> implements Dag<NodeDatum, LinkDatum> {
  private readonly proots?: DagNode<NodeDatum, LinkDatum>[];

  constructor(roots?: DagNode<NodeDatum, LinkDatum>[]) {
    if (roots) {
      this.proots = roots;
    }
  }

  [Symbol.iterator](): Iterator<DagNode<NodeDatum, LinkDatum>> {
    return this.idescendants()[Symbol.iterator]();
  }

  iroots(): Iterable<DagNode<NodeDatum, LinkDatum>> {
    const nonnull = def(this.proots);
    return { [Symbol.iterator]: () => nonnull[Symbol.iterator]() };
  }

  roots(): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.iroots()];
  }

  private *idepth(): Iterable<DagNode<NodeDatum, LinkDatum>> {
    const ch = (node: DagNode<NodeDatum, LinkDatum>) => node.ichildren();
    yield* dfs(ch, ...this.iroots());
  }

  private *ibreadth(): Iterable<DagNode<NodeDatum, LinkDatum>> {
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

  private *ibefore(): Iterable<DagNode<NodeDatum, LinkDatum>> {
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

  private *iafter(): Iterable<DagNode<NodeDatum, LinkDatum>> {
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
        queue.push(node); // need to revisit after children
        queue.push(...node.ichildren());
      }
    }
  }

  idescendants(
    style: IterStyle = "depth"
  ): Iterable<DagNode<NodeDatum, LinkDatum>> {
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

  descendants(style: IterStyle = "depth"): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.idescendants(style)];
  }

  ilinks(): Iterable<DagLink<NodeDatum, LinkDatum>> {
    return flatMap(this.idescendants(), (node) => node.ichildLinks());
  }

  links(): DagLink<NodeDatum, LinkDatum>[] {
    return [...this.ilinks()];
  }

  size(): number {
    return reduce(this.idescendants(), (s) => s + 1, 0);
  }

  sum(
    callback: (node: DagNode<NodeDatum, LinkDatum>, index: number) => number
  ): this {
    const descendantVals = new Map<DagNode, Map<DagNode, number>>();
    for (const [index, node] of entries(this.idescendants("after"))) {
      const val = callback(node, index);
      const nodeVals = new Map<DagNode, number>();
      nodeVals.set(node, val);
      for (const child of node.ichildren()) {
        const childMap = def(descendantVals.get(child));
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

  height(): this {
    for (const node of this.idescendants("after")) {
      node.value = Math.max(
        0,
        ...map(node.ichildren(), (child) => def(child.value) + 1)
      );
    }
    return this;
  }

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
        ...map(parents.get(node) || [], (par) => def(par.value) + 1)
      );
    }
    return this;
  }

  *isplit(): Iterable<Dag<NodeDatum, LinkDatum>> {
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
    ): Generator<DagNode<NodeDatum, LinkDatum>, void, undefined> {
      yield* node.ichildren();
      yield* parents.get(node) || [];
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

  split(): Dag<NodeDatum, LinkDatum>[] {
    return [...this.isplit()];
  }

  connected(): boolean {
    const iter = this.isplit()[Symbol.iterator]();
    let { done } = iter.next();
    assert(!done);
    ({ done } = iter.next());
    return !!done;
  }
}

/**
 * Concrete implementation of {@link DagNode}.
 */
class LayoutDagNode<NodeDatum, LinkDatum>
  extends LayoutDag<NodeDatum, LinkDatum>
  implements DagNode<NodeDatum, LinkDatum>
{
  dataChildren: LayoutChildLink<NodeDatum, LinkDatum>[] = [];

  constructor(public data: NodeDatum) {
    super();
  }

  // NOTE everything extends from iroots, so by overriding this, we allow
  // dag nodes to work effectively
  iroots(): Iterable<DagNode<NodeDatum, LinkDatum>> {
    const singleton = [this];
    return { [Symbol.iterator]: () => singleton[Symbol.iterator]() };
  }

  *ichildren(): Iterable<DagNode<NodeDatum, LinkDatum>> {
    for (const { child } of this.dataChildren) {
      yield child;
    }
  }

  children(): DagNode<NodeDatum, LinkDatum>[] {
    return [...this.ichildren()];
  }

  *ichildLinks(): Iterable<DagLink<NodeDatum, LinkDatum>> {
    for (const { child, data, points } of this.dataChildren) {
      yield new LayoutLink(this, child, data, points);
    }
  }

  childLinks(): DagLink<NodeDatum, LinkDatum>[] {
    return [...this.ichildLinks()];
  }

  // NOTE these are simpler for a single node, so we override
  isplit(): Iterable<Dag<NodeDatum, LinkDatum>> {
    return this.iroots();
  }

  split(): DagNode<NodeDatum, LinkDatum>[] {
    return this.roots();
  }

  connected(): true {
    return true;
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
 */
function verifyDag(roots: DagNode[]): void {
  // test that there are roots
  if (!roots.length) {
    throw new Error("dag contained no roots; this often indicates a cycle");
  }

  // make sure there's no duplicate edges
  for (const node of new LayoutDag(roots)) {
    const childIdSet = new Set(node.ichildren());
    if (childIdSet.size !== length(node.ichildren())) {
      throw new Error(js`node '${node.data}' contained duplicate children`);
    }
  }

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
 * The default node data on dags built using {@link ConnectOperator}
 */
export interface ConnectDatum {
  id: string;
}

/**
 * The operators that parametrize {@link ConnectOperator}
 */
interface ConnectOperators<L = never> {
  sourceId: IdOperator<L>;
  targetId: IdOperator<L>;
}

/**
 * The constraint applied to data passed into {@link ConnectOperator}
 * conditioned on its operators.
 */
type ConnectLinkDatum<Ops extends ConnectOperators> =
  Ops extends ConnectOperators<infer L> ? L : never;

export interface ConnectOperator<Ops extends ConnectOperators> {
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
  <L extends ConnectLinkDatum<Ops>>(data: readonly L[]): Dag<ConnectDatum, L>;

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
  ): ConnectOperator<Up<Ops, { sourceId: NewId }>>;
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
  ): ConnectOperator<Up<Ops, { targetId: NewId }>>;
  /** Gets the current targetId accessor. */
  targetId(): Ops["targetId"];

  /**
   * Sets the allowance for single nodes. If enabled and the source id equals
   * the target id, then a single node with no parents will be created.
   * Otherwise a self loop will be created which will result in an error. Note
   * only single nodes without parents or children need to be specified this
   * way, otherwise any other connection to a node will create it. (default: false)
   */
  single(val: boolean): ConnectOperator<Ops>;
  /** get the current single node setting. */
  single(): boolean;
}

function buildConnect<LinkDatum, Ops extends ConnectOperators<LinkDatum>>(
  operators: Ops & ConnectOperators<LinkDatum> & { single: boolean }
): ConnectOperator<Ops> {
  function connect<L extends LinkDatum>(
    data: readonly L[]
  ): Dag<ConnectDatum, L> {
    if (!data.length) {
      throw new Error("can't connect empty data");
    }
    const nodes = new Map<string, LayoutDagNode<ConnectDatum, L>>();
    const hasParents = new Set<string>();
    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(operators.sourceId(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = new LayoutDagNode<ConnectDatum, L>({ id: source });
        nodes.set(source, sourceNode);
      }
      const target = verifyId(operators.targetId(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = new LayoutDagNode<ConnectDatum, L>({ id: target });
        nodes.set(target, targetNode);
      }

      if (source !== target || !operators.single) {
        sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));
        hasParents.add(target);
      }
    }

    const roots: DagNode<ConnectDatum, L>[] = [];
    for (const [id, node] of nodes.entries()) {
      if (!hasParents.has(id)) {
        roots.push(node);
      }
    }
    verifyDag(roots);
    return roots.length > 1 ? new LayoutDag(roots) : roots[0];
  }

  function sourceId(): Ops["sourceId"];
  function sourceId<NI extends IdOperator>(
    id: NI
  ): ConnectOperator<Up<Ops, { sourceId: NI }>>;
  function sourceId<NI extends IdOperator>(
    id?: NI
  ): Ops["sourceId"] | ConnectOperator<Up<Ops, { sourceId: NI }>> {
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
  ): ConnectOperator<Up<Ops, { targetId: NI }>>;
  function targetId<NI extends IdOperator>(
    id?: NI
  ): Ops["targetId"] | ConnectOperator<Up<Ops, { targetId: NI }>> {
    if (id === undefined) {
      return operators.targetId;
    } else {
      const { targetId: _, ...rest } = operators;
      return buildConnect({ ...rest, targetId: id });
    }
  }
  connect.targetId = targetId;

  function single(): boolean;
  function single(val: boolean): ConnectOperator<Ops>;
  function single(val?: boolean): boolean | ConnectOperator<Ops> {
    if (val === undefined) {
      return operators.single;
    } else {
      return buildConnect({ ...operators, single: val });
    }
  }
  connect.single = single;

  return connect;
}

/** default interface for tuples that start with a string */
export interface ZeroString {
  readonly [0]: string;
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
  readonly [1]: string;
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

export type DefaultConnectOperator = ConnectOperator<{
  sourceId: IdOperator<ZeroString>;
  targetId: IdOperator<OneString>;
}>;

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
    return buildConnect<
      ZeroString & OneString,
      {
        sourceId: IdOperator<ZeroString>;
        targetId: IdOperator<OneString>;
      }
    >({
      sourceId: defaultSourceId,
      targetId: defaultTargetId,
      single: false
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
  wrapped: Children;
}

/**
 * What gets returned by {@link children}() when {@link childrenData} is set.
 */
export interface WrappedChildrenDataOperator<
  NodeDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum>
> extends ChildrenOperator<NodeDatum> {
  wrapped: ChildrenData;
}

interface HierarchyOperators<NodeDatum, LinkDatum = unknown> {
  children: ChildrenOperator<NodeDatum>;
  childrenData: ChildrenDataOperator<NodeDatum, LinkDatum>;
}

type ChildrenHierarchyOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> = HierarchyOperator<
  NodeDatum,
  undefined,
  {
    children: Children;
    childrenData: WrappedChildrenOperator<NodeDatum, Children>;
  }
>;

type ChildrenDataHierarchyOperator<
  NodeDatum,
  LinkDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum, LinkDatum>
> = HierarchyOperator<
  NodeDatum,
  LinkDatum,
  {
    children: WrappedChildrenDataOperator<NodeDatum, ChildrenData>;
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
}

function buildHierarchy<N, L, Ops extends HierarchyOperators<N, L>>(
  operators: Ops & HierarchyOperators<N, L> & { roots: boolean }
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
      node.dataChildren = (operators.childrenData(node.data, i++) || []).map(
        ([childDatum, linkDatum]) =>
          new LayoutChildLink(nodify(childDatum), linkDatum)
      );
    }

    // verify roots are roots
    const rootSet = new Set(roots);
    for (const node of mapping.values()) {
      for (const child of node.ichildren()) {
        if (rootSet.delete(child) && operators.roots) {
          throw new Error(js`node '${node.data}' pointed to a root`);
        }
      }
    }
    // NOTE if rootSet is empty then we have a cycle, but we defer to verifyDag
    // to get better printing
    const froots =
      rootSet.size && rootSet.size !== roots.length ? [...rootSet] : roots;

    // create dag
    verifyDag(froots);
    return froots.length > 1 ? new LayoutDag(froots) : froots[0];
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
      return buildHierarchy({
        children: childs,
        childrenData: wrapChildren(childs),
        roots: operators.roots
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
      return buildHierarchy({
        children: wrapChildrenData(data),
        childrenData: data,
        roots: operators.roots
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

  return hierarchy;
}

function wrapChildren<N, C extends ChildrenOperator<N>>(
  children: C
): WrappedChildrenOperator<N, C> {
  function wrapped(d: N, i: number): [N, undefined][] {
    return (children(d, i) || []).map((d) => [d, undefined]);
  }
  wrapped.wrapped = children;
  return wrapped;
}

function wrapChildrenData<N, C extends ChildrenDataOperator<N>>(
  childrenData: C
): WrappedChildrenDataOperator<N, C> {
  function wrapped(d: N, i: number): N[] {
    return (childrenData(d, i) || []).map(([d]) => d);
  }
  wrapped.wrapped = childrenData;
  return wrapped;
}

interface HasChildren {
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
      roots: true
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

type ParIdsNodeDatum<P extends ParentIdsOperator> = P extends ParentIdsOperator<
  infer N
>
  ? N
  : never;

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

type ParDataNodeDatum<P extends ParentDataOperator> =
  P extends ParentDataOperator<infer N> ? N : never;

type StratifyNodeDatum<Ops extends StratifyOperators> =
  Ops extends StratifyOperators<infer N> ? N : never;

/**
 * What gets returned by {@link StratifyOperator.parentData}() when {@link StratifyOperator.parentIds} is set.
 */
export interface WrappedParentIdsOperator<ParentIds extends ParentIdsOperator>
  extends ParentDataOperator<ParIdsNodeDatum<ParentIds>, undefined> {
  wrapped: ParentIds;
}

/**
 * What gets returned by {@link StratifyOperator.parentIds}() when {@link StratifyOperator.parentData} is set.
 */
export interface WrappedParentDataOperator<
  ParentData extends ParentDataOperator
> extends ParentIdsOperator<ParDataNodeDatum<ParentData>> {
  wrapped: ParentData;
}

interface StratifyOperators<NodeDatum = never, LinkDatum = unknown> {
  id: IdOperator<NodeDatum>;
  parentIds: ParentIdsOperator<NodeDatum>;
  parentData: ParentDataOperator<NodeDatum, LinkDatum>;
}

type IdsStratifyOperator<
  Ops extends StratifyOperators,
  ParentIds extends ParentIdsOperator
> = StratifyOperator<
  undefined,
  Up<
    Ops,
    {
      parentIds: ParentIds;
      parentData: WrappedParentIdsOperator<ParentIds>;
    }
  >
>;

type DataStratifyOperator<
  LinkDatum,
  Ops extends StratifyOperators,
  ParentData extends ParentDataOperator<never, LinkDatum>
> = StratifyOperator<
  LinkDatum,
  Up<
    Ops,
    {
      parentData: ParentData;
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
  ): StratifyOperator<LinkDatum, Up<Ops, { id: NewId }>>;
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
}

function buildStratify<
  NodeDatum,
  L,
  Ops extends StratifyOperators<NodeDatum, L>
>(operators: Ops & StratifyOperators<NodeDatum, L>): StratifyOperator<L, Ops> {
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
      const pdata = operators.parentData(datum, i) || [];
      const node = new LayoutDagNode<N, L>(datum);
      if (mapping.has(nid)) {
        throw new Error(`found a duplicate id: ${id}`);
      } else {
        mapping.set(nid, [node, pdata]);
      }
    }

    const roots: DagNode<N, L>[] = [];
    for (const [node, pdata] of mapping.values()) {
      for (const [pid, linkData] of pdata) {
        const info = mapping.get(pid);
        if (!info) throw new Error(`missing id: ${pid}`);
        const [par] = info;
        par.dataChildren.push(new LayoutChildLink(node, linkData));
      }
      if (!pdata.length) {
        roots.push(node);
      }
    }

    verifyDag(roots);
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
        parentData: data
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
        parentData: wrapParentIds(ids)
      });
    }
  }
  stratify.parentIds = parentIds;

  return stratify;
}

function wrapParentIds<N, P extends ParentIdsOperator<N>>(
  parentIds: P & ParentIdsOperator<N>
): WrappedParentIdsOperator<P> {
  function wrapper(d: N, i: number): [string, undefined][] {
    return (parentIds(d, i) || []).map((id) => [id, undefined]);
  }
  wrapper.wrapped = parentIds;
  return wrapper;
}

function wrapParentData<N, D extends ParentDataOperator<N>>(
  parentData: D & ParentDataOperator<N>
): WrappedParentDataOperator<D> {
  function wrapper(d: N, i: number): string[] {
    return (parentData(d, i) || []).map(([id]) => id);
  }
  wrapper.wrapped = parentData;
  return wrapper;
}

/** default interface for types with an id */
export interface HasId {
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

export type DefaultStratifyOperator = IdsStratifyOperator<
  {
    id: IdOperator<HasId>;
    // NOTE these are immediately overridden
    parentIds: ParentIdsOperator;
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
      parentData: wrapParentIds(defaultParentIds)
    });
  }
}
