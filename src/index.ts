/**
 * This file contains all of the exports that make it into the pure javascript
 * / bundled flat structure.
 *
 * To create a dag structure from data, a necessary first step before computing
 * a layout, see the three creation algorithms:
 * - {@link graph/hierarchy!Hierarchy} - when the data already has a dag structure.
 * - {@link graph/stratify!Stratify} - when the dag has a tabular structure, referencing parents by id.
 * - {@link graph/connect!Connect} - when the dag has a link structure and is specified as pairs of nodes.
 *
 * To layout a dag see the two dag layout algorithms:
 * - {@link sugiyama!Sugiyama} - for a general layered dag representation
 * - {@link zherebko!Zherebko} - for a simple topological layout
 * - {@link grid!Grid} - for an alternate topological layout
 *
 * @example
 *
 * Using d3-dag is usually a two step process, first you choose a creation
 * method for your given data structure, this turns data like data into a graph
 * structure, then you lay it out using one of the layout algorithms. The
 * creation methods follow a similar structure, as do the layout methods. Each
 * can be tweaked with a fluent api.
 *
 * ```ts
 * const creation = graphConnect(); // optionally use fluent interface to customize
 * const dag = creation(data);
 * const layout = sugiyama(); // optionally customize with fluent interface
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   // dag connect creates data with the node id
 *   console.log(node.data.id, node.x, node.y);
 * }
 * ```
 *
 * @packageDocumentation
 */
export { graph } from "./graph";
export type {
  Graph,
  GraphLink,
  GraphNode,
  MutGraph,
  MutGraphLink,
  MutGraphNode,
  Rank,
} from "./graph";
export { graphConnect } from "./graph/connect";
export type {
  Connect,
  DefaultConnect,
  IdNodeDatumOperator,
} from "./graph/connect";
export { graphHierarchy } from "./graph/hierarchy";
export type {
  ChildrenDataOperator,
  ChildrenOperator,
  DefaultHierarchy,
  Hierarchy,
} from "./graph/hierarchy";
export { graphStratify } from "./graph/stratify";
export type {
  DefaultStratify,
  ParentDataOperator,
  ParentIdsOperator,
  Stratify,
} from "./graph/stratify";
export type { IdOperator } from "./graph/utils";
export { grid } from "./grid";
export type { DefaultGrid, Grid } from "./grid";
export type { Lane } from "./grid/lane";
export { laneGreedy } from "./grid/lane/greedy";
export type { LaneGreedy } from "./grid/lane/greedy";
export { laneOpt } from "./grid/lane/opt";
export type { LaneOpt } from "./grid/lane/opt";
export type { LayoutResult, NodeSize } from "./layout";
export { cachedNodeSize, coordVertical, sugiyama } from "./sugiyama";
export type { DefaultSugiyama, Sugiyama } from "./sugiyama";
export type { Coord } from "./sugiyama/coord";
export { coordCenter } from "./sugiyama/coord/center";
export type { CoordCenter } from "./sugiyama/coord/center";
export { coordGreedy } from "./sugiyama/coord/greedy";
export type { CoordGreedy } from "./sugiyama/coord/greedy";
export { coordQuad } from "./sugiyama/coord/quad";
export type { CoordQuad, LinkWeight, NodeWeight } from "./sugiyama/coord/quad";
export { coordSimplex } from "./sugiyama/coord/simplex";
export type { CoordSimplex, SimplexWeight } from "./sugiyama/coord/simplex";
export { coordTopological } from "./sugiyama/coord/topological";
export type { CoordTopological } from "./sugiyama/coord/topological";
export type { Decross } from "./sugiyama/decross";
export { decrossDfs } from "./sugiyama/decross/dfs";
export type { DecrossDfs } from "./sugiyama/decross/dfs";
export { decrossOpt } from "./sugiyama/decross/opt";
export type { DecrossOpt } from "./sugiyama/decross/opt";
export { decrossTwoLayer } from "./sugiyama/decross/two-layer";
export type { DecrossTwoLayer } from "./sugiyama/decross/two-layer";
export { layerSeparation } from "./sugiyama/layering";
export type { Group, Layering } from "./sugiyama/layering";
export { layeringLongestPath } from "./sugiyama/layering/longest-path";
export type { LayeringLongestPath } from "./sugiyama/layering/longest-path";
export { layeringSimplex } from "./sugiyama/layering/simplex";
export type { LayeringSimplex } from "./sugiyama/layering/simplex";
export { layeringTopological } from "./sugiyama/layering/topological";
export type { LayeringTopological } from "./sugiyama/layering/topological";
export { sugify, sugiNodeLength, unsugify } from "./sugiyama/sugify";
export type { SugiNode } from "./sugiyama/sugify";
export type { Twolayer } from "./sugiyama/twolayer";
export {
  aggMeanFactory,
  aggMedianFactory,
  aggWeightedMedianFactory,
  twolayerAgg,
} from "./sugiyama/twolayer/agg";
export type { Aggregator, TwolayerAgg } from "./sugiyama/twolayer/agg";
export { twolayerGreedy } from "./sugiyama/twolayer/greedy";
export type { TwolayerGreedy } from "./sugiyama/twolayer/greedy";
export { twolayerOpt } from "./sugiyama/twolayer/opt";
export type { TwolayerOpt } from "./sugiyama/twolayer/opt";
export { sizedSeparation } from "./sugiyama/utils";
export type { NodeLength, Separation } from "./sugiyama/utils";
export { zherebko } from "./zherebko";
export type { DefaultZherebko, Zherebko } from "./zherebko";
