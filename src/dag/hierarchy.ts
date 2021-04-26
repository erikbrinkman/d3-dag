/**
 * Before you can compute a DAG layout, you need a DAG structure.  If your data
 * is already in a DAG structure, you can use the [[hierarchy]] method to
 * generate a default [[HierarchyOperator]] which can then be used to transform
 * your data into a [[Dag]].
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

import { js } from "../utils";
import { verifyDag } from "./verify";

/**
 * The interface for getting child data from node data. This function must
 * return data for every child given the data for the current node. `i` will
 * increment for each node processed.
 */
interface ChildrenOperator<NodeDatum> {
  (d: NodeDatum, i: number): NodeDatum[] | undefined;
}

/**
 * The interface for getting children data and associated link data from node
 * data. This function must return data for every child of the given node, and
 * data for link between the two. `i` will increment for each node processesed.
 */
interface ChildrenDataOperator<NodeDatum, LinkDatum> {
  (d: NodeDatum, i: number): [NodeDatum, LinkDatum][] | undefined;
}

/**
 * What gets returned by [[childrenData]]() when [[children]] is set.
 */
interface WrappedChildrenOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum> = ChildrenOperator<NodeDatum>
> extends ChildrenDataOperator<NodeDatum, undefined> {
  (d: NodeDatum, i: number): [NodeDatum, undefined][];
  wrapped: Children;
}

/**
 * What gets returned by [[children]]() when [[childrenData]] is set.
 */
interface WrappedChildrenDataOperator<
  NodeDatum,
  LinkDatum,
  ChildrenData extends ChildrenDataOperator<
    NodeDatum,
    LinkDatum
  > = ChildrenDataOperator<NodeDatum, LinkDatum>
> extends ChildrenOperator<NodeDatum> {
  (d: NodeDatum, i: number): NodeDatum[];
  wrapped: ChildrenData;
}

/**
 * The operator that constructs a [[Dag]] from hierarchy data.
 */
export interface HierarchyOperator<
  NodeDatum,
  LinkDatum,
  Children extends ChildrenOperator<NodeDatum> = ChildrenOperator<NodeDatum>,
  ChildrenData extends ChildrenDataOperator<
    NodeDatum,
    LinkDatum
  > = ChildrenDataOperator<NodeDatum, LinkDatum>
> {
  /**
   * Construct a DAG from the specified root nodes.
   * Each root node must be an object representing a root node.
   * For example:
   *
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
   */
  // NOTE we can't infer data type for hierarchy generator because the children
  // and children data method also has to be typed
  (...data: NodeDatum[]): Dag<DagNode<NodeDatum, LinkDatum>>;

  /**
   * Sets the children accessor to the given [[ChildrenOperator]] and returns
   * this [[HierarchyOperator]]. The default operator is:
   *
   * ```js
   * function children(d) {
   *   return d.children;
   * }
   * ```
   */
  children<NewChildren extends ChildrenOperator<NodeDatum>>(
    ids: NewChildren
  ): HierarchyOperator<
    NodeDatum,
    undefined,
    NewChildren,
    WrappedChildrenOperator<NodeDatum, NewChildren>
  >;
  /**
   * Gets the current [[ChildrenOperator]], If [[childrenData]] was specified,
   * this will return a wrapped version that returns only the children of that
   * operator.
   */
  children(): Children;

  /**
   * Sets the childrenData accessor to the given [[ChildrenDataOperator]] and
   * returns this [[HierarchyOperator]].
   */
  childrenData<
    NewLinkDatum,
    NewChildrenData extends ChildrenDataOperator<NodeDatum, NewLinkDatum>
  >(
    data: NewChildrenData
  ): HierarchyOperator<
    NodeDatum,
    NewLinkDatum,
    WrappedChildrenDataOperator<NodeDatum, NewLinkDatum, NewChildrenData>,
    NewChildrenData
  >;
  /**
   * Get the current childrenData operator. If [[children]] was specified, this
   * will return a wrapped version that returns undefined data.
   */
  childrenData(): ChildrenData;
}

/** @internal */
function buildOperator<
  NodeDatum,
  LinkDatum,
  Children extends ChildrenOperator<NodeDatum>,
  ChildrenData extends ChildrenDataOperator<NodeDatum, LinkDatum>
>(
  childrenOp: Children,
  childrenDataOp: ChildrenData
): HierarchyOperator<NodeDatum, LinkDatum, Children, ChildrenData> {
  function hierarchy(...data: NodeDatum[]): Dag<DagNode<NodeDatum, LinkDatum>> {
    if (!data.length) {
      throw new Error("must pass in at least one node");
    }

    const mapping = new Map<NodeDatum, DagNode<NodeDatum, LinkDatum>>();
    const queue: DagNode<NodeDatum, LinkDatum>[] = [];

    function nodify(datum: NodeDatum): DagNode<NodeDatum, LinkDatum> {
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
      node.dataChildren = (childrenDataOp(node.data, i++) || []).map(
        ([childDatum, linkDatum]) =>
          new LayoutChildLink(nodify(childDatum), linkDatum)
      );
    }

    // verifty roots are roots
    const rootSet = new Set(roots);
    for (const node of mapping.values()) {
      if (node.ichildren().some((child) => rootSet.has(child))) {
        throw new Error(js`node '${node.data}' pointed to a root`);
      }
    }

    // create dag
    verifyDag(roots);
    return roots.length > 1 ? new LayoutDagRoot(roots) : roots[0];
  }

  function children(): Children;
  function children<NewChildren extends ChildrenOperator<NodeDatum>>(
    childs: NewChildren
  ): HierarchyOperator<
    NodeDatum,
    undefined,
    NewChildren,
    WrappedChildrenOperator<NodeDatum, NewChildren>
  >;
  function children<NewChildren extends ChildrenOperator<NodeDatum>>(
    childs?: NewChildren
  ):
    | Children
    | HierarchyOperator<
        NodeDatum,
        undefined,
        NewChildren,
        WrappedChildrenOperator<NodeDatum, NewChildren>
      > {
    if (childs === undefined) {
      return childrenOp;
    } else {
      return buildOperator(childs, wrapChildren(childs));
    }
  }
  hierarchy.children = children;

  function childrenData(): ChildrenData;
  function childrenData<
    NewLinkDatum,
    NewChildrenData extends ChildrenDataOperator<NodeDatum, NewLinkDatum>
  >(
    data: NewChildrenData
  ): HierarchyOperator<
    NodeDatum,
    NewLinkDatum,
    WrappedChildrenDataOperator<NodeDatum, NewLinkDatum, NewChildrenData>,
    NewChildrenData
  >;
  function childrenData<
    NewLinkDatum,
    NewChildrenData extends ChildrenDataOperator<NodeDatum, NewLinkDatum>
  >(
    data?: NewChildrenData
  ):
    | ChildrenData
    | HierarchyOperator<
        NodeDatum,
        NewLinkDatum,
        WrappedChildrenDataOperator<NodeDatum, NewLinkDatum, NewChildrenData>,
        NewChildrenData
      > {
    if (data === undefined) {
      return childrenDataOp;
    } else {
      return buildOperator(wrapChildrenData(data), data);
    }
  }
  hierarchy.childrenData = childrenData;

  return hierarchy;
}

/** @internal */
function wrapChildren<NodeDatum, Children extends ChildrenOperator<NodeDatum>>(
  children: Children
): WrappedChildrenOperator<NodeDatum, Children> {
  function wrapped(d: NodeDatum, i: number): [NodeDatum, undefined][] {
    return (children(d, i) || []).map((d) => [d, undefined]);
  }
  wrapped.wrapped = children;
  return wrapped;
}

/** @internal */
function wrapChildrenData<
  NodeDatum,
  LinkDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum, LinkDatum>
>(
  childrenData: ChildrenData
): WrappedChildrenDataOperator<NodeDatum, LinkDatum, ChildrenData> {
  function wrapped(d: NodeDatum, i: number): NodeDatum[] {
    return (childrenData(d, i) || []).map(([d]) => d);
  }
  wrapped.wrapped = childrenData;
  return wrapped;
}

/** @internal */
interface HasChildren<NodeDatum> {
  children: NodeDatum[] | undefined;
}

/** @internal */
function hasChildren<NodeDatum>(d: unknown): d is HasChildren<NodeDatum> {
  try {
    const children = (d as HasChildren<NodeDatum>).children;
    return children === undefined || children instanceof Array;
  } catch {
    return false;
  }
}

/** @internal */
function defaultChildren<NodeDatum>(d: NodeDatum): NodeDatum[] | undefined {
  if (hasChildren<NodeDatum>(d)) {
    return d.children;
  } else {
    throw new Error(
      js`default children function expected datum to have a children field but got: ${d}`
    );
  }
}

/**
 * Constructs a new [[HierarchyOperator]] with default settings.
 *
 * By default ids will be pulled from the `id` property and children will be
 * pulled from the `children` property. Since `children` being undefined is
 * valid, forgetting to set children properly will result in a dag with only a
 * single node.
 */
export function hierarchy<NodeDatum>(
  ...args: never[]
): HierarchyOperator<
  NodeDatum,
  undefined,
  ChildrenOperator<NodeDatum>,
  WrappedChildrenOperator<NodeDatum, ChildrenOperator<NodeDatum>>
> {
  if (args.length) {
    throw Error(
      `got arguments to dagHierarchy(${args}), but constructor takes no aruguments. ` +
        "These were probably meant as data which should be called as dagHierarchy()(...)"
    );
  }
  return buildOperator(defaultChildren, wrapChildren(defaultChildren));
}
