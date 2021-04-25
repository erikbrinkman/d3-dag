/**
 * You can rearrange tabularesque data into a [[Dag]] using [[stratify]], which
 * will create a default [[StratifyOperator]].
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
import { verifyDag, verifyId } from "./verify";

/**
 * The interface for getting the node id from data. The function must return an
 * unique id for each piece of data, but the same id if called twice on the
 * same data. Ids cannot contain the null character `'\0'`.
 *
 * `i` will increment in the order nodes are processed.
 */
interface IdOperator<NodeDatum> {
  (d: NodeDatum, i: number): string;
}

/**
 * The interface for getting the parent ids from data. This must return an
 * array of the ids of every parent of this node. `i` will increment in the
 * order nodes are processed.
 */
interface ParentIdsOperator<NodeDatum> {
  (d: NodeDatum, i: number): string[] | undefined;
}

/**
 * The interface for getting the parent ids and link data from the current node
 * data. This must return an array of parent ids coupled with data for the link
 * between this node and the parent id.
 */
interface ParentDataOperator<NodeDatum, LinkDatum> {
  (d: NodeDatum, i: number): [string, LinkDatum][] | undefined;
}

/**
 * What gets returned by [[parentData]]() when [[parentIds]] is set.
 */
interface WrappedParentIdsOperator<
  NodeDatum,
  ParentIds extends ParentIdsOperator<NodeDatum>
> extends ParentDataOperator<NodeDatum, undefined> {
  (d: NodeDatum, i: number): [string, undefined][];
  wrapped: ParentIds;
}

/**
 * What gets returned by [[parentIds]]() when [[parentData]] is set.
 */
interface WrappedParentDataOperator<
  NodeDatum,
  LinkDatum,
  ParentData extends ParentDataOperator<NodeDatum, LinkDatum>
> extends ParentIdsOperator<NodeDatum> {
  (d: NodeDatum, i: number): string[];
  wrapped: ParentData;
}

/**
 * The operator that constructs a [[Dag]] from stratified tabularesque data.
 */
export interface StratifyOperator<
  NodeDatum,
  LinkDatum,
  Id extends IdOperator<NodeDatum> = IdOperator<NodeDatum>,
  ParentIds extends ParentIdsOperator<NodeDatum> = ParentIdsOperator<NodeDatum>,
  ParentData extends ParentDataOperator<
    NodeDatum,
    LinkDatum
  > = ParentDataOperator<NodeDatum, LinkDatum>
> {
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
  (data: NodeDatum[]): Dag<DagNode<NodeDatum, LinkDatum>>;

  /**
   * Sets the id accessor to the given [[IdOperator]] and returns this
   * [[StratifyOperator]]. The default operator is:
   *
   * ```js
   * function id(d) {
   *   return d.id;
   * }
   * ```
   */
  id<NewId extends IdOperator<NodeDatum>>(
    id: NewId
  ): StratifyOperator<NodeDatum, LinkDatum, NewId, ParentIds, ParentData>;
  /**
   * Gets the current id accessor.
   */
  id(): Id;

  /**
   * Sets the parentIds accessor to the given [[ParentIdsOperator]]
   * and returns this [[StratifyOperator]]. The default operator is:
   *
   * ```js
   * function parentIds(d) {
   *   return d.parentIds;
   * }
   * ```
   */
  parentIds<NewParentIds extends ParentIdsOperator<NodeDatum>>(
    ids: NewParentIds
  ): StratifyOperator<
    NodeDatum,
    undefined,
    Id,
    NewParentIds,
    WrappedParentIdsOperator<NodeDatum, NewParentIds>
  >;
  /**
   * Gets the current parent ids accessor.  If [[parentData]] was passed, the
   * returned function will wrap that to just return the ids.
   */
  parentIds(): ParentIds;

  /**
   * Sets the parentData accessor to the given [[ParentDataOperator]] and
   * returns this [[StratifyOperator]].
   */
  parentData<
    NewLinkDatum,
    NewParentData extends ParentDataOperator<NodeDatum, NewLinkDatum>
  >(
    data: NewParentData
  ): StratifyOperator<
    NodeDatum,
    NewLinkDatum,
    Id,
    WrappedParentDataOperator<NodeDatum, NewLinkDatum, NewParentData>,
    NewParentData
  >;
  /**
   * Gets the current parentData accessor. If [[parentIds]] was passed, this
   * will wrap that to just return the ids with `undefined` data.
   */
  parentData(): ParentData;
}

/** @internal */
function buildOperator<
  NodeDatum,
  LinkDatum,
  Id extends IdOperator<NodeDatum>,
  ParentIds extends ParentIdsOperator<NodeDatum>,
  ParentData extends ParentDataOperator<NodeDatum, LinkDatum>
>(
  idOp: Id,
  parentIdsOp: ParentIds,
  parentDataOp: ParentData
): StratifyOperator<NodeDatum, LinkDatum, Id, ParentIds, ParentData> {
  function stratify(data: NodeDatum[]): Dag<DagNode<NodeDatum, LinkDatum>> {
    if (!data.length) throw new Error("can't stratify empty data");
    const nodes = data.map(
      (datum, i) =>
        new LayoutDagNode<NodeDatum, LinkDatum>(verifyId(idOp(datum, i)), datum)
    );

    const mapping = new Map<string, DagNode<NodeDatum, LinkDatum>>();
    nodes.forEach((node) => {
      if (mapping.has(node.id)) {
        throw new Error(`found a duplicate id: ${node.id}`);
      } else {
        mapping.set(node.id, node);
      }
    });

    const roots: DagNode<NodeDatum, LinkDatum>[] = [];
    nodes.forEach((node, i) => {
      const pData = parentDataOp(node.data, i) || [];
      pData.forEach(([pid, linkData]) => {
        const par = mapping.get(pid);
        if (!par) throw new Error(`missing id: ${pid}`);
        par.dataChildren.push(new LayoutChildLink(node, linkData));
        return par;
      });
      if (!pData.length) {
        roots.push(node);
      }
    });

    verifyDag(roots);
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function id(): Id;
  function id<NewId extends IdOperator<NodeDatum>>(
    idGet: NewId
  ): StratifyOperator<NodeDatum, LinkDatum, NewId, ParentIds, ParentData>;
  function id<NewId extends IdOperator<NodeDatum>>(
    idGet?: NewId
  ): Id | StratifyOperator<NodeDatum, LinkDatum, NewId, ParentIds, ParentData> {
    if (idGet === undefined) {
      return idOp;
    } else {
      return buildOperator(idGet, parentIdsOp, parentDataOp);
    }
  }
  stratify.id = id;

  function parentData(): ParentData;
  function parentData<
    NewLinkDatum,
    NewParentData extends ParentDataOperator<NodeDatum, NewLinkDatum>
  >(
    data: NewParentData
  ): StratifyOperator<
    NodeDatum,
    NewLinkDatum,
    Id,
    WrappedParentDataOperator<NodeDatum, NewLinkDatum, NewParentData>,
    NewParentData
  >;
  function parentData<
    NewLinkDatum,
    NewParentData extends ParentDataOperator<NodeDatum, NewLinkDatum>
  >(
    data?: NewParentData
  ):
    | ParentData
    | StratifyOperator<
        NodeDatum,
        NewLinkDatum,
        Id,
        WrappedParentDataOperator<NodeDatum, NewLinkDatum, NewParentData>,
        NewParentData
      > {
    if (data === undefined) {
      return parentDataOp;
    } else {
      return buildOperator(idOp, wrapParentData(data), data);
    }
  }
  stratify.parentData = parentData;

  function parentIds(): ParentIds;
  function parentIds<NewParentIds extends ParentIdsOperator<NodeDatum>>(
    ids: NewParentIds
  ): StratifyOperator<
    NodeDatum,
    undefined,
    Id,
    NewParentIds,
    WrappedParentIdsOperator<NodeDatum, NewParentIds>
  >;
  function parentIds<NewParentIds extends ParentIdsOperator<NodeDatum>>(
    ids?: NewParentIds
  ):
    | ParentIds
    | StratifyOperator<
        NodeDatum,
        undefined,
        Id,
        NewParentIds,
        WrappedParentIdsOperator<NodeDatum, NewParentIds>
      > {
    if (ids === undefined) {
      return parentIdsOp;
    } else {
      return buildOperator(idOp, ids, wrapParentIds(ids));
    }
  }
  stratify.parentIds = parentIds;

  return stratify;
}

/** @internal */
function wrapParentIds<
  NodeDatum,
  ParentIds extends ParentIdsOperator<NodeDatum>
>(parentIds: ParentIds): WrappedParentIdsOperator<NodeDatum, ParentIds> {
  function wrapped(d: NodeDatum, i: number): [string, undefined][] {
    return (parentIds(d, i) || []).map((id) => [id, undefined]);
  }
  wrapped.wrapped = parentIds;
  return wrapped;
}

/** @internal */
function wrapParentData<
  NodeDatum,
  LinkDatum,
  ParentData extends ParentDataOperator<NodeDatum, LinkDatum>
>(
  parentData: ParentData
): WrappedParentDataOperator<NodeDatum, LinkDatum, ParentData> {
  function wrapped(d: NodeDatum, i: number): string[] {
    return (parentData(d, i) || []).map(([id]) => id);
  }
  wrapped.wrapped = parentData;
  return wrapped;
}

/** @internal */
interface HasId {
  id: string;
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
function defaultId(d: unknown): string {
  if (hasId(d)) {
    return d.id;
  } else {
    throw new Error(
      `default id function expected datum to have an id field but got: ${d}`
    );
  }
}

/** @internal */
interface HasParentIds {
  parentIds: string[] | undefined;
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
function defaultParentIds(d: unknown): string[] | undefined {
  if (hasParentIds(d)) {
    return d.parentIds;
  } else {
    throw new Error(
      `default parentIds function expected datum to have a parentIds field but got: ${d}`
    );
  }
}

/**
 * Constructs a new [[StratifyOperator]] with the default settings.
 */
export function stratify<NodeDatum>(
  ...args: never[]
): StratifyOperator<
  NodeDatum,
  undefined,
  IdOperator<NodeDatum>,
  ParentIdsOperator<NodeDatum>,
  WrappedParentIdsOperator<NodeDatum, ParentIdsOperator<NodeDatum>>
> {
  if (args.length) {
    throw Error(
      `got arguments to dagStratify(${args}), but constructor takes no aruguments. ` +
        "These were probably meant as data which should be called as dagStratify()(...)"
    );
  }
  return buildOperator(
    defaultId,
    defaultParentIds,
    wrapParentIds(defaultParentIds)
  );
}
