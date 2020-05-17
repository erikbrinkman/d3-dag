import { createLayers, crossings } from "../utils";

import { twolayerMean } from "../../../src";

test("twolayerMean() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMean()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0"]);
});

test("twolayerMean() is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([[[0], [0, 1], [1], [2], [0]]]);
  twolayerMean()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0", "1,2"]);
});

test("twolayerMean() doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]]
  ]);
  twolayerMean()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,0", "1,4", "1,1", "1,2", "1,3"]);
});

test("twolayerMean() fails passing an arg to constructor", () => {
  const willFail = (twolayerMean as unknown) as (x: null) => void;
  expect(() => willFail(null)).toThrow("got arguments to mean");
});
