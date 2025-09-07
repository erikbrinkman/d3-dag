import { isIterable, map } from "../iters";
import { err } from "../utils";
import { graph, type MutGraph, type MutGraphNode } from ".";

// NOTE this is typed differently than most operators, and that's because the
// operators are invariant due to them taking the same type as input and
// output, e.g. the intersection of covariant and contravariant. As a result,
// all of these are typed with the NodeDatum known.

/**
 * an accessor specifying how to get the children from a node
 *
 * The interface for getting child data from node data. This function must
 * return data for every child given the data for the current node. `i` will
 * increment for each node processed.
 *
 * Can be modified with {@link Hierarchy#children}.
 */
export type Children<in out NodeDatum> = (
  datum: NodeDatum,
  index: number,
) => Iterable<NodeDatum> | undefined;

/**
 * The interface for getting children data and associated link data from node
 * data. This function must return data for every child of the given node, and
 * data for link between the two. `i` will increment for each node processed.
 *
 * Can be modified with {@link Hierarchy#childrenData}.
 */
export type ChildrenData<in out NodeDatum, out LinkDatum = unknown> = (
  datum: NodeDatum,
  index: number,
) => Iterable<readonly [NodeDatum, LinkDatum]> | undefined;

/**
 * a wrapped children operator that functions as a children data operator
 *
 * When creating a {@link Hierarchy} with a children operator, the
 * corresponding {@link Hierarchy#childrenData} will be wrapped in this. This
 * version returns undefined for all link data.
 */
export interface WrappedChildren<NodeDatum, Child extends Children<NodeDatum>>
  extends ChildrenData<NodeDatum, undefined> {
  /** the wrapped children operator */
  wrapped: Child;
}

/**
 * a wrapped children data operator that functions as a children operator
 *
 * When creating a {@link Hierarchy} with a children data operator, the
 * corresponding {@link Hierarchy#children} will be wrapped in this.
 */
export interface WrappedChildrenData<
  NodeDatum,
  ChildData extends ChildrenData<NodeDatum>,
> extends Children<NodeDatum> {
  /** the wrapped children data operator */
  wrapped: ChildData;
}

/**
 * create a {@link MutGraph} from hierarchical data
 *
 * By default, each piece of data passed in corresponds to a node, and their
 * `children` will be explored recursively creating more nodes. Use
 * {@link children} to change how children are found, or {@link childrenData}
 * to also attach link data.
 *
 * Created with {@link graphHierarchy}.
 */
export interface Hierarchy<
  NodeDatum,
  LinkDatum,
  Child extends Children<NodeDatum>,
  ChildData extends ChildrenData<NodeDatum, LinkDatum>,
> {
  /**
   * construct a graph from hierarchical data
   *
   * @param data - a source node to recursively find children of; you can pass
   *   multiple source nodes for disconnected or multi-rooted graphs
   * @returns graph - a graph of the hierarchical data
   */
  (...data: readonly NodeDatum[]): MutGraph<NodeDatum, LinkDatum>;

  /**
   * set a new children accessor
   *
   * This accessor takes passed in node data and returns an iterable of new
   * node data that correspond to that nodes children. When this is specified,
   * link data are left undefined.
   *
   * Due to the way typescript inference happens, to make this accessor valid
   * you will likely have to define a separate interface for the data type so
   * that the recursive definition of children can be specified.
   *
   * The default accessor is:
   * ```ts
   * ({ children }) => children
   * ```
   */
  children<NewNode, NewChildren extends Children<NewNode>>(
    val: NewChildren & Children<NewNode>,
  ): Hierarchy<
    NewNode,
    undefined,
    NewChildren,
    WrappedChildren<NewNode, NewChildren>
  >;
  /**
   * get the current children accessor
   *
   * This is the current {@link Children}. If {@link childrenData} was specified,
   * this will return a {@link WrappedChildrenData | wrapped version}
   * that returns only the children of that operator.
   */
  children(): Child;

  /**
   * set a new children data accessor
   *
   * This accessor takes passed in node data and returns an iterable with
   * tuples of new node data and the link data for the corresponding link.
   * Use this function when your graph data has link information that you want
   * to preserve in the graph structure for easy access from links.
   *
   * @example
   *
   * ```ts
   * (nodeData) => [[childData, linkData]]
   * ```
   */
  childrenData<
    NewNode,
    NewLink,
    NewChildrenData extends ChildrenData<NewNode, NewLink>,
  >(
    data: NewChildrenData & ChildrenData<NewNode, NewLink>,
  ): Hierarchy<
    NewNode,
    NewLink,
    WrappedChildrenData<NewNode, NewChildrenData>,
    NewChildrenData
  >;
  /**
   * get the current children data accessor
   *
   * This is the current {@link ChildrenData}. If {@link children} was
   * specified, this will return a
   * {@link WrappedChildren | wrapped version} that returns undefined
   * for all link data.
   */
  childrenData(): ChildData;
}

function buildHierarchy<
  N,
  L,
  C extends Children<N>,
  CD extends ChildrenData<N, L>,
>(childOp: C, childDataOp: CD): Hierarchy<N, L, C, CD> {
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
        for (const [cdatum, ldatum] of childDataOp(datum, i++) ?? []) {
          queue.push([pnode, cdatum, ldatum]);
        }
      }
    }

    // dfs through data
    let next: [MutGraphNode<N, L>, N, L] | undefined;
    while ((next = queue.pop())) {
      const [pnode, ndatum, datum] = next;
      const cached = mapping.get(ndatum);
      if (cached) {
        hierarchied.link(pnode, cached, datum);
      } else {
        const cnode = hierarchied.node(ndatum);
        mapping.set(ndatum, cnode);
        hierarchied.link(pnode, cnode, datum);
        const cdata = childDataOp(ndatum, i++) ?? [];
        for (const [cdatum, ldatum] of cdata) {
          queue.push([cnode, cdatum, ldatum]);
        }
      }
    }

    return hierarchied;
  }

  function children(): C;
  function children<NN, NC extends Children<NN>>(
    childs: NC,
  ): Hierarchy<NN, undefined, NC, WrappedChildren<NN, NC>>;
  function children<NN, NC extends Children<NN>>(
    childs?: NC,
  ): C | Hierarchy<NN, undefined, NC, WrappedChildren<NN, NC>> {
    if (childs === undefined) {
      return childOp;
    } else {
      return buildHierarchy<NN, undefined, NC, WrappedChildren<NN, NC>>(
        childs,
        wrapChildren(childs),
      );
    }
  }
  hierarchy.children = children;

  function childrenData(): CD;
  function childrenData<NN, NL, NCD extends ChildrenData<NN, NL>>(
    data: NCD,
  ): Hierarchy<NN, NL, WrappedChildrenData<NN, NCD>, NCD>;
  function childrenData<NN, NL, NCD extends ChildrenData<NN, NL>>(
    data?: NCD,
  ): CD | Hierarchy<NN, NL, WrappedChildrenData<NN, NCD>, NCD> {
    if (data === undefined) {
      return childDataOp;
    } else {
      return buildHierarchy<NN, NL, WrappedChildrenData<NN, NCD>, NCD>(
        wrapChildrenData(data),
        data,
      );
    }
  }
  hierarchy.childrenData = childrenData;

  return hierarchy;
}

function wrapChildren<N, C extends Children<N>>(
  children: C,
): WrappedChildren<N, C> {
  function wrapped(d: N, i: number): IterableIterator<[N, undefined]> {
    return map(children(d, i) ?? [], (d) => [d, undefined]);
  }
  wrapped.wrapped = children;
  return wrapped;
}

function wrapChildrenData<N, C extends ChildrenData<N>>(
  childrenData: C,
): WrappedChildrenData<N, C> {
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

function hasChildren(data: unknown): data is HasChildren {
  if (typeof data !== "object" || data === null) {
    return false;
  } else if (!("children" in data)) {
    return true;
  } else {
    const { children } = data;
    return children === undefined || isIterable(children);
  }
}

function defaultChildren(d: unknown): Iterable<HasChildren> | undefined {
  if (hasChildren(d)) {
    return d.children;
  } else {
    throw err`datum did not have an iterable children field, and no custom children accessor was specified; try calling \`graphHierarchy().children(d => ...)\` to set a custom children accessor`;
  }
}

/**
 * the default {@link Hierarchy} operator created by {@link graphHierarchy}
 */
export type DefaultHierarchy = Hierarchy<
  HasChildren,
  undefined,
  Children<HasChildren>,
  WrappedChildren<HasChildren, Children<HasChildren>>
>;

/**
 * create a new {@link Hierarchy} with default settings
 *
 * Hierarchy operators create graphs from data that are already in a graph like
 * form. By default it expects node data to have a `children` property with
 * more node data.
 *
 * You can specify a different way to access children with
 * {@link Hierarchy#children} or also specify link data with
 * {@link Hierarchy#childrenData}.
 *
 * @example
 *
 * If you want to make simple graph with default settings:
 *
 * ```ts
 * const data = {
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
 *           "children": [ { "id": "Dirichlet" } ]
 *         }
 *       ]
 *     }
 *   ]
 * } as const;
 *
 * const builder = graphHierarchy();
 * const grf = builder(data);
 * ```
 *
 * @example
 *
 * If you want to make a graph with link data:
 *
 * ```ts
 * const data = {
 *   "id": "Euler",
 *   "children": [
 *     [
 *       { "id": "Lagrange" },
 *       "advisee",
 *     ]
 *   ]
 * } as const;
 *
 * interface Data {
 *   children?: [Data, string][];
 * }
 *
 * const builder = graphHierarchy()
 *   .childrenData(({ children = [] }: Data) => children);
 * const grf = builder(data);
 * ```
 */
export function graphHierarchy(...args: never[]): DefaultHierarchy {
  if (args.length) {
    throw err`got arguments to graphHierarchy(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`graphHierarchy()(...)\``;
  } else {
    return buildHierarchy(defaultChildren, wrapChildren(defaultChildren));
  }
}
