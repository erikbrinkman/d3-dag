import { createLayers, crossings, getIndex } from "../utils";

import { mean } from "../../../src/sugiyama/twolayer/mean";

test("mean() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("mean() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("mean() is different than median", () => {
  // median and mean of node 1 is 1.5
  // mean of node 0 is 1.6, but median is just 1
  // order will be different for median and mean
  const [topLayer, bottomLayer] = createLayers([
    [[0], [0, 1], [1], [2], [0]],
    [[], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2]);
});

test("mean() doesn't optimize crossings", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]],
    [[], [], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("mean() doesn't optimize crossings bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[2], [3], [4], [5], [0, 1, 6]],
    [[], [], [], [], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 4, 1, 2, 3]);
});

test("mean() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("mean() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("mean() preserves order of multiple easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [3]],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3]);
});

test("mean() preserves order of multiple middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [], [1]],
    [[], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("mean() preserves order of multiple edge unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[], [0], [], [1], []],
    [[], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4]);
});

test("mean() preserves order of multiple middle-middle unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [], [2], [], [3], []],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("mean() preserves order of multiple middle-front unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [], [1], [2], [], [3], []],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("mean() preserves order of multiple middle-back unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1], [2], [], [], [3], []],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("mean() preserves order of unconstrained nodes to front", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [0]],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 3, 2, 0]);
});

test("mean() preserves order of unconstrained nodes to back", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [1], [0]],
    [[], [], [], []]
  ]);
  mean()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 1, 0, 2]);
});

test("mean() fails passing an arg to constructor", () => {
  expect(() => mean(null as never)).toThrow("got arguments to mean");
});
