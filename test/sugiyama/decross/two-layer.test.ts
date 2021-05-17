import {
  DagNode,
  SugiDummyNode,
  decrossTwoLayer,
  twolayerMean,
  twolayerMedian,
  twolayerOpt
} from "../../../src";
import { TestNode, createLayers } from "../utils";

import { TwolayerOperator } from "../../../src/sugiyama/twolayer";

test("decrossTwoLayer() correctly adapts to types", () => {
  const layers = createLayers([[[], 0]]);
  const unks = layers as (DagNode | SugiDummyNode)[][];

  const init = decrossTwoLayer();
  init(layers);
  init(unks);

  // narrowed for custom
  function customTwolayer(
    topLayer: (TestNode | SugiDummyNode)[],
    bottomLayer: (TestNode | SugiDummyNode)[],
    topDown: boolean
  ): void {
    void [topLayer, bottomLayer, topDown];
  }
  const custom = init.order(customTwolayer);
  custom(layers);
  // @ts-expect-error custom only takes TestNodes
  custom(unks);

  // still works for cast
  const cast = custom.order(twolayerMean() as TwolayerOperator<TestNode>);
  cast(layers);
  // @ts-expect-error cast only takes TestNodes
  cast(unks);

  // still works for more general two layers
  const opt = cast.order(twolayerOpt());
  opt(layers);
  // @ts-expect-error opt only takes TestNodes
  opt(unks);

  // but we can still get original operator and operate on it
  const newOrder = opt.order().dist(true);
  expect(newOrder.dist()).toBeTruthy();
});

test("decrossTwoLayer() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  decrossTwoLayer()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("decrossTwoLayer() propogates down and up", () => {
  const layers = createLayers([[[1], [1], [0], [1]]]);
  decrossTwoLayer()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1, 3, 2],
    [1, 0]
  ]);
});

test("decrossTwoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  const twolayer = twolayerMedian();
  const decross = decrossTwoLayer().order(twolayer).passes(2);
  expect(decross.order()).toBe(twolayer);
  expect(decross.passes()).toBe(2);
  decross(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("decrossTwoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[[0]]]);
  const decross = decrossTwoLayer();
  decross.order(twolayerMean());
  decross.order(twolayerMedian());
  decross.order(twolayerOpt());
  decross(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [0]]);
});

test("decrossTwoLayer() fails passing an arg to constructor", () => {
  // @ts-expect-error two-layer takes no arguments
  expect(() => decrossTwoLayer(undefined)).toThrow("got arguments to twoLayer");
});

test("decrossTwoLayer() fails passing 0 to passes", () => {
  expect(() => decrossTwoLayer().passes(0)).toThrow(
    "number of passes must be positive"
  );
});
