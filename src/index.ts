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
export { type Dag, type DagLink, type DagNode } from "./dag";
export {
  connect as dagConnect,
  hierarchy as dagHierarchy,
  stratify as dagStratify,
  type ConnectOperator,
  type HierarchyOperator,
  type StratifyOperator
} from "./dag/create";
export { grid, type GridOperator } from "./grid";
export { type LaneOperator } from "./grid/lane";
export {
  greedy as laneGreedy,
  type GreedyOperator as GreedyLaneOperator
} from "./grid/lane/greedy";
export {
  opt as laneOpt,
  type OptOperator as OptLaneOperator
} from "./grid/lane/opt";
export {
  coordVertical as sugiCoordVertical,
  sugiyama,
  type NodeSizeAccessor,
  type SugiNodeSizeAccessor,
  type SugiyamaOperator
} from "./sugiyama";
export {
  type CoordNodeSizeAccessor,
  type CoordOperator
} from "./sugiyama/coord";
export {
  center as coordCenter,
  type CenterOperator as CenterCoordOperator
} from "./sugiyama/coord/center";
export {
  greedy as coordGreedy,
  type GreedyOperator as GreedyCoordOperator
} from "./sugiyama/coord/greedy";
export {
  quad as coordQuad,
  type QuadOperator as QuadCoordOperator
} from "./sugiyama/coord/quad";
export {
  simplex as coordSimplex,
  type SimplexOperator as SimplexCoordOperator
} from "./sugiyama/coord/simplex";
export {
  topological as coordTopological,
  type TopologicalOperator as TopologicalCoordOperator
} from "./sugiyama/coord/topological";
export { type DecrossOperator } from "./sugiyama/decross";
export {
  opt as decrossOpt,
  type OptOperator as OptDecrossOperator
} from "./sugiyama/decross/opt";
export {
  twoLayer as decrossTwoLayer,
  type TwoLayerOperator as TwoLayerDecrossOperator
} from "./sugiyama/decross/two-layer";
export { type LayeringOperator } from "./sugiyama/layering";
export {
  coffmanGraham as layeringCoffmanGraham,
  type CoffmanGrahamOperator as CoffmanGrahamLayeringOperator
} from "./sugiyama/layering/coffman-graham";
export {
  longestPath as layeringLongestPath,
  type LongestPathOperator as LongestPathLayeringOperator
} from "./sugiyama/layering/longest-path";
export {
  simplex as layeringSimplex,
  type SimplexOperator as SimplexLayeringOperator
} from "./sugiyama/layering/simplex";
export {
  topological as layeringTopological,
  type TopologicalOperator as TopologicalLayeringOperator
} from "./sugiyama/layering/topological";
export { type TwolayerOperator } from "./sugiyama/twolayer";
export {
  agg as twolayerAgg,
  meanFactory as aggMeanFactory,
  medianFactory as aggMedianFactory,
  type AggOperator as AggTwolayerOperator
} from "./sugiyama/twolayer/agg";
export {
  greedy as twolayerGreedy,
  type GreedyOperator as GreedyTwolayerOperator
} from "./sugiyama/twolayer/greedy";
export {
  opt as twolayerOpt,
  type OptOperator as OptTwolayerOperator
} from "./sugiyama/twolayer/opt";
export { sugify, unsugify } from "./sugiyama/utils";
export { zherebko, type ZherebkoOperator } from "./zherebko";
