import { expect, test } from "bun:test";
import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import { aggMean, aggMedian, aggWeightedMedian, twolayerAgg } from "./agg";

test("twolayerAgg() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerAgg() works for very simple compact case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0], 2n, [3], [4]],
    [[], [], [], [], []],
  ]);
  const twolayer = twolayerAgg();
  twolayer(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2, 3, 4]);
});

test("twolayerAgg() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerAgg() median is different than mean", () => {
  // median and mean of node 0 is 1.5
  // mean of node 1 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0, 1], [0], [2], [1]],
    [[], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerAgg() mean is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([
    [[0], [0, 1], [1], [2], [0]],
    [[], [], []],
  ]);
  const op = twolayerAgg().aggregator(aggMean);
  expect(op.aggregator()).toBe(aggMean);

  op(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerAgg() median is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("twolayerAgg() median is suboptimal bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [4], [1, 2, 6], [0, 5]],
    [[], [], [], [], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("twolayerAgg() mean doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]],
    [[], [], [], [], []],
  ]);
  twolayerAgg().aggregator(aggMean)(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("twolayerAgg() mean doesn't optimize crossings bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[2], [3], [4], [5], [0, 1, 6]],
    [[], [], [], [], [], [], []],
  ]);
  twolayerAgg().aggregator(aggMean)(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("twolayerAgg() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerAgg() mean preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []],
  ]);
  twolayerAgg().aggregator(aggMean)(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerAgg() median is different than weighted median", () => {
  // weighted median makes this deterministic
  const [topLayer, bottomLayer] = createLayers([
    [[0, 1], [0, 1], [0, 1], [0], [1]],
    [[], []],
  ]);

  const median = twolayerAgg().aggregator(aggMedian);
  median(topLayer, bottomLayer, true);
  const minds = bottomLayer.map(getIndex);
  expect(minds).toEqual([0, 1]);

  const wmedian = twolayerAgg().aggregator(aggWeightedMedian);
  wmedian(topLayer, bottomLayer, true);
  const winds = bottomLayer.map(getIndex);
  expect(winds).toEqual([1, 0]);
});

test("twolayerAgg() weighted median works for all parent numbers", () => {
  // weighted median makes this deterministic
  const [topLayer, bottomLayer] = createLayers([
    [[0, 1], [0, 1], [0]],
    [[], [], []],
  ]);
  const order = twolayerAgg().aggregator(aggWeightedMedian);
  order(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerAgg() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerAgg() preserves order of multiple easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [3]],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3]);
});

test("twolayerAgg() preserves order of multiple middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [], [1]],
    [[], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("twolayerAgg() preserves order of multiple edge unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[], [0], [], [1], []],
    [[], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("twolayerAgg() preserves order of multiple middle-middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [], [2], [], [3], []],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerAgg() preserves order of multiple middle-front unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [1], [2], [], [3], []],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerAgg() preserves order of multiple middle-back unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [2], [], [], [3], []],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerAgg() preserves order of unconstrained nodes to front", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [0]],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 3, 2, 0]);
});

test("twolayerAgg() preserves order of unconstrained nodes to back", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [1], [0]],
    [[], [], [], []],
  ]);
  twolayerAgg()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 1, 0, 2]);
});

test("twolayerAgg() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => twolayerAgg(null)).toThrow("got arguments to twolayerAgg");
});
