import { createLayers, crossings } from "../utils";

import { twolayerMedian } from "../../../src";

test("twolayerMedian() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMedian()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerMedian() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMedian()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerMedian() is different than mean", () => {
  // median and mean of node 0 is 1.5
  // mean of node 1 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([[[1], [0, 1], [0], [2], [1]]]);
  twolayerMedian()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerMedian() is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]]
  ]);
  twolayerMedian()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("twolayerMedian() is suboptimal bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[3], [4], [1, 2, 6], [0, 5]]]);
  twolayerMedian()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("twolayerMedian() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [2]]]);
  twolayerMedian()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerMedian() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [], [1]]]);
  twolayerMedian()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerMedian() fails passing an arg to constructor", () => {
  // @ts-expect-error median takes no arguments
  expect(() => twolayerMedian(undefined)).toThrow("got arguments to median");
});
