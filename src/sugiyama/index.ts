/**
 * A {@link SugiyamaOperator} for computing a layered layout of a dag
 *
 * @module
 */

import { CoordNodeSizeAccessor, CoordOperator } from "./coord";
import { Dag, DagNode } from "../dag";
import { GroupAccessor, LayeringOperator, RankAccessor } from "./layering";
import {
  LinkDatum,
  NodeDatum,
  SugiDataDagNode,
  SugiNode,
  sugify
} from "./utils";
import { QuadOperator, quad } from "./coord/quad";
import { SimplexOperator, simplex } from "./layering/simplex";
import { TwoLayerOperator, twoLayer } from "./decross/two-layer";
import { Up, assert, def, js } from "../utils";

import { DecrossOperator } from "./decross";
import { MedianOperator } from "./twolayer/median";

/**
 * The return from calling {@link SugiyamaOperator}
 *
 * This is the final width and height of the laidout dag.
 */
export interface SugiyamaInfo {
  width: number;
  height: number;
}

/**
 * An accessor for computing the size of a node in the layout
 *
 * If `node` is omitted, the returned size is the size of a "dummy node", a
 * piece of a long edge that can curve around other nodes. This accessor must
 * return a tuple of non-negative numbers corresponding to the node's *width*
 * and *height*. Since this is a layered layout, a node's height is effectively
 * the maximum height of all nodes in the same layer.
 *
 * If you need more control over the size of dummy nodes, see
 * {@link SugiNodeSizeAccessor}.
 *
 * This accessor will only be called once for each node.
 */
export interface NodeSizeAccessor<NodeDatum = never, LinkDatum = never> {
  (node?: DagNode<NodeDatum, LinkDatum>): readonly [number, number];
}

/**
 * An accessor for computing the size of a node in the layout
 *
 * This interface exposes a full {@link SugiNode}, which has more information
 * about dummy nodes availble in case different dummy nodes should have
 * different sizes.
 *
 * For most cases {@link NodeSizeAccessor} should be enough.
 */
export interface SugiNodeSizeAccessor<NodeDatum = never, LinkDatum = never> {
  (node: SugiNode<NodeDatum, LinkDatum>): readonly [number, number];
}

type NsDagNode<NS extends NodeSizeAccessor> = Exclude<
  Parameters<NS>[0],
  undefined
>;
type NsNodeDatum<NS extends NodeSizeAccessor> = NodeDatum<NsDagNode<NS>>;
type NsLinkDatum<NS extends NodeSizeAccessor> = LinkDatum<NsDagNode<NS>>;

/**
 * The effective {@link SugiNodeSizeAccessor} when a normal
 * {@link NodeSizeAccessor} is supplied.
 */
export interface WrappedNodeSizeAccessor<NodeSize extends NodeSizeAccessor>
  extends SugiNodeSizeAccessor<NsNodeDatum<NodeSize>, NsLinkDatum<NodeSize>> {
  wrapped: NodeSize;
}

function wrapNodeSizeAccessor<NS extends NodeSizeAccessor>(
  acc: NS
): WrappedNodeSizeAccessor<NS> {
  const empty = acc();
  function sugiNodeSizeAccessor(
    node: SugiNode<NsNodeDatum<NS>, NsLinkDatum<NS>>
  ): readonly [number, number] {
    return "node" in node.data ? acc(node.data.node) : empty;
  }
  sugiNodeSizeAccessor.wrapped = acc;
  return sugiNodeSizeAccessor;
}

interface Operators {
  layering: LayeringOperator;
  decross: DecrossOperator;
  coord: CoordOperator;
  nodeSize: NodeSizeAccessor | null;
  sugiNodeSize: SugiNodeSizeAccessor;
}

type LDagNode<Op extends LayeringOperator> = ReturnType<
  Parameters<Op>[0]["roots"]
>[number];
type OpDagNode<Op extends DecrossOperator | CoordOperator> = SugiDataDagNode<
  Parameters<Op>[0][number][number]["data"]
>;
type SNSDagNode<Op extends SugiNodeSizeAccessor> = SugiDataDagNode<
  Parameters<Op>[0]["data"]
>;

type OpsDag<Ops extends Operators> = Dag<
  NodeDatum<LDagNode<Ops["layering"]>> &
    NodeDatum<OpDagNode<Ops["decross"]>> &
    NodeDatum<OpDagNode<Ops["coord"]>> &
    NodeDatum<SNSDagNode<Ops["sugiNodeSize"]>>,
  LinkDatum<LDagNode<Ops["layering"]>> &
    LinkDatum<OpDagNode<Ops["decross"]>> &
    LinkDatum<OpDagNode<Ops["coord"]>> &
    LinkDatum<SNSDagNode<Ops["sugiNodeSize"]>>
>;

/**
 * The operator used to layout a {@link Dag} using the sugiyama layered method.
 *
 * The algorithm is roughly comprised of three steps:
 * 1. {@link LayeringOperator | layering} - in this step, every node is
 *    assigned a non-negative integer later such that children are guaranteed
 *    to have higher layers than their parents. (modified with {@link layering})
 * 2. {@link DecrossOperator | decrossing} - in the step, nodes in each layer
 *    are reordered to minimize the number of crossings. (modified with {@link
 *    decross})
 * 3. {@link CoordOperator | coordinate assignment} - in the step, the
 *    nodes are assigned x and y coordinates that respect their layer, layer
 *    ordering, and size. (modified with {@link coord} and {@link nodeSize})
 *
 * The algorithm is based off ideas presented in K. Sugiyama et al. [1979], but
 * described by {@link http://www.it.usyd.edu.au/~shhong/fab.pdf | S. Hong}.
 * The sugiyama layout can be configured with different algorithms for each
 * stage of the layout. For each stage there should be adecuate choices for
 * methods that balance speed and quality for your desired layout. In the
 * absence of those, any function that meets the interface for that stage is
 * valid.
 *
 * Create with {@link sugiyama}.
 */
export interface SugiyamaOperator<Ops extends Operators = Operators> {
  /**
   * Layout the {@link Dag} using the currently configured operator. The
   * returned dag nodes will have `x`, `y`, and `value` (layer), assigned. In
   * addition, each link will have `points` assigned to the current layout.
   */
  (dag: OpsDag<Ops>): SugiyamaInfo;

  /**
   * Set the {@link LayeringOperator}. (default: {@link SimplexOperator})
   */
  layering<NewLayering extends LayeringOperator>(
    layer: NewLayering
  ): SugiyamaOperator<Up<Ops, { layering: NewLayering }>>;
  /**
   * Get the current {@link LayeringOperator}.
   */
  layering(): Ops["layering"];

  /**
   * Set the {@link DecrossOperator}. (default: {@link TwoLayerOperator})
   */
  decross<NewDecross extends DecrossOperator>(
    dec: NewDecross
  ): SugiyamaOperator<Up<Ops, { decross: NewDecross }>>;
  /**
   * Get the current {@link DecrossOperator}.
   */
  decross(): Ops["decross"];

  /**
   * Set the {@link CoordOperator}. (default: {@link QuadOperator})
   */
  coord<NewCoord extends CoordOperator>(
    crd: NewCoord
  ): SugiyamaOperator<Up<Ops, { coord: NewCoord }>>;
  /**
   * Get the current {@link CoordOperator}.
   */
  coord(): Ops["coord"];

  /**
   * Sets the sugiyama layout's size to the specified two-element array of
   * numbers [ *width*, *height* ].  When `size` is non-null the dag will be
   * shrunk or expanded to fit in the size, keeping all distances proportional.
   * If it's null, the {@link nodeSize} parameters will be respected as
   * coordinate sizes. (default: null)
   */
  size(sz: readonly [number, number] | null): SugiyamaOperator<Ops>;
  /**
   * Get the current layout size.
   */
  size(): null | readonly [number, number];

  /**
   * Sets the {@link NodeSizeAccessor}, which assigns how much space is
   * necessary between nodes. (defaults to [1, 1] for normal nodes and [0, 0]
   * for dummy nodes)
   */
  nodeSize<NewNodeSize extends NodeSizeAccessor>(
    acc: NewNodeSize
  ): SugiyamaOperator<
    Up<
      Ops,
      {
        nodeSize: NewNodeSize;
        sugiNodeSize: WrappedNodeSizeAccessor<NewNodeSize>;
      }
    >
  >;
  /**
   * Get the current node size
   *
   * If a {@link SugiNodeSizeAccessor} was specified, this will be null.
   */
  nodeSize(): Ops["nodeSize"];

  /**
   * Sets this sugiyama layout's {@link SugiNodeSizeAccessor}.
   *
   * This is effectively a more powerful api above the standard
   * {@link NodeSizeAccessor}, and is only necessary if different dummy nodes
   * need different sizes.
   */
  sugiNodeSize<NewSugiNodeSize extends SugiNodeSizeAccessor>(
    sz: NewSugiNodeSize
  ): SugiyamaOperator<
    Up<Ops, { sugiNodeSize: NewSugiNodeSize; nodeSize: null }>
  >;
  /**
   * Get the current sugi node size, or a {@link WrappedNodeSizeAccessor |
   * wrapped version} if {@link nodeSize} was specified.
   */
  sugiNodeSize(): Ops["sugiNodeSize"];
}

/**
 * A checked and cached node size accessor wrapper.
 *
 * @internal
 */
function cachedNodeSize<N, L>(
  nodeSize: SugiNodeSizeAccessor<N, L>
): readonly [CoordNodeSizeAccessor<N, L>, CoordNodeSizeAccessor<N, L>] {
  const cache = new Map<SugiNode, readonly [number, number]>();

  function cached(node: SugiNode<N, L>): readonly [number, number] {
    let val = cache.get(node);
    if (val === undefined) {
      val = nodeSize(node);
      const [width, height] = val;
      if (width < 0 || height < 0) {
        throw new Error(
          js`all node sizes must be non-negative, but got width ${width} and height ${height} for node '${node}'`
        );
      }
      cache.set(node, val);
    }
    return val;
  }

  const cachedX = (node: SugiNode<N, L>): number => cached(node)[0];
  const cachedY = (node: SugiNode<N, L>): number => cached(node)[1];

  return [cachedX, cachedY];
}

/** @internal */
function buildOperator<Ops extends Operators>(
  options: Ops & {
    size: readonly [number, number] | null;
  }
): SugiyamaOperator<Ops> {
  function sugiyama(dag: OpsDag<Ops>): SugiyamaInfo {
    // compute layers
    options.layering(dag);

    // create layers
    const layers = sugify(dag);

    // assign y
    const [xSize, ySize] = cachedNodeSize(options.sugiNodeSize);
    let height = 0;
    for (const layer of layers) {
      const layerHeight = Math.max(...layer.map(ySize));
      for (const node of layer) {
        node.y = height + layerHeight / 2;
      }
      height += layerHeight;
    }
    if (height <= 0) {
      throw new Error(
        "at least one node must have positive height, but total height was zero"
      );
    }

    // minimize edge crossings
    options.decross(layers);

    // assign coordinates
    let width = options.coord(layers, xSize);

    // verify
    for (const layer of layers) {
      for (const node of layer) {
        if (node.x === undefined) {
          throw new Error(js`coord didn't assign an x to node '${node}'`);
        } else if (node.x < 0 || node.x > width) {
          throw new Error(
            `coord assgined an x (${node.x}) outside of [0, ${width}]`
          );
        }
      }
    }

    // scale x
    if (options.size !== null) {
      const [newWidth, newHeight] = options.size;
      for (const layer of layers) {
        for (const node of layer) {
          assert(node.x !== undefined && node.y !== undefined);
          node.x *= newWidth / width;
          node.y *= newHeight / height;
        }
      }
      width = newWidth;
      height = newHeight;
    }

    // Update original dag with values
    for (const layer of layers) {
      for (const sugi of layer) {
        assert(sugi.x !== undefined && sugi.y !== undefined);
        if ("target" in sugi.data) continue;
        sugi.data.node.x = sugi.x;
        sugi.data.node.y = sugi.y;

        const pointsMap = new Map(
          sugi.data.node
            .ichildLinks()
            .map(({ points, target }) => [target, points] as const)
        );
        for (let child of sugi.ichildren()) {
          const points = [{ x: sugi.x, y: sugi.y }];
          while ("target" in child.data) {
            assert(child.x !== undefined && child.y !== undefined);
            points.push({ x: child.x, y: child.y });
            [child] = child.ichildren();
          }
          assert(child.x !== undefined && child.y !== undefined);
          points.push({ x: child.x, y: child.y });

          // update
          const assign = def(pointsMap.get(child.data.node));
          assign.splice(0, assign.length, ...points);
        }
      }
    }

    // layout info
    return { width, height };
  }

  function layering(): Ops["layering"];
  function layering<NL extends LayeringOperator>(
    layer: NL
  ): SugiyamaOperator<Up<Ops, { layering: NL }>>;
  function layering<NL extends LayeringOperator>(
    layer?: NL
  ): Ops["layering"] | SugiyamaOperator<Up<Ops, { layering: NL }>> {
    if (layer === undefined) {
      return options.layering;
    } else {
      const { layering: _, ...rest } = options;
      return buildOperator({
        ...rest,
        layering: layer
      });
    }
  }
  sugiyama.layering = layering;

  function decross(): Ops["decross"];
  function decross<ND extends DecrossOperator>(
    dec: ND
  ): SugiyamaOperator<Up<Ops, { decross: ND }>>;
  function decross<ND extends DecrossOperator>(
    dec?: ND
  ): Ops["decross"] | SugiyamaOperator<Up<Ops, { decross: ND }>> {
    if (dec === undefined) {
      return options.decross;
    } else {
      const { decross: _, ...rest } = options;
      return buildOperator({
        ...rest,
        decross: dec
      });
    }
  }
  sugiyama.decross = decross;

  function coord(): Ops["coord"];
  function coord<NC extends CoordOperator>(
    crd: NC
  ): SugiyamaOperator<Up<Ops, { coord: NC }>>;
  function coord<NC extends CoordOperator>(
    crd?: NC
  ): Ops["coord"] | SugiyamaOperator<Up<Ops, { coord: NC }>> {
    if (crd === undefined) {
      return options.coord;
    } else {
      const { coord: _, ...rest } = options;
      return buildOperator({
        ...rest,
        coord: crd
      });
    }
  }
  sugiyama.coord = coord;

  function size(): null | readonly [number, number];
  function size(sz: readonly [number, number]): SugiyamaOperator<Ops>;
  function size(
    sz?: readonly [number, number] | null
  ): SugiyamaOperator<Ops> | null | readonly [number, number] {
    if (sz !== undefined) {
      return buildOperator({ ...options, size: sz });
    } else {
      return options.size;
    }
  }
  sugiyama.size = size;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<NNS extends NodeSizeAccessor>(
    sz: NNS
  ): SugiyamaOperator<
    Up<Ops, { nodeSize: NNS; sugiNodeSize: WrappedNodeSizeAccessor<NNS> }>
  >;
  function nodeSize<NNS extends NodeSizeAccessor>(
    sz?: NNS
  ):
    | SugiyamaOperator<
        Up<
          Ops,
          {
            nodeSize: NNS;
            sugiNodeSize: WrappedNodeSizeAccessor<NNS>;
          }
        >
      >
    | Ops["nodeSize"] {
    if (sz !== undefined) {
      const { nodeSize: _, sugiNodeSize: __, ...rest } = options;
      return buildOperator({
        ...rest,
        nodeSize: sz,
        sugiNodeSize: wrapNodeSizeAccessor(sz)
      });
    } else {
      return options.nodeSize;
    }
  }
  sugiyama.nodeSize = nodeSize;

  function sugiNodeSize(): Ops["sugiNodeSize"];
  function sugiNodeSize<NSNS extends SugiNodeSizeAccessor>(
    sz: NSNS
  ): SugiyamaOperator<Up<Ops, { sugiNodeSize: NSNS; nodeSize: null }>>;
  function sugiNodeSize<NSNS extends SugiNodeSizeAccessor>(
    sz?: NSNS
  ):
    | SugiyamaOperator<Up<Ops, { sugiNodeSize: NSNS; nodeSize: null }>>
    | Ops["sugiNodeSize"] {
    if (sz !== undefined) {
      const { sugiNodeSize: _, nodeSize: __, ...rest } = options;
      return buildOperator({
        ...rest,
        sugiNodeSize: sz,
        nodeSize: null
      });
    } else {
      return options.sugiNodeSize;
    }
  }
  sugiyama.sugiNodeSize = sugiNodeSize;

  return sugiyama;
}

/** @internal */
function defaultNodeSize(node?: DagNode): [number, number] {
  return [+(node !== undefined), 1];
}

/**
 * Construct a new {@link SugiyamaOperator} with the default settings.
 */
export function sugiyama(...args: never[]): SugiyamaOperator<{
  layering: SimplexOperator<{
    rank: RankAccessor<unknown, unknown>;
    group: GroupAccessor<unknown, unknown>;
  }>;
  decross: TwoLayerOperator<MedianOperator>;
  coord: QuadOperator;
  nodeSize: NodeSizeAccessor<unknown, unknown>;
  sugiNodeSize: WrappedNodeSizeAccessor<NodeSizeAccessor<unknown, unknown>>;
}> {
  if (args.length) {
    throw new Error(
      `got arguments to sugiyama(${args}), but constructor takes no aruguments.`
    );
  } else {
    return buildOperator({
      layering: simplex(),
      decross: twoLayer(),
      coord: quad(),
      size: null,
      nodeSize: defaultNodeSize,
      sugiNodeSize: wrapNodeSizeAccessor(defaultNodeSize)
    });
  }
}
