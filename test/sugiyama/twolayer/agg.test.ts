import {
  agg,
  meanFactory,
  weightedMedianFactory
} from "../../../src/sugiyama/twolayer/agg";
import { crossings } from "../../../src/sugiyama/utils";
import { createLayers, getIndex } from "../utils";

test("agg() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("agg() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("agg() median is different than mean", () => {
  // median and mean of node 0 is 1.5
  // mean of node 1 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0, 1], [0], [2], [1]],
    [[], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("agg() mean is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([
    [[0], [0, 1], [1], [2], [0]],
    [[], [], []]
  ]);
  const op = agg().aggregator(meanFactory);
  expect(op.aggregator()).toBe(meanFactory);

  op(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("agg() median is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("agg() median is suboptimal bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [4], [1, 2, 6], [0, 5]],
    [[], [], [], [], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("agg() mean doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]],
    [[], [], [], [], []]
  ]);
  agg().aggregator(meanFactory)(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("agg() mean doesn't optimize crossings bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[2], [3], [4], [5], [0, 1, 6]],
    [[], [], [], [], [], [], []]
  ]);
  agg().aggregator(meanFactory)(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("agg() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("agg() mean preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []]
  ]);
  agg().aggregator(meanFactory)(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("agg() weighted median is different than median", () => {
  // weighted median makes this deterministic
  const [topLayer, bottomLayer] = createLayers([
    [[0, 1], [0, 1], [0, 1], [0], [1]],
    [[], []]
  ]);
  const order = agg().aggregator(weightedMedianFactory);
  order(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("agg() weighted median works for all parent numbers", () => {
  // weighted median makes this deterministic
  const [topLayer, bottomLayer] = createLayers([
    [[0, 1], [0, 1], [0]],
    [[], [], []]
  ]);
  const order = agg().aggregator(weightedMedianFactory);
  order(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("agg() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("agg() preserves order of multiple easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [3]],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3]);
});

test("agg() preserves order of multiple middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [], [1]],
    [[], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("agg() preserves order of multiple edge unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[], [0], [], [1], []],
    [[], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("agg() preserves order of multiple middle-middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [], [2], [], [3], []],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("agg() preserves order of multiple middle-front unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [1], [2], [], [3], []],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("agg() preserves order of multiple middle-back unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [2], [], [], [3], []],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("agg() preserves order of unconstrained nodes to front", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [0]],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 3, 2, 0]);
});

test("agg() preserves order of unconstrained nodes to back", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [1], [0]],
    [[], [], [], []]
  ]);
  agg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 1, 0, 2]);
});

test("agg() fails passing an arg to constructor", () => {
  expect(() => agg(null as never)).toThrow("got arguments to agg");
});
