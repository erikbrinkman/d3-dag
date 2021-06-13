/**
 * This file contains all of the exports that make it into the pure javascript
 * / bundled flat structure.
 *
 * To create a dag structure from data, a necessary first step before computing
 * a layout, see the three creation algorithms:
 * - {@link HierarchyOperator} - for converting data that is already in a dag form with children
 * - {@link StratifyOperator} - for converting id based data with parent ids
 * - {@link ConnectOperator} - for link based data with a source and target
 *
 * To layout a dag see the two dag layout algorithms:
 * - {@link SugiyamaOperator} - for a general layered dag representation
 * - {@link ZherebkoOperator} - for a simple topological layout
 *
 * @module
 */
export { Dag, DagNode, DagLink } from "./dag";
export {
  stratify as dagStratify,
  StratifyOperator,
  connect as dagConnect,
  ConnectOperator,
  hierarchy as dagHierarchy,
  HierarchyOperator
} from "./dag/create";
export {
  sugiyama,
  SugiyamaOperator,
  NodeSizeAccessor,
  SugiNodeSizeAccessor
} from "./sugiyama";
export {
  topological as layeringTopological,
  TopologicalOperator as TopologicalLayeringOperator
} from "./sugiyama/layering/topological";
export {
  simplex as layeringSimplex,
  SimplexOperator
} from "./sugiyama/layering/simplex";
export { LayeringOperator } from "./sugiyama/layering";
export { TwolayerOperator } from "./sugiyama/twolayer";
export { DecrossOperator } from "./sugiyama/decross";
export { CoordOperator, CoordNodeSizeAccessor } from "./sugiyama/coord";
export {
  longestPath as layeringLongestPath,
  LongestPathOperator
} from "./sugiyama/layering/longest-path";
export {
  coffmanGraham as layeringCoffmanGraham,
  CoffmanGrahamOperator
} from "./sugiyama/layering/coffman-graham";
export {
  twoLayer as decrossTwoLayer,
  TwoLayerOperator
} from "./sugiyama/decross/two-layer";
export {
  opt as decrossOpt,
  OptOperator as OptLayeringOperator
} from "./sugiyama/decross/opt";
export { center as coordCenter, CenterOperator } from "./sugiyama/coord/center";
export { quad as coordQuad, QuadOperator } from "./sugiyama/coord/quad";
export { greedy as coordGreedy, GreedyOperator } from "./sugiyama/coord/greedy";
export {
  topological as coordTopological,
  TopologicalOperator as TopologicalCoordOperator
} from "./sugiyama/coord/topological";
export {
  median as twolayerMedian,
  MedianOperator
} from "./sugiyama/twolayer/median";
export { mean as twolayerMean, MeanOperator } from "./sugiyama/twolayer/mean";
export {
  opt as twolayerOpt,
  OptOperator as OptTwolayerOperator
} from "./sugiyama/twolayer/opt";
export { zherebko, ZherebkoOperator } from "./zherebko";
