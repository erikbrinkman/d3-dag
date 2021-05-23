/**
 * You can rearrange raw edge data into a {@link Dag} using {@link connect} to create a
 * default {@link ConnectOperator}.
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

import { def } from "../utils";

export interface ConnectDatum {
  id: string;
}

/**
 * The interface for getting a node id from data. The function must return an
 * appropriate id for given link data.  Ids cannot contain the null character
 * `'\0'`.
 *
 * `i` will increment in the order links are processed.
 */
export interface IdOperator<LinkDatum> {
  (d: LinkDatum, i: number): string;
}

/**
 * The operator that constructs a {@link Dag} from link data.
 */
export interface ConnectOperator<
  LinkDatum = unknown,
  SourceId extends IdOperator<LinkDatum> = IdOperator<LinkDatum>,
  TargetId extends IdOperator<LinkDatum> = IdOperator<LinkDatum>
> {
  /**
   * Construct a dag from the specified data. The data should be an array of
   * data elements that contain info about links in the graph. For example:
   *
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
  <L extends LinkDatum>(data: readonly L[]): Dag<ConnectDatum, L>;

  /**
   * Sets the source accessor to the given {@link IdOperator} and returns this
   * {@link ConnectOperator}. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[0];
   * }
   * ```
   */
  sourceId<NewLink extends LinkDatum, NewId extends IdOperator<NewLink>>(
    id: NewId & IdOperator<NewLink>
  ): ConnectOperator<NewLink, NewId, TargetId>;
  /** Gets the current sourceId accessor. */
  sourceId(): SourceId;

  /**
   * Sets the target accessor to the given {@link IdOperator} and returns this
   * {@link ConnectOperator}. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[1];
   * }
   * ```
   */
  targetId<NewLink extends LinkDatum, NewId extends IdOperator<NewLink>>(
    id: NewId & IdOperator<NewLink>
  ): ConnectOperator<NewLink, SourceId, NewId>;
  /** Gets the current targetId accessor. */
  targetId(): TargetId;

  /**
   * Sets the allowance for single nodes. If enabled and the source id equals
   * the target id, then a single node with no parents will be created.
   * Otherwise a self loop will be created which will result in an error. Note
   * only single nodes without parents or children need to be specified this
   * way, otherwise any other connection will work. (default: false)
   */
  single(val: boolean): ConnectOperator<LinkDatum, SourceId, TargetId>;
  /** get the current single node setting. */
  single(): boolean;
}

/** @internal */
function buildOperator<
  LinkDatum,
  SourceId extends IdOperator<LinkDatum>,
  TargetId extends IdOperator<LinkDatum>
>(
  sourceIdOp: SourceId,
  targetIdOp: TargetId,
  singleVal: boolean
): ConnectOperator<LinkDatum, SourceId, TargetId> {
  function connect<L extends LinkDatum>(
    data: readonly L[]
  ): Dag<ConnectDatum, L> {
    if (!data.length) {
      throw new Error("can't connect empty data");
    }
    const nodes = new Map<string, DagNode<ConnectDatum, L>>();
    const hasParents = new Map<string, boolean>();
    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(sourceIdOp(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = new LayoutDagNode<ConnectDatum, L>({ id: source });
        nodes.set(source, sourceNode);
      }
      const target = verifyId(targetIdOp(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = new LayoutDagNode<ConnectDatum, L>({ id: target });
        nodes.set(target, targetNode);
      }

      if (source === target && singleVal) {
        hasParents.set(source, hasParents.get(source) || false);
      } else {
        sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));

        // update roots
        hasParents.set(source, hasParents.get(source) || false);
        hasParents.set(target, true);
      }
    }

    const roots: DagNode<ConnectDatum, L>[] = [];
    for (const [id, parents] of hasParents) {
      if (!parents) {
        roots.push(def(nodes.get(id)));
      }
    }
    verifyDag(roots);
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function sourceId(): SourceId;
  function sourceId<
    NewLink extends LinkDatum,
    NewId extends IdOperator<NewLink>
  >(id: NewId): ConnectOperator<NewLink, NewId, TargetId>;
  function sourceId<
    NewLink extends LinkDatum,
    NewId extends IdOperator<NewLink>
  >(id?: NewId): SourceId | ConnectOperator<NewLink, NewId, TargetId> {
    if (id === undefined) {
      return sourceIdOp;
    } else {
      return buildOperator(id, targetIdOp, singleVal);
    }
  }
  connect.sourceId = sourceId;

  function targetId(): TargetId;
  function targetId<
    NewLink extends LinkDatum,
    NewId extends IdOperator<NewLink>
  >(id: NewId): ConnectOperator<NewLink, SourceId, NewId>;
  function targetId<
    NewLink extends LinkDatum,
    NewId extends IdOperator<NewLink>
  >(id?: NewId): TargetId | ConnectOperator<NewLink, SourceId, NewId> {
    if (id === undefined) {
      return targetIdOp;
    } else {
      return buildOperator(sourceIdOp, id, singleVal);
    }
  }
  connect.targetId = targetId;

  function single(): boolean;
  function single(val: boolean): ConnectOperator<LinkDatum, SourceId, TargetId>;
  function single(
    val?: boolean
  ): boolean | ConnectOperator<LinkDatum, SourceId, TargetId> {
    if (val === undefined) {
      return singleVal;
    } else {
      return buildOperator(sourceIdOp, targetIdOp, val);
    }
  }
  connect.single = single;

  return connect;
}

/** @internal */
interface ZeroString {
  [0]: string;
}

/** @internal */
function isZeroString(d: unknown): d is ZeroString {
  try {
    return typeof (d as ZeroString)[0] === "string";
  } catch {
    return false;
  }
}

/** @internal */
function defaultSourceId(d: unknown): string {
  if (isZeroString(d)) {
    return d[0];
  } else {
    throw new Error(
      `default source id expected datum[0] to be a string but got datum: ${d}`
    );
  }
}

/** @internal */
interface OneString {
  [1]: string;
}

/** @internal */
function isOneString(d: unknown): d is OneString {
  try {
    return typeof (d as OneString)[1] === "string";
  } catch {
    return false;
  }
}

/** @internal */
function defaultTargetId(d: unknown): string {
  if (isOneString(d)) {
    return d[1];
  } else {
    throw new Error(
      `default target id expected datum[1] to be a string but got datum: ${d}`
    );
  }
}

/**
 * Constructs a new {@link ConnectOperator} with the default settings.
 */
export function connect(...args: never[]): ConnectOperator {
  if (args.length) {
    throw new Error(
      `got arguments to connect(${args}), but constructor takes no aruguments. ` +
        "These were probably meant as data which should be called as connect()(...)"
    );
  }
  return buildOperator(defaultSourceId, defaultTargetId, false);
}
