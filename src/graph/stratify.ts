import { graph, MutGraph, MutGraphNode } from ".";
import { map } from "../iters";
import { err, U, Up } from "../utils";
import { IdOperator, verifyId } from "./utils";

/**
 * The interface for getting the parent ids from data. This must return an
 * array of the ids of every parent of this node. `i` will increment in the
 * order nodes are processed.
 *
 * This can be modified with the {@link Stratify#parentIds} method.
 */
export interface ParentIdsOperator<in NodeDatum = never> {
  (d: NodeDatum, i: number): Iterable<string> | undefined;
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
 * This can be modified with the {@link Stratify#parentData} method.
 */
export interface ParentDataOperator<
  in NodeDatum = never,
  out LinkDatum = unknown
> {
  (d: NodeDatum, i: number): Iterable<readonly [string, LinkDatum]> | undefined;
}

/** the node datum of a parent data operator */
export type ParDataNodeDatum<P extends ParentDataOperator> =
  P extends ParentDataOperator<infer N> ? N : never;

type StratifyNodeDatum<Ops extends StratifyOps> = Ops extends StratifyOps<
  infer N
>
  ? N
  : never;

/**
 * What gets returned by {@link Stratify#parentData}() when {@link Stratify#parentIds} is set.
 */
export interface WrappedParentIdsOperator<ParentIds extends ParentIdsOperator>
  extends ParentDataOperator<ParIdsNodeDatum<ParentIds>, undefined> {
  /** the wrapped parent ids operator */
  wrapped: ParentIds;
}

/**
 * What gets returned by {@link Stratify#parentIds}() when {@link Stratify#parentData} is set.
 */
export interface WrappedParentDataOperator<
  ParentData extends ParentDataOperator
> extends ParentIdsOperator<ParDataNodeDatum<ParentData>> {
  /** the wrapped parent data operator */
  wrapped: ParentData;
}

/** the operators for the stratify operator */
export interface StratifyOps<in NodeDatum = never, out LinkDatum = unknown> {
  /** the id operator */
  id: IdOperator<NodeDatum>;
  /** the parent ids operator */
  parentIds: ParentIdsOperator<NodeDatum>;
  /** the parent data operator */
  parentData: ParentDataOperator<NodeDatum, LinkDatum>;
}

/** the id stratify operator */
export type IdsStratify<
  Ops extends StratifyOps,
  ParentIds extends ParentIdsOperator
> = Stratify<
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
export type DataStratify<
  LinkDatum,
  Ops extends StratifyOps,
  ParentData extends ParentDataOperator<never, LinkDatum>
> = Stratify<
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

export interface Stratify<
  LinkDatum,
  Ops extends StratifyOps<never, LinkDatum>
> {
  /**
   * The operator that constructs a {@link graph!Graph} from stratified tabularesque
   * data.
   *
   * Create a default operator with {@link graphStratify}. The accessors for a node's
   * {@link id} or {@link parentIds | parents' ids} can be altered, or
   * {@link parentData} can be specified to specify parent ids and attach data
   * to the edge for that parent.
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
   *     "id": "Euler"
   *   },
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
   *   {
   *     "id": "Laplace"
   *   }
   * ]
   * ```
   */
  <N extends StratifyNodeDatum<Ops>>(data: readonly N[]): MutGraph<
    N,
    LinkDatum
  >;

  /**
   * Sets the id accessor to the given {@link graph/utils!IdOperator} and returns a
   * Stratify. The default operator is:
   *
   * ```js
   * function id(d) {
   *   return d.id;
   * }
   * ```
   */
  id<NewId extends IdOperator>(
    id: NewId
  ): Stratify<LinkDatum, U<Ops, "id", NewId>>;
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
  ): IdsStratify<Ops, NewParentIds>;
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
  ): DataStratify<NewLinkDatum, Ops, NewParentData>;
  /**
   * Gets the current parentData accessor. If {@link parentIds} was passed, this
   * will {@link WrappedParentIdsOperator | wrap} that to just return the ids
   * with `undefined` data.
   */
  parentData(): Ops["parentData"];
}

function buildStratify<NodeDatum, L, Ops extends StratifyOps<NodeDatum, L>>(
  operators: Ops & StratifyOps<NodeDatum, L>
): Stratify<L, Ops> {
  function stratify<N extends StratifyNodeDatum<Ops>>(
    data: readonly N[]
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
  function id<I extends IdOperator>(op: I): Stratify<L, U<Ops, "id", I>>;
  function id<I extends IdOperator>(
    op?: I
  ): Ops["id"] | Stratify<L, U<Ops, "id", I>> {
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
  ): DataStratify<NL, Ops, D>;
  function parentData<NL, D extends ParentDataOperator<never, NL>>(
    data?: D
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
  function parentIds<P extends ParentIdsOperator>(ids: P): IdsStratify<Ops, P>;
  function parentIds<P extends ParentIdsOperator>(
    ids?: P
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

function wrapParentIds<N, P extends ParentIdsOperator<N>>(
  parentIds: P & ParentIdsOperator<N>
): WrappedParentIdsOperator<P> {
  function wrapper(d: N, i: number): IterableIterator<[string, undefined]> {
    return map(parentIds(d, i) ?? [], (id) => [id, undefined]);
  }
  wrapper.wrapped = parentIds;
  return wrapper;
}

function wrapParentData<N, D extends ParentDataOperator<N>>(
  parentData: D & ParentDataOperator<N>
): WrappedParentDataOperator<D> {
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
    throw err`datum did not have an id field, and no id accessor was specified; try calling \`graphStratify().id(d => d...)\` to set a custom id accessor`;
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
      typeof parentIds[Symbol.iterator] === "function"
    );
  } catch {
    return false;
  }
}

function defaultParentIds(d: unknown): readonly string[] | undefined {
  if (hasParentIds(d)) {
    return d.parentIds;
  } else {
    throw err`default parentIds function expected datum to have a parentIds field but got: ${d}; try setting a custom accessor for parentIds with \`graphStratify().parentIds(d => ...)\``;
  }
}

/** the default stratify operator */
export type DefaultStratify = IdsStratify<
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
 * Constructs a new {@link Stratify} with the default settings. This is
 * bundled as {@link graphStratify}.
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
