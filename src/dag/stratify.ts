/**
 * You can rearrange tabularesque data into a {@link Dag} using {@link stratify}, which
 * will create a default {@link StratifyOperator}.
 *
 * @module
 */

import {
  Dag,
  DagNode,
  LayoutChildLink,
  LayoutDagNode,
  LayoutDagRoot
} from "./node";
import { Up, assert, js } from "../utils";
import { verifyDag, verifyId } from "./verify";

/**
 * The interface for getting the node id from data. The function must return an
 * unique id for each piece of data, but the same id if called twice on the
 * same data. Ids cannot contain the null character `'\0'`.
 *
 * `i` will increment in the order nodes are processed.
 */
interface IdOperator<NodeDatum = never> {
  (d: NodeDatum, i: number): string;
}

/**
 * The interface for getting the parent ids from data. This must return an
 * array of the ids of every parent of this node. `i` will increment in the
 * order nodes are processed.
 */
interface ParentIdsOperator<NodeDatum = never> {
  (d: NodeDatum, i: number): readonly string[] | undefined;
}

/**
 * The interface for getting the parent ids and link data from the current node
 * data. This must return an array of parent ids coupled with data for the link
 * between this node and the parent id.
 */
interface ParentDataOperator<NodeDatum = never, LinkDatum = unknown> {
  (d: NodeDatum, i: number):
    | readonly (readonly [string, LinkDatum])[]
    | undefined;
}

type OpNodeDatum<
  Op extends IdOperator | ParentIdsOperator | ParentDataOperator
> = Parameters<Op>[0];
type OpsNodeDatum<Ops extends Operators> = OpNodeDatum<Ops["id"]> &
  OpNodeDatum<Ops["parentData"]>;
type OpsLinkDatum<Ops extends Operators> = Exclude<
  ReturnType<Ops["parentData"]>,
  undefined
>[number][1];

/**
 * What gets returned by {@link parentData}() when {@link parentIds} is set.
 */
interface WrappedParentIdsOperator<ParentIds extends ParentIdsOperator>
  extends ParentDataOperator<OpNodeDatum<ParentIds>, undefined> {
  wrapped: ParentIds;
}

/**
 * What gets returned by {@link parentIds}() when {@link parentData} is set.
 */
interface WrappedParentDataOperator<ParentData extends ParentDataOperator>
  extends ParentIdsOperator<OpNodeDatum<ParentData>> {
  wrapped: ParentData;
}

interface Operators {
  id: IdOperator;
  parentIds: ParentIdsOperator;
  parentData: ParentDataOperator;
}

type UpIds<Ops extends Operators, ParentIds extends ParentIdsOperator> = Up<
  Ops,
  {
    parentIds: ParentIds;
    parentData: WrappedParentIdsOperator<ParentIds>;
  }
>;

type UpData<Ops extends Operators, ParentData extends ParentDataOperator> = Up<
  Ops,
  {
    parentData: ParentData;
    parentIds: WrappedParentDataOperator<ParentData>;
  }
>;

/**
 * The operator that constructs a {@link Dag} from stratified tabularesque data.
 */
export interface StratifyOperator<Ops extends Operators> {
  /**
   * Construct a dag from the specified `data`. The data should be an array
   * of data elements that contain info about their parents' ids. For example:
   *
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
  <N extends OpsNodeDatum<Ops>>(data: readonly N[]): Dag<N, OpsLinkDatum<Ops>>;

  /**
   * Sets the id accessor to the given {@link IdOperator} and returns this
   * {@link StratifyOperator}. The default operator is:
   *
   * ```js
   * function id(d) {
   *   return d.id;
   * }
   * ```
   */
  id<NewId extends IdOperator>(
    id: NewId
  ): StratifyOperator<Up<Ops, { id: NewId }>>;
  /**
   * Gets the current id accessor.
   */
  id(): Ops["id"];

  /**
   * Sets the parentIds accessor to the given {@link ParentIdsOperator}
   * and returns this {@link StratifyOperator}. The default operator is:
   *
   * ```js
   * function parentIds(d) {
   *   return d.parentIds;
   * }
   * ```
   */
  parentIds<NewParentIds extends ParentIdsOperator>(
    ids: NewParentIds
  ): StratifyOperator<UpIds<Ops, NewParentIds>>;
  /**
   * Gets the current parent ids accessor.  If {@link parentData} was passed, the
   * returned function will wrap that to just return the ids.
   */
  parentIds(): Ops["parentIds"];

  /**
   * Sets the parentData accessor to the given {@link ParentDataOperator} and
   * returns this {@link StratifyOperator}.
   */
  parentData<NewParentData extends ParentDataOperator>(
    data: NewParentData
  ): StratifyOperator<UpData<Ops, NewParentData>>;
  /**
   * Gets the current parentData accessor. If {@link parentIds} was passed, this
   * will wrap that to just return the ids with `undefined` data.
   */
  parentData(): Ops["parentData"];
}

/** @internal */
function buildOperator<Ops extends Operators>(
  options: Ops
): StratifyOperator<Ops> {
  function stratify<N extends OpsNodeDatum<Ops>>(
    data: readonly N[]
  ): Dag<N, OpsLinkDatum<Ops>> {
    if (!data.length) throw new Error("can't stratify empty data");

    const mapping = new Map<
      string,
      [
        DagNode<N, OpsLinkDatum<Ops>>,
        readonly (readonly [string, OpsLinkDatum<Ops>])[]
      ]
    >();
    for (const [i, datum] of data.entries()) {
      const nid = verifyId(options.id(datum, i));
      const pdata = options.parentData(datum, i) || [];
      const node = new LayoutDagNode<N, OpsLinkDatum<Ops>>(datum);
      if (mapping.has(nid)) {
        throw new Error(`found a duplicate id: ${id}`);
      } else {
        mapping.set(nid, [node, pdata]);
      }
    }

    const roots: DagNode<N, OpsLinkDatum<Ops>>[] = [];
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
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function id(): Ops["id"];
  function id<I extends IdOperator>(
    op: I
  ): StratifyOperator<Up<Ops, { id: I }>>;
  function id<I extends IdOperator>(
    op?: I
  ): Ops["id"] | StratifyOperator<Up<Ops, { id: I }>> {
    if (op === undefined) {
      return options.id;
    } else {
      const { id: _, ...rest } = options;
      return buildOperator({ ...rest, id: op });
    }
  }
  stratify.id = id;

  function parentData(): Ops["parentData"];
  function parentData<D extends ParentDataOperator>(
    data: D
  ): StratifyOperator<UpData<Ops, D>>;
  function parentData<D extends ParentDataOperator>(
    data?: D
  ): Ops["parentData"] | StratifyOperator<UpData<Ops, D>> {
    if (data === undefined) {
      return options.parentData;
    } else {
      const { parentIds: _, parentData: __, ...rest } = options;
      return buildOperator({
        ...rest,
        parentIds: wrapParentData(data),
        parentData: data
      });
    }
  }
  stratify.parentData = parentData;

  function parentIds(): Operators["parentIds"];
  function parentIds<P extends ParentIdsOperator>(
    ids: P
  ): StratifyOperator<UpIds<Ops, P>>;
  function parentIds<P extends ParentIdsOperator>(
    ids?: P
  ): Ops["parentIds"] | StratifyOperator<UpIds<Ops, P>> {
    if (ids === undefined) {
      return options.parentIds;
    } else {
      const { parentIds: _, parentData: __, ...rest } = options;
      return buildOperator({
        ...rest,
        parentIds: ids,
        parentData: wrapParentIds(ids)
      });
    }
  }
  stratify.parentIds = parentIds;

  return stratify;
}

/** @internal */
function wrapParentIds<P extends ParentIdsOperator>(
  parentIds: P
): WrappedParentIdsOperator<P> {
  function wrapper(d: OpNodeDatum<P>, i: number): [string, undefined][] {
    return (parentIds(d, i) || []).map((id) => [id, undefined]);
  }
  wrapper.wrapped = parentIds;
  return wrapper;
}

/** @internal */
function wrapParentData<D extends ParentDataOperator>(
  parentData: D
): WrappedParentDataOperator<D> {
  function wrapper(d: OpNodeDatum<D>, i: number): string[] {
    return (parentData(d, i) || []).map(([id]) => id);
  }
  wrapper.wrapped = parentData;
  return wrapper;
}

/** @internal */
interface HasId {
  readonly id: string;
}

/** @internal */
function hasId(d: unknown): d is HasId {
  try {
    return typeof (d as HasId).id === "string";
  } catch {
    return false;
  }
}

/** @internal */
function defaultId(data: unknown): string {
  assert(
    hasId(data),
    js`default id function expected datum to have an id field but got '${data}'`
  );
  return data.id;
}

/** @internal */
interface HasParentIds {
  readonly parentIds?: readonly string[] | undefined;
}

/** @internal */
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

/** @internal */
function defaultParentIds(d: unknown): readonly string[] | undefined {
  assert(
    hasParentIds(d),
    `default parentIds function expected datum to have a parentIds field but got: ${d}`
  );
  return d.parentIds;
}

/**
 * Constructs a new {@link StratifyOperator} with the default settings.
 */
export function stratify(
  ...args: never[]
): StratifyOperator<{
  id: IdOperator<HasId>;
  parentIds: ParentIdsOperator<HasParentIds>;
  parentData: WrappedParentIdsOperator<ParentIdsOperator<HasParentIds>>;
}> {
  assert(
    !args.length,
    `got arguments to stratify(${args}), but constructor takes no aruguments. ` +
      "These were probably meant as data which should be called as stratify()(...)"
  );
  return buildOperator({
    id: defaultId,
    parentIds: defaultParentIds,
    parentData: wrapParentIds(defaultParentIds)
  });
}
