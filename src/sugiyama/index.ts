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

import { ChildLink, Dag, DagNode, DagRoot, LayoutChildLink } from "../dag/node";
import {
  Operator as CoordOperator,
  HorizableNode,
  NodeSizeAccessor
} from "./coord";
import { LayerableNode, Operator as LayeringOperator } from "./layering";
import { QuadOperator, quad } from "./coord/quad";
import { Replace, js } from "../utils";
import { SimplexOperator, simplex } from "./layering/simplex";
import { TwoLayerOperator, twoLayer } from "./decross/two-layer";

import { Operator as DecrossOperator } from "./decross";
import { DummyNode } from "./dummy";
import { MedianOperator } from "./twolayer/median";
import { cachedNodeSize } from "./utils";

/** @internal */
interface LayeredNode {
  layer: number;
}

/** @internal */
interface VertableNode {
  y?: number;
}

/**
 * The added attributes to the {@link Dag} once the {@link SugiyamaOperator} is called.
 */
export interface SugiyamaNode {
  layer: number;
  x: number;
  y: number;
}

export interface SugiyamaLayout<DagType> {
  dag: DagType;
  width: number;
  height: number;
}

interface Operators<NodeType extends DagNode> {
  layering: LayeringOperator<NodeType>;
  decross: DecrossOperator<NodeType>;
  coord: CoordOperator<NodeType>;
  nodeSize: NodeSizeAccessor<NodeType>;
}

/**
 * The operator used to layout a {@link Dag} using the sugiyama method.
 */
export interface SugiyamaOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType> = Operators<NodeType>
> {
  /**
   * Layout the {@link Dag} using the currently configured operator. The returned
   * DAG nodes will have added properties from {@link SugiyamaNode}. In addition,
   * each link will have points reset and assigned.
   */
  (dag: NodeType): SugiyamaLayout<NodeType & SugiyamaNode>;
  (dag: DagRoot<NodeType>): SugiyamaLayout<DagRoot<NodeType & SugiyamaNode>>;
  (dag: Dag<NodeType>): SugiyamaLayout<Dag<NodeType & SugiyamaNode>>;

  /**
   * Set the {@link LayeringOperator}. See {@link "sugiyama/layering/index" |
   * layerings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link simplex}.
   */
  layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, Replace<Ops, "layering", NewLayering>>;
  /**
   * Get the current {@link LayeringOperator}.
   */
  layering(): Ops["layering"];

  /**
   * Set the {@link DecrossOperator}. See {@link "sugiyama/decross/index" |
   * decrossings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link twoLayer}.
   */
  decross<NewDecross extends DecrossOperator<NodeType>>(
    dec: NewDecross
  ): SugiyamaOperator<NodeType, Replace<Ops, "decross", NewDecross>>;
  /**
   * Get the current {@link DecrossOperator}.
   */
  decross(): Ops["decross"];

  /**
   * Set the {@link CoordOperator}. See {@link "sugiyama/coord/index" | coordinate
   * assignments} for more information about proper operators and a
   * description of the built in operators. The default value is {@link quad}.
   */
  coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Replace<Ops, "coord", NewCoord>>;
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
  size(sz: [number, number] | null): SugiyamaOperator<NodeType, Ops>;
  /**
   * Get the current layout size, which defaults to [1, 1]. The return value
   * will be null if the layout is {@link nodeSize}d.
   */
  size(): null | [number, number];

  /**
   * Sets this sugiyama layout's {@link NodeSizeAccessor}. This accessor returns
   * the width and height of a node it's called on, and the node will then be
   * laidout to have at least that much of a gap between nodes.
   */
  nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz: NewNodeSize
  ): SugiyamaOperator<NodeType, Replace<Ops, "nodeSize", NewNodeSize>>;
  /**
   * Get the current {@link NodeSizeAccessor][, which defaults to returning [1, 1]
   * for normal nodes and [0, 1] for {@link DummyNodes}, casing edges to be treaded
   * as if they had no width.
   */
  nodeSize(): Ops["nodeSize"];
}

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Ops extends Operators<NodeType>
>(
  options: Ops & {
    size: [number, number] | null;
  }
): SugiyamaOperator<NodeType, Ops> {
  function createLayers<N extends NodeType & LayeredNode>(
    dag: Dag<N>
  ): ((N & HorizableNode & VertableNode) | DummyNode)[][] {
    // every time
    const layers: ((N & HorizableNode & VertableNode) | DummyNode)[][] = [];
    // NOTE copy here is explicit so that modifying the graph doesn't change how we iterate
    for (const node of dag.descendants()) {
      // add node to layer
      const nlayer = node.layer;
      const layer = layers[nlayer] || (layers[nlayer] = []);
      layer.push(node);
      // add dummy nodes in place of children
      node.dataChildren = node.dataChildren.map((link) => {
        const clayer = link.child.layer;
        if (clayer <= nlayer) {
          throw new Error(
            js`layering left child node '${link.child}' (${clayer}) ` +
              js`with a greater or equal layer to parent node '${node}' (${nlayer})`
          );
        }
        // NOTE this cast breaks the type system, but sugiyama basically
        // needs to do that, so...
        let last = link.child as DummyNode;
        for (let l = clayer - 1; l > nlayer; l--) {
          const dummy = new DummyNode();
          dummy.dataChildren.push(new LayoutChildLink(last, undefined));
          (layers[l] || (layers[l] = [])).push(dummy);
          last = dummy;
        }
        // NOTE this cast breaks the type system, but sugiyama basically
        // needs to do that, so...
        return new LayoutChildLink(last, link.data) as ChildLink<unknown, N>;
      });
    }
    return layers;
  }

  function removeDummies<N extends NodeType & SugiyamaNode>(dag: Dag<N>): void {
    for (const node of dag) {
      /* istanbul ignore next */
      if (!(node instanceof DummyNode)) {
        node.dataChildren = node.dataChildren.map((link) => {
          let child = link.child;
          const points = [{ x: node.x, y: node.y }];
          while (child instanceof DummyNode) {
            points.push({ x: child.x, y: child.y });
            [child] = child.ichildren();
          }
          points.push({ x: child.x, y: child.y });
          return new LayoutChildLink(child, link.data, points) as ChildLink<
            unknown,
            N
          >;
        });
      }
    }
  }

  function sugiyama(dag: NodeType): SugiyamaLayout<NodeType & SugiyamaNode>;
  function sugiyama(
    dag: DagRoot<NodeType>
  ): SugiyamaLayout<DagRoot<NodeType & SugiyamaNode>>;
  function sugiyama(
    dag: Dag<NodeType>
  ): SugiyamaLayout<Dag<NodeType & SugiyamaNode>>;
  function sugiyama(
    dag: Dag<NodeType>
  ): SugiyamaLayout<Dag<NodeType & SugiyamaNode>> {
    // compute layers
    options.layering(dag);
    // create layers
    for (const node of dag) {
      const layer = (node as LayerableNode).layer;
      if (layer === undefined) {
        throw new Error(js`layering did not assign layer to node '${node}'`);
      } else if (layer < 0) {
        throw new Error(
          js`layering assigned a negative layer (${layer}) to node '${node}'`
        );
      }
    }
    const layers = createLayers(dag as Dag<NodeType & LayeredNode>);
    const nodeSize = cachedNodeSize<NodeType>(options.nodeSize);

    // assign y
    let height = 0;
    for (const layer of layers) {
      const layerHeight = Math.max(...layer.map((n) => nodeSize(n)[1]));
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
    let width = options.coord(layers, nodeSize);

    // scale x
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
    const exed = layers as (NodeType & SugiyamaNode)[][];
    if (options.size !== null) {
      const [newWidth, newHeight] = options.size;
      for (const layer of exed) {
        for (const node of layer) {
          node.x *= newWidth / width;
          node.y *= newHeight / height;
        }
      }
      width = newWidth;
      height = newHeight;
    }

    // Remove dummy nodes and update edge data
    const sugied = dag as Dag<NodeType & SugiyamaNode>;
    removeDummies(sugied);
    // laidout dag
    return { dag: sugied, width, height };
  }

  function layering(): Ops["layering"];
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, Replace<Ops, "layering", NewLayering>>;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer?: NewLayering
  ):
    | Ops["layering"]
    | SugiyamaOperator<NodeType, Replace<Ops, "layering", NewLayering>> {
    if (layer === undefined) {
      return options.layering;
    } else {
      const { layering: _, ...rest } = options;
      return buildOperator<NodeType, Replace<Ops, "layering", NewLayering>>({
        ...rest,
        layering: layer
      });
    }
  }
  sugiyama.layering = layering;

  function decross(): Ops["decross"];
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec: NewDecross
  ): SugiyamaOperator<NodeType, Replace<Ops, "decross", NewDecross>>;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec?: NewDecross
  ):
    | Ops["decross"]
    | SugiyamaOperator<NodeType, Replace<Ops, "decross", NewDecross>> {
    if (dec === undefined) {
      return options.decross;
    } else {
      const { decross: _, ...rest } = options;
      return buildOperator<NodeType, Replace<Ops, "decross", NewDecross>>({
        ...rest,
        decross: dec
      });
    }
  }
  sugiyama.decross = decross;

  function coord(): Ops["coord"];
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Replace<Ops, "coord", NewCoord>>;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd?: NewCoord
  ):
    | Ops["coord"]
    | SugiyamaOperator<NodeType, Replace<Ops, "coord", NewCoord>> {
    if (crd === undefined) {
      return options.coord;
    } else {
      const { coord: _, ...rest } = options;
      return buildOperator<NodeType, Replace<Ops, "coord", NewCoord>>({
        ...rest,
        coord: crd
      });
    }
  }
  sugiyama.coord = coord;

  function size(): null | [number, number];
  function size(sz: [number, number]): SugiyamaOperator<NodeType, Ops>;
  function size(
    sz?: [number, number] | null
  ): SugiyamaOperator<NodeType, Ops> | null | [number, number] {
    if (sz !== undefined) {
      return buildOperator({ ...options, size: sz });
    } else {
      return options.size;
    }
  }
  sugiyama.size = size;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz: NewNodeSize
  ): SugiyamaOperator<NodeType, Replace<Ops, "nodeSize", NewNodeSize>>;
  function nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz?: NewNodeSize
  ):
    | SugiyamaOperator<NodeType, Replace<Ops, "nodeSize", NewNodeSize>>
    | Ops["nodeSize"] {
    if (sz !== undefined) {
      const { nodeSize: _, ...rest } = options;
      return buildOperator<NodeType, Replace<Ops, "nodeSize", NewNodeSize>>({
        ...rest,
        nodeSize: sz
      });
    } else {
      return options.nodeSize;
    }
  }
  sugiyama.nodeSize = nodeSize;

  return sugiyama;
}

/** @internal */
function defaultNodeSize<NodeType extends DagNode>(
  node: NodeType | DummyNode
): [number, number] {
  const size = +!(node instanceof DummyNode);
  return [size, size];
}

/**
 * Construct a new {@link SugiyamaOperator} with the default settings.
 */
export function sugiyama<NodeType extends DagNode>(
  ...args: never[]
): SugiyamaOperator<
  NodeType,
  {
    layering: SimplexOperator<NodeType>;
    decross: TwoLayerOperator<NodeType, { order: MedianOperator<NodeType> }>;
    coord: QuadOperator<NodeType>;
    nodeSize: NodeSizeAccessor<NodeType>;
  }
> {
  if (args.length) {
    throw new Error(
      `got arguments to sugiyama(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator({
    layering: simplex(),
    decross: twoLayer(),
    coord: quad(),
    size: null,
    nodeSize: defaultNodeSize
  });
}
