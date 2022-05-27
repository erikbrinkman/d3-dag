import { graph, MutGraph, MutGraphNode } from ".";
import { map } from "../iters";
import { err } from "../utils";

// NOTE this is typed differently than most operators, and that's because the
// operators are invariant due to them taking the same type as input and
// output, e.g. the intersection of covariant and contravariant. As a result,
// all of these are typed with the NodeDatum known.

/**
 * The interface for getting child data from node data. This function must
 * return data for every child given the data for the current node. `i` will
 * increment for each node processed.
 *
 * Can be modified with {@link Hierarchy#children}.
 */
export interface ChildrenOperator<in out NodeDatum> {
  (d: NodeDatum, i: number): Iterable<NodeDatum> | undefined;
}

/**
 * The interface for getting children data and associated link data from node
 * data. This function must return data for every child of the given node, and
 * data for link between the two. `i` will increment for each node processed.
 *
 * Can be modified with {@link Hierarchy#childrenData}.
 */
export interface ChildrenDataOperator<
  in out NodeDatum,
  out LinkDatum = unknown
> {
  (d: NodeDatum, i: number):
    | Iterable<readonly [NodeDatum, LinkDatum]>
    | undefined;
}

/**
 * What gets returned by {@link Hierarchy#childrenData}() when {@link Hierarchy#children} is set.
 */
export interface WrappedChildrenOperator<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> extends ChildrenDataOperator<NodeDatum, undefined> {
  /** the wrapped children operator */
  wrapped: Children;
}

/**
 * What gets returned by {@link Hierarchy#children}() when {@link Hierarchy#childrenData} is set.
 */
export interface WrappedChildrenDataOperator<
  NodeDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum>
> extends ChildrenOperator<NodeDatum> {
  /** the wrapped children data operator */
  wrapped: ChildrenData;
}

/** the hierarchy operator operators */
export interface HierarchyOps<NodeDatum, LinkDatum = unknown> {
  /** the children operator */
  children: ChildrenOperator<NodeDatum>;
  /** the children data operator */
  childrenData: ChildrenDataOperator<NodeDatum, LinkDatum>;
}

/** a hierarchy operator with children */
export type ChildrenHierarchy<
  NodeDatum,
  Children extends ChildrenOperator<NodeDatum>
> = Hierarchy<
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
export type ChildrenDataHierarchy<
  NodeDatum,
  LinkDatum,
  ChildrenData extends ChildrenDataOperator<NodeDatum, LinkDatum>
> = Hierarchy<
  NodeDatum,
  LinkDatum,
  {
    /** new children */
    children: WrappedChildrenDataOperator<NodeDatum, ChildrenData>;
    /** new children data */
    childrenData: ChildrenData;
  }
>;

export interface Hierarchy<
  NodeDatum,
  LinkDatum,
  Ops extends HierarchyOps<NodeDatum, LinkDatum>
> {
  /**
   * An operator that constructs a {@link graph!Graph} from hierarchy data.
   *
   * A default operator can be created with {@link graphHierarchy}. How to access a
   * piece of data's {@link children} or {@link childrenData | children with
   * associated link data} can be altered.
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
   *   "id": "Euler",
   *   "children": [
   *     {
   *       "id": "Lagrange",
   *       "children": [
   *         {
   *           "id": "Fourier"
   *         },
   *         {
   *           "id": "Poisson",
   *           "children": [
   *             {
   *               "id": "Dirichlet"
   *             }
   *           ]
   *         }
   *       ]
   *     }
   *   ]
   * }
   * ```
   *
   * The children of each node will be further traversed until the entire dag
   * is explored.
   *
   */
  (...data: readonly NodeDatum[]): MutGraph<NodeDatum, LinkDatum>;

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
  ): ChildrenHierarchy<NewDatum, NewChildren>;
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
  ): ChildrenDataHierarchy<NewDatum, NewLink, NewChildrenData>;
  /**
   * Get the current childrenData operator. If {@link children} was specified, this
   * will return a {@link WrappedChildrenDataOperator | wrapped version} that
   * returns undefined data.
   */
  childrenData(): Ops["childrenData"];
}

function buildHierarchy<N, L, Ops extends HierarchyOps<N, L>>(
  operators: Ops & HierarchyOps<N, L>
): Hierarchy<N, L, Ops> {
  function hierarchy(...data: N[]): MutGraph<N, L> {
    const hierarchied = graph<N, L>();
    const mapping = new Map<N, MutGraphNode<N, L>>();

    // initialize queue
    const queue: [MutGraphNode<N, L>, N, L][] = [];
    let i = 0;
    for (const datum of data) {
      if (!mapping.has(datum)) {
        const pnode = hierarchied.node(datum);
        mapping.set(datum, pnode);
        for (const [cdatum, ldatum] of operators.childrenData(datum, i++) ??
          []) {
          queue.push([pnode, cdatum, ldatum]);
        }
      }
    }

    // dfs through data
    let next;
    while ((next = queue.pop())) {
      const [pnode, ndatum, datum] = next;
      const cached = mapping.get(ndatum);
      if (cached) {
        hierarchied.link(pnode, cached, datum);
      } else {
        const cnode = hierarchied.node(ndatum);
        mapping.set(ndatum, cnode);
        hierarchied.link(pnode, cnode, datum);
        const cdata = operators.childrenData(ndatum, i++) ?? [];
        for (const [cdatum, ldatum] of cdata) {
          queue.push([cnode, cdatum, ldatum]);
        }
      }
    }

    return hierarchied;
  }

  function children(): Ops["children"];
  function children<NN, NC extends ChildrenOperator<NN>>(
    childs: NC
  ): ChildrenHierarchy<NN, NC>;
  function children<NN, NC extends ChildrenOperator<NN>>(
    childs?: NC
  ): Ops["children"] | ChildrenHierarchy<NN, NC> {
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
  ): ChildrenDataHierarchy<NN, NL, NCD>;
  function childrenData<NN, NL, NCD extends ChildrenDataOperator<NN, NL>>(
    data?: NCD
  ): Ops["childrenData"] | ChildrenDataHierarchy<NN, NL, NCD> {
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

  return hierarchy;
}

function wrapChildren<N, C extends ChildrenOperator<N>>(
  children: C
): WrappedChildrenOperator<N, C> {
  function wrapped(d: N, i: number): IterableIterator<[N, undefined]> {
    return map(children(d, i) ?? [], (d) => [d, undefined]);
  }
  wrapped.wrapped = children;
  return wrapped;
}

function wrapChildrenData<N, C extends ChildrenDataOperator<N>>(
  childrenData: C
): WrappedChildrenDataOperator<N, C> {
  function wrapped(d: N, i: number): IterableIterator<N> {
    return map(childrenData(d, i) ?? [], ([d]) => d);
  }
  wrapped.wrapped = childrenData;
  return wrapped;
}

/** an object with children */
export interface HasChildren {
  /** the children */
  readonly children?: Iterable<HasChildren> | undefined;
}

function hasChildren(d: unknown): d is HasChildren {
  try {
    const children = (d as HasChildren).children;
    return (
      children === undefined || typeof children[Symbol.iterator] === "function"
    );
  } catch {
    return false;
  }
}

function defaultChildren(d: unknown): Iterable<HasChildren> | undefined {
  if (hasChildren(d)) {
    return d.children;
  } else {
    throw err`datum did not have an array children field, and no custom children accessor was specified; try calling \`graphHierarchy().children(d => ...)\` to set a custom children accessor`;
  }
}

/** the default hierarchy operator */
export type DefaultHierarchy = ChildrenHierarchy<
  HasChildren,
  ChildrenOperator<HasChildren>
>;

/**
 * Constructs a new {@link Hierarchy} with default settings. This is
 * bundled as {@link graphHierarchy}.
 */
export function graphHierarchy(...args: never[]): DefaultHierarchy {
  if (args.length) {
    throw err`got arguments to graphHierarchy(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphHierarchy()(...)\``;
  } else {
    return buildHierarchy({
      children: defaultChildren,
      childrenData: wrapChildren(defaultChildren),
    });
  }
}
