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

import { CoordOperator, NodeSizeAccessor } from "./coord";
import { Dag, DagNode, LayoutChildLink } from "../dag/node";
import { QuadOperator, quad } from "./coord/quad";
import { Replace, assert, def, js } from "../utils";
import { SimplexOperator, simplex } from "./layering/simplex";
import { TwoLayerOperator, twoLayer } from "./decross/two-layer";

import { DecrossOperator } from "./decross";
import { DummyNode } from "./dummy";
import { LayeringOperator } from "./layering";
import { MedianOperator } from "./twolayer/median";
import { cachedNodeSize } from "./utils";

export interface SugiyamaInfo {
  width: number;
  height: number;
}

interface Operators<NodeDatum, LinkDatum> {
  layering: LayeringOperator<NodeDatum, LinkDatum>;
  decross: DecrossOperator<NodeDatum, LinkDatum>;
  coord: CoordOperator<NodeDatum, LinkDatum>;
  nodeSize: NodeSizeAccessor<NodeDatum, LinkDatum>;
}

/**
 * The operator used to layout a {@link Dag} using the sugiyama method.
 */
export interface SugiyamaOperator<
  NodeDatum = unknown,
  LinkDatum = unknown,
  Ops extends Operators<NodeDatum, LinkDatum> = Operators<NodeDatum, LinkDatum>
> {
  /**
   * Layout the {@link Dag} using the currently configured operator. The returned
   * DAG nodes will have added properties from {@link SugiyamaNode}. In addition,
   * each link will have points reset and assigned.
   */
  (dag: Dag<NodeDatum, LinkDatum>): SugiyamaInfo;

  /**
   * Set the {@link LayeringOperator}. See {@link "sugiyama/layering/index" |
   * layerings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link simplex}.
   */
  layering<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewLayering extends LayeringOperator<NewNodeDatum, NewLinkDatum>
  >(
    layer: NewLayering & LayeringOperator<NewNodeDatum, NewLinkDatum>
  ): SugiyamaOperator<
    NewNodeDatum,
    NewLinkDatum,
    Replace<Ops, "layering", NewLayering>
  >;
  /**
   * Get the current {@link LayeringOperator}.
   */
  layering(): Ops["layering"];

  /**
   * Set the {@link DecrossOperator}. See {@link "sugiyama/decross/index" |
   * decrossings} for more information about proper operators and a description
   * of the built in operators. The default value is {@link twoLayer}.
   */
  decross<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewDecross extends DecrossOperator<NewNodeDatum, NewLinkDatum>
  >(
    dec: NewDecross & DecrossOperator<NewNodeDatum, NewLinkDatum>
  ): SugiyamaOperator<
    NewNodeDatum,
    NewLinkDatum,
    Replace<Ops, "decross", NewDecross>
  >;
  /**
   * Get the current {@link DecrossOperator}.
   */
  decross(): Ops["decross"];

  /**
   * Set the {@link CoordOperator}. See {@link "sugiyama/coord/index" | coordinate
   * assignments} for more information about proper operators and a
   * description of the built in operators. The default value is {@link quad}.
   */
  coord<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewCoord extends CoordOperator<NewNodeDatum, NewLinkDatum>
  >(
    crd: NewCoord & CoordOperator<NewNodeDatum, NewLinkDatum>
  ): SugiyamaOperator<
    NewNodeDatum,
    NewLinkDatum,
    Replace<Ops, "coord", NewCoord>
  >;
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
  size(
    sz: readonly [number, number] | null
  ): SugiyamaOperator<NodeDatum, LinkDatum, Ops>;
  /**
   * Get the current layout size, which defaults to [1, 1]. The return value
   * will be null if the layout is {@link nodeSize}d.
   */
  size(): null | readonly [number, number];

  /**
   * Sets this sugiyama layout's {@link NodeSizeAccessor}. This accessor returns
   * the width and height of a node it's called on, and the node will then be
   * laidout to have at least that much of a gap between nodes.
   */
  nodeSize<
    NewNodeDatum extends NodeDatum,
    NewLinkDatum extends LinkDatum,
    NewNodeSize extends NodeSizeAccessor<NewNodeDatum, NewLinkDatum>
  >(
    sz: NewNodeSize & NodeSizeAccessor<NewNodeDatum, NewLinkDatum>
  ): SugiyamaOperator<
    NewNodeDatum,
    NewLinkDatum,
    Replace<Ops, "nodeSize", NewNodeSize>
  >;
  /**
   * Get the current {@link NodeSizeAccessor][, which defaults to returning [1, 1]
   * for normal nodes and [0, 1] for {@link DummyNodes}, casing edges to be treaded
   * as if they had no width.
   */
  nodeSize(): Ops["nodeSize"];
}

/** @internal */
function buildOperator<N, L, Ops extends Operators<N, L>>(
  options: Ops & {
    size: readonly [number, number] | null;
  }
): SugiyamaOperator<N, L, Ops> {
  function sugiyama(dag: Dag<N, L>): SugiyamaInfo {
    // compute layers
    options.layering(dag);

    // create layers
    const layers: (DagNode<N, L> | DummyNode)[][] = [];
    // NOTE copy here is explicit so that modifying the graph doesn't change how we iterate
    for (const node of [...dag]) {
      // add node to layer
      const nlayer = def(
        node.value,
        js`layering did not assign layer to node '${node}'`
      );
      assert(
        nlayer >= 0,
        js`layering assigned a negative layer (${nlayer}) to node '${node}'`
      );
      const layer = layers[nlayer] || (layers[nlayer] = []);
      layer.push(node);
      // add dummy nodes in place of children
      node.dataChildren = node.dataChildren.map((link) => {
        const clayer = def(link.child.value);
        assert(
          clayer > nlayer,
          js`layering left child node '${link.child}' (${clayer}) with a greater or equal layer to parent node '${node}' (${nlayer})`
        );
        // NOTE this cast breaks the type system, but sugiyama basically
        // needs to do that, so...
        let last = (link.child as unknown) as DummyNode;
        for (let l = clayer - 1; l > nlayer; l--) {
          const dummy = new DummyNode();
          dummy.dataChildren.push(new LayoutChildLink(last, undefined));
          (layers[l] || (layers[l] = [])).push(dummy);
          last = dummy;
        }
        // NOTE this cast breaks the type system, but sugiyama basically
        // needs to do that, so...
        return new LayoutChildLink(
          (last as unknown) as DagNode<N, L>,
          link.data
        );
      });
    }

    // assign y
    const nodeSize = cachedNodeSize(options.nodeSize);
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
    for (const node of layers.flatMap((l) => l)) {
      assert(
        node.x !== undefined,
        js`coord didn't assign an x to node '${node}'`
      );
      assert(
        node.x >= 0 && node.x <= width,
        `coord assgined an x (${node.x}) outside of [0, ${width}]`
      );
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

    // Remove dummy nodes and update edge data
    for (const node of dag) {
      /* istanbul ignore next */
      if (!(node instanceof DummyNode)) {
        node.dataChildren = node.dataChildren.map((link) => {
          assert(node.x !== undefined && node.y !== undefined);
          const points = [{ x: node.x, y: node.y }];
          let child = link.child;
          while (child instanceof DummyNode) {
            assert(child.x !== undefined && child.y !== undefined);
            points.push({ x: child.x, y: child.y });
            [child] = child.ichildren();
          }
          assert(child.x !== undefined && child.y !== undefined);
          points.push({ x: child.x, y: child.y });
          return new LayoutChildLink(child as DagNode<N, L>, link.data, points);
        });
      }
    }

    // layout info
    return { width, height };
  }

  function layering(): Ops["layering"];
  function layering<
    NN extends N,
    NL extends L,
    NewLayering extends LayeringOperator<NN, NL>
  >(
    layer: NewLayering
  ): SugiyamaOperator<NN, NL, Replace<Ops, "layering", NewLayering>>;
  function layering<
    NN extends N,
    NL extends L,
    NewLayering extends LayeringOperator<NN, NL>
  >(
    layer?: NewLayering
  ):
    | Ops["layering"]
    | SugiyamaOperator<NN, NL, Replace<Ops, "layering", NewLayering>> {
    if (layer === undefined) {
      return options.layering;
    } else {
      const { layering: _, ...rest } = options;
      return buildOperator<NN, NL, Replace<Ops, "layering", NewLayering>>({
        ...rest,
        layering: layer
      });
    }
  }
  sugiyama.layering = layering;

  function decross(): Ops["decross"];
  function decross<
    NN extends N,
    NL extends L,
    NewDecross extends DecrossOperator<NN, NL>
  >(
    dec: NewDecross
  ): SugiyamaOperator<NN, NL, Replace<Ops, "decross", NewDecross>>;
  function decross<
    NN extends N,
    NL extends L,
    NewDecross extends DecrossOperator<NN, NL>
  >(
    dec?: NewDecross
  ):
    | Ops["decross"]
    | SugiyamaOperator<NN, NL, Replace<Ops, "decross", NewDecross>> {
    if (dec === undefined) {
      return options.decross;
    } else {
      const { decross: _, ...rest } = options;
      return buildOperator<NN, NL, Replace<Ops, "decross", NewDecross>>({
        ...rest,
        decross: dec
      });
    }
  }
  sugiyama.decross = decross;

  function coord(): Ops["coord"];
  function coord<
    NN extends N,
    NL extends L,
    NewCoord extends CoordOperator<NN, NL>
  >(crd: NewCoord): SugiyamaOperator<NN, NL, Replace<Ops, "coord", NewCoord>>;
  function coord<
    NN extends N,
    NL extends L,
    NewCoord extends CoordOperator<NN, NL>
  >(
    crd?: NewCoord
  ): Ops["coord"] | SugiyamaOperator<NN, NL, Replace<Ops, "coord", NewCoord>> {
    if (crd === undefined) {
      return options.coord;
    } else {
      const { coord: _, ...rest } = options;
      return buildOperator<NN, NL, Replace<Ops, "coord", NewCoord>>({
        ...rest,
        coord: crd
      });
    }
  }
  sugiyama.coord = coord;

  function size(): null | readonly [number, number];
  function size(sz: readonly [number, number]): SugiyamaOperator<N, L, Ops>;
  function size(
    sz?: readonly [number, number] | null
  ): SugiyamaOperator<N, L, Ops> | null | readonly [number, number] {
    if (sz !== undefined) {
      return buildOperator({ ...options, size: sz });
    } else {
      return options.size;
    }
  }
  sugiyama.size = size;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<
    NN extends N,
    NL extends L,
    NewNodeSize extends NodeSizeAccessor<NN, NL>
  >(
    sz: NewNodeSize
  ): SugiyamaOperator<NN, NL, Replace<Ops, "nodeSize", NewNodeSize>>;
  function nodeSize<
    NN extends N,
    NL extends L,
    NewNodeSize extends NodeSizeAccessor<NN, NL>
  >(
    sz?: NewNodeSize
  ):
    | SugiyamaOperator<NN, NL, Replace<Ops, "nodeSize", NewNodeSize>>
    | Ops["nodeSize"] {
    if (sz !== undefined) {
      const { nodeSize: _, ...rest } = options;
      return buildOperator<NN, NL, Replace<Ops, "nodeSize", NewNodeSize>>({
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
function defaultNodeSize(node: DagNode): [number, number] {
  const size = +!(node instanceof DummyNode);
  return [size, size];
}

/**
 * Construct a new {@link SugiyamaOperator} with the default settings.
 */
export function sugiyama(
  ...args: never[]
): SugiyamaOperator<
  unknown,
  unknown,
  {
    layering: SimplexOperator;
    decross: TwoLayerOperator<unknown, unknown, MedianOperator>;
    coord: QuadOperator;
    nodeSize: NodeSizeAccessor;
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
