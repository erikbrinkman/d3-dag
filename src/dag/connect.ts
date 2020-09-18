/**
 * You can rearrange raw edge data into a [[Dag]] using [[connect]] to create a
 * default [[ConnectOperator]].
 *
 * @packageDocumentation
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
 * The operator that constructs a [[Dag]] from link data.
 */
export interface ConnectOperator<
  LinkDatum,
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
  (data: LinkDatum[]): Dag<DagNode<undefined, LinkDatum>>;

  /**
   * Sets the source accessor to the given [[IdOperator]] and returns this
   * [[ConnectOperator]]. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[0];
   * }
   * ```
   */
  sourceId<NewId extends IdOperator<LinkDatum>>(
    id: NewId
  ): ConnectOperator<LinkDatum, NewId, TargetId>;
  /** Gets the current sourceId accessor. */
  sourceId(): SourceId;

  /**
   * Sets the target accessor to the given [[IdOperator]] and returns this
   * [[ConnectOperator]]. The default accessor is:
   *
   * ```js
   * function sourceAccessor(link) {
   *   return link[1];
   * }
   * ```
   */
  targetId<NewId extends IdOperator<LinkDatum>>(
    id: NewId
  ): ConnectOperator<LinkDatum, SourceId, NewId>;
  /** Gets the current targetId accessor. */
  targetId(): TargetId;
}

/** @internal */
function buildOperator<
  LinkDatum,
  SourceId extends IdOperator<LinkDatum>,
  TargetId extends IdOperator<LinkDatum>
>(
  sourceIdOp: SourceId,
  targetIdOp: TargetId
): ConnectOperator<LinkDatum, SourceId, TargetId> {
  function connect(data: LinkDatum[]): Dag<DagNode<undefined, LinkDatum>> {
    if (!data.length) {
      throw new Error("can't connect empty data");
    }
    const nodes = new Map<string, DagNode<undefined, LinkDatum>>();
    const hasParents = new Map<string, boolean>();
    for (const [i, datum] of data.entries()) {
      // create dag
      const source = verifyId(sourceIdOp(datum, i));
      let sourceNode = nodes.get(source);
      if (sourceNode === undefined) {
        sourceNode = new LayoutDagNode<undefined, LinkDatum>(source, undefined);
        nodes.set(source, sourceNode);
      }
      const target = verifyId(targetIdOp(datum, i));
      let targetNode = nodes.get(target);
      if (targetNode === undefined) {
        targetNode = new LayoutDagNode<undefined, LinkDatum>(target, undefined);
        nodes.set(target, targetNode);
      }
      sourceNode.dataChildren.push(new LayoutChildLink(targetNode, datum));

      // update roots
      hasParents.set(source, hasParents.get(source) || false);
      hasParents.set(target, true);
    }

    const roots: DagNode<undefined, LinkDatum>[] = [];
    for (const [id, parents] of hasParents) {
      if (!parents) {
        roots.push(def(nodes.get(id)));
      }
    }
    verifyDag(roots);
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function sourceId(): SourceId;
  function sourceId<NewId extends IdOperator<LinkDatum>>(
    id: NewId
  ): ConnectOperator<LinkDatum, NewId, TargetId>;
  function sourceId<NewId extends IdOperator<LinkDatum>>(
    id?: NewId
  ): SourceId | ConnectOperator<LinkDatum, NewId, TargetId> {
    if (id === undefined) {
      return sourceIdOp;
    } else {
      return buildOperator(id, targetIdOp);
    }
  }
  connect.sourceId = sourceId;

  function targetId(): TargetId;
  function targetId<NewId extends IdOperator<LinkDatum>>(
    id: NewId
  ): ConnectOperator<LinkDatum, SourceId, NewId>;
  function targetId<NewId extends IdOperator<LinkDatum>>(
    id?: NewId
  ): TargetId | ConnectOperator<LinkDatum, SourceId, NewId> {
    if (id === undefined) {
      return targetIdOp;
    } else {
      return buildOperator(sourceIdOp, id);
    }
  }
  connect.targetId = targetId;

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
 * Constructs a new [[ConnectOperator]] with the default settings.
 */
export function connect<LinkDatum>(
  ...args: never[]
): ConnectOperator<LinkDatum> {
  if (args.length) {
    throw new Error(
      `got arguments to dagConnect(${args}), but constructor takes no aruguments. ` +
        "These were probably meant as data which should be called as dagConnect()(...)"
    );
  }
  return buildOperator(defaultSourceId, defaultTargetId);
}
