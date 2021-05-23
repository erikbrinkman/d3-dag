import { TestDatum, createLayers } from "../utils";

import { DagNode } from "../../../src/dag/node";
import { DummyNode } from "../../../src/sugiyama/dummy";
import { TwolayerOperator } from "../../../src/sugiyama/twolayer";
import { mean } from "../../../src/sugiyama/twolayer/mean";
import { median } from "../../../src/sugiyama/twolayer/median";
import { opt } from "../../../src/sugiyama/twolayer/opt";
import { twoLayer } from "../../../src/sugiyama/decross/two-layer";

test("twoLayer() correctly adapts to types", () => {
  const layers = createLayers([[[], 0]]);
  const unks = layers as (DagNode | DummyNode)[][];

  const init = twoLayer();
  init(layers);
  init(unks);

  // narrowed for custom
  function customTwolayer(
    topLayer: (DagNode<TestDatum> | DummyNode)[],
    bottomLayer: (DagNode<TestDatum> | DummyNode)[],
    topDown: boolean
  ): void {
    void [topLayer, bottomLayer, topDown];
  }
  const custom = init.order(customTwolayer);
  custom(layers);
  // @ts-expect-error custom only takes TestDatum
  custom(unks);

  // still works for cast
  const cast = custom.order(mean() as TwolayerOperator<TestDatum>);
  cast(layers);
  // @ts-expect-error cast only takes TestNodes
  cast(unks);

  // rexpands for more general two layers
  const optimal = cast.order(opt());
  optimal(layers);
  optimal(unks);

  // but we can still get original operator and operate on it
  const newOrder = optimal.order().dist(true);
  expect(newOrder.dist()).toBeTruthy();
});

test("twoLayer() propogates to both layers", () => {
  // o o    o o
  //  X     | |
  // o o -> o o
  // | |    | |
  // o o    o o
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1],
    [1, 0],
    [1, 0]
  ]);
});

test("twoLayer() propogates down and up", () => {
  const layers = createLayers([[[1], [1], [0], [1]]]);
  twoLayer()(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([
    [0, 1, 3, 2],
    [1, 0]
  ]);
});

test("twoLayer() can be set", () => {
  const layers = createLayers([
    [[1], [0]],
    [[0], [1]]
  ]);
  const twolayer = median();
  const decross = twoLayer().order(twolayer).passes(2);
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

test("twoLayer() can be set with all built in methods", () => {
  const layers = createLayers([[[0]]]);
  const decross = twoLayer();
  decross.order(mean());
  decross.order(median());
  decross.order(opt());
  decross(layers);
  const inds = layers.map((layer) => layer.map((node) => node.data?.index));
  expect(inds).toEqual([[0], [0]]);
});

test("twoLayer() fails passing an arg to constructor", () => {
  // @ts-expect-error two-layer takes no arguments
  expect(() => twoLayer(undefined)).toThrow("got arguments to twoLayer");
});

test("twoLayer() fails passing 0 to passes", () => {
  expect(() => twoLayer().passes(0)).toThrow(
    "number of passes must be positive"
  );
});
