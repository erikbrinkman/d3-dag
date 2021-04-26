import { createLayers, crossings } from "../utils";

import { twolayerMean } from "../../../src";

test("twolayerMean() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMean()(topLayer, bottomLayer);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerMean() is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([[[0], [0, 1], [1], [2], [0]]]);
  twolayerMean()(topLayer, bottomLayer);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerMean() doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]]
  ]);
  twolayerMean()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("twolayerMean() fails passing an arg to constructor", () => {
  // @ts-expect-error mean takes no arguments
  expect(() => twolayerMean(undefined)).toThrow("got arguments to mean");
});
