/**
 * This module contains methods for constructing a layered representation of
 * the DAG meant for visualization.  The algorithm is based off ideas presented
 * in K. Sugiyama et al. [1979], but described by [S.
 * Hong](http://www.it.usyd.edu.au/~shhong/fab.pdf).  The sugiyama layout can
 * be configured with different algorithms for each stage of the layout.  For
 * each stage there should be adecuate choices for methods that balance speed
 * and quality for your desired layout, but any function that meets the
 * interface for that stage is valid, but custom methods can also be provided,
 * assuming they do what's necessary in that step.
 *
 * The method {@link sugiyama} is used to create a new {@link SugiyamaOperator}. This
 * can be customized with all of the methods available, but in particular the
 * method is broken down into three steps:
 * 1. {@link "sugiyama/layering/index" | layering} - in this step, every node is
 *    assigned an integer later such that children are guaranteed to have
 *    higher layers than their parents.
 * 2. {@link "sugiyama/decross/index" | decrossing} - in the step, nodes in each
 *    layer are reordered to minimize the number of crossings.
 * 3. {@link "sugiyama/coord/index" | coordinate assignment} - in the step, the
 *    nodes are assigned x and y coordinates that respect their layer, and
 *    layer ordering.
 *
 * @module
 */

import { CoordOperator, SugiNodeSizeAccessor } from "./coord";
import { Dag, DagNode } from "../dag/node";
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
import { cachedNodeSize } from "./nodesize";

export interface SugiyamaInfo {
  width: number;
  height: number;
}

export interface NodeSizeAccessor<NodeDatum = never, LinkDatum = never> {
  (node?: DagNode<NodeDatum, LinkDatum>): readonly [number, number];
}

type NsDagNode<NS extends NodeSizeAccessor> = Exclude<
  Parameters<NS>[0],
  undefined
>;
type NsNodeDatum<NS extends NodeSizeAccessor> = NodeDatum<NsDagNode<NS>>;
type NsLinkDatum<NS extends NodeSizeAccessor> = LinkDatum<NsDagNode<NS>>;

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

type DagDagNode<D extends Dag> = D extends DagNode ? D : never;
type LDag<Op extends LayeringOperator> = Parameters<Op>[0];
type LDagNode<Op extends LayeringOperator> = DagDagNode<LDag<Op>>;
type DDagNode<Op extends DecrossOperator> = SugiDataDagNode<
  Parameters<Op>[0][number][number]["data"]
>;
type CDagNode<Op extends CoordOperator> = SugiDataDagNode<
  Parameters<Op>[0][number][number]["data"]
>;
type SNSDagNode<Op extends SugiNodeSizeAccessor> = SugiDataDagNode<
  Parameters<Op>[0]["data"]
>;

type OpsNodeDatum<Ops extends Operators> = NodeDatum<
  LDagNode<Ops["layering"]>
> &
  NodeDatum<DDagNode<Ops["decross"]>> &
  NodeDatum<CDagNode<Ops["coord"]>> &
  NodeDatum<SNSDagNode<Ops["sugiNodeSize"]>>;
type OpsLinkDatum<Ops extends Operators> = LinkDatum<
  LDagNode<Ops["layering"]>
> &
  LinkDatum<DDagNode<Ops["decross"]>> &
  LinkDatum<CDagNode<Ops["coord"]>> &
  LinkDatum<SNSDagNode<Ops["sugiNodeSize"]>>;

/**
 * The operator used to layout a {@link Dag} using the sugiyama method.
 */
export interface SugiyamaOperator<Ops extends Operators = Operators> {
  /**
   * Layout the {@link Dag} using the currently configured operator. The returned
   * DAG nodes will have added properties from {@link SugiyamaNode}. In addition,
   * each link will have points reset and assigned.
   */
  (dag: Dag<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>>): SugiyamaInfo;

  /**
   * Set the {@link LayeringOperator}. See {@link "sugiyama/layering/index" |
   * layerings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link simplex}.
   */
  layering<NewLayering extends LayeringOperator>(
    layer: NewLayering
  ): SugiyamaOperator<Up<Ops, { layering: NewLayering }>>;
  /**
   * Get the current {@link LayeringOperator}.
   */
  layering(): Ops["layering"];

  /**
   * Set the {@link DecrossOperator}. See {@link "sugiyama/decross/index" |
   * decrossings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link twoLayer}.
   */
  decross<NewDecross extends DecrossOperator>(
    dec: NewDecross
  ): SugiyamaOperator<Up<Ops, { decross: NewDecross }>>;
  /**
   * Get the current {@link DecrossOperator}.
   */
  decross(): Ops["decross"];

  /**
   * Set the {@link CoordOperator}. See {@link "sugiyama/coord/index" | coordinate
   * assignments} for more information about proper operators and a
   * description of the built in operators. The default value is {@link quad}.
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
   * numbers [ *width*, *height* ] and returns this {@link SugiyamaOperator}.  When
   * {@link size} is non-null the dag will be shrunk or expanded to fit in the
   * size, keeping all distances proportional. If it's null, the nodeSize
   * parameters will be respected as coordinate sizes.
   */
  size(sz: readonly [number, number] | null): SugiyamaOperator<Ops>;
  /**
   * Get the current layout size, which defaults to [1, 1]. The return value
   * will be null if the layout is {@link nodeSize}d.
   */
  size(): null | readonly [number, number];

  /**
   * Sets the sugiyama layouts NodeSizeAccessor. This accessor...
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
  /** Get the current NodeSizeAccessor ... */
  nodeSize(): Ops["nodeSize"];

  /**
   * Sets this sugiyama layout's {@link SugiNodeSizeAccessor}. This accessor returns
   * the width and height of a node it's called on, and the node will then be
   * laidout to have at least that much of a gap between nodes.
   */
  sugiNodeSize<NewSugiNodeSize extends SugiNodeSizeAccessor>(
    sz: NewSugiNodeSize
  ): SugiyamaOperator<
    Up<Ops, { sugiNodeSize: NewSugiNodeSize; nodeSize: null }>
  >;
  /**
   * Get the current {@link SugiNodeSizeAccessor}, which defaults to returning [1, 1]
   * for normal nodes and [0, 1] for {@link DummyNodes}, casing edges to be treaded
   * as if they had no width.
   */
  sugiNodeSize(): Ops["sugiNodeSize"];
}

/** @internal */
function buildOperator<Ops extends Operators>(
  options: Ops & {
    size: readonly [number, number] | null;
  }
): SugiyamaOperator<Ops> {
  function sugiyama(
    dag: Dag<OpsNodeDatum<Ops>, OpsLinkDatum<Ops>>
  ): SugiyamaInfo {
    // compute layers
    options.layering(dag);

    // create layers
    const layers = sugify(dag);

    // assign y
    const nodeSize = cachedNodeSize(options.sugiNodeSize);
    let height = 0;
    for (const layer of layers) {
      const layerHeight = Math.max(...layer.map((n) => nodeSize(n)[1]));
      for (const node of layer) {
        node.y = height + layerHeight / 2;
      }
      height += layerHeight;
    }
    assert(
      height > 0,
      "at least one node must have positive height, but total height was zero"
    );

    // minimize edge crossings
    options.decross(layers);

    // assign coordinates
    let width = options.coord(layers, nodeSize);

    // verify
    for (const layer of layers) {
      for (const node of layer) {
        assert(
          node.x !== undefined,
          js`coord didn't assign an x to node '${node}'`
        );
        assert(
          node.x >= 0 && node.x <= width,
          `coord assgined an x (${node.x}) outside of [0, ${width}]`
        );
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
export function sugiyama(
  ...args: never[]
): SugiyamaOperator<{
  layering: SimplexOperator<{
    rank: RankAccessor<unknown, unknown>;
    group: GroupAccessor<unknown, unknown>;
  }>;
  decross: TwoLayerOperator<MedianOperator>;
  coord: QuadOperator;
  nodeSize: NodeSizeAccessor<unknown, unknown>;
  sugiNodeSize: WrappedNodeSizeAccessor<NodeSizeAccessor<unknown, unknown>>;
}> {
  assert(
    !args.length,
    `got arguments to sugiyama(${args}), but constructor takes no aruguments.`
  );
  return buildOperator({
    layering: simplex(),
    decross: twoLayer(),
    coord: quad(),
    size: null,
    nodeSize: defaultNodeSize,
    sugiNodeSize: wrapNodeSizeAccessor(defaultNodeSize)
  });
}
