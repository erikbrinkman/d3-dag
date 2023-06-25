/**
 * A {@link Sugiyama} for computing a layered layout of a dag
 *
 * @packageDocumentation
 */
import { Graph } from "../graph";
import {
  LayoutResult,
  NodeSize,
  cachedNodeSize,
  splitNodeSize,
} from "../layout";
import { Tweak } from "../tweaks";
import { U, err } from "../utils";
import { Coord } from "./coord";
import { DefaultCoordSimplex, coordSimplex } from "./coord/simplex";
import { Decross } from "./decross";
import { DefaultDecrossTwoLayer, decrossTwoLayer } from "./decross/two-layer";
import { Layering, layerSeparation } from "./layering";
import { DefaultLayeringSimplex, layeringSimplex } from "./layering/simplex";
import { sugiNodeLength, sugifyLayer, unsugify, validateCoord } from "./sugify";
import { sizedSeparation } from "./utils";

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

/**
 * the operator used to layout a {@link Graph} using the sugiyama layered method
 *
 * The algorithm is roughly comprised of three steps:
 * 1. {@link Layering} - in this step, every node is assigned a non-negative
 *    integer later such that children are guaranteed to have higher layers
 *    than their parents. (modified with {@link layering})
 * 2. {@link Decross} - in the step, nodes in each layer are reordered to
 *     minimize the number of crossings. (modified with {@link decross})
 * 3. {@link Coord} - in the step, the nodes are assigned x and y coordinates
 *    that respect their layer, layer ordering, and size. (modified with
 *    {@link coord} and {@link nodeSize})
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
 * @remarks
 *
 * If one wants even more control over the algorithm, each step is broken down
 * in the source code and can be achieved by calling an exported utility
 * function. If one wants to call certain pieces incrementally, or adjust how
 * things are called, it's recommended to look at the source and call each
 * component function successively.
 */
export interface Sugiyama<Ops extends SugiyamaOps = SugiyamaOps> {
  (
    dag: Ops extends SugiyamaOps<infer N, infer L> ? Graph<N, L> : never
  ): LayoutResult;

  /**
   * set the {@link Layering} operator
   *
   * The layering operator takes the graph, and assigns each node layer that
   * respects
   *
   * There are three built-in layering operators:
   * - {@link layeringSimplex} - This minimizes the overall length of edges,
   *   and is reasonably fast for most graphs. Minimizing edges also tends to
   *   make the next steps faster.
   * - {@link layeringLongestPath} - This minimizes the height of the overall
   *   graph.
   * - {@link layeringTopological} - This creates a topological ordering, which
   *   inherently minimizes the width of the graph, but will only produce good
   *   layouts with other topological operators.
   *
   * You can also supply any function that satisfies the {@link Layering}
   * interface. See that documentation for more information about implementing
   * your own layering operator.
   *
   * (default: {@link layeringSimplex})
   *
   * @example
   *
   * ```ts
   * const layout = sugiyama().layering(layeringLongestPath());
   * ```
   */
  layering<NewLayering extends Layering>(
    layer: NewLayering
  ): Sugiyama<U<Ops, "layering", NewLayering>>;
  /**
   * get the current {@link Layering}.
   */
  layering(): Ops["layering"];

  /**
   * set the {@link Decross} operator
   *
   * The decross operator takes a layered graph with extra nodes for long
   * paths, and reorders nodes along a layer to minimize the number of edge
   * crossings (or other desired properties).
   *
   * There are three built-in decrossing operators:
   * - {@link decrossOpt} - This optimally minimizes edge crossings, but due to
   *   the complex nature of the task, only works for reasonably small graphs.
   * - {@link decrossTwoLayer} - This is a heuristic method for decrossing
   *   minimization that tries to strike a balance between a small number of
   *   edge crossings, and reasonable running time.
   * - {@link decrossDfs} - This is a very cheap decrossing operator that
   *   orders nodes via a depth first search. It's mostly used for
   *   {@link DecrossTwoLayer#inits} of the two-layer operator.
   *
   * You can also supply any function that satisfies the {@link Decross}
   * interface. See that documentation for more information about implementing
   * your own decrossing operator.
   *
   * (default: {@link decrossTwoLayer})
   *
   * @example
   *
   * ```ts
   * const layout = sugiyama().decross(decrossOpt());
   * ```
   */
  decross<NewDecross extends Decross>(
    dec: NewDecross
  ): Sugiyama<U<Ops, "decross", NewDecross>>;
  /**
   * get the current {@link Decross}.
   */
  decross(): Ops["decross"];

  /**
   * set the {@link Coord} operator
   *
   * The final stage is coordinate assignment, which takes a layered graph with
   * nodes in the correct order, and assigns them x coordinates.
   *
   * There are four built-in coordinate assignment operators:
   * - {@link coordSimplex} - This assigns x coordinates based on a simplex
   *   minimization that tries to produce long vertical edges. It usually
   *   produces attractive layouts in a reasonable amount of time.
   * - {@link coordQuad} - This uses a quadratic optimization that tries to
   *   minimize the curvature of lines, but usually produces worse layouts
   *   than the simplex variant.
   * - {@link coordGreedy} - If either of the above methods take too long, this
   *   uses a heuristic to assign x coordinates meaning it will run more
   *   quickly, but usually produce slightly worse layouts.
   * - {@link coordTopological} - This is a coordinate assignment tailored for
   * a {@link layeringTopological | topological layout}. It can use a
   *   simplex or quadratic optimization to create a topological layout.
   *
   * You can also supply any function that satisfies the {@link Coord}
   * interface. See that documentation for more information about implementing
   * your own coordinate assignment operator.
   *
   * (default: {@link coordSimplex})
   *
   * @example
   *
   * ```ts
   * const layout = sugiyama().coord(coordQuad());
   * ```
   */
  coord<NewCoord extends Coord>(
    crd: NewCoord
  ): Sugiyama<U<Ops, "coord", NewCoord>>;
  /**
   * get the current {@link Coord}.
   */
  coord(): Ops["coord"];

  /**
   * set the {@link Tweak}s to apply after layout
   */
  tweaks<const NewTweaks extends readonly Tweak[]>(
    val: NewTweaks
  ): Sugiyama<U<Ops, "tweaks", NewTweaks>>;
  /**
   * get the current {@link Tweak}s.
   */
  tweaks(): Ops["tweaks"];

  /**
   * sets the {@link NodeSize}
   *
   * (default: `[1, 1]`)
   */
  nodeSize<NewNodeSize extends NodeSize>(
    acc: NewNodeSize
  ): Sugiyama<U<Ops, "nodeSize", NewNodeSize>>;
  /** get the current node size */
  nodeSize(): Ops["nodeSize"];

  /**
   * get the gap size between nodes
   *
   * (default: `[1, 1]`)
   */
  gap(val: readonly [number, number]): Sugiyama<Ops>;
  /** get the current gap size */
  gap(): readonly [number, number];
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
    let res;
    // short circuit for empty graph
    if (!dag.nnodes()) {
      res = { width: 0, height: 0 };
    } else {
      // cache and split node sizes
      const [xLen, yLen] = splitNodeSize(cachedNodeSize(options.nodeSize));

      // separate gaps
      const [xGap, yGap] = sizes.gap;

      // create layers
      const numLayers = options.layering(dag, layerSeparation) + 1;
      const [layers, height] = sugifyLayer(
        dag,
        yLen,
        yGap,
        numLayers,
        options.layering
      );

      // minimize edge crossings
      options.decross(layers);

      // assign coordinates
      const xSep = sizedSeparation(sugiNodeLength(xLen), xGap);
      const width = options.coord(layers, xSep);
      validateCoord(layers, xSep, width, options.coord);

      // assign data back to original graph
      unsugify(layers);

      res = { width, height };
    }

    // apply any tweaks in order
    for (const tweak of options.tweaks) {
      res = tweak(dag, res);
    }
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
      return buildOperator(options, { ...sizes, gap: val });
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
 * construct a new {@link Sugiyama} with the default settings
 *
 * The sugiyama layout takes a three step layering approach. First it calls
 * {@link Sugiyama#layering} to assign a layer to each node. Then it calls
 * {@link Sugiyama#decross} to arrange nodes in each layer to minimize edge
 * crossings. Finally it calls {@link Sugiyama#coord} to assign actual
 * coordinates given the ordering.
 *
 * Finally, you can also tweak the standard settings of
 * {@link Sugiyama#nodeSize}, {@link Sugiyama#gap}, and
 * {@link Sugiyama#tweaks}. Note that {@link Rank} can be set in some {@link
 * Layering} operators.
 *
 * <img alt="Sugiyama example" src="media://sugi-simplex-twolayer-simplex.png" width="400">
 *
 * @example
 *
 * To use the default layout:
 *
 * ```ts
 * const grf: Graph = ...
 * const layout = sugiyama();
 * layout(dag);
 * for (const node of dag.nodes()) {
 *   console.log(node.x, node.y);
 * }
 * ```
 *
 * @example
 *
 * To use optimal decrossing, which will only work for small graphs:
 *
 * ```ts
 * const grf: Graph = ...
 * const layout = sugiyama().decross(decrossOpt());
 * layout(dag);
 * for (const node of dag.nodes()) {
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
        gap: [1, 1],
      }
    );
  }
}
