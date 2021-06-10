/**
 * Construct a {@link Dag} out of data that already has a dag =-like structure
 * using {@link hierarchy} to create a {@link HiararchyOperator}.
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
import { assert, js } from "../utils";

import { verifyDag } from "./verify";

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
 * data for link between the two. `i` will increment for each node processesed.
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

interface Operators<NodeDatum> {
  children: ChildrenOperator<NodeDatum>;
  childrenData: ChildrenDataOperator<NodeDatum, unknown>;
}

type OpsLinkDatum<N, Ops extends Operators<N>> = Exclude<
  ReturnType<Ops["childrenData"]>,
  undefined
>[number][1];

type ChildrenHierarchyOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> = HierarchyOperator<
  NodeDatum,
  {
    children: Children;
    childrenData: WrappedChildrenOperator<NodeDatum, Children>;
  }
>;

type ChildrenDataHierarchyOperator<
  NodeDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum>
> = HierarchyOperator<
  NodeDatum,
  {
    children: WrappedChildrenDataOperator<NodeDatum, ChildrenData>;
    childrenData: ChildrenData;
  }
>;

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
 */
export interface HierarchyOperator<
  NodeDatum,
  Ops extends Operators<NodeDatum> = Operators<NodeDatum>
> {
  /**
   * Construct a {@link Dag} from the specified root nodes.
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
   *
   * The children of each node will be further traversed until the entire dag
   * is explored. Unless {@link roots} is set to false, all initial roots must
   * be roots, i.e. they cann't occur in an call to children.
   *
   */
  // NOTE we can't infer data type for hierarchy generator because the children
  // and children data method also has to be typed
  (...data: readonly NodeDatum[]): Dag<NodeDatum, OpsLinkDatum<NodeDatum, Ops>>;

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
   * this will return a {@link WrappedChildrenOperatoe | wrapped version} that
   * returns only the children of that operator.
   */
  children(): Ops["children"];

  /**
   * Sets the childrenData accessor to the given {@link ChildrenDataOperator} and
   * returns a new hierarchy operator.
   */
  childrenData<
    NewDatum,
    NewChildrenData extends ChildrenDataOperator<NewDatum>
  >(
    data: NewChildrenData & ChildrenDataOperator<NewDatum>
  ): ChildrenDataHierarchyOperator<NewDatum, NewChildrenData>;
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
  roots(val: boolean): HierarchyOperator<NodeDatum, Ops>;
  /** get the current roots value. */
  roots(): boolean;
}

function buildOperator<N, Ops extends Operators<N>>(
  options: Ops & { roots: boolean }
): HierarchyOperator<N, Ops> {
  function hierarchy(...data: N[]): Dag<N, OpsLinkDatum<N, Ops>> {
    if (!data.length) {
      throw new Error("must pass in at least one node");
    }

    const mapping = new Map<N, DagNode<N, OpsLinkDatum<N, Ops>>>();
    const queue: DagNode<N, OpsLinkDatum<N, Ops>>[] = [];

    function nodify(datum: N): DagNode<N, OpsLinkDatum<N, Ops>> {
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
      node.dataChildren = (options.childrenData(node.data, i++) || []).map(
        ([childDatum, linkDatum]) =>
          new LayoutChildLink(nodify(childDatum), linkDatum)
      );
    }

    // verifty roots are roots
    const rootSet = new Set(roots);
    for (const node of mapping.values()) {
      for (const child of node.ichildren()) {
        if (rootSet.delete(child) && options.roots) {
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
    return froots.length > 1 ? new LayoutDagRoot(froots) : froots[0];
  }

  function children(): Ops["children"];
  function children<N, NC extends ChildrenOperator<N>>(
    childs: NC
  ): ChildrenHierarchyOperator<N, NC>;
  function children<N, NC extends ChildrenOperator<N>>(
    childs?: NC
  ): Ops["children"] | ChildrenHierarchyOperator<N, NC> {
    if (childs === undefined) {
      return options.children;
    } else {
      return buildOperator<
        N,
        { children: NC; childrenData: WrappedChildrenOperator<N, NC> }
      >({
        children: childs,
        childrenData: wrapChildren(childs),
        roots: options.roots
      });
    }
  }
  hierarchy.children = children;

  function childrenData(): Ops["childrenData"];
  function childrenData<N, NCD extends ChildrenDataOperator<N>>(
    data: NCD
  ): ChildrenDataHierarchyOperator<N, NCD>;
  function childrenData<N, NCD extends ChildrenDataOperator<N>>(
    data?: NCD
  ): Ops["childrenData"] | ChildrenDataHierarchyOperator<N, NCD> {
    if (data === undefined) {
      return options.childrenData;
    } else {
      return buildOperator<
        N,
        { children: WrappedChildrenDataOperator<N, NCD>; childrenData: NCD }
      >({
        children: wrapChildrenData(data),
        childrenData: data,
        roots: options.roots
      });
    }
  }
  hierarchy.childrenData = childrenData;

  function roots(): boolean;
  function roots(val: boolean): HierarchyOperator<N, Ops>;
  function roots(val?: boolean): boolean | HierarchyOperator<N, Ops> {
    if (val === undefined) {
      return options.roots;
    } else {
      return buildOperator({ ...options, roots: val });
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
  assert(
    hasChildren(d),
    js`default children function expected datum to have a children field but got: ${d}`
  );
  return d.children;
}

/**
 * Constructs a new {@link HierarchyOperator} with default settings. This is
 * bundled as {@link dagHierarchy}.
 */
export function hierarchy(
  ...args: never[]
): ChildrenHierarchyOperator<HasChildren, ChildrenOperator<HasChildren>> {
  assert(
    !args.length,
    `got arguments to hierarchy(${args}), but constructor takes no aruguments. ` +
      "These were probably meant as data which should be called as hierarchy()(...)"
  );
  return buildOperator({
    children: defaultChildren,
    childrenData: wrapChildren(defaultChildren),
    roots: true
  });
}
