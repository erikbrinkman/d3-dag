/**
 * This layout algorithm treats nodes not as points (i.e. producing x & y
 * coordinates) but as rectangles. An accessor is supplied to extract a
 * *heightRatio* from each node, specifying its height in comparison to other
 * nodes. The implementation was contributed by the author [L.
 * Arquint](https://linardarquint.com) and provides different algorithms to
 * distribute the nodes along the x-axis.
 *
 * In the following example, the default options were used and *node*.heightRatio was set to Number(*node*.id)+1:
 * <img alt="arquint example" src="media://arquint.png" width="400">
 *
 * @module
 */
import { ChildLink, Dag, DagNode, DagRoot, LayoutChildLink } from "../dag/node";
import { Operator as ColumnOperator, IndexableNode } from "./column";
import {
  ColumnSeparation,
  ColumnWidth,
  Operator as CoordOperator,
  IndexedNode,
  RectHorizableNode
} from "./coord";
import { ComplexOperator, complex } from "./column/complex";
import {
  LayerableNode,
  Operator as LayeringOperator
} from "../sugiyama/layering";
import {
  LongestPathOperator,
  longestPath
} from "../sugiyama/layering/longest-path";
import { SpreadOperator, spread } from "./coord/spread";
import { TwoLayerOperator, twoLayer } from "../sugiyama/decross/two-layer";
import { assert, def } from "../utils";

import { Operator as DecrossOperator } from "../sugiyama/decross";
import { DummyNode } from "../arquint/dummy";
import { MedianOperator } from "../sugiyama/twolayer/median";

/** The operator that gets a height ratio from a node. */
export interface HeightRatio<NodeType extends DagNode> {
  (node: NodeType | DummyNode): number;
}

/**
 * An inter layer accessor takes a layer and its index and returns the relative
 * distance to the previous layer. It is not called for the first layer,
 * because it does not have a previous layer.
 */
export interface LayerSeparation<NodeType extends DagNode> {
  (
    topLayer: (NodeType | DummyNode)[],
    bottomLayer: (NodeType | DummyNode)[],
    index: number
  ): number;
}

/** @internal */
interface LayeredNode {
  layer: number;
}

/** @internal */
interface RectVertableNode {
  y0?: number;
  y1?: number;
}

/**
 * The properties that are applied to a node after running {@link Operator}.
 */
export interface ArquintNode extends LayeredNode, IndexedNode {
  y0: number;
  y1: number;
  x0: number;
  x1: number;
}

export interface Operator<
  NodeType extends DagNode,
  Layering extends LayeringOperator<NodeType> = LayeringOperator<NodeType>,
  Decross extends DecrossOperator<NodeType> = DecrossOperator<NodeType>,
  Column extends ColumnOperator<NodeType> = ColumnOperator<NodeType>,
  Coord extends CoordOperator<NodeType> = CoordOperator<NodeType>,
  LayerSep extends LayerSeparation<NodeType> = LayerSeparation<NodeType>,
  ColWidth extends ColumnWidth = ColumnWidth,
  ColSep extends ColumnSeparation = ColumnSeparation,
  HeightRat extends HeightRatio<NodeType> = HeightRatio<NodeType>
> {
  /**
   * Lays out the specified DAG while respecting (vertical) *node*.heightRatio
   * together with (vertical) {@link LayerSeparation | inter layer separation},
   * (horizontal) {@link ColumnWidth | column width}, as well as (horizontal)
   * {@link ColumnSeparation | column separation}.
   */
  (dag: NodeType): NodeType & ArquintNode;
  (dag: DagRoot<NodeType>): DagRoot<NodeType & ArquintNode>;
  (dag: Dag<NodeType>): Dag<NodeType & ArquintNode>;

  /**
   * Sets this arquint layout's size to the specified two-element array of
   * numbers [ *width*, *height* ] and returns this {@link Operator}.
   */
  size(
    val: [number, number]
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /**
   * Gets the current layout size, which defaults to [1, 1].
   */
  size(): [number, number];

  /**
   * Sets the layering accessor to the specified function and returns this
   * {@link Operator}. This is the same as {@link "sugiyama/layering/index" | sugiyama's
   * layering operators}.
   */
  layering<NewLayering extends LayeringOperator<NodeType>>(
    newLayering: NewLayering
  ): Operator<
    NodeType,
    NewLayering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /**
   * Get the current layering operator, which defaults to
   * `longestPath().topDown(fase)`.
   */
  layering(): Layering;

  /**
   * Sets the decrossing accessor to the specified function and returns this
   * {@link Operator}. This is the same as {@link "sugiyama/decross/index" | sugiyama's
   * decrossing operators}.
   */
  decross<NewDecross extends DecrossOperator<NodeType>>(
    newDecross: NewDecross
  ): Operator<
    NodeType,
    Layering,
    NewDecross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /**
   * Get the current decross operator, which defaults to `towLayer()`.
   */
  decross(): Decross;

  /**
   * Set the {@link ColumnOperator}. See {@link "arquint/column/index" | column
   * asignments} for more information on column assignments and the built in
   * options.
   */
  column<NewColumn extends ColumnOperator<NodeType>>(
    newColumn: NewColumn
  ): Operator<
    NodeType,
    Layering,
    Decross,
    NewColumn,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /**
   * Get the current {@link ColumnOperator}, which defaults to `complex()`.
   */
  column(): Column;

  /**
   * Set the {@link CoordOperator}, which is distinct from sugiyama coordinate
   * assignment operators. See {@link "arquint/coord/index" | arquint coordinate
   * assignments} for more information and built in options.
   */
  coord<NewCoord extends CoordOperator<NodeType>>(
    newCoord: NewCoord
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    NewCoord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /**
   * Get the current coordinate accessor.
   */
  coord(): Coord;

  /**
   * Set the current {@link LayerSeparation} to the supplied function.
   */
  layerSeparation<NewSep extends LayerSeparation<NodeType>>(
    newSep: NewSep
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    NewSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  /** Get the current layer separation which defaults to the constant 1. */
  layerSeparation(): LayerSep;

  /**
   * Sets the {@link ColumnWidth} to the supplied function.
   */
  columnWidth<NewWidth extends ColumnWidth>(
    newWidth: NewWidth
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    NewWidth,
    ColSep,
    HeightRat
  >;
  /** Get the current column width. */
  columnWidth(): ColWidth;

  /**
   * Sets the {@link ColumnSeparation} to the supplied function.
   */
  columnSeparation<NewSep extends ColumnSeparation>(
    newSep: NewSep
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    NewSep,
    HeightRat
  >;
  /** Get the current column separation. */
  columnSeparation(): ColSep;
}

/** @internal */
type Writeable = RectVertableNode & RectHorizableNode & IndexableNode;

/** @internal */
function buildOperator<
  NodeType extends DagNode,
  Layering extends LayeringOperator<NodeType>,
  Decross extends DecrossOperator<NodeType>,
  Column extends ColumnOperator<NodeType>,
  Coord extends CoordOperator<NodeType>,
  LayerSep extends LayerSeparation<NodeType>,
  ColWidth extends ColumnWidth,
  ColSep extends ColumnSeparation,
  HeightRat extends HeightRatio<NodeType>
>(
  width: number,
  height: number,
  layeringOp: Layering,
  decrossOp: Decross,
  columnOp: Column,
  coordOp: Coord,
  layerSep: LayerSep,
  colWidth: ColWidth,
  colSep: ColSep,
  heightRatioOp: HeightRat
): Operator<
  NodeType,
  Layering,
  Decross,
  Column,
  Coord,
  LayerSep,
  ColWidth,
  ColSep,
  HeightRat
> {
  // TODO it'd be good to see this wrapped up in height somehow
  function getLongestPaths(dag: Dag<NodeType>): Map<NodeType, number> {
    const longestPaths = new Map<NodeType, number>();
    for (const node of dag.idescendants("after")) {
      const childPaths = Math.max(
        0,
        ...node.ichildren().map((child) => def(longestPaths.get(child)))
      );
      longestPaths.set(node, heightRatioOp(node) + childPaths);
    }
    return longestPaths;
  }

  // TODO it'd be good to see this wrapped up in depth somehow
  function getLongestPathsRoot(
    dag: Dag<NodeType | DummyNode>
  ): Map<NodeType | DummyNode, number> {
    const longestPaths = new Map<NodeType | DummyNode, number>();
    for (const node of dag.idescendants("before")) {
      const pathLength = (longestPaths.get(node) || 0) + heightRatioOp(node);
      longestPaths.set(node, pathLength);
      for (const child of node.ichildren()) {
        const childLength = Math.max(pathLength, longestPaths.get(child) || 0);
        longestPaths.set(child, childLength);
      }
    }
    return longestPaths;
  }

  // Takes a dag where nodes have a layer attribute, and adds dummy nodes so each
  // layer is adjacent and each path ends in the last layer, and returns an array of each layer of nodes.
  function createLayers<N extends NodeType & LayeredNode>(
    dag: Dag<N>
  ): ((N & Writeable) | DummyNode)[][] {
    const layers: ((N & Writeable) | DummyNode)[][] = [];
    const maxLayer = Math.max(...dag.idescendants().map((node) => node.layer));
    for (const node of dag) {
      const nlayer = node.layer;
      const layer = layers[nlayer] || (layers[nlayer] = []);
      layer.push(node);

      // add dummy nodes in place of children
      node.dataChildren = node.dataChildren.map((link) => {
        const clayer = link.child.layer;
        if (clayer <= nlayer) {
          throw new Error(
            `layering left child node "${link.child}" (${clayer}) ` +
              `with a greater or equal layer to parent node "${node.data}" (${nlayer})`
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

      if (node.dataChildren.length === 0 && nlayer < maxLayer) {
        // insert a dummy node per layer
        let last = new DummyNode();
        (layers[maxLayer] || (layers[maxLayer] = [])).push(last);
        for (let l = maxLayer - 1; l > node.layer; l--) {
          const dummy = new DummyNode();
          dummy.dataChildren.push(new LayoutChildLink(last, undefined));
          (layers[l] || (layers[l] = [])).push(dummy);
          last = dummy;
        }
        node.dataChildren = [new LayoutChildLink(last, undefined)] as ChildLink<
          unknown,
          N
        >[];
      }
    }
    return layers;
  }

  function scale<N extends NodeType & ArquintNode>(
    dag: Dag<N>,
    totalPathLength: number
  ): void {
    for (const node of dag) {
      node.x0 *= width;
      node.x1 *= width;
      node.y0 *= height / totalPathLength;
      node.y1 *= height / totalPathLength;
    }
  }

  function removeDummies<N extends NodeType & ArquintNode>(dag: Dag<N>): void {
    for (const node of dag) {
      /* istanbul ignore next */
      if (!(node instanceof DummyNode)) {
        const newDataChildren: ChildLink<unknown, N>[] = [];
        for (const link of node.dataChildren) {
          let child = link.child;
          const points = [{ x: (node.x0 + node.x1) / 2, y: node.y1 }];
          while (child !== undefined && child instanceof DummyNode) {
            // dummies have height 0, so it should not matter whether
            // getCenterTop or getCenterBottom is used
            points.push({ x: (child.x0 + child.x1) / 2, y: child.y0 });
            [child] = child.ichildren();
          }
          if (child !== undefined) {
            points.push({ x: (child.x0 + child.x1) / 2, y: child.y0 });
            const newLink = new LayoutChildLink(
              child,
              link.data,
              points
            ) as ChildLink<unknown, N>;
            newDataChildren.push(newLink);
          }
        }
        node.dataChildren = newDataChildren;
      }
    }
  }

  function arquintCall(dag: NodeType): NodeType & ArquintNode;
  function arquintCall(dag: DagRoot<NodeType>): DagRoot<NodeType & ArquintNode>;
  function arquintCall(dag: Dag<NodeType>): Dag<NodeType & ArquintNode>;
  function arquintCall(dag: Dag<NodeType>): Dag<NodeType & ArquintNode> {
    const longestPaths = getLongestPaths(dag);
    // compute layers
    layeringOp(dag);
    // verify layering
    for (const node of dag) {
      const layer = (node as LayerableNode).layer;
      if (layer === undefined) {
        throw new Error(`layering did not assign layer to node '${node.data}'`);
      } else if (layer < 0) {
        throw new Error(
          `layering assigned a negative layer (${layer}) to node '${node.data}'`
        );
      }
    }
    const layers = createLayers(dag as Dag<NodeType & LayeredNode>);

    // assign y
    let totalPathLength;
    if (layers.length === 1) {
      const [layer] = layers;
      for (const node of layer) {
        node.y0 = 0;
        node.y1 = 1;
      }
      totalPathLength = 1;
    } else {
      const longestToRoot = getLongestPathsRoot(dag);
      let last = layers[0];
      const maxPathLength = Math.max(
        ...last.map((node) => {
          assert(!(node instanceof DummyNode));
          return def(longestPaths.get(node));
        })
      );
      for (const node of last) {
        const y1 = (node.y1 = def(longestToRoot.get(node)));
        node.y0 = y1 - heightRatioOp(node);
      }
      totalPathLength = 0;
      for (const [i, layer] of layers.slice(1).entries()) {
        totalPathLength += layerSep(last, layer, i);
        for (const node of layer) {
          const y1 = (node.y1 = totalPathLength + def(longestToRoot.get(node)));
          node.y0 = y1 - heightRatioOp(node);
        }
        last = layer;
      }
      totalPathLength += maxPathLength;
    }

    // minimize edge crossings
    decrossOp(layers);
    // assign an index to each node indicating the "column" in which it should be placed
    columnOp(layers);
    // verify indexing
    for (const layer of layers) {
      for (const node of layer) {
        if (node.columnIndex === undefined) {
          throw new Error(
            `column did not assign an index to node '${node.data}'`
          );
        } else if (node.columnIndex < 0) {
          throw new Error(
            `column assigned a negative index (${node.columnIndex}) to node '${node.data}'`
          );
        }
      }
    }
    // assign coordinates
    coordOp(
      layers as (
        | (NodeType & RectHorizableNode & IndexedNode)
        | (DummyNode & IndexedNode)
      )[][],
      colWidth,
      colSep
    );
    // verify xes
    for (const layer of layers) {
      for (const node of layer) {
        if (node.x0 === undefined || node.x1 === undefined) {
          throw new Error(
            `coord did not assign both x coordinates to node '${node.data}'`
          );
        } else if (node.x0 > node.x1) {
          throw new Error(
            `coord did not assign valid x coordinates to node '${node.data}'`
          );
        }
      }
    }
    const finished = dag as Dag<NodeType & ArquintNode>;
    // scale x and y
    scale(finished, totalPathLength);
    // remove dummy nodes and update edge data
    removeDummies(finished);

    return finished;
  }

  function size(): [number, number];
  function size(
    val: [number, number]
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function size(
    val?: [number, number]
  ):
    | [number, number]
    | Operator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (val === undefined) {
      return [width, height];
    } else {
      const [newWidth, newHeight] = val;
      return buildOperator(
        newWidth,
        newHeight,
        layeringOp,
        decrossOp,
        columnOp,
        coordOp,
        layerSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.size = size;

  function layering(): Layering;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    newLayering: NewLayering
  ): Operator<
    NodeType,
    NewLayering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function layering<NewLayering extends LayeringOperator<NodeType>>(
    newLayering?: NewLayering
  ):
    | Layering
    | Operator<
        NodeType,
        NewLayering,
        Decross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (newLayering === undefined) {
      return layeringOp;
    } else {
      return buildOperator<
        NodeType,
        NewLayering,
        Decross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        newLayering,
        decrossOp,
        columnOp,
        coordOp,
        layerSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.layering = layering;

  function decross(): Decross;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    newDecross: NewDecross
  ): Operator<
    NodeType,
    Layering,
    NewDecross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function decross<NewDecross extends DecrossOperator<NodeType>>(
    newDecross?: NewDecross
  ):
    | Decross
    | Operator<
        NodeType,
        Layering,
        NewDecross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (newDecross === undefined) {
      return decrossOp;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        NewDecross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        newDecross,
        columnOp,
        coordOp,
        layerSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.decross = decross;

  function column(): Column;
  function column<NewColumn extends ColumnOperator<NodeType>>(
    newColumn: NewColumn
  ): Operator<
    NodeType,
    Layering,
    Decross,
    NewColumn,
    Coord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function column<NewColumn extends ColumnOperator<NodeType>>(
    newColumn?: NewColumn
  ):
    | Column
    | Operator<
        NodeType,
        Layering,
        Decross,
        NewColumn,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (newColumn === undefined) {
      return columnOp;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        NewColumn,
        Coord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        decrossOp,
        newColumn,
        coordOp,
        layerSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.column = column;

  function coord(): Coord;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    newCoord: NewCoord
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    NewCoord,
    LayerSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function coord<NewCoord extends CoordOperator<NodeType>>(
    newCoord?: NewCoord
  ):
    | Coord
    | Operator<
        NodeType,
        Layering,
        Decross,
        Column,
        NewCoord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (newCoord === undefined) {
      return coordOp;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        Column,
        NewCoord,
        LayerSep,
        ColWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        decrossOp,
        columnOp,
        newCoord,
        layerSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.coord = coord;

  function layerSeparation(): LayerSep;
  function layerSeparation<NewSep extends LayerSeparation<NodeType>>(
    newSep: NewSep
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    NewSep,
    ColWidth,
    ColSep,
    HeightRat
  >;
  function layerSeparation<NewSep extends LayerSeparation<NodeType>>(
    newSep?: NewSep
  ):
    | LayerSep
    | Operator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        NewSep,
        ColWidth,
        ColSep,
        HeightRat
      > {
    if (newSep === undefined) {
      return layerSep;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        NewSep,
        ColWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        decrossOp,
        columnOp,
        coordOp,
        newSep,
        colWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.layerSeparation = layerSeparation;

  function columnWidth(): ColWidth;
  function columnWidth<NewWidth extends ColumnWidth>(
    newWidth: NewWidth
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    NewWidth,
    ColSep,
    HeightRat
  >;
  function columnWidth<NewWidth extends ColumnWidth>(
    newWidth?: NewWidth
  ):
    | ColWidth
    | Operator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        LayerSep,
        NewWidth,
        ColSep,
        HeightRat
      > {
    if (newWidth === undefined) {
      return colWidth;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        LayerSep,
        NewWidth,
        ColSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        decrossOp,
        columnOp,
        coordOp,
        layerSep,
        newWidth,
        colSep,
        heightRatioOp
      );
    }
  }
  arquintCall.columnWidth = columnWidth;

  function columnSeparation(): ColSep;
  function columnSeparation<NewSep extends ColumnSeparation>(
    newSep: NewSep
  ): Operator<
    NodeType,
    Layering,
    Decross,
    Column,
    Coord,
    LayerSep,
    ColWidth,
    NewSep,
    HeightRat
  >;
  function columnSeparation<NewSep extends ColumnSeparation>(
    newSep?: NewSep
  ):
    | ColSep
    | Operator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        NewSep,
        HeightRat
      > {
    if (newSep === undefined) {
      return colSep;
    } else {
      return buildOperator<
        NodeType,
        Layering,
        Decross,
        Column,
        Coord,
        LayerSep,
        ColWidth,
        NewSep,
        HeightRat
      >(
        width,
        height,
        layeringOp,
        decrossOp,
        columnOp,
        coordOp,
        layerSep,
        colWidth,
        newSep,
        heightRatioOp
      );
    }
  }
  arquintCall.columnSeparation = columnSeparation;

  return arquintCall;
}

/** @internal */
function defaultLayerSeparation(): number {
  return 1;
}

/** @internal */
function defaultColumnWidth(): number {
  return 10;
}

/** @internal */
function defaultColumnSeparation(): number {
  return 1;
}

/** @internal */
interface HasHeightRatio {
  heightRatio?: number;
}

/** @internal */
function hasHeightRatio<NodeType extends DagNode>(
  node: NodeType
): node is HasHeightRatio & NodeType {
  const heightRatio = (node as HasHeightRatio).heightRatio;
  return heightRatio === undefined || typeof heightRatio === "number";
}

/** @internal */
function defaultHeightRatio<NodeType extends DagNode>(
  node: NodeType | DummyNode
) {
  if (node instanceof DummyNode) {
    return 0;
  } else if (hasHeightRatio(node)) {
    return node.heightRatio || 0;
  } else {
    throw new Error(
      `default height ratio expects node with heightRatio property but got nothing`
    );
  }
}

/**
 * Construct a new Arquint layout operator with the default settings.
 */
export function arquint<NodeType extends DagNode>(
  ...args: never[]
): Operator<
  NodeType,
  LongestPathOperator<NodeType>,
  TwoLayerOperator<NodeType, { order: MedianOperator }>,
  ComplexOperator<NodeType>,
  SpreadOperator<NodeType>
> {
  if (args.length) {
    throw new Error(
      `got arguments to arquint(${args}), but constructor takes no aruguments.`
    );
  }
  return buildOperator(
    1,
    1,
    longestPath().topDown(false),
    twoLayer(),
    complex(),
    spread(),
    defaultLayerSeparation,
    defaultColumnWidth,
    defaultColumnSeparation,
    defaultHeightRatio
  );
}
