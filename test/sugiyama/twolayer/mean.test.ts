import { createLayers, crossings } from "../utils";

import { twolayerMean } from "../../../src";

test("twolayerMean() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerMean() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([[[1], [0]]]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0]);
});

test("twolayerMean() is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([[[0], [0, 1], [1], [2], [0]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerMean() doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]]
  ]);
  twolayerMean()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("twolayerMean() doesn't optimize crossings bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[2], [3], [4], [5], [0, 1, 6]]
  ]);
  twolayerMean()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("twolayerMean() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [2]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerMean() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [], [1]]]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerMean() preserves order of multiple easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [3]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3]);
});

test("twolayerMean() preserves order of multiple middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [], [], [], [1]]]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("twolayerMean() preserves order of multiple edge unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[], [0], [], [1], []]]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("twolayerMean() preserves order of multiple middle-middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [], [2], [], [3], []]
  ]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerMean() preserves order of multiple middle-front unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [1], [2], [], [3], []]
  ]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerMean() preserves order of multiple middle-back unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [2], [], [], [3], []]
  ]);
  twolayerMean()(topLayer, bottomLayer, false);
  const inds = topLayer.map((n) => n.data?.index);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("twolayerMean() preserves order of unconstrained nodes to front", () => {
  const [topLayer, bottomLayer] = createLayers([[[3], [2], [0]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([1, 3, 2, 0]);
});

test("twolayerMean() preserves order of unconstrained nodes to back", () => {
  const [topLayer, bottomLayer] = createLayers([[[3], [1], [0]]]);
  twolayerMean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map((n) => n.data?.index);
  expect(inds).toEqual([3, 1, 0, 2]);
});

test("twolayerMean() fails passing an arg to constructor", () => {
  // @ts-expect-error mean takes no arguments
  expect(() => twolayerMean(undefined)).toThrow("got arguments to mean");
});
