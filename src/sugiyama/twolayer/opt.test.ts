import { expect, test } from "bun:test";
import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import { twolayerOpt } from "./opt";

test("twolayerOpt() allows setting options", () => {
  const layering = twolayerOpt().check("oom").dist(true);
  expect(layering.check()).toEqual("oom");
  expect(layering.dist()).toBeTruthy();
});

test("twolayerOpt() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerOpt() works for very simple compact case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0], 2n, [3], [4]],
    [[], [], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2, 3, 4]);
});

test("twolayerOpt() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerOpt() works where mean fails", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[4], [4], [0], [1], [2], [3], [4]],
    [[], [], [], [], []],
  ]);
  bottomLayer.reverse();
  twolayerOpt()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(4);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([4, 0, 1, 2, 3]);
});

test("twolayerOpt() works where median is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("twolayerOpt() works where median is suboptimal bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [4], [1, 2, 6], [0, 5]],
    [[], [], [], [], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("twolayerOpt() works where greedy scan is suboptimal", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0, 3, 4], [1, 4], [2]],
    [[], [], [], [], []],
  ]);
  const layout = twolayerOpt();
  layout(topLayer, bottomLayer, false);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(4);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 0, 1]);
});

test("twolayerOpt() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerOpt() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerOpt() preserves order of multiple easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [3]],
    [[], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2, 3]);
});

test("twolayerOpt() preserves order of unconstrained nodes to front", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [0]],
    [[], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 3, 2, 0]);
});

test("twolayerOpt() preserves order of unconstrained nodes to back", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [1], [0]],
    [[], [], [], []],
  ]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 1, 0, 2]);
});

test("twolayerOpt() doesn't optimize for distance", () => {
  const [topLayer, bottomLayer] = createLayers([[[0, 2]], [[], [], []]]);
  twolayerOpt()(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerOpt() can optimize for distance", () => {
  const [topLayer, bottomLayer] = createLayers([[[0, 2]], [[], [], []]]);
  twolayerOpt().dist(true)(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  // NOTE brittle in that 1 can move to either side
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerOpt() no ops on distance", () => {
  const [topLayer, bottomLayer] = createLayers([[[0, 1]], [[], [], []]]);
  const twolayer = twolayerOpt().dist(true);
  twolayer(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerOpt() can optimize for distance bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([[[0], [], [0]], [[]]]);
  twolayerOpt().dist(true)(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  // NOTE brittle in that 1 can move to either side
  expect(inds).toEqual([1, 0, 2]);
});

test("twolayerOpt() fails for large inputs", () => {
  const [topLayer, bottomLayer] = createLayers([
    Array<null>(51)
      .fill(null)
      .map((_, i) => [i]),
    Array<number[]>(51).fill([]),
  ]);
  expect(() => twolayerOpt()(topLayer, bottomLayer, true)).toThrow(`"oom"`);
});

test("twolayerOpt() fails for medium inputs", () => {
  const [topLayer, bottomLayer] = createLayers([
    Array<null>(31)
      .fill(null)
      .map((_, i) => [i]),
    Array<number[]>(31).fill([]),
  ]);
  expect(() => twolayerOpt()(topLayer, bottomLayer, true)).toThrow(`"slow"`);
});

test("twolayerOpt() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => twolayerOpt(null)).toThrow("got arguments to twolayerOpt");
});
