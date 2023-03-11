import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import { twolayerAgg as agg } from "./agg";
import { twolayerGreedy as greedy } from "./greedy";

test("greedy() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const layout = greedy();
  expect(layout.scan()).toBe(false);
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("greedy() works for very simple compact case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0], 2n, [3], [4]],
    [[], [], [], [], []],
  ]);
  const layout = greedy();
  expect(layout.scan()).toBe(false);
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2, 3, 4]);
});

test("greedy() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const layout = greedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("greedy() improves suboptimal median", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  const base = agg();
  const layout = greedy().base(base);
  expect(layout.base()).toBe(base);
  layout(topLayer, bottomLayer, true);
  // NOTE is 8 before greedy, 6 is optimal
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("greedy() scan fails where opt succeeds", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0, 3, 4], [1, 4], [2]],
    [[], [], [], [], []],
  ]);
  const layout = greedy().scan(true);
  layout(topLayer, bottomLayer, false);
  // optimal is 4
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]); // no greedy swaps possible
});

test("greedy() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []],
  ]);
  const layout = greedy();
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("greedy() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []],
  ]);
  const layout = greedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("greedy() fails with neutral adjacent", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [], [0]],
    [[], []],
  ]);
  const layout = greedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(1);
});

test("greedy() scan works with neutral adjacent", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [], [0]],
    [[], []],
  ]);
  const layout = greedy().scan(true);
  expect(layout.scan()).toBe(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 1, 0]);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(0);
});

test("greedy() scan can swap a node twice", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [2, 3], [0]],
    [[], [], [], []],
  ]);
  const layout = greedy().scan(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 0, 1]);
});

test("greedy() scan will interleave intervals", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3, 4], [5], [0, 1], [2]],
    [[], [], [], [], [], []],
  ]);
  const layout = greedy().scan(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("greedy() scan improves suboptimal median", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  const base = agg();
  const layout = greedy().base(base).scan(true);
  expect(layout.base()).toBe(base);
  expect(layout.scan()).toBe(true);
  layout(topLayer, bottomLayer, true);
  // NOTE is 8 before greedy, 6 is optimal
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("greedy() fails passing an arg to constructor", () => {
  expect(() => greedy(null as never)).toThrow(
    "got arguments to twolayerGreedy"
  );
});
