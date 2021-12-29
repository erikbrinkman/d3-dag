/**
 * This file contains all of the exports that make it into the pure javascript
 * / bundled flat structure.
 *
 * To create a dag structure from data, a necessary first step before computing
 * a layout, see the three creation algorithms:
 * - {@link HierarchyOperator} - when the data already has a dag structure.
 * - {@link StratifyOperator} - when the dag has a tabular structure, referencing parents by id.
 * - {@link ConnectOperator} - when the dag has a link structure and is specified as pairs of nodes.
 *
 * To layout a dag see the two dag layout algorithms:
 * - {@link SugiyamaOperator} - for a general layered dag representation
 * - {@link ZherebkoOperator} - for a simple topological layout
 * - {@link GridOperator} - for an alternate topological layout
 *
 * @example
 * Using d3-dag is usually a two step process, first you choose a creation
 * method for your given data structure, this turns data like data into a dag
 * structure, then you lay it out using one of the layout algorithms. The
 * creation methods follow a similar structure, as do the layout methods. Each
 * can be tweaked with a fluent api.
 * ```typescript
 * const creation = dagConnect(); // optionally use fluent interface to customize
 * const dag = creation(data);
 * const layout = sugiyama(); // optionally customize with fluent interface
 * const { width, height } = layout(dag);
 * for (const node of dag) {
 *   // dag connect creates data with the node id
 *   console.log(node.data.id, node.x, node.y);
 * }
 * ```
 *
 * @module
 */
export type { Dag, DagLink, DagNode } from "./dag";
export {
  connect as dagConnect,
  hierarchy as dagHierarchy,
  stratify as dagStratify
} from "./dag/create";
export type {
  ConnectOperator,
  HierarchyOperator,
  StratifyOperator
} from "./dag/create";
export { grid } from "./grid";
export type { GridOperator } from "./grid";
export type { LaneOperator } from "./grid/lane";
export { greedy as laneGreedy } from "./grid/lane/greedy";
export type { GreedyOperator as GreedyLaneOperator } from "./grid/lane/greedy";
export { opt as laneOpt } from "./grid/lane/opt";
export type { OptOperator as OptLaneOperator } from "./grid/lane/opt";
export { sugiyama } from "./sugiyama";
export type {
  NodeSizeAccessor,
  SugiNodeSizeAccessor,
  SugiyamaOperator
} from "./sugiyama";
export type { CoordNodeSizeAccessor, CoordOperator } from "./sugiyama/coord";
export { center as coordCenter } from "./sugiyama/coord/center";
export type { CenterOperator } from "./sugiyama/coord/center";
export { greedy as coordGreedy } from "./sugiyama/coord/greedy";
export type { GreedyOperator as GreedyCoordOperator } from "./sugiyama/coord/greedy";
export { quad as coordQuad } from "./sugiyama/coord/quad";
export type { QuadOperator } from "./sugiyama/coord/quad";
export { topological as coordTopological } from "./sugiyama/coord/topological";
export type { TopologicalOperator as TopologicalCoordOperator } from "./sugiyama/coord/topological";
export type { DecrossOperator } from "./sugiyama/decross";
export { opt as decrossOpt } from "./sugiyama/decross/opt";
export type { OptOperator as OptLayeringOperator } from "./sugiyama/decross/opt";
export { twoLayer as decrossTwoLayer } from "./sugiyama/decross/two-layer";
export type { TwoLayerOperator } from "./sugiyama/decross/two-layer";
export type { LayeringOperator } from "./sugiyama/layering";
export { coffmanGraham as layeringCoffmanGraham } from "./sugiyama/layering/coffman-graham";
export type { CoffmanGrahamOperator } from "./sugiyama/layering/coffman-graham";
export { longestPath as layeringLongestPath } from "./sugiyama/layering/longest-path";
export type { LongestPathOperator } from "./sugiyama/layering/longest-path";
export { simplex as layeringSimplex } from "./sugiyama/layering/simplex";
export type { SimplexOperator } from "./sugiyama/layering/simplex";
export { topological as layeringTopological } from "./sugiyama/layering/topological";
export type { TopologicalOperator as TopologicalLayeringOperator } from "./sugiyama/layering/topological";
export type { TwolayerOperator } from "./sugiyama/twolayer";
export {
  agg as twolayerAgg,
  meanFactory as aggMeanFactory,
  medianFactory as aggMedianFactory
} from "./sugiyama/twolayer/agg";
export type { AggOperator } from "./sugiyama/twolayer/agg";
export { opt as twolayerOpt } from "./sugiyama/twolayer/opt";
export type { OptOperator as OptTwolayerOperator } from "./sugiyama/twolayer/opt";
export { zherebko } from "./zherebko";
export type { ZherebkoOperator } from "./zherebko";
