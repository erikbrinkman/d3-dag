import { createLayers, crossings } from "../utils";

import { twolayerMedian } from "../../../src";

test("twolayerMedian() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMedian()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0"]);
});

test("twolayerMedian() is different than mean", () => {
  // median and mean of node 0 is 1.5
  // mean of node 1 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([[[1], [0, 1], [0], [2], [1]]]);
  twolayerMedian()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0", "1,2"]);
});

test("twolayerMedian() allocates parentless nodes alternating", () => {
  // node 1 should pop to beginning with no parents
  // node 2 should pop to end without parents
  const [topLayer, bottomLayer] = createLayers([
    [[0], [3]],
    [[], [], [], []]
  ]);
  twolayerMedian()(topLayer, bottomLayer);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,1", "1,0", "1,3", "1,2"]);
});

test("twolayerMedian() is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]]
  ]);
  twolayerMedian()(topLayer, bottomLayer);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(8);
  const ids = bottomLayer.map((n) => n.id);
  expect(ids).toEqual(["1,2", "1,3", "1,0", "1,1"]);
});

test("twolayerMedian() fails passing an arg to constructor", () => {
  // @ts-expect-error median takes no arguments
  expect(() => twolayerMedian(undefined)).toThrow("got arguments to median");
});
