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
import { Operator as CoordOperator, HorizableNode, Separation } from "./coord";
import { LayerableNode, Operator as LayeringOperator } from "./layering";
import { SimplexOperator, simplex } from "./layering/simplex";
import { TwoLayerOperator, twoLayer } from "./decross/two-layer";
import { VertOperator, vert } from "./coord/vert";

import { Operator as DecrossOperator } from "./decross";
import { DummyNode } from "./dummy";
import { MedianOperator } from "./twolayer/median";

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

/**
 * The operator used to layout a [[Dag]] using the sugiyama method.
 */
export interface SugiyamaOperator<
  NodeType extends DagNode,
  Layering extends LayeringOperator<NodeType>,
  Decross extends DecrossOperator<NodeType>,
  Coord extends CoordOperator<NodeType>,
  NodeSized extends boolean,
  Sep extends Separation<NodeType>
> {
  /**
   * Layout the [[Dag]] using the currently configured operator. The returned
   * DAG nodes will have added properties from [[SugiyamaNode]]. In addition,
   * each link will have points reset and assigned.
   */
  (dag: NodeType): NodeType & SugiyamaNode;
  (dag: DagRoot<NodeType>): DagRoot<NodeType & SugiyamaNode>;
  (dag: Dag<NodeType>): Dag<NodeType & SugiyamaNode>;

  /**
   * Set the [[LayeringOperator]]. See [["sugiyama/layering/index" |
   * layerings]] for more information about proper operators and a description
   * of the built in operators. The default value is [[simplex]].
   */
  layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSized, Sep>;
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
  ): SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSized, Sep>;
  /**
   * Get the current [[DecrossOperator]].
   */
  decross(): Decross;

  /**
   * Set the [[CoordOperator]]. See [["sugiyama/coord/index" | coordinate
   * assignments]] for more information about proper operators and a
   * description of the built in operators. The default value is [[vert]].
   */
  coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSized, Sep>;
  /**
   * Get the current [[CoordOperator]].
   */
  coord(): Coord;

  /**
   * Sets the sugiyama layout's size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns this [[SugiyamaOperator]].  When
   * [[size]] is set, the minimum coordinate of every node is 0, and the
   * maximum *x* and *y* coordinates are *width* and *height* respectively. If
   * the DAG only has one node vertically or horizontally, it will be centered.
   */
  size(
    sz: [number, number]
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, false, Sep>;
  /**
   * Get the current layout size, which defaults to [1, 1]. The return value
   * will be null if the layout is [[nodeSize]]d.
   */
  size(): NodeSized extends true ? null : [number, number];

  /**
   * Sets this sugiyama layout's nodeSize to the specified two-element array of
   * numbers [ *nodeWidth*, *nodeHeight* ] and returns this
   * [[SugiyamaOperator]].  When [[nodeSize]] is set, the minimum coordinate of
   * every node is 0, parents and children are at least *nodeHeight* appart,
   * and neighboring nodes in the same layer are at least *nodeWidth* apart.
   * If the DAG only has one node vertically or horizontally, it will be
   * centered.
   */
  nodeSize(
    sz: [number, number]
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, true, Sep>;
  /**
   * Get the current layout nodeSize, which defaults to `null`. The return value
   * will be null if the layout is [[size]]d.
   */
  nodeSize(): NodeSized extends true ? [number, number] : null;

  /**
   * Sets the separation accessor to the specified [[Separation]] and returns this
   * [[SugiyamaOperator]].  The default separation accessor looks like:
   *
   * ```js
   * function separation(a, b) {
   *   return 1;
   * }
   * ```
   *
   * The separation accessor function takes two adjacent dag nodes and sets
   * their relative separation, thus any constant function will produce the
   * same results. Another other common setting is:
   *
   * ```js
   * function separation(a, b) {
   *   return +(a instanceof SugiDummyNode) + +(b instanceof SugiDummyNode);
   * }
   * ```
   *
   * which will wrap edges around nodes, but give them no spaceing themselves.
   */
  separation<NewSep extends Separation<NodeType>>(
    sep: NewSep
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, NewSep>;
  /**
   * Gets the current separation accessor.
   */
  separation(): Sep;

  /**
   * Sets sugiyama debug to *deb*. If debug is true, dummy nodes will be given
   * more human readable ids, but this can cause conflicts with poorly chosen
   * ids, so it it disabled by default.
   */
  debug(
    deb: boolean
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, Sep>;
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
  NodeSized extends boolean,
  Sep extends Separation<NodeType>
>(
  layeringOp: Layering,
  decrossOp: Decross,
  coordOp: Coord,
  nodeSized: NodeSized,
  sizeVals: [number, number],
  separationOp: Sep,
  debugVal: boolean
): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, Sep> {
  const [width, height] = sizeVals;

  function createLayers<N extends NodeType & LayeredNode>(
    dag: Dag<N>
  ): ((N & HorizableNode & VertableNode) | DummyNode)[][] {
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

  function sugiyama(dag: NodeType): NodeType & SugiyamaNode;
  function sugiyama(dag: DagRoot<NodeType>): DagRoot<NodeType & SugiyamaNode>;
  function sugiyama(dag: Dag<NodeType>): Dag<NodeType & SugiyamaNode>;
  function sugiyama(dag: Dag<NodeType>): Dag<NodeType & SugiyamaNode> {
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
    // assign y
    if (layers.length === 1) {
      const [layer] = layers;
      layer.forEach((n) => (n.y = height / 2));
    } else {
      const dh = nodeSized ? height : height / (layers.length - 1);
      layers.forEach((layer, i) => layer.forEach((n) => (n.y = dh * i)));
    }
    if (layers.every((l) => l.length === 1)) {
      // next steps aren't necessary
      layers.forEach(([n]) => (n.x = width / 2));
    } else {
      // minimize edge crossings
      decrossOp(layers);
      // assign coordinates
      coordOp(layers, separationOp);
      // scale x
      for (const layer of layers) {
        for (const node of layer) {
          if (node.x === undefined) {
            throw new Error(`coord didn't assign an x to node '${node.id}'`);
          }
        }
      }
      const exed = layers as (NodeType & SugiyamaNode)[][];
      const minGap = Math.min(
        ...exed
          .filter((layer) => layer.length > 1)
          .map((layer) =>
            Math.min(...layer.slice(1).map((n, i) => n.x - layer[i].x))
          )
      );
      const sw = nodeSized ? minGap : 1.0;
      for (const layer of exed) {
        for (const node of layer) {
          node.x *= width / sw;
        }
      }
    }
    // Remove dummy nodes and update edge data
    const sugied = dag as Dag<NodeType & SugiyamaNode>;
    removeDummies(sugied);
    return sugied;
  }

  function layering(): Layering;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer: NewLayering
  ): SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSized, Sep>;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    layer?: NewLayering
  ):
    | Layering
    | SugiyamaOperator<NodeType, NewLayering, Decross, Coord, NodeSized, Sep> {
    if (layer === undefined) {
      return layeringOp;
    } else {
      const localLayering = layer;
      return buildOperator<
        NodeType,
        NewLayering,
        Decross,
        Coord,
        NodeSized,
        Sep
      >(
        localLayering,
        decrossOp,
        coordOp,
        nodeSized,
        sizeVals,
        separationOp,
        debugVal
      );
    }
  }
  sugiyama.layering = layering;

  function decross(): Decross;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec: NewDecross
  ): SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSized, Sep>;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    dec?: NewDecross
  ):
    | Decross
    | SugiyamaOperator<NodeType, Layering, NewDecross, Coord, NodeSized, Sep> {
    if (dec === undefined) {
      return decrossOp;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        NewDecross,
        Coord,
        NodeSized,
        Sep
      >(layeringOp, dec, coordOp, nodeSized, sizeVals, separationOp, debugVal);
    }
  }
  sugiyama.decross = decross;

  function coord(): Coord;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd: NewCoord
  ): SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSized, Sep>;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    crd?: NewCoord
  ):
    | Coord
    | SugiyamaOperator<NodeType, Layering, Decross, NewCoord, NodeSized, Sep> {
    if (crd === undefined) {
      return coordOp;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        NewCoord,
        NodeSized,
        Sep
      >(
        layeringOp,
        decrossOp,
        crd,
        nodeSized,
        sizeVals,
        separationOp,
        debugVal
      );
    }
  }
  sugiyama.coord = coord;

  function size(): NodeSized extends true ? null : [number, number];
  function size(
    sz: [number, number]
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, false, Sep>;
  function size(
    sz?: [number, number]
  ):
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, false, Sep>
    | (NodeSized extends true ? null : [number, number]) {
    if (sz !== undefined) {
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        false,
        sz,
        separationOp,
        debugVal
      );
    } else if (nodeSized) {
      return null as NodeSized extends true ? null : [number, number];
    } else {
      return sizeVals as NodeSized extends true ? null : [number, number];
    }
  }
  sugiyama.size = size;

  function nodeSize(): NodeSized extends true ? [number, number] : null;
  function nodeSize(
    sz: [number, number]
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, true, Sep>;
  function nodeSize(
    sz?: [number, number]
  ):
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, true, Sep>
    | (NodeSized extends true ? [number, number] : null) {
    if (sz !== undefined) {
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        true,
        sz,
        separationOp,
        debugVal
      );
    } else if (nodeSized) {
      return sizeVals as NodeSized extends true ? [number, number] : null;
    } else {
      return null as NodeSized extends true ? [number, number] : null;
    }
  }
  sugiyama.nodeSize = nodeSize;

  function separation(): Sep;
  function separation<NewSep extends Separation<NodeType>>(
    sep: NewSep
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, NewSep>;
  function separation<NewSep extends Separation<NodeType>>(
    sep?: NewSep
  ):
    | Sep
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, NewSep> {
    if (sep === undefined) {
      return separationOp;
    } else {
      const localSep = sep;
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        nodeSized,
        sizeVals,
        localSep,
        debugVal
      );
    }
  }
  sugiyama.separation = separation;

  function debug(): boolean;
  function debug(
    deb: boolean
  ): SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, Sep>;
  function debug(
    deb?: boolean
  ):
    | boolean
    | SugiyamaOperator<NodeType, Layering, Decross, Coord, NodeSized, Sep> {
    if (deb === undefined) {
      return debugVal;
    } else {
      return buildOperator(
        layeringOp,
        decrossOp,
        coordOp,
        nodeSized,
        sizeVals,
        separationOp,
        deb
      );
    }
  }
  sugiyama.debug = debug;

  return sugiyama;
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
  VertOperator<NodeType>,
  false,
  Separation<NodeType>
> {
  if (args.length) {
    throw new Error(
      `got arguments to sugiyama(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(
    simplex(),
    twoLayer(),
    vert(),
    false,
    [1, 1],
    defaultSeparation,
    false
  );
}

/** @internal */
function defaultSeparation(): number {
  return 1;
}
