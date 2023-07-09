import { graph, MutGraph, MutGraphNode } from ".";
import { every, isIterable, map } from "../iters";
import { err, U } from "../utils";
import { Id, verifyId } from "./utils";

/**
 * The interface for getting the parent ids from data. This must return an
 * array of the ids of every parent of this node. `i` will increment in the
 * order nodes are processed.
 *
 * This can be modified with the {@link Stratify#parentIds} method.
 */
export interface ParentIds<in NodeDatum = never> {
  /**
   * get parent ids from a node datum
   *
   * @param datum - the node data to get parent ids from
   * @param index - the order that the datum was encountered in
   * @returns parentIds - the parent ids that correspond to the node datum,
   *   undefined is the same as empty
   */
  (datum: NodeDatum, index: number): Iterable<string> | undefined;
}

/**
 * The interface for getting the parent ids and link data from the current node
 * data. This must return an array of parent ids coupled with data (i.e. an
 * array of two element arrays of the form ["Parent Id", data]) for the link
 * between this node and the parent id.
 *
 * This can be modified with the {@link Stratify#parentData} method.
 */
export interface ParentData<in NodeDatum = never, out LinkDatum = unknown> {
  /**
   * get parent ids and link data from a node datum
   *
   * @param datum - the node data to get parent ids from
   * @param index - the order that the datum was encountered in
   * @returns parentData - the parent ids and link data that correspond to the
   *   node datum, undefined is the same as empty
   */
  (
    datum: NodeDatum,
    index: number,
  ): Iterable<readonly [string, LinkDatum]> | undefined;
}

type StratifyNodeDatum<Ops extends StratifyOps> = Ops extends StratifyOps<
  infer N
>
  ? N
  : never;

/**
 * What gets returned by {@link Stratify#parentData}() when {@link Stratify#parentIds} is set.
 */
export interface WrappedParentIds<ParIds extends ParentIds>
  extends ParentData<ParIds extends ParentIds<infer N> ? N : never, undefined> {
  /** the wrapped parent ids operator */
  wrapped: ParIds;
}

/**
 * What gets returned by {@link Stratify#parentIds}() when {@link Stratify#parentData} is set.
 */
export interface WrappedParentData<ParData extends ParentData>
  extends ParentIds<ParData extends ParentData<infer N> ? N : never> {
  /** the wrapped parent data operator */
  wrapped: ParData;
}

/** the operators for the stratify operator */
export interface StratifyOps<in NodeDatum = never, out LinkDatum = unknown> {
  /** the id operator */
  id: Id<NodeDatum>;
  /** the parent ids operator */
  parentIds: ParentIds<NodeDatum>;
  /** the parent data operator */
  parentData: ParentData<NodeDatum, LinkDatum>;
}

/** the id stratify operator */
type IdsStratify<Ops extends StratifyOps, ParIds extends ParentIds> = Stratify<
  undefined,
  {
    id: Ops["id"];
    parentIds: ParIds;
    parentData: WrappedParentIds<ParIds>;
  }
>;

/** a stratify operator with parent data specified */
type DataStratify<
  LinkDatum,
  Ops extends StratifyOps,
  ParData extends ParentData<never, LinkDatum>,
> = Stratify<
  LinkDatum,
  {
    id: Ops["id"];
    parentData: ParData;
    parentIds: WrappedParentData<ParData>;
  }
>;

/**
 * The operator that constructs a {@link MutGraph} from stratified tabularesque
 * data.
 *
 * Create a default operator with {@link graphStratify}. The accessors for a node's
 * {@link id} or {@link parentIds | parents' ids} can be altered, or
 * {@link parentData} can be specified to specify parent ids and attach data
 * to the edge for that parent.
 */
export interface Stratify<
  LinkDatum,
  Ops extends StratifyOps<never, LinkDatum>,
> {
  /**
   * create a graph from stratify data
   *
   * @param data - the node data to create a graph from
   * @returns graph - the graph representation of the data
   */
  <N extends StratifyNodeDatum<Ops>>(
    data: readonly N[],
  ): MutGraph<N, LinkDatum>;

  /**
   * Sets the id accessor to the given {@link Id} and returns a
   * Stratify. The default operator is:
   *
   * ```js
   * function id(d) {
   *   return d.id;
   * }
   * ```
   */
  id<NewId extends Id>(id: NewId): Stratify<LinkDatum, U<Ops, "id", NewId>>;
  /**
   * Gets the current id accessor.
   */
  id(): Ops["id"];

  /**
   * Sets the parentIds accessor to the given {@link ParentIds}
   * and returns an update operator. The default operator is:
   *
   * ```js
   * function parentIds(d) {
   *   return d.parentIds;
   * }
   * ```
   */
  parentIds<NewParentIds extends ParentIds>(
    ids: NewParentIds,
  ): Stratify<
    undefined,
    {
      /** current id operator */
      id: Ops["id"];
      /** new parent ids */
      parentIds: NewParentIds;
      /** new parent data */
      parentData: WrappedParentIds<NewParentIds>;
    }
  >;
  /**
   * Gets the current parent ids accessor.  If {@link parentData} was passed, the
   * returned function will {@link WrappedParentData | wrap} that to
   * just return the ids.
   */
  parentIds(): Ops["parentIds"];

  /**
   * Sets the parentData accessor to the given {@link ParentData} and
   * returns an updated operator.
   */
  parentData<
    NewLinkDatum,
    NewParentData extends ParentData<never, NewLinkDatum>,
  >(
    data: NewParentData & ParentData<never, NewLinkDatum>,
  ): Stratify<
    NewLinkDatum,
    {
      /** current id operator */
      id: Ops["id"];
      /** new parent data */
      parentData: NewParentData;
      /** new parent ids */
      parentIds: WrappedParentData<NewParentData>;
    }
  >;
  /**
   * Gets the current parentData accessor. If {@link parentIds} was passed, this
   * will {@link WrappedParentIds | wrap} that to just return the ids
   * with `undefined` data.
   */
  parentData(): Ops["parentData"];
}

function buildStratify<NodeDatum, L, Ops extends StratifyOps<NodeDatum, L>>(
  operators: Ops & StratifyOps<NodeDatum, L>,
): Stratify<L, Ops> {
  function stratify<N extends StratifyNodeDatum<Ops>>(
    data: readonly N[],
  ): MutGraph<N, L> {
    const stratified = graph<N, L>();

    const mapping = new Map<string, MutGraphNode<N, L>>();
    const links: [string, MutGraphNode<N, L>, L][] = [];
    for (const [i, datum] of data.entries()) {
      const nid = verifyId(operators.id(datum, i));
      const node = stratified.node(datum);
      const pdata = operators.parentData(datum, i) ?? [];
      for (const [pid, ldatum] of pdata) {
        links.push([pid, node, ldatum]);
      }
      if (mapping.has(nid)) {
        throw err`found a duplicate id: ${id}, but ids passed to \`graphStratify()\` must be unique`;
      } else {
        mapping.set(nid, node);
      }
    }

    for (const [pid, cnode, ldatum] of links) {
      const pnode = mapping.get(pid);
      if (!pnode)
        throw err`missing id: ${pid}; this id was references in a node's parentIds, but no node with that id exists`;
      stratified.link(pnode, cnode, ldatum);
    }

    return stratified;
  }

  function id(): Ops["id"];
  function id<I extends Id>(op: I): Stratify<L, U<Ops, "id", I>>;
  function id<I extends Id>(op?: I): Ops["id"] | Stratify<L, U<Ops, "id", I>> {
    if (op === undefined) {
      return operators.id;
    } else {
      const { id: _, ...rest } = operators;
      return buildStratify({ ...rest, id: op });
    }
  }
  stratify.id = id;

  function parentData(): Ops["parentData"];
  function parentData<NL, D extends ParentData<never, NL>>(
    data: D,
  ): DataStratify<NL, Ops, D>;
  function parentData<NL, D extends ParentData<never, NL>>(
    data?: D,
  ): Ops["parentData"] | DataStratify<NL, Ops, D> {
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
  function parentIds<P extends ParentIds>(ids: P): IdsStratify<Ops, P>;
  function parentIds<P extends ParentIds>(
    ids?: P,
  ): Ops["parentIds"] | IdsStratify<Ops, P> {
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

  return stratify;
}

function wrapParentIds<N, P extends ParentIds<N>>(
  parentIds: P & ParentIds<N>,
): WrappedParentIds<P> {
  function wrapper(d: N, i: number): IterableIterator<[string, undefined]> {
    return map(parentIds(d, i) ?? [], (id) => [id, undefined]);
  }
  wrapper.wrapped = parentIds;
  return wrapper;
}

function wrapParentData<N, D extends ParentData<N>>(
  parentData: D & ParentData<N>,
): WrappedParentData<D> {
  function wrapper(d: N, i: number): IterableIterator<string> {
    return map(parentData(d, i) ?? [], ([id]) => id);
  }
  wrapper.wrapped = parentData;
  return wrapper;
}

/** default interface for types with an id */
export interface HasId {
  /** the id */
  readonly id: string;
}

function defaultId(data: unknown): string {
  if (typeof data !== "object" || data === null || !("id" in data)) {
    throw err`datum did not have an id field, and no id accessor was specified; try calling \`graphStratify().id(d => d...)\` to set a custom id accessor`;
  }
  const { id } = data;
  if (typeof id === "string") {
    return id;
  } else {
    throw err`datum has an id field that was not a string, and no id accessor was specified; try calling \`graphStratify().id(d => d...)\` to set a custom id accessor`;
  }
}

/** default interface for data types with parent ids */
export interface HasParentIds {
  /** the parent ids */
  readonly parentIds?: Iterable<string> | undefined;
}

function defaultParentIds(data: unknown): Iterable<string> | undefined {
  if (typeof data !== "object" || data === null) {
    throw err`default parentIds function expected datum to be an object but got: ${data}; try setting a custom accessor for parentIds with \`graphStratify().parentIds(d => ...)\``;
  } else if (!("parentIds" in data)) {
    return undefined;
  }
  const { parentIds } = data;
  if (
    parentIds === undefined ||
    (isIterable(parentIds) &&
      every(parentIds, (id): id is string => typeof id === "string"))
  ) {
    return parentIds;
  } else {
    throw err`default parentIds function expected parentIds to be an iterable of strings but got: ${parentIds}; try setting a custom accessor for parentIds with \`graphStratify().parentIds(d => ...)\``;
  }
}

/** the default stratify operator */
export type DefaultStratify = Stratify<
  undefined,
  {
    /** the id operator */
    id: Id<HasId>;
    /** the parent id operator */
    parentIds: ParentIds<HasParentIds>;
    /** the parent data operator */
    parentData: WrappedParentIds<ParentIds<HasParentIds>>;
  }
>;

/**
 * create a new {@link Stratify} with default settings
 *
 * Stratify operators create graphs from data that are in a tabular format,
 * with references to ids of their parents.  By default it expects node data to
 * have a string `id` property and `parentIds` property with an iterable of
 * parent ids.
 *
 * @example
 *
 * If you want to use the default operator:
 *
 * ```ts
 * data = [
 *   { "id": "Euler" },
 *   {
 *     "id": "Lagrange",
 *     "parentIds": ["Euler"]
 *   },
 *   {
 *     "id": "Fourier",
 *     "parentIds": ["Lagrange"]
 *   },
 *   {
 *     "id": "Poisson",
 *     "parentIds": ["Lagrange", "Laplace"]
 *   },
 *   {
 *     "id": "Dirichlet",
 *     "parentIds": ["Fourier", "Poisson"]
 *   },
 *   { "id": "Laplace" }
 * ] as const;
 *
 * const builder = stratify();
 * const grf = builder(data);
 * ```
 *
 * @example
 *
 * If you want to include custom link data:
 *
 * ```ts
 * data = [
 *   { "id": "Euler" },
 *   {
 *     "id": "Lagrange",
 *     "parentData": [["Euler", 1]]
 *   },
 * ] as const;
 *
 * const builder = stratify()
 *   .parentData(({ parentData = [] }) => parentData;
 * const grf = builder(data);
 * ```
 */
export function graphStratify(...args: never[]): DefaultStratify {
  if (args.length) {
    throw err`got arguments to graphStratify(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphStratify()(...)\``;
  } else {
    return buildStratify({
      id: defaultId,
      parentIds: defaultParentIds,
      parentData: wrapParentIds(defaultParentIds),
    });
  }
}
