/**
 * A {@link Sugiyama} for computing a layered layout of a dag
 *
 * @packageDocumentation
 */
import { Graph, GraphNode } from "../graph";
import { LayoutResult, NodeSize } from "../layout";
import { Tweak } from "../tweaks";
import { err, U } from "../utils";
import { Coord } from "./coord";
import { coordSimplex, DefaultCoordSimplex } from "./coord/simplex";
import { Decross } from "./decross";
import { decrossTwoLayer, DefaultDecrossTwoLayer } from "./decross/two-layer";
import { Layering, layerSeparation } from "./layering";
import { DefaultLayeringSimplex, layeringSimplex } from "./layering/simplex";
import {
  sugify,
  SugiNode,
  sugiNodeLength,
  unsugify,
  validateCoord,
} from "./sugify";
import { NodeLength, sizedSeparation } from "./utils";

/** sugiyama operators */
export interface SugiyamaOps<in N = never, in L = never> {
  /** layering operator */
  layering: Layering<N, L>;
  /** decross operator */
  decross: Decross<N, L>;
  /** coord operator */
  coord: Coord<N, L>;
  /** node size operator */
  nodeSize: NodeSize<N, L>;
  /** tweaks */
  tweaks: readonly Tweak<N, L>[];
}

/** the typed graph input of a set of operators */
export type OpGraph<Op extends SugiyamaOps> = Op extends SugiyamaOps<
  infer N,
  infer L
>
  ? Graph<N, L>
  : never;

/**
 * The operator used to layout a {@link graph!Graph} using the sugiyama layered method.
 *
 * The algorithm is roughly comprised of three steps:
 * 1. {@link sugiyama/layering!Layering | layering} - in this step, every node is
 *    assigned a non-negative integer later such that children are guaranteed
 *    to have higher layers than their parents. (modified with {@link layering})
 * 2. {@link sugiyama/decross!Decross | decrossing} - in the step, nodes in each layer
 *    are reordered to minimize the number of crossings. (modified with {@link
 *    decross})
 * 3. {@link sugiyama/coord!Coord | coordinate assignment} - in the step, the
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
 *
 * <img alt="Sugiyama example" src="media://sugi-simplex-opt-quad.png" width="400">
 *
 * @remarks
 *
 * If one wants even more control over the algorithm, each step is broken down
 * in the source code and can be achieved by calling an exported utility
 * function. If one wants to call certain pieces incrementally, or adjust how
 * things are called, it's recommended to look at the source and call each
 * component function successively.
 *
 * @example
 *
 * ```typescript
 * const data = [["parent", "child"], ...];
 * const create = connect();
 * const dag = create(data);
 * const layout = sugiyama();
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   console.log(node.x, node.y);
 * }
 * ```
 *
 * @example
 *
 * This example highlights tweaking several aspects of dag rendering
 * ```typescript
 * const data = [["parent", "child"], ...];
 * const create = connect();
 * const dag = create(data);
 * const layout = sugiyama()
 *   .nodeSize(n => n === undefined ? [0, 0] : [n.data.id.length, 2])
 *   .coord(greedy());
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export interface Sugiyama<Ops extends SugiyamaOps = SugiyamaOps> {
  (dag: OpGraph<Ops>): LayoutResult;

  /**
   * Set the {@link sugiyama/layering!Layering}. (default: {@link sugiyama/layering/simplex!LayeringSimplex})
   */
  layering<NewLayering extends Layering>(
    layer: NewLayering
  ): Sugiyama<U<Ops, "layering", NewLayering>>;
  /**
   * Get the current {@link sugiyama/layering!Layering}.
   */
  layering(): Ops["layering"];

  /**
   * Set the {@link sugiyama/decross!Decross}. (default: {@link sugiyama/decross/two-layer!DecrossTwoLayer})
   */
  decross<NewDecross extends Decross>(
    dec: NewDecross
  ): Sugiyama<U<Ops, "decross", NewDecross>>;
  /**
   * Get the current {@link sugiyama/decross!Decross}.
   */
  decross(): Ops["decross"];

  /**
   * Set the {@link sugiyama/coord!Coord}. (default: {@link sugiyama/coord/simplex!CoordSimplex})
   */
  coord<NewCoord extends Coord>(
    crd: NewCoord
  ): Sugiyama<U<Ops, "coord", NewCoord>>;
  /**
   * Get the current {@link sugiyama/coord!Coord}.
   */
  coord(): Ops["coord"];

  /**
   * Set the tweaks to apply after layout
   */
  tweaks<NewTweaks extends readonly Tweak[]>(
    val: NewTweaks
  ): Sugiyama<U<Ops, "tweaks", NewTweaks>>;
  /**
   * Get the current {@link layout!Tweak}s.
   */
  tweaks(): Ops["tweaks"];

  /**
   * Sets the {@link NodeSizeAccessor}, which assigns how much space is
   * necessary between nodes.
   *
   * (default: [1, 1])
   */
  nodeSize<NewNodeSize extends NodeSize>(
    acc: NewNodeSize
  ): Sugiyama<U<Ops, "nodeSize", NewNodeSize>>;
  /** Get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * Set the gap size between nodes
   *
   * (default: [0, 0])
   */
  gap(val: readonly [number, number]): Sugiyama<Ops>;
  /** Get the current gap size */
  gap(): readonly [number, number];
}

/**
 * Verify, cache, and split the results of an {@link layout!NodeSize} into
 * an x and y {@link sugiyama/utils!NodeLength}.
 *
 * This allows you to split a {@link layout!NodeSize} into independent x and y
 * accessors, while also caching the result to prevent potentially expensive
 * computation from being duplicated.
 *
 * The only real reason to use this would be to run the steps of
 * {@link sugiyama} independently.
 */
export function cachedNodeSize<N, L>(
  nodeSize: NodeSize<N, L>
): readonly [NodeLength<N, L>, NodeLength<N, L>] {
  if (typeof nodeSize !== "function") {
    const [x, y] = nodeSize;
    return [() => x, () => y];
  } else {
    const cache = new Map<GraphNode<N, L>, readonly [number, number]>();

    const cached = (node: GraphNode<N, L>): readonly [number, number] => {
      let val = cache.get(node);
      if (val === undefined) {
        val = nodeSize(node);
        const [width, height] = val;
        if (width < 0 || height < 0) {
          throw err`all node sizes must be non-negative, but got width ${width} and height ${height} for node with data: ${node.data}; make sure the callback passed to \`sugiyama().nodeSize(...)\` is doing that`;
        }
        cache.set(node, val);
      }
      return val;
    };

    return [(node) => cached(node)[0], (node) => cached(node)[1]];
  }
}

/**
 * Given layers and node heights, assign y coordinates.
 *
 * This is only exported so that each step of {@link sugiyama} can be executed
 * independently or controlled. In the future it may make sense to make
 * vertical coordinates part of the sugiyama operators.
 */
export function coordVertical<N, L>(
  layers: readonly (readonly SugiNode<N, L>[])[],
  size: NodeLength<N, L>,
  gap: number
): number {
  let height = -gap;
  for (const layer of layers) {
    height += gap;
    const layerHeight = Math.max(
      0,
      ...layer.map(({ data }) => ("node" in data ? size(data.node) : 0))
    );
    for (const node of layer) {
      node.y = height + layerHeight / 2;
    }
    height += layerHeight;
  }
  if (height <= 0) {
    throw err`at least one node must have positive height, but total height was zero; make sure the callback passed to \`sugiyama().nodeSize(...)\` is doing that`;
  }
  return height;
}

function buildOperator<ON, OL, Ops extends SugiyamaOps<ON, OL>>(
  options: Ops & SugiyamaOps<ON, OL>,
  sizes: {
    gap: readonly [number, number];
  }
): Sugiyama<Ops> {
  function sugiyama<N extends ON, L extends OL>(
    dag: Graph<N, L>
  ): LayoutResult {
    // cache and split node sizes
    const [xLen, yLen] = cachedNodeSize(options.nodeSize);

    // separate gaps
    const [xGap, yGap] = sizes.gap;

    // compute layers
    const numLayers = options.layering(dag, layerSeparation);

    // create layers
    const layers = sugify(dag, numLayers + 1, options.layering);

    // assign y
    const height = coordVertical(layers, yLen, yGap);

    // minimize edge crossings
    options.decross(layers);

    // assign coordinates
    const xSep = sizedSeparation(sugiNodeLength(xLen), xGap);
    const width = options.coord(layers, xSep);
    validateCoord(layers, xSep, width, options.coord);

    // assign data back to original graph
    unsugify(layers);

    // apply any tweaks in order
    let res = { width, height };
    for (const tweak of options.tweaks) {
      res = tweak(dag, res);
    }

    // layout info
    return res;
  }

  function layering(): Ops["layering"];
  function layering<NL extends Layering>(
    layer: NL
  ): Sugiyama<U<Ops, "layering", NL>>;
  function layering<NL extends Layering>(
    layer?: NL
  ): Ops["layering"] | Sugiyama<U<Ops, "layering", NL>> {
    if (layer === undefined) {
      return options.layering;
    } else {
      const { layering: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          layering: layer,
        },
        sizes
      );
    }
  }
  sugiyama.layering = layering;

  function decross(): Ops["decross"];
  function decross<ND extends Decross>(
    dec: ND
  ): Sugiyama<U<Ops, "decross", ND>>;
  function decross<ND extends Decross>(
    dec?: ND
  ): Ops["decross"] | Sugiyama<U<Ops, "decross", ND>> {
    if (dec === undefined) {
      return options.decross;
    } else {
      const { decross: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          decross: dec,
        },
        sizes
      );
    }
  }
  sugiyama.decross = decross;

  function coord(): Ops["coord"];
  function coord<NC extends Coord>(crd: NC): Sugiyama<U<Ops, "coord", NC>>;
  function coord<NC extends Coord>(
    crd?: NC
  ): Ops["coord"] | Sugiyama<U<Ops, "coord", NC>> {
    if (crd === undefined) {
      return options.coord;
    } else {
      const { coord: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          coord: crd,
        },
        sizes
      );
    }
  }
  sugiyama.coord = coord;

  function tweaks(): Ops["tweaks"];
  function tweaks<NT extends readonly Tweak[]>(
    val: NT
  ): Sugiyama<U<Ops, "tweaks", NT>>;
  function tweaks<NT extends readonly Tweak[]>(
    val?: NT
  ): Ops["tweaks"] | Sugiyama<U<Ops, "tweaks", NT>> {
    if (val === undefined) {
      return options.tweaks;
    } else {
      const { tweaks: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          tweaks: val,
        },
        sizes
      );
    }
  }
  sugiyama.tweaks = tweaks;

  function nodeSize(): Ops["nodeSize"];
  function nodeSize<NNS extends NodeSize>(
    val: NNS
  ): Sugiyama<U<Ops, "nodeSize", NNS>>;
  function nodeSize<NNS extends NodeSize>(
    val?: NNS
  ): Sugiyama<U<Ops, "nodeSize", NNS>> | Ops["nodeSize"] {
    if (val === undefined) {
      return options.nodeSize;
    } else if (typeof val !== "function" && (val[0] <= 0 || val[1] <= 0)) {
      const [x, y] = val;
      throw err`constant nodeSize must be positive, but got: [${x}, ${y}]`;
    } else {
      const { nodeSize: _, ...rest } = options;
      return buildOperator(
        {
          ...rest,
          nodeSize: val,
        },
        sizes
      );
    }
  }
  sugiyama.nodeSize = nodeSize;

  function gap(): readonly [number, number];
  function gap(val: readonly [number, number]): Sugiyama<Ops>;
  function gap(
    val?: readonly [number, number]
  ): Sugiyama<Ops> | readonly [number, number] {
    if (val !== undefined) {
      const [width, height] = val;
      if (width < 0 || height < 0) {
        throw err`gap width (${width}) and height (${height}) must be non-negative`;
      }
      return buildOperator(options, { gap: val });
    } else {
      const [xgap, ygap] = sizes.gap;
      return [xgap, ygap];
    }
  }
  sugiyama.gap = gap;

  return sugiyama;
}

/** default sugiyama operator */
export type DefaultSugiyama = Sugiyama<{
  /** default layering */
  layering: DefaultLayeringSimplex;
  /** default decross */
  decross: DefaultDecrossTwoLayer;
  /** default coord */
  coord: DefaultCoordSimplex;
  /** default node size */
  nodeSize: readonly [1, 1];
  /** default tweaks */
  tweaks: readonly [];
}>;

/**
 * Construct a new {@link Sugiyama} with the default settings:
 *
 * - {@link Sugiyama#layering | `layering()`}: {@link sugiyama/layering/simplex!LayeringSimplex}
 * - {@link Sugiyama#decross | `decross()`}: {@link sugiyama/decross/two-layer!DecrossTwoLayer}
 * - {@link Sugiyama#coord | `coord()`}: {@link sugiyama/coord/simplex!CoordSimplex}
 * - {@link Sugiyama#nodeSize | `nodeSize()`}: [1, 1]
 * - {@link Sugiyama#gap | `gap()`}: [0, 0]
 *
 * @example
 * ```typescript
 * const dag = hierarchy()(...);
 * const layout = sugiyama().nodeSize(d => [d.width, d.height]);
 * layout(dag);
 * for (const node of dag) {
 *   console.log(node.x, node.y);
 * }
 * ```
 */
export function sugiyama(...args: never[]): DefaultSugiyama {
  if (args.length) {
    throw err`got arguments to sugiyama(${args}), but constructor takes no arguments; these were probably meant as data which should be called as \`sugiyama()(...)\``;
  } else {
    return buildOperator(
      {
        layering: layeringSimplex(),
        decross: decrossTwoLayer(),
        coord: coordSimplex(),
        nodeSize: [1, 1],
        tweaks: [] as const,
      },
      {
        gap: [0, 0],
      }
    );
  }
}
