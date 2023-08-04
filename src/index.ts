/**
 * A library for interacting with and laying out directed acyclic graphs (DAGs)
 *
 * Using d3-dag is usually a two step process. First you must create a
 * {@link Graph} from your data. There are several available methods:
 * - {@link graph} - when you want to start with an empty graph and build
 *    dynamically.
 * - {@link graphHierarchy} - when your data already has a graph-like
 *    structure.
 * - {@link graphStratify} - when your graph has a tabular structure,
 *   referencing parents by id.
 * - {@link graphConnect} - when your graph has a link-based structure
 *   specifying pairs of node ids.
 * - {@link graphJson} - when you serialized your graph using
 *   `JSON.stringify`.
 *
 * Then you lay it out using one of the provided algorithms. Each algorithm
 * emits a {@link LayoutResult} with width and height, while updating the x and
 * y coordinate of each node, and the control points of all links. The provided
 * layout methods are:
 * - {@link sugiyama} - for a general layered representation.
 * - {@link zherebko} - for a simple topological layout.
 * - {@link grid} - for an alternate topological layout.
 *
 * @example
 *
 * This renders a simple graph with `a -> b -> c`.
 *
 * ```ts
 * // import relevant functions in whatever way is necessary
 * import { graphConect, sugiyama } from "d3-dag";
 * const builder = graphConnect(); // optionally customize with fluent interface
 * const graph = builder([["a", "b"], ["b", "c"]]);
 * const layout = sugiyama(); // optionally customize with fluent interface
 * const { width, height } = layout(dag);
 * for (const node of dag.nodes()) {
 *   console.log(node.data, node.x, node.y);
 * }
 * ```
 *
 * ## API Overview
 *
 * This gives a brief overview of the design and related common themes of the
 * api. This started trying to mimic
 * {@link https://github.com/d3/d3-hierarchy/ | d3-hierarchy} as closely as
 * possible, although due to different design constraints many of the apis have
 * diverged.
 *
 * ### Naming
 *
 * Functions are named with the prefix of their *class* to help indicate their
 * usage. This mimic the flat structure and naming found in
 * {@link https://d3js.org/ | d3}, e.g. {@link coordSimplex} and
 * {@link coordGreedy} are two coordinate assignment operators.
 *
 * All operators create their `Default` variant, e.g. the function
 * {@link sugiyama} is used to create general operators following the
 * {@link Sugiyama} interface, but specifically always return the type
 * {@link DefaultSugiyama}.
 *
 * Types that start with `Mut` are mutable, incontrast to their immutable
 * non-prefixed siblings. Note that this only refers to their inherent
 * structural properties, exposed data can still be altered. {@link Graph}s can
 * only be traversed while {@link MutGraph}s also allow nodes to be added.
 *
 * Some interfaces start with `Callable` this often indicates another interface
 * without that prefix that is the union of a const return type or an accessor,
 * e.g. {@link SimplexWeight} and {@link CallableSimplexWeight}. In these
 * instances the non-callable variant is the same as a function that returns a
 * constant, but will sometimes result in faster layouts.
 *
 * A few operators will default to expected data with a certain interface
 * (which is then checked at runtime). These interfaces all start with `Has`,
 * e.g. {@link HasId}.
 *
 * ### Operators
 *
 * This library mimics `d3` in that you primarily interact with it through
 * *operators*. Operators are just functions whos behavior might be able to be
 * altered using a fluent api. Alterations are always immutable, returning a
 * new object with altered behavior. In order to track parameterizations,
 * each operator may be parametrized with an `Ops` type that specifies the type
 * of various parameters. These `Ops` types also allow infering the type of
 * allowable data. See `Ops` below.
 *
 * Due to their immutability, you can't directly tweak operators that are
 * already set, instead needing to assign new ones.
 * ```ts
 * const layout = sugiyama().decross(decrossOpt());
 * // this creates a new decross opt, but doesn't change the existing layouts behavior
 * layout.decross().dist(true); // noop
 * // correctly assigns a new operator
 * const newLayout = layout.decross(layout.decross().dist(true));
 * ```
 *
 * Since most operators are functions of user data, their most general typing
 * involves data of type `never`, e.g. data that can never be accessed. However
 * in a lot of instances you may want operators that take `unknown` data, e.g.
 * data of any time. This is actually the most narrow class of an operator.
 * Sometimes type inference on functions can fail, and you'll see typescript
 * errors relating to `never` data. This can usually be fixed by specifying
 * types everywhere.
 *
 * ### Ops
 *
 * `Ops` types allow this library to track typing requirements dynamically as
 * different callbacks are passed. The upside to this is that types are always
 * sound, appropriately detecting the proper types of their inputs. The
 * downside is that you need to explicitely type anonymous functions so that
 * the types can be inferred appropriately.
 *
 * For example, look at `d3.line`. With `d3.line` you specify the types at the
 * beginning `d3.line<{ x: number; y: number }>()`. However, this operator is
 * current invalid, because by default `d3.line` actually expects tuples.
 * However you can then easily specify
 * `d3.line<{ x: number; y: number }>().x(({ x }) => x).y(({ y }) => y)`,
 * because it's already expecting the appropriate type. The d3-dag version of
 * this wouldn't allow setting an initial type, and instead you'd have to call
 * it like:
 * `d3.line().x(({ x }: { x: number }) => x).y(({ y }: { y: number }) => y)`.
 * At this point the input type would correctly be
 * `{ x: number } & { y: number }`. Keeping track of the function types in the
 * `Ops` parameter allows doing this inference correctly. However, if the types
 * aren't specified, the data type can get miss-inferred create problems
 * downstream when data is actually passed in.
 *
 * ### Layouts
 *
 * The three layouts: {@link sugiyama}, {@link zherebko}, and {@link grid} have
 * several common features.
 *
 * - They all return the width and height of the final layout as a
 *   {@link LayoutResult}.
 * - They all take a {@link NodeSize} which specifies how large nodes are, and
 *   can either be a constant tuple of width and height, or a callback that's
 *   applied to each node.
 * - They all take a gap which specifies the minimum width and height gap
 *   between nodes.
 * - They all take an array of {@link Tweak}s that allows modifying the final
 *   layout in reusable ways.
 * - They almost all take a {@link Rank} that allows overriding the order of a
 *   subset of the nodes. For the {@link sugiyama} layout this is internal to
 *   the {@link Sugiyama#layering}.
 *
 * @packageDocumentation
 */
export {
  graph,
  type Graph,
  type GraphLink,
  type GraphNode,
  type MutGraph,
  type MutGraphLink,
  type MutGraphNode,
  type Rank,
} from "./graph";
export {
  graphConnect,
  type Connect,
  type ConnectOps,
  type DefaultConnect,
  type HasOneString,
  type HasZeroString,
  type IdNodeDatum,
} from "./graph/connect";
export {
  graphHierarchy,
  type Children,
  type ChildrenData,
  type DefaultHierarchy,
  type HasChildren,
  type Hierarchy,
  type WrappedChildren,
  type WrappedChildrenData,
} from "./graph/hierarchy";
export {
  graphJson,
  type DefaultJson,
  type Hydrator,
  type Json,
  type JsonOps,
} from "./graph/json";
export {
  graphStratify,
  type DefaultStratify,
  type HasId,
  type HasParentIds,
  type ParentData,
  type ParentIds,
  type Stratify,
  type StratifyOps,
  type WrappedParentData,
  type WrappedParentIds,
} from "./graph/stratify";
export { type Id } from "./graph/utils";
export { grid, type DefaultGrid, type Grid, type GridOps } from "./grid";
export { type Lane } from "./grid/lane";
export { laneGreedy, type LaneGreedy } from "./grid/lane/greedy";
export { laneOpt, type LaneOpt } from "./grid/lane/opt";
export {
  cachedNodeSize,
  splitNodeSize,
  type CallableNodeSize,
  type LayoutResult,
  type NodeLength,
  type NodeSize,
  type OptChecking,
} from "./layout";
export {
  sugiyama,
  type DefaultSugiyama,
  type Sugiyama,
  type SugiyamaOps,
} from "./sugiyama";
export { type Coord } from "./sugiyama/coord";
export { coordCenter, type CoordCenter } from "./sugiyama/coord/center";
export { coordGreedy, type CoordGreedy } from "./sugiyama/coord/greedy";
export {
  coordQuad,
  type CallableLinkWeight,
  type CallableNodeWeight,
  type CoordQuad,
  type CoordQuadOps,
  type DefaultCoordQuad,
  type LinkWeight,
  type NodeWeight,
} from "./sugiyama/coord/quad";
export {
  coordSimplex,
  type CallableSimplexWeight,
  type CoordSimplex,
  type CoordSimplexOps,
  type DefaultCoordSimplex,
  type SimplexWeight,
} from "./sugiyama/coord/simplex";
export {
  coordTopological,
  type CoordTopological,
} from "./sugiyama/coord/topological";
export { type Decross } from "./sugiyama/decross";
export { decrossDfs, type DecrossDfs } from "./sugiyama/decross/dfs";
export { decrossOpt, type DecrossOpt } from "./sugiyama/decross/opt";
export {
  decrossTwoLayer,
  type DecrossTwoLayer,
  type DecrossTwoLayerOps,
  type DefaultDecrossTwoLayer,
} from "./sugiyama/decross/two-layer";
export {
  layerSeparation,
  type Group,
  type Layering,
} from "./sugiyama/layering";
export {
  layeringLongestPath,
  type DefaultLayeringLongestPath,
  type LayeringLongestPath,
  type LayeringLongestPathOps,
} from "./sugiyama/layering/longest-path";
export {
  layeringSimplex,
  type DefaultLayeringSimplex,
  type LayeringSimplex,
  type LayeringSimplexOps,
} from "./sugiyama/layering/simplex";
export {
  layeringTopological,
  type DefaultLayeringTopological,
  type LayeringTopological,
  type LayeringTopologicalOps,
} from "./sugiyama/layering/topological";
export {
  sugifyCompact,
  sugifyLayer,
  sugiNodeLength,
  unsugify,
  type SugiDatum,
  type SugiLinkDatum,
  type SugiNode,
  type SugiNodeDatum,
  type SugiNodeLength,
  type SugiSeparation,
} from "./sugiyama/sugify";
export { type Twolayer } from "./sugiyama/twolayer";
export {
  aggMean,
  aggMedian,
  aggWeightedMedian,
  twolayerAgg,
  type Aggregator,
  type TwolayerAgg,
} from "./sugiyama/twolayer/agg";
export {
  twolayerGreedy,
  type DefaultTwolayerGreedy,
  type TwolayerGreedy,
} from "./sugiyama/twolayer/greedy";
export { twolayerOpt, type TwolayerOpt } from "./sugiyama/twolayer/opt";
export { sizedSeparation, type Separation } from "./sugiyama/utils";
export {
  shapeEllipse,
  shapeRect,
  tweakFlip,
  tweakGrid,
  tweakShape,
  tweakSize,
  type Shape,
  type Tweak,
} from "./tweaks";
export { type Named, type U } from "./utils";
export {
  zherebko,
  type DefaultZherebko,
  type Zherebko,
  type ZherebkoOps,
} from "./zherebko";
