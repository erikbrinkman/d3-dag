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
 *
 * @module
 */
export type { Dag, DagNode, DagLink } from "./dag";
export {
  stratify as dagStratify,
  connect as dagConnect,
  hierarchy as dagHierarchy
} from "./dag/create";
export type {
  StratifyOperator,
  ConnectOperator,
  HierarchyOperator
} from "./dag/create";
export { sugiyama } from "./sugiyama";
export type {
  SugiyamaOperator,
  NodeSizeAccessor,
  SugiNodeSizeAccessor
} from "./sugiyama";
export { topological as layeringTopological } from "./sugiyama/layering/topological";
export type { TopologicalOperator as TopologicalLayeringOperator } from "./sugiyama/layering/topological";
export { simplex as layeringSimplex } from "./sugiyama/layering/simplex";
export type { SimplexOperator } from "./sugiyama/layering/simplex";
export type { LayeringOperator } from "./sugiyama/layering";
export type { TwolayerOperator } from "./sugiyama/twolayer";
export type { DecrossOperator } from "./sugiyama/decross";
export type { CoordOperator, CoordNodeSizeAccessor } from "./sugiyama/coord";
export { longestPath as layeringLongestPath } from "./sugiyama/layering/longest-path";
export type { LongestPathOperator } from "./sugiyama/layering/longest-path";
export { coffmanGraham as layeringCoffmanGraham } from "./sugiyama/layering/coffman-graham";
export type { CoffmanGrahamOperator } from "./sugiyama/layering/coffman-graham";
export { twoLayer as decrossTwoLayer } from "./sugiyama/decross/two-layer";
export type { TwoLayerOperator } from "./sugiyama/decross/two-layer";
export { opt as decrossOpt } from "./sugiyama/decross/opt";
export type { OptOperator as OptLayeringOperator } from "./sugiyama/decross/opt";
export { center as coordCenter } from "./sugiyama/coord/center";
export type { CenterOperator } from "./sugiyama/coord/center";
export { quad as coordQuad } from "./sugiyama/coord/quad";
export type { QuadOperator } from "./sugiyama/coord/quad";
export { greedy as coordGreedy } from "./sugiyama/coord/greedy";
export type { GreedyOperator } from "./sugiyama/coord/greedy";
export { topological as coordTopological } from "./sugiyama/coord/topological";
export type { TopologicalOperator as TopologicalCoordOperator } from "./sugiyama/coord/topological";
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
