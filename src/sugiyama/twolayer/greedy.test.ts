import { expect, test } from "bun:test";
import type { SugiNode } from "../sugify";
import { createLayers, getIndex } from "../test-utils";
import { crossings } from "../utils";
import type { Twolayer } from ".";
import { twolayerAgg } from "./agg";
import { twolayerGreedy } from "./greedy";

test("twolayerGreedy() works for very simple case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const layout = twolayerGreedy();
  expect(layout.scan()).toBe(false);
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerGreedy() allows setting custom bases", () => {
  function base(above: SugiNode<number>[], below: SugiNode<number>[]): void {
    for (const _ of above) {
      // noop
    }
    for (const _ of below) {
      // noop
    }
  }

  const init = twolayerGreedy() satisfies Twolayer<unknown, unknown>;

  const layout = init.base(base) satisfies Twolayer<number, unknown>;
  // @ts-expect-error invalid data;
  layout satisfies Twolayer<unknown, unknown>;

  expect(layout.base() satisfies typeof base).toBe(base);
});

test("twolayerGreedy() works for very simple compact case", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0], 2n, [3], [4]],
    [[], [], [], [], []],
  ]);
  const layout = twolayerGreedy();
  expect(layout.scan()).toBe(false);
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([1, 0, 2, 3, 4]);
});

test("twolayerGreedy() works for very simple case bottom-up", () => {
  // independent links that need to be swapped
  const [topLayer, bottomLayer] = createLayers([
    [[1], [0]],
    [[], []],
  ]);
  const layout = twolayerGreedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([1, 0]);
});

test("twolayerGreedy() improves suboptimal median", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  const base = twolayerAgg();
  const layout = twolayerGreedy().base(base);
  expect(layout.base()).toBe(base);
  layout(topLayer, bottomLayer, true);
  // NOTE is 8 before greedy, 6 is optimal
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("twolayerGreedy() scan fails where opt succeeds", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0, 3, 4], [1, 4], [2]],
    [[], [], [], [], []],
  ]);
  const layout = twolayerGreedy().scan(true);
  layout(topLayer, bottomLayer, false);
  // optimal is 4
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(5);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]); // no greedy swaps possible
});

test("twolayerGreedy() preserves order of easy unconstrained nodes", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [2]],
    [[], [], []],
  ]);
  const layout = twolayerGreedy();
  layout(topLayer, bottomLayer, true);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerGreedy() preserves order of easy unconstrained nodes bottom-up", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[0], [], [1]],
    [[], []],
  ]);
  const layout = twolayerGreedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
});

test("twolayerGreedy() fails with neutral adjacent", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [], [0]],
    [[], []],
  ]);
  const layout = twolayerGreedy();
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([0, 1, 2]);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(1);
});

test("twolayerGreedy() scan works with neutral adjacent", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [], [0]],
    [[], []],
  ]);
  const layout = twolayerGreedy().scan(true);
  expect(layout.scan()).toBe(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 1, 0]);
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(0);
});

test("twolayerGreedy() scan can swap a node twice", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[1], [2, 3], [0]],
    [[], [], [], []],
  ]);
  const layout = twolayerGreedy().scan(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 0, 1]);
});

test("twolayerGreedy() scan will interleave intervals", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3, 4], [5], [0, 1], [2]],
    [[], [], [], [], [], []],
  ]);
  const layout = twolayerGreedy().scan(true);
  layout(topLayer, bottomLayer, false);
  const inds = topLayer.map(getIndex);
  expect(inds).toEqual([2, 3, 0, 1]);
});

test("twolayerGreedy() scan improves suboptimal median", () => {
  const [topLayer, bottomLayer] = createLayers([
    [[3], [2], [2], [0], [1], [3], [2]],
    [[], [], [], []],
  ]);
  const base = twolayerAgg();
  const layout = twolayerGreedy().base(base).scan(true);
  expect(layout.base()).toBe(base);
  expect(layout.scan()).toBe(true);
  layout(topLayer, bottomLayer, true);
  // NOTE is 8 before greedy, 6 is optimal
  expect(crossings([topLayer, bottomLayer])).toBeCloseTo(6);
  const inds = bottomLayer.map(getIndex);
  expect(inds).toEqual([3, 2, 0, 1]);
});

test("twolayerGreedy() fails passing an arg to constructor", () => {
  // @ts-expect-error no args
  expect(() => twolayerGreedy(null)).toThrow("got arguments to twolayerGreedy");
});
