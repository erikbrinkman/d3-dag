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
 * The method [[sugiyama]] is used to create a new [[SugiyamaOperator]]. This
 * can be customized with all of the methods available, but in particular the
 * method is broken down into three steps:
 * 1. [["sugiyama/layering/index" | layering]] - in this step, every node is
 *    assigned an integer later such that children are guaranteed to have
 *    higher layers than their parents.
 * 2. [["sugiyama/decross/index" | decrossing]] - in the step, nodes in each
 *    layer are reordered to minimize the number of crossings.
 * 3. [["sugiyama/coord/index" | coordinate assignment]] - in the step, the
 *    nodes are assigned x and y coordinates that respect their layer, and
 *    layer ordering.
 *
 * @packageDocumentation
 */

import { ChildLink, Dag, DagNode, DagRoot, LayoutChildLink } from "../dag/node";
import {
  Operator as CoordOperator,
  HorizableNode,
  NodeSizeAccessor
} from "./coord";
import { LayerableNode, Operator as LayeringOperator } from "./layering";
import { QuadOperator, quad } from "./coord/quad";
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
 * The added attributes to the [[Dag]] once the [[SugiyamaOperator]] is called.
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

/**
 * The operator used to layout a [[Dag]] using the sugiyama method.
 */
export interface SugiyamaOperator<
  NodeType extends DagNode,
  Layering extends LayeringOperator<NodeType> = LayeringOperator<NodeType>,
  Decross extends DecrossOperator<NodeType> = DecrossOperator<NodeType>,
  Coord extends CoordOperator<NodeType> = CoordOperator<NodeType>,
  NodeSize extends NodeSizeAccessor<NodeType> = NodeSizeAccessor<NodeType>
> {
  /**
   * Layout the [[Dag]] using the currently configured operator. The returned
   * DAG nodes will have added properties from [[SugiyamaNode]]. In addition,
   * each link will have points reset and assigned.
   */
  (dag: NodeType): SugiyamaLayout<NodeType & SugiyamaNode>;
  (dag: DagRoot<NodeType>): SugiyamaLayout<DagRoot<NodeType & SugiyamaNode>>;
  (dag: Dag<NodeType>): SugiyamaLayout<Dag<NodeType & SugiyamaNode>>;

  /**
   * Set the [[LayeringOperator]]. See [["sugiyama/layering/index" |
   * layerings]] for more information about proper operators and a description
   * of the built in operators. The default value is [[simplex]].
   */
  layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSize>;
  /**
   * Get the current [[LayeringOperator]].
   */
  layering(): Layering;

  /**
   * Set the [[DecrossOperator]]. See [["sugiyama/decross/index" |
   * decrossings]] for more information about proper operators and a description
   * of the built in operators. The default value is [[twoLayer]].
   */
  decross<NewDecross extends DecrossOperator<NodeType>>(
    dec: NewDecross
  ): SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSize>;
  /**
   * Get the current [[DecrossOperator]].
   */
  decross(): Decross;

  /**
   * Set the [[CoordOperator]]. See [["sugiyama/coord/index" | coordinate
   * assignments]] for more information about proper operators and a
   * description of the built in operators. The default value is [[quad]].
   */
  coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSize>;
  /**
   * Get the current [[CoordOperator]].
   */
  coord(): Coord;

  /**
   * Sets the sugiyama layout's size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns this [[SugiyamaOperator]].  When
   * [[size]] is non-null the dag will be shrunk or expanded to fit in the
   * size, keeping all distances proportional. If it's null, the nodeSize
   * parameters will be respected as coordinate sizes.
   */
  size(
    sz: [number, number] | null
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize>;
  /**
   * Get the current layout size, which defaults to [1, 1]. The return value
   * will be null if the layout is [[nodeSize]]d.
   */
  size(): null | [number, number];

  /**
   * Sets this sugiyama layout's [[NodeSizeAccessor]]. This accessor returns
   * the width and height of a node it's called on, and the node will then be
   * laidout to have at least that much of a gap between nodes.
   */
  nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz: NewNodeSize
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NewNodeSize>;
  /**
   * Get the current [[NodeSizeAccessor][, which defaults to returning [1, 1]
   * for normal nodes and [0, 1] for [[DummyNodes]], casing edges to be treaded
   * as if they had no width.
   */
  nodeSize(): NodeSize;

  /**
   * Sets sugiyama debug to *deb*. If debug is true, dummy nodes will be given
   * more human readable ids, but this can cause conflicts with poorly chosen
   * ids, so it it disabled by default.
   */
  debug(
    deb: boolean
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize>;
  /**
   * Gets the current debug value.
   */
  debug(): boolean;
}

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Layering extends LayeringOperator<NodeType>,
  Decross extends DecrossOperator<NodeType>,
  Coord extends CoordOperator<NodeType>,
  NodeSize extends NodeSizeAccessor<NodeType>
>(
  layeringOp: Layering,
  decrossOp: Decross,
  coordOp: Coord,
  sizeVal: [number, number] | null,
  nodeSizeAcc: NodeSize,
  debugVal: boolean
): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize> {
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
            `layering left child node "${link.child.id}" (${clayer}) ` +
              `with a greater or equal layer to parent node "${node.id}" (${nlayer})`
          );
        }
        // NOTE this cast breaks the type system, but sugiyama basically
        // needs to do that, so...
        let last = link.child as DummyNode;
        for (let l = clayer - 1; l > nlayer; l--) {
          let dummyId: string;
          if (debugVal) {
            dummyId = `${node.id}->${link.child.id} (${l})`;
          } else {
            dummyId = `${node.id}\0${link.child.id}\0${l}`;
          }
          const dummy = new DummyNode(dummyId);
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
    layeringOp(dag);
    // create layers
    for (const node of dag) {
      const layer = (node as LayerableNode).layer;
      if (layer === undefined) {
        throw new Error(`layering did not assign layer to node '${node.id}'`);
      } else if (layer < 0) {
        throw new Error(
          `layering assigned a negative layer (${layer}) to node '${node.id}'`
        );
      }
    }
    const layers = createLayers(dag as Dag<NodeType & LayeredNode>);
    const nodeSize = cachedNodeSize<NodeType>(nodeSizeAcc);

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
    decrossOp(layers);

    // assign coordinates
    let width = coordOp(layers, nodeSize);

    // scale x
    for (const layer of layers) {
      for (const node of layer) {
        if (node.x === undefined) {
          throw new Error(`coord didn't assign an x to node '${node.id}'`);
        } else if (node.x < 0 || node.x > width) {
          throw new Error(
            `coord assgined an x (${node.x}) outside of [0, ${width}]`
          );
        }
      }
    }
    const exed = layers as (NodeType & SugiyamaNode)[][];
    if (sizeVal !== null) {
      const [newWidth, newHeight] = sizeVal;
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

  function layering(): Layering;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSize>;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer?: NewLayering
  ):
    | Layering
    | SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSize> {
    if (layer === undefined) {
      return layeringOp;
    } else {
      const localLayering = layer;
      return buildOperator<NodeType, NewLayering, Decross, Coord, NodeSize>(
        localLayering,
        decrossOp,
        coordOp,
        sizeVal,
        nodeSizeAcc,
        debugVal
      );
    }
  }
  sugiyama.layering = layering;

  function decross(): Decross;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec: NewDecross
  ): SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSize>;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec?: NewDecross
  ):
    | Decross
    | SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSize> {
    if (dec === undefined) {
      return decrossOp;
    } else {
      return buildOperator<NodeType, Layering, NewDecross, Coord, NodeSize>(
        layeringOp,
        dec,
        coordOp,
        sizeVal,
        nodeSizeAcc,
        debugVal
      );
    }
  }
  sugiyama.decross = decross;

  function coord(): Coord;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSize>;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd?: NewCoord
  ): Coord | SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSize> {
    if (crd === undefined) {
      return coordOp;
    } else {
      return buildOperator<NodeType, Layering, Decross, NewCoord, NodeSize>(
        layeringOp,
        decrossOp,
        crd,
        sizeVal,
        nodeSizeAcc,
        debugVal
      );
    }
  }
  sugiyama.coord = coord;

  function size(): null | [number, number];
  function size(
    sz: [number, number]
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize>;
  function size(
    sz?: [number, number] | null
  ):
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize>
    | null
    | [number, number] {
    if (sz !== undefined) {
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        sz,
        nodeSizeAcc,
        debugVal
      );
    } else {
      return sizeVal;
    }
  }
  sugiyama.size = size;

  function nodeSize(): NodeSize;
  function nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz: NewNodeSize
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NewNodeSize>;
  function nodeSize<NewNodeSize extends NodeSizeAccessor<NodeType>>(
    sz?: NewNodeSize
  ):
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, NewNodeSize>
    | NodeSize {
    if (sz !== undefined) {
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        sizeVal,
        sz,
        debugVal
      );
    } else {
      return nodeSizeAcc;
    }
  }
  sugiyama.nodeSize = nodeSize;

  function debug(): boolean;
  function debug(
    deb: boolean
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize>;
  function debug(
    deb?: boolean
  ): boolean | SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSize> {
    if (deb === undefined) {
      return debugVal;
    } else {
      return buildOperator<NodeType, Layering, Decross, Coord, NodeSize>(
        layeringOp,
        decrossOp,
        coordOp,
        sizeVal,
        nodeSizeAcc,
        deb
      );
    }
  }
  sugiyama.debug = debug;

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
 * Construct a new [[SugiyamaOperator]] with the default settings.
 */
export function sugiyama<NodeType extends DagNode>(
  ...args: never[]
): SugiyamaOperator<
  NodeType,
  SimplexOperator<NodeType>,
  TwoLayerOperator<NodeType, MedianOperator<NodeType>>,
  QuadOperator<NodeType>,
  NodeSizeAccessor<NodeType>
> {
  if (args.length) {
    throw new Error(
      `got arguments to sugiyama(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(
    simplex(),
    twoLayer(),
    quad(),
    null,
    defaultNodeSize,
    false
  );
}
